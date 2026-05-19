DOMAIN = "adafruit_io_sync"

AIO_BASE_URL = "https://io.adafruit.com/api/v2"
AIO_MQTT_HOST = "io.adafruit.com"
AIO_MQTT_PORT = 1883

ENTITY_TYPE_SENSOR = "sensor"
ENTITY_TYPE_SWITCH = "switch"
ENTITY_TYPE_NUMBER = "number"
ENTITY_TYPE_TEXT = "text"
ENTITY_TYPES = [ENTITY_TYPE_SENSOR, ENTITY_TYPE_SWITCH, ENTITY_TYPE_NUMBER, ENTITY_TYPE_TEXT]

DIRECTION_AIO_TO_HA = "aio_to_ha"
DIRECTION_BIDIRECTIONAL = "bidirectional"

# Domains that publish multiple attribute feeds alongside their main state feed.
# When one of these is added to HA→AIO sync, it gets its own dedicated AIO group.
MULTI_ATTR_DOMAINS = frozenset({
    "light", "fan", "climate", "cover", "media_player",
    "vacuum", "water_heater", "humidifier", "weather", "valve",
})

CONF_AIO_USERNAME = "username"
CONF_AIO_API_KEY = "api_key"
CONF_SYNCED_GROUPS = "synced_groups"
CONF_FEEDS = "feeds"
CONF_HA_TO_AIO = "ha_to_aio"
CONF_MIN_CHANGE = "min_change"

PLATFORMS = ["sensor", "switch", "number", "text"]
