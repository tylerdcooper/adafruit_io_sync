// Adafruit IO Sync Panel — v1.3.6

const _ESC = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => _ESC[c]);

const TYPE_META = {
  sensor: { label:'Sensor', cls:'type-sensor' },
  switch: { label:'Switch', cls:'type-switch' },
  number: { label:'Number', cls:'type-number' },
  text:   { label:'Text',   cls:'type-text'   },
};
const DIR_META = {
  aio_to_ha:     { label:'AIO → HA',        cls:'dir-oneway' },
  bidirectional: { label:'⇄ Bidirectional',  cls:'dir-bidir'  },
};

// ─── Icons ────────────────────────────────────────────────────
const IC = {
  cloud: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  plus:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  edit:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>`,
  trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  chev:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  arrow: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  device:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
};

// ─── Styles ───────────────────────────────────────────────────
const CSS = `
:host {
  --acc:    var(--primary-color, #03a9f4);
  --surf:   var(--card-background-color, #1c1c1e);
  --surf2:  var(--secondary-background-color, #2a2a2c);
  --bg:     var(--primary-background-color, #111112);
  --bdr:    var(--divider-color, rgba(255,255,255,0.09));
  --tx1:    var(--primary-text-color, #e5e5e7);
  --tx2:    var(--secondary-text-color, #8e8e93);
  --rad:    12px;
  --rad-s:  7px;
  display: block;
  font-family: var(--paper-font-body1_-_font-family, -apple-system, 'Segoe UI', Roboto, sans-serif);
  font-size: 14px;
  color: var(--tx1);
  background: var(--bg);
  min-height: 100vh;
}

/* Header */
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
  letter-spacing: -.3px;
  flex: 1;
  min-width: 160px;
}
.app-title svg { color: var(--acc); }
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
  transition: all .15s;
  white-space: nowrap;
}
.tab-btn.active { background: var(--surf); color: var(--tx1); box-shadow: 0 1px 4px rgba(0,0,0,.3); }
.tab-btn:not(.active):hover { color: var(--tx1); }

/* Layout */
.app-body { padding: 20px 24px 40px; }
.split { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
@media (max-width: 700px) {
  .split { grid-template-columns: 1fr; }
  .app-header, .app-body { padding-left: 16px; padding-right: 16px; }
}

/* Panel shell */
.panel {
  background: var(--surf);
  border-radius: var(--rad);
  border: 1px solid var(--bdr);
  overflow: hidden;
}
.panel-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--bdr);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: var(--tx2);
}
.panel-hdr .spacer { flex: 1; }
.count-badge {
  background: var(--surf2);
  color: var(--tx2);
  border-radius: 20px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
}

/* Search */
.search-wrap { padding: 9px 11px; border-bottom: 1px solid var(--bdr); }
.search-input {
  width: 100%;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--rad-s);
  color: var(--tx1);
  padding: 7px 10px 7px 30px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
  transition: border-color .15s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
}
.search-input:focus { border-color: var(--acc); }
.search-input::placeholder { color: var(--tx2); }

/* Browser — group row */
.grp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px 9px 14px;
  cursor: pointer;
  user-select: none;
  border-top: 1px solid var(--bdr);
  transition: background .1s;
}
.grp-row:first-child { border-top: none; }
.grp-row:hover { background: var(--surf2); }
.grp-chev { color: var(--tx2); display: flex; align-items: center; transition: transform .2s; flex-shrink: 0; }
.grp-chev.open { transform: rotate(90deg); }
.grp-name { font-weight: 600; font-size: 13px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.grp-count { font-size: 11px; color: var(--tx2); flex-shrink: 0; }

/* Browser — feed row */
.feed-row-b {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px 7px 28px;
  border-top: 1px solid var(--bdr);
  transition: background .1s;
}
.feed-row-b:hover { background: rgba(3,169,244,.05); }
.feed-row-b.is-added { opacity: .45; pointer-events: none; }
.feed-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--acc); flex-shrink: 0; }
.feed-dot.done { background: #4caf50; }
.feed-name-b { flex: 1; font-size: 13px; min-width: 0; }
.feed-name-b .fn { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed-name-b .fk { display: block; font-size: 10px; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Add icon buttons */
.add-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--tx2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  transition: all .15s;
}
.add-btn:hover { color: var(--acc); border-color: var(--acc); background: rgba(3,169,244,.08); }

/* Empty / loading */
.empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--tx2);
  font-size: 13px;
  line-height: 1.9;
}
.empty strong { display: block; font-size: 15px; color: var(--tx1); margin-bottom: 6px; }
.loading-state {
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--tx2);
  font-size: 14px;
}
.spinner {
  width: 26px; height: 26px;
  border: 3px solid rgba(255,255,255,.12);
  border-top-color: var(--acc);
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Right panel: device groups ─────────────────────── */
.device-group { border-top: 1px solid var(--bdr); }
.device-group:first-child { border-top: none; }

.device-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 8px;
  background: rgba(255,255,255,.025);
  border-bottom: 1px solid var(--bdr);
}
.device-hdr svg { color: var(--tx2); flex-shrink: 0; }
.device-hdr-name { font-weight: 700; font-size: 12px; letter-spacing: .2px; flex: 1; }
.device-hdr-count { font-size: 11px; color: var(--tx2); }
.device-hdr-rm {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--tx2);
  padding: 3px 5px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  transition: all .15s;
}
.device-hdr-rm:hover { color: #ef5350; background: rgba(239,83,80,.1); }

.feed-row-r {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 20px;
  border-bottom: 1px solid var(--bdr);
  transition: background .1s;
}
.feed-row-r:last-child { border-bottom: none; }
.feed-row-r:hover { background: rgba(255,255,255,.02); }
.feed-row-r.disabled { opacity: .45; }
.feed-info-r { flex: 1; min-width: 0; }
.feed-name-r { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed-meta-r { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap; align-items: center; }
.feed-actions-r { display: flex; gap: 2px; flex-shrink: 0; }

/* Edit form (right panel) */
.edit-form {
  background: var(--surf2);
  border-bottom: 1px solid var(--bdr);
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr 1fr 68px;
  gap: 8px;
  align-items: end;
}
.edit-form-footer {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--tx2); }
.form-field input,
.form-field select {
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--rad-s);
  color: var(--tx1);
  padding: 6px 8px;
  font-size: 13px;
  outline: none;
  height: 32px;
  box-sizing: border-box;
  transition: border-color .15s;
  width: 100%;
}
.form-field input:focus,
.form-field select:focus { border-color: var(--acc); }
.form-field select option { background: var(--surf); }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .2px;
  white-space: nowrap;
}
.type-sensor { background: rgba(33,150,243,.14); color: #42a5f5; }
.type-switch { background: rgba(76,175,80,.14);  color: #66bb6a; }
.type-number { background: rgba(255,152,0,.14);  color: #ffa726; }
.type-text   { background: rgba(156,39,176,.14); color: #ba68c8; }
.type-unknown{ background: rgba(255,255,255,.07);color: var(--tx2); }
.dir-oneway  { background: rgba(96,125,139,.14); color: #90a4ae; }
.dir-bidir   { background: rgba(0,188,212,.14);  color: #26c6da; }
.dir-unknown { background: rgba(255,255,255,.07);color: var(--tx2); }
.unit-badge  { background: var(--surf2); color: var(--tx2); border: 1px solid var(--bdr); }

/* Toggle */
.toggle { position: relative; display: inline-block; width: 34px; height: 19px; flex-shrink: 0; }
.toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-track { position: absolute; inset: 0; background: rgba(255,255,255,.12); border-radius: 20px; cursor: pointer; transition: background .2s; }
.toggle input:checked ~ .toggle-track { background: var(--acc); }
.toggle-thumb { position: absolute; width: 13px; height: 13px; background: #fff; border-radius: 50%; top: 3px; left: 3px; pointer-events: none; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.4); }
.toggle input:checked ~ .toggle-thumb { transform: translateX(15px); }

/* Icon button (edit/trash) */
.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--tx2);
  padding: 5px 5px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  transition: all .15s;
}
.icon-btn:hover { color: var(--tx1); background: var(--surf2); }
.icon-btn.danger:hover { color: #ef5350; background: rgba(239,83,80,.1); }

/* Buttons */
.btn {
  border: none; border-radius: var(--rad-s); cursor: pointer;
  font-size: 13px; font-weight: 500; padding: 6px 13px;
  display: inline-flex; align-items: center; gap: 5px;
  transition: all .15s; white-space: nowrap;
}
.btn-primary { background: var(--acc); color: #fff; }
.btn-primary:hover { filter: brightness(1.1); }
.btn-ghost { background: transparent; color: var(--tx2); border: 1px solid var(--bdr); }
.btn-ghost:hover { color: var(--tx1); background: var(--surf2); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-link { background: none; border: none; cursor: pointer; color: var(--acc); font-size: inherit; padding: 0; font-family: inherit; }
.btn-link.danger { color: #ef5350; }

/* Banners */
.warn-banner {
  background: rgba(255,152,0,.1);
  border-bottom: 1px solid rgba(255,152,0,.2);
  color: #ffcc80;
  padding: 10px 16px;
  font-size: 12px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.error-banner {
  background: rgba(198,40,40,.12);
  border: 1px solid rgba(198,40,40,.35);
  border-radius: var(--rad-s);
  color: #ef9a9a;
  padding: 11px 15px;
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* HA→AIO add form */
.add-panel { background: var(--surf); border-radius: var(--rad); border: 1px solid var(--bdr); margin-bottom: 20px; overflow: hidden; }
.add-form-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.form-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; }

/* Entity rows */
.ent-row {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px; border-top: 1px solid var(--bdr);
  transition: background .1s;
}
.ent-row:first-child { border-top: none; }
.ent-row:hover { background: rgba(255,255,255,.02); }
.ent-row.disabled { opacity: .45; }
.ent-info { flex: 1; min-width: 0; }
.ent-id { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ent-dest { font-size: 12px; color: var(--tx2); margin-top: 3px; display: flex; align-items: center; gap: 5px; }
.ent-actions { display: flex; gap: 2px; flex-shrink: 0; }
.ent-edit-form { background: var(--surf2); border-top: 1px solid var(--bdr); padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }

/* Section label */
.section-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--tx2); margin: 0 0 10px; }

/* Toast */
.toast {
  position: fixed; bottom: 24px; left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: #323232; color: #fff;
  border-radius: 8px; padding: 10px 20px;
  font-size: 13px; font-weight: 500;
  box-shadow: 0 2px 8px rgba(0,0,0,.4);
  transition: transform .25s ease;
  z-index: 100; white-space: nowrap; pointer-events: none;
}
.toast.show { transform: translateX(-50%) translateY(0); }
.toast.err  { background: #c62828; }
.saving { opacity: .55; pointer-events: none; }
`;

// ─── Component ────────────────────────────────────────────────
class AdafruitIOSyncPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Persistent state
    this._tab       = 'aio_to_ha';
    this._groups    = {};
    this._cfg       = { feeds: {}, ha_to_aio: [] };
    this._expanded  = new Set();
    this._filter    = '';
    // Edit state (right panel)
    this._editFeed  = null;
    this._editForm  = {};
    this._editEnt   = null;
    this._editEntForm = {};
    // New entity form (HA→AIO)
    this._newEnt    = { entity_id: '', aio_group: '', aio_feed: '' };
    // Load state
    this._loading   = true;
    this._saving    = false;
    this._loadError = null;
    this._inited    = false;
  }

  set hass(h) {
    this._hass = h;
    if (!this._inited) { this._inited = true; this._load(); }
  }

  connectedCallback() { if (!this._inited) this._render(); }

  // ── Data ──────────────────────────────────────────────────────
  async _load() {
    this._loading = true; this._loadError = null; this._render();
    try {
      const [cfg, grp] = await Promise.all([
        this._hass.callApi('GET', 'adafruit_io_sync/config'),
        this._hass.callApi('GET', 'adafruit_io_sync/groups'),
      ]);
      this._cfg    = cfg  || { feeds:{}, ha_to_aio:[] };
      this._groups = grp  || {};
    } catch (e) {
      const m = String(e?.message || e);
      this._loadError = m.includes('404') || m.includes('not_found')
        ? 'Integration not configured — go to Settings → Integrations and set up Adafruit IO Sync.'
        : `Load failed: ${m}`;
    }
    this._loading = false; this._render();
  }

  async _save(options) {
    this._saving = true; this._render();
    try {
      await this._hass.callApi('POST', 'adafruit_io_sync/config', options);
      this._cfg = options;
      this._editFeed = null; this._editEnt = null;
      this._toast('Saved — reloading integration…');
    } catch (e) { this._toast(`Save failed: ${e?.message||e}`, true); }
    this._saving = false; this._render();
  }

  _toast(msg, err=false) {
    const t = this.shadowRoot.querySelector('.toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (err ? ' err' : '');
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ── Helpers ───────────────────────────────────────────────────
  _feedName(gk, fk) { return this._groups[gk]?.feeds?.[fk]?.name || fk; }
  _groupName(gk)    { return this._groups[gk]?.name || gk; }

  // ── Root render ───────────────────────────────────────────────
  _render() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div class="${this._saving?'saving':''}">
        <div class="app-header">
          <div class="app-title">${IC.cloud} Adafruit IO Sync</div>
          <div class="tabs">
            <button class="tab-btn${this._tab==='aio_to_ha'?' active':''}" data-tab="aio_to_ha">AIO → HA</button>
            <button class="tab-btn${this._tab==='ha_to_aio'?' active':''}" data-tab="ha_to_aio">HA → AIO</button>
          </div>
        </div>
        <div class="app-body">
          ${this._loadError ? `<div class="error-banner">${esc(this._loadError)}<button class="btn btn-ghost btn-sm" data-retry>Retry</button></div>` : ''}
          ${this._loading
            ? `<div class="loading-state"><div class="spinner"></div>Loading…</div>`
            : this._tab==='aio_to_ha' ? this._tplAIOtoHA() : this._tplHAtoAIO()}
        </div>
      </div>
      <div class="toast"></div>`;
    this._bind();
  }

  // ── AIO → HA: Browser (left) ─────────────────────────────────
  _tplBrowser() {
    const gkeys = Object.keys(this._groups);
    const q = this._filter.toLowerCase();
    if (!gkeys.length)
      return `<div class="panel"><div class="empty">No Adafruit IO groups found.<br>Check your connection.<br><br><button class="btn btn-ghost btn-sm" data-retry>Retry</button></div></div>`;

    let rows = '';
    for (const gk of gkeys) {
      const grp = this._groups[gk];
      const fkeys = Object.keys(grp.feeds || {});
      const vis = q
        ? fkeys.filter(fk => {
            const name = (grp.feeds[fk]?.name || fk).toLowerCase();
            return fk.toLowerCase().includes(q) || name.includes(q)
              || gk.toLowerCase().includes(q) || (grp.name||'').toLowerCase().includes(q);
          })
        : fkeys;
      if (q && !vis.length) continue;

      const open = this._expanded.has(gk);
      const nAdded   = fkeys.filter(fk => `${gk}.${fk}` in (this._cfg.feeds||{})).length;
      const nUnadded = fkeys.length - nAdded;
      const countTxt = nAdded ? `${nAdded}/${fkeys.length}` : `${fkeys.length}`;

      rows += `
        <div class="grp-row" data-gk="${esc(gk)}">
          <span class="grp-chev${open?' open':''}">${IC.chev}</span>
          <span class="grp-name">${esc(grp.name||gk)}</span>
          <span class="grp-count">${countTxt}</span>
          ${nUnadded > 0
            ? `<button class="add-btn" data-gadd="${esc(gk)}" title="Add all ${nUnadded} feeds">${IC.plus}</button>`
            : ''}
        </div>`;

      if (open || q) {
        for (const fk of vis) {
          const full  = `${gk}.${fk}`;
          const added = full in (this._cfg.feeds||{});
          const fname = this._feedName(gk, fk);
          const fkey  = fname !== fk ? fk : null;
          rows += `
            <div class="feed-row-b${added?' is-added':''}" data-fk="${esc(full)}" data-added="${added}">
              <span class="feed-dot${added?' done':''}"></span>
              <span class="feed-name-b">
                <span class="fn">${esc(fname)}</span>
                ${fkey ? `<span class="fk">${esc(fkey)}</span>` : ''}
              </span>
              ${!added ? `<button class="add-btn" data-fadd="${esc(full)}" title="Add to Home Assistant">${IC.plus}</button>` : ''}
            </div>`;
        }
      }
    }

    return `
      <div class="panel">
        <div class="panel-hdr">Available Feeds</div>
        <div class="search-wrap">
          <input class="search-input" type="text" autocomplete="off" placeholder="Search…" value="${esc(this._filter)}" data-search>
        </div>
        ${rows}
      </div>`;
  }

  // ── AIO → HA: Configured (right) ─────────────────────────────
  _tplConfigured() {
    const feeds = this._cfg.feeds || {};
    const keys  = Object.keys(feeds);

    // Group by device (group key)
    const byGroup = {};
    for (const fk of keys) {
      const dot = fk.indexOf('.');
      const gk  = dot >= 0 ? fk.slice(0, dot) : fk;
      (byGroup[gk] = byGroup[gk] || []).push(fk);
    }
    const gkeys = Object.keys(byGroup);

    const countPart = keys.length
      ? `<span class="count-badge">${keys.length}</span>`
      : '';
    const clearBtn = keys.length
      ? `<button class="btn-link danger btn-sm" data-clear-all style="font-size:11px">Clear all</button>`
      : '';

    let body = '';
    if (!keys.length) {
      body = `<div class="empty"><strong>No feeds configured yet</strong>Click ${IC.plus} next to any feed or group on the left to add it.</div>`;
    } else {
      for (const gk of gkeys) {
        const fkList   = byGroup[gk];
        const gname    = this._groupName(gk);
        body += `<div class="device-group">
          <div class="device-hdr">
            ${IC.device}
            <span class="device-hdr-name">${esc(gname)}</span>
            <span class="device-hdr-count">${fkList.length} feed${fkList.length===1?'':'s'}</span>
            <button class="device-hdr-rm" data-rm-group="${esc(gk)}" title="Remove all ${esc(gname)} feeds">${IC.trash}</button>
          </div>`;

        for (const fk of fkList) {
          const fc      = feeds[fk];
          const dot     = fk.indexOf('.');
          const feedKey = dot >= 0 ? fk.slice(dot+1) : fk;
          const fname   = this._feedName(gk, feedKey);
          const enabled = fc.enabled !== false;
          const tm      = TYPE_META[fc.entity_type] || { label:'Not set', cls:'type-unknown' };
          const dm      = DIR_META[fc.direction]    || { label:'Not set', cls:'dir-unknown'  };
          const editing = this._editFeed === fk;

          body += `
            <div class="feed-row-r${enabled?'':' disabled'}">
              <label class="toggle">
                <input type="checkbox" data-tog="${esc(fk)}"${enabled?' checked':''}>
                <div class="toggle-track"></div>
                <div class="toggle-thumb"></div>
              </label>
              <div class="feed-info-r">
                <div class="feed-name-r">${esc(fname)}</div>
                <div class="feed-meta-r">
                  <span class="badge ${tm.cls}">${esc(tm.label)}</span>
                  <span class="badge ${dm.cls}">${esc(dm.label)}</span>
                  ${fc.unit ? `<span class="badge unit-badge">${esc(fc.unit)}</span>` : ''}
                </div>
              </div>
              <div class="feed-actions-r">
                <button class="icon-btn" data-edit-feed="${esc(fk)}">${IC.edit}</button>
                <button class="icon-btn danger" data-rm-feed="${esc(fk)}">${IC.trash}</button>
              </div>
            </div>`;

          if (editing) {
            const ef = this._editForm;
            body += `
              <div class="edit-form">
                <div class="form-field">
                  <label>Type</label>
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
                <div class="form-field">
                  <label>Unit</label>
                  <input type="text" data-ef-unit placeholder="opt." value="${esc(ef.unit!==undefined?ef.unit:(fc.unit||''))}">
                </div>
                <div class="edit-form-footer">
                  <button class="btn btn-ghost btn-sm" data-ef-cancel>Cancel</button>
                  <button class="btn btn-primary btn-sm" data-ef-save="${esc(fk)}">Save</button>
                </div>
              </div>`;
          }
        }
        body += `</div>`; // .device-group
      }
    }

    return `
      <div class="panel">
        <div class="panel-hdr">
          Configured Feeds ${countPart}
          <span class="spacer"></span>
          ${clearBtn}
        </div>
        ${body}
      </div>`;
  }

  _tplAIOtoHA() {
    return `<div class="split">${this._tplBrowser()}${this._tplConfigured()}</div>`;
  }

  // ── HA → AIO ──────────────────────────────────────────────────
  _tplHAtoAIO() {
    const allEnts = this._hass ? Object.keys(this._hass.states).sort() : [];
    const opts    = allEnts.map(e=>`<option value="${esc(e)}">`).join('');
    const ne      = this._newEnt;
    const list    = this._cfg.ha_to_aio || [];

    let rows = '';
    if (!list.length) {
      rows = `<div class="empty"><strong>No entities syncing yet</strong>Use the form above to push HA state changes to Adafruit IO in real time.</div>`;
    } else {
      list.forEach((item, idx) => {
        const enabled = item.enabled !== false;
        const bidir   = item.direction === 'bidirectional';
        const editing = this._editEnt === idx;
        const ef = this._editEntForm;
        rows += `
          <div class="ent-row${enabled?'':' disabled'}">
            <label class="toggle">
              <input type="checkbox" data-tog-ent="${idx}"${enabled?' checked':''}>
              <div class="toggle-track"></div>
              <div class="toggle-thumb"></div>
            </label>
            <div class="ent-info">
              <div class="ent-id">${esc(item.entity_id)}</div>
              <div class="ent-dest">
                ${IC.arrow} ${esc(item.aio_group)}.${esc(item.aio_feed)}
                <span class="badge ${bidir?'dir-bidir':'dir-oneway'}" style="margin-left:4px">${bidir?'⇄ Bidirectional':'HA → AIO'}</span>
              </div>
            </div>
            <div class="ent-actions">
              <button class="icon-btn" data-edit-ent="${idx}">${IC.edit}</button>
              <button class="icon-btn danger" data-rm-ent="${idx}">${IC.trash}</button>
            </div>
          </div>`;
        if (editing) {
          const curDir = ef.direction !== undefined ? ef.direction : (item.direction || 'ha_to_aio');
          rows += `
            <div class="ent-edit-form">
              <div class="form-row">
                <div class="form-field" style="flex:2">
                  <label>Entity</label>
                  <input type="text" list="ha-ent-list" value="${esc(ef.entity_id!==undefined?ef.entity_id:item.entity_id)}" data-ee-eid>
                </div>
              </div>
              <div class="form-row">
                <div class="form-field"><label>AIO Group</label><input type="text" value="${esc(ef.aio_group!==undefined?ef.aio_group:item.aio_group)}" data-ee-grp></div>
                <div class="form-field"><label>AIO Feed</label><input type="text" value="${esc(ef.aio_feed!==undefined?ef.aio_feed:item.aio_feed)}" data-ee-feed></div>
              </div>
              <div class="form-row">
                <div class="form-field" style="flex:1">
                  <label>Direction</label>
                  <select data-ee-dir>
                    <option value="ha_to_aio"${curDir==='ha_to_aio'?' selected':''}>HA → AIO only</option>
                    <option value="bidirectional"${curDir==='bidirectional'?' selected':''}>⇄ Bidirectional</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="btn btn-ghost btn-sm" data-ee-cancel>Cancel</button>
                <button class="btn btn-primary btn-sm" data-ee-save="${idx}">Save</button>
              </div>
            </div>`;
        }
      });
    }

    // Group picker — existing keys + option to type new
    const gkeys = Object.keys(this._groups);
    const grpOpts = gkeys.map(gk =>
      `<option value="${esc(gk)}">${esc(this._groupName(gk))} (${esc(gk)})</option>`
    ).join('');
    const selectedGk  = ne.aio_group || '';
    const grpInAIO    = selectedGk && selectedGk in this._groups;
    const feedsInGrp  = grpInAIO ? Object.keys(this._groups[selectedGk].feeds || {}) : [];
    const feedOpts    = feedsInGrp.map(fk =>
      `<option value="${esc(fk)}">${esc(this._feedName(selectedGk, fk))} (${esc(fk)})</option>`
    ).join('');

    return `
      <div class="add-panel">
        <div class="panel-hdr">Add Entity</div>
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
              <select data-ne-grp>
                <option value="" disabled${!selectedGk?' selected':''}>Select a group…</option>
                ${grpOpts}
                <option value="__new__"${selectedGk==='__new__'?' selected':''}>＋ Create new group…</option>
              </select>
            </div>
            ${selectedGk === '__new__' ? `
            <div class="form-field">
              <label>New Group Name</label>
              <input type="text" placeholder="my-group" value="${esc(ne.aio_group_new||'')}" data-ne-grp-new>
            </div>` : ''}
            <div class="form-field">
              <label>AIO Feed</label>
              ${feedsInGrp.length ? `
                <select data-ne-feed>
                  <option value="" disabled${!ne.aio_feed?' selected':''}>Select a feed…</option>
                  ${feedOpts}
                  <option value="__new__"${ne.aio_feed==='__new__'?' selected':''}>＋ New feed name…</option>
                </select>` : `
                <input type="text" placeholder="feed-name" value="${esc(ne.aio_feed)}" data-ne-feed>`
              }
            </div>
            ${ne.aio_feed === '__new__' ? `
            <div class="form-field">
              <label>New Feed Name</label>
              <input type="text" placeholder="my-feed" value="${esc(ne.aio_feed_new||'')}" data-ne-feed-new>
            </div>` : ''}
            <div class="form-field">
              <label>Direction</label>
              <select data-ne-dir>
                <option value="ha_to_aio"${(ne.direction||'ha_to_aio')==='ha_to_aio'?' selected':''}>HA → AIO only</option>
                <option value="bidirectional"${ne.direction==='bidirectional'?' selected':''}>⇄ Bidirectional</option>
              </select>
            </div>
            <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" data-ne-add>${IC.plus} Add</button></div>
          </div>
          ${selectedGk && selectedGk !== '__new__' && !grpInAIO
            ? `<div class="warn-banner" style="margin-top:8px;border-radius:6px">Group "<strong>${esc(selectedGk)}</strong>" doesn't exist in AIO yet — it will be created automatically when you save.</div>`
            : ''}
        </div>
      </div>
      <p class="section-lbl">Syncing ${list.length} entit${list.length===1?'y':'ies'} to Adafruit IO</p>
      <div class="panel">${rows}</div>`;
  }

  // ── Event binding ─────────────────────────────────────────────
  _bind() {
    const sr = this.shadowRoot;
    const $  = sel => sr.querySelector(sel);
    const $$ = sel => sr.querySelectorAll(sel);

    // Tabs
    $$('.tab-btn').forEach(b => b.addEventListener('click', () => {
      this._tab = b.dataset.tab; this._editFeed = this._editEnt = null; this._render();
    }));

    // Retry
    $$('[data-retry]').forEach(b => b.addEventListener('click', () => this._load()));

    // Search (restore focus after re-render)
    const s = $('[data-search]');
    if (s) s.addEventListener('input', e => {
      this._filter = e.target.value;
      const cur = e.target.selectionStart;
      this._render();
      const ns = this.shadowRoot.querySelector('[data-search]');
      if (ns) { ns.focus(); ns.setSelectionRange(cur, cur); }
    });

    // Group expand/collapse (ignore + button clicks)
    $$('.grp-row').forEach(el => el.addEventListener('click', e => {
      if (e.target.closest('[data-gadd]')) return;
      const gk = el.dataset.gk;
      this._expanded.has(gk) ? this._expanded.delete(gk) : this._expanded.add(gk);
      this._render();
    }));

    // + Add group (all unadded feeds with defaults)
    $$('[data-gadd]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      const gk  = btn.dataset.gadd;
      const grp = this._groups[gk];
      if (!grp) return;
      const newFeeds = { ...this._cfg.feeds };
      for (const fk of Object.keys(grp.feeds||{})) {
        const full = `${gk}.${fk}`;
        if (!(full in newFeeds)) newFeeds[full] = { entity_type:'sensor', direction:'aio_to_ha', unit:'', enabled:true };
      }
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // + Add single feed (instant, default sensor/AIO→HA)
    $$('[data-fadd]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      const full = btn.dataset.fadd;
      const newFeeds = { ...this._cfg.feeds, [full]: { entity_type:'sensor', direction:'aio_to_ha', unit:'', enabled:true } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Feed toggle
    $$('[data-tog]').forEach(c => c.addEventListener('change', () => {
      const fk = c.dataset.tog;
      const newFeeds = { ...this._cfg.feeds, [fk]: { ...this._cfg.feeds[fk], enabled: c.checked } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Feed edit open/close
    $$('[data-edit-feed]').forEach(b => b.addEventListener('click', () => {
      const fk = b.dataset.editFeed;
      this._editFeed = this._editFeed === fk ? null : fk;
      this._editForm = {};
      this._render();
    }));

    // Edit form live inputs
    const efType = $('[data-ef-type]'), efDir = $('[data-ef-dir]'), efUnit = $('[data-ef-unit]');
    if (efType) efType.addEventListener('change', e => { this._editForm.entity_type = e.target.value; });
    if (efDir)  efDir .addEventListener('change', e => { this._editForm.direction   = e.target.value; });
    if (efUnit) efUnit.addEventListener('input',  e => { this._editForm.unit        = e.target.value; });

    const efCancel = $('[data-ef-cancel]');
    if (efCancel) efCancel.addEventListener('click', () => { this._editFeed = null; this._render(); });

    $$('[data-ef-save]').forEach(btn => btn.addEventListener('click', () => {
      const fk  = btn.dataset.efSave;
      const old = this._cfg.feeds[fk] || {};
      const type = $('[data-ef-type]')?.value || old.entity_type;
      const dir  = $('[data-ef-dir]')?.value  || old.direction;
      const unit = $('[data-ef-unit]')?.value;
      const newFeeds = { ...this._cfg.feeds, [fk]: { ...old, entity_type:type, direction:dir, unit: unit!==undefined?unit:(old.unit||'') } };
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Remove single feed
    $$('[data-rm-feed]').forEach(btn => btn.addEventListener('click', () => {
      const fk = btn.dataset.rmFeed;
      if (!confirm(`Remove "${fk}"?`)) return;
      const newFeeds = { ...this._cfg.feeds };
      delete newFeeds[fk];
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Remove all feeds in a group (device)
    $$('[data-rm-group]').forEach(btn => btn.addEventListener('click', () => {
      const gk    = btn.dataset.rmGroup;
      const gname = this._groupName(gk);
      if (!confirm(`Remove all feeds for "${gname}"?`)) return;
      const newFeeds = { ...this._cfg.feeds };
      for (const fk of Object.keys(newFeeds)) {
        if (fk.startsWith(`${gk}.`)) delete newFeeds[fk];
      }
      this._save({ ...this._cfg, feeds: newFeeds });
    }));

    // Clear all
    $$('[data-clear-all]').forEach(btn => btn.addEventListener('click', () => {
      if (!confirm(`Remove all ${Object.keys(this._cfg.feeds||{}).length} configured feeds?`)) return;
      this._save({ ...this._cfg, feeds: {} });
    }));

    // ── HA→AIO ──────────────────────────────────────────────────
    const neEid = $('[data-ne-eid]');
    if (neEid) neEid.addEventListener('input', e => { this._newEnt.entity_id = e.target.value; });

    // Group select — re-render on change so feed list updates
    const neGrp = $('[data-ne-grp]');
    if (neGrp) neGrp.addEventListener('change', e => {
      this._newEnt.aio_group = e.target.value;
      this._newEnt.aio_feed  = '';
      this._newEnt.aio_feed_new = '';
      this._render();
    });
    const neGrpNew = $('[data-ne-grp-new]');
    if (neGrpNew) neGrpNew.addEventListener('input', e => { this._newEnt.aio_group_new = e.target.value; });

    // Feed select — re-render when "new feed" is chosen
    const neFeed = $('[data-ne-feed]');
    if (neFeed) {
      const evt = neFeed.tagName === 'SELECT' ? 'change' : 'input';
      neFeed.addEventListener(evt, e => {
        this._newEnt.aio_feed = e.target.value;
        if (e.target.value === '__new__') this._render();
      });
    }
    const neFeedNew = $('[data-ne-feed-new]');
    if (neFeedNew) neFeedNew.addEventListener('input', e => { this._newEnt.aio_feed_new = e.target.value; });

    const neDir = $('[data-ne-dir]');
    if (neDir) neDir.addEventListener('change', e => { this._newEnt.direction = e.target.value; });

    const neAdd = $('[data-ne-add]');
    if (neAdd) neAdd.addEventListener('click', () => {
      const eid = $('[data-ne-eid]')?.value.trim() || '';
      // Resolve group: existing key, new name, or typed
      let group = this._newEnt.aio_group || '';
      if (group === '__new__') group = ($('[data-ne-grp-new]')?.value.trim() || '');
      // Resolve feed: existing key, new name
      let feed = this._newEnt.aio_feed || '';
      if (feed === '__new__') feed = ($('[data-ne-feed-new]')?.value.trim() || '');
      const dir = $('[data-ne-dir]')?.value || 'ha_to_aio';
      if (!eid || !group || !feed) { this._toast('Fill in all fields', true); return; }
      if ((this._cfg.ha_to_aio||[]).some(i => i.entity_id===eid)) { this._toast('Already mapped', true); return; }
      const newList = [...(this._cfg.ha_to_aio||[]), { entity_id:eid, aio_group:group, aio_feed:feed, direction:dir, enabled:true }];
      this._newEnt = { entity_id:'', aio_group:'', aio_feed:'', direction:'ha_to_aio' };
      this._save({ ...this._cfg, ha_to_aio: newList });
    });

    $$('[data-tog-ent]').forEach(c => c.addEventListener('change', () => {
      const idx = +c.dataset.togEnt;
      this._save({ ...this._cfg, ha_to_aio: this._cfg.ha_to_aio.map((it,i)=>i===idx?{...it,enabled:c.checked}:it) });
    }));

    $$('[data-edit-ent]').forEach(b => b.addEventListener('click', () => {
      const idx = +b.dataset.editEnt;
      this._editEnt = this._editEnt===idx ? null : idx;
      this._editEntForm = {};
      this._render();
    }));

    const eeEid = $('[data-ee-eid]'), eeGrp = $('[data-ee-grp]'), eeFeed = $('[data-ee-feed]'), eeDir = $('[data-ee-dir]');
    if (eeEid)  eeEid .addEventListener('input',  e => { this._editEntForm.entity_id = e.target.value; });
    if (eeGrp)  eeGrp .addEventListener('input',  e => { this._editEntForm.aio_group  = e.target.value; });
    if (eeFeed) eeFeed.addEventListener('input',  e => { this._editEntForm.aio_feed   = e.target.value; });
    if (eeDir)  eeDir .addEventListener('change', e => { this._editEntForm.direction   = e.target.value; });

    const eeCancel = $('[data-ee-cancel]');
    if (eeCancel) eeCancel.addEventListener('click', () => { this._editEnt=null; this._render(); });

    $$('[data-ee-save]').forEach(btn => btn.addEventListener('click', () => {
      const idx  = +btn.dataset.eeSave;
      const orig = this._cfg.ha_to_aio[idx];
      const eid   = $('[data-ee-eid]')?.value.trim()  || orig.entity_id;
      const group = $('[data-ee-grp]')?.value.trim()  || orig.aio_group;
      const feed  = $('[data-ee-feed]')?.value.trim() || orig.aio_feed;
      const dir   = $('[data-ee-dir]')?.value         || orig.direction || 'ha_to_aio';
      this._save({ ...this._cfg, ha_to_aio: this._cfg.ha_to_aio.map((it,i)=>i===idx?{...it,entity_id:eid,aio_group:group,aio_feed:feed,direction:dir}:it) });
    }));

    $$('[data-rm-ent]').forEach(btn => btn.addEventListener('click', () => {
      const idx = +btn.dataset.rmEnt;
      const it  = this._cfg.ha_to_aio[idx];
      if (!confirm(`Remove ${it.entity_id}?`)) return;
      this._save({ ...this._cfg, ha_to_aio: this._cfg.ha_to_aio.filter((_,i)=>i!==idx) });
    }));
  }
}

customElements.define('adafruit-io-sync-panel', AdafruitIOSyncPanel);
