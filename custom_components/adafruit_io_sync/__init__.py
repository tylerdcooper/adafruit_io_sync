import logging
from pathlib import Path

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
from .panel_api import AIOSyncConfigView, AIOSyncGroupsView

_LOGGER = logging.getLogger(__name__)
_STATIC_PATH = "/adafruit_io_sync_panel"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the sidebar panel, static files, and REST API — runs once at startup."""
    hass.http.register_static_path(
        _STATIC_PATH,
        str(Path(__file__).parent / "www"),
        cache_headers=False,
    )

    from homeassistant.components import panel_custom
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path="adafruit_io_sync",
        webcomponent_name="adafruit-io-sync-panel",
        sidebar_title="AIO Sync",
        sidebar_icon="mdi:cloud-sync",
        module_url=f"{_STATIC_PATH}/panel.js",
        embed_iframe=False,
        require_admin=True,
    )

    hass.http.register_view(AIOSyncConfigView)
    hass.http.register_view(AIOSyncGroupsView)
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


async def _async_setup_ha_to_aio(
    hass: HomeAssistant,
    entry: ConfigEntry,
    mqtt_client: AdafruitIOMQTT,
):
    """Register state listeners that push HA entity changes to Adafruit IO feeds."""
    ha_to_aio: list[dict] = entry.options.get(CONF_HA_TO_AIO, [])
    if not ha_to_aio:
        return None

    await _async_ensure_aio_feeds(entry, ha_to_aio)

    entity_map = {item["entity_id"]: item for item in ha_to_aio}

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

    return async_track_state_change_event(hass, list(entity_map.keys()), _state_changed)


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

        for group_key in {item["aio_group"] for item in ha_to_aio}:
            if group_key not in existing_groups:
                await session.post(
                    f"{AIO_BASE_URL}/{username}/groups",
                    headers=headers,
                    json={"name": group_key},
                )
                _LOGGER.info("Created AIO group '%s'", group_key)

        for item in ha_to_aio:
            group_key = item["aio_group"]
            feed_key  = item["aio_feed"]
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
