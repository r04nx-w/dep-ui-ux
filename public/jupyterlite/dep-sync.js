(function () {
  'use strict';

  let dynamicApiUrl = null;
  let dynamicToken = null;

  function getApiBase() {
    if (dynamicApiUrl) return dynamicApiUrl;
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000';
      }
      return window.location.origin;
    }
    return 'http://localhost:8000';
  }

  function getToken() {
    if (dynamicToken) return dynamicToken;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dep_jwt_token') || localStorage.getItem('token') || '';
    }
    return '';
  }

  function getWorkspaceId() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ws = urlParams.get('workspace');
      if (ws) return ws;
      
      const pathParts = window.location.pathname.split('/');
      const labIdx = pathParts.indexOf('lab');
      if (labIdx > 1) {
        return pathParts[labIdx - 1];
      }
    } catch (e) {}
    return 'default';
  }

  function getDBName() {
    const ws = getWorkspaceId();
    return ws ? `JupyterLite Storage - ${ws}` : 'JupyterLite Storage';
  }

  const STORE_NAME = 'files';
  const WS_ID = getWorkspaceId();
  let isSyncing = false;
  let pendingSync = false;
  let cachedLastModified = 0.0;
  let isConflict = false;

  // ── Step 1: Restore snapshot from backend ──────────────────────────────────

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
      
      cachedLastModified = data.last_modified || 0.0;
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
              r.onsuccess = () => { done++; };
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
    if (isConflict) return;
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
        body: JSON.stringify({ 
          workspace_id: WS_ID, 
          files, 
          last_modified: cachedLastModified 
        })
      });
      if (res.ok) {
        const resData = await res.json();
        cachedLastModified = resData.last_modified || cachedLastModified;
        window.parent.postMessage({ type: 'DEP_SYNC_OK', lastModified: cachedLastModified }, '*');
        console.log(`[DEP Sync] ✅ Synced ${count} entries for "${WS_ID}" to backend ${apiBase}`);
      } else if (res.status === 409) {
        isConflict = true;
        const errData = await res.json().catch(() => ({}));
        const serverMtime = errData.detail?.server_last_modified || 0;
        console.warn('[DEP Sync] Concurrency conflict detected on server!');
        window.parent.postMessage({ 
          type: 'DEP_SYNC_CONFLICT', 
          workspaceId: WS_ID, 
          serverLastModified: serverMtime, 
          clientLastModified: cachedLastModified 
        }, '*');
      } else {
        console.warn('[DEP Sync] Sync failed:', res.status);
        window.parent.postMessage({ type: 'DEP_SYNC_ERROR', status: res.status }, '*');
      }
    } catch (e) {
      console.warn('[DEP Sync] Push failed:', e.message);
      window.parent.postMessage({ type: 'DEP_SYNC_ERROR', message: e.message }, '*');
    } finally {
      isSyncing = false;
      if (pendingSync && !isConflict) { setTimeout(pushToBackend, 2000); }
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
      isConflict = false;
      restoreFromBackend().then(() => {
        try { window.parent.postMessage({ type: 'DEP_SYNC_READY', workspaceId: WS_ID, lastModified: cachedLastModified }, '*'); } catch (e) {}
      });
    }
    if (event.data?.type === 'DEP_FORCE_PUSH_CONFIRM') {
      isConflict = false;
      pushToBackend();
    }
    if (event.data?.type === 'DEP_FORCE_PULL_CONFIRM') {
      isConflict = false;
      restoreFromBackend().then(() => {
        try { window.parent.postMessage({ type: 'DEP_SYNC_READY', workspaceId: WS_ID, lastModified: cachedLastModified }, '*'); } catch (e) {}
      });
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  restoreFromBackend().then(() => {
    try { window.parent.postMessage({ type: 'DEP_SYNC_READY', workspaceId: WS_ID, lastModified: cachedLastModified }, '*'); } catch (e) {}
    console.log('[DEP Sync] 🚀 Real-time sync initialized for workspace:', WS_ID);
  });

  window.addEventListener('beforeunload', () => { pushToBackend(); });

})();
