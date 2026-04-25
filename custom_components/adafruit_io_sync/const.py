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

CONF_AIO_USERNAME = "username"
CONF_AIO_API_KEY = "api_key"
CONF_SYNCED_GROUPS = "synced_groups"
CONF_FEEDS = "feeds"

PLATFORMS = ["sensor", "switch", "number", "text"]
