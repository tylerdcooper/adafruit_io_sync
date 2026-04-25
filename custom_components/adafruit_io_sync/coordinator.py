import logging
from datetime import timedelta

import aiohttp
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import AIO_BASE_URL, DOMAIN

_LOGGER = logging.getLogger(__name__)


class AdafruitIOCoordinator(DataUpdateCoordinator):
    """Polls the Adafruit IO REST API every 5 minutes to refresh group/feed metadata."""

    def __init__(self, hass, username: str, api_key: str) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(minutes=5),
        )
        self.username = username
        self._api_key = api_key

    async def _async_update_data(self) -> dict:
        try:
            async with aiohttp.ClientSession() as session:
                return await self._fetch_groups(session)
        except aiohttp.ClientResponseError as err:
            raise UpdateFailed(f"Adafruit IO API error {err.status}: {err.message}") from err
        except aiohttp.ClientError as err:
            raise UpdateFailed(f"Cannot reach Adafruit IO: {err}") from err

    async def _fetch_groups(self, session: aiohttp.ClientSession) -> dict:
        headers = {"X-AIO-Key": self._api_key}
        url = f"{AIO_BASE_URL}/{self.username}/groups"

        async with session.get(url, headers=headers) as resp:
            resp.raise_for_status()
            groups_data = await resp.json()

        result = {}
        for group in groups_data:
            group_key = group["key"]
            feeds = {}
            for feed in group.get("feeds", []):
                raw_key = feed["key"]
                # AIO returns "group.feed" as the full key; strip the prefix
                feed_key = raw_key.split(".")[-1] if "." in raw_key else raw_key
                feeds[feed_key] = {
                    "name": feed["name"],
                    "last_value": feed.get("last_value"),
                    "full_key": raw_key,
                }
            result[group_key] = {
                "name": group["name"],
                "feeds": feeds,
            }

        return result


async def validate_credentials(username: str, api_key: str) -> None:
    """Raises InvalidAuth or CannotConnect; otherwise succeeds silently."""
    from .config_flow import CannotConnect, InvalidAuth

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
