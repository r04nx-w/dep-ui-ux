"""
DEP Workbench - Kernel Startup Script & SDK
Auto-run when the JupyterLite Python kernel starts (via dep-theme.js injection).
"""
import sys
import asyncio

# ── Auto-install missing scientific packages ─────────────────────────────────
async def _install_packages():
    try:
        import micropip  # type: ignore
        pkgs_to_install = []

        # Check which packages are missing
        for pkg in ['pandas', 'numpy', 'matplotlib', 'scipy', 'seaborn', 'scikit-learn']:
            try:
                __import__(pkg.replace('-', '_'))
            except ImportError:
                pkgs_to_install.append(pkg)

        if pkgs_to_install:
            print(f"[DEP] Installing scientific packages: {', '.join(pkgs_to_install)}...")
            await micropip.install(pkgs_to_install)
            print(f"[DEP] ✓ Packages installed and ready.")
    except Exception as e:
        print(f"[DEP] Note: Could not auto-install packages ({e}). Use %pip install <pkg> manually.")

try:
    asyncio.ensure_future(_install_packages())
except Exception:
    pass

# ── Auth context ─────────────────────────────────────────────────────────────
try:
    from js import window  # type: ignore
except ImportError:
    import js
    if hasattr(js, "self"):
        window = js.self
    else:
        window = js.globalThis

from pyodide.ffi import create_proxy  # type: ignore

_dep_context = {
    "token": None,
    "api_url": "http://localhost:8000",
    "user_role": "analyst",
    "user_id": None,
    "allowed_catalogs": [],
}

# Pull from window globals set by dep-theme.js
if getattr(window, "dep_auth_token", None):
    _dep_context["token"] = str(window.dep_auth_token)
if getattr(window, "dep_user_role", None):
    _dep_context["user_role"] = str(window.dep_user_role)
if getattr(window, "dep_user_id", None):
    _dep_context["user_id"] = str(window.dep_user_id)
if getattr(window, "dep_allowed_catalogs", None):
    _dep_context["allowed_catalogs"] = list(window.dep_allowed_catalogs)

# Live auth update listener
def _handle_parent_message(event):
    try:
        data = event.data
        if getattr(data, "type", None) == "DEP_AUTH_INJECT":
            if data.token:           _dep_context["token"]             = str(data.token)
            if data.apiUrl:          _dep_context["api_url"]           = str(data.apiUrl)
            if data.userRole:        _dep_context["user_role"]         = str(data.userRole)
            if data.userId:          _dep_context["user_id"]           = str(data.userId)
            if data.allowedCatalogs: _dep_context["allowed_catalogs"]  = list(data.allowedCatalogs)
    except Exception:
        pass

_message_proxy = create_proxy(_handle_parent_message)
if hasattr(window, "addEventListener"):
    window.addEventListener("message", _message_proxy)

# Notify parent
try:
    if hasattr(window, "parent") and window.parent is not None:
        window.parent.postMessage({"type": "DEP_KERNEL_READY"}, "*")
    elif hasattr(window, "postMessage"):
        window.postMessage({"type": "DEP_KERNEL_READY"})
except Exception:
    pass

# ── DEP SDK ──────────────────────────────────────────────────────────────────
# Make `dep_sdk` importable (since dep_sdk.py is in the JupyterLite files root)
import sys as _sys, os as _os
_files_root = "/drive/usr/share/jupyter/lab/static"
for _p in ["/", "/drive", "/files"]:
    if _p not in _sys.path:
        _sys.path.insert(0, _p)

# Also create a thin `dep` object for convenience
class _DEPClient:
    def whoami(self):
        role  = _dep_context["user_role"].upper()
        auth  = "✓ authenticated" if _dep_context["token"] else "⚠ demo mode"
        cats  = ", ".join(_dep_context["allowed_catalogs"]) or "all catalogs"
        print(f"DEP Workbench | Role: {role} | {auth}")
        print(f"Accessible catalogs: {cats}")

    def list_catalogs(self):
        import pandas as pd
        names = _dep_context["allowed_catalogs"] or [
            "customer_profiles",
            "revenue_forecasting_db",
            "product_inventory",
            "sales_transactions",
        ]
        types = ["mock", "mock", "mock", "csv"]
        return pd.DataFrame({"name": names, "type": types, "access": ["READ"] * len(names)})

    def get_catalog(self, name: str):
        import pandas as pd
        import json
        
        # 1. Access validation check
        allowed = _dep_context.get("allowed_catalogs")
        if allowed and name not in allowed:
            raise PermissionError(f"Access denied: '{name}' not in {allowed}")
            
        # 2. Try fetching from live backend via sync XMLHttpRequest
        api_url = _dep_context.get("api_url")
        token = _dep_context.get("token")
        if api_url and token:
            try:
                from js import XMLHttpRequest
                xhr = XMLHttpRequest.new()
                url = f"{api_url.rstrip('/')}/access/{name}"
                xhr.open("GET", url, False)  # Synchronous request
                xhr.setRequestHeader("Authorization", f"Bearer {token}")
                xhr.send()
                if xhr.status == 200:
                    resp_data = json.loads(xhr.responseText)
                    rows = resp_data.get("rows", [])
                    print(f"[DEP] Governed load from API: {name} ({len(rows)} rows)")
                    return pd.DataFrame(rows)
                else:
                    print(f"[DEP] API request failed (HTTP {xhr.status}). Falling back to local offline mock.")
            except Exception as e:
                print(f"[DEP] API connection error ({e}). Falling back to local offline mock.")
        else:
            print(f"[DEP] No active session token found. Using local offline mock.")

        # 3. Fallback to offline mock data
        print(f"[DEP] Loading local mock dataset: {name}")
        if name == "customer_profiles":
            return pd.DataFrame({
                "customer_id":       [1092, 1488, 2023, 1105, 3049],
                "segment":           ["Active","Churned","Active","New/Engaged","Dormant"],
                "recency_days":      [12, 180, 4, 8, 94],
                "frequency":         [24, 2, 48, 5, 8],
                "transaction_value": [145.20, 38.50, 210.00, 98.33, 55.80],
            })
        if name == "revenue_forecasting_db":
            return pd.DataFrame({
                "month":            ["2024-01","2024-02","2024-03","2024-04","2024-05"],
                "revenue":          [124500, 138200, 151800, 143200, 168900],
                "forecast":         [125000, 137000, 150000, 145000, 165000],
                "confidence_lower": [120000, 130000, 142000, 135000, 155000],
                "confidence_upper": [130000, 144000, 158000, 155000, 175000],
            })
        if name == "product_inventory":
            return pd.DataFrame({
                "sku":     ["SKU-001","SKU-002","SKU-003","SKU-004"],
                "product": ["Laptop Pro","Wireless Mouse","USB Hub","Monitor 27\""],
                "stock":   [42, 215, 88, 17],
                "price":   [1299.99, 29.99, 49.99, 599.99],
            })
        if name == "sales_transactions":
            # Try reading the real CSV from the JupyterLite virtual filesystem
            import io
            csv_paths = [
                "/files/sales_transactions.csv",
                "./sales_transactions.csv",
                "sales_transactions.csv",
            ]
            for csv_path in csv_paths:
                try:
                    import os
                    if os.path.exists(csv_path):
                        df = pd.read_csv(csv_path)
                        print(f"[DEP] ✓ Loaded CSV from filesystem: {csv_path} ({len(df)} rows)")
                        return df
                except Exception:
                    pass
            # Fallback: fetch via XHR from the static server
            try:
                from js import XMLHttpRequest as _XHR
                _xhr = _XHR.new()
                _base = _dep_context.get("api_url", "http://localhost:3000").replace(":8000", ":3000")
                _url = f"{_base}/jupyterlite/files/sales_transactions.csv"
                _xhr.open("GET", _url, False)
                _xhr.send()
                if _xhr.status == 200:
                    df = pd.read_csv(io.StringIO(_xhr.responseText))
                    print(f"[DEP] ✓ Loaded CSV from static server ({len(df)} rows)")
                    return df
            except Exception as _e:
                print(f"[DEP] XHR fetch failed ({_e}). Using inline sample.")
            # Final inline fallback (first 5 rows)
            print("[DEP] Using inline sales_transactions sample (30 rows).")
            import io as _io
            _inline_csv = """transaction_id,date,customer_id,customer_name,region,product_category,product_name,quantity,unit_price,discount_pct,revenue,cost,profit,channel,payment_method,status
TXN-10001,2024-01-03,C-1092,Alice Chambers,North America,Electronics,Laptop Pro 15,1,1299.99,5.0,1234.99,780.00,454.99,Online,Credit Card,Completed
TXN-10002,2024-01-05,C-1488,Bob Nguyen,Europe,Accessories,Wireless Mouse,3,29.99,0.0,89.97,30.00,59.97,In-Store,Cash,Completed
TXN-10003,2024-01-07,C-2023,Carol Smith,Asia Pacific,Peripherals,USB Hub 7-Port,2,49.99,10.0,89.98,35.00,54.98,Online,PayPal,Completed
TXN-10004,2024-01-09,C-1105,David Lee,North America,Displays,Monitor 27" 4K,1,599.99,0.0,599.99,320.00,279.99,Online,Credit Card,Completed
TXN-10005,2024-01-12,C-3049,Eva Martinez,Latin America,Electronics,Laptop Air 13,1,999.99,8.0,919.99,570.00,349.99,Online,Debit Card,Completed"""
            return pd.read_csv(_io.StringIO(_inline_csv))
        return pd.DataFrame({"error": [f"Catalog '{name}' not found in offline demo mode"]})

    def read_csv(self, path: str):
        """Read any CSV file from the JupyterLite virtual filesystem."""
        import pandas as pd
        try:
            df = pd.read_csv(path)
            print(f"[DEP] ✓ CSV loaded: {path} ({len(df)} rows × {len(df.columns)} cols)")
            return df
        except FileNotFoundError:
            raise FileNotFoundError(
                f"File '{path}' not found. Upload it via the JupyterLite file browser sidebar."
            )

    def run_query(self, sql: str):
        import pandas as pd
        print("[DEP] run_query() requires a live backend. Use dep.get_catalog() for offline demo.")
        return pd.DataFrame({"message": ["Connect to DEP backend for SQL queries"]})

dep = _DEPClient()

# ── Banner ────────────────────────────────────────────────────────────────────
_role = _dep_context["user_role"].upper()
_cats = ", ".join(_dep_context["allowed_catalogs"]) or "all catalogs"
print("=" * 56)
print("  DEP Workbench — Python Kernel Ready")
print("=" * 56)
print(f"  Role: {_role}  |  Catalogs: {_cats}")
print()
print("  dep.whoami()              → show session info")
print("  dep.list_catalogs()       → list accessible datasets")
print("  dep.get_catalog(name)     → load catalog as DataFrame")
print("  dep.read_csv('path.csv')  → load any CSV from workspace")
print()
print("  Built-in catalogs: customer_profiles, revenue_forecasting_db,")
print("                     product_inventory, sales_transactions (CSV)")
print()
print("  import dep_sdk as dep     → (alternative import)")
print("  %pip install <pkg>        → install any PyPI package")
print("=" * 56)
