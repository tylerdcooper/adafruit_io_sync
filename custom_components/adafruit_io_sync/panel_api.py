import logging
from pathlib import Path

from aiohttp.web import Response
from homeassistant.components.http import HomeAssistantView

from .const import CONF_FEEDS, CONF_HA_TO_AIO, CONF_SYNCED_GROUPS, DOMAIN

_LOGGER = logging.getLogger(__name__)

_WWW = Path(__file__).parent / "www"


class PanelJSView(HomeAssistantView):
    """Serves the panel JavaScript file — no auth required so HA can load it."""

    url = "/adafruit_io_sync_panel/panel.js"
    name = "adafruit_io_sync:panel_js"
    requires_auth = False

    async def get(self, request):
        content = (_WWW / "panel.js").read_text(encoding="utf-8")
        return Response(
            body=content,
            content_type="application/javascript",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )


class AIOSyncConfigView(HomeAssistantView):
    """GET returns current options; POST saves new options and reloads the entry."""

    url = "/api/adafruit_io_sync/config"
    name = "api:adafruit_io_sync:config"
    requires_auth = True

    async def get(self, request):
        hass = request.app["hass"]
        entries = hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return self.json_message("Integration not configured", status_code=404)
        entry = entries[0]
        return self.json({
            CONF_SYNCED_GROUPS: entry.options.get(CONF_SYNCED_GROUPS, []),
            CONF_FEEDS:         entry.options.get(CONF_FEEDS, {}),
            CONF_HA_TO_AIO:     entry.options.get(CONF_HA_TO_AIO, []),
        })

    async def post(self, request):
        hass = request.app["hass"]
        entries = hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return self.json_message("Integration not configured", status_code=404)
        entry = entries[0]
        data = await request.json()

        hass.config_entries.async_update_entry(
            entry,
            options={
                CONF_SYNCED_GROUPS: data.get(CONF_SYNCED_GROUPS, []),
                CONF_FEEDS:         data.get(CONF_FEEDS, {}),
                CONF_HA_TO_AIO:     data.get(CONF_HA_TO_AIO, []),
            },
        )
        # Reload after the response is returned so the client gets its 200
        hass.async_create_task(hass.config_entries.async_reload(entry.entry_id))
        return self.json({"ok": True})


class AIOSyncGroupsView(HomeAssistantView):
    """Returns the coordinator's live AIO group/feed data."""

    url = "/api/adafruit_io_sync/groups"
    name = "api:adafruit_io_sync:groups"
    requires_auth = True

    async def get(self, request):
        hass = request.app["hass"]
        entries = hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return self.json({})
        entry = entries[0]
        data = hass.data.get(DOMAIN, {}).get(entry.entry_id, {})
        coordinator = data.get("coordinator")
        if coordinator and coordinator.data:
            return self.json(coordinator.data)
        return self.json({})
