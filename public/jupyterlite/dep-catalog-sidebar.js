/**
 * DEP Workbench — Catalog Explorer & Git Panel
 * Injected into JupyterLite via lab/index.html.
 * Adds a custom left-sidebar panel using DOM injection after JupyterLab boots.
 */
(function () {
  'use strict';

  /* ─── Catalog data (mirrors dep_sdk.py) ─────────────────────────── */
  const DEP_PROJECTS = [
    {
      id: 'proj_analytics',
      label: '📊 Analytics Project',
      catalogs: [
        {
          id: 'cat_customer_profiles',
          name: 'customer_profiles',
          varName: 'df_customers',
          type: 'Mock / JSON',
          rows: '5K',
          access: 'READ',
          columns: [
            { name: 'customer_id', dtype: 'int64' },
            { name: 'segment', dtype: 'str' },
            { name: 'recency_days', dtype: 'int64' },
            { name: 'frequency', dtype: 'int64' },
            { name: 'transaction_value', dtype: 'float64' },
          ],
        },
        {
          id: 'cat_sales_transactions',
          name: 'sales_transactions',
          varName: 'df_sales',
          type: 'CSV File',
          rows: '30',
          access: 'READ',
          columns: [
            { name: 'transaction_id', dtype: 'str' },
            { name: 'date', dtype: 'datetime64' },
            { name: 'customer_id', dtype: 'str' },
            { name: 'customer_name', dtype: 'str' },
            { name: 'region', dtype: 'str' },
            { name: 'product_category', dtype: 'str' },
            { name: 'product_name', dtype: 'str' },
            { name: 'quantity', dtype: 'int64' },
            { name: 'unit_price', dtype: 'float64' },
            { name: 'discount_pct', dtype: 'float64' },
            { name: 'revenue', dtype: 'float64' },
            { name: 'cost', dtype: 'float64' },
            { name: 'profit', dtype: 'float64' },
            { name: 'channel', dtype: 'str' },
            { name: 'payment_method', dtype: 'str' },
            { name: 'status', dtype: 'str' },
          ],
        },
      ],
    },
    {
      id: 'proj_operations',
      label: '⚙️ Operations Project',
      catalogs: [
        {
          id: 'cat_revenue_forecasting_db',
          name: 'revenue_forecasting_db',
          varName: 'df_revenue',
          type: 'Mock / PostgreSQL',
          rows: '5',
          access: 'READ',
          columns: [
            { name: 'month', dtype: 'str' },
            { name: 'revenue', dtype: 'float64' },
            { name: 'forecast', dtype: 'float64' },
            { name: 'confidence_lower', dtype: 'float64' },
            { name: 'confidence_upper', dtype: 'float64' },
          ],
        },
        {
          id: 'cat_product_inventory',
          name: 'product_inventory',
          varName: 'df_inventory',
          type: 'Mock / MySQL',
          rows: '4',
          access: 'READ',
          columns: [
            { name: 'sku', dtype: 'str' },
            { name: 'product', dtype: 'str' },
            { name: 'stock', dtype: 'int64' },
            { name: 'price', dtype: 'float64' },
          ],
        },
      ],
    },
  ];

  /* ─── State ───────────────────────────────────────────────────────── */
  const state = {
    expanded: {
      proj_analytics: true,
      proj_operations: false,
      cat_customer_profiles: true,
    },
    activeTab: 'catalogs',     // 'catalogs' | 'git'
    catalogSearch: '',
    gitData: null,
    gitLoading: false,
    gitCommitMsg: '',
    gitStagedPaths: new Set(),
    panelVisible: true,
  };

  /* ─── DEP API base URL ───────────────────────────────────────────── */
  const DEP_API = 'http://localhost:8000';

  /* ─── CSS injected once ──────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('dep-sidebar-styles')) return;
    const style = document.createElement('style');
    style.id = 'dep-sidebar-styles';
    style.textContent = `
      /* ── Sidebar tab button ─────────────────────────────────────── */
      #dep-sidebar-tab-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin: 4px auto;
        border-radius: 6px;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--jp-ui-font-color2, #888);
        transition: background 0.15s, color 0.15s;
        position: relative;
      }
      #dep-sidebar-tab-btn:hover,
      #dep-sidebar-tab-btn.dep-active {
        background: rgba(167,139,250,0.15);
        color: var(--jp-brand-color1, #a78bfa);
      }
      #dep-sidebar-tab-btn .dep-badge {
        position: absolute;
        top: 2px; right: 2px;
        width: 6px; height: 6px;
        background: #6a9955;
        border-radius: 50%;
        border: 1px solid var(--jp-layout-color1, #1e1e1e);
      }

      /* ── Panel shell ────────────────────────────────────────────── */
      #dep-sidebar-panel {
        display: flex;
        flex-direction: column;
        width: 280px;
        height: 100%;
        background: var(--jp-layout-color1, #1e1e1e);
        border-right: 1px solid var(--jp-border-color1, #333);
        font-family: var(--jp-ui-font-family, system-ui, sans-serif);
        font-size: 12px;
        color: var(--jp-ui-font-color1, #ccc);
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
        z-index: 10;
      }

      /* ── Panel header & tabs ────────────────────────────────────── */
      .dep-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px 4px;
        border-bottom: 1px solid var(--jp-border-color1, #333);
        flex-shrink: 0;
      }
      .dep-panel-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--jp-ui-font-color2, #888);
      }
      .dep-tab-bar {
        display: flex;
        gap: 2px;
        padding: 4px 8px;
        border-bottom: 1px solid var(--jp-border-color1, #333);
        flex-shrink: 0;
      }
      .dep-tab {
        flex: 1;
        padding: 4px 6px;
        border-radius: 4px;
        border: 1px solid transparent;
        background: transparent;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        color: var(--jp-ui-font-color2, #888);
        text-align: center;
        transition: all 0.15s;
      }
      .dep-tab:hover { background: rgba(255,255,255,0.05); }
      .dep-tab.dep-tab-active {
        background: rgba(167,139,250,0.12);
        border-color: rgba(167,139,250,0.35);
        color: #a78bfa;
      }

      /* ── Search ─────────────────────────────────────────────────── */
      .dep-search-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 6px 8px;
        padding: 4px 8px;
        background: var(--jp-layout-color2, #252525);
        border: 1px solid var(--jp-border-color1, #333);
        border-radius: 5px;
        flex-shrink: 0;
      }
      .dep-search-wrap input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--jp-ui-font-color1, #ccc);
        font-size: 11px;
      }
      .dep-search-wrap input::placeholder { color: var(--jp-ui-font-color3, #555); }

      /* ── Scroll body ─────────────────────────────────────────────── */
      .dep-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 4px 6px;
      }
      .dep-scroll::-webkit-scrollbar { width: 4px; }
      .dep-scroll::-webkit-scrollbar-track { background: transparent; }
      .dep-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

      /* ── Tree items ─────────────────────────────────────────────── */
      .dep-project-row {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 4px;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
        font-weight: 700;
        font-size: 11.5px;
      }
      .dep-project-row:hover { background: rgba(255,255,255,0.04); }
      .dep-chevron {
        width: 12px; height: 12px;
        transition: transform 0.15s;
        color: var(--jp-ui-font-color3, #555);
        flex-shrink: 0;
      }
      .dep-chevron.open { transform: rotate(90deg); }

      .dep-project-children {
        margin-left: 8px;
        border-left: 1px solid var(--jp-border-color2, #2a2a2a);
        padding-left: 8px;
      }

      .dep-catalog-row {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 4px;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
      }
      .dep-catalog-row:hover { background: rgba(255,255,255,0.04); }
      .dep-catalog-name { flex: 1; font-size: 11px; font-weight: 600; color: var(--jp-ui-font-color1, #ccc); }
      .dep-catalog-rows-badge {
        font-size: 9px;
        padding: 1px 4px;
        background: var(--jp-layout-color2, #252525);
        border: 1px solid var(--jp-border-color1, #333);
        border-radius: 3px;
        color: var(--jp-ui-font-color3, #666);
      }

      .dep-load-btn {
        padding: 2px 6px;
        font-size: 9px;
        font-weight: 700;
        background: rgba(167,139,250,0.12);
        border: 1px solid rgba(167,139,250,0.3);
        border-radius: 3px;
        color: #a78bfa;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s;
        flex-shrink: 0;
      }
      .dep-load-btn:hover { background: #a78bfa; color: #fff; }

      /* ── Catalog expanded content ─────────────────────────────────── */
      .dep-catalog-body {
        margin-left: 14px;
        padding-bottom: 6px;
      }
      .dep-meta-badges { display: flex; gap: 4px; margin: 4px 2px 6px; flex-wrap: wrap; }
      .dep-meta-badge {
        font-size: 8.5px;
        padding: 1px 5px;
        border-radius: 3px;
        border: 1px solid;
      }
      .dep-badge-type { background: rgba(255,255,255,0.04); border-color: #333; color: #777; }
      .dep-badge-access { background: rgba(106,153,85,0.1); border-color: rgba(106,153,85,0.3); color: #9cd98c; }

      .dep-col-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 4px;
        border-radius: 3px;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.12s;
      }
      .dep-col-row:hover {
        background: rgba(167,139,250,0.06);
        border-color: rgba(167,139,250,0.2);
      }
      .dep-col-dot { width: 5px; height: 5px; border-radius: 50%; background: #444; flex-shrink: 0; }
      .dep-col-row:hover .dep-col-dot { background: #a78bfa; }
      .dep-col-name { flex: 1; font-family: monospace; font-size: 10px; color: var(--jp-ui-font-color2, #999); }
      .dep-col-row:hover .dep-col-name { color: var(--jp-ui-font-color1, #ccc); }
      .dep-col-dtype { font-family: monospace; font-size: 9px; }
      .dep-dtype-num { color: #b5cea8; }
      .dep-dtype-str { color: #ce9178; }
      .dep-dtype-dt  { color: #a78bfa; }

      .dep-snip-bar { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 6px; }
      .dep-snip-btn {
        font-family: monospace;
        font-size: 9px;
        padding: 2px 5px;
        background: var(--jp-layout-color2, #252525);
        border: 1px solid var(--jp-border-color1, #333);
        border-radius: 3px;
        color: var(--jp-ui-font-color3, #666);
        cursor: pointer;
        transition: all 0.12s;
      }
      .dep-snip-btn:hover { border-color: rgba(167,139,250,0.4); color: #a78bfa; }

      /* ── Footer hint ─────────────────────────────────────────────── */
      .dep-footer {
        flex-shrink: 0;
        padding: 6px 10px;
        border-top: 1px solid var(--jp-border-color1, #333);
        font-size: 9.5px;
        color: var(--jp-ui-font-color3, #555);
        line-height: 1.4;
      }
      .dep-footer code {
        background: var(--jp-layout-color2, #252525);
        padding: 0 3px;
        border-radius: 2px;
        font-size: 9px;
      }

      /* ── Git panel ───────────────────────────────────────────────── */
      .dep-git-section { margin-bottom: 8px; }
      .dep-git-section-title {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--jp-ui-font-color3, #555);
        padding: 4px 4px 2px;
        border-bottom: 1px solid var(--jp-border-color2, #2a2a2a);
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .dep-git-file-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 4px;
        border-radius: 3px;
        cursor: pointer;
        user-select: none;
        transition: background 0.1s;
      }
      .dep-git-file-row:hover { background: rgba(255,255,255,0.04); }
      .dep-git-status-badge {
        font-size: 8.5px;
        font-weight: 700;
        width: 14px;
        text-align: center;
        border-radius: 2px;
        padding: 0 2px;
        flex-shrink: 0;
      }
      .dep-git-M { color: #ce9178; }
      .dep-git-A { color: #6a9955; }
      .dep-git-D { color: #f44747; }
      .dep-git-? { color: #888; }
      .dep-git-file-name { flex: 1; font-family: monospace; font-size: 10px; color: #ccc; }
      .dep-stage-btn {
        font-size: 8.5px;
        padding: 1px 5px;
        background: rgba(106,153,85,0.1);
        border: 1px solid rgba(106,153,85,0.3);
        border-radius: 3px;
        color: #9cd98c;
        cursor: pointer;
        transition: all 0.15s;
      }
      .dep-stage-btn:hover { background: #6a9955; color: #fff; }
      .dep-stage-btn.staged { background: rgba(86,156,214,0.1); border-color: rgba(86,156,214,0.3); color: #88bef4; }

      .dep-commit-area {
        margin: 8px 4px 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .dep-commit-input {
        width: 100%;
        background: var(--jp-layout-color2, #252525);
        border: 1px solid var(--jp-border-color1, #333);
        border-radius: 4px;
        color: var(--jp-ui-font-color1, #ccc);
        font-size: 11px;
        padding: 5px 7px;
        box-sizing: border-box;
        font-family: inherit;
        resize: none;
        outline: none;
        transition: border-color 0.15s;
      }
      .dep-commit-input:focus { border-color: rgba(167,139,250,0.5); }
      .dep-commit-btn {
        padding: 5px 10px;
        background: #a78bfa;
        border: none;
        border-radius: 4px;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
        align-self: flex-end;
      }
      .dep-commit-btn:hover { background: #9370ef; }
      .dep-commit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

      .dep-git-log-item {
        padding: 5px 4px;
        border-bottom: 1px solid var(--jp-border-color2, #222);
        font-size: 10px;
      }
      .dep-git-log-hash { color: #a78bfa; font-family: monospace; font-size: 9px; }
      .dep-git-log-msg { color: var(--jp-ui-font-color1, #ccc); margin-top: 1px; }
      .dep-git-log-meta { color: var(--jp-ui-font-color3, #555); font-size: 9px; margin-top: 1px; }

      .dep-git-refresh-btn {
        font-size: 9px;
        padding: 1px 5px;
        background: transparent;
        border: 1px solid var(--jp-border-color1, #333);
        border-radius: 3px;
        color: var(--jp-ui-font-color3, #666);
        cursor: pointer;
        transition: all 0.15s;
      }
      .dep-git-refresh-btn:hover { border-color: #a78bfa; color: #a78bfa; }

      .dep-spinner {
        display: inline-block;
        width: 10px; height: 10px;
        border: 2px solid rgba(167,139,250,0.2);
        border-top-color: #a78bfa;
        border-radius: 50%;
        animation: dep-spin 0.7s linear infinite;
        margin: 4px auto;
      }
      @keyframes dep-spin { to { transform: rotate(360deg); } }

      .dep-empty-msg {
        text-align: center;
        color: var(--jp-ui-font-color3, #555);
        font-size: 10.5px;
        padding: 16px 8px;
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── Helpers ────────────────────────────────────────────────────── */
  function dtypeClass(dt) {
    if (dt === 'float64' || dt === 'int64') return 'dep-dtype-num';
    if (dt === 'datetime64' || dt === 'datetime') return 'dep-dtype-dt';
    return 'dep-dtype-str';
  }

  function chevronSVG(open) {
    return `<svg class="dep-chevron${open ? ' open' : ''}" viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
      <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function dbIconSVG() {
    return `<svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11" style="color:#a78bfa;flex-shrink:0;">
      <ellipse cx="8" cy="4" rx="6" ry="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <path d="M2 4v4c0 1.1 2.69 2 6 2s6-.9 6-2V4" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <path d="M2 8v4c0 1.1 2.69 2 6 2s6-.9 6-2V8" fill="none" stroke="currentColor" stroke-width="1.2"/>
    </svg>`;
  }

  /* ─── Code injection into active JupyterLab cell ─────────────────── */
  function injectCode(code) {
    try {
      const app = window.jupyterapp;
      if (!app) return;
      const widget = app.shell.currentWidget;
      if (!widget) { alert('[DEP] Open a notebook first.'); return; }
      // JupyterLab 4 + JupyterLite: activeCell on the notebook content
      const nb = widget.content || widget;
      const cell = nb.activeCell;
      if (!cell) { alert('[DEP] No active cell selected.'); return; }
      const model = cell.model;
      // SharedModel API (JupyterLab 4+)
      if (model.sharedModel) {
        const cur = model.sharedModel.source || '';
        model.sharedModel.source = cur + (cur && !cur.endsWith('\n') ? '\n' : '') + code;
      } else if (model.value) {
        // Legacy codemirror model
        const cur = model.value.text || '';
        model.value.text = cur + (cur && !cur.endsWith('\n') ? '\n' : '') + code;
      }
    } catch (e) {
      console.warn('[DEP] Could not inject code:', e);
    }
  }

  /* ─── Git API calls ──────────────────────────────────────────────── */
  async function gitFetch(path, options = {}) {
    const token = window.dep_auth_token || '';
    const res = await fetch(`${DEP_API}/git${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function loadGitStatus() {
    state.gitLoading = true;
    renderGitPanel();
    try {
      const data = await gitFetch('/status');
      state.gitData = data;
      state.gitStagedPaths = new Set(
        (data.staged || []).map((f) => f.path)
      );
    } catch (e) {
      state.gitData = { error: e.message };
    }
    state.gitLoading = false;
    renderGitPanel();
  }

  /* ─── Render: Catalog Explorer ───────────────────────────────────── */
  function renderCatalogPanel() {
    const container = document.getElementById('dep-catalog-content');
    if (!container) return;

    const q = state.catalogSearch.toLowerCase();

    const rows = DEP_PROJECTS.map((project) => {
      const matchedCatalogs = project.catalogs.filter((cat) =>
        !q ||
        cat.name.includes(q) ||
        cat.columns.some((c) => c.name.includes(q))
      );
      const projMatch = !q || project.label.toLowerCase().includes(q);
      if (!projMatch && matchedCatalogs.length === 0) return '';

      const projOpen = state.expanded[project.id] ?? true;
      const catalogs = matchedCatalogs.map((cat) => {
        const catOpen = state.expanded[cat.id] ?? false;
        const cols = cat.columns.filter((c) => !q || c.name.includes(q));

        const colRows = catOpen
          ? cols
              .map(
                (col) => `
              <div class="dep-col-row" data-cat="${cat.id}" data-col="${col.name}">
                <span class="dep-col-dot"></span>
                <span class="dep-col-name">${col.name}</span>
                <span class="dep-col-dtype ${dtypeClass(col.dtype)}">${col.dtype}</span>
              </div>`
              )
              .join('')
          : '';

        const snippets = catOpen
          ? `<div class="dep-snip-bar">
               <button class="dep-snip-btn" data-cat="${cat.id}" data-snip=".head()">.head()</button>
               <button class="dep-snip-btn" data-cat="${cat.id}" data-snip=".describe()">.describe()</button>
               <button class="dep-snip-btn" data-cat="${cat.id}" data-snip=".shape">.shape</button>
               <button class="dep-snip-btn" data-cat="${cat.id}" data-snip=".dtypes">.dtypes</button>
               <button class="dep-snip-btn" data-cat="${cat.id}" data-snip=".info()">.info()</button>
             </div>`
          : '';

        const catBody = catOpen
          ? `<div class="dep-catalog-body">
               <div class="dep-meta-badges">
                 <span class="dep-meta-badge dep-badge-type">${cat.type}</span>
                 <span class="dep-meta-badge dep-badge-access">${cat.access}</span>
               </div>
               ${colRows}
               ${snippets}
             </div>`
          : '';

        return `
          <div>
            <div class="dep-catalog-row" data-toggle="${cat.id}">
              ${chevronSVG(catOpen)}
              ${dbIconSVG()}
              <span class="dep-catalog-name">${cat.name}</span>
              <span class="dep-catalog-rows-badge">${cat.rows}r</span>
              <button class="dep-load-btn" data-load="${cat.id}">↳ Load</button>
            </div>
            ${catBody}
          </div>`;
      }).join('');

      return `
        <div class="dep-git-section">
          <div class="dep-project-row" data-toggle="${project.id}">
            ${chevronSVG(projOpen)}
            <span style="flex:1">${project.label}</span>
            <span style="font-size:9px;color:#555;background:#222;padding:1px 4px;border-radius:3px;font-weight:400">${project.catalogs.length}</span>
          </div>
          ${projOpen ? `<div class="dep-project-children">${catalogs}</div>` : ''}
        </div>`;
    }).join('');

    container.innerHTML = rows || `<div class="dep-empty-msg">No catalogs match "<em>${q}</em>"</div>`;

    // Wire events
    container.querySelectorAll('[data-toggle]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = el.dataset.toggle;
        state.expanded[key] = !state.expanded[key];
        renderCatalogPanel();
      });
    });

    container.querySelectorAll('[data-load]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = btn.dataset.load;
        const cat = DEP_PROJECTS.flatMap((p) => p.catalogs).find((c) => c.id === catId);
        if (!cat) return;
        const code = `import dep_sdk as dep\n${cat.varName} = dep.get_catalog("${cat.name}")\n${cat.varName}.head()`;
        injectCode(code);
      });
    });

    container.querySelectorAll('[data-col]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = el.dataset.cat;
        const colName = el.dataset.col;
        const cat = DEP_PROJECTS.flatMap((p) => p.catalogs).find((c) => c.id === catId);
        if (!cat) return;
        injectCode(`${cat.varName}['${colName}']`);
      });
    });

    container.querySelectorAll('[data-snip]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = btn.dataset.cat;
        const snip = btn.dataset.snip;
        const cat = DEP_PROJECTS.flatMap((p) => p.catalogs).find((c) => c.id === catId);
        if (!cat) return;
        injectCode(`${cat.varName}${snip}`);
      });
    });
  }

  /* ─── Render: Git Panel ──────────────────────────────────────────── */
  function renderGitPanel() {
    const container = document.getElementById('dep-git-content');
    if (!container) return;

    if (state.gitLoading) {
      container.innerHTML = `<div class="dep-empty-msg"><div class="dep-spinner"></div><div style="margin-top:6px">Loading git status…</div></div>`;
      return;
    }

    if (!state.gitData) {
      container.innerHTML = `
        <div class="dep-empty-msg">
          <div>🌿</div>
          <div style="margin-top:8px">Connect to a Git repository<br>to view status and commits.</div>
          <button class="dep-git-refresh-btn" id="dep-git-load-btn" style="margin-top:12px">Load Git Status</button>
        </div>`;
      container.querySelector('#dep-git-load-btn')?.addEventListener('click', loadGitStatus);
      return;
    }

    if (state.gitData.error) {
      container.innerHTML = `
        <div class="dep-empty-msg">
          <div>⚠️</div>
          <div style="margin-top:6px;color:#f44747">${state.gitData.error}</div>
          <button class="dep-git-refresh-btn" id="dep-git-retry-btn" style="margin-top:10px">Retry</button>
        </div>`;
      container.querySelector('#dep-git-retry-btn')?.addEventListener('click', loadGitStatus);
      return;
    }

    const { branch, staged = [], unstaged = [], untracked = [], log = [] } = state.gitData;

    const stagedRows = staged.map((f) => `
      <div class="dep-git-file-row" title="${f.path}">
        <span class="dep-git-status-badge dep-git-${f.status || 'A'}">${f.status || 'A'}</span>
        <span class="dep-git-file-name">${f.path}</span>
      </div>`).join('') || '<div style="padding:4px;font-size:10px;color:#555">Nothing staged</div>';

    const unstagedRows = [...unstaged, ...untracked].map((f) => `
      <div class="dep-git-file-row" title="${f.path}">
        <span class="dep-git-status-badge dep-git-${f.status || '?'}">${f.status || '?'}</span>
        <span class="dep-git-file-name">${f.path}</span>
        <button class="dep-stage-btn" data-stage-path="${f.path}">+ Stage</button>
      </div>`).join('') || '<div style="padding:4px;font-size:10px;color:#555">Working tree clean</div>';

    const logRows = log.slice(0, 12).map((c) => `
      <div class="dep-git-log-item">
        <div class="dep-git-log-hash">${(c.hash || '').slice(0, 7)}</div>
        <div class="dep-git-log-msg">${c.message || ''}</div>
        <div class="dep-git-log-meta">${c.author || ''} · ${c.date || ''}</div>
      </div>`).join('');

    container.innerHTML = `
      <!-- Branch info -->
      <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid #2a2a2a;">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style="color:#a78bfa">
          <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/>
        </svg>
        <span style="font-size:11px;font-weight:600;color:#a78bfa">${branch || 'main'}</span>
        <button class="dep-git-refresh-btn" id="dep-git-refresh-btn" style="margin-left:auto">↻ Refresh</button>
      </div>

      <!-- Staged -->
      <div class="dep-git-section" style="padding:4px 6px;">
        <div class="dep-git-section-title">
          Staged Changes
          <span style="font-size:9px;background:rgba(106,153,85,0.15);border:1px solid rgba(106,153,85,0.3);color:#9cd98c;padding:1px 4px;border-radius:3px">${staged.length}</span>
        </div>
        ${stagedRows}
      </div>

      <!-- Unstaged -->
      <div class="dep-git-section" style="padding:4px 6px;">
        <div class="dep-git-section-title">
          Changes
          <button class="dep-stage-btn" id="dep-stage-all-btn" style="font-size:8.5px">+ Stage All</button>
        </div>
        ${unstagedRows}
      </div>

      <!-- Commit -->
      <div class="dep-commit-area" style="padding: 0 6px 6px;">
        <textarea class="dep-commit-input" id="dep-commit-msg" rows="2" placeholder="Commit message…"></textarea>
        <button class="dep-commit-btn" id="dep-commit-btn" ${staged.length === 0 ? 'disabled' : ''}>
          ✓ Commit ${staged.length > 0 ? `(${staged.length})` : ''}
        </button>
      </div>

      <!-- Log -->
      <div class="dep-git-section" style="padding:4px 6px;">
        <div class="dep-git-section-title">
          Recent Commits
          <span style="font-size:9px;color:#555">${log.length}</span>
        </div>
        ${logRows || '<div style="padding:4px;font-size:10px;color:#555">No commits yet</div>'}
      </div>`;

    // Wire git panel events
    container.querySelector('#dep-git-refresh-btn')?.addEventListener('click', loadGitStatus);

    container.querySelectorAll('[data-stage-path]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const p = btn.dataset.stagePath;
        try {
          await gitFetch('/add', {
            method: 'POST',
            body: JSON.stringify({ paths: [p] }),
          });
          await loadGitStatus();
        } catch (err) {
          alert(`Stage failed: ${err.message}`);
        }
      });
    });

    container.querySelector('#dep-stage-all-btn')?.addEventListener('click', async () => {
      try {
        await gitFetch('/add', {
          method: 'POST',
          body: JSON.stringify({ paths: ['.'] }),
        });
        await loadGitStatus();
      } catch (err) {
        alert(`Stage all failed: ${err.message}`);
      }
    });

    container.querySelector('#dep-commit-msg')?.addEventListener('input', (e) => {
      state.gitCommitMsg = e.target.value;
    });

    container.querySelector('#dep-commit-btn')?.addEventListener('click', async () => {
      if (!state.gitCommitMsg.trim()) {
        alert('Please enter a commit message.');
        return;
      }
      try {
        await gitFetch('/commit', {
          method: 'POST',
          body: JSON.stringify({ message: state.gitCommitMsg.trim() }),
        });
        state.gitCommitMsg = '';
        await loadGitStatus();
      } catch (err) {
        alert(`Commit failed: ${err.message}`);
      }
    });
  }

  /* ─── Render: main panel (tabs + content) ────────────────────────── */
  function renderPanel() {
    const panel = document.getElementById('dep-sidebar-panel');
    if (!panel) return;

    panel.innerHTML = `
      <div class="dep-panel-header">
        <span class="dep-panel-title">DEP Workbench</span>
        <span style="font-size:9px;background:rgba(106,153,85,0.15);border:1px solid rgba(106,153,85,0.3);color:#9cd98c;padding:2px 6px;border-radius:3px;font-weight:700">4 catalogs</span>
      </div>

      <div class="dep-tab-bar">
        <button class="dep-tab ${state.activeTab === 'catalogs' ? 'dep-tab-active' : ''}" id="dep-tab-catalogs">📊 Catalogs</button>
        <button class="dep-tab ${state.activeTab === 'git' ? 'dep-tab-active' : ''}" id="dep-tab-git">🌿 Git</button>
      </div>

      <!-- Catalog panel -->
      <div id="dep-catalog-wrap" style="display:${state.activeTab === 'catalogs' ? 'flex' : 'none'};flex-direction:column;flex:1;overflow:hidden;">
        <div class="dep-search-wrap">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style="color:#555;flex-shrink:0">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
          </svg>
          <input type="text" id="dep-search-input" placeholder="Search catalogs, columns…" value="${state.catalogSearch}" />
          ${state.catalogSearch ? '<span id="dep-search-clear" style="cursor:pointer;color:#555;font-size:11px">✕</span>' : ''}
        </div>
        <div class="dep-scroll" id="dep-catalog-content"></div>
        <div class="dep-footer">
          <strong style="color:#a78bfa">↳ Load</strong> injects <code>dep.get_catalog()</code>.
          Click a column to insert a reference.
        </div>
      </div>

      <!-- Git panel -->
      <div id="dep-git-wrap" style="display:${state.activeTab === 'git' ? 'flex' : 'none'};flex-direction:column;flex:1;overflow-y:auto;">
        <div id="dep-git-content" style="flex:1;"></div>
      </div>
    `;

    // Tab switching
    panel.querySelector('#dep-tab-catalogs')?.addEventListener('click', () => {
      state.activeTab = 'catalogs';
      renderPanel();
    });
    panel.querySelector('#dep-tab-git')?.addEventListener('click', () => {
      state.activeTab = 'git';
      renderPanel();
      if (!state.gitData && !state.gitLoading) loadGitStatus();
    });

    // Search
    panel.querySelector('#dep-search-input')?.addEventListener('input', (e) => {
      state.catalogSearch = e.target.value;
      renderCatalogPanel();
    });
    panel.querySelector('#dep-search-clear')?.addEventListener('click', () => {
      state.catalogSearch = '';
      renderPanel();
    });

    // Render sub-panels
    renderCatalogPanel();
    renderGitPanel();
  }

  /* ─── DOM injection ──────────────────────────────────────────────── */
  function injectSidebar() {
    // Avoid double inject
    if (document.getElementById('dep-sidebar-panel')) return;

    // Find the JupyterLab main split panel
    const labShell = document.querySelector('.jp-LabShell') ||
                     document.querySelector('#main') ||
                     document.body;

    // Create our panel
    const panel = document.createElement('div');
    panel.id = 'dep-sidebar-panel';

    // Find the left-side content area (stacked panel) and prepend before it
    // JupyterLab 4: the layout is a horizontal BoxPanel with the left sidebar
    // We insert before the main area
    const mainBox = document.querySelector('.jp-MainAreaWidget') ||
                    document.querySelector('.lm-DockPanel') ||
                    labShell.querySelector(':scope > .lm-Widget:last-child');

    if (mainBox && mainBox.parentNode) {
      mainBox.parentNode.insertBefore(panel, mainBox);
    } else {
      labShell.insertBefore(panel, labShell.firstChild);
    }

    // Add toggle button to the existing left icon sidebar
    const iconBar = document.querySelector('.jp-SideBar.jp-mod-left .lm-TabBar-tabList') ||
                    document.querySelector('.lm-TabBar.jp-mod-left ul');

    if (iconBar) {
      const li = document.createElement('li');
      li.innerHTML = `
        <button id="dep-sidebar-tab-btn" class="dep-active" title="DEP Catalog & Git Explorer">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 5v4c0 1.66-4.03 3-9 3S3 10.66 3 9V5"/>
            <path d="M21 9v4c0 1.66-4.03 3-9 3S3 14.66 3 13V9"/>
            <path d="M21 13v4c0 1.66-4.03 3-9 3S3 18.66 3 17v-4"/>
          </svg>
          <span class="dep-badge"></span>
        </button>`;
      iconBar.appendChild(li);
      iconBar.querySelector('#dep-sidebar-tab-btn').addEventListener('click', () => {
        state.panelVisible = !state.panelVisible;
        panel.style.display = state.panelVisible ? 'flex' : 'none';
        iconBar.querySelector('#dep-sidebar-tab-btn').classList.toggle('dep-active', state.panelVisible);
      });
    }

    renderPanel();
  }

  /* ─── Boot ───────────────────────────────────────────────────────── */
  function boot() {
    injectStyles();
    const maxMs = 40000;
    const start = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - start > maxMs) {
        clearInterval(timer);
        console.warn('[DEP Catalog] Timed out waiting for JupyterLab.');
        return;
      }
      // Wait for app + left sidebar to appear
      const sidebar = document.querySelector('.jp-SideBar.jp-mod-left') ||
                      document.querySelector('.lm-TabBar.jp-mod-left');
      const mainArea = document.querySelector('.jp-MainAreaWidget') ||
                       document.querySelector('.lm-DockPanel');
      if (sidebar && mainArea && window.jupyterapp) {
        clearInterval(timer);
        // Short delay to let JupyterLab finish its layout
        setTimeout(injectSidebar, 600);
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
