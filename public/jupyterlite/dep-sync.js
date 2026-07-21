(function () {
  'use strict';

  let bypassInterception = false;
  let activeDriveRequests = 0;

  function incrementDriveRequests() {
    activeDriveRequests++;
    setTimeout(() => {
      if (activeDriveRequests > 0) {
        activeDriveRequests--;
      }
    }, 1000);
  }

  // Intercept BroadcastChannel to track active service worker drive requests
  const originalAddEventListener = BroadcastChannel.prototype.addEventListener;
  BroadcastChannel.prototype.addEventListener = function (type, listener) {
    if (this.name === '/sw-api.v1' && type === 'message') {
      const wrappedListener = function (event) {
        const data = event.data;
        if (data && data.requestId) {
          incrementDriveRequests();
        }
        return listener.apply(this, arguments);
      };
      return originalAddEventListener.call(this, type, wrappedListener);
    }
    return originalAddEventListener.apply(this, arguments);
  };

  const originalPostMessage = BroadcastChannel.prototype.postMessage;
  BroadcastChannel.prototype.postMessage = function (message) {
    if (this.name === '/sw-api.v1' && message && message.requestId) {
      if (activeDriveRequests > 0) {
        activeDriveRequests--;
      }
    }
    return originalPostMessage.apply(this, arguments);
  };

  // Tag transactions created by the worker / coincident worker proxy synchronously
  const originalTransaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (storeNames, mode) {
    const tx = originalTransaction.apply(this, arguments);
    try {
      const stack = new Error().stack || '';
      if (stack.includes('coincident') || 
          stack.includes('worker') || 
          stack.includes('DriveContentsProcessor') || 
          stack.includes('processDriveRequest') || 
          stack.includes('sw-api')) {
        tx.__dep_is_worker = true;
      }
    } catch (e) {}
    return tx;
  };

  function shouldFilter(dbName, storeName, transaction) {
    if (bypassInterception) return false;
    if (activeDriveRequests > 0) return false;
    if (transaction && transaction.__dep_is_worker) return false;
    if (dbName.startsWith('JupyterLite Storage') && storeName === 'files') {
      return true;
    }
    return false;
  }

  // Intercept IndexedDB directory queries on the main thread to hide dep_sdk.py and .dep_session from file sidebar browser
  const originalOpenCursor = IDBObjectStore.prototype.openCursor;
  IDBObjectStore.prototype.openCursor = function (query, direction) {
    const dbName = this.transaction.db.name;
    const storeName = this.name;
    if (!shouldFilter(dbName, storeName, this.transaction)) {
      return originalOpenCursor.apply(this, arguments);
    }
    const request = originalOpenCursor.apply(this, arguments);
    try {
      const originalOnSuccess = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess');
      Object.defineProperty(request, 'onsuccess', {
        set: function (callback) {
          const wrappedCallback = function (event) {
            const cursor = event.target.result;
            if (cursor) {
              const key = cursor.key;
              if (typeof key === 'string' && (
                key === 'dep_sdk.py' || key.endsWith('/dep_sdk.py') || 
                key === '.dep_session' || key.endsWith('/.dep_session') ||
                key === 'sitecustomize.py' || key.endsWith('/sitecustomize.py')
              )) {
                cursor.continue();
                return;
              }
            }
            callback.call(this, event);
          };
          originalOnSuccess.set.call(request, wrappedCallback);
        },
        configurable: true
      });
    } catch (e) { /* ignore */ }
    return request;
  };

  const originalGetAll = IDBObjectStore.prototype.getAll;
  IDBObjectStore.prototype.getAll = function (query, count) {
    const dbName = this.transaction.db.name;
    const storeName = this.name;
    if (!shouldFilter(dbName, storeName, this.transaction)) {
      return originalGetAll.apply(this, arguments);
    }
    const request = originalGetAll.apply(this, arguments);
    try {
      const originalOnSuccess = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess');
      Object.defineProperty(request, 'onsuccess', {
        set: function (callback) {
          const wrappedCallback = function (event) {
            const result = event.target.result;
            if (Array.isArray(result)) {
              const filtered = result.filter(item => {
                const path = item?.path || item?.name;
                if (typeof path === 'string' && (
                  path === 'dep_sdk.py' || path.endsWith('/dep_sdk.py') || 
                  path === '.dep_session' || path.endsWith('/.dep_session') ||
                  path === 'sitecustomize.py' || path.endsWith('/sitecustomize.py')
                )) {
                  return false;
                }
                return true;
              });
              Object.defineProperty(event.target, 'result', {
                get: () => filtered,
                configurable: true
              });
            }
            callback.call(this, event);
          };
          originalOnSuccess.set.call(request, wrappedCallback);
        },
        configurable: true
      });
    } catch (e) { /* ignore */ }
    return request;
  };

  const originalGetAllKeys = IDBObjectStore.prototype.getAllKeys;
  if (originalGetAllKeys) {
    IDBObjectStore.prototype.getAllKeys = function (query, count) {
      const dbName = this.transaction.db.name;
      const storeName = this.name;
      if (!shouldFilter(dbName, storeName, this.transaction)) {
        return originalGetAllKeys.apply(this, arguments);
      }
      const request = originalGetAllKeys.apply(this, arguments);
      try {
        const originalOnSuccess = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess');
        Object.defineProperty(request, 'onsuccess', {
          set: function (callback) {
            const wrappedCallback = function (event) {
              const result = event.target.result;
              if (Array.isArray(result)) {
                const filtered = result.filter(key => {
                  if (typeof key === 'string' && (
                    key === 'dep_sdk.py' || key.endsWith('/dep_sdk.py') || 
                    key === '.dep_session' || key.endsWith('/.dep_session') ||
                    key === 'sitecustomize.py' || key.endsWith('/sitecustomize.py')
                  )) {
                    return false;
                  }
                  return true;
                });
                Object.defineProperty(event.target, 'result', {
                  get: () => filtered,
                  configurable: true
                });
              }
              callback.call(this, event);
            };
            originalOnSuccess.set.call(request, wrappedCallback);
          },
          configurable: true
        });
      } catch (e) { /* ignore */ }
      return request;
    };
  }

  let dynamicApiUrl = null;
  let dynamicToken = null;

  function getApiBase() {
    if (dynamicApiUrl) return dynamicApiUrl;
    if (typeof window !== 'undefined') {
      if (window.location.port === '3000') {
        return 'http://' + window.location.hostname + ':8000';
      }
      return window.location.protocol + '//' + window.location.host + '/api';
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

  let cachedSdkObj = null;
  let cachedSessionObj = null;
  let cachedSitecustomizeObj = null;

  function loadCachedObjects() {
    try {
      const dbReq = indexedDB.open(getDBName());
      dbReq.onsuccess = (e) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains(STORE_NAME)) {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          
          const getSdk = store.get("dep_sdk.py");
          getSdk.onsuccess = () => {
            if (getSdk.result) {
              cachedSdkObj = getSdk.result;
              console.log('[DEP Sync] Loaded dep_sdk.py from IndexedDB cache');
            }
          };
          
          const getSession = store.get(".dep_session");
          getSession.onsuccess = () => {
            if (getSession.result) {
              cachedSessionObj = getSession.result;
              console.log('[DEP Sync] Loaded .dep_session from IndexedDB cache');
            }
          };
          
          tx.oncomplete = () => db.close();
        } else {
          db.close();
        }
      };
    } catch (err) { /* ignore */ }
  }

  loadCachedObjects();

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
      for (const key of Object.keys(files)) {
        if (key === 'dep_sdk.py' || key.endsWith('/dep_sdk.py')) {
          delete files[key];
        }
      }
      if (files['.dep_session']) cachedSessionObj = files['.dep_session'];
      const keys = Object.keys(files);
      if (keys.length === 0) { console.log('[DEP Sync] No saved snapshot found for', WS_ID); return; }

      console.log(`[DEP Sync] Restoring ${keys.length} entries for workspace "${WS_ID}" from backend ${apiBase}…`);
      await writeToIndexedDB(getDBName(), STORE_NAME, files);
      
      if (cachedSessionObj || cachedSitecustomizeObj) {
        const extra = {};
        if (cachedSessionObj) extra[".dep_session"] = cachedSessionObj;
        if (cachedSitecustomizeObj) extra["sitecustomize.py"] = cachedSitecustomizeObj;
        await writeToIndexedDB(getDBName(), STORE_NAME, extra);
      }
      
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
      bypassInterception = true;
      const req = indexedDB.open(dbName);
      req.onerror = () => {
        bypassInterception = false;
        resolve({});
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.close();
          bypassInterception = false;
          resolve({});
          return;
        }
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const result = {};
          const cursor = store.openCursor();
          cursor.onsuccess = (evt) => {
            const c = evt.target.result;
            if (c) {
              result[c.key] = c.value;
              c.continue();
            } else {
              db.close();
              bypassInterception = false;
              resolve(result);
            }
          };
          cursor.onerror = () => {
            db.close();
            bypassInterception = false;
            resolve({});
          };
        } catch (err) {
          db.close();
          bypassInterception = false;
          resolve({});
        }
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
    if (key === 'dep_sdk.py') {
      cachedSdkObj = value;
    }
    if (key === '.dep_session') {
      cachedSessionObj = value;
    }

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

  // ── Session writing helper ─────────────────────────────────────────────────
  // Called every time fresh auth data arrives. Writes .dep_session + sitecustomize.py
  // to IndexedDB so the Pyodide worker FS picks them up on next import.

  function writeSession(token, apiUrl, userRole, userId, userName, allowedCatalogs) {
    try {
      const sessionData = {
        token:            token,
        api_url:          apiUrl || 'http://localhost:8000',
        user_role:        userRole || 'analyst',
        user_id:          userId  || 'dep_user',
        user_name:        userName || userId || 'dep_user',
        allowed_catalogs: allowedCatalogs || [],
        workspace_id:     WS_ID,
        active_notebook:  'DEP_Analysis_Starter.ipynb',
        written_at:       new Date().toISOString(),
      };
      const sessionStr = JSON.stringify(sessionData);
      const sessionFileObj = {
        name:          ".dep_session",
        path:          ".dep_session",
        format:        "text",
        mimetype:      "text/plain",
        content:       sessionStr,
        size:          sessionStr.length,
        writable:      true,
        type:          "file",
        last_modified: new Date().toISOString()
      };

      const sitecustomizeContent = `import sys
import os
import shutil
import site

# Bootstrap dep_sdk into site-packages so 'import dep_sdk' always works.
# dep_sdk.py is written to IndexedDB at /drive/dep_sdk.py by dep-sync.js
# on every workspace open. Copying it to site-packages makes it importable
# without any sys.path manipulation in user notebooks.
try:
    _sdk_src = None
    for _p in ["/drive/dep_sdk.py", "./dep_sdk.py", "../dep_sdk.py"]:
        if os.path.exists(_p):
            _sdk_src = _p
            break
    if _sdk_src:
        _site_pack = site.getsitepackages()[0]
        shutil.copyfile(_sdk_src, os.path.join(_site_pack, "dep_sdk.py"))
        print("[DEP] dep_sdk.py installed to site-packages from", _sdk_src)
except Exception as _e:
    print("[DEP] dep_sdk install warning:", _e)

# Ensure /drive is on sys.path as a direct-import fallback
try:
    for _p in ["/drive", ".", ".."]:
        if _p not in sys.path:
            sys.path.insert(0, _p)
except Exception:
    pass
`;

      const sitecustomizeFileObj = {
        name:          "sitecustomize.py",
        path:          "sitecustomize.py",
        format:        "text",
        mimetype:      "text/x-python",
        content:       sitecustomizeContent,
        size:          sitecustomizeContent.length,
        writable:      true,
        type:          "file",
        last_modified: new Date().toISOString()
      };

      cachedSessionObj     = sessionFileObj;
      cachedSitecustomizeObj = sitecustomizeFileObj;

      const dbReq = indexedDB.open(getDBName());
      dbReq.onsuccess = (e) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains(STORE_NAME)) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(sessionFileObj,     '.dep_session');
          store.put(sitecustomizeFileObj, 'sitecustomize.py');
          tx.oncomplete = () => {
            db.close();
            console.log('[DEP Sync] ✅ .dep_session refreshed at', new Date().toISOString());
          };
        } else {
          db.close();
        }
      };
    } catch (err) {
      console.warn('[DEP Sync] Failed to write session:', err);
    }
  }

  // ── Listen for configuration from parent frame ──────────────────────────

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'DEP_AUTH_INJECT') {
      const { apiUrl, token, userRole, userId, userName, allowedCatalogs } = event.data;
      if (apiUrl) {
        dynamicApiUrl = apiUrl;
        console.log('[DEP Sync] Received API base URL from host:', apiUrl);
      }
      if (token) {
        dynamicToken = token;
        // Write a fresh, complete session immediately
        writeSession(token, apiUrl, userRole, userId, userName, allowedCatalogs);
      } else {
        // Even without a token update, refresh the rest of the session data
        writeSession(dynamicToken, apiUrl || dynamicApiUrl, userRole, userId, userName, allowedCatalogs);
      }
      isConflict = false;
      restoreFromBackend().then(() => {
        try { window.parent.postMessage({ type: 'DEP_SYNC_READY', workspaceId: WS_ID, lastModified: cachedLastModified }, '*'); } catch (e) {}
      });
    }
    if (event.data?.type === 'DEP_SESSION_REFRESH') {
      // Parent pushed a targeted session refresh (no full restore needed)
      const { token, apiUrl, userRole, userId, userName, allowedCatalogs } = event.data;
      if (token) dynamicToken = token;
      if (apiUrl) dynamicApiUrl = apiUrl;
      writeSession(
        token || dynamicToken,
        apiUrl || dynamicApiUrl,
        userRole, userId, userName, allowedCatalogs
      );
      console.log('[DEP Sync] 🔄 Session refreshed from parent (DEP_SESSION_REFRESH)');
    }
    if (event.data?.type === 'DEP_FORCE_PUSH_CONFIRM') {
      isConflict = false;
      if (event.data.lastModified) {
        cachedLastModified = event.data.lastModified;
      }
      pushToBackend();
    }
    if (event.data?.type === 'DEP_FORCE_PULL_CONFIRM') {
      isConflict = false;
      restoreFromBackend().then(() => {
        try { window.parent.postMessage({ type: 'DEP_SYNC_READY', workspaceId: WS_ID, lastModified: cachedLastModified }, '*'); } catch (e) {}
      });
    }
  });

  // ── Fetch dep_sdk.py from static URL and write to IndexedDB ─────────────
  // This is the GUARANTEED path for dep_sdk availability. dep_sdk.py is served
  // as a static file by the host. We fetch it and write it into the JupyterLite
  // drive (IndexedDB) so Pyodide can find it at /drive/dep_sdk.py on every
  // kernel start, even after clearing cache or on first boot.

  async function fetchAndWriteSdk() {
    try {
      // Build the URL: dep_sdk.py is served from the host at /jupyterlite/files/
      // We use window.parent.location to get the origin regardless of iframe nesting.
      let origin = '';
      try { origin = window.parent.location.origin; } catch(e) {
        try { origin = window.location.origin; } catch(e2) {}
      }
      const sdkUrl = origin + '/jupyterlite/files/dep_sdk.py?v=' + Date.now();
      const res = await fetch(sdkUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sdkContent = await res.text();

      const sdkFileObj = {
        name:          'dep_sdk.py',
        path:          'dep_sdk.py',
        format:        'text',
        mimetype:      'text/x-python',
        content:       sdkContent,
        size:          sdkContent.length,
        writable:      false,
        type:          'file',
        last_modified: new Date().toISOString()
      };
      cachedSdkObj = sdkFileObj;

      return new Promise((resolve) => {
        const dbReq = indexedDB.open(getDBName());
        dbReq.onerror = () => resolve();
        dbReq.onsuccess = (e) => {
          const db = e.target.result;
          if (db.objectStoreNames.contains(STORE_NAME)) {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(sdkFileObj, 'dep_sdk.py');
            tx.oncomplete = () => {
              db.close();
              console.log('[DEP Sync] ✅ dep_sdk.py written to IndexedDB from', sdkUrl);
              resolve();
            };
            tx.onerror = () => {
              db.close();
              resolve();
            };
          } else {
            db.close();
            resolve();
          }
        };
      });
    } catch (err) {
      console.warn('[DEP Sync] ⚠️ Could not fetch dep_sdk.py from server:', err);
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  // Fetch dep_sdk.py FIRST (before restoreFromBackend) so it's in IndexedDB
  // when the kernel starts, regardless of whether the backend has it.
  fetchAndWriteSdk().then(() => {
    restoreFromBackend().then(async () => {
      // Force rewrite to ensure the latest version is present in IndexedDB after restore
      await fetchAndWriteSdk();
      console.log('[DEP Sync] Boot sequence completed.');

      // After restoring files, tell the parent we are ready and ask for the
      // latest auth immediately (in case the kernel was already running before
      // injectDEPContext fired).
      try {
        window.parent.postMessage({ type: 'DEP_SYNC_READY', workspaceId: WS_ID, lastModified: cachedLastModified }, '*');
        window.parent.postMessage({ type: 'DEP_SESSION_REFRESH_REQUEST', workspaceId: WS_ID }, '*');
      } catch (e) {}
      console.log('[DEP Sync] 🚀 Real-time sync initialized for workspace:', WS_ID);
    });
  });


  // ── Heartbeat: ask parent for a fresh session every 90 seconds ────────────
  // This ensures .dep_session never goes stale if the JWT changes or catalogs
  // are updated while the workspace is open.
  setInterval(() => {
    try {
      window.parent.postMessage({ type: 'DEP_SESSION_REFRESH_REQUEST', workspaceId: WS_ID }, '*');
    } catch (e) {}
  }, 90000);

  window.addEventListener('beforeunload', () => { pushToBackend(); });

  // ── Active Notebook Detector Loop ──
  function updateSessionNotebook(notebookPath) {
    const dbReq = indexedDB.open(getDBName());
    dbReq.onsuccess = (e) => {
      const db = e.target.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(".dep_session");
        getReq.onsuccess = (ev) => {
          const fileObj = ev.target.result;
          if (fileObj && fileObj.content) {
            try {
              const session = JSON.parse(fileObj.content);
              session.active_notebook = notebookPath;
              fileObj.content = JSON.stringify(session);
              fileObj.size = fileObj.content.length;
              fileObj.last_modified = new Date().toISOString();
              store.put(fileObj, ".dep_session");
              console.log('[DEP Sync] Updated active notebook in .dep_session to:', notebookPath);
            } catch (err) {}
          }
        };
        tx.oncomplete = () => db.close();
      } else {
        db.close();
      }
    };
  }

  let lastActiveNotebook = '';
  setInterval(() => {
    try {
      if (window.jupyterapp && window.jupyterapp.shell && window.jupyterapp.shell.currentWidget) {
        const widget = window.jupyterapp.shell.currentWidget;
        if (widget.context && widget.context.path && widget.context.path.endsWith('.ipynb')) {
          const current = widget.context.path;
          if (current !== lastActiveNotebook) {
            lastActiveNotebook = current;
            updateSessionNotebook(current);
            // Notify parent so it can re-inject a fresh session with the correct notebook
            try {
              window.parent.postMessage({
                type: 'DEP_NOTEBOOK_CHANGE',
                workspaceId: WS_ID,
                notebook: current,
              }, '*');
            } catch (e) {}
            // Also update _dep_context in Python immediately via a targeted message
            try {
              window.postMessage({
                type: 'DEP_SESSION_UPDATE',
                active_notebook: current,
              }, '*');
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }, 1000);

})();
