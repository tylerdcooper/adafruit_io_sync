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

_ON_VALUES  = {"1", "on", "true", "yes"}
_OFF_VALUES = {"0", "off", "false", "no"}

# Per-domain attribute feeds: maps HA attribute key → AIO feed config.
# encode: HA attribute value → AIO string
# decode: AIO string → HA service parameter value
# service: (domain, service_name) to call when AIO sends a value
# param: service call parameter name
# writable: whether AIO can write back to HA
DOMAIN_ATTR_MAP: dict[str, dict[str, dict]] = {
    "light": {
        "brightness": {
            "suffix":   "brightness",
            "encode":   lambda v: str(round(v / 255 * 100)),  # 0-255 → 0-100 %
            "service":  ("light", "turn_on"),
            "param":    "brightness_pct",
            "decode":   float,
            "writable": True,
        },
        "color_temp_kelvin": {
            "suffix":   "color-temp",
            "encode":   lambda v: str(round(v)),
            "service":  ("light", "turn_on"),
            "param":    "color_temp_kelvin",
            "decode":   int,
            "writable": True,
        },
    },
    "fan": {
        "percentage": {
            "suffix":   "speed",
            "encode":   lambda v: str(round(v)) if v is not None else "0",
            "service":  ("fan", "set_percentage"),
            "param":    "percentage",
            "decode":   int,
            "writable": True,
        },
        "oscillating": {
            "suffix":   "oscillating",
            "encode":   lambda v: "on" if v else "off",
            "service":  ("fan", "oscillate"),
            "param":    "oscillating",
            "decode":   lambda s: s.strip().lower() in ("1", "on", "true"),
            "writable": True,
        },
    },
    "climate": {
        "temperature": {
            "suffix":   "target-temp",
            "encode":   lambda v: str(round(v, 1)),
            "service":  ("climate", "set_temperature"),
            "param":    "temperature",
            "decode":   float,
            "writable": True,
        },
        "current_temperature": {
            "suffix":   "current-temp",
            "encode":   lambda v: str(round(v, 1)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
        "humidity": {
            "suffix":   "target-humidity",
            "encode":   lambda v: str(round(v)),
            "service":  ("climate", "set_humidity"),
            "param":    "humidity",
            "decode":   int,
            "writable": True,
        },
        "current_humidity": {
            "suffix":   "current-humidity",
            "encode":   lambda v: str(round(v, 1)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
    },
    "cover": {
        "current_position": {
            "suffix":   "position",
            "encode":   lambda v: str(round(v)),
            "service":  ("cover", "set_cover_position"),
            "param":    "position",
            "decode":   int,
            "writable": True,
        },
        "current_tilt_position": {
            "suffix":   "tilt",
            "encode":   lambda v: str(round(v)),
            "service":  ("cover", "set_cover_tilt_position"),
            "param":    "tilt_position",
            "decode":   int,
            "writable": True,
        },
    },
    "media_player": {
        "volume_level": {
            "suffix":   "volume",
            "encode":   lambda v: str(round(v * 100)),  # 0.0-1.0 → 0-100
            "service":  ("media_player", "volume_set"),
            "param":    "volume_level",
            "decode":   lambda s: round(float(s) / 100, 2),
            "writable": True,
        },
        "media_title": {
            "suffix":   "media-title",
            "encode":   lambda v: str(v),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
        "media_artist": {
            "suffix":   "media-artist",
            "encode":   lambda v: str(v),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
    },
    "vacuum": {
        "battery_level": {
            "suffix":   "battery",
            "encode":   lambda v: str(round(v)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
        "fan_speed": {
            "suffix":   "fan-speed",
            "encode":   lambda v: str(v),
            "service":  ("vacuum", "set_fan_speed"),
            "param":    "fan_speed",
            "decode":   str,
            "writable": True,
        },
    },
    "water_heater": {
        "current_temperature": {
            "suffix":   "current-temp",
            "encode":   lambda v: str(round(v, 1)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
        "temperature": {
            "suffix":   "target-temp",
            "encode":   lambda v: str(round(v, 1)),
            "service":  ("water_heater", "set_temperature"),
            "param":    "temperature",
            "decode":   float,
            "writable": True,
        },
    },
    "humidifier": {
        "humidity": {
            "suffix":   "target-humidity",
            "encode":   lambda v: str(round(v)),
            "service":  ("humidifier", "set_humidity"),
            "param":    "humidity",
            "decode":   int,
            "writable": True,
        },
        "current_humidity": {
            "suffix":   "current-humidity",
            "encode":   lambda v: str(round(v, 1)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
    },
    "weather": {
        "temperature": {
            "suffix":   "temperature",
            "encode":   lambda v: str(round(v, 1)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
        "humidity": {
            "suffix":   "humidity",
            "encode":   lambda v: str(round(v, 1)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
        "wind_speed": {
            "suffix":   "wind-speed",
            "encode":   lambda v: str(round(v, 1)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
        "pressure": {
            "suffix":   "pressure",
            "encode":   lambda v: str(round(v, 1)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
        "wind_bearing": {
            "suffix":   "wind-bearing",
            "encode":   lambda v: str(round(v)),
            "service":  None,
            "param":    None,
            "decode":   None,
            "writable": False,
        },
    },
    "valve": {
        "current_position": {
            "suffix":   "position",
            "encode":   lambda v: str(round(v)),
            "service":  ("valve", "set_valve_position"),
            "param":    "position",
            "decode":   int,
            "writable": True,
        },
    },
}


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the sidebar panel and REST API — runs once at startup."""
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
        module_url=f"{_STATIC_PATH}/panel.js?v=1.5.1",
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

    # Push current state + attributes immediately so AIO has data right away
    for item in active:
        eid   = item["entity_id"]
        state = hass.states.get(eid)
        if not state or state.state in ("unknown", "unavailable"):
            continue
        await mqtt_client.async_publish(item["aio_group"], item["aio_feed"], state.state)
        domain = eid.split(".")[0]
        for attr_key, ac in DOMAIN_ATTR_MAP.get(domain, {}).items():
            val = state.attributes.get(attr_key)
            if val is not None:
                await mqtt_client.async_publish(
                    item["aio_group"], f"{item['aio_feed']}-{ac['suffix']}", ac["encode"](val)
                )

    # HA → AIO: listen for state + attribute changes
    async def _state_changed(event):
        entity_id = event.data["entity_id"]
        new_state = event.data.get("new_state")
        old_state = event.data.get("old_state")
        if new_state is None or new_state.state in ("unknown", "unavailable"):
            return
        config = entity_map.get(entity_id)
        if config is None:
            return

        # Publish main state only when it actually changes
        if old_state is None or new_state.state != old_state.state:
            _LOGGER.debug(
                "HA→AIO: %s=%s → %s.%s",
                entity_id, new_state.state, config["aio_group"], config["aio_feed"],
            )
            await mqtt_client.async_publish(
                config["aio_group"], config["aio_feed"], new_state.state,
            )

        # Publish each attribute when its value changes
        domain = entity_id.split(".")[0]
        for attr_key, ac in DOMAIN_ATTR_MAP.get(domain, {}).items():
            new_val = new_state.attributes.get(attr_key)
            old_val = old_state.attributes.get(attr_key) if old_state else None
            if new_val is not None and new_val != old_val:
                attr_feed = f"{config['aio_feed']}-{ac['suffix']}"
                _LOGGER.debug(
                    "HA→AIO attr: %s.%s=%s → %s.%s",
                    entity_id, attr_key, new_val, config["aio_group"], attr_feed,
                )
                await mqtt_client.async_publish(
                    config["aio_group"], attr_feed, ac["encode"](new_val)
                )

    unsubscribe = async_track_state_change_event(hass, list(entity_map.keys()), _state_changed)

    # AIO → HA: subscribe bidirectional items — main feed + writable attribute feeds
    for item in active:
        if item.get("direction") != "bidirectional":
            continue
        entity_id = item["entity_id"]
        domain    = entity_id.split(".")[0]

        # Main on/off handler
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

        # Attribute feed handlers
        def _make_attr_handler(eid: str, svc: tuple, param: str, decode):
            async def _handle_attr(value: str) -> None:
                try:
                    svc_domain, svc_name = svc
                    await hass.services.async_call(
                        svc_domain, svc_name,
                        {"entity_id": eid, param: decode(value)}
                    )
                except Exception as exc:
                    _LOGGER.warning(
                        "AIO→HA attr bidir: %s.%s error: %s", eid, param, exc
                    )
            return _handle_attr

        for attr_key, ac in DOMAIN_ATTR_MAP.get(domain, {}).items():
            if not ac["writable"]:
                continue
            attr_feed = f"{item['aio_feed']}-{ac['suffix']}"
            mqtt_client.subscribe(
                item["aio_group"], attr_feed,
                _make_attr_handler(entity_id, ac["service"], ac["param"], ac["decode"])
            )
            _LOGGER.debug(
                "AIO→HA attr bidir: %s.%s → %s", item["aio_group"], attr_feed, entity_id
            )

    return unsubscribe


def _aio_key(name: str) -> str:
    """Convert a human name to a valid AIO key (lowercase, hyphens only)."""
    key = name.lower().strip()
    key = re.sub(r"[^a-z0-9-]", "-", key)
    key = re.sub(r"-+", "-", key).strip("-")
    return key


async def _async_ensure_aio_feeds(entry: ConfigEntry, ha_to_aio: list[dict]) -> None:
    """Create any AIO groups or feeds (including attribute feeds) that don't exist yet."""
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
            domain    = item["entity_id"].split(".")[0]

            # All feeds for this entity: main + attribute feeds
            feeds_to_ensure = [feed_key] + [
                f"{feed_key}-{ac['suffix']}"
                for ac in DOMAIN_ATTR_MAP.get(domain, {}).values()
            ]

            for fk in feeds_to_ensure:
                async with session.get(
                    f"{AIO_BASE_URL}/{username}/feeds/{group_key}.{fk}",
                    headers=headers,
                ) as resp:
                    if resp.status == 404:
                        await session.post(
                            f"{AIO_BASE_URL}/{username}/groups/{group_key}/feeds",
                            headers=headers,
                            json={"feed": {"name": fk}},
                        )
                        _LOGGER.info("Created AIO feed '%s.%s'", group_key, fk)
