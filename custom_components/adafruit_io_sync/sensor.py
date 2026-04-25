from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CONF_FEEDS, DOMAIN, ENTITY_TYPE_SENSOR
from .entity import AdafruitIOEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data["coordinator"]
    mqtt_client = data["mqtt"]

    entities = [
        AdafruitIOSensor(coordinator, mqtt_client, *_split(k), v)
        for k, v in entry.options.get(CONF_FEEDS, {}).items()
        if v.get("enabled", True)
        and v.get("entity_type") == ENTITY_TYPE_SENSOR
        and _split(k)[0] in (coordinator.data or {})
    ]
    async_add_entities(entities)


def _split(config_key: str) -> tuple[str, str]:
    group, feed = config_key.split(".", 1)
    return group, feed


class AdafruitIOSensor(AdafruitIOEntity, SensorEntity):

    @property
    def native_value(self) -> float | int | str | None:
        val = self._current_value
        if val is None:
            return None
        try:
            f = float(val)
            return int(f) if f == int(f) else f
        except (ValueError, TypeError):
            return val

    @property
    def native_unit_of_measurement(self) -> str | None:
        unit = self._feed_config.get("unit", "")
        return unit if unit else None
