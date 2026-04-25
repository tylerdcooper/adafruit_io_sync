import asyncio
import logging
from typing import Awaitable, Callable

import paho.mqtt.client as mqtt

from .const import AIO_MQTT_HOST, AIO_MQTT_PORT

_LOGGER = logging.getLogger(__name__)

# Type alias for the per-feed callback that entities register
FeedCallback = Callable[[str], Awaitable[None]]


class AdafruitIOMQTT:
    """
    Manages a single persistent MQTT connection to io.adafruit.com.

    Entities call subscribe() in async_added_to_hass and unsubscribe() in
    async_will_remove_from_hass.  Bidirectional entities call async_publish()
    to push state back to AIO.

    Loop detection: when we publish a value we add the topic to
    _pending_publishes.  The next inbound message on that topic is silently
    dropped so we don't echo our own write back as a new state change.
    """

    def __init__(self, hass, username: str, api_key: str) -> None:
        self._hass = hass
        self._username = username
        self._api_key = api_key
        self._client: mqtt.Client | None = None
        self._callbacks: dict[str, FeedCallback] = {}
        self._pending_publishes: set[str] = set()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def subscribe(self, group_key: str, feed_key: str, callback: FeedCallback) -> None:
        topic = self._topic(group_key, feed_key)
        self._callbacks[topic] = callback
        if self._client:
            self._client.subscribe(topic)
            _LOGGER.debug("Subscribed to %s", topic)

    def unsubscribe(self, group_key: str, feed_key: str) -> None:
        topic = self._topic(group_key, feed_key)
        self._callbacks.pop(topic, None)
        if self._client:
            self._client.unsubscribe(topic)
            _LOGGER.debug("Unsubscribed from %s", topic)

    async def async_publish(self, group_key: str, feed_key: str, value: str) -> None:
        topic = self._topic(group_key, feed_key)
        self._pending_publishes.add(topic)
        await self._hass.async_add_executor_job(
            self._client.publish, topic, value
        )
        _LOGGER.debug("Published %s → %s", value, topic)

    async def async_connect(self) -> None:
        self._client = mqtt.Client()
        self._client.username_pw_set(self._username, self._api_key)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.on_disconnect = self._on_disconnect
        await self._hass.async_add_executor_job(
            self._client.connect, AIO_MQTT_HOST, AIO_MQTT_PORT, 60
        )
        self._client.loop_start()
        _LOGGER.info("MQTT loop started for %s", self._username)

    async def async_disconnect(self) -> None:
        if self._client:
            self._client.loop_stop()
            await self._hass.async_add_executor_job(self._client.disconnect)
            self._client = None
            _LOGGER.info("MQTT disconnected for %s", self._username)

    # ------------------------------------------------------------------
    # Paho callbacks (called from the paho network thread)
    # ------------------------------------------------------------------

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            _LOGGER.info("Connected to Adafruit IO MQTT broker")
            for topic in self._callbacks:
                client.subscribe(topic)
        else:
            _LOGGER.error("MQTT connection refused, rc=%d", rc)

    def _on_message(self, client, userdata, msg):
        topic = msg.topic

        if topic in self._pending_publishes:
            # This echo is our own publish; discard it
            self._pending_publishes.discard(topic)
            return

        callback = self._callbacks.get(topic)
        if callback is None:
            return

        value = msg.payload.decode("utf-8")
        _LOGGER.debug("MQTT message on %s: %s", topic, value)

        # Dispatch back to the HA event loop safely from the paho thread
        asyncio.run_coroutine_threadsafe(callback(value), self._hass.loop)

    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            _LOGGER.warning("Unexpected MQTT disconnect, rc=%d — paho will reconnect", rc)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _topic(self, group_key: str, feed_key: str) -> str:
        return f"{self._username}/feeds/{group_key}.{feed_key}"
