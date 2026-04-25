import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_AIO_API_KEY, CONF_AIO_USERNAME, DOMAIN, PLATFORMS
from .coordinator import AdafruitIOCoordinator
from .mqtt_client import AdafruitIOMQTT

_LOGGER = logging.getLogger(__name__)


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

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "coordinator": coordinator,
        "mqtt": mqtt_client,
    }

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Reload the entry whenever the user saves new options
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        data = hass.data[DOMAIN].pop(entry.entry_id)
        await data["mqtt"].async_disconnect()
    return unload_ok


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
