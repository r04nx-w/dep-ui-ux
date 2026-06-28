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
import { Maximize2, Minimize2, CloudUpload, CloudDownload, GitCommit, History, Award, AlertTriangle, RefreshCw, Check, ArrowRight } from 'lucide-react'
import { OnboardingTour } from '@/components/ui/onboarding-tour'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'

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

  // --- useToast Hook ---
  const { showToast } = useToast()

  // --- Real-time Sync & Git Versioning States ---
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'conflict' | 'error'>('synced')
  const [serverLastModified, setServerLastModified] = useState<number>(0)
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false)
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Commit Modal
  const [showCommitModal, setShowCommitModal] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [commitScope, setCommitScope] = useState('workspace')

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [commitHistory, setCommitHistory] = useState<any[]>([])
  const [historyFilter, setHistoryFilter] = useState<'all' | 'notebook'>('all')
  const [selectedNotebookForHistory, setSelectedNotebookForHistory] = useState<string>('')

  // Promotion Modal
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [promoteFilePath, setPromoteFilePath] = useState('')
  const [promoteTitle, setPromoteTitle] = useState('')
  const [promoteDescription, setPromoteDescription] = useState('')

  // Dynamic Workspace Files List
  const [workspaceFilesList, setWorkspaceFilesList] = useState<string[]>([])

  useEffect(() => {
    if (username) {
      setWorkspaceScope(`user_${username.toLowerCase()}_sandbox`)
    }
  }, [username])
  const jupyterIframeRef = useRef<HTMLIFrameElement>(null)

  // Click-outside listener for workspace dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWorkspaceDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // List of workspaces available for switching
  const workspacesList = [
    { name: 'Personal Sandbox', scope: username ? `user_${username.toLowerCase()}_sandbox` : 'user_sandbox' },
    { name: 'Q4 Financial Analysis', scope: 'project_q4_financial_analysis' },
    { name: 'Customer Segmentation', scope: 'project_customer_segmentation' },
    { name: 'Revenue Forecasting', scope: 'project_revenue_forecasting' },
  ]

  const getCurrentWorkspaceName = () => {
    const ws = workspacesList.find(w => w.scope === workspaceScope)
    return ws ? ws.name : 'Unknown Workspace'
  }

  const filteredWorkspaces = workspacesList.filter(ws =>
    ws.name.toLowerCase().includes(workspaceSearchQuery.toLowerCase())
  )

  const handleSwitchWorkspace = async (targetScope: string) => {
    setIsSyncing(true)
    setJupyterLiteStatus('loading')
    
    // 1. Quick auto-backup of current workspace files
    try {
      const currentDb = `JupyterLite Storage - ${workspaceScope}`
      const currentFiles = await readAllFromIndexedDB(currentDb, "files")
      if (Object.keys(currentFiles).length > 0) {
        await apiFetch('/workspaces/sync', {
          method: 'POST',
          body: JSON.stringify({
            workspace_id: workspaceScope,
            files: currentFiles
          })
        })
      }
    } catch (e) {
      console.warn('[DEP Sync] Old workspace auto-save skipped:', e)
    }

    // 2. Fetch and restore files for target workspace
    try {
      const res = await apiFetch<{ files: Record<string, any>, last_modified?: number }>(`/workspaces/sync/${targetScope}`)
      if (res && res.files) {
        const targetDb = `JupyterLite Storage - ${targetScope}`
        await writeAllToIndexedDB(targetDb, "files", res.files)
        setServerLastModified(res.last_modified || Date.now() / 1000)
      } else {
        setServerLastModified(Date.now() / 1000)
      }
    } catch (e) {
      console.warn('[DEP Sync] Restore failed during switch:', e)
    } finally {
      setIsSyncing(false)
      setWorkspaceScope(targetScope)
      setJupyterSrc(`/jupyterlite/lab/index.html?workspace=${targetScope}&path=DEP_Analysis_Starter.ipynb&t=${Date.now()}`)
      setSyncStatus('synced')
      showToast({
        type: 'success',
        title: 'Workspace Switched',
        message: `Successfully switched to: ${targetScope.replace(/^(user_|project_)/, '').replace(/_sandbox$/, '').replace(/_/g, ' ')}`,
        duration: 3000
      })
    }
  }

  const refreshWorkspaceFilesList = async () => {
    try {
      const dbName = `JupyterLite Storage - ${workspaceScope}`
      const files = await readAllFromIndexedDB(dbName, "files")
      const notebookKeys = Object.keys(files).filter(k => k.endsWith('.ipynb'))
      setWorkspaceFilesList(notebookKeys)
      if (notebookKeys.length > 0 && !promoteFilePath) {
        setPromoteFilePath(notebookKeys[0])
        setPromoteTitle(notebookKeys[0].split('/').pop()?.replace('.ipynb', '') || '')
      }
    } catch (e) {
      console.warn('Failed to read workspace files:', e)
    }
  }
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
        if (event.data.lastModified) {
          setServerLastModified(event.data.lastModified)
        }
      }
      if (event.data?.type === 'DEP_SYNC_OK') {
        setSyncStatus('synced')
        if (event.data.lastModified) {
          setServerLastModified(event.data.lastModified)
        }
      }
      if (event.data?.type === 'DEP_SYNC_CONFLICT') {
        setSyncStatus('conflict')
        if (event.data.serverLastModified) {
          setServerLastModified(event.data.serverLastModified)
        }
        showToast({
          type: 'warning',
          title: 'Sync Conflict Detected',
          message: 'Another session has pushed newer changes to this workspace. Overwrite or restore to align.',
          duration: 8000
        })
      }
      if (event.data?.type === 'DEP_SYNC_ERROR') {
        setSyncStatus('error')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [injectDEPContext, showToast])

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

  const renderJupyterLiteFrame = () => {
    const isCustom  = activeJupyterWorkspace === 'custom_lite'
    const showLoader = isCustom
      ? jupyterLiteStatus !== 'kernel_ready'
      : jupyterLiteStatus === 'loading'

    const getStatusIcon = () => {
      if (syncStatus === 'saving') return <RefreshCw className="w-3 h-3 text-primary animate-spin" />
      if (syncStatus === 'conflict') return <AlertTriangle className="w-3 h-3 text-[#ffb84d]" />
      if (syncStatus === 'error') return <AlertTriangle className="w-3 h-3 text-[#f44747]" />
      return <Check className="w-3 h-3 text-[#6a9955]" />
    }

    const getStatusText = () => {
      if (syncStatus === 'saving') return 'Syncing...'
      if (syncStatus === 'conflict') return 'Sync Conflict'
      if (syncStatus === 'error') return 'Sync Error'
      return 'Cloud Synced'
    }

    const getStatusClass = () => {
      if (syncStatus === 'saving') return 'text-primary bg-primary/10 border-primary/20'
      if (syncStatus === 'conflict') return 'text-[#ffb84d] bg-[#ce9178]/15 border-[#ce9178]/30 animate-pulse'
      if (syncStatus === 'error') return 'text-[#f44747] bg-[#f44747]/10 border-[#f44747]/20'
      return 'text-[#6a9955] bg-[#6a9955]/10 border-[#6a9955]/20'
    }

    const handleForcePush = async () => {
      setIsSyncing(true)
      try {
        const dbName = `JupyterLite Storage - ${workspaceScope}`
        const files = await readAllFromIndexedDB(dbName, "files")
        
        if (jupyterIframeRef.current) {
          jupyterIframeRef.current.contentWindow?.postMessage({ type: 'DEP_FORCE_PUSH_CONFIRM' }, '*')
        }
        
        const res = await apiFetch<{ status: string, last_modified?: number }>('/workspaces/sync', {
          method: 'POST',
          body: JSON.stringify({
            workspace_id: workspaceScope,
            files,
            last_modified: 0.0 // bypass check on server
          })
        })
        
        if (res.last_modified) {
          setServerLastModified(res.last_modified)
        }
        setSyncStatus('synced')
        showToast({
          type: 'success',
          title: 'Force Push Successful',
          message: 'Workspace changes successfully forced to the cloud.',
          duration: 3000
        })
      } catch (e) {
        console.error('[DEP Sync] Force push failed:', e)
        showToast({
          type: 'error',
          title: 'Force Push Failed',
          message: e instanceof Error ? e.message : String(e),
          duration: 5000
        })
      } finally {
        setIsSyncing(false)
      }
    }

    const handleForcePull = async () => {
      if (!confirm("Are you sure you want to pull from the cloud? This will overwrite your local changes in this session.")) {
        return
      }
      setIsSyncing(true)
      try {
        if (jupyterIframeRef.current) {
          jupyterIframeRef.current.contentWindow?.postMessage({ type: 'DEP_FORCE_PULL_CONFIRM' }, '*')
        }
        
        const res = await apiFetch<{ files: Record<string, any>, last_modified?: number }>(`/workspaces/sync/${workspaceScope}`)
        if (res && res.files) {
          const dbName = `JupyterLite Storage - ${workspaceScope}`
          await writeAllToIndexedDB(dbName, "files", res.files)
          setServerLastModified(res.last_modified || Date.now() / 1000)
          
          if (jupyterIframeRef.current) {
            const currentSrc = jupyterIframeRef.current.src
            const url = new URL(currentSrc, window.location.href)
            url.searchParams.set('t', Date.now().toString())
            jupyterIframeRef.current.src = url.toString()
          }
          setSyncStatus('synced')
          showToast({
            type: 'success',
            title: 'Force Pull Successful',
            message: 'Successfully pulled latest changes from cloud.',
            duration: 3000
          })
        }
      } catch (e) {
        console.error('[DEP Sync] Force pull failed:', e)
        showToast({
          type: 'error',
          title: 'Force Pull Failed',
          message: e instanceof Error ? e.message : String(e),
          duration: 5000
        })
      } finally {
        setIsSyncing(false)
      }
    }

    const handleCommitSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!commitMessage.trim()) return
      
      setIsSyncing(true)
      try {
        const dbName = `JupyterLite Storage - ${workspaceScope}`
        const files = await readAllFromIndexedDB(dbName, "files")
        
        const res = await apiFetch<{ status: string, last_modified?: number }>(`/workspaces/sync/commit`, {
          method: 'POST',
          body: JSON.stringify({
            workspace_id: workspaceScope,
            message: commitMessage.trim(),
            scope: commitScope,
            files
          })
        })
        
        if (res.last_modified) {
          setServerLastModified(res.last_modified)
        }
        
        setShowCommitModal(false)
        setCommitMessage('')
        showToast({
          type: 'success',
          title: 'Version Committed',
          message: `Successfully created commit for: ${commitScope === 'workspace' ? 'Entire Workspace' : commitScope.split('/').pop()}`,
          duration: 3000
        })
      } catch (e) {
        console.error('Commit failed:', e)
        showToast({
          type: 'error',
          title: 'Commit Failed',
          message: e instanceof Error ? e.message : String(e),
          duration: 5000
        })
      } finally {
        setIsSyncing(false)
      }
    }

    const openHistory = async () => {
      setIsSyncing(true)
      try {
        await refreshWorkspaceFilesList()
        const res = await apiFetch<any[]>(`/workspaces/${workspaceScope}/history`)
        setCommitHistory(res || [])
        setShowHistoryModal(true)
      } catch (e) {
        console.error('Failed to load history:', e)
        showToast({
          type: 'error',
          title: 'History Unreachable',
          message: 'Could not fetch workspace history from server.',
          duration: 3000
        })
      } finally {
        setIsSyncing(false)
      }
    }

    const handleRollback = async (commitId: string) => {
      const isSingleFile = historyFilter === 'notebook' && selectedNotebookForHistory
      const promptMsg = isSingleFile
        ? `Are you sure you want to rollback ONLY "${selectedNotebookForHistory.split('/').pop()}" to version "${commitId}"?`
        : `Are you sure you want to rollback the ENTIRE workspace to commit "${commitId}"? This will overwrite your current active changes.`
        
      if (!confirm(promptMsg)) return

      setIsSyncing(true)
      try {
        const url = `/workspaces/${workspaceScope}/rollback/${commitId}` + 
          (isSingleFile ? `?target_file_path=${encodeURIComponent(selectedNotebookForHistory)}` : '')
          
        const res = await apiFetch<{ files: Record<string, any>, last_modified?: number }>(url, {
          method: 'POST'
        })
        
        if (res.files) {
          const dbName = `JupyterLite Storage - ${workspaceScope}`
          await writeAllToIndexedDB(dbName, "files", res.files)
          if (res.last_modified) {
            setServerLastModified(res.last_modified)
          }
          
          if (jupyterIframeRef.current) {
            jupyterIframeRef.current.contentWindow?.postMessage({ type: 'DEP_FORCE_PULL_CONFIRM' }, '*')
            
            const currentSrc = jupyterIframeRef.current.src
            const urlObj = new URL(currentSrc, window.location.href)
            urlObj.searchParams.set('t', Date.now().toString())
            jupyterIframeRef.current.src = urlObj.toString()
          }
          
          setSyncStatus('synced')
          setShowHistoryModal(false)
          showToast({
            type: 'success',
            title: 'Rollback Completed',
            message: isSingleFile 
              ? `Reverted notebook successfully.`
              : 'Reverted workspace successfully.',
            duration: 3000
          })
        }
      } catch (e) {
        console.error('Rollback failed:', e)
        showToast({
          type: 'error',
          title: 'Rollback Failed',
          message: e instanceof Error ? e.message : String(e),
          duration: 5000
        })
      } finally {
        setIsSyncing(false)
      }
    }

    const openPromote = async () => {
      await refreshWorkspaceFilesList()
      setShowPromoteModal(true)
    }

    const handlePromoteSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!promoteFilePath || !promoteTitle.trim()) return

      setIsSyncing(true)
      try {
        await apiFetch<{ notebook_id: number }>(`/workspaces/${workspaceScope}/promote`, {
          method: 'POST',
          body: JSON.stringify({
            file_path: promoteFilePath,
            title: promoteTitle.trim(),
            description: promoteDescription.trim() || null
          })
        })
        
        setShowPromoteModal(false)
        setPromoteDescription('')
        showToast({
          type: 'success',
          title: 'Notebook Promoted!',
          message: `"${promoteTitle}" is now a registered platform notebook.`,
          action: {
            label: 'View Notebooks',
            onClick: () => {
              setShowWorkspace(false)
              onNavigate('workspaces')
            }
          },
          duration: 10000
        })
      } catch (e) {
        console.error('Promotion failed:', e)
        showToast({
          type: 'error',
          title: 'Promotion Failed',
          message: e instanceof Error ? e.message : String(e),
          duration: 5000
        })
      } finally {
        setIsSyncing(false)
      }
    }

    const filteredCommits = commitHistory.filter(commit => {
      if (historyFilter === 'all') return true
      if (!selectedNotebookForHistory) return true
      if (commit.scope === selectedNotebookForHistory) return true
      if (commit.scope === 'workspace') return true
      return false
    })

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
                
                {/* Searchable Workspace Dropdown */}
                <div className="relative inline-block text-left" ref={dropdownRef}>
                  <button
                    onClick={() => {
                      setShowWorkspaceDropdown(!showWorkspaceDropdown)
                      setWorkspaceSearchQuery('')
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1c1e] border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary rounded-md transition-all text-xs font-semibold cursor-pointer"
                  >
                    <span className="text-[10px]">📁</span>
                    <span className="max-w-[120px] truncate">{getCurrentWorkspaceName()}</span>
                    <span className="text-[8px] text-text-muted ml-0.5">▼</span>
                  </button>
                  
                  {showWorkspaceDropdown && (
                    <div className="absolute left-0 mt-1 w-64 bg-card border border-border rounded-md shadow-2xl z-[150] p-1.5 animate-scale-in">
                      <div className="px-1.5 py-1">
                        <input
                          type="text"
                          placeholder="Search workspaces..."
                          value={workspaceSearchQuery}
                          onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                          className="w-full bg-input border border-border/80 focus:border-primary/50 text-text-primary text-xs rounded px-2.5 py-1 outline-none font-medium"
                          autoFocus
                        />
                      </div>
                      <div className="mt-1.5 max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin">
                        {filteredWorkspaces.map((ws) => (
                          <button
                            key={ws.scope}
                            onClick={() => {
                              setShowWorkspaceDropdown(false)
                              handleSwitchWorkspace(ws.scope)
                            }}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between ${
                              workspaceScope === ws.scope ? 'bg-primary/5 text-primary font-semibold' : 'text-text-secondary font-medium'
                            }`}
                          >
                            <span>{ws.name}</span>
                            {workspaceScope === ws.scope && <span className="text-[10px]">✓</span>}
                          </button>
                        ))}
                        {filteredWorkspaces.length === 0 && (
                          <div className="text-center text-[10px] text-text-muted py-3">No workspaces found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-text-muted">|</span>

                {/* Cloud Sync Status Indicator & Force Resolution Actions */}
                <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-full text-[10px] font-semibold transition-all ${getStatusClass()}`}>
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                </div>

                <button
                  onClick={syncStatus === 'conflict' ? handleForcePush : handleForcePush}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/25 hover:bg-primary/20 hover:border-primary/40 text-primary rounded-md transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
                  disabled={isSyncing}
                  title={syncStatus === 'conflict' ? 'FORCE OVERWRITE cloud version with your local edits' : 'Manual save to cloud'}
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>{syncStatus === 'conflict' ? 'Force Push' : 'Save'}</span>
                </button>

                <button
                  onClick={syncStatus === 'conflict' ? handleForcePull : handleForcePull}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] border border-border hover:bg-[#2d2d2d] hover:border-text-secondary text-text-secondary hover:text-text-primary rounded-md transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
                  disabled={isSyncing}
                  title={syncStatus === 'conflict' ? 'FORCE OVERWRITE your local edits with cloud version' : 'Force pull from cloud'}
                >
                  <CloudDownload className="w-3.5 h-3.5" />
                  <span>{syncStatus === 'conflict' ? 'Force Pull' : 'Pull'}</span>
                </button>

                <span className="text-text-muted">|</span>

                {/* Git Commit button */}
                <button
                  onClick={async () => {
                    await refreshWorkspaceFilesList()
                    setCommitScope('workspace')
                    setShowCommitModal(true)
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-input border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary rounded-md transition-all text-xs font-semibold cursor-pointer"
                  title="Commit Snapshot of your work"
                >
                  <GitCommit className="w-3.5 h-3.5 text-primary" />
                  <span>Commit</span>
                </button>

                {/* History timeline button */}
                <button
                  onClick={openHistory}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-input border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary rounded-md transition-all text-xs font-semibold cursor-pointer"
                  title="View Commit History timeline"
                >
                  <History className="w-3.5 h-3.5 text-primary" />
                  <span>History</span>
                </button>

                {/* Promote / Publish button */}
                <button
                  onClick={openPromote}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-input border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary rounded-md transition-all text-xs font-semibold cursor-pointer"
                  title="Promote a notebook to the main platform"
                >
                  <Award className="w-3.5 h-3.5 text-primary" />
                  <span>Promote</span>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070708]/95 z-50 backdrop-blur-md">
              <div className="flex flex-col items-center justify-center max-w-md w-full px-6">
                {/* Glowing Premium Loader Graphic */}
                <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-[#00b4d8] border-l-transparent animate-spin duration-1000" />
                  <div className="absolute w-12 h-12 bg-gradient-to-tr from-primary to-[#00b4d8] opacity-30 rounded-full blur-md animate-pulse" />
                  <div className="relative font-black text-sm tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    DEP
                  </div>
                </div>

                {/* Typography */}
                <h3 className="text-white font-extrabold text-xl tracking-wide mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-text-primary to-text-secondary animate-pulse">
                  DEP Workbench
                </h3>
                <p className="text-text-secondary text-xs mb-8 text-center max-w-xs leading-relaxed font-medium">
                  {jupyterLiteStatus === 'loading'
                    ? 'Booting WebAssembly environment…'
                    : 'Initializing custom packages & libraries…'}
                </p>

                {/* Flat linear progress bar */}
                <div className="w-56 h-1.5 bg-input border border-border/20 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                  <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-[#00b4d8] rounded-full w-2/5 animate-loading-progress" />
                </div>

                <p className="text-[10px] text-text-muted text-center mt-6 max-w-xs leading-relaxed tracking-wider font-mono">
                  Running entirely in browser cache.
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

        {/* ── GIT COMMIT SNAPSHOT MODAL ── */}
        <Modal
          isOpen={showCommitModal}
          onClose={() => setShowCommitModal(false)}
          title="Commit Workspace Snapshot"
          description="Save a tagged Git-like commit record to the snapshot registry."
        >
          <form onSubmit={handleCommitSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Commit Scope</label>
              <select
                value={commitScope}
                onChange={(e) => setCommitScope(e.target.value)}
                className="w-full bg-input border border-border/80 text-text-primary text-xs rounded p-2 outline-none font-medium cursor-pointer"
              >
                <option value="workspace">Entire Workspace (All files)</option>
                {workspaceFilesList.map(path => (
                  <option key={path} value={path}>
                    Notebook: {path.split('/').pop()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Commit Message</label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="What changes did you make? (e.g. Cleansed missing value rows, added scatter plot)"
                required
                rows={3}
                className="w-full bg-input border border-border/80 focus:border-primary/50 text-text-primary text-xs rounded p-2.5 outline-none font-medium resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCommitModal(false)}
                className="px-3.5 py-1.5 bg-transparent border border-border hover:bg-bg-hover text-text-secondary hover:text-text-primary rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSyncing || !commitMessage.trim()}
                className="px-4 py-1.5 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Committing...' : 'Commit'}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── COMMIT HISTORY MODAL ── */}
        <Modal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          title="Commit History & Versions"
          description="View past commit snapshots and rollback changes."
          size="lg"
        >
          <div className="space-y-4 pt-2">
            {/* Filter Toggle */}
            <div className="flex gap-2 p-1 bg-input rounded-md max-w-sm">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`flex-1 py-1 text-center text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                  historyFilter === 'all' ? 'bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                All Commits
              </button>
              <button
                onClick={() => {
                  setHistoryFilter('notebook')
                  if (workspaceFilesList.length > 0 && !selectedNotebookForHistory) {
                    setSelectedNotebookForHistory(workspaceFilesList[0])
                  }
                }}
                className={`flex-1 py-1 text-center text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                  historyFilter === 'notebook' ? 'bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Notebook Filter
              </button>
            </div>

            {/* Notebook Selector (only visible if filtered by notebook) */}
            {historyFilter === 'notebook' && (
              <div className="space-y-1 animate-fade-in-up">
                <label className="text-xs font-semibold text-text-secondary">Select Notebook</label>
                <select
                  value={selectedNotebookForHistory}
                  onChange={(e) => setSelectedNotebookForHistory(e.target.value)}
                  className="w-full bg-input border border-border/80 text-text-primary text-xs rounded p-2 outline-none font-medium cursor-pointer"
                >
                  {workspaceFilesList.map(path => (
                    <option key={path} value={path}>
                      {path}
                    </option>
                  ))}
                  {workspaceFilesList.length === 0 && (
                    <option value="">No notebooks in workspace</option>
                  )}
                </select>
              </div>
            )}

            {/* History List */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {filteredCommits.map((commit) => (
                <div key={commit.id} className="p-3 bg-input rounded border border-border/40 hover:border-border transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">{commit.message}</span>
                      <span className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[9px] font-mono text-text-muted uppercase">
                        {commit.id.replace('commit_', '')}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-muted font-medium flex items-center gap-2 flex-wrap">
                      <span>By: {commit.created_by}</span>
                      <span>•</span>
                      <span>Scope: {commit.scope === 'workspace' ? 'Workspace-wide' : commit.scope.split('/').pop()}</span>
                      <span>•</span>
                      <span>Date: {new Date(commit.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRollback(commit.id)}
                    disabled={isSyncing}
                    className="px-2.5 py-1 bg-transparent border border-border hover:bg-bg-hover hover:border-primary/50 hover:text-primary text-text-secondary rounded text-[10px] font-bold tracking-wide transition-all cursor-pointer disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              ))}

              {filteredCommits.length === 0 && (
                <div className="text-center text-xs text-text-muted py-8 font-medium">
                  No commit snapshots found matching this filter.
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* ── NOTEBOOK PROMOTION / PUBLISH MODAL ── */}
        <Modal
          isOpen={showPromoteModal}
          onClose={() => setShowPromoteModal(false)}
          title="Promote Notebook to Platform"
          description="Register your sandbox notebook as a standard collaborative platform resource."
        >
          <form onSubmit={handlePromoteSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Notebook File</label>
              <select
                value={promoteFilePath}
                onChange={(e) => {
                  setPromoteFilePath(e.target.value)
                  setPromoteTitle(e.target.value.split('/').pop()?.replace('.ipynb', '') || '')
                }}
                className="w-full bg-input border border-border/80 text-text-primary text-xs rounded p-2 outline-none font-medium cursor-pointer"
              >
                {workspaceFilesList.map(path => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
                {workspaceFilesList.length === 0 && (
                  <option value="">No notebooks available to promote</option>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Platform Title</label>
              <input
                type="text"
                value={promoteTitle}
                onChange={(e) => setPromoteTitle(e.target.value)}
                placeholder="Give the notebook a clean name"
                required
                className="w-full bg-input border border-border/80 focus:border-primary/50 text-text-primary text-xs rounded px-2.5 py-2 outline-none font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Description (Optional)</label>
              <textarea
                value={promoteDescription}
                onChange={(e) => setPromoteDescription(e.target.value)}
                placeholder="Explain the purpose of this notebook for other team members..."
                rows={2}
                className="w-full bg-input border border-border/80 focus:border-primary/50 text-text-primary text-xs rounded p-2 outline-none font-medium resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="px-3.5 py-1.5 bg-transparent border border-border hover:bg-bg-hover text-text-secondary hover:text-text-primary rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSyncing || !promoteFilePath || !promoteTitle.trim()}
                className="px-4 py-1.5 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Award className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Promoting...' : 'Promote'}</span>
              </button>
            </div>
          </form>
        </Modal>
      </div>
    )
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
            <div
              className={`p-0 ${showWorkspace ? 'block' : 'hidden'} ${
                isFocusMode
                  ? 'fixed inset-0 w-screen h-screen z-[100] bg-background'
                  : 'flex-1 h-full min-h-0'
              }`}
            >
              <JupyterLabWorkspace
                isFocusMode={isFocusMode}
                onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
                onClose={() => { setActiveJupyterWorkspace(null); setShowWorkspace(false); setIsFocusMode(false) }}
              />
            </div>
          )}

          {/* Custom Lite or Generic JupyterLite Workspace */}
          {activeJupyterWorkspace && activeJupyterWorkspace !== 'embedded' && (
            <div
              className={`p-0 ${showWorkspace ? 'block' : 'hidden'} ${
                isFocusMode
                  ? 'fixed inset-0 w-screen h-screen z-[100] bg-background'
                  : 'flex-1 h-full min-h-0'
              }`}
            >
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
