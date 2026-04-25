"""
Config flow for Adafruit IO Sync.

Initial setup  (ConfigFlow):
  user → enter username + API key → validate → done

Options flow (gear icon on the integration):
  init        → multiselect which AIO groups to bring into HA
  group_feeds → one step per selected group; configure every feed:
                  • enabled (bool)
                  • entity type  (sensor / switch / number / text)
                  • direction    (AIO→HA read-only  |  bidirectional)
                  • unit of measurement (optional, used by sensor + number)
"""

from __future__ import annotations

import logging

import aiohttp
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    BooleanSelector,
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
    CONF_SYNCED_GROUPS,
    DIRECTION_AIO_TO_HA,
    DIRECTION_BIDIRECTIONAL,
    DOMAIN,
    ENTITY_TYPES,
)

_LOGGER = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions used during credential validation
# ---------------------------------------------------------------------------

class InvalidAuth(Exception):
    pass


class CannotConnect(Exception):
    pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_key(key: str) -> str:
    """Convert an AIO feed key to a safe voluptuous field name (no hyphens/dots)."""
    return key.replace("-", "_").replace(".", "_")


async def _validate_credentials(username: str, api_key: str) -> None:
    """Hit the AIO API; raise InvalidAuth or CannotConnect on failure."""
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
    """Return coordinator-style group dict directly from the REST API."""
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
    """
    Multi-step options wizard:
      init         — pick which AIO groups to sync
      group_feeds  — repeated once per selected group to configure each feed
    """

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._entry = config_entry
        self._all_groups: dict = {}
        self._selected_groups: list[str] = []
        self._groups_queue: list[str] = []
        self._current_group: str | None = None
        # Carry existing feed options forward so re-configuring keeps old values
        self._feed_configs: dict = dict(config_entry.options.get(CONF_FEEDS, {}))

    # ------------------------------------------------------------------
    # Step 1 — pick groups
    # ------------------------------------------------------------------

    async def async_step_init(self, user_input=None):
        errors: dict[str, str] = {}

        # Prefer live coordinator data; fall back to a fresh REST fetch
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

            if not self._groups_queue:
                # Nothing selected — save and exit immediately
                return self.async_create_entry(
                    title="",
                    data={CONF_SYNCED_GROUPS: [], CONF_FEEDS: {}},
                )

            return await self.async_step_group_feeds()

        current_selection = self._entry.options.get(CONF_SYNCED_GROUPS, [])

        group_options = [
            SelectOptionDict(value=k, label=v["name"])
            for k, v in self._all_groups.items()
        ]

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_SYNCED_GROUPS, default=current_selection
                    ): SelectSelector(
                        SelectSelectorConfig(
                            options=group_options,
                            multiple=True,
                            mode=SelectSelectorMode.LIST,
                        )
                    ),
                }
            ),
            errors=errors,
        )

    # ------------------------------------------------------------------
    # Step 2..N — configure feeds for one group at a time
    # ------------------------------------------------------------------

    async def async_step_group_feeds(self, user_input=None):
        # Save submitted data for the group we just showed
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

        # Advance to the next group, or finish if the queue is empty
        if not self._groups_queue:
            # Prune feed configs that no longer belong to a selected group
            selected_prefixes = tuple(f"{g}." for g in self._selected_groups)
            pruned = {
                k: v
                for k, v in self._feed_configs.items()
                if k.startswith(selected_prefixes)
            }
            return self.async_create_entry(
                title="",
                data={
                    CONF_SYNCED_GROUPS: self._selected_groups,
                    CONF_FEEDS: pruned,
                },
            )

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
                SelectSelectorConfig(
                    options=ENTITY_TYPES,
                    mode=SelectSelectorMode.DROPDOWN,
                )
            )

            schema_dict[
                vol.Optional(
                    f"{safe}_direction",
                    default=current.get("direction", DIRECTION_AIO_TO_HA),
                )
            ] = SelectSelector(
                SelectSelectorConfig(
                    options=[
                        SelectOptionDict(
                            value=DIRECTION_AIO_TO_HA,
                            label="AIO → HA  (read-only)",
                        ),
                        SelectOptionDict(
                            value=DIRECTION_BIDIRECTIONAL,
                            label="Bidirectional  (read + write)",
                        ),
                    ],
                    mode=SelectSelectorMode.DROPDOWN,
                )
            )

            schema_dict[
                vol.Optional(f"{safe}_unit", default=current.get("unit", ""))
            ] = TextSelector()

        feed_names = ", ".join(info["name"] for info in feeds.values())
        remaining = len(self._groups_queue)

        return self.async_show_form(
            step_id="group_feeds",
            data_schema=vol.Schema(schema_dict),
            description_placeholders={
                "group_name": group_data["name"],
                "feeds": feed_names,
                "remaining": str(remaining),
            },
        )
