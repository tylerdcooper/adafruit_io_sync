import logging
import re

import aiohttp
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_state_change_event

from .const import (
    AIO_BASE_URL,
    CONF_AIO_API_KEY,
    CONF_AIO_USERNAME,
    CONF_HA_TO_AIO,
    DOMAIN,
    PLATFORMS,
)
from .coordinator import AdafruitIOCoordinator
from .mqtt_client import AdafruitIOMQTT
from .panel_api import AIOSyncConfigView, AIOSyncGroupsView, PanelJSView

_LOGGER = logging.getLogger(__name__)
_STATIC_PATH = "/adafruit_io_sync_panel"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the sidebar panel and REST API — runs once at startup."""
    # Serve panel.js via a plain view (compatible with all HA versions)
    hass.http.register_view(PanelJSView)
    hass.http.register_view(AIOSyncConfigView)
    hass.http.register_view(AIOSyncGroupsView)

    from homeassistant.components import panel_custom
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path="adafruit_io_sync",
        webcomponent_name="adafruit-io-sync-panel",
        sidebar_title="AIO Sync",
        sidebar_icon="mdi:cloud-sync",
        module_url=f"{_STATIC_PATH}/panel.js?v=1.4.2",
        embed_iframe=False,
        require_admin=True,
    )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = AdafruitIOCoordinator(
        hass,
        entry.data[CONF_AIO_USERNAME],
        entry.data[CONF_AIO_API_KEY],
    )
    await coordinator.async_config_entry_first_refresh()

    mqtt_client = AdafruitIOMQTT(
        hass,
        entry.data[CONF_AIO_USERNAME],
        entry.data[CONF_AIO_API_KEY],
    )
    await mqtt_client.async_connect()

    unsubscribe = await _async_setup_ha_to_aio(hass, entry, mqtt_client)

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "coordinator": coordinator,
        "mqtt": mqtt_client,
        "unsubscribe_ha_to_aio": unsubscribe,
    }

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        data = hass.data[DOMAIN].pop(entry.entry_id)
        await data["mqtt"].async_disconnect()
        if data["unsubscribe_ha_to_aio"]:
            data["unsubscribe_ha_to_aio"]()
    return unload_ok


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


_ON_VALUES  = {"1", "on", "true", "yes"}
_OFF_VALUES = {"0", "off", "false", "no"}


async def _async_setup_ha_to_aio(
    hass: HomeAssistant,
    entry: ConfigEntry,
    mqtt_client: AdafruitIOMQTT,
):
    """Register state listeners that push HA entity changes to Adafruit IO feeds."""
    ha_to_aio: list[dict] = entry.options.get(CONF_HA_TO_AIO, [])
    active = [item for item in ha_to_aio if item.get("enabled", True)]
    if not active:
        return None

    await _async_ensure_aio_feeds(entry, active)

    entity_map = {item["entity_id"]: item for item in active}

    # Push current state immediately so AIO has data right away
    for item in active:
        state = hass.states.get(item["entity_id"])
        if state and state.state not in ("unknown", "unavailable"):
            await mqtt_client.async_publish(
                item["aio_group"], item["aio_feed"], state.state
            )

    # HA → AIO: listen for state changes
    async def _state_changed(event):
        entity_id = event.data["entity_id"]
        new_state = event.data.get("new_state")
        if new_state is None or new_state.state in ("unknown", "unavailable"):
            return
        config = entity_map.get(entity_id)
        if config is None:
            return
        _LOGGER.debug(
            "HA→AIO: %s=%s → %s.%s",
            entity_id, new_state.state, config["aio_group"], config["aio_feed"],
        )
        await mqtt_client.async_publish(
            config["aio_group"], config["aio_feed"], new_state.state,
        )

    unsubscribe = async_track_state_change_event(hass, list(entity_map.keys()), _state_changed)

    # AIO → HA: subscribe bidirectional items and apply commands back to HA
    for item in active:
        if item.get("direction") != "bidirectional":
            continue
        entity_id = item["entity_id"]
        domain = entity_id.split(".")[0]

        def _make_handler(eid: str, dom: str):
            async def _handle_aio_command(value: str) -> None:
                val = value.strip().lower()
                if val in _ON_VALUES:
                    await hass.services.async_call(
                        "homeassistant", "turn_on", {"entity_id": eid}
                    )
                elif val in _OFF_VALUES:
                    await hass.services.async_call(
                        "homeassistant", "turn_off", {"entity_id": eid}
                    )
                else:
                    try:
                        await hass.services.async_call(
                            dom, "set_value", {"entity_id": eid, "value": float(value)}
                        )
                    except Exception:
                        _LOGGER.warning(
                            "AIO→HA bidir: unhandled value '%s' for %s", value, eid
                        )
            return _handle_aio_command

        mqtt_client.subscribe(item["aio_group"], item["aio_feed"], _make_handler(entity_id, domain))
        _LOGGER.debug("AIO→HA bidir subscribed: %s.%s → %s", item["aio_group"], item["aio_feed"], entity_id)

    return unsubscribe


def _aio_key(name: str) -> str:
    """Convert a human name to a valid AIO key (lowercase, hyphens only)."""
    key = name.lower().strip()
    key = re.sub(r"[^a-z0-9-]", "-", key)
    key = re.sub(r"-+", "-", key).strip("-")
    return key


async def _async_ensure_aio_feeds(entry: ConfigEntry, ha_to_aio: list[dict]) -> None:
    """Create any AIO groups or feeds that don't exist yet."""
    username = entry.data[CONF_AIO_USERNAME]
    api_key  = entry.data[CONF_AIO_API_KEY]
    headers  = {"X-AIO-Key": api_key, "Content-Type": "application/json"}

    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{AIO_BASE_URL}/{username}/groups", headers=headers
        ) as resp:
            existing_groups: set[str] = {g["key"] for g in await resp.json()} if resp.ok else set()

        for group_key in {_aio_key(item["aio_group"]) for item in ha_to_aio}:
            if group_key not in existing_groups:
                resp = await session.post(
                    f"{AIO_BASE_URL}/{username}/groups",
                    headers=headers,
                    json={"name": group_key},
                )
                _LOGGER.info("Created AIO group '%s' (status %s)", group_key, resp.status)

        for item in ha_to_aio:
            group_key = _aio_key(item["aio_group"])
            feed_key  = _aio_key(item["aio_feed"])
            async with session.get(
                f"{AIO_BASE_URL}/{username}/feeds/{group_key}.{feed_key}",
                headers=headers,
            ) as resp:
                if resp.status == 404:
                    await session.post(
                        f"{AIO_BASE_URL}/{username}/groups/{group_key}/feeds",
                        headers=headers,
                        json={"feed": {"name": feed_key}},
                    )
                    _LOGGER.info("Created AIO feed '%s.%s'", group_key, feed_key)
