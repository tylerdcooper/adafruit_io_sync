import asyncio
import json as _json
import logging
from typing import Awaitable, Callable

import paho.mqtt.client as mqtt

from .const import AIO_MQTT_HOST, AIO_MQTT_PORT

_LOGGER = logging.getLogger(__name__)

FeedCallback = Callable[[str], Awaitable[None]]


class AdafruitIOMQTT:
    """
    Manages a single persistent MQTT connection to io.adafruit.com.

    Two subscription modes:
    - subscribe(group, feed, cb)   — exact grouped topic, used by AIO→HA entities
    - subscribe_json(feed_key, cb) — key-only /json topic, used by HA→AIO bidirectional

    AIO publishes two MQTT topic variants for every value change:
      {user}/feeds/{group}.{feed}        plain string value
      {user}/feeds/{feed}/json           JSON blob with last_value, key, etc.

    When the AIO dashboard changes a feed, it publishes on the /json (key-only)
    topic. Physical devices publish on the grouped plain topic.
    We subscribe to whichever format matches how the feed was created.

    Loop detection: _pending_publishes tracks topics we just published to.
    Echoes are discarded and auto-expire after 3 s.
    """

    def __init__(self, hass, username: str, api_key: str) -> None:
        self._hass = hass
        self._username = username
        self._api_key = api_key
        self._client: mqtt.Client | None = None
        self._callbacks: dict[str, FeedCallback] = {}
        self._pending_publishes: set[str] = set()

    # ── Public API ────────────────────────────────────────────────

    def subscribe(self, group_key: str, feed_key: str, callback: FeedCallback) -> None:
        """Subscribe to grouped plain topic — for AIO→HA sensor entities."""
        topic = self._topic(group_key, feed_key)
        self._callbacks[topic] = callback
        if self._client:
            self._client.subscribe(topic)

    def subscribe_json(self, feed_key: str, callback: FeedCallback) -> None:
        """Subscribe to key-only /json topic — for HA→AIO bidirectional feeds.

        AIO publishes dashboard changes on {user}/feeds/{feed}/json without the
        group prefix. We store both the plain and json variants so either format
        triggers the callback.
        """
        for topic in (
            f"{self._username}/feeds/{feed_key}",
            f"{self._username}/feeds/{feed_key}/json",
        ):
            self._callbacks[topic] = callback
            if self._client:
                self._client.subscribe(topic)

    def unsubscribe(self, group_key: str, feed_key: str) -> None:
        topic = self._topic(group_key, feed_key)
        self._callbacks.pop(topic, None)
        if self._client:
            self._client.unsubscribe(topic)

    async def async_publish(self, group_key: str, feed_key: str, value: str) -> None:
        topic = self._topic(group_key, feed_key)
        # Track all topic variants that AIO may echo back so we suppress them
        echo_topics = {
            topic,
            f"{self._username}/feeds/{feed_key}",
            f"{self._username}/feeds/{feed_key}/json",
        }
        self._pending_publishes.update(echo_topics)
        for t in echo_topics:
            self._hass.loop.call_later(3, self._pending_publishes.discard, t)
        await self._hass.async_add_executor_job(self._client.publish, topic, value)

    async def async_connect(self) -> None:
        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
        self._client.username_pw_set(self._username, self._api_key)
        self._client.on_connect    = self._on_connect
        self._client.on_message    = self._on_message
        self._client.on_disconnect = self._on_disconnect
        await self._hass.async_add_executor_job(
            self._client.connect, AIO_MQTT_HOST, AIO_MQTT_PORT, 60
        )
        self._client.loop_start()

    async def async_disconnect(self) -> None:
        if self._client:
            self._client.loop_stop()
            await self._hass.async_add_executor_job(self._client.disconnect)
            self._client = None

    # ── Paho callbacks ────────────────────────────────────────────

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            _LOGGER.info("MQTT connected — re-subscribing %d topics", len(self._callbacks))
            for topic in self._callbacks:
                client.subscribe(topic)
        else:
            _LOGGER.error("MQTT connection refused rc=%d", rc)

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        raw   = msg.payload.decode("utf-8")

        # Parse JSON topics: extract last_value as a plain string
        if topic.endswith("/json"):
            try:
                value = str(_json.loads(raw).get("last_value", raw))
            except Exception:
                value = raw
        else:
            value = raw

        if topic in self._pending_publishes:
            self._pending_publishes.discard(topic)
            _LOGGER.debug("MQTT echo suppressed: %s", topic)
            return

        callback = self._callbacks.get(topic)
        if callback is None:
            return

        _LOGGER.debug("MQTT ← %s = %r", topic, value)
        asyncio.run_coroutine_threadsafe(callback(value), self._hass.loop)

    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            _LOGGER.warning("MQTT unexpected disconnect rc=%d — paho will reconnect", rc)

    # ── Helpers ───────────────────────────────────────────────────

    def _topic(self, group_key: str, feed_key: str) -> str:
        return f"{self._username}/feeds/{group_key}.{feed_key}"
