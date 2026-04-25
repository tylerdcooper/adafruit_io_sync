from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CONF_FEEDS, DIRECTION_BIDIRECTIONAL, DOMAIN, ENTITY_TYPE_SWITCH
from .entity import AdafruitIOEntity

_ON_VALUES = {"1", "on", "true", "yes"}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data["coordinator"]
    mqtt_client = data["mqtt"]

    entities = [
        AdafruitIOSwitch(coordinator, mqtt_client, *_split(k), v)
        for k, v in entry.options.get(CONF_FEEDS, {}).items()
        if v.get("enabled", True)
        and v.get("entity_type") == ENTITY_TYPE_SWITCH
        and _split(k)[0] in (coordinator.data or {})
    ]
    async_add_entities(entities)


def _split(config_key: str) -> tuple[str, str]:
    group, feed = config_key.split(".", 1)
    return group, feed


class AdafruitIOSwitch(AdafruitIOEntity, SwitchEntity):

    @property
    def is_on(self) -> bool | None:
        val = self._current_value
        if val is None:
            return None
        return str(val).lower() in _ON_VALUES

    async def async_turn_on(self, **kwargs) -> None:
        if self._feed_config.get("direction") == DIRECTION_BIDIRECTIONAL:
            await self._mqtt_client.async_publish(self._group_key, self._feed_key, "1")
            self._update_cached_value("1")
            self.async_write_ha_state()

    async def async_turn_off(self, **kwargs) -> None:
        if self._feed_config.get("direction") == DIRECTION_BIDIRECTIONAL:
            await self._mqtt_client.async_publish(self._group_key, self._feed_key, "0")
            self._update_cached_value("0")
            self.async_write_ha_state()
