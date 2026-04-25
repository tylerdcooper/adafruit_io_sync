from __future__ import annotations

from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import AdafruitIOCoordinator
from .mqtt_client import AdafruitIOMQTT


class AdafruitIOEntity(CoordinatorEntity[AdafruitIOCoordinator]):
    """
    Base class for all Adafruit IO entities.

    Each entity maps to one AIO feed inside a group.  The group becomes the
    HA device; the feed becomes the entity.  MQTT subscriptions are set up
    on add and torn down on remove so the MQTT client stays in sync with
    whatever entities are actually registered.
    """

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: AdafruitIOCoordinator,
        mqtt_client: AdafruitIOMQTT,
        group_key: str,
        feed_key: str,
        feed_config: dict,
    ) -> None:
        super().__init__(coordinator)
        self._mqtt_client = mqtt_client
        self._group_key = group_key
        self._feed_key = feed_key
        self._feed_config = feed_config
        self._attr_unique_id = f"{coordinator.username}_{group_key}_{feed_key}"

    # ------------------------------------------------------------------
    # Device / entity metadata
    # ------------------------------------------------------------------

    @property
    def device_info(self) -> DeviceInfo:
        group = self.coordinator.data.get(self._group_key, {})
        return DeviceInfo(
            identifiers={(DOMAIN, f"{self.coordinator.username}_{self._group_key}")},
            name=group.get("name", self._group_key),
            manufacturer="Adafruit IO",
            model="Feed Group",
        )

    @property
    def name(self) -> str:
        feed = (
            self.coordinator.data
            .get(self._group_key, {})
            .get("feeds", {})
            .get(self._feed_key, {})
        )
        return feed.get("name", self._feed_key)

    # ------------------------------------------------------------------
    # Live value helpers
    # ------------------------------------------------------------------

    @property
    def _current_value(self) -> str | None:
        return (
            self.coordinator.data
            .get(self._group_key, {})
            .get("feeds", {})
            .get(self._feed_key, {})
            .get("last_value")
        )

    def _update_cached_value(self, value: str) -> None:
        """Write an MQTT-received value into the coordinator's data cache."""
        data = self.coordinator.data
        if data and self._group_key in data and self._feed_key in data[self._group_key]["feeds"]:
            data[self._group_key]["feeds"][self._feed_key]["last_value"] = value

    # ------------------------------------------------------------------
    # MQTT wiring
    # ------------------------------------------------------------------

    async def _handle_mqtt_update(self, value: str) -> None:
        self._update_cached_value(value)
        self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._mqtt_client.subscribe(
            self._group_key, self._feed_key, self._handle_mqtt_update
        )

    async def async_will_remove_from_hass(self) -> None:
        self._mqtt_client.unsubscribe(self._group_key, self._feed_key)
