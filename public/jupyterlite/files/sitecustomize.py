# ── sitecustomize.py: Startup script for Pyodide/JupyterLite ──
try:
    import sys
    # Add /drive/ to path if not present
    if "/drive" not in sys.path:
        sys.path.insert(0, "/drive")

    # Pre-import dep_sdk
    import dep_sdk
    sys.modules["dep_sdk"] = dep_sdk
    
    # Inject into builtins so dep_sdk and dep are always defined globally
    import builtins
    builtins.dep_sdk = dep_sdk
    builtins.dep = dep_sdk
except Exception:
    pass
