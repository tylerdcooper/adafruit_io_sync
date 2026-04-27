<div align="center">

<img src="docs/aio_sync_logo.svg" height="60" alt="Adafruit IO Sync — AIO ↔ Home Assistant">

# Adafruit IO Sync

**Real-time bidirectional sync between [Adafruit IO](https://io.adafruit.com) and [Home Assistant](https://www.home-assistant.io)**

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![Version](https://img.shields.io/github/v/release/tylerdcooper/adafruit_io_sync)](https://github.com/tylerdcooper/adafruit_io_sync/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

A HACS custom integration that bridges Adafruit IO feed groups and Home Assistant entities with a full sidebar panel app for configuration — no YAML required.

## Features

- **AIO → HA**: Import Adafruit IO feed groups as HA devices; each feed becomes a sensor, switch, number, or text entity
- **HA → AIO**: Push HA entity state changes to Adafruit IO feeds in real time
- **Bidirectional sync**: Full two-way control — change a value in HA or AIO and both update instantly
- **Automatic attribute feeds**: Dimmers publish brightness %, climate entities publish target temperature, fans publish speed %, and more — automatically
- **Sidebar panel**: A dedicated app in your HA sidebar to browse, add, and manage all sync mappings without touching YAML
- **Loop safe**: Publish-echo detection prevents state flapping when syncing bidirectionally
- **MQTT powered**: Uses Adafruit IO's MQTT broker for sub-second latency

## Screenshots

| AIO → HA (feed browser) | HA → AIO (entity browser) |
|---|---|
| Browse your AIO groups on the left, click **+** to import feeds as HA entities | Browse HA entities by domain, click **+** to start pushing state to AIO |

<img width="2398" height="801" alt="image" src="https://github.com/user-attachments/assets/e17e0536-1b13-468b-befc-28247c4ad7e7" />
---
<img width="2398" height="801" alt="image" src="https://github.com/user-attachments/assets/e061aacc-16aa-4808-93b7-71b9f7023a78" />

## Requirements

- **Home Assistant** 2023.x or newer
- **HACS** (Home Assistant Community Store)
- **Adafruit IO account** — [free tier](https://io.adafruit.com) works; IO+ raises rate limits
- Your AIO **username** and **API key** (find it at io.adafruit.com → My Key)

## Installation

### Via HACS (Recommended)

1. Open **HACS** in your HA sidebar
2. Go to **Integrations** → click the three-dot menu → **Custom repositories**
3. Add `https://github.com/tylerdcooper/adafruit_io_sync` as type **Integration**
4. Search for **Adafruit IO Sync** and click **Download**
5. Restart Home Assistant
6. Go to **Settings → Integrations → Add Integration** and search for **Adafruit IO Sync**
7. Enter your AIO username and API key

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/tylerdcooper/adafruit_io_sync/releases)
2. Copy the `custom_components/adafruit_io_sync` folder into your HA `config/custom_components/` directory
3. Restart Home Assistant
4. Add the integration via **Settings → Integrations**

## Configuration

All configuration is done through the **AIO Sync** sidebar panel — no YAML required.

### AIO → HA (Importing feeds into Home Assistant)

1. Open **AIO Sync** in the HA sidebar
2. The left panel shows all your Adafruit IO groups and feeds
3. Click **+** next to any feed to instantly add it as a HA entity, or click **+** on a group header to add all feeds in that group at once
4. The right panel shows your configured feeds grouped by device (AIO group)
5. Click the **edit** icon on any feed to set its entity type, direction, and unit

**Entity types:**

| Type | Use for |
|---|---|
| Sensor | Temperature, humidity, CO₂, any read-only numeric value |
| Switch | On/off feeds (fans, lights, relays) |
| Number | Adjustable numeric values (setpoints, levels) |
| Text | String values |

**Directions:**

| Direction | Behavior |
|---|---|
| AIO → HA | Read-only. AIO publishes → HA entity updates. HA cannot write back. |
| ⇄ Bidirectional | AIO publishes → HA updates. HA entity changes → AIO feed updates. |

### HA → AIO (Pushing HA state to Adafruit IO)

1. Switch to the **HA → AIO** tab in the sidebar panel
2. The left panel shows all HA entities grouped by domain (fan, light, sensor, etc.)
3. Click **+** next to any entity to instantly add it — the integration will use your **My Feeds** group and name the feed `ha-{entity-name}` (e.g., `ha-bathroom-fan`)
4. Click **edit** on any entry in the right panel to change the AIO group, feed name, or direction

> **Tip:** Feeds in AIO are created automatically on integration reload if they don't exist yet.

### Bidirectional HA → AIO

When an entity is set to **⇄ Bidirectional**, changing the value in the AIO dashboard will immediately control the HA entity:

- `on` / `off` / `1` / `0` → calls `homeassistant.turn_on` / `turn_off`
- Numeric values on attribute feeds → calls the appropriate service (see below)

## Automatic Attribute Feeds

For supported entity types, the integration automatically creates additional AIO feeds for each attribute. For example, adding `light.kitchen` creates:

| Feed | Value | Writable |
|---|---|---|
| `ha-kitchen` | `on` / `off` | ✓ (bidirectional) |
| `ha-kitchen-brightness` | `0–100` % | ✓ |
| `ha-kitchen-color-temp` | Kelvin | ✓ |

**Supported domains and attributes:**

| Domain | Attributes created | Notes |
|---|---|---|
| `light` | brightness %, color temp (K) | Brightness converts 0–255 → 0–100% |
| `fan` | speed %, oscillating | Oscillating: `on`/`off` |
| `climate` | target temp, current temp, target humidity, current humidity | Current values are read-only |
| `cover` | position %, tilt % | — |
| `media_player` | volume %, media title, artist | Volume converts 0.0–1.0 → 0–100; title/artist read-only |
| `vacuum` | battery %, fan speed | Battery read-only; fan speed is a string (e.g. `quiet`) |
| `water_heater` | current temp, target temp | Current temp read-only |
| `humidifier` | target humidity, current humidity | Current humidity read-only |
| `weather` | temperature, humidity, wind speed, pressure, wind bearing | All read-only |
| `valve` | position % | — |

Attributes are only published when the entity actually has that attribute and when the value changes — so a basic white bulb without color temperature support won't create a color-temp feed.

## Cross-Tab Awareness

The panel prevents accidental data loops:

- **AIO → HA browser**: Feeds that are already being pushed **from** HA show an orange **HA** badge instead of a `+` button — adding them to AIO→HA would create a loop
- **AIO → HA configured list**: Any feed that also appears in HA→AIO shows a red **⚠ Loop** warning badge
- **Group `+` button**: Automatically skips HA-originated feeds when adding an entire group

## Rate Limits

Adafruit IO enforces publish rate limits:

| Plan | Limit |
|---|---|
| Free | 30 data points / minute |
| IO+ | Higher limits (see AIO pricing) |

With bidirectional sync and attribute feeds, a single entity can generate multiple publishes per state change. If you have many entities syncing frequently, consider IO+ or reducing the number of bidirectional feeds.

## Troubleshooting

**Panel doesn't load / shows blank**
- Hard refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`)
- Check HA logs for errors from `custom_components.adafruit_io_sync`

**No groups showing in the browser**
- Go to **Settings → Integrations → Adafruit IO Sync → Reload**
- Verify your API key at io.adafruit.com → My Key

**Values update in HA but not AIO (or vice versa)**
- Confirm the entity direction is set to **⇄ Bidirectional** (not AIO → HA only)
- Check that the AIO feed exists and has the correct key
- Check HA logs for `AIO→HA bidir` warnings

**Getting `Login attempt failed` in HA notifications**
- This is a HA security alert for failed authentication attempts, not from this integration
- If it appears when opening the panel, try logging out of HA and back in to refresh your session token

**Brightness / dimmer not responding from AIO**
- Make sure the light entity is set to **⇄ Bidirectional**
- The brightness feed name is `ha-{light-name}-brightness` (e.g., `ha-kitchen-brightness`)
- Set the value in AIO as a number 0–100 (percent)

## How It Works

```
Adafruit IO                    Home Assistant
   │                                │
   │  MQTT: {user}/feeds/{feed}     │
   │◄──────────────────────────────►│
   │                                │
   │  REST API (group/feed creation)│
   │◄───────────────────────────────│
```

- **AIO → HA entities**: The coordinator polls the AIO REST API every 5 minutes to discover groups and feeds. MQTT subscriptions provide real-time updates between polls.
- **HA → AIO**: State change listeners on HA entities trigger MQTT publishes to AIO immediately when entity state or attributes change.
- **Authentication**: Uses your AIO API key for REST calls and as the MQTT password.

## Development

```bash
# Clone the repo
git clone https://github.com/tylerdcooper/adafruit_io_sync.git

# Copy to your HA config for testing
cp -r custom_components/adafruit_io_sync /path/to/ha/config/custom_components/

# Restart HA and check logs
```

Pull requests welcome. Please open an issue first for significant changes.

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ for the Home Assistant and Adafruit communities
</div>
