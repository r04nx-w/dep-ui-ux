import sys
import asyncio
import types
import json
import io
from datetime import datetime

# Pre-import pandas/numpy at module level so all methods can use them without
# repeating the install guard. If not installed yet (fresh kernel), trigger
# a synchronous micropip install before anything else runs.
def _dep_safe_import(pkg, pip_name=None):
    """Import a package, triggering a micropip install if missing."""
    try:
        return __import__(pkg)
    except ImportError:
        try:
            import micropip as _mp, asyncio as _aio
            _loop = _aio.get_event_loop()
            _install_name = pip_name or pkg
            if not _loop.is_running():
                _loop.run_until_complete(_mp.install([_install_name]))
            else:
                # In a running loop we can only schedule; try pyodide_js.loadPackage
                try:
                    import pyodide_js as _pjs
                    # loadPackage is synchronous-compatible via Pyodide's syncified API
                    _pjs.loadPackagesFromImports.callSync(pkg)
                except Exception:
                    pass
        except Exception:
            pass
        try:
            return __import__(pkg)
        except ImportError:
            return None


try:
    from js import window
except ImportError:
    class _MockWindow:
        dep_auth_token = None
        dep_user_role = "analyst"
        dep_user_id = None
        dep_user_name = None
        dep_user_email = None
        dep_allowed_catalogs = []
        dep_allowed_datasets = []
        def addEventListener(self, event, handler):
            pass
        def postMessage(self, message, target=None):
            pass
    window = _MockWindow()

try:
    from pyodide.ffi import create_proxy
except ImportError:
    def create_proxy(obj):
        return obj

_dep_context = {
    "token": None,
    "api_url": "http://127.0.0.1:8000",
    "user_role": "analyst",
    "user_id": None,
    "user_name": None,
    "user_email": None,
    "allowed_catalogs": [],
    "allowed_datasets": [],
}

if getattr(window, "dep_auth_token", None):
    _dep_context["token"] = str(window.dep_auth_token)
if getattr(window, "dep_user_role", None):
    _dep_context["user_role"] = str(window.dep_user_role)
if getattr(window, "dep_user_id", None):
    _dep_context["user_id"] = str(window.dep_user_id)
if getattr(window, "dep_user_name", None):
    _dep_context["user_name"] = str(window.dep_user_name)
if getattr(window, "dep_user_email", None):
    _dep_context["user_email"] = str(window.dep_user_email)
if getattr(window, "dep_allowed_catalogs", None):
    _dep_context["allowed_catalogs"] = list(window.dep_allowed_catalogs)
if getattr(window, "dep_allowed_datasets", None):
    _dep_context["allowed_datasets"] = list(window.dep_allowed_datasets)

# Try to resolve credentials synchronously from .dep_session file (synced from main thread IndexedDB to Pyodide Worker FS)
for path in ["/drive/.dep_session", ".dep_session", "../.dep_session"]:
    try:
        import os
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                _session = json.loads(f.read())
                if _session.get("token"):
                    _dep_context["token"] = str(_session["token"])
                if _session.get("api_url"):
                    _dep_context["api_url"] = str(_session["api_url"])
                if _session.get("user_role"):
                    _dep_context["user_role"] = str(_session["user_role"])
                if _session.get("user_id"):
                    _dep_context["user_id"] = str(_session["user_id"])
                if _session.get("workspace_id"):
                    _dep_context["workspace_id"] = str(_session["workspace_id"])
                if _session.get("active_notebook"):
                    _dep_context["active_notebook"] = str(_session["active_notebook"])
                if _session.get("user_name"):
                    _dep_context["user_name"] = str(_session["user_name"])
                if _session.get("allowed_catalogs") is not None:
                    _dep_context["allowed_catalogs"] = list(_session["allowed_catalogs"])
            break
    except Exception:
        pass

# Try to resolve credentials synchronously from environment variables first (on host)
import os
if os.environ.get("DEP_ACCESS_TOKEN"):
    _dep_context["token"] = os.environ.get("DEP_ACCESS_TOKEN")
if os.environ.get("DEP_CONTROL_PLANE_URL"):
    _dep_context["api_url"] = os.environ.get("DEP_CONTROL_PLANE_URL")

def _handle_parent_message(event):
    try:
        data = event.data
        msg_type = getattr(data, "type", None)
        if msg_type == "DEP_AUTH_INJECT":
            if data.token:           _dep_context["token"]             = str(data.token)
            if data.apiUrl:          _dep_context["api_url"]           = str(data.apiUrl)
            if data.userRole:        _dep_context["user_role"]         = str(data.userRole)
            if data.userId:          _dep_context["user_id"]           = str(data.userId)
            if data.userName:        _dep_context["user_name"]         = str(data.userName)
            if data.userEmail:       _dep_context["user_email"]        = str(data.userEmail)
            if data.allowedCatalogs: _dep_context["allowed_catalogs"]  = list(data.allowedCatalogs)
            if data.allowedDatasets: _dep_context["allowed_datasets"]  = list(data.allowedDatasets)
            if getattr(data, "workspaceId", None):   _dep_context["workspace_id"]    = str(data.workspaceId)
            if getattr(data, "activeNotebook", None): _dep_context["active_notebook"] = str(data.activeNotebook)
        elif msg_type == "DEP_SESSION_REFRESH":
            # Lightweight session refresh — update whatever fields are provided
            if getattr(data, "token", None):          _dep_context["token"]           = str(data.token)
            if getattr(data, "apiUrl", None):         _dep_context["api_url"]         = str(data.apiUrl)
            if getattr(data, "userRole", None):       _dep_context["user_role"]       = str(data.userRole)
            if getattr(data, "userId", None):         _dep_context["user_id"]         = str(data.userId)
            if getattr(data, "userName", None):       _dep_context["user_name"]       = str(data.userName)
            if getattr(data, "allowedCatalogs", None): _dep_context["allowed_catalogs"] = list(data.allowedCatalogs)
            if getattr(data, "activeNotebook", None): _dep_context["active_notebook"] = str(data.activeNotebook)
        elif msg_type == "DEP_SESSION_UPDATE":
            # Targeted single-field updates (e.g. notebook switched)
            if getattr(data, "active_notebook", None): _dep_context["active_notebook"] = str(data.active_notebook)
            if getattr(data, "token", None):           _dep_context["token"]           = str(data.token)
    except Exception:
        pass

def _reload_session_from_disk():
    """Re-read .dep_session from the Pyodide drive FS and update _dep_context in-place."""
    for path in ["/drive/.dep_session", ".dep_session", "../.dep_session"]:
        try:
            import os as _os
            if _os.path.exists(path):
                with open(path, "r", encoding="utf-8") as _f:
                    _s = json.loads(_f.read())
                    if _s.get("token"):            _dep_context["token"]            = str(_s["token"])
                    if _s.get("api_url"):          _dep_context["api_url"]          = str(_s["api_url"])
                    if _s.get("user_role"):        _dep_context["user_role"]        = str(_s["user_role"])
                    if _s.get("user_id"):          _dep_context["user_id"]          = str(_s["user_id"])
                    if _s.get("user_name"):        _dep_context["user_name"]        = str(_s["user_name"])
                    if _s.get("workspace_id"):     _dep_context["workspace_id"]     = str(_s["workspace_id"])
                    if _s.get("active_notebook"):  _dep_context["active_notebook"]  = str(_s["active_notebook"])
                    if _s.get("allowed_catalogs") is not None:
                        _dep_context["allowed_catalogs"] = list(_s["allowed_catalogs"])
                return True
        except Exception:
            pass
    return False

_message_proxy = create_proxy(_handle_parent_message)
if hasattr(window, "addEventListener"):
    window.addEventListener("message", _message_proxy)

try:
    if hasattr(window, "parent") and window.parent is not None:
        window.parent.postMessage({"type": "DEP_KERNEL_READY"}, "*")
    elif hasattr(window, "postMessage"):
        window.postMessage({"type": "DEP_KERNEL_READY"})
except Exception:
    pass

# ── Background package installation ───────────────────────────────────────────
# Schedules micropip installs as a background asyncio task the moment dep_sdk
# is imported. By the time the user runs their first cell, packages are ready.
_DEP_REQUIRED_PACKAGES = [
    'pandas', 'numpy', 'matplotlib', 'scipy', 'seaborn',
    'plotly', 'requests', 'tabulate', 'tqdm', 'pytz',
    'python-dateutil', 'rich', 'openpyxl',
]

async def _dep_install_packages_async():
    try:
        import micropip as _mp
        await _mp.install(_DEP_REQUIRED_PACKAGES, keep_going=True)
    except Exception:
        pass
    # Also try Pyodide's native loader for compiled packages
    try:
        import pyodide_js as _pjs
        await _pjs.loadPackage([
            'numpy', 'pandas', 'matplotlib', 'scipy',
            'scikit-learn', 'statsmodels', 'Pillow',
            'openpyxl', 'pyarrow', 'lxml', 'regex',
        ])
    except Exception:
        pass

try:
    import asyncio as _aio
    _aio.ensure_future(_dep_install_packages_async())
except Exception:
    pass


def _ensure_package(pkg_name: str):
    """Synchronously ensure a package is available, installing via micropip if needed."""
    try:
        __import__(pkg_name.replace('-', '_'))
        return  # already available
    except ImportError:
        pass
    try:
        import micropip as _mp, asyncio as _aio
        _loop = _aio.get_event_loop()
        if _loop.is_running():
            import js
            js.eval(f"globalThis._depMicropipPromise = globalThis.pyodide.runPythonAsync('import micropip; await micropip.install([\'{pkg_name}\'])')")
        else:
            _loop.run_until_complete(_mp.install([pkg_name]))
    except Exception:
        pass

class _DEPClient:
    def _make_request(self, method: str, path: str, data: dict = None) -> dict:
        """Helper to make synchronous API requests to the DEP backend."""
        api_url = _dep_context.get("api_url") or "http://localhost:8000"
        token = _dep_context.get("token")
        
        if not token:
            raise PermissionError("[DEP] Authentication token not found. Please log in to the DEP Workbench.")
            
        import urllib.parse
        parts = [urllib.parse.quote(p) for p in path.split('/')]
        quoted_path = '/'.join(parts)
        url = f"{api_url.rstrip('/')}/{quoted_path.lstrip('/')}"
        
        try:
            from js import XMLHttpRequest
            import json
            
            xhr = XMLHttpRequest.new()
            xhr.open(method, url, False)
            xhr.setRequestHeader("Authorization", f"Bearer {token}")
            
            import os
            if os.environ.get("DEP_INTERNAL_CONTEXT") == "true":
                xhr.setRequestHeader("X-DEP-Internal-Context", "true")
                
            if data:
                xhr.setRequestHeader("Content-Type", "application/json")
                xhr.send(json.dumps(data))
            else:
                xhr.send()
                
            if xhr.status in (200, 201):
                try:
                    return json.loads(xhr.responseText)
                except Exception:
                    return {"text": xhr.responseText}
            elif xhr.status == 401:
                raise PermissionError("[DEP] Unauthorized: Active session token is invalid or expired.")
            elif xhr.status == 403:
                raise PermissionError(f"[DEP] Access Denied: You do not have permissions to access resource '{path}'.")
            elif xhr.status == 404:
                raise FileNotFoundError(f"[DEP] Resource not found: '{path}'")
            else:
                detail = ""
                try:
                    err_data = json.loads(xhr.responseText)
                    detail = err_data.get("detail", "")
                except Exception:
                    detail = xhr.responseText
                raise ConnectionError(f"[DEP] API request failed (HTTP {xhr.status}): {detail}")
        except ImportError:
            # Native Python fallback (on host)
            import urllib.request
            import urllib.error
            import json
            import os
            
            req = urllib.request.Request(url, method=method)
            req.add_header("Authorization", f"Bearer {token}")
            if os.environ.get("DEP_INTERNAL_CONTEXT") == "true":
                req.add_header("X-DEP-Internal-Context", "true")
            if os.environ.get("DEP_PRIVACY_MODE") == "true":
                req.add_header("X-DEP-Privacy-Mode", "true")
                
            if data:
                req.add_header("Content-Type", "application/json")
                json_data = json.dumps(data).encode("utf-8")
            else:
                json_data = None
                
            try:
                with urllib.request.urlopen(req, data=json_data) as response:
                    resp_bytes = response.read()
                    try:
                        return json.loads(resp_bytes.decode("utf-8"))
                    except Exception:
                        return {"text": resp_bytes.decode("utf-8")}
            except urllib.error.HTTPError as err:
                resp_bytes = err.read()
                detail = ""
                try:
                    err_data = json.loads(resp_bytes.decode("utf-8"))
                    detail = err_data.get("detail", "")
                except Exception:
                    detail = resp_bytes.decode("utf-8")
                
                if err.code == 401:
                    raise PermissionError("[DEP] Unauthorized: Active session token is invalid or expired.")
                elif err.code == 403:
                    raise PermissionError(f"[DEP] Access Denied: {detail or ('You do not have permissions to access ' + path)}")
                elif err.code == 404:
                    raise FileNotFoundError(f"[DEP] Resource not found: '{path}'")
                else:
                    raise ConnectionError(f"[DEP] API request failed (HTTP {err.code}): {detail}")

    def whoami(self):
        """Returns detailed information about the authenticated user."""
        pd = _dep_safe_import('pandas')
        user_info = self._make_request("GET", "/users/me")
        
        # Fetch their permitted datasets count
        try:
            datasets = self._make_request("GET", "/access/datasets/me")
            datasets_count = len(datasets)
        except Exception:
            datasets_count = 0
            
        summary = {
            "user_id": user_info.get("id"),
            "username": user_info.get("username"),
            "role": user_info.get("role", "").upper(),
            "full_name": user_info.get("full_name", "N/A"),
            "email": user_info.get("email", "N/A"),
            "accessible_datasets_count": datasets_count,
            "api_url": _dep_context.get("api_url"),
        }
        
        print("=" * 60)
        print("  DEP Workbench - User Profile Information")
        print("=" * 60)
        for key, value in summary.items():
            print(f"  {key.replace('_', ' ').title():25}: {value}")
        print("=" * 60)
        
        if pd is None:
            return summary
        return pd.DataFrame([summary])

    def auth_token(self):
        """Returns the current authentication token used for API calls."""
        token = _dep_context.get("token")
        if token:
            masked_token = token[:8] + "..." + token[-4:] if len(token) > 12 else "***"
            print(f"[DEP] Auth Token: {masked_token}")
            print(f"[DEP] Full token available via: dep._get_raw_token()")
            return token
        else:
            raise PermissionError("[DEP] No active session token found. Please log in.")
    
    def _get_raw_token(self):
        """Internal method to get the raw token (use with caution)."""
        return _dep_context.get("token")

    def list_catalogs(self):
        """Lists all catalogs/datasets accessible to the user."""
        pd = _dep_safe_import('pandas')
        datasets = self._make_request("GET", "/access/datasets/me")
        
        catalog_list = []
        for i, ds in enumerate(datasets):
            catalog_list.append({
                "id": i + 1,
                "name": ds.get("dataset_name"),
                "type": ds.get("source_type", "N/A"),
                "status": ds.get("status", "active"),
                "owner": ds.get("owner_username", "system"),
                "allowed_columns_count": len(ds.get("allowed_columns", [])),
            })
            
        df = pd.DataFrame(catalog_list)
        print(f"[DEP] Found {len(df)} accessible catalogs")
        return df
    
    def list_datasets(self):
        """Lists all datasets the user has access to (alias for list_catalogs)."""
        return self.list_catalogs()
    
    def get_dataset_metadata(self, dataset_name: str):
        """Returns detailed metadata and data dictionary for a specific dataset."""
        pd = _dep_safe_import('pandas')
        meta = self._make_request("GET", f"/catalog/{dataset_name}")
        
        schema_fields = meta.get("schema_fields", [])
        columns_df = pd.DataFrame(schema_fields)
        
        metadata = {
            "dataset_name": meta.get("name"),
            "source_type": meta.get("source_type"),
            "status": meta.get("status"),
            "owner": meta.get("owner_username"),
            "columns": [f.get("column_name") for f in schema_fields],
            "columns_df": columns_df,
        }
        
        print(f"[DEP] Metadata retrieved for: {dataset_name}")
        return metadata
    
    def get_dataset_columns(self, dataset_name: str):
        """Returns the list of columns (keys) accessible for a specific dataset."""
        pd = _dep_safe_import('pandas')
        meta = self._make_request("GET", f"/catalog/{dataset_name}")
        schema_fields = meta.get("schema_fields", [])
        return pd.DataFrame(schema_fields)
    
    def save_artifact(self, name: str, content, artifact_type: str = "json", tags: list = None, description: str = None, workspace: str = None, notebook: str = None):
        """Saves an artifact locally and uploads it to the DEP backend private output store."""
        pd = _dep_safe_import('pandas')
        import json
        
        artifact_type = artifact_type.lower()
        supported_types = ["json", "csv", "html", "md", "txt", "yaml", "xml", "png", "pdf", "jpg", "jpeg"]
        if artifact_type not in supported_types:
            raise ValueError(f"Unsupported artifact type: {artifact_type}. Supported: {supported_types}")
            
        is_binary = artifact_type in ["png", "pdf", "jpg", "jpeg"]
        
        # Convert content based on type
        if is_binary:
            if isinstance(content, bytes) or isinstance(content, bytearray):
                binary_content = content
            elif isinstance(content, str):
                import base64
                try:
                    binary_content = base64.b64decode(content)
                except Exception:
                    binary_content = content.encode('utf-8')
            else:
                binary_content = bytes(content)
        else:
            if artifact_type == "json":
                if isinstance(content, pd.DataFrame):
                    content_str = content.to_json(orient="records", indent=2)
                elif isinstance(content, dict):
                    content_str = json.dumps(content, indent=2)
                else:
                    content_str = str(content)
            elif artifact_type == "csv":
                if isinstance(content, pd.DataFrame):
                    content_str = content.to_csv(index=False)
                else:
                    content_str = str(content)
            else:
                content_str = str(content)
            
        local_filename = f"{name}.{artifact_type}"
        try:
            if is_binary:
                with open(local_filename, "wb") as f:
                    f.write(binary_content)
            else:
                with open(local_filename, "w", encoding="utf-8") as f:
                    f.write(content_str)
            print(f"[DEP] ✓ Saved local file: {local_filename}")
        except Exception as e:
            print(f"[DEP] Warning: Could not save local file ({e})")
            
        # Resolve tags, workspace, and notebook
        resolved_tags = ""
        if tags:
            resolved_tags = ",".join(tags) if isinstance(tags, list) else str(tags)
            
        resolved_workspace = workspace or _dep_context.get("workspace_id") or "user_sandbox"
        resolved_notebook = notebook or _dep_context.get("active_notebook") or "Notebook"

        token = _dep_context.get("token")
        api_url = _dep_context.get("api_url")
        if token and api_url:
            try:
                try:
                    from js import XMLHttpRequest, FormData, Blob
                    
                    xhr = XMLHttpRequest.new()
                    url = f"{api_url.rstrip('/')}/outputs"
                    xhr.open("POST", url, False)
                    xhr.setRequestHeader("Authorization", f"Bearer {token}")
                    
                    form_data = FormData.new()
                    if is_binary:
                        from js import Uint8Array
                        js_bytes = Uint8Array.new(binary_content)
                        mimetype = f"image/{artifact_type}" if artifact_type in ["png", "jpg", "jpeg"] else "application/pdf"
                        blob = Blob.new([js_bytes], {"type": mimetype})
                    else:
                        blob = Blob.new([content_str], {"type": f"text/{artifact_type}"})
                    form_data.append("file", blob, local_filename)
                    
                    if resolved_tags:
                        form_data.append("tags", resolved_tags)
                    if resolved_workspace:
                        form_data.append("workspace", resolved_workspace)
                    if resolved_notebook:
                        form_data.append("notebook", resolved_notebook)
                    
                    xhr.send(form_data)
                    if xhr.status == 201:
                        resp = json.loads(xhr.responseText)
                        print(f"[DEP] ✓ Uploaded artifact successfully to backend output store (ID: {resp.get('id')})")
                        return resp
                    else:
                        print(f"[DEP] Backend upload failed (HTTP {xhr.status}): {xhr.responseText}")
                except ImportError:
                    # Native python upload using urllib.request
                    import urllib.request
                    import uuid
                    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
                    headers = {
                        "Authorization": f"Bearer {token}",
                        "Content-Type": f"multipart/form-data; boundary={boundary}"
                    }
                    body = []
                    # Construct multipart body for file, tags, workspace, notebook
                    body.append(f"--{boundary}".encode("utf-8"))
                    body.append(f'Content-Disposition: form-data; name="file"; filename="{local_filename}"'.encode("utf-8"))
                    mimetype = f"image/{artifact_type}" if artifact_type in ["png", "jpg", "jpeg"] else "application/octet-stream"
                    body.append(f"Content-Type: {mimetype}".encode("utf-8"))
                    body.append(b"")
                    if is_binary:
                        body.append(binary_content)
                    else:
                        body.append(content_str.encode("utf-8"))
                    
                    if resolved_tags:
                        body.append(f"--{boundary}".encode("utf-8"))
                        body.append(f'Content-Disposition: form-data; name="tags"'.encode("utf-8"))
                        body.append(b"")
                        body.append(resolved_tags.encode("utf-8"))
                    if resolved_workspace:
                        body.append(f"--{boundary}".encode("utf-8"))
                        body.append(f'Content-Disposition: form-data; name="workspace"'.encode("utf-8"))
                        body.append(b"")
                        body.append(resolved_workspace.encode("utf-8"))
                    if resolved_notebook:
                        body.append(f"--{boundary}".encode("utf-8"))
                        body.append(f'Content-Disposition: form-data; name="notebook"'.encode("utf-8"))
                        body.append(b"")
                        body.append(resolved_notebook.encode("utf-8"))
                        
                    body.append(f"--{boundary}--".encode("utf-8"))
                    body.append(b"")
                    payload_data = b"\r\n".join(body)
                    
                    url = f"{api_url.rstrip('/')}/outputs"
                    req = urllib.request.Request(url, data=payload_data, headers=headers, method="POST")
                    with urllib.request.urlopen(req) as response:
                        import json
                        resp = json.loads(response.read().decode("utf-8"))
                        print(f"[DEP] ✓ Uploaded artifact successfully to backend output store (ID: {resp.get('id')})")
                        return resp
            except Exception as e:
                print(f"[DEP] Backend upload error: {e}")
        else:
            print(f"[DEP] Authentication credentials missing. Backend upload skipped.")
            
        return {"filename": local_filename, "status": "saved_locally"}
    
    def list_artifacts(self):
        """Lists all caller's saved outputs on the backend."""
        pd = _dep_safe_import('pandas')
        res = self._make_request("GET", "/outputs")
        artifacts = []
        for item in res:
            artifacts.append({
                "id": item.get("id"),
                "filename": item.get("filename"),
                "content_type": item.get("content_type"),
                "size_bytes": item.get("size_bytes"),
                "created_at": item.get("created_at"),
                "share_count": item.get("share_count", 0),
            })
        return pd.DataFrame(artifacts)
    
    def get_artifact(self, id: int):
        """Retrieves and downloads a saved output by ID."""
        res = self._make_request("GET", f"/outputs/{id}/download")
        return res
    
    def delete_artifact(self, id: int):
        """Deletes a saved output by ID."""
        self._make_request("DELETE", f"/outputs/{id}")
        print(f"[DEP] ✓ Deleted artifact {id}")
        return True
    
    def search_artifacts(self, query: str):
        """Searches caller's saved artifacts by query string matching filename."""
        pd = _dep_safe_import('pandas')
        df = self.list_artifacts()
        if len(df) == 0:
            return df
        return df[df["filename"].str.contains(query, case=False, na=False)]

    def get_catalog(self, name: str):
        """Loads a governed dataset from the backend as a pandas DataFrame."""
        pd = _dep_safe_import('pandas')
        res = self._make_request("GET", f"/access/{name}")
        rows = res.get("rows", [])
        print(f"[DEP] Governed load successful: Loaded '{name}' ({len(rows)} rows)")
        return pd.DataFrame(rows)

    def read_catalog(self, name: str):
        """Alias for get_catalog."""
        return self.get_catalog(name)

    def read_csv(self, path: str):
        """Reads any CSV file from the JupyterLite virtual filesystem."""
        pd = _dep_safe_import('pandas')
        try:
            df = pd.read_csv(path)
            print(f"[DEP] Loaded local CSV: {path} ({len(df)} rows)")
            return df
        except FileNotFoundError:
            raise FileNotFoundError(
                f"File '{path}' not found in the JupyterLite virtual filesystem."
            )

    def run_query(self, sql: str):
        """Executes a SQL query against the backend."""
        raise NotImplementedError("[DEP] Direct SQL queries are disabled. Please use dep.get_catalog(name) to access governed tables.")
    
    def query(self, query_string: str):
        """
        Executes a column-level sub-resource query or standard SQL.
        If format is 'dataset/column', returns that specific column as a pandas Series.
        """
        pd = _dep_safe_import('pandas')
        if "/" in query_string:
            parts = query_string.split("/", 1)
            dataset_name, col_name = parts[0], parts[1]
            df = self.get_catalog(dataset_name)
            if col_name in df.columns:
                print(f"[DEP] Extracted column '{col_name}' from governed dataset '{dataset_name}'")
                return df[col_name]
            else:
                raise KeyError(f"Column '{col_name}' not found or not permitted in dataset '{dataset_name}'")
        else:
            return self.run_query(query_string)
            
    def get_data_sample(self, dataset_name: str, n: int = 5):
        """Returns a sample of n rows from the dataset."""
        df = self.get_catalog(dataset_name)
        print(f"[DEP] Sample of {n} rows from '{dataset_name}'")
        return df.head(n)
    
    def get_data_stats(self, dataset_name: str):
        """Returns statistical summary of the dataset."""
        pd = _dep_safe_import('pandas')
        df = self.get_catalog(dataset_name)
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if numeric_cols:
            stats = df[numeric_cols].describe()
            print(f"[DEP] Statistical summary for '{dataset_name}'")
            return stats
        else:
            print(f"[DEP] No numeric columns found in '{dataset_name}'")
            return pd.DataFrame()
    
    def export_to_format(self, df, format_type: str, filename: str = None):
        """Exports a DataFrame to various formats (csv, json, html)."""
        format_type = format_type.lower()
        if filename is None:
            filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format_type}"
        
        if format_type == "csv":
            df.to_csv(filename, index=False)
        elif format_type == "json":
            df.to_json(filename, orient="records", indent=2)
        elif format_type == "html":
            df.to_html(filename, index=False)
        else:
            raise ValueError(f"Unsupported format: {format_type}. Use: csv, json, html")
        print(f"[DEP] ✓ Exported to {filename}")
        return filename


class DEP(_DEPClient):
    pass

dep = _DEPClient()

# Create dep_sdk module for import compatibility
dep_sdk_module = types.ModuleType('dep_sdk')
for attr_name in dir(dep):
    if not attr_name.startswith('_'):
        setattr(dep_sdk_module, attr_name, getattr(dep, attr_name))
setattr(dep_sdk_module, 'DEP', DEP)
sys.modules['dep_sdk'] = dep_sdk_module
# Expose reload helper on the module so users can call dep_sdk.reload_session()
dep_sdk_module.reload_session = _reload_session_from_disk

# ── Inject names into builtins and user namespace for absolute resilience ──
try:
    import builtins
    builtins.dep_sdk = dep_sdk_module
    builtins.dep = dep_sdk_module
    
    # Try injecting into IPython user_ns if running in IPython
    try:
        from IPython import get_ipython
        _ip = get_ipython()
        if _ip:
            _ip.user_ns["dep_sdk"] = dep_sdk_module
            _ip.user_ns["dep"] = dep_sdk_module
    except Exception:
        pass
except Exception:
    pass

