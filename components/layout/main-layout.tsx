'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { Sidebar } from './sidebar'
import { TopBar } from './topbar'
import { Dashboard } from '@/components/screens/dashboard'
import { DataSourcesHub } from '@/components/screens/data-sources-hub'
import { ResourceCatalogBuilder } from '@/components/screens/resource-catalog-builder'
import { ACLBuilder } from '@/components/screens/acl-builder'
import { CatalogExplorer } from '@/components/screens/catalog-explorer'
import { MyDataAccess } from '@/components/screens/my-data-access'
import { ProjectWorkspaces } from '@/components/screens/project-workspaces'
import { SavedArtifacts } from '@/components/screens/saved-artifacts'
import { UserDirectory } from '@/components/screens/user-directory'
import { AuditTrails } from '@/components/screens/audit-trails'
import { AccountSettings } from '@/components/screens/account-settings'
import { JupyterLabWorkspace } from '@/components/screens/jupyter-workspace'
import { Tutorials } from '@/components/screens/tutorials'
import { Maximize2, Minimize2, CloudUpload, CloudDownload } from 'lucide-react'
import { OnboardingTour } from '@/components/ui/onboarding-tour'

// ---------------------------------------------------------------------------
// Helpers: build JupyterLite CSS dynamically from live CSS custom properties.
// AccountSettings writes these vars to document.documentElement on every
// change, so we always read the current values at injection time.
// ---------------------------------------------------------------------------

/** Convert a hex colour + alpha → rgba() string safe for CSS. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,122,204,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Build the <style> block to inject into the JupyterLite iframe.
 * Reads LIVE CSS variables from document.documentElement so it always
 * reflects the user's current theme + accent colour selection.
 */
function buildJupyterCSS(): string {
  const s = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement)
    : null
  const get = (v: string, fallback: string) =>
    s ? (s.getPropertyValue(v).trim() || fallback) : fallback

  const bg0     = get('--bg-primary',       '#181818')
  const bg1     = get('--bg-sidebar',       '#1e1e1e')
  const bg2     = get('--bg-card',          '#1e1e1e')
  const bg3     = get('--bg-input',         '#2d2d2d')
  const bg4     = get('--bg-hover',         '#37373d')
  const border  = get('--border-color',     '#2b2b2b')
  const accent  = get('--primary',          '#007acc')
  const font    = get('--font-sans-custom', 'Inter')

  const a15 = hexToRgba(accent, 0.15)
  const a30 = hexToRgba(accent, 0.30)

  return `
  :root, body {
    --jp-layout-color0: ${bg0} !important;
    --jp-layout-color1: ${bg1} !important;
    --jp-layout-color2: ${bg2} !important;
    --jp-layout-color3: ${bg3} !important;
    --jp-layout-color4: ${bg4} !important;
    --jp-border-color0: ${border} !important;
    --jp-border-color1: ${border} !important;
    --jp-border-color2: ${border} !important;
    --jp-brand-color0: ${accent} !important;
    --jp-brand-color1: ${accent} !important;
    --jp-brand-color2: ${a30} !important;
    --jp-brand-color3: ${a15} !important;
    --jp-accent-color1: ${accent} !important;
    --jp-ui-font-family: '${font}', 'Inter', 'Segoe UI', system-ui, sans-serif !important;
    --jp-ui-font-size1: 13px !important;
    --jp-code-font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace !important;
    --jp-code-font-size: 13px !important;
    --jp-code-line-height: 1.6 !important;
    --jp-cell-prompt-not-active-font-color: #454545 !important;
    --jp-cell-inprompt-font-color: ${accent} !important;
    --jp-cell-outprompt-font-color: #6a9955 !important;
    --jp-editor-selected-background: ${a15} !important;
    --jp-mirror-editor-keyword-color: #569cd6 !important;
    --jp-mirror-editor-string-color: #ce9178 !important;
    --jp-mirror-editor-comment-color: #6a737d !important;
    --jp-mirror-editor-number-color: #b5cea8 !important;
    --jp-mirror-editor-def-color: #dcdcaa !important;
    --jp-mirror-editor-punctuation-color: #888888 !important;
    --jp-mirror-editor-property-color: #9cdcfe !important;
    --jp-mirror-editor-operator-color: #d4d4d4 !important;
    --jp-mirror-editor-atom-color: #569cd6 !important;
    --jp-mirror-editor-meta-color: ${accent} !important;
    --jp-mirror-editor-builtin-color: #4ec9b0 !important;
    --jp-toolbar-background: ${bg1} !important;
    --jp-menubar-background: ${bg0} !important;
    --jp-sidebar-background: ${bg0} !important;
    --jp-input-background: ${bg2} !important;
    --jp-input-border-color: ${border} !important;
    --jp-input-active-box-shadow-color: ${a30} !important;
    --jp-dialog-background: rgba(0,0,0,0.7) !important;
  }
  .jp-Cell { border-radius: 4px !important; }
  .jp-Cell.jp-mod-active .jp-InputArea  { border-left: 2px solid ${accent} !important; }
  .jp-Cell.jp-mod-selected .jp-InputArea { border-left: 2px solid ${accent} !important; background: ${a15} !important; }
  .jp-ToolbarButtonComponent:hover,
  .jp-Button.jp-mod-styled.jp-mod-accept { background: ${accent} !important; }
  a { color: ${accent} !important; }
  #jp-MainLogo { display: none !important; }
  .jp-MenuBar-menu .p-Menu { background: ${bg1} !important; border: 1px solid ${border} !important; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${bg0}; }
  ::-webkit-scrollbar-thumb { background: ${bg3}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${bg4}; }
`
}

interface MainLayoutProps {
  userRole: 'admin' | 'onboarder' | 'analyst'
  username?: string
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

const getPageTitle = (page: string): string => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    connections: 'Data Connections',
    catalog: 'Resource Catalog',
    acl: 'Governance & ACL Builder',
    explorer: 'Catalog Explorer',
    access: 'My Data Access',
    workspaces: 'Project Workspaces',
    artifacts: 'Saved Artifacts',
    users: 'User Directory',
    audit: 'Audit Trails',
    settings: 'Account Settings',
    tutorials: 'Tutorials & Guided Onboarding',
  }
  return titles[page] || 'Dashboard'
}

const renderPage = (page: string, userRole: 'admin' | 'onboarder' | 'analyst', onLaunchWorkspace: (workspaceName: string) => void) => {
  switch (page) {
    case 'connections': return <DataSourcesHub userRole={userRole} />
    case 'catalog': return <ResourceCatalogBuilder />
    case 'acl': return <ACLBuilder />
    case 'explorer': return <CatalogExplorer />
    case 'access': return <MyDataAccess />
    case 'workspaces': return <ProjectWorkspaces onLaunchWorkspace={onLaunchWorkspace} />
    case 'artifacts': return <SavedArtifacts />
    case 'users': return <UserDirectory />
    case 'audit': return <AuditTrails />
    case 'settings': return <AccountSettings />
    case 'tutorials': return <Tutorials />
    default: return <Dashboard userRole={userRole} />
  }
}

// Determine whether the self-hosted JupyterLite is available
const SELF_HOSTED_URL = '/jupyterlite/lab/index.html?path=DEP_Analysis_Starter.ipynb'
const CDN_FALLBACK_URL = 'https://jupyterlite.github.io/demo/lab/index.html?theme=JupyterLab%20Dark'

export function MainLayout({ userRole, username, currentPage, onNavigate, onLogout }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const [activeJupyterWorkspace, setActiveJupyterWorkspace] = useState<'embedded' | 'generic' | 'custom_lite' | null>(null)
  const [workspaceScope, setWorkspaceScope] = useState<string>('user_sandbox')
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [jupyterLiteStatus, setJupyterLiteStatus] = useState<'loading' | 'ready' | 'kernel_ready'>('loading')
  const [jupyterSrc, setJupyterSrc] = useState(SELF_HOSTED_URL)

  useEffect(() => {
    if (username) {
      setWorkspaceScope(`user_${username.toLowerCase()}_sandbox`)
    }
  }, [username])
  const jupyterIframeRef = useRef<HTMLIFrameElement>(null)
  const [tourActive, setTourActive] = useState(false)
  const [activeTour, setActiveTour] = useState<string>('overview')

  useEffect(() => {
    const handleStartTour = (e: Event) => {
      const tourName = (e as CustomEvent).detail
      setActiveTour(tourName)
      setTourActive(true)
    }
    window.addEventListener('dep_start_tour', handleStartTour)
    return () => window.removeEventListener('dep_start_tour', handleStartTour)
  }, [])

  useEffect(() => {
    if (username) {
      const completed = localStorage.getItem(`dep_onboarding_completed_${username}`)
      if (!completed) {
        const timer = setTimeout(() => {
          setActiveTour('overview')
          setTourActive(true)
        }, 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [username])

  const handleMouseDown = () => setIsResizing(true)
  const handleMouseUp = () => setIsResizing(false)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isResizing) return
    const newWidth = e.clientX
    if (newWidth >= 200 && newWidth <= 400) setSidebarWidth(newWidth)
  }
  const [isSyncing, setIsSyncing] = useState(false)

  // ── Native IndexedDB Backup & Restore ─────────────────────────────────────────
  const readAllFromIndexedDB = (dbName: string, storeName: string): Promise<Record<string, any>> => {
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName)
      request.onerror = () => resolve({})
      request.onsuccess = (e: any) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(storeName)) {
          db.close()
          resolve({})
          return
        }
        try {
          const transaction = db.transaction(storeName, 'readonly')
          const store = transaction.objectStore(storeName)
          const allData: Record<string, any> = {}
          const cursorRequest = store.openCursor()
          cursorRequest.onsuccess = (evt: any) => {
            const cursor = evt.target.result
            if (cursor) {
              allData[cursor.key] = cursor.value
              cursor.continue()
            } else {
              db.close()
              resolve(allData)
            }
          }
          cursorRequest.onerror = () => {
            db.close()
            resolve({})
          }
        } catch {
          db.close()
          resolve({})
        }
      }
    })
  }

  const writeAllToIndexedDB = (dbName: string, storeName: string, data: Record<string, any>): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName)
      request.onerror = () => reject(request.error)
      request.onsuccess = (e: any) => {
        const db = e.target.result
        const currentVersion = db.version
        
        if (!db.objectStoreNames.contains(storeName)) {
          db.close()
          const upgradeRequest = indexedDB.open(dbName, currentVersion + 1)
          upgradeRequest.onupgradeneeded = (evt: any) => {
            const upgradeDb = evt.target.result
            upgradeDb.createObjectStore(storeName)
          }
          upgradeRequest.onsuccess = (evt: any) => {
            const upgradeDb = evt.target.result
            performWrite(upgradeDb)
          }
          upgradeRequest.onerror = () => reject(upgradeRequest.error)
        } else {
          performWrite(db)
        }

        function performWrite(activeDb: any) {
          try {
            const transaction = activeDb.transaction(storeName, 'readwrite')
            const store = transaction.objectStore(storeName)
            store.clear()
            for (const [key, value] of Object.entries(data)) {
              store.put(value, key)
            }
            transaction.oncomplete = () => {
              activeDb.close()
              resolve()
            }
            transaction.onerror = () => {
              activeDb.close()
              reject(transaction.error)
            }
          } catch (err) {
            activeDb.close()
            reject(err)
          }
        }
      }
    })
  }

  // Auto-backup workspace files to server in background
  useEffect(() => {
    if (activeJupyterWorkspace !== 'custom_lite' || !showWorkspace || !workspaceScope) return

    const backupWorkspace = async () => {
      try {
        // JupyterLite uses 'files' store in contents database
        const dbName = `JupyterLite Storage - ${workspaceScope}`
        const storeName = 'files'
        const files = await readAllFromIndexedDB(dbName, storeName)
        if (Object.keys(files).length === 0) return

        await apiFetch('/workspaces/sync', {
          method: 'POST',
          body: JSON.stringify({
            workspace_id: workspaceScope,
            files
          })
        })
        console.log(`[DEP Sync] Backed up ${Object.keys(files).length} files from "${dbName}"`)
      } catch (e) {
        console.warn('[DEP Sync] Failed to auto-backup workspace:', e)
      }
    }

    const interval = setInterval(backupWorkspace, 10000)
    
    const handleBeforeUnload = () => {
      backupWorkspace()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      backupWorkspace()
    }
  }, [activeJupyterWorkspace, showWorkspace, workspaceScope])

  const handleLaunchWorkspace = async (workspaceName: string) => {
    const safeName = workspaceName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_')
    const scope = `project_${safeName}`
    
    setIsSyncing(true)
    setJupyterLiteStatus('loading')
    setShowWorkspace(true)
    setActiveJupyterWorkspace('custom_lite')

    try {
      const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${scope}`)
      if (res && res.files && Object.keys(res.files).length > 0) {
        await writeAllToIndexedDB(`JupyterLite Storage - ${scope}`, "files", res.files)
        console.log(`[DEP Sync] Restored ${Object.keys(res.files).length} files into 'files' for: ${scope}`)
      }
    } catch (e) {
      console.warn('[DEP Sync] Failed to restore workspace:', e)
    } finally {
      setIsSyncing(false)
      setWorkspaceScope(scope)
      setJupyterSrc(`/jupyterlite/lab/index.html?workspace=${scope}&path=DEP_Analysis_Starter.ipynb`)
    }
  }

  const handleSelectJupyter = async (type: 'embedded' | 'generic' | 'custom_lite' | null) => {
    setActiveJupyterWorkspace(type)
    setIsFocusMode(false)
    if (!type) {
      setShowWorkspace(false)
      return
    }

    setShowWorkspace(true)
    if (type === 'generic') {
      setJupyterSrc(CDN_FALLBACK_URL)
      setJupyterLiteStatus('loading')
    } else if (type === 'custom_lite') {
      const scope = username ? `user_${username.toLowerCase()}_sandbox` : 'user_sandbox'
      
      setIsSyncing(true)
      setJupyterLiteStatus('loading')
      try {
        const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${scope}`)
        if (res && res.files && Object.keys(res.files).length > 0) {
          await writeAllToIndexedDB(`JupyterLite Storage - ${scope}`, "files", res.files)
          console.log(`[DEP Sync] Restored ${Object.keys(res.files).length} files into 'files' for: ${scope}`)
        }
      } catch (e) {
        console.warn('[DEP Sync] Failed to restore user sandbox:', e)
      } finally {
        setIsSyncing(false)
        setWorkspaceScope(scope)
        setJupyterSrc(`/jupyterlite/lab/index.html?workspace=${scope}&path=DEP_Analysis_Starter.ipynb`)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Core theme-injection helper.
  // Rebuilds the CSS from live CSS vars each time it is called, so it always
  // picks up the latest accent colour / theme mode chosen in AccountSettings.
  // ---------------------------------------------------------------------------
  const injectDEPContext = useCallback((iframe: HTMLIFrameElement) => {
    const css = buildJupyterCSS()          // read live vars right now

    // Same-origin injection (works when JupyterLite is self-hosted under /jupyterlite/)
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (iframeDoc) {
        // Re-use the existing <style> element so repeated injections don't pile up
        let styleEl = iframeDoc.getElementById('dep-theme-injection') as HTMLStyleElement | null
        if (!styleEl) {
          styleEl = iframeDoc.createElement('style')
          styleEl.id = 'dep-theme-injection'
          ;(iframeDoc.head || iframeDoc.documentElement).appendChild(styleEl)
        }
        styleEl.textContent = css
      }
    } catch {
      // Cross-origin iframe — fall through to postMessage
    }

    // postMessage path: works cross-origin if JupyterLite has the DEP listener installed.
    // Also carries auth token + catalog permissions.
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('dep_jwt_token') || localStorage.getItem('token') || 'demo_token')
      : 'demo_token'

    const allowedCatalogs = userRole === 'admin'
      ? ['customer_profiles', 'revenue_forecasting_db', 'product_catalog', 'audit_logs']
      : userRole === 'onboarder'
        ? ['customer_profiles', 'product_catalog']
        : ['customer_profiles']

    iframe.contentWindow?.postMessage({
      type: 'DEP_AUTH_INJECT',
      token,
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      userRole,
      userId: 'dep_user',
      allowedCatalogs,
      css,                                 // send freshly built CSS
    }, '*')
  }, [userRole])

  // ---------------------------------------------------------------------------
  // Re-inject theme whenever AccountSettings writes a new value to localStorage.
  // AccountSettings updates localStorage on every change, which fires the
  // 'storage' event in this window — we use that as our reactivity trigger.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const WATCHED_KEYS = [
      'dep-accent-color',
      'dep-theme-mode',
      'dep-font-family',
      'dep-border-radius',
    ]

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !WATCHED_KEYS.includes(e.key)) return
      // Give the AccountSettings useEffect one tick to write the CSS var
      // to document.documentElement before we read it back in buildJupyterCSS.
      setTimeout(() => {
        if (jupyterIframeRef.current && activeJupyterWorkspace && activeJupyterWorkspace !== 'embedded') {
          injectDEPContext(jupyterIframeRef.current)
        }
      }, 50)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [activeJupyterWorkspace, injectDEPContext])

  // Listen for kernel-ready + sync-ready signals from JupyterLite iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DEP_KERNEL_READY') {
        setJupyterLiteStatus('kernel_ready')
        if (jupyterIframeRef.current) {
          injectDEPContext(jupyterIframeRef.current)
        }
      }
      if (event.data?.type === 'DEP_SYNC_READY') {
        console.log('[DEP] In-iframe sync engine active for workspace:', event.data.workspaceId)
        setIsSyncing(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [injectDEPContext])

  // Timeout safety fallback for the custom loader
  useEffect(() => {
    if (activeJupyterWorkspace === 'custom_lite' && jupyterLiteStatus !== 'kernel_ready') {
      const timer = setTimeout(() => setJupyterLiteStatus('kernel_ready'), 8000)
      return () => clearTimeout(timer)
    }
  }, [activeJupyterWorkspace, jupyterLiteStatus])

  // HTML5 Fullscreen (F11-like) sync with isFocusMode
  useEffect(() => {
    try {
      if (isFocusMode) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
      }
    } catch (e) {
      console.warn('Fullscreen API not fully supported or blocked:', e)
    }
  }, [isFocusMode])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsFocusMode(false)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ── JupyterLite layout renderer ─────────────────────────────────────────────
  const renderJupyterLiteFrame = () => {
    const isCustom  = activeJupyterWorkspace === 'custom_lite'
    const showLoader = isCustom
      ? jupyterLiteStatus !== 'kernel_ready'
      : jupyterLiteStatus === 'loading'

    return (
      <div className="flex-1 h-full min-h-0 overflow-hidden bg-background flex flex-col relative">
        {/* Custom Clean Header Bar */}
        <div className="h-9 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0 z-10 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowWorkspace(false); setIsFocusMode(false) }}
              className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              ← Back to DEP
            </button>
            {isCustom && (
              <>
                <span className="text-text-muted">|</span>
                <button
                  onClick={async () => {
                    setIsSyncing(true)
                    try {
                      const dbName = `JupyterLite Storage - ${workspaceScope}`
                      const files = await readAllFromIndexedDB(dbName, "files")
                      await apiFetch('/workspaces/sync', {
                        method: 'POST',
                        body: JSON.stringify({
                          workspace_id: workspaceScope,
                          files
                        })
                      })
                      console.log('[DEP Sync] Manual sync complete.')
                    } catch (e) {
                      console.error('[DEP Sync] Manual sync failed:', e)
                    } finally {
                      setIsSyncing(false)
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/25 hover:bg-primary/20 hover:border-primary/40 text-primary rounded-md transition-all text-xs font-medium cursor-pointer disabled:opacity-50"
                  disabled={isSyncing}
                  title="Save current workspace changes to backend cloud storage"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>{isSyncing ? 'Saving...' : 'Save'}</span>
                </button>
                <span className="text-text-muted">|</span>
                <button
                  onClick={async () => {
                    if (!confirm("Are you sure you want to pull from the cloud? This will overwrite your local unsaved changes in this session.")) {
                      return
                    }
                    setIsSyncing(true)
                    try {
                      const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${workspaceScope}`)
                      if (res && res.files) {
                        const dbName = `JupyterLite Storage - ${workspaceScope}`
                        await writeAllToIndexedDB(dbName, "files", res.files)
                        console.log(`[DEP Sync] Pulled ${Object.keys(res.files).length} files from cloud.`)
                        // Reload the iframe to let JupyterLite read the updated IndexedDB
                        if (jupyterIframeRef.current) {
                          const currentSrc = jupyterIframeRef.current.src
                          // Append timestamp to bust cache when reloading
                          const url = new URL(currentSrc, window.location.href)
                          url.searchParams.set('t', Date.now().toString())
                          jupyterIframeRef.current.src = url.toString()
                        }
                        alert("Successfully pulled and restored files from cloud!")
                      }
                    } catch (e) {
                      console.error('[DEP Sync] Pull failed:', e)
                      alert("Failed to pull from cloud: " + (e instanceof Error ? e.message : String(e)))
                    } finally {
                      setIsSyncing(false)
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] border border-border hover:bg-[#2d2d2d] hover:border-text-secondary text-text-secondary hover:text-text-primary rounded-md transition-all text-xs font-medium cursor-pointer disabled:opacity-50"
                  disabled={isSyncing}
                  title="Force pull workspace files from cloud (overwrites current browser session)"
                >
                  <CloudDownload className="w-3.5 h-3.5" />
                  <span>{isSyncing ? 'Pulling...' : 'Force Pull'}</span>
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-input border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary rounded-sm transition-all text-xs font-medium cursor-pointer"
              title={isFocusMode ? 'Exit Full Screen' : 'Enter Focus Mode'}
            >
              {isFocusMode ? (
                <><Minimize2 className="w-3.5 h-3.5 text-[#f44747]" /><span>Exit Focus</span></>
              ) : (
                <><Maximize2 className="w-3.5 h-3.5 text-primary" /><span>Focus Mode</span></>
              )}
            </button>
          </div>
        </div>

        {/* Iframe with loading overlay */}
        <div className="flex-1 overflow-hidden relative">
          {showLoader && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] z-50">
              <div className="flex flex-col items-center justify-center p-8 bg-[#141414] border border-[#2a2a2a] rounded-lg shadow-2xl max-w-sm w-full">
                <div className="w-12 h-12 bg-primary text-white rounded-lg flex items-center justify-center font-extrabold text-lg shadow-[0_0_20px_rgba(124,58,237,0.4)] mb-4">
                  DEP
                </div>
                <h3 className="text-white font-bold text-lg mb-1">DEP Workbench</h3>
                <p className="text-text-secondary text-xs mb-5 text-center">
                  {jupyterLiteStatus === 'loading'
                    ? 'Booting Pyodide WebAssembly kernel…'
                    : 'Initializing custom packages & libraries…'}
                </p>
                <div className="w-48 h-1 bg-[#252525] rounded-full overflow-hidden relative">
                  <div className="absolute left-0 top-0 h-full bg-primary rounded-full w-2/5 animate-loading-progress" />
                </div>
                <p className="text-[10px] text-text-muted text-center mt-6 leading-relaxed">
                  JupyterLite runs entirely in your browser. First load takes 10–30 seconds to fetch Python packages.
                </p>
              </div>
            </div>
          )}

          <iframe
            ref={jupyterIframeRef}
            src={jupyterSrc}
            className="w-full h-full border-0"
            title="DEP JupyterLite Workspace"
            allow="cross-origin-isolated; clipboard-read; clipboard-write"
            onLoad={() => {
              setJupyterLiteStatus('ready')
              if (jupyterIframeRef.current) {
                // Wait for JupyterLite to finish its own boot render, then inject
                setTimeout(() => injectDEPContext(jupyterIframeRef.current!), 1500)
              }
            }}
            onError={() => {
              if (jupyterSrc !== CDN_FALLBACK_URL) setJupyterSrc(CDN_FALLBACK_URL)
            }}
          />
        </div>

        {/* Status bar */}
        <div className="h-6 bg-card border-t border-border flex items-center justify-between px-4 text-[10px] font-mono text-text-muted flex-shrink-0">
          <span>DEP Workbench · JupyterLite v0.8.0 · Pyodide 314.0</span>
          <span>dep_sdk injected · Role: {userRole} · {
            userRole === 'admin' ? '4' : userRole === 'onboarder' ? '2' : '1'
          } authorized catalogs</span>
        </div>
      </div>
    )
  }

  // ── Focus mode overlay (fullscreen layout) ──────────────────────────────────
  if (activeJupyterWorkspace && isFocusMode) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-background p-0 flex flex-col">
        {activeJupyterWorkspace === 'embedded' ? (
          <JupyterLabWorkspace
            isFocusMode={true}
            onToggleFocusMode={() => setIsFocusMode(false)}
            onClose={() => { setActiveJupyterWorkspace(null); setIsFocusMode(false) }}
          />
        ) : (
          renderJupyterLiteFrame()
        )}
      </div>
    )
  }

  // ── Normal layout ───────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full w-full bg-background overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {sidebarOpen && (
        <div className="relative flex h-full flex-shrink-0">
          <div style={{ width: `${sidebarWidth}px` }} className="h-full">
            <Sidebar
              userRole={userRole}
              username={username}
              currentPage={currentPage}
              onNavigate={(page) => { setShowWorkspace(false); onNavigate(page) }}
              onLogout={onLogout}
              isCollapsed={false}
              onToggleCollapse={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>
          <div
            onMouseDown={handleMouseDown}
            className="w-0.5 bg-border hover:bg-primary cursor-col-resize transition-colors"
            style={{ userSelect: 'none' }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={showWorkspace ? 'Jupyter Notebook Workspace' : getPageTitle(currentPage)}
          userRole={userRole}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onSelectJupyter={handleSelectJupyter}
          activeJupyter={activeJupyterWorkspace}
          hasActiveWorkspace={activeJupyterWorkspace !== null}
          onGoToWorkspace={() => setShowWorkspace(true)}
          onNavigate={(page, targetTab) => {
            setShowWorkspace(false)
            onNavigate(page)
            if (targetTab && page === 'tutorials') {
              localStorage.setItem('dep_tutorials_active_tab', targetTab)
              window.dispatchEvent(new CustomEvent('dep_tutorials_tab_change', { detail: targetTab }))
            }
          }}
        />
        <main className="flex-1 overflow-hidden bg-background flex flex-col relative">
          {/* Embedded Workspace */}
          {activeJupyterWorkspace === 'embedded' && (
            <div className={`flex-1 h-full min-h-0 p-0 ${showWorkspace ? 'block' : 'hidden'}`}>
              <JupyterLabWorkspace
                isFocusMode={false}
                onToggleFocusMode={() => setIsFocusMode(true)}
                onClose={() => { setActiveJupyterWorkspace(null); setShowWorkspace(false); }}
              />
            </div>
          )}

          {/* Custom Lite or Generic JupyterLite Workspace */}
          {activeJupyterWorkspace && activeJupyterWorkspace !== 'embedded' && (
            <div className={`flex-1 h-full min-h-0 p-0 ${showWorkspace ? 'block' : 'hidden'}`}>
              {renderJupyterLiteFrame()}
            </div>
          )}

          {/* Regular Page Render */}
          <div className={`flex-1 overflow-y-auto ${!showWorkspace ? 'block animate-fade-in-up' : 'hidden'}`}>
            {renderPage(currentPage, userRole, handleLaunchWorkspace)}
          </div>
        </main>
      </div>
      <OnboardingTour
        isOpen={tourActive}
        onClose={() => setTourActive(false)}
        currentPage={currentPage}
        username={username || ''}
        tourName={activeTour}
      />
    </div>
  )
}
