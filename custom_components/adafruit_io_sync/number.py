from __future__ import annotations

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CONF_FEEDS, DIRECTION_BIDIRECTIONAL, DOMAIN, ENTITY_TYPE_NUMBER
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
        AdafruitIONumber(coordinator, mqtt_client, *_split(k), v)
        for k, v in entry.options.get(CONF_FEEDS, {}).items()
        if v.get("enabled", True)
        and v.get("entity_type") == ENTITY_TYPE_NUMBER
        and _split(k)[0] in (coordinator.data or {})
    ]
    async_add_entities(entities)


def _split(config_key: str) -> tuple[str, str]:
    group, feed = config_key.split(".", 1)
    return group, feed


class AdafruitIONumber(AdafruitIOEntity, NumberEntity):
    _attr_native_min_value = -999_999.0
    _attr_native_max_value = 999_999.0
    _attr_native_step = 0.01
    _attr_mode = NumberMode.BOX

    @property
    def native_value(self) -> float | None:
        val = self._current_value
        if val is None:
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    @property
    def native_unit_of_measurement(self) -> str | None:
        unit = self._feed_config.get("unit", "")
        return unit if unit else None

    async def async_set_native_value(self, value: float) -> None:
        if self._feed_config.get("direction") == DIRECTION_BIDIRECTIONAL:
            str_val = str(int(value)) if value == int(value) else str(value)
            await self._mqtt_client.async_publish(self._group_key, self._feed_key, str_val)
            self._update_cached_value(str_val)
            self.async_write_ha_state()
