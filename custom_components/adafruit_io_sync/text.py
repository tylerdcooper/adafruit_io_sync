from __future__ import annotations

from homeassistant.components.text import TextEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CONF_FEEDS, DIRECTION_BIDIRECTIONAL, DOMAIN, ENTITY_TYPE_TEXT
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
        AdafruitIOText(coordinator, mqtt_client, *_split(k), v)
        for k, v in entry.options.get(CONF_FEEDS, {}).items()
        if v.get("enabled", True)
        and v.get("entity_type") == ENTITY_TYPE_TEXT
        and _split(k)[0] in (coordinator.data or {})
    ]
    async_add_entities(entities)


def _split(config_key: str) -> tuple[str, str]:
    group, feed = config_key.split(".", 1)
    return group, feed


class AdafruitIOText(AdafruitIOEntity, TextEntity):
    _attr_native_min = 0
    _attr_native_max = 255

    @property
    def native_value(self) -> str | None:
        return self._current_value

    async def async_set_value(self, value: str) -> None:
        if self._feed_config.get("direction") == DIRECTION_BIDIRECTIONAL:
            await self._mqtt_client.async_publish(self._group_key, self._feed_key, value)
            self._update_cached_value(value)
            self.async_write_ha_state()
