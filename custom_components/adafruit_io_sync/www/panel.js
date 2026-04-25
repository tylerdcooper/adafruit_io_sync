// Adafruit IO Sync Panel — v1.3.0

const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
const esc  = v => String(v ?? '').replace(/[&<>"']/g, c => ESC_MAP[c]);

const TYPE_META = {
  sensor: { label: 'Sensor',  cls: 'type-sensor' },
  switch: { label: 'Switch',  cls: 'type-switch' },
  number: { label: 'Number',  cls: 'type-number' },
  text:   { label: 'Text',    cls: 'type-text'   },
};
const DIR_META = {
  aio_to_ha:     { label: 'AIO → HA',       cls: 'dir-oneway' },
  bidirectional: { label: '⇄ Bidirectional', cls: 'dir-bidir'  },
};

const STYLES = `
:host {
  --acc:   var(--primary-color, #03a9f4);
  --surf:  var(--card-background-color, #1c1c1e);
  --surf2: var(--secondary-background-color, #2c2c2e);
  --bg:    var(--primary-background-color, #111112);
  --bdr:   var(--divider-color, rgba(255,255,255,0.10));
  --tx1:   var(--primary-text-color, #e5e5e7);
  --tx2:   var(--secondary-text-color, #8e8e93);
  --rad:   12px;
  --rad-s: 8px;
  --shd:   0 2px 8px rgba(0,0,0,0.35);
  display: block;
  font-family: var(--paper-font-body1_-_font-family, -apple-system, 'Segoe UI', Roboto, sans-serif);
  color: var(--tx1);
  background: var(--bg);
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.5;
}

/* ── Header ─────────────────────────────────────────── */
.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px 0;
  flex-wrap: wrap;
}
.app-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--tx1);
  flex: 1;
  min-width: 160px;
}
.app-title svg { color: var(--acc); flex-shrink: 0; }

/* ── Tabs ────────────────────────────────────────────── */
.tabs {
  display: flex;
  gap: 3px;
  background: var(--surf2);
  border-radius: 10px;
  padding: 3px;
}
.tab-btn {
  border: none;
  background: transparent;
  color: var(--tx2);
  padding: 7px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.tab-btn.active {
  background: var(--surf);
  color: var(--tx1);
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.tab-btn:not(.active):hover { color: var(--tx1); }

/* ── Layout ─────────────────────────────────────────── */
.app-body { padding: 20px 24px 40px; }
.split-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 720px) {
  .split-layout { grid-template-columns: 1fr; }
  .app-header, .app-body { padding-left: 16px; padding-right: 16px; }
}

/* ── Panels ─────────────────────────────────────────── */
.panel {
  background: var(--surf);
  border-radius: var(--rad);
  border: 1px solid var(--bdr);
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--bdr);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--tx2);
}
.count {
  background: var(--surf2);
  color: var(--tx2);
  border-radius: 20px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
}

/* ── Search ─────────────────────────────────────────── */
.search-wrap {
  padding: 10px 12px;
  border-bottom: 1px solid var(--bdr);
}
.search-input {
  width: 100%;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--rad-s);
  color: var(--tx1);
  padding: 7px 10px 7px 32px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
}
.search-input:focus { border-color: var(--acc); }
.search-input::placeholder { color: var(--tx2); }

/* ── Browser ─────────────────────────────────────────── */
.browser-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--tx2);
  font-size: 13px;
  line-height: 1.8;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
  border-top: 1px solid var(--bdr);
}
.group-header:first-child { border-top: none; }
.group-header:hover { background: var(--surf2); }
.group-chevron {
  color: var(--tx2);
  transition: transform 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.group-chevron.open { transform: rotate(90deg); }
.group-name { font-weight: 600; font-size: 13px; flex: 1; }
.group-badge {
  background: var(--surf2);
  color: var(--tx2);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
}

.feed-browser-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 32px;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 13px;
  border-top: 1px solid var(--bdr);
}
.feed-browser-item:hover:not(.added) { background: rgba(3,169,244,0.07); }
.feed-browser-item.added { cursor: default; color: var(--tx2); }
.feed-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--acc);
  flex-shrink: 0;
}
.feed-dot.added-dot { background: #4caf50; }
.feed-label { flex: 1; }
.feed-added-chip {
  font-size: 10px;
  font-weight: 600;
  color: #4caf50;
  background: rgba(76,175,80,0.12);
  border-radius: 8px;
  padding: 1px 7px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* ── Inline Add Form ─────────────────────────────────── */
.inline-form {
  background: rgba(3,169,244,0.05);
  border-top: 2px solid var(--acc);
  padding: 14px 14px 14px 32px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 90px;
}
.form-field label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--tx2);
}
.form-field input,
.form-field select {
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--rad-s);
  color: var(--tx1);
  padding: 7px 9px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.form-field input:focus,
.form-field select:focus { border-color: var(--acc); }
.form-field select option { background: var(--surf); }
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ── Buttons ─────────────────────────────────────────── */
.btn {
  border: none;
  border-radius: var(--rad-s);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  padding: 7px 14px;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.btn-primary { background: var(--acc); color: #fff; }
.btn-primary:hover { filter: brightness(1.1); }
.btn-ghost {
  background: transparent;
  color: var(--tx2);
  border: 1px solid var(--bdr);
}
.btn-ghost:hover { color: var(--tx1); background: var(--surf2); }
.btn-sm { padding: 5px 11px; font-size: 12px; }

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--tx2);
  padding: 5px 6px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  transition: all 0.15s;
  line-height: 1;
}
.icon-btn:hover { color: var(--tx1); background: var(--surf2); }
.icon-btn.danger:hover { color: #ef5350; background: rgba(239,83,80,0.1); }

/* ── Configured Feed Rows ────────────────────────────── */
.list-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--tx2);
  font-size: 13px;
  line-height: 1.8;
}
.list-empty strong { display: block; color: var(--tx1); font-size: 15px; margin-bottom: 8px; }

.feed-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--bdr);
  transition: background 0.1s;
}
.feed-row:first-child { border-top: none; }
.feed-row:hover { background: rgba(255,255,255,0.02); }
.feed-row.disabled { opacity: 0.45; }

.feed-info { flex: 1; min-width: 0; }
.feed-key {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.feed-key .grp { color: var(--tx2); font-weight: 400; }
.feed-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  flex-wrap: wrap;
}
.row-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }

.edit-form {
  background: var(--surf2);
  border-top: 1px solid var(--bdr);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Badges ──────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;
  white-space: nowrap;
}
.type-sensor { background: rgba(33,150,243,0.15);  color: #42a5f5; }
.type-switch { background: rgba(76,175,80,0.15);   color: #66bb6a; }
.type-number { background: rgba(255,152,0,0.15);   color: #ffa726; }
.type-text   { background: rgba(156,39,176,0.15);  color: #ba68c8; }
.dir-oneway  { background: rgba(96,125,139,0.15);  color: #90a4ae; }
.dir-bidir   { background: rgba(0,188,212,0.15);   color: #26c6da; }
.unit-badge  { background: var(--surf2); color: var(--tx2); border: 1px solid var(--bdr); }

/* ── Toggle ──────────────────────────────────────────── */
.toggle { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
.toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-track {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.12);
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s;
}
.toggle input:checked ~ .toggle-track { background: var(--acc); }
.toggle-thumb {
  position: absolute;
  width: 14px; height: 14px;
  background: #fff;
  border-radius: 50%;
  top: 3px; left: 3px;
  pointer-events: none;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
.toggle input:checked ~ .toggle-thumb { transform: translateX(16px); }

/* ── Add Entity Panel ────────────────────────────────── */
.add-panel {
  background: var(--surf);
  border-radius: var(--rad);
  border: 1px solid var(--bdr);
  margin-bottom: 20px;
  overflow: hidden;
}
.add-form-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Entity Rows ─────────────────────────────────────── */
.entity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--bdr);
  transition: background 0.1s;
}
.entity-row:first-child { border-top: none; }
.entity-row:hover { background: rgba(255,255,255,0.02); }
.entity-row.disabled { opacity: 0.45; }
.entity-info { flex: 1; min-width: 0; }
.entity-id {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.entity-dest {
  font-size: 12px;
  color: var(--tx2);
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* ── Loading ─────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.15);
  border-top-color: var(--acc);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.type-unknown, .dir-unknown { background: rgba(255,255,255,0.07); color: var(--tx2); }

.warn-banner {
  background: rgba(255,152,0,0.1);
  border-bottom: 1px solid rgba(255,152,0,0.25);
  color: #ffcc80;
  padding: 10px 16px;
  font-size: 12px;
  line-height: 1.6;
}
.btn-link {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--acc);
  font-size: inherit;
  padding: 0;
  text-decoration: underline;
  font-family: inherit;
}
.danger-link { color: #ef5350; text-decoration: none; }
.danger-link:hover { text-decoration: underline; }

.error-banner {
  background: rgba(198,40,40,0.12);
  border: 1px solid rgba(198,40,40,0.4);
  border-radius: var(--rad-s);
  color: #ef9a9a;
  padding: 12px 16px;
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.loading-state {
  padding: 80px 20px;
  text-align: center;
  color: var(--tx2);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.loading-state .spinner { width: 28px; height: 28px; border-width: 3px; }
.saving-overlay { opacity: 0.55; pointer-events: none; }

/* ── Toast ───────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: #323232;
  color: #fff;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: var(--shd);
  transition: transform 0.25s ease;
  z-index: 100;
  white-space: nowrap;
  pointer-events: none;
}
.toast.show { transform: translateX(-50%) translateY(0); }
.toast.err  { background: #c62828; }

.section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--tx2);
  margin: 0 0 10px;
}
`;

const IC = {
  cloud: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  edit:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  arrow: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  chev:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  plus:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
};

class AdafruitIOSyncPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tab = 'aio_to_ha';
    this._groups = {};
    this._cfg = { feeds: {}, ha_to_aio: [] };
    this._expanded = new Set();
    this._openFeed   = null;
    this._editFeed   = null;
    this._editEnt    = null;
    this._filter     = '';
    this._loading    = true;
    this._saving     = false;
    this._loadError  = null;
    this._addForm    = { entity_type: 'sensor', direction: 'aio_to_ha', unit: '' };
    this._editForm   = {};
    this._newEnt     = { entity_id: '', aio_group: '', aio_feed: '' };
    this._editEntForm = {};
    this._inited     = false;
  }

  set hass(h) {
    this._hass = h;
    if (!this._inited) { this._inited = true; this._loadData(); }
  }

  connectedCallback() {
    if (!this._inited) { this._render(); }
  }

  // ─── Data ────────────────────────────────────────────────────

  async _loadData() {
    this._loading = true;
    this._loadError = null;
    this._render();
    try {
      const [cfg, grp] = await Promise.all([
        this._hass.callApi('GET', 'adafruit_io_sync/config'),
        this._hass.callApi('GET', 'adafruit_io_sync/groups'),
      ]);
      this._cfg    = cfg  || { feeds: {}, ha_to_aio: [] };
      this._groups = grp  || {};
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('not_found') || msg.includes('404')) {
        this._loadError = 'Integration not configured. Go to Settings → Integrations and set up Adafruit IO Sync.';
      } else {
        this._loadError = `Failed to load: ${msg}`;
      }
    }
    this._loading = false;
    this._render();
  }

  async _save(options) {
    this._saving = true;
    this._render();
    try {
      await this._hass.callApi('POST', 'adafruit_io_sync/config', options);
      this._cfg = options;
      this._openFeed = null; this._editFeed = null; this._editEnt = null;
      this._showToast('Saved — reloading integration…');
    } catch (e) {
      this._showToast(`Save failed: ${e?.message || e}`, true);
    }
    this._saving = false;
    this._render();
  }

  // ─── Toast ───────────────────────────────────────────────────

  _showToast(msg, err = false) {
    const t = this.shadowRoot.querySelector('.toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (err ? ' err' : '');
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ─── Root Render ─────────────────────────────────────────────

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="${this._saving ? 'saving-overlay' : ''}">
        <div class="app-header">
          <div class="app-title">${IC.cloud} Adafruit IO Sync</div>
          <div class="tabs">
            <button class="tab-btn${this._tab==='aio_to_ha'?' active':''}" data-tab="aio_to_ha">AIO → HA</button>
            <button class="tab-btn${this._tab==='ha_to_aio'?' active':''}" data-tab="ha_to_aio">HA → AIO</button>
          </div>
        </div>
        <div class="app-body">
          ${this._loadError ? `<div class="error-banner">${esc(this._loadError)} <button class="btn btn-ghost btn-sm" data-reload-groups style="margin-left:12px">Retry</button></div>` : ''}
          ${this._loading
            ? `<div class="loading-state"><div class="spinner"></div>Loading…</div>`
            : this._tab === 'aio_to_ha' ? this._tplAIOtoHA() : this._tplHAtoAIO()
          }
        </div>
      </div>
      <div class="toast"></div>
    `;
    this._bind();
  }

  // ─── AIO → HA ────────────────────────────────────────────────

  _tplAIOtoHA() {
    return `<div class="split-layout">${this._tplBrowser()}${this._tplConfiguredFeeds()}</div>`;
  }

  _tplBrowser() {
    const gkeys = Object.keys(this._groups);
    const q = this._filter.toLowerCase();
    let html = '';

    if (!gkeys.length) {
      html = `<div class="browser-empty">No Adafruit IO groups found.<br>Check your connection or credentials.<br><br><button class="btn btn-ghost btn-sm" data-reload-groups>Retry</button></div>`;
    } else {
      for (const gk of gkeys) {
        const grp = this._groups[gk];
        const fkeys = Object.keys(grp.feeds || {});
        const vis = q ? fkeys.filter(fk => fk.includes(q) || gk.includes(q)) : fkeys;
        if (q && !vis.length) continue;

        const open = this._expanded.has(gk);
        const nAdded = fkeys.filter(fk => (`${gk}.${fk}`) in (this._cfg.feeds||{})).length;

        html += `
          <div class="group-header" data-gk="${esc(gk)}">
            <span class="group-chevron${open?' open':''}">${IC.chev}</span>
            <span class="group-name">${esc(grp.name||gk)}</span>
            <span class="group-badge">${nAdded?`${nAdded}/`:''}${fkeys.length}</span>
          </div>`;

        if (open || q) {
          for (const fk of vis) {
            const full = `${gk}.${fk}`;
            const added = full in (this._cfg.feeds||{});
            const formOpen = this._openFeed === full;
            html += `
              <div class="feed-browser-item${added?' added':''}" data-fk="${esc(full)}" data-added="${added}">
                <span class="feed-dot${added?' added-dot':''}"></span>
                <span class="feed-label">${esc(fk)}</span>
                ${added ? `<span class="feed-added-chip">added</span>` : ''}
              </div>`;

            if (formOpen && !added) {
              const f = this._addForm;
              html += `
                <div class="inline-form" data-add-for="${esc(full)}">
                  <div class="form-row">
                    <div class="form-field">
                      <label>Entity Type</label>
                      <select data-af-type>
                        ${['sensor','switch','number','text'].map(t=>`<option value="${t}"${f.entity_type===t?' selected':''}>${TYPE_META[t].label}</option>`).join('')}
                      </select>
                    </div>
                    <div class="form-field">
                      <label>Direction</label>
                      <select data-af-dir>
                        <option value="aio_to_ha"${f.direction==='aio_to_ha'?' selected':''}>AIO → HA</option>
                        <option value="bidirectional"${f.direction==='bidirectional'?' selected':''}>⇄ Bidirectional</option>
                      </select>
                    </div>
                    <div class="form-field" style="max-width:85px">
                      <label>Unit</label>
                      <input type="text" data-af-unit placeholder="°F" value="${esc(f.unit)}">
                    </div>
                  </div>
                  <div class="form-actions">
                    <button class="btn btn-ghost btn-sm" data-af-cancel>Cancel</button>
                    <button class="btn btn-primary btn-sm" data-af-add="${esc(full)}">${IC.plus} Add to HA</button>
                  </div>
                </div>`;
            }
          }
        }
      }
    }

    return `
      <div class="panel">
        <div class="panel-header">Available Feeds</div>
        <div class="search-wrap">
          <input class="search-input" type="text" autocomplete="off" placeholder="Search groups and feeds…" value="${esc(this._filter)}" data-search>
        </div>
        ${html}
      </div>`;
  }

  _tplConfiguredFeeds() {
    const feeds = this._cfg.feeds || {};
    const keys = Object.keys(feeds);
    const unknownCount = keys.filter(fk => !TYPE_META[feeds[fk].entity_type] || !DIR_META[feeds[fk].direction]).length;
    let html = '';

    if (!keys.length) {
      html = `<div class="list-empty"><strong>No feeds configured yet</strong>Browse the list on the left and click any feed to add it to Home Assistant.</div>`;
    } else {
      if (unknownCount > 0) {
        html += `<div class="warn-banner">${unknownCount} feed${unknownCount>1?'s':''} imported from the old setup wizard have incomplete configuration — use the edit button to fix them, or <button class="btn-link" data-clear-all>clear all feeds</button> to start fresh.</div>`;
      }
      for (const fk of keys) {
        const fc = feeds[fk];
        const dot = fk.indexOf('.');
        const gpart = dot >= 0 ? fk.slice(0, dot) : fk;
        const fname = dot >= 0 ? fk.slice(dot+1) : fk;
        const en = fc.enabled !== false;
        const tm = TYPE_META[fc.entity_type] || { label: 'Not set', cls: 'type-unknown' };
        const dm = DIR_META[fc.direction]    || { label: 'Not set', cls: 'dir-unknown'  };
        const editing = this._editFeed === fk;

        html += `
          <div class="feed-row${en?'':' disabled'}">
            <label class="toggle">
              <input type="checkbox" data-tog-feed="${esc(fk)}"${en?' checked':''}>
              <div class="toggle-track"></div>
              <div class="toggle-thumb"></div>
            </label>
            <div class="feed-info">
              <div class="feed-key"><span class="grp">${esc(gpart)} / </span>${esc(fname)}</div>
              <div class="feed-meta">
                <span class="badge ${tm.cls}">${esc(tm.label)}</span>
                <span class="badge ${dm.cls}">${esc(dm.label)}</span>
                ${fc.unit?`<span class="badge unit-badge">${esc(fc.unit)}</span>`:''}
              </div>
            </div>
            <div class="row-actions">
              <button class="icon-btn" data-edit-feed="${esc(fk)}" title="Edit">${IC.edit}</button>
              <button class="icon-btn danger" data-rm-feed="${esc(fk)}" title="Remove">${IC.trash}</button>
            </div>
          </div>`;

        if (editing) {
          const ef = this._editForm;
          html += `
            <div class="edit-form">
              <div class="form-row">
                <div class="form-field">
                  <label>Entity Type</label>
                  <select data-ef-type>
                    ${['sensor','switch','number','text'].map(t=>`<option value="${t}"${(ef.entity_type||fc.entity_type)===t?' selected':''}>${TYPE_META[t].label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-field">
                  <label>Direction</label>
                  <select data-ef-dir>
                    <option value="aio_to_ha"${(ef.direction||fc.direction)==='aio_to_ha'?' selected':''}>AIO → HA</option>
                    <option value="bidirectional"${(ef.direction||fc.direction)==='bidirectional'?' selected':''}>⇄ Bidirectional</option>
                  </select>
                </div>
                <div class="form-field" style="max-width:85px">
                  <label>Unit</label>
                  <input type="text" data-ef-unit placeholder="°F" value="${esc(ef.unit!==undefined ? ef.unit : (fc.unit||''))}">
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-ghost btn-sm" data-ef-cancel>Cancel</button>
                <button class="btn btn-primary btn-sm" data-ef-save="${esc(fk)}">Save</button>
              </div>
            </div>`;
        }
      }
    }

    return `
      <div class="panel">
        <div class="panel-header">
          Configured Feeds <span class="count">${keys.length}</span>
          ${keys.length ? `<button class="btn-link danger-link" data-clear-all style="margin-left:auto;font-size:11px">Clear all</button>` : ''}
        </div>
        ${html}
      </div>`;
  }

  // ─── HA → AIO ────────────────────────────────────────────────

  _tplHAtoAIO() {
    const allEnts = this._hass ? Object.keys(this._hass.states).sort() : [];
    const opts = allEnts.map(e => `<option value="${esc(e)}">`).join('');
    const ne = this._newEnt;
    const list = this._cfg.ha_to_aio || [];

    let rows = '';
    if (!list.length) {
      rows = `<div class="list-empty"><strong>No entities syncing yet</strong>Use the form above to push HA entity state changes to Adafruit IO in real time.</div>`;
    } else {
      list.forEach((item, idx) => {
        const en = item.enabled !== false;
        const editing = this._editEnt === idx;
        const ef = this._editEntForm;
        rows += `
          <div class="entity-row${en?'':' disabled'}">
            <label class="toggle">
              <input type="checkbox" data-tog-ent="${idx}"${en?' checked':''}>
              <div class="toggle-track"></div>
              <div class="toggle-thumb"></div>
            </label>
            <div class="entity-info">
              <div class="entity-id">${esc(item.entity_id)}</div>
              <div class="entity-dest">${IC.arrow} ${esc(item.aio_group)}.${esc(item.aio_feed)}</div>
            </div>
            <div class="row-actions">
              <button class="icon-btn" data-edit-ent="${idx}" title="Edit">${IC.edit}</button>
              <button class="icon-btn danger" data-rm-ent="${idx}" title="Remove">${IC.trash}</button>
            </div>
          </div>`;

        if (editing) {
          rows += `
            <div class="edit-form">
              <div class="form-row">
                <div class="form-field" style="flex:2">
                  <label>Entity</label>
                  <input type="text" list="ha-ent-list" value="${esc(ef.entity_id!==undefined?ef.entity_id:item.entity_id)}" data-ee-eid>
                </div>
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label>AIO Group</label>
                  <input type="text" value="${esc(ef.aio_group!==undefined?ef.aio_group:item.aio_group)}" data-ee-grp>
                </div>
                <div class="form-field">
                  <label>AIO Feed</label>
                  <input type="text" value="${esc(ef.aio_feed!==undefined?ef.aio_feed:item.aio_feed)}" data-ee-feed>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-ghost btn-sm" data-ee-cancel>Cancel</button>
                <button class="btn btn-primary btn-sm" data-ee-save="${idx}">Save</button>
              </div>
            </div>`;
        }
      });
    }

    return `
      <div class="add-panel">
        <div class="panel-header">Add Entity</div>
        <div class="add-form-body">
          <datalist id="ha-ent-list">${opts}</datalist>
          <div class="form-row">
            <div class="form-field" style="flex:2">
              <label>Home Assistant Entity</label>
              <input type="text" list="ha-ent-list" placeholder="sensor.temperature" value="${esc(ne.entity_id)}" data-ne-eid>
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>AIO Group</label>
              <input type="text" placeholder="home" value="${esc(ne.aio_group)}" data-ne-grp>
            </div>
            <div class="form-field">
              <label>AIO Feed</label>
              <input type="text" placeholder="temperature" value="${esc(ne.aio_feed)}" data-ne-feed>
            </div>
            <div style="display:flex;align-items:flex-end">
              <button class="btn btn-primary" data-ne-add>${IC.plus} Add</button>
            </div>
          </div>
        </div>
      </div>
      <p class="section-label">Syncing ${list.length} entit${list.length===1?'y':'ies'} to Adafruit IO</p>
      <div class="panel">${rows}</div>`;
  }

  // ─── Event Binding ───────────────────────────────────────────

  _bind() {
    const sr = this.shadowRoot;
    const q  = (sel) => sr.querySelector(sel);
    const qa = (sel) => sr.querySelectorAll(sel);

    // Tabs
    qa('.tab-btn').forEach(b => b.addEventListener('click', () => {
      this._tab = b.dataset.tab;
      this._openFeed = this._editFeed = this._editEnt = null;
      this._render();
    }));

    // Retry loading groups
    const retryBtn = q('[data-reload-groups]');
    if (retryBtn) retryBtn.addEventListener('click', () => this._loadData());

    // Search
    const s = q('[data-search]');
    if (s) s.addEventListener('input', e => {
      this._filter = e.target.value;
      const cursor = e.target.selectionStart;
      this._render();
      const ns = this.shadowRoot.querySelector('[data-search]');
      if (ns) { ns.focus(); ns.setSelectionRange(cursor, cursor); }
    });

    // Group expand
    qa('.group-header').forEach(el => el.addEventListener('click', () => {
      const gk = el.dataset.gk;
      this._expanded.has(gk) ? this._expanded.delete(gk) : this._expanded.add(gk);
      this._render();
    }));

    // Feed browser click → open add form
    qa('.feed-browser-item').forEach(el => el.addEventListener('click', () => {
      if (el.dataset.added === 'true') return;
      const fk = el.dataset.fk;
      this._openFeed = this._openFeed === fk ? null : fk;
      this._addForm = { entity_type: 'sensor', direction: 'aio_to_ha', unit: '' };
      this._render();
    }));

    // Add form inputs (live state — no re-render needed)
    const afType = q('[data-af-type]'), afDir = q('[data-af-dir]'), afUnit = q('[data-af-unit]');
    if (afType) afType.addEventListener('change', e => { this._addForm.entity_type = e.target.value; });
    if (afDir)  afDir .addEventListener('change', e => { this._addForm.direction   = e.target.value; });
    if (afUnit) afUnit.addEventListener('input',  e => { this._addForm.unit        = e.target.value; });

    // Add form cancel / confirm
    const afCancel = q('[data-af-cancel]');
    if (afCancel) afCancel.addEventListener('click', () => { this._openFeed = null; this._render(); });

    qa('[data-af-add]').forEach(btn => btn.addEventListener('click', () => {
      const full = btn.dataset.afAdd;
      const type = q('[data-af-type]')?.value || 'sensor';
      const dir  = q('[data-af-dir]')?.value  || 'aio_to_ha';
      const unit = q('[data-af-unit]')?.value || '';
      const newFeeds = { ...this._cfg.feeds, [full]: { entity_type: type, direction: dir, unit, enabled: true } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Feed toggle
    qa('[data-tog-feed]').forEach(c => c.addEventListener('change', () => {
      const fk = c.dataset.togFeed;
      const newFeeds = { ...this._cfg.feeds, [fk]: { ...this._cfg.feeds[fk], enabled: c.checked } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Feed edit open/close
    qa('[data-edit-feed]').forEach(b => b.addEventListener('click', () => {
      const fk = b.dataset.editFeed;
      this._editFeed = this._editFeed === fk ? null : fk;
      this._editForm = {};
      this._render();
    }));

    // Edit form inputs
    const efType = q('[data-ef-type]'), efDir = q('[data-ef-dir]'), efUnit = q('[data-ef-unit]');
    if (efType) efType.addEventListener('change', e => { this._editForm.entity_type = e.target.value; });
    if (efDir)  efDir .addEventListener('change', e => { this._editForm.direction   = e.target.value; });
    if (efUnit) efUnit.addEventListener('input',  e => { this._editForm.unit        = e.target.value; });

    const efCancel = q('[data-ef-cancel]');
    if (efCancel) efCancel.addEventListener('click', () => { this._editFeed = null; this._render(); });

    qa('[data-ef-save]').forEach(btn => btn.addEventListener('click', () => {
      const fk  = btn.dataset.efSave;
      const existing = this._cfg.feeds[fk] || {};
      const type = q('[data-ef-type]')?.value || existing.entity_type;
      const dir  = q('[data-ef-dir]')?.value  || existing.direction;
      const unit = q('[data-ef-unit]')?.value;
      const newFeeds = { ...this._cfg.feeds, [fk]: { ...existing, entity_type: type, direction: dir, unit: unit !== undefined ? unit : (existing.unit||'') } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Feed remove
    qa('[data-rm-feed]').forEach(btn => btn.addEventListener('click', () => {
      const fk = btn.dataset.rmFeed;
      if (!confirm(`Remove "${fk}" from Home Assistant?`)) return;
      const newFeeds = { ...this._cfg.feeds };
      delete newFeeds[fk];
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Clear all feeds
    qa('[data-clear-all]').forEach(btn => btn.addEventListener('click', () => {
      const count = Object.keys(this._cfg.feeds || {}).length;
      if (!confirm(`Remove all ${count} configured feeds and start fresh?`)) return;
      this._save({ ...this._cfg, feeds: {} });
    }));

    // New entity inputs
    const neEid = q('[data-ne-eid]'), neGrp = q('[data-ne-grp]'), neFeed = q('[data-ne-feed]');
    if (neEid)  neEid .addEventListener('input', e => { this._newEnt.entity_id = e.target.value; });
    if (neGrp)  neGrp .addEventListener('input', e => { this._newEnt.aio_group = e.target.value; });
    if (neFeed) neFeed.addEventListener('input', e => { this._newEnt.aio_feed  = e.target.value; });

    // Add entity button
    const neAdd = q('[data-ne-add]');
    if (neAdd) neAdd.addEventListener('click', () => {
      const eid   = q('[data-ne-eid]')?.value.trim()  || '';
      const group = q('[data-ne-grp]')?.value.trim()  || '';
      const feed  = q('[data-ne-feed]')?.value.trim() || '';
      if (!eid || !group || !feed) { this._showToast('Fill in all three fields', true); return; }
      if ((this._cfg.ha_to_aio||[]).some(i => i.entity_id === eid)) {
        this._showToast('Entity already mapped', true); return;
      }
      const newList = [...(this._cfg.ha_to_aio||[]), { entity_id: eid, aio_group: group, aio_feed: feed, enabled: true }];
      this._newEnt = { entity_id: '', aio_group: '', aio_feed: '' };
      this._save({ ...this._cfg, ha_to_aio: newList });
    });

    // Entity toggle
    qa('[data-tog-ent]').forEach(c => c.addEventListener('change', () => {
      const idx = +c.dataset.togEnt;
      const newList = this._cfg.ha_to_aio.map((it,i) => i===idx ? {...it, enabled: c.checked} : it);
      this._save({ ...this._cfg, ha_to_aio: newList });
    }));

    // Entity edit
    qa('[data-edit-ent]').forEach(b => b.addEventListener('click', () => {
      const idx = +b.dataset.editEnt;
      this._editEnt = this._editEnt === idx ? null : idx;
      this._editEntForm = {};
      this._render();
    }));

    const eeEid = q('[data-ee-eid]'), eeGrp = q('[data-ee-grp]'), eeFeed = q('[data-ee-feed]');
    if (eeEid)  eeEid .addEventListener('input', e => { this._editEntForm.entity_id = e.target.value; });
    if (eeGrp)  eeGrp .addEventListener('input', e => { this._editEntForm.aio_group  = e.target.value; });
    if (eeFeed) eeFeed.addEventListener('input', e => { this._editEntForm.aio_feed   = e.target.value; });

    const eeCancel = q('[data-ee-cancel]');
    if (eeCancel) eeCancel.addEventListener('click', () => { this._editEnt = null; this._render(); });

    qa('[data-ee-save]').forEach(btn => btn.addEventListener('click', () => {
      const idx  = +btn.dataset.eeSave;
      const orig = this._cfg.ha_to_aio[idx];
      const eid   = q('[data-ee-eid]')?.value.trim()  || orig.entity_id;
      const group = q('[data-ee-grp]')?.value.trim()  || orig.aio_group;
      const feed  = q('[data-ee-feed]')?.value.trim() || orig.aio_feed;
      const newList = this._cfg.ha_to_aio.map((it,i) => i===idx ? {...it, entity_id: eid, aio_group: group, aio_feed: feed} : it);
      this._save({ ...this._cfg, ha_to_aio: newList });
    }));

    // Entity remove
    qa('[data-rm-ent]').forEach(btn => btn.addEventListener('click', () => {
      const idx = +btn.dataset.rmEnt;
      const it  = this._cfg.ha_to_aio[idx];
      if (!confirm(`Remove ${it.entity_id} → ${it.aio_group}.${it.aio_feed}?`)) return;
      const newList = this._cfg.ha_to_aio.filter((_,i) => i !== idx);
      this._save({ ...this._cfg, ha_to_aio: newList });
    }));
  }
}

customElements.define('adafruit-io-sync-panel', AdafruitIOSyncPanel);
