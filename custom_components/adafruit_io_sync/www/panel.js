class AdafruitIOSyncPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = { synced_groups: [], feeds: {}, ha_to_aio: [] };
    this._groups = {};
    this._activeTab = 'aio-to-ha';
    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._rendered = true;
      this._buildShell();
      this._loadData();
    }
  }

  // ── API ─────────────────────────────────────────────────────────────

  async _loadData() {
    this._setBusy(true);
    try {
      const [config, groups] = await Promise.all([
        this._hass.callApi('GET', 'adafruit_io_sync/config'),
        this._hass.callApi('GET', 'adafruit_io_sync/groups'),
      ]);
      this._config = config || { synced_groups: [], feeds: {}, ha_to_aio: [] };
      this._groups = groups || {};
    } catch (e) {
      this._showMsg('error', '[API] ' + (e.body?.message || e.message || String(e)));
      this._setBusy(false);
      return;
    }
    try {
      this._renderAIOtoHA();
    } catch (e) {
      this._showMsg('error', '[AIO→HA render] ' + e.message);
      this._setBusy(false);
      return;
    }
    try {
      this._renderHAtoAIO();
    } catch (e) {
      this._showMsg('error', '[HA→AIO render] ' + e.message);
    }
    this._setBusy(false);
  }

  async _save() {
    const btn = this._qs('#btn-save');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      await this._hass.callApi('POST', 'adafruit_io_sync/config', this._config);
      this._showMsg('success', '✓ Saved — integration is reloading, data will refresh shortly.');
      setTimeout(() => this._loadData(), 3000);
    } catch (e) {
      this._showMsg('error', 'Save failed: ' + (e.body?.message || e.message || String(e)));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
  }

  // ── Shell (rendered once) ────────────────────────────────────────────

  _buildShell() {
    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        :host {
          display: block; padding: 20px 24px 80px;
          background: var(--primary-background-color);
          min-height: 100vh;
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
          color: var(--primary-text-color); font-size: 14px;
        }
        .page-header { margin-bottom: 20px; }
        .page-header h1 { margin: 0 0 2px; font-size: 22px; font-weight: 400; }
        .page-header p  { margin: 0; font-size: 13px; color: var(--secondary-text-color); }

        .tabs { display: flex; border-bottom: 2px solid var(--divider-color); margin-bottom: 20px; }
        .tab-btn {
          padding: 10px 24px; border: none; background: transparent; cursor: pointer;
          font-size: 14px; font-weight: 500; color: var(--secondary-text-color);
          border-bottom: 3px solid transparent; margin-bottom: -2px;
          transition: color .15s, border-color .15s;
        }
        .tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
        .tab-btn:hover:not(.active) { color: var(--primary-text-color); background: var(--secondary-background-color); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .card {
          background: var(--card-background-color, #fff);
          border-radius: 12px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0,0,0,.12));
          margin-bottom: 16px; overflow: hidden;
        }
        .card-header {
          padding: 14px 18px; font-size: 15px; font-weight: 500;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--divider-color);
        }
        .badge { font-size: 11px; background: var(--primary-color); color: #fff; border-radius: 10px; padding: 2px 8px; font-weight: 600; }

        .col-heads {
          display: grid; gap: 10px; padding: 7px 18px;
          font-size: 11px; font-weight: 600; letter-spacing: .5px;
          text-transform: uppercase; color: var(--secondary-text-color);
          background: var(--secondary-background-color);
        }
        .feed-grid   { grid-template-columns: 22px 1fr 110px 200px 80px; }
        .entity-grid { grid-template-columns: 1fr 160px 160px 32px; }

        .data-row {
          display: grid; gap: 10px; align-items: center;
          padding: 10px 18px; border-top: 1px solid var(--divider-color);
          transition: background .1s;
        }
        .data-row:hover { background: var(--secondary-background-color); }
        .data-row.feed-grid   { grid-template-columns: 22px 1fr 110px 200px 80px; }
        .data-row.entity-grid { grid-template-columns: 1fr 160px 160px 32px; }

        .name { font-size: 14px; font-weight: 500; line-height: 1.2; }
        .sub  { font-size: 11px; color: var(--secondary-text-color); font-family: monospace; }

        select, input[type=text] {
          width: 100%; padding: 5px 8px;
          border: 1px solid var(--divider-color); border-radius: 6px;
          background: var(--primary-background-color); color: var(--primary-text-color);
          font-size: 13px;
        }
        select:focus, input[type=text]:focus { outline: none; border-color: var(--primary-color); }
        input[type=checkbox] { accent-color: var(--primary-color); cursor: pointer; width: 17px; height: 17px; }

        .add-row {
          display: flex; gap: 10px; align-items: center;
          padding: 12px 18px; border-top: 1px solid var(--divider-color);
          background: var(--secondary-background-color);
        }
        .add-row input { flex: 1; }

        .btn { padding: 9px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; white-space: nowrap; transition: opacity .15s; }
        .btn:disabled { opacity: .45; cursor: not-allowed; }
        .btn-primary { background: var(--primary-color); color: #fff; }
        .btn-outline { background: transparent; color: var(--primary-text-color); border: 1px solid var(--divider-color); }
        .btn-icon {
          width: 30px; height: 30px; border-radius: 50%; border: none;
          background: var(--error-color, #c62828); color: #fff;
          cursor: pointer; font-size: 15px; line-height: 1;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .save-bar {
          position: sticky; bottom: 0; z-index: 10;
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 12px 0; margin-top: 24px;
          border-top: 1px solid var(--divider-color);
          background: var(--primary-background-color);
        }
        .msg { padding: 11px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 14px; }
        .msg.error   { background: var(--error-color, #c62828); color: #fff; }
        .msg.success { background: #2e7d32; color: #fff; }
        .empty { text-align: center; padding: 40px 24px; color: var(--secondary-text-color); font-size: 14px; line-height: 1.6; }
        .spinner { text-align: center; padding: 48px; color: var(--secondary-text-color); }
        .section-label { font-size: 12px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: var(--secondary-text-color); margin: 20px 0 8px; }
      </style>

      <div class="page-header">
        <h1>Adafruit IO Sync</h1>
        <p>Real-time sync between Adafruit IO and Home Assistant</p>
      </div>
      <div id="msg-area"></div>
      <div class="tabs">
        <button class="tab-btn active" data-tab="aio-to-ha">☁ AIO → HA</button>
        <button class="tab-btn"        data-tab="ha-to-aio">⌂ HA → AIO</button>
      </div>
      <div id="aio-to-ha" class="tab-content active"><div class="spinner">Loading…</div></div>
      <div id="ha-to-aio" class="tab-content"><div class="spinner">Loading…</div></div>
      <div class="save-bar">
        <button class="btn btn-outline" id="btn-refresh">↺ Refresh</button>
        <button class="btn btn-primary" id="btn-save">Save Changes</button>
      </div>
    `;

    this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeTab = btn.dataset.tab;
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        this.shadowRoot.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === this._activeTab));
      });
    });

    this._on('#btn-save',    'click', () => this._save());
    this._on('#btn-refresh', 'click', () => this._loadData());
  }

  // ── AIO → HA tab ────────────────────────────────────────────────────

  _renderAIOtoHA() {
    const container = this._qs('#aio-to-ha');
    if (!container) return;

    if (!this._groups || !Object.keys(this._groups).length) {
      container.innerHTML = `<div class="empty">No groups found in Adafruit IO.<br>Create a group at <b>io.adafruit.com</b>, then click <b>↺ Refresh</b>.</div>`;
      return;
    }

    let html = '';
    for (const [gk, group] of Object.entries(this._groups)) {
      const feeds = group.feeds || {};
      const count = Object.keys(feeds).length;
      html += `
        <div class="card">
          <div class="card-header">
            <span>${this._esc(group.name)}</span>
            <span class="badge">${count} feed${count !== 1 ? 's' : ''}</span>
          </div>
          <div class="col-heads feed-grid"><span></span><span>Feed</span><span>Type</span><span>Direction</span><span>Unit</span></div>`;

      for (const [fk, feed] of Object.entries(feeds)) {
        const ck  = `${gk}.${fk}`;
        const cfg = (this._config.feeds || {})[ck] || {};
        const en  = cfg.enabled !== false;
        const ty  = cfg.entity_type || 'sensor';
        const dr  = cfg.direction   || 'aio_to_ha';
        const un  = this._esc(cfg.unit || '');

        html += `
          <div class="data-row feed-grid" data-ck="${this._esc(ck)}">
            <input type="checkbox" class="f-en" ${en ? 'checked' : ''}>
            <div><div class="name">${this._esc(feed.name)}</div><div class="sub">${this._esc(ck)}</div></div>
            <select class="f-type">
              <option value="sensor" ${ty==='sensor'?'selected':''}>Sensor</option>
              <option value="switch" ${ty==='switch'?'selected':''}>Switch</option>
              <option value="number" ${ty==='number'?'selected':''}>Number</option>
              <option value="text"   ${ty==='text'  ?'selected':''}>Text</option>
            </select>
            <select class="f-dir">
              <option value="aio_to_ha"     ${dr==='aio_to_ha'    ?'selected':''}>AIO → HA  (read-only)</option>
              <option value="bidirectional" ${dr==='bidirectional'?'selected':''}>Bidirectional ↔</option>
            </select>
            <input type="text" class="f-unit" value="${un}" placeholder="e.g. °C">
          </div>`;
      }
      html += `</div>`;
    }

    container.innerHTML = html;

    container.querySelectorAll('[data-ck]').forEach(row => {
      const ck = row.dataset.ck;
      if (!this._config.feeds) this._config.feeds = {};
      if (!this._config.feeds[ck]) this._config.feeds[ck] = {};
      this._bind(row, '.f-en',   'change', e => { this._config.feeds[ck].enabled = e.target.checked; });
      this._bind(row, '.f-type', 'change', e => { this._config.feeds[ck].entity_type = e.target.value; });
      this._bind(row, '.f-dir',  'change', e => { this._config.feeds[ck].direction = e.target.value; });
      this._bind(row, '.f-unit', 'input',  e => { this._config.feeds[ck].unit = e.target.value; });
    });

    this._config.synced_groups = [
      ...new Set(Object.keys(this._config.feeds || {}).map(k => k.split('.')[0]))
    ];
  }

  // ── HA → AIO tab ────────────────────────────────────────────────────

  _renderHAtoAIO() {
    const container = this._qs('#ha-to-aio');
    if (!container) return;

    const items    = this._config.ha_to_aio || [];
    const entities = Object.keys(this._hass?.states || {}).sort();

    let rowsHtml = items.length === 0
      ? `<div class="empty">No entities mapped yet.<br>Use the picker below to add one.</div>`
      : `<div class="col-heads entity-grid"><span>HA Entity</span><span>AIO Group</span><span>AIO Feed</span><span></span></div>`
        + items.map((item, i) => `
          <div class="data-row entity-grid" data-i="${i}">
            <div>
              <div class="name">${this._esc(item.entity_id)}</div>
              <div class="sub">current: ${this._esc(this._hass?.states?.[item.entity_id]?.state ?? 'unavailable')}</div>
            </div>
            <input type="text" class="ea-group" value="${this._esc(item.aio_group)}" placeholder="home-assistant">
            <input type="text" class="ea-feed"  value="${this._esc(item.aio_feed)}"  placeholder="my-feed">
            <button class="btn-icon rm-btn" data-i="${i}" title="Remove">✕</button>
          </div>`).join('');

    // Datalist is built programmatically to avoid HTML injection from entity IDs
    container.innerHTML = `
      <div class="section-label">Entities pushing state to Adafruit IO in real time</div>
      <div class="card">
        <div class="card-header"><span>Mapped entities</span><span class="badge">${items.length}</span></div>
        ${rowsHtml}
        <div class="add-row">
          <input type="text" id="entity-input" placeholder="Search for a HA entity…" autocomplete="off">
          <button class="btn btn-primary" id="btn-add">+ Add</button>
        </div>
      </div>`;

    // Build datalist via DOM API — safe against any entity ID characters
    const entityInput = container.querySelector('#entity-input');
    if (entityInput) {
      const dl = document.createElement('datalist');
      dl.id = 'aio-sync-entity-dl';
      entities.forEach(id => {
        const opt = document.createElement('option');
        opt.value = id;
        dl.appendChild(opt);
      });
      // Store at shadow root level so it survives re-renders of the container
      const prev = this.shadowRoot.querySelector('#aio-sync-entity-dl');
      if (prev) prev.remove();
      this.shadowRoot.appendChild(dl);
      entityInput.setAttribute('list', 'aio-sync-entity-dl');
    }

    container.querySelectorAll('[data-i]').forEach(row => {
      const i = parseInt(row.dataset.i);
      this._bind(row, '.ea-group', 'input', e => {
        this._config.ha_to_aio[i].aio_group = e.target.value;
        const sub = row.querySelector('.sub');
        if (sub) sub.textContent = `→ ${this._config.ha_to_aio[i].aio_group}.${this._config.ha_to_aio[i].aio_feed}`;
      });
      this._bind(row, '.ea-feed', 'input', e => {
        this._config.ha_to_aio[i].aio_feed = e.target.value;
        const sub = row.querySelector('.sub');
        if (sub) sub.textContent = `→ ${this._config.ha_to_aio[i].aio_group}.${this._config.ha_to_aio[i].aio_feed}`;
      });
      this._bind(row, '.rm-btn', 'click', () => {
        this._config.ha_to_aio.splice(i, 1);
        this._renderHAtoAIO();
      });
    });

    this._on('#btn-add', 'click', () => {
      const input    = container.querySelector('#entity-input');
      const entityId = input?.value?.trim();
      if (!entityId) return;
      if (!this._hass?.states?.[entityId]) {
        this._showMsg('error', `"${entityId}" is not a known HA entity.`); return;
      }
      if ((this._config.ha_to_aio || []).find(x => x.entity_id === entityId)) {
        this._showMsg('error', 'That entity is already mapped.'); return;
      }
      const defaultFeed = entityId.split('.')[1]?.replace(/_/g, '-') ?? 'feed';
      if (!this._config.ha_to_aio) this._config.ha_to_aio = [];
      this._config.ha_to_aio.push({ entity_id: entityId, aio_group: 'home-assistant', aio_feed: defaultFeed });
      if (input) input.value = '';
      this._renderHAtoAIO();
    }, container);
  }

  // ── Utilities ────────────────────────────────────────────────────────

  /** querySelector on the shadow root */
  _qs(sel) { return this.shadowRoot.querySelector(sel); }

  /** Safe querySelector + addEventListener — silently skips if element not found */
  _on(sel, event, handler, root) {
    const el = (root || this.shadowRoot).querySelector(sel);
    if (el) el.addEventListener(event, handler);
  }

  /** Safe querySelector on a parent + addEventListener */
  _bind(parent, sel, event, handler) {
    const el = parent.querySelector(sel);
    if (el) el.addEventListener(event, handler);
  }

  _setBusy(on) {
    const btn = this._qs('#btn-save');
    if (btn) btn.disabled = on;
  }

  _showMsg(type, text) {
    const area = this._qs('#msg-area');
    if (!area) return;
    area.innerHTML = `<div class="msg ${type}">${text}</div>`;
    if (type === 'success') setTimeout(() => { area.innerHTML = ''; }, 7000);
  }

  /** Escape a value for safe use inside an HTML attribute or text node */
  _esc(val) {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

customElements.define('adafruit-io-sync-panel', AdafruitIOSyncPanel);
