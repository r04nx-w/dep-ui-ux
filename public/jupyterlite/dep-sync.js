/**
 * dep-sync.js
 * -----------
 * Real-time IndexedDB sync for DEP Workbench JupyterLite persistence.
 *
 * Strategy:
 *  1. On load: fetch workspace snapshot from backend → write to IndexedDB
 *     BEFORE JupyterLite's localForage reads it.
 *  2. Monkey-patch IDBObjectStore.prototype.put to intercept every save
 *     JupyterLite makes → debounce → POST full snapshot to backend.
 *
 * This runs in the JupyterLite iframe's origin so it has direct IndexedDB
 * access without cross-origin issues.
 */

(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getWorkspaceId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('workspace') || 'default';
  }

  // Dynamic config populated via parent frame postMessage
  let dynamicApiUrl = '';
  let dynamicToken = '';

  function getApiBase() {
    return dynamicApiUrl || window.location.origin;
  }

  function getToken() {
    if (dynamicToken) return dynamicToken;
    try {
      return localStorage.getItem('dep_jwt_token') ||
             localStorage.getItem('token') ||
             sessionStorage.getItem('dep_jwt_token') || '';
    } catch (e) { return ''; }
  }

  // ── DB name (must match what JupyterLite uses) ────────────────────────────

  function getDBName() {
    const ws = getWorkspaceId();
    return ws !== 'default'
      ? `JupyterLite Storage - ${ws}`
      : `JupyterLite Storage - ${window.location.pathname.replace(/\/lab\/.*$/, '/') }`;
  }

  const STORE_NAME = 'files';
  const WS_ID = getWorkspaceId();
  let isSyncing = false;
  let pendingSync = false;

  // ── Step 1: Restore snapshot from backend into IndexedDB ──────────────────

  async function restoreFromBackend() {
    const token = getToken();
    const apiBase = getApiBase();
    const url = `${apiBase}/workspaces/sync/${WS_ID}`;
    try {
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) { console.warn('[DEP Sync] Could not fetch workspace snapshot:', res.status); return; }
      const data = await res.json();
      const files = data.files || {};
      const keys = Object.keys(files);
      if (keys.length === 0) { console.log('[DEP Sync] No saved snapshot found for', WS_ID); return; }

      console.log(`[DEP Sync] Restoring ${keys.length} entries for workspace "${WS_ID}" from backend ${apiBase}…`);
      await writeToIndexedDB(getDBName(), STORE_NAME, files);
      console.log(`[DEP Sync] ✅ Restored ${keys.length} entries into IndexedDB.`);
    } catch (e) {
      console.warn('[DEP Sync] Restore failed (backend may be offline):', e.message);
    }
  }

  function writeToIndexedDB(dbName, storeName, data) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db = e.target.result;
        const version = db.version;
        db.close();

        const req2 = indexedDB.open(dbName, db.objectStoreNames.contains(storeName) ? version : version + 1);
        req2.onupgradeneeded = (evt) => {
          const udb = evt.target.result;
          if (!udb.objectStoreNames.contains(storeName)) {
            udb.createObjectStore(storeName);
          }
        };
        req2.onerror = () => reject(req2.error);
        req2.onsuccess = (evt) => {
          const db2 = evt.target.result;
          try {
            const tx = db2.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            let done = 0;
            const total = Object.keys(data).length;
            if (total === 0) { db2.close(); resolve(); return; }
            for (const [key, val] of Object.entries(data)) {
              const r = store.put(val, key);
              r.onsuccess = () => { done++; if (done === total) { /* tx.oncomplete will resolve */ } };
            }
            tx.oncomplete = () => { db2.close(); resolve(); };
            tx.onerror = () => { db2.close(); reject(tx.error); };
          } catch (err) { db2.close(); reject(err); }
        };
      };
    });
  }

  // ── Step 2: Read all entries from IndexedDB ───────────────────────────────

  function readFromIndexedDB(dbName, storeName) {
    return new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => resolve({});
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve({}); return; }
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const result = {};
          const cursor = store.openCursor();
          cursor.onsuccess = (evt) => {
            const c = evt.target.result;
            if (c) { result[c.key] = c.value; c.continue(); }
            else { db.close(); resolve(result); }
          };
          cursor.onerror = () => { db.close(); resolve({}); };
        } catch (err) { db.close(); resolve({}); }
      };
    });
  }

  // ── Step 3: Push snapshot to backend ─────────────────────────────────────

  async function pushToBackend() {
    if (isSyncing) { pendingSync = true; return; }
    isSyncing = true;
    pendingSync = false;
    try {
      const files = await readFromIndexedDB(getDBName(), STORE_NAME);
      const count = Object.keys(files).length;
      if (count === 0) { isSyncing = false; return; }

      const token = getToken();
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/workspaces/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ workspace_id: WS_ID, files })
      });
      if (res.ok) {
        console.log(`[DEP Sync] ✅ Synced ${count} entries for "${WS_ID}" to backend ${apiBase}`);
      } else {
        console.warn('[DEP Sync] Sync failed:', res.status);
      }
    } catch (e) {
      console.warn('[DEP Sync] Push failed:', e.message);
    } finally {
      isSyncing = false;
      if (pendingSync) { setTimeout(pushToBackend, 2000); }
    }
  }

  // ── Step 4: Monkey-patch IDBObjectStore.put to trigger sync on every save ─

  let syncTimer = null;
  const DEBOUNCE_MS = 1500;

  function schedulePush() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushToBackend, DEBOUNCE_MS);
  }

  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    const result = originalPut.apply(this, arguments);
    try {
      const dbName = this.transaction.db.name;
      const storeName = this.name;
      if (dbName.startsWith('JupyterLite Storage') && storeName === STORE_NAME) {
        schedulePush();
      }
    } catch (e) { /* ignore */ }
    return result;
  };

  const originalDelete = IDBObjectStore.prototype.delete;
  IDBObjectStore.prototype.delete = function (key) {
    const result = originalDelete.apply(this, arguments);
    try {
      const dbName = this.transaction.db.name;
      if (dbName.startsWith('JupyterLite Storage') && this.name === STORE_NAME) {
        schedulePush();
      }
    } catch (e) { /* ignore */ }
    return result;
  };

  // ── Listen for configuration from parent frame ──────────────────────────

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'DEP_AUTH_INJECT') {
      const { apiUrl, token } = event.data;
      if (apiUrl) {
        dynamicApiUrl = apiUrl;
        console.log('[DEP Sync] Received API base URL from host:', apiUrl);
      }
      if (token) {
        dynamicToken = token;
      }
      // Re-trigger restore to make sure we've got the latest from backend
      restoreFromBackend().then(() => {
        try { window.parent.postMessage({ type: 'DEP_SYNC_READY', workspaceId: WS_ID }, '*'); } catch (e) {}
      });
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  restoreFromBackend().then(() => {
    try { window.parent.postMessage({ type: 'DEP_SYNC_READY', workspaceId: WS_ID }, '*'); } catch (e) {}
    console.log('[DEP Sync] 🚀 Real-time sync initialized for workspace:', WS_ID);
  });

  window.addEventListener('beforeunload', () => { pushToBackend(); });

})();
