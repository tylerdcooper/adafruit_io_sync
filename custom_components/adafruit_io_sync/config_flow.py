"""
Config flow for Adafruit IO Sync.

Initial setup (ConfigFlow):
  user → enter username + API key → validate → done

Options flow (gear icon):
  init             → pick which AIO groups to pull into HA
  group_feeds      → configure each feed (one page per group)
  ha_to_aio        → pick which HA entities to push to AIO
  ha_entity_config → name the AIO group/feed for each entity (one page per entity)
"""

from __future__ import annotations

import logging

import aiohttp
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    BooleanSelector,
    EntitySelector,
    EntitySelectorConfig,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)

from .const import (
    AIO_BASE_URL,
    CONF_AIO_API_KEY,
    CONF_AIO_USERNAME,
    CONF_FEEDS,
    CONF_HA_TO_AIO,
    CONF_SYNCED_GROUPS,
    DIRECTION_AIO_TO_HA,
    DIRECTION_BIDIRECTIONAL,
    DOMAIN,
    ENTITY_TYPES,
)

_LOGGER = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class InvalidAuth(Exception):
    pass


class CannotConnect(Exception):
    pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_key(key: str) -> str:
    return key.replace("-", "_").replace(".", "_")


async def _validate_credentials(username: str, api_key: str) -> None:
    headers = {"X-AIO-Key": api_key}
    url = f"{AIO_BASE_URL}/{username}/groups"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status == 401:
                    raise InvalidAuth
                resp.raise_for_status()
    except aiohttp.ClientError as err:
        raise CannotConnect from err


async def _fetch_groups(username: str, api_key: str) -> dict:
    headers = {"X-AIO-Key": api_key}
    url = f"{AIO_BASE_URL}/{username}/groups"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as resp:
            resp.raise_for_status()
            groups_data = await resp.json()

    result = {}
    for group in groups_data:
        group_key = group["key"]
        feeds = {}
        for feed in group.get("feeds", []):
            raw_key = feed["key"]
            feed_key = raw_key.split(".")[-1] if "." in raw_key else raw_key
            feeds[feed_key] = {"name": feed["name"]}
        result[group_key] = {"name": group["name"], "feeds": feeds}
    return result


# ---------------------------------------------------------------------------
# Initial setup flow
# ---------------------------------------------------------------------------

class ConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors: dict[str, str] = {}

        if user_input is not None:
            try:
                await _validate_credentials(
                    user_input[CONF_AIO_USERNAME],
                    user_input[CONF_AIO_API_KEY],
                )
            except InvalidAuth:
                errors["base"] = "invalid_auth"
            except CannotConnect:
                errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(user_input[CONF_AIO_USERNAME].lower())
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=user_input[CONF_AIO_USERNAME],
                    data=user_input,
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_AIO_USERNAME): TextSelector(),
                    vol.Required(CONF_AIO_API_KEY): TextSelector(
                        TextSelectorConfig(type=TextSelectorType.PASSWORD)
                    ),
                }
            ),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return OptionsFlowHandler(config_entry)


# ---------------------------------------------------------------------------
# Options flow
# ---------------------------------------------------------------------------

class OptionsFlowHandler(config_entries.OptionsFlow):

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._entry = config_entry

        # AIO → HA state
        self._all_groups: dict = {}
        self._selected_groups: list[str] = []
        self._groups_queue: list[str] = []
        self._current_group: str | None = None
        self._feed_configs: dict = dict(config_entry.options.get(CONF_FEEDS, {}))

        # HA → AIO state
        self._ha_entities_selected: list[str] = []
        self._ha_entities_queue: list[str] = []
        self._current_ha_entity: str | None = None
        self._ha_to_aio_configs: list[dict] = []
        self._existing_ha_to_aio: dict[str, dict] = {
            item["entity_id"]: item
            for item in config_entry.options.get(CONF_HA_TO_AIO, [])
        }

    # ------------------------------------------------------------------
    # Step 1 — pick AIO groups to pull into HA
    # ------------------------------------------------------------------

    async def async_step_init(self, user_input=None):
        coordinator = self.hass.data[DOMAIN][self._entry.entry_id]["coordinator"]
        self._all_groups = coordinator.data or {}

        if not self._all_groups:
            try:
                self._all_groups = await _fetch_groups(
                    self._entry.data[CONF_AIO_USERNAME],
                    self._entry.data[CONF_AIO_API_KEY],
                )
            except Exception:
                return self.async_abort(reason="no_groups")

        if not self._all_groups:
            return self.async_abort(reason="no_groups")

        if user_input is not None:
            self._selected_groups = user_input.get(CONF_SYNCED_GROUPS, [])
            self._groups_queue = list(self._selected_groups)
            return await self.async_step_group_feeds()

        current_selection = self._entry.options.get(CONF_SYNCED_GROUPS, [])

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_SYNCED_GROUPS, default=current_selection
                    ): SelectSelector(
                        SelectSelectorConfig(
                            options=[
                                SelectOptionDict(value=k, label=v["name"])
                                for k, v in self._all_groups.items()
                            ],
                            multiple=True,
                            mode=SelectSelectorMode.LIST,
                        )
                    ),
                }
            ),
        )

    # ------------------------------------------------------------------
    # Steps 2..N — configure feeds for one group at a time
    # ------------------------------------------------------------------

    async def async_step_group_feeds(self, user_input=None):
        if user_input is not None and self._current_group is not None:
            group_feeds = self._all_groups[self._current_group]["feeds"]
            for feed_key in group_feeds:
                safe = _safe_key(feed_key)
                config_key = f"{self._current_group}.{feed_key}"
                self._feed_configs[config_key] = {
                    "enabled": user_input.get(f"{safe}_enabled", True),
                    "entity_type": user_input.get(f"{safe}_type", "sensor"),
                    "direction": user_input.get(f"{safe}_direction", DIRECTION_AIO_TO_HA),
                    "unit": user_input.get(f"{safe}_unit", ""),
                }

        if not self._groups_queue:
            # Prune stale feed configs then move on to HA→AIO setup
            selected_prefixes = tuple(f"{g}." for g in self._selected_groups)
            self._feed_configs = {
                k: v
                for k, v in self._feed_configs.items()
                if k.startswith(selected_prefixes)
            }
            return await self.async_step_ha_to_aio()

        self._current_group = self._groups_queue.pop(0)
        group_data = self._all_groups[self._current_group]
        feeds = group_data["feeds"]

        schema_dict: dict = {}
        for feed_key, feed_info in feeds.items():
            safe = _safe_key(feed_key)
            config_key = f"{self._current_group}.{feed_key}"
            current = self._feed_configs.get(config_key, {})

            schema_dict[
                vol.Optional(f"{safe}_enabled", default=current.get("enabled", True))
            ] = BooleanSelector()

            schema_dict[
                vol.Optional(f"{safe}_type", default=current.get("entity_type", "sensor"))
            ] = SelectSelector(
                SelectSelectorConfig(options=ENTITY_TYPES, mode=SelectSelectorMode.DROPDOWN)
            )

            schema_dict[
                vol.Optional(
                    f"{safe}_direction",
                    default=current.get("direction", DIRECTION_AIO_TO_HA),
                )
            ] = SelectSelector(
                SelectSelectorConfig(
                    options=[
                        SelectOptionDict(value=DIRECTION_AIO_TO_HA, label="AIO → HA  (read-only)"),
                        SelectOptionDict(value=DIRECTION_BIDIRECTIONAL, label="Bidirectional  (read + write)"),
                    ],
                    mode=SelectSelectorMode.DROPDOWN,
                )
            )

            schema_dict[
                vol.Optional(f"{safe}_unit", default=current.get("unit", ""))
            ] = TextSelector()

        return self.async_show_form(
            step_id="group_feeds",
            data_schema=vol.Schema(schema_dict),
            description_placeholders={
                "group_name": group_data["name"],
                "feeds": ", ".join(f["name"] for f in feeds.values()),
                "remaining": str(len(self._groups_queue)),
            },
        )

    # ------------------------------------------------------------------
    # Step N+1 — pick HA entities to push to AIO
    # ------------------------------------------------------------------

    async def async_step_ha_to_aio(self, user_input=None):
        if user_input is not None:
            self._ha_entities_selected = user_input.get("entities", [])
            self._ha_entities_queue = list(self._ha_entities_selected)
            self._ha_to_aio_configs = []

            if not self._ha_entities_queue:
                return self._create_final_entry()

            return await self.async_step_ha_entity_config()

        current_entities = list(self._existing_ha_to_aio.keys())

        return self.async_show_form(
            step_id="ha_to_aio",
            data_schema=vol.Schema(
                {
                    vol.Optional("entities", default=current_entities): EntitySelector(
                        EntitySelectorConfig(multiple=True)
                    ),
                }
            ),
        )

    # ------------------------------------------------------------------
    # Steps N+2.. — name the AIO group/feed for each selected HA entity
    # ------------------------------------------------------------------

    async def async_step_ha_entity_config(self, user_input=None):
        if user_input is not None and self._current_ha_entity is not None:
            self._ha_to_aio_configs.append(
                {
                    "entity_id": self._current_ha_entity,
                    "aio_group": user_input["aio_group"].lower().replace(" ", "-"),
                    "aio_feed": user_input["aio_feed"].lower().replace(" ", "-"),
                }
            )

        if not self._ha_entities_queue:
            return self._create_final_entry()

        self._current_ha_entity = self._ha_entities_queue.pop(0)
        entity_id = self._current_ha_entity
        existing = self._existing_ha_to_aio.get(entity_id, {})

        # Sensible defaults derived from the entity_id (e.g. sensor.living_room_temp)
        default_feed = entity_id.split(".")[-1].replace("_", "-")

        return self.async_show_form(
            step_id="ha_entity_config",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        "aio_group",
                        default=existing.get("aio_group", "home-assistant"),
                    ): TextSelector(),
                    vol.Required(
                        "aio_feed",
                        default=existing.get("aio_feed", default_feed),
                    ): TextSelector(),
                }
            ),
            description_placeholders={
                "entity_id": entity_id,
                "remaining": str(len(self._ha_entities_queue)),
            },
        )

    # ------------------------------------------------------------------
    # Finish — write options
    # ------------------------------------------------------------------

    def _create_final_entry(self):
        return self.async_create_entry(
            title="",
            data={
                CONF_SYNCED_GROUPS: self._selected_groups,
                CONF_FEEDS: self._feed_configs,
                CONF_HA_TO_AIO: self._ha_to_aio_configs,
            },
        )
