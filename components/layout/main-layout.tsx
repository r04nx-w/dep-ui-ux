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
import { GovernedAIClient } from '@/components/screens/governed-ai-client'
import { Maximize2, Minimize2, CloudUpload, CloudDownload, GitCommit, History, Award, AlertTriangle, RefreshCw, Check, ArrowRight, RotateCcw, GitBranch, Users, Share2, Package, Search, Download, Loader2, X, ExternalLink } from 'lucide-react'
import { OnboardingTour } from '@/components/ui/onboarding-tour'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { UserBadge } from '@/components/ui/user-badge'

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
    'ai-client': 'Governed AI Client',
  }
  return titles[page] || 'Dashboard'
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  text: string
}

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split(/\r?\n/)
  const newLines = newText.split(/\r?\n/)
  const m = oldLines.length
  const n = newLines.length

  if (oldText === '') {
    return newLines.map(line => ({ type: 'added', text: line }))
  }
  if (newText === '') {
    return oldLines.map(line => ({ type: 'removed', text: line }))
  }

  // To prevent slow DP on huge files
  if (m > 800 || n > 800) {
    return [
      { type: 'removed', text: '... file too large for detailed diff ...' },
      { type: 'added', text: '... file too large for detailed diff ...' }
    ]
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const result: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'unchanged', text: oldLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: newLines[j - 1] })
      j--
    } else {
      result.unshift({ type: 'removed', text: oldLines[i - 1] })
      i--
    }
  }
  return result
}

function highlightPython(code: string): string {
  const lines = code.split('\n')
  const keywords = new Set([
    'def', 'class', 'import', 'from', 'as', 'return', 'if', 'else', 'elif',
    'for', 'while', 'in', 'and', 'or', 'not', 'is', 'pass', 'try', 'except',
    'with', 'await', 'async', 'lambda', 'global', 'nonlocal', 'del', 'yield', 'assert',
    'None', 'True', 'False'
  ])
  const builtins = new Set([
    'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple',
    'display', 'whoami', 'list_catalogs', 'get_catalog', 'read_csv'
  ])

  return lines.map(line => {
    const commentIdx = line.indexOf('#')
    let codePart = commentIdx !== -1 ? line.slice(0, commentIdx) : line
    const commentPart = commentIdx !== -1 ? line.slice(commentIdx) : ''

    let escapedCode = codePart
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[a-zA-Z_][a-zA-Z0-9_]*|\b\d+(?:\.\d+)?\b)/g

    let result = ''
    let lastIdx = 0
    let match
    while ((match = tokenRegex.exec(escapedCode)) !== null) {
      result += escapedCode.slice(lastIdx, match.index)
      const token = match[0]
      
      if (token.startsWith('"') || token.startsWith("'")) {
        result += `<span class="text-[#ce9178]">${token}</span>`
      } else if (/^\d+(?:\.\d+)?$/.test(token)) {
        result += `<span class="text-[#b5cea8]">${token}</span>`
      } else if (keywords.has(token)) {
        result += `<span class="text-[#569cd6] font-bold">${token}</span>`
      } else if (builtins.has(token)) {
        result += `<span class="text-[#4ec9b0]">${token}</span>`
      } else {
        result += token
      }
      lastIdx = tokenRegex.lastIndex
    }
    result += escapedCode.slice(lastIdx)

    if (commentPart) {
      const escapedComment = commentPart
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      result += `<span class="text-[#6a9955] italic">${escapedComment}</span>`
    }

    return result
  }).join('\n')
}

function formatMarkdown(text: string): string {
  const lines = text.split('\n')
  return lines.map(line => {
    if (line.startsWith('# ')) {
      return `<h1 class="text-sm font-bold text-text-primary mt-2 mb-1">${line.slice(2)}</h1>`
    }
    if (line.startsWith('## ')) {
      return `<h2 class="text-xs font-bold text-text-primary mt-2 mb-1">${line.slice(3)}</h2>`
    }
    if (line.startsWith('### ')) {
      return `<h3 class="text-[11px] font-bold text-text-primary mt-1.5 mb-1">${line.slice(4)}</h3>`
    }
    
    let formattedLine = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-input rounded font-mono text-[9px] text-[#4ec9b0]">$1</code>')

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return `<li class="ml-3 list-disc">${formattedLine.trim().slice(2)}</li>`
    }

    return `<p class="mb-1">${formattedLine}</p>`
  }).join('')
}

const renderPage = (page: string, userRole: 'admin' | 'onboarder' | 'analyst', username: string, onLaunchWorkspace: (workspaceName: string) => void, onNavigate: (page: string) => void) => {
  switch (page) {
    case 'connections': return <DataSourcesHub userRole={userRole} />
    case 'catalog': return <ResourceCatalogBuilder />
    case 'acl': return <ACLBuilder />
    case 'explorer': return <CatalogExplorer />
    case 'access': return <MyDataAccess />
    case 'workspaces': return <ProjectWorkspaces onLaunchWorkspace={onLaunchWorkspace} userRole={userRole} username={username} />
    case 'artifacts': return <SavedArtifacts />
    case 'users': return <UserDirectory />
    case 'audit': return <AuditTrails />
    case 'settings': return <AccountSettings />
    case 'tutorials': return <Tutorials userRole={userRole} />
    case 'ai-client': return <GovernedAIClient username={username} />
    default: return <Dashboard userRole={userRole} onNavigate={onNavigate} />
  }
}

// Determine whether the self-hosted JupyterLite is available
const SELF_HOSTED_URL = '/jupyterlite/lab/index.html?path=DEP_Analysis_Starter.ipynb'
const CDN_FALLBACK_URL = 'https://jupyterlite.github.io/demo/lab/index.html?theme=JupyterLab%20Dark'

export function MainLayout({ userRole, username, currentPage, onNavigate, onLogout }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const [activeJupyterWorkspace, setActiveJupyterWorkspace] = useState<'embedded' | 'generic' | 'custom_lite' | 'backend_hub' | null>(null)
  const [workspaceScope, setWorkspaceScope] = useState<string>('user_sandbox')
  const [activeWorkspaceDisplayName, setActiveWorkspaceDisplayName] = useState<string>('')
  const [showWorkspace, setShowWorkspace] = useState(false)

  // Package Manager State
  const [showPackageManager, setShowPackageManager] = useState(false)
  const [packageManagerWidth, setPackageManagerWidth] = useState(420)
  const [isResizingPackages, setIsResizingPackages] = useState(false)
  const [packageSearchQuery, setPackageSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearchingPackages, setIsSearchingPackages] = useState(false)
  const [selectedPackageMetadata, setSelectedPackageMetadata] = useState<any>(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState('')
  const [isInstallingPackage, setIsInstallingPackage] = useState(false)
  const [installedPackages, setInstalledPackages] = useState<any[]>([])
  const [isLoadingInstalled, setIsLoadingInstalled] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  const startResizePackages = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingPackages(true)
  }, [])

  useEffect(() => {
    if (!isResizingPackages) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      if (newWidth > 280 && newWidth < 800) {
        setPackageManagerWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizingPackages(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingPackages])
  const [jupyterLiteStatus, setJupyterLiteStatus] = useState<'loading' | 'ready' | 'kernel_ready'>('loading')
  const [jupyterSrc, setJupyterSrc] = useState(SELF_HOSTED_URL)
  // Real permitted catalogs from API — used to inject into Pyodide kernel
  const [permittedCatalogs, setPermittedCatalogs] = useState<{ dataset_name: string; allowed_columns: string[] }[]>([])
  const [sdkInjected, setSdkInjected] = useState(false)

  // --- useToast Hook ---
  const { showToast } = useToast()

  // --- Real-time Sync & Git Versioning States ---
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'conflict' | 'error'>('synced')
  const [serverLastModified, setServerLastModified] = useState<number>(0)
  const [remoteIsAhead, setRemoteIsAhead] = useState(false)
  const [collaboratorUpdates, setCollaboratorUpdates] = useState<{ username: string; last_modified: number }[]>([])
  const [showPullOptionsModal, setShowPullOptionsModal] = useState(false)
  const [selectedCollabToPull, setSelectedCollabToPull] = useState<string | null>(null)
  const [isPullingCollab, setIsPullingCollab] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false)
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('')
  const [dbWorkspaces, setDbWorkspaces] = useState<{
    name: string
    scope: string
    leader?: string
    members?: string[]
  }[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch real permitted catalogs from the API for SDK injection
  const fetchPermittedCatalogs = useCallback(async () => {
    try {
      if (userRole === 'admin' || userRole === 'onboarder') {
        // Admins/onboarders can access all datasets
        const datasets = await apiFetch<{ name: string }[]>('/datasets').catch(() => [])
        setPermittedCatalogs(datasets.map(d => ({ dataset_name: d.name, allowed_columns: [] })))
      } else {
        // Analysts get only their permitted datasets
        const mine = await apiFetch<{ dataset_name: string; allowed_columns: string[] }[]>('/access/datasets/me').catch(() => [])
        setPermittedCatalogs(mine)
      }
    } catch (e) {
      console.warn('[DEP] Failed to fetch permitted catalogs for SDK injection:', e)
    }
  }, [userRole])

  const fetchUserTeams = async () => {
    try {
      const teams = await apiFetch<any[]>('/teams/my-teams')
      if (teams && Array.isArray(teams)) {
        const items = teams.map(t => ({
          name: t.name,
          scope: `project_${t.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_')}`,
          leader: t.leader_username,
          members: t.members ? t.members.map((m: any) => m.username) : []
        }))
        setDbWorkspaces(items)
      }
    } catch (e) {
      console.warn("Failed to fetch user teams for workspace list:", e)
    }
  }

  useEffect(() => {
    if (username) {
      fetchUserTeams()
      fetchPermittedCatalogs()
    }
  }, [username, fetchPermittedCatalogs])

  // Clear stale service worker and caches for JupyterLite
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            if (registration.scope.includes('/jupyterlite')) {
              registration.unregister().then((success) => {
                if (success) {
                  console.log('[DEP] Stale JupyterLite Service Worker unregistered.');
                }
              });
            }
          }
        });
      }
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (key.includes('jupyterlite') || key.includes('precache')) {
              caches.delete(key).then(() => {
                console.log('[DEP] Stale JupyterLite cache cleared:', key);
              });
            }
          });
        });
      }
    }
  }, [])

  // Live refresh of teams when opening the dropdown selector
  useEffect(() => {
    if (showWorkspaceDropdown && username) {
      fetchUserTeams()
    }
  }, [showWorkspaceDropdown, username])

  // Commit Modal
  const [showCommitModal, setShowCommitModal] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [commitScope, setCommitScope] = useState('workspace')

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [commitHistory, setCommitHistory] = useState<any[]>([])
  const [historyFilter, setHistoryFilter] = useState<'all' | 'notebook' | 'uncommitted'>('all')
  const [selectedNotebookForHistory, setSelectedNotebookForHistory] = useState<string>('')

  // Uncommitted changes and staging states
  const [uncommittedChanges, setUncommittedChanges] = useState<any[]>([])
  const [stagedFiles, setStagedFiles] = useState<string[]>([])
  const [previewingUncommittedFile, setPreviewingUncommittedFile] = useState<any | null>(null)
  const [uncommittedMessage, setUncommittedMessage] = useState('')
  const [isLoadingUncommitted, setIsLoadingUncommitted] = useState(false)

  // Branching States
  const [activeBranch, setActiveBranch] = useState<string>('main')
  const [branchesList, setBranchesList] = useState<any>({ branches: { main: null }, active_branch: 'main' })
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [showMergeBranchModal, setShowMergeBranchModal] = useState(false)
  const [mergeSourceBranch, setMergeSourceBranch] = useState('')

  // Poll remote workspace status every 15s to detect when collaborators push changes
  const pollRemoteStatus = useCallback(async () => {
    if (!workspaceScope || !workspaceScope.startsWith('project_') || !username) return
    try {
      const status = await apiFetch<{
        main_last_modified: number
        collaborators: { username: string; last_modified: number }[]
      }>(`/workspaces/sync/${workspaceScope}/remote-status?branch=${encodeURIComponent(activeBranch)}`)
      if (!status) return
      const newUpdates = status.collaborators.filter(c => c.last_modified > serverLastModified + 1.5)
      if (newUpdates.length > 0) {
        setCollaboratorUpdates(newUpdates)
        setRemoteIsAhead(true)
      }
    } catch {
      // silently ignore polling errors
    }
  }, [workspaceScope, activeBranch, username, serverLastModified])

  useEffect(() => {
    if (showWorkspace && activeJupyterWorkspace === 'custom_lite' && workspaceScope.startsWith('project_')) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = setInterval(() => {
        pollRemoteStatus()
      }, 15000)
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [showWorkspace, activeJupyterWorkspace, workspaceScope, pollRemoteStatus])

  // Promotion Modal
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [promoteFilePath, setPromoteFilePath] = useState('')
  const [promoteTitle, setPromoteTitle] = useState('')
  const [promoteDescription, setPromoteDescription] = useState('')

  // Shortcuts Modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Commit & History Modal Enhancements
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [previewingCommitId, setPreviewingCommitId] = useState<string | null>(null)
  const [previewingFilesList, setPreviewingFilesList] = useState<any[] | null>(null)
  const [previewingFilePath, setPreviewingFilePath] = useState<string | null>(null)
  const [previewingFileContent, setPreviewingFileContent] = useState<any | null>(null)
  const [shouldStashBeforeRestore, setShouldStashBeforeRestore] = useState(true)
  const [notebookSearchQuery, setNotebookSearchQuery] = useState('')
  const [showHistoryNotebookDropdown, setShowHistoryNotebookDropdown] = useState(false)

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
    ...dbWorkspaces
  ]

  const getCurrentWorkspaceName = () => {
    const ws = workspacesList.find(w => w.scope === workspaceScope)
    return ws ? ws.name : 'Unknown Workspace'
  }

  const filteredWorkspaces = workspacesList.filter(ws =>
    ws.name.toLowerCase().includes(workspaceSearchQuery.toLowerCase())
  )

  const filteredWorkspaceNotebooks = workspaceFilesList.filter(path =>
    path.toLowerCase().includes(notebookSearchQuery.toLowerCase())
  )

  useEffect(() => {
    if (showHistoryModal && historyFilter === 'notebook' && filteredWorkspaceNotebooks.length > 0) {
      if (!filteredWorkspaceNotebooks.includes(selectedNotebookForHistory)) {
        setSelectedNotebookForHistory(filteredWorkspaceNotebooks[0])
      }
    }
  }, [notebookSearchQuery, historyFilter, showHistoryModal, filteredWorkspaceNotebooks, selectedNotebookForHistory])
  const confirmLeaveWorkspace = (): boolean => {
    if (showWorkspace && activeJupyterWorkspace === 'custom_lite' && syncStatus !== 'synced') {
      return confirm("Warning: You have unsaved changes in your workspace that are not backed up to the cloud. If you leave now, you might lose these changes. Are you sure you want to proceed?")
    }
    return true
  }

  const handleSwitchWorkspace = async (targetScope: string) => {
    if (!confirmLeaveWorkspace()) return
    setIsSyncing(true)
    setJupyterLiteStatus('loading')
    
    // 1. Quick auto-backup of current workspace files
    try {
      if (activeJupyterWorkspace === 'custom_lite') {
        const currentDb = `JupyterLite Storage - ${workspaceScope}`
        const currentFiles = await readAllFromIndexedDB(currentDb, "files")
        if (Object.keys(currentFiles).length > 0) {
          await apiFetch('/workspaces/sync', {
            method: 'POST',
            body: JSON.stringify({
              workspace_id: workspaceScope,
              branch: activeBranch,
              files: currentFiles
            })
          })
        }
      }
    } catch (e) {
      console.warn('[DEP Sync] Old workspace auto-save skipped:', e)
    }

    // 2. Fetch and restore files for target workspace
    try {
      const res = await apiFetch<{ files: Record<string, any>, last_modified?: number }>(`/workspaces/sync/${targetScope}?branch=main`)
      if (res && res.files) {
        if (activeJupyterWorkspace === 'custom_lite') {
          const targetDb = `JupyterLite Storage - ${targetScope}`
          await writeAllToIndexedDB(targetDb, "files", res.files)
        }
        setServerLastModified(res.last_modified || Date.now() / 1000)
      } else {
        setServerLastModified(Date.now() / 1000)
      }
    } catch (e) {
      console.warn('[DEP Sync] Restore failed during switch:', e)
    } finally {
      setIsSyncing(false)
      setActiveBranch('main')
      setWorkspaceScope(targetScope)
      const displayName = workspacesList.find(w => w.scope === targetScope)?.name ||
        targetScope.replace(/^(user_|project_)/, '').replace(/_sandbox$/, '').replace(/_/g, ' ')
      setActiveWorkspaceDisplayName(displayName)

      if (activeJupyterWorkspace === 'custom_lite') {
        setJupyterSrc(`/jupyterlite/lab/index.html?workspace=${targetScope}&path=DEP_Analysis_Starter.ipynb&t=${Date.now()}`)
      } else if (activeJupyterWorkspace === 'backend_hub') {
        setJupyterLiteStatus('kernel_ready')
        setJupyterSrc(`/jupyter/user/${username}/lab?t=${Date.now()}`)
      }

      setSyncStatus('synced')
      showToast({
        type: 'success',
        title: 'Workspace Switched',
        message: `Successfully switched to: ${displayName}`,
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

  const handleForcePush = async () => {
    setIsSyncing(true)
    try {
      const dbName = `JupyterLite Storage - ${workspaceScope}`
      const files = await readAllFromIndexedDB(dbName, "files")
      
      const res = await apiFetch<{ status: string, last_modified?: number }>('/workspaces/sync', {
        method: 'POST',
        body: JSON.stringify({
          workspace_id: workspaceScope,
          branch: activeBranch,
          files,
          last_modified: 0.0
        })
      })
      
      if (res.last_modified) {
        setServerLastModified(res.last_modified)
      }

      if (jupyterIframeRef.current) {
        jupyterIframeRef.current.contentWindow?.postMessage({ 
          type: 'DEP_FORCE_PUSH_CONFIRM',
          lastModified: res.last_modified
        }, '*')
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
      
      const res = await apiFetch<{ files: Record<string, any>, last_modified?: number }>(`/workspaces/sync/${workspaceScope}?branch=${encodeURIComponent(activeBranch)}`)
      if (res && res.files) {
        const dbName = `JupyterLite Storage - ${workspaceScope}`
        await writeAllToIndexedDB(dbName, "files", res.files)
        setServerLastModified(res.last_modified || Date.now() / 1000)
        setRemoteIsAhead(false)
        setCollaboratorUpdates([])
        
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

  // Opens pull modal if there are collaborator-specific updates, otherwise does a plain force pull
  const handleForcePullWithOptions = () => {
    if (collaboratorUpdates.length > 0) {
      setSelectedCollabToPull(null)
      setShowPullOptionsModal(true)
    } else {
      handleForcePull()
    }
  }

  const handlePullFromCollaborator = async (collabUsername: string) => {
    setIsPullingCollab(true)
    try {
      // 1. First backup current local state to the user's own server copy
      const dbName = `JupyterLite Storage - ${workspaceScope}`
      const currentFiles = await readAllFromIndexedDB(dbName, "files")
      if (Object.keys(currentFiles).length > 0) {
        await apiFetch('/workspaces/sync', {
          method: 'POST',
          body: JSON.stringify({
            workspace_id: workspaceScope,
            branch: activeBranch,
            files: currentFiles
          })
        })
      }
      // 2. Fetch collaborator's version
      const res = await apiFetch<{ files: Record<string, any>; last_modified?: number; username?: string }>(
        `/workspaces/sync/${workspaceScope}/collaborator/${encodeURIComponent(collabUsername)}?branch=${encodeURIComponent(activeBranch)}`
      )
      if (res && res.files) {
        await writeAllToIndexedDB(dbName, "files", res.files)
        setServerLastModified(res.last_modified || Date.now() / 1000)
        setRemoteIsAhead(false)
        setCollaboratorUpdates([])
        setShowPullOptionsModal(false)

        if (jupyterIframeRef.current) {
          const url = new URL(jupyterIframeRef.current.src, window.location.href)
          url.searchParams.set('t', Date.now().toString())
          jupyterIframeRef.current.src = url.toString()
        }
        setSyncStatus('synced')
        showToast({
          type: 'success',
          title: 'Pulled Collaborator Changes',
          message: `Successfully pulled workspace from ${collabUsername.charAt(0).toUpperCase() + collabUsername.slice(1)}.`,
          duration: 3500
        })
      }
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Pull Failed',
        message: e instanceof Error ? e.message : String(e),
        duration: 5000
      })
    } finally {
      setIsPullingCollab(false)
    }
  }
  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commitMessage.trim()) return
    
    setIsSyncing(true)
    try {
      let files = {}
      if (activeJupyterWorkspace === 'custom_lite') {
        const dbName = `JupyterLite Storage - ${workspaceScope}`
        files = await readAllFromIndexedDB(dbName, "files")
      } else if (activeJupyterWorkspace === 'backend_hub') {
        const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${workspaceScope}?branch=${encodeURIComponent(activeBranch)}`)
        files = res?.files || {}
      }
      
      const res = await apiFetch<{ status: string, last_modified?: number }>(`/workspaces/sync/commit`, {
        method: 'POST',
        body: JSON.stringify({
          workspace_id: workspaceScope,
          message: commitMessage.trim(),
          scope: commitScope,
          branch: activeBranch,
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

  const loadUncommittedChangesWithHistory = async (history: any[]) => {
    setIsLoadingUncommitted(true)
    setPreviewingUncommittedFile(null)
    try {
      const dbName = `JupyterLite Storage - ${workspaceScope}`
      const currentFiles = await readAllFromIndexedDB(dbName, "files")

      let latestFiles: Record<string, any> = {}
      if (history.length > 0) {
        const latestCommitId = history[0].id
        try {
          latestFiles = await apiFetch<Record<string, any>>(`/workspaces/${workspaceScope}/commit/${latestCommitId}/full`)
        } catch (e) {
          console.error("Failed to fetch latest commit full snapshot:", e)
        }
      }

      const changesList: any[] = []

      for (const [path, fileObj] of Object.entries(currentFiles)) {
        if (fileObj.type === 'directory') continue
        
        if (!latestFiles[path]) {
          changesList.push({
            path,
            name: fileObj.name || path.split('/').pop(),
            type: fileObj.type || 'file',
            status: 'added',
            currentContent: fileObj,
            oldContent: null
          })
        } else {
          const currentContentStr = typeof fileObj.content === 'string' ? fileObj.content : JSON.stringify(fileObj.content)
          const latestContentStr = typeof latestFiles[path].content === 'string' ? latestFiles[path].content : JSON.stringify(latestFiles[path].content)
          
          if (currentContentStr !== latestContentStr) {
            changesList.push({
              path,
              name: fileObj.name || path.split('/').pop(),
              type: fileObj.type || 'file',
              status: 'modified',
              currentContent: fileObj,
              oldContent: latestFiles[path]
            })
          }
        }
      }

      for (const [path, fileObj] of Object.entries(latestFiles)) {
        if (fileObj.type === 'directory') continue
        if (!currentFiles[path]) {
          changesList.push({
            path,
            name: fileObj.name || path.split('/').pop(),
            type: fileObj.type || 'file',
            status: 'deleted',
            currentContent: null,
            oldContent: fileObj
          })
        }
      }

      setUncommittedChanges(changesList)
      setStagedFiles(changesList.map(c => c.path))
    } catch (e) {
      console.error("Failed to load uncommitted changes:", e)
    } finally {
      setIsLoadingUncommitted(false)
    }
  }

  const loadUncommittedChanges = async () => {
    await loadUncommittedChangesWithHistory(commitHistory)
  }

  const handleUncommittedCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uncommittedMessage.trim()) return
    if (stagedFiles.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Files Selected',
        message: 'Please select at least one file to commit.',
        duration: 3000
      })
      return
    }

    setIsSyncing(true)
    try {
      let currentFiles: Record<string, any> = {}
      if (activeJupyterWorkspace === 'custom_lite') {
        const dbName = `JupyterLite Storage - ${workspaceScope}`
        currentFiles = await readAllFromIndexedDB(dbName, "files")
      } else if (activeJupyterWorkspace === 'backend_hub') {
        const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${workspaceScope}?branch=${encodeURIComponent(activeBranch)}`)
        currentFiles = res?.files || {}
      }

      let latestFiles: Record<string, any> = {}
      if (commitHistory.length > 0) {
        const latestCommitId = commitHistory[0].id
        try {
          latestFiles = await apiFetch<Record<string, any>>(`/workspaces/${workspaceScope}/commit/${latestCommitId}/full`)
        } catch (e) {
          console.error("Failed to fetch latest commit full snapshot:", e)
        }
      }

      const mergedFiles: Record<string, any> = { ...latestFiles }

      for (const change of uncommittedChanges) {
        const isStaged = stagedFiles.includes(change.path)
        if (isStaged) {
          if (change.status === 'deleted') {
            delete mergedFiles[change.path]
          } else {
            mergedFiles[change.path] = currentFiles[change.path]
          }
        }
      }

      const res = await apiFetch<{ status: string, last_modified?: number }>(`/workspaces/sync/commit`, {
        method: 'POST',
        body: JSON.stringify({
          workspace_id: workspaceScope,
          message: uncommittedMessage.trim(),
          scope: stagedFiles.length === 1 ? stagedFiles[0] : 'workspace',
          branch: activeBranch,
          files: mergedFiles
        })
      })

      if (res.last_modified) {
        setServerLastModified(res.last_modified)
      }

      setUncommittedMessage('')
      showToast({
        type: 'success',
        title: 'Changes Committed',
        message: `Successfully committed ${stagedFiles.length} file(s).`,
        duration: 3000
      })

      const historyRes = await apiFetch<any[]>(`/workspaces/${workspaceScope}/history`)
      setCommitHistory(historyRes || [])
      await loadUncommittedChangesWithHistory(historyRes || [])
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

  const fetchCommitPreview = async (commitId: string, filePath?: string) => {
    try {
      const url = `/workspaces/${workspaceScope}/commit/${commitId}/preview` + 
        (filePath ? `?file_path=${encodeURIComponent(filePath)}` : '')
      const res = await apiFetch<any>(url)
      if (filePath) {
        setPreviewingFileContent(res.file || null)
        setPreviewingFilePath(filePath)
      } else {
        setPreviewingFilesList(res.files || [])
        setPreviewingFileContent(null)
        setPreviewingFilePath(null)
        if (historyFilter === 'notebook' && selectedNotebookForHistory) {
          const matchingFile = res.files?.find((f: any) => f.path === selectedNotebookForHistory)
          if (matchingFile) {
            const previewUrl = `/workspaces/${workspaceScope}/commit/${commitId}/preview?file_path=${encodeURIComponent(selectedNotebookForHistory)}`
            const previewRes = await apiFetch<any>(previewUrl)
            setPreviewingFileContent(previewRes.file || null)
            setPreviewingFilePath(selectedNotebookForHistory)
          }
        }
      }
      setPreviewingCommitId(commitId)
    } catch (e) {
      console.error('Failed to fetch commit preview:', e)
    }
  }

  const openHistory = async () => {
    setIsSyncing(true)
    setPreviewingCommitId(null)
    setPreviewingFilesList(null)
    setPreviewingFilePath(null)
    setPreviewingFileContent(null)
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
    
    setIsSyncing(true)
    try {
      if (shouldStashBeforeRestore) {
        const dbName = `JupyterLite Storage - ${workspaceScope}`
        const files = await readAllFromIndexedDB(dbName, "files")
        const shortCommitLabel = commitId.replace('commit_', '').slice(-7)
        const stashMsg = `[Stash] Auto-backup before restore to commit_${shortCommitLabel}`
        await apiFetch<{ status: string }>(`/workspaces/sync/commit`, {
          method: 'POST',
          body: JSON.stringify({
            workspace_id: workspaceScope,
            message: stashMsg,
            scope: isSingleFile ? selectedNotebookForHistory : 'workspace',
            branch: activeBranch,
            files
          })
        })
        console.log('[DEP Sync] Stashed current work before restoring.')
      }

      const url = `/workspaces/${workspaceScope}/rollback/${commitId}?branch=${encodeURIComponent(activeBranch)}` + 
        (isSingleFile ? `&target_file_path=${encodeURIComponent(selectedNotebookForHistory)}` : '')
        
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
            ? `Reverted notebook to target version successfully.`
            : 'Reverted entire workspace successfully.',
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
    const matchesSearch = historySearchQuery.trim() === '' ||
      commit.message.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      commit.id.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      commit.created_by.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      commit.scope.toLowerCase().includes(historySearchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (historyFilter === 'all') return true
    if (!selectedNotebookForHistory) return true
    if (commit.scope === selectedNotebookForHistory) return true
    if (commit.scope === 'workspace') return true
    return false
  })
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
            branch: activeBranch,
            files
          })
        })
        console.log(`[DEP Sync] Backed up ${Object.keys(files).length} files from "${dbName}" (branch: "${activeBranch}")`)
      } catch (e) {
        console.warn('[DEP Sync] Failed to auto-backup workspace:', e)
      }
    }

    const handleBeforeUnload = () => {
      backupWorkspace()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      backupWorkspace()
    }
  }, [activeJupyterWorkspace, showWorkspace, workspaceScope, activeBranch])

  const handleLaunchWorkspace = async (workspaceName: string) => {
    const safeName = workspaceName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_')
    const scope = `project_${safeName}`

    // Fetch real permitted catalogs before launching so the kernel gets correct data
    fetchPermittedCatalogs()
    setSdkInjected(false)
    setIsSyncing(true)
    setJupyterLiteStatus('loading')
    setShowWorkspace(true)
    setActiveJupyterWorkspace('custom_lite')
    setActiveWorkspaceDisplayName(workspaceName)

    try {
      const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${scope}?branch=main`)
      if (res && res.files && Object.keys(res.files).length > 0) {
        await writeAllToIndexedDB(`JupyterLite Storage - ${scope}`, "files", res.files)
        console.log(`[DEP Sync] Restored ${Object.keys(res.files).length} files into 'files' for: ${scope}`)
      }
    } catch (e) {
      console.warn('[DEP Sync] Failed to restore workspace:', e)
    } finally {
      setIsSyncing(false)
      setActiveBranch('main')
      setWorkspaceScope(scope)
      setJupyterSrc(`/jupyterlite/lab/index.html?workspace=${scope}&path=DEP_Analysis_Starter.ipynb`)
      
      // Dynamically add to switcher list if not present
      setDbWorkspaces(prev => {
        if (prev.some(w => w.scope === scope)) return prev
        return [...prev, { name: workspaceName, scope }]
      })
    }
  }

  const handleSelectJupyter = async (type: 'embedded' | 'generic' | 'custom_lite' | 'backend_hub' | null) => {
    setActiveJupyterWorkspace(type)
    setIsFocusMode(false)
    if (!type) {
      setShowWorkspace(false)
      return
    }

    // Fetch real permitted catalogs before launching so the kernel gets correct data
    fetchPermittedCatalogs()
    setSdkInjected(false)

    setShowWorkspace(true)
    if (type === 'generic') {
      setJupyterSrc(CDN_FALLBACK_URL)
      setJupyterLiteStatus('loading')
    } else if (type === 'custom_lite') {
      const scope = username ? `user_${username.toLowerCase()}_sandbox` : 'user_sandbox'
      
      setIsSyncing(true)
      setJupyterLiteStatus('loading')
      try {
        const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${scope}?branch=main`)
        if (res && res.files && Object.keys(res.files).length > 0) {
          await writeAllToIndexedDB(`JupyterLite Storage - ${scope}`, "files", res.files)
          console.log(`[DEP Sync] Restored ${Object.keys(res.files).length} files into 'files' for: ${scope}`)
        }
      } catch (e) {
        console.warn('[DEP Sync] Failed to restore user sandbox:', e)
      } finally {
        setIsSyncing(false)
        setActiveBranch('main')
        setWorkspaceScope(scope)
        setActiveWorkspaceDisplayName('Personal Sandbox')
        setJupyterSrc(`/jupyterlite/lab/index.html?workspace=${scope}&path=DEP_Analysis_Starter.ipynb`)
      }
    } else if (type === 'backend_hub') {
      setIsSyncing(true)
      setJupyterLiteStatus('loading')
      
      const scope = workspaceScope || (username ? `user_${username.toLowerCase()}_sandbox` : 'user_sandbox')
      if (!workspaceScope) {
        setWorkspaceScope(scope)
        setActiveWorkspaceDisplayName('Personal Sandbox')
      }
      
      try {
        await apiFetch(`/workspaces/sync/${scope}?branch=${encodeURIComponent(activeBranch || 'main')}`)
      } catch (e) {
        console.warn('[DEP Sync] Failed to trigger container sync on startup:', e)
      } finally {
        setIsSyncing(false)
      }

      try {
        const res = await apiFetch<{ redirect_url: string }>('/auth/jupyter-login', {
          method: 'POST'
        })
        if (res && res.redirect_url) {
          const t = typeof window !== 'undefined'
            ? (localStorage.getItem('dep_jwt_token') || localStorage.getItem('token') || 'demo_token')
            : 'demo_token'
          const loginUrl = `${res.redirect_url}&jwt=${encodeURIComponent(t)}`
          setJupyterSrc(loginUrl)
          
          setTimeout(() => {
            setJupyterLiteStatus('kernel_ready')
          }, 3000)
        } else {
          showToast({
            type: 'error',
            title: 'Failed to initiate JupyterHub session',
            message: 'No redirect URL returned from backend.',
          })
          setActiveJupyterWorkspace(null)
          setShowWorkspace(false)
        }
      } catch (e: any) {
        console.error('[DEP] Failed to trigger JupyterHub login:', e)
        showToast({
          type: 'error',
          title: 'Connection Error',
          message: e.message || 'Could not connect to JupyterHub.',
        })
        setActiveJupyterWorkspace(null)
        setShowWorkspace(false)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Core theme-injection helper.
  // Rebuilds the CSS from live CSS vars each time it is called, so it always
  // picks up the latest accent colour / theme mode chosen in AccountSettings.
  // ---------------------------------------------------------------------------
  const injectDEPContext = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe) return
    const css = buildJupyterCSS()          // read live vars right now

    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('dep_jwt_token') || localStorage.getItem('token') || '')
      : ''

    // Real catalog names from API state (fetched when workspace opened)
    const allowedCatalogNames = permittedCatalogs.map(c => c.dataset_name)

    // Same-origin injection (works when JupyterLite is self-hosted under /jupyterlite/)
    if (activeJupyterWorkspace !== 'backend_hub') {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc) {
          // Re-use the existing <style> element so repeated injections don't pile up
          let styleEl = iframeDoc.getElementById('dep-theme-injection') as HTMLStyleElement | null
          if (!styleEl) {
            styleEl = iframeDoc.createElement('style')
            styleEl.id = 'dep-theme-injection'
            const targetParent = iframeDoc.head || iframeDoc.documentElement
            if (targetParent) {
              targetParent.appendChild(styleEl)
            }
          }
          if (styleEl) {
            styleEl.textContent = css
          }
        }

        // Inject auth + real catalog list on same-origin iframe window
        const iframeWin = iframe.contentWindow as any
        if (iframeWin) {
          iframeWin.dep_auth_token = token
          iframeWin.dep_api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          iframeWin.dep_user_role = userRole
          iframeWin.dep_user_id = username || 'dep_user'
          iframeWin.dep_user_name = username || ''
          iframeWin.dep_allowed_catalogs = allowedCatalogNames
        }
      } catch (e) {
        // Cross-origin iframe — fall through to postMessage
        console.log('[DEP] Same-origin direct injection bypassed (expected for cross-origin iframes)')
      }
    }

    // postMessage path: works cross-origin and carries all session details.
    iframe.contentWindow?.postMessage({
      type: 'DEP_AUTH_INJECT',
      token,
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      userRole,
      userId: username || 'dep_user',
      userName: username || '',
      allowedCatalogs: allowedCatalogNames,
      css,
    }, '*')

    if (token) {
      setSdkInjected(true)
    }
  }, [userRole, username, permittedCatalogs, activeJupyterWorkspace])

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
        setSdkInjected(false) // will be set true after inject confirms token present
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
      // The iframe heartbeat is asking us to push a fresh session.
      // Respond with DEP_SESSION_REFRESH (lighter than DEP_AUTH_INJECT — no full restore).
      if (event.data?.type === 'DEP_SESSION_REFRESH_REQUEST') {
        const t = typeof window !== 'undefined'
          ? (localStorage.getItem('dep_jwt_token') || localStorage.getItem('token') || '')
          : ''
        if (jupyterIframeRef.current && t) {
          const allowedCatalogNames = permittedCatalogs.map(c => c.dataset_name)
          jupyterIframeRef.current.contentWindow?.postMessage({
            type: 'DEP_SESSION_REFRESH',
            token: t,
            apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
            userRole,
            userId: username || 'dep_user',
            userName: username || '',
            allowedCatalogs: allowedCatalogNames,
          }, '*')
        }
      }
      // Notebook switched inside JupyterLite — re-inject session so _dep_context
      // always carries the correct active_notebook before save_artifact() is called.
      if (event.data?.type === 'DEP_NOTEBOOK_CHANGE') {
        const t = typeof window !== 'undefined'
          ? (localStorage.getItem('dep_jwt_token') || localStorage.getItem('token') || '')
          : ''
        if (jupyterIframeRef.current && t) {
          const allowedCatalogNames = permittedCatalogs.map(c => c.dataset_name)
          jupyterIframeRef.current.contentWindow?.postMessage({
            type: 'DEP_SESSION_REFRESH',
            token: t,
            apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
            userRole,
            userId: username || 'dep_user',
            userName: username || '',
            allowedCatalogs: allowedCatalogNames,
            activeNotebook: event.data.notebook,
          }, '*')
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [injectDEPContext, showToast, userRole, username, permittedCatalogs])

  // Periodic session refresh — keep .dep_session live while workspace is open
  useEffect(() => {
    if (!showWorkspace || !jupyterIframeRef.current) return
    const interval = setInterval(() => {
      const t = typeof window !== 'undefined'
        ? (localStorage.getItem('dep_jwt_token') || localStorage.getItem('token') || '')
        : ''
      if (!t || !jupyterIframeRef.current) return
      const allowedCatalogNames = permittedCatalogs.map(c => c.dataset_name)
      jupyterIframeRef.current.contentWindow?.postMessage({
        type: 'DEP_SESSION_REFRESH',
        token: t,
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        userRole,
        userId: username || 'dep_user',
        userName: username || '',
        allowedCatalogs: allowedCatalogNames,
      }, '*')
    }, 60000) // every 60 seconds
    return () => clearInterval(interval)
  }, [showWorkspace, userRole, username, permittedCatalogs])

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Avoid triggering when focused inside editable text fields
      const target = e.target as HTMLElement
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        // ESC key can still close the dropdown or modals if inside inputs
        if (e.key === 'Escape') {
          setShowWorkspaceDropdown(false)
        }
        return
      }

      // 1. Switch back to platform main view: Alt + L
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        setShowWorkspace(false)
        setIsFocusMode(false)
      }

      // 2. Launch Workspace / user sandbox quickly: Alt + W
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        handleSelectJupyter('custom_lite')
      }

      // 3. Toggle Focus Mode: Alt + F (only when workspace is active)
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        if (showWorkspace) {
          setIsFocusMode((prev) => !prev)
        }
      }

      // 4. Toggle Workspace Selector Dropdown: Alt + S (only when workspace is active)
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (showWorkspace && activeJupyterWorkspace === 'custom_lite') {
          setShowWorkspaceDropdown((prev) => !prev)
        }
      }

      // 5. Open Commit modal: Alt + C (only when workspace is active)
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        if (showWorkspace && activeJupyterWorkspace === 'custom_lite') {
          refreshWorkspaceFilesList()
          setCommitScope('workspace')
          setShowCommitModal(true)
        }
      }

      // 6. Open History timeline: Alt + H (only when workspace is active)
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        if (showWorkspace && activeJupyterWorkspace === 'custom_lite') {
          openHistory()
        }
      }

      // 7. Open Promote modal: Alt + P (only when workspace is active)
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        if (showWorkspace && activeJupyterWorkspace === 'custom_lite') {
          openPromote()
        }
      }

      // 8. Open Shortcuts Help Cheat Sheet: Alt + K
      if (e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowShortcutsModal((prev) => !prev)
      }

      // 9. Navigate via Alt + 1 to Alt + 9 (only outside workspace/full screen view)
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        
        // Dynamic allowed pages listing matched to their sidebar positions
        const allowedPages = userRole === 'admin'
          ? ['dashboard', 'connections', 'catalog', 'acl', 'explorer', 'access', 'workspaces', 'artifacts', 'ai-client', 'users', 'audit']
          : userRole === 'onboarder'
            ? ['dashboard', 'connections', 'catalog', 'acl', 'explorer', 'access', 'workspaces', 'artifacts', 'ai-client', 'users']
            : ['dashboard', 'explorer', 'access', 'workspaces', 'artifacts', 'ai-client', 'tutorials', 'settings']
            
        if (index < allowedPages.length) {
          setShowWorkspace(false)
          setIsFocusMode(false)
          onNavigate(allowedPages[index])
        }
      }

      // 10. Escape key: Close any modal or dropdown
      if (e.key === 'Escape') {
        setShowCommitModal(false)
        setShowHistoryModal(false)
        setShowPromoteModal(false)
        setShowWorkspaceDropdown(false)
        setShowShortcutsModal(false)
      }
    }

    window.addEventListener('keydown', handleGlobalShortcuts)
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts)
    }
  }, [showWorkspace, activeJupyterWorkspace, userRole, openHistory, openPromote, refreshWorkspaceFilesList, onNavigate])

  // Fetch installed packages in running container
  const fetchInstalledPackages = useCallback(async () => {
    if (activeJupyterWorkspace !== 'backend_hub') return
    setIsLoadingInstalled(true)
    try {
      const res = await apiFetch<any[]>('/packages/installed')
      if (res && Array.isArray(res)) {
        setInstalledPackages(res)
      }
    } catch (e) {
      console.warn('[DEP] Failed to fetch installed packages:', e)
    } finally {
      setIsLoadingInstalled(false)
    }
  }, [activeJupyterWorkspace])

  // Trigger loading installed packages when Package Manager opens or workspace changes
  useEffect(() => {
    if (showPackageManager && activeJupyterWorkspace === 'backend_hub') {
      fetchInstalledPackages()
    }
  }, [showPackageManager, activeJupyterWorkspace, fetchInstalledPackages])

  // Debounced autocomplete search
  useEffect(() => {
    if (!packageSearchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingPackages(true)
      try {
        const res = await apiFetch<any[]>(`/packages/search?q=${encodeURIComponent(packageSearchQuery)}`)
        if (res && Array.isArray(res)) {
          setSearchResults(res)
        } else {
          setSearchResults([])
        }
      } catch (e) {
        console.warn('[DEP] Package search error:', e)
      } finally {
        setIsSearchingPackages(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [packageSearchQuery])

  const handleSelectPackage = async (name: string) => {
    setIsLoadingMetadata(true)
    setSelectedPackageMetadata(null)
    setSelectedVersion('')
    try {
      const res = await apiFetch<any>(`/packages/metadata?name=${encodeURIComponent(name)}`)
      if (res) {
        setSelectedPackageMetadata(res)
        if (res.versions && res.versions.length > 0) {
          setSelectedVersion(res.versions[0])
        } else if (res.version) {
          setSelectedVersion(res.version)
        }
      }
    } catch (e: any) {
      showToast({
        type: 'error',
        title: 'Metadata Failed',
        message: e.message || 'Could not fetch package details.',
      })
    } finally {
      setIsLoadingMetadata(false)
    }
  }

  const handleInstallPackage = async () => {
    if (!selectedPackageMetadata) return
    
    const cmd = selectedVersion 
      ? `%pip install ${selectedPackageMetadata.name}==${selectedVersion}`
      : `%pip install ${selectedPackageMetadata.name}`

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(cmd)
    } catch (err) {
      console.warn('[DEP] Clipboard write failed:', err)
    }

    // Try programmatic insertion & execution inside same-origin JupyterLab iframe
    let autoExecuted = false
    try {
      const iframe = jupyterIframeRef.current
      if (iframe && iframe.contentWindow) {
        const iframeWin = iframe.contentWindow as any
        const app = iframeWin.jupyterlab || iframeWin.jupyterapp
        if (app) {
          // 1. Insert cell below
          app.commands.execute('notebook:insert-cell-below')
          // 2. Wait for insertion, set cell content and execute
          setTimeout(() => {
            const notebook = app.shell.currentWidget?.content
            if (notebook && notebook.activeCell) {
              notebook.activeCell.model.sharedModel.setSource(cmd)
              app.commands.execute('notebook:run-cell')
            }
          }, 150)
          autoExecuted = true
        }
      }
    } catch (e) {
      console.warn('[DEP] Could not auto-insert code cell in Jupyter:', e)
    }

    if (autoExecuted) {
      showToast({
        type: 'success',
        title: 'Command Injected',
        message: `Command injected and run in notebook: ${cmd}`,
      })
    } else {
      showToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: `Command copied! Paste into a new code cell and run: ${cmd}`,
      })
    }
  }

  const renderPackageManager = () => {
    return (
      <div className="flex flex-col h-full bg-[#18181b] text-text-primary">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card select-none">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Package Manager (PyPI)</span>
          </div>
          <button
            onClick={() => setShowPackageManager(false)}
            className="p-1 hover:bg-bg-hover text-text-secondary hover:text-text-primary rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Package Search Form (Instant Search, no search button) */}
        <div className="p-3 border-b border-border bg-card">
          <div className="relative w-full">
            <input
              type="text"
              value={packageSearchQuery}
              onChange={(e) => setPackageSearchQuery(e.target.value)}
              placeholder="Search packages instantly..."
              className="w-full pl-8 pr-8 py-1.5 bg-[#0d0d0d] border border-border focus:border-primary/50 hover:border-border/80 rounded text-xs text-text-primary font-medium placeholder-text-muted focus:outline-none transition-all"
            />
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
            {isSearchingPackages && (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin absolute right-2.5 top-2.5" />
            )}
          </div>
        </div>

        {/* Content Area - Split into Search Results / Package details / Installed packages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
          {/* Selected Package Details */}
          {isLoadingMetadata ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : selectedPackageMetadata ? (
            <div className="bg-card border border-border rounded p-3.5 space-y-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
                    {selectedPackageMetadata.name}
                    {selectedPackageMetadata.home_page && (
                      <a
                        href={selectedPackageMetadata.home_page}
                        target="_blank"
                        rel="noreferrer"
                        className="text-text-muted hover:text-text-primary transition-colors"
                        title="Project Homepage"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </h4>
                  {selectedPackageMetadata.author && (
                    <span className="text-[10px] text-text-muted font-medium">By {selectedPackageMetadata.author}</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPackageMetadata(null)}
                  className="text-[10px] font-bold text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider"
                >
                  Clear
                </button>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                {selectedPackageMetadata.summary || 'No summary available.'}
              </p>

              <div className="text-[10px] text-text-muted italic">
                Tip: Installing will copy `%pip install` command to your clipboard and attempt to automatically paste and execute it in a new cell.
              </div>

              {/* Version selector and Install button */}
              <div className="pt-2 border-t border-border flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    Select Version
                  </label>
                  <select
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-border focus:border-primary/50 text-xs font-mono px-2 py-1 focus:outline-none rounded text-text-primary"
                  >
                    {selectedPackageMetadata.versions?.map((v: string) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-shrink-0 mt-4">
                  <button
                    onClick={handleInstallPackage}
                    className="px-3.5 py-1.5 bg-[#6a9955] hover:bg-[#527d41] text-white text-xs font-bold uppercase tracking-wide rounded cursor-pointer transition-colors flex items-center gap-1.5"
                    title="Copy and run install command in notebook"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Search Results List */}
          {searchResults.length > 0 && !selectedPackageMetadata && (
            <div className="space-y-2">
              <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">
                Search Results ({searchResults.length})
              </div>
              <div className="space-y-1.5">
                {searchResults.map((pkg) => (
                  <div
                    key={pkg.name}
                    onClick={() => handleSelectPackage(pkg.name)}
                    className="p-2.5 bg-card hover:bg-bg-hover border border-border hover:border-primary/30 rounded cursor-pointer transition-all flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary font-mono group-hover:text-primary transition-colors">
                        {pkg.name}
                      </span>
                      <span className="text-[10px] text-primary font-semibold font-mono bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-sm">
                        {pkg.version}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary truncate mt-0.5">
                      {pkg.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.length === 0 && !isSearchingPackages && !selectedPackageMetadata && (
            <div className="h-24 flex items-center justify-center border border-dashed border-border rounded text-[11px] text-text-muted text-center p-4 leading-relaxed">
              Search PyPI to discover and install packages.
            </div>
          )}

          {/* Installed Packages List */}
          {activeJupyterWorkspace === 'backend_hub' && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  Installed Packages ({installedPackages.length})
                </span>
                <button
                  onClick={fetchInstalledPackages}
                  disabled={isLoadingInstalled}
                  className="text-[9px] font-bold text-primary hover:text-primary-hover uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isLoadingInstalled ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {isLoadingInstalled ? (
                <div className="h-20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : installedPackages.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                  {installedPackages.map((pkg) => (
                    <div
                      key={pkg.name}
                      onClick={() => {
                        setPackageSearchQuery(pkg.name)
                        handleSelectPackage(pkg.name)
                      }}
                      className="p-1.5 bg-[#0d0d0d] border border-border/80 rounded flex items-center justify-between font-mono text-[10px] cursor-pointer hover:border-primary/30 transition-all"
                      title="Click to view details or install/upgrade"
                    >
                      <span className="text-text-secondary truncate font-semibold mr-1">{pkg.name}</span>
                      <span className="text-text-muted flex-shrink-0">{pkg.version}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[10px] text-text-muted border border-dashed border-border rounded">
                  No package list available. Try launching your server.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderJupyterLiteFrame = () => {
    const isCustom  = activeJupyterWorkspace === 'custom_lite' || activeJupyterWorkspace === 'backend_hub'
    const showLoader = activeJupyterWorkspace === 'custom_lite'
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

    return (
      <div className="flex-1 h-full min-h-0 overflow-hidden bg-background flex flex-col relative">
        {/* Custom Clean Header Bar */}
        <div className="h-9 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0 z-10 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!confirmLeaveWorkspace()) return
                setShowWorkspace(false)
                setIsFocusMode(false)
              }}
              className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              ← Back to DEP
            </button>
            {isCustom && (
              <>
                <span className="text-text-muted">|</span>
                {/* Searchable Workspace Dropdown */}
                {(() => {
                  const activeWs = workspacesList.find(w => w.scope === workspaceScope)
                  const activeIsProject = activeWs?.scope.startsWith('project_')
                  const activeIsSharedToMe = activeIsProject && activeWs?.leader && activeWs.leader !== username
                  const activeIsSharedByMe = activeIsProject && activeWs?.leader && activeWs.leader === username && activeWs.members && activeWs.members.filter((m: string) => m !== username).length > 0
                  const activeOtherMembers = activeWs?.members ? activeWs.members.filter((m: string) => m !== username) : []

                  return (
                    <div className="relative inline-block text-left" ref={dropdownRef}>
                      <button
                        onClick={() => {
                          setShowWorkspaceDropdown(!showWorkspaceDropdown)
                          setWorkspaceSearchQuery('')
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1c1e] border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary rounded-md transition-all text-xs font-semibold cursor-pointer"
                        title={
                          activeIsSharedToMe
                            ? `Shared project • Owned by ${activeWs.leader ? activeWs.leader.charAt(0).toUpperCase() + activeWs.leader.slice(1) : 'Admin'}`
                            : activeIsSharedByMe
                              ? `Shared out project • Collaborators: ${activeOtherMembers.map((m: string) => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}`
                              : 'Select workspace'
                        }
                      >
                        {activeIsSharedToMe ? (
                          <Users className="w-3.5 h-3.5 text-[#d8b4fe] flex-shrink-0" />
                        ) : activeIsSharedByMe ? (
                          <Share2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                        ) : (
                          <span className="text-[10px]">📁</span>
                        )}
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
                            {filteredWorkspaces.map((ws) => {
                              const isProject = ws.scope.startsWith('project_')
                              const isSharedToMe = isProject && ws.leader && ws.leader !== username
                              const isSharedByMe = isProject && ws.leader && ws.leader === username && ws.members && ws.members.filter((m: string) => m !== username).length > 0
                              const otherMembers = ws.members ? ws.members.filter((m: string) => m !== username) : []

                              return (
                                <button
                                  key={ws.scope}
                                  onClick={() => {
                                    setShowWorkspaceDropdown(false)
                                    handleSwitchWorkspace(ws.scope)
                                  }}
                                  className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between group/ws relative ${
                                    workspaceScope === ws.scope ? 'bg-primary/5 text-primary font-semibold' : 'text-text-secondary font-medium'
                                  }`}
                                  title={
                                    isSharedToMe
                                      ? `Shared project • Owned by ${ws.leader ? ws.leader.charAt(0).toUpperCase() + ws.leader.slice(1) : 'Admin'}`
                                      : isSharedByMe
                                        ? `Shared out project • Collaborators: ${otherMembers.map((m: string) => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}`
                                        : undefined
                                  }
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="truncate">{ws.name}</span>
                                    {isSharedToMe && (
                                      <Users className="w-3 h-3 text-[#d8b4fe] inline flex-shrink-0" />
                                    )}
                                    {isSharedByMe && (
                                      <Share2 className="w-3 h-3 text-sky-400 inline flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {isSharedToMe && (
                                      <span className="text-[8px] px-1 py-0.5 bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#d8b4fe] rounded-sm font-semibold select-none">
                                        Shared
                                      </span>
                                    )}
                                    {isSharedByMe && (
                                      <span className="text-[8px] px-1 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-sm font-semibold select-none">
                                        Shared Out
                                      </span>
                                    )}
                                    {workspaceScope === ws.scope && <span className="text-[10px] text-primary">✓</span>}
                                  </div>
                                </button>
                              )
                            })}
                            {filteredWorkspaces.length === 0 && (
                              <div className="text-center text-[10px] text-text-muted py-3">No workspaces found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Branch Selector */}
                <span className="text-text-muted">|</span>
                <div className="relative inline-block text-left">
                  <button
                    onClick={async () => {
                      setShowBranchDropdown(!showBranchDropdown)
                      try {
                        const res = await apiFetch<any>(`/workspaces/${workspaceScope}/branches`)
                        if (res) {
                          setBranchesList(res)
                        }
                      } catch (e) {
                        console.error("Failed to load branches:", e)
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1c1e] border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary rounded-md transition-all text-xs font-semibold cursor-pointer"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-primary" />
                    <span className="max-w-[120px] truncate font-mono text-[11px] text-[#c084fc]">{activeBranch}</span>
                    <span className="text-[8px] text-text-muted ml-0.5">▼</span>
                  </button>
                  
                  {showBranchDropdown && (
                    <div className="absolute left-0 mt-1 w-56 bg-[#18181b] border border-border rounded-md shadow-2xl z-[150] p-1 animate-scale-in">
                      <div className="text-[9px] font-bold text-text-muted uppercase px-2 py-1 border-b border-border/40">
                        Branches
                      </div>
                      <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5 scrollbar-thin">
                        {Object.keys(branchesList.branches || {}).map((bname) => {
                          const isSelected = activeBranch === bname
                          return (
                            <button
                              key={bname}
                              onClick={async () => {
                                setShowBranchDropdown(false)
                                if (bname === activeBranch) return
                                
                                // Check for uncommitted changes before checkout
                                try {
                                  const historyRes = await apiFetch<any[]>(`/workspaces/${workspaceScope}/history`)
                                  const dbName = `JupyterLite Storage - ${workspaceScope}`
                                  const currentFiles = await readAllFromIndexedDB(dbName, "files")
                                  
                                  let latestFiles: Record<string, any> = {}
                                  const activeBranchCommit = branchesList.branches[activeBranch]
                                  if (activeBranchCommit) {
                                    latestFiles = await apiFetch<Record<string, any>>(`/workspaces/${workspaceScope}/commit/${activeBranchCommit}/full`)
                                  }
                                  
                                  let hasLocalChanges = false
                                  for (const [path, fileObj] of Object.entries(currentFiles)) {
                                    if (fileObj.type === 'directory') continue
                                    if (!latestFiles[path]) {
                                      hasLocalChanges = true;
                                      break;
                                    } else {
                                      const currentContentStr = typeof fileObj.content === 'string' ? fileObj.content : JSON.stringify(fileObj.content)
                                      const latestContentStr = typeof latestFiles[path].content === 'string' ? latestFiles[path].content : JSON.stringify(latestFiles[path].content)
                                      if (currentContentStr !== latestContentStr) {
                                        hasLocalChanges = true;
                                        break;
                                      }
                                    }
                                  }
                                  
                                  if (hasLocalChanges) {
                                    if (!confirm(`Warning: You have uncommitted changes on branch "${activeBranch}". Switching branches will overwrite your local changes. Are you sure you want to proceed?`)) {
                                      return
                                    }
                                  }
                                } catch (e) {
                                  console.warn("Uncommitted changes check skipped:", e)
                                }

                                setIsSyncing(true)
                                setJupyterLiteStatus('loading')
                                try {
                                  const dbName = `JupyterLite Storage - ${workspaceScope}`
                                  const currentFiles = await readAllFromIndexedDB(dbName, "files")
                                  if (Object.keys(currentFiles).length > 0) {
                                    await apiFetch('/workspaces/sync', {
                                      method: 'POST',
                                      body: JSON.stringify({
                                        workspace_id: workspaceScope,
                                        branch: activeBranch,
                                        files: currentFiles
                                      })
                                    })
                                  }
                                  
                                  const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${workspaceScope}?branch=${encodeURIComponent(bname)}`)
                                  if (res && res.files) {
                                    await writeAllToIndexedDB(dbName, "files", res.files)
                                  }
                                  
                                  setActiveBranch(bname)
                                  
                                  if (jupyterIframeRef.current) {
                                    const currentSrc = jupyterIframeRef.current.src
                                    const urlObj = new URL(currentSrc, window.location.href)
                                    urlObj.searchParams.set('t', Date.now().toString())
                                    jupyterIframeRef.current.src = urlObj.toString()
                                  }
                                  
                                  showToast({
                                    type: 'success',
                                    title: 'Branch Checked Out',
                                    message: `Switched to branch "${bname}" successfully.`,
                                    duration: 3000
                                  })
                                } catch (err) {
                                  showToast({
                                    type: 'error',
                                    title: 'Checkout Failed',
                                    message: err instanceof Error ? err.message : String(err),
                                    duration: 5000
                                  })
                                } finally {
                                  setIsSyncing(false)
                                }
                              }}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-primary/5 text-primary font-semibold' : 'text-text-secondary font-medium'
                              }`}
                            >
                              <span>{bname}</span>
                              {isSelected && <span className="text-[10px]">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                      
                      <div className="border-t border-border/40 mt-1 pt-1 flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            setShowBranchDropdown(false)
                            setNewBranchName('')
                            setShowCreateBranchModal(true)
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-text-secondary hover:text-primary hover:bg-primary/5 rounded transition-colors font-semibold"
                        >
                          ＋ Create Branch...
                        </button>
                        <button
                          onClick={() => {
                            setShowBranchDropdown(false)
                            setMergeSourceBranch('')
                            setShowMergeBranchModal(true)
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-[#00b4d8] hover:bg-[#00b4d8]/5 rounded transition-colors font-semibold"
                        >
                          🔀 Merge Branches...
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                    <button
                      onClick={handleForcePush}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/25 hover:bg-primary/20 hover:border-primary/40 text-primary rounded-md transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
                      disabled={isSyncing}
                      title="Manual save to cloud"
                    >
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={handleForcePullWithOptions}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                          remoteIsAhead
                            ? 'bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-500/60 text-amber-400'
                            : 'bg-[#1e1e1e] border border-border hover:bg-[#2d2d2d] hover:border-text-secondary text-text-secondary hover:text-text-primary'
                        }`}
                        disabled={isSyncing}
                        title={remoteIsAhead
                          ? `${collaboratorUpdates.length} collaborator${collaboratorUpdates.length > 1 ? 's have' : ' has'} pushed new changes — Click to pull`
                          : 'Pull latest changes from cloud'}
                      >
                        <CloudDownload className="w-3.5 h-3.5" />
                        <span>Pull</span>
                      </button>
                      {remoteIsAhead && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-lg shadow-amber-500/40 pointer-events-none" />
                      )}
                    </div>

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
          <div className="flex items-center gap-2">
            {/* Tiny Minimal Sync Status Flag */}
            {isCustom && (
              <div className="relative group">
                <div 
                  className={`flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-bold transition-all ${getStatusClass()} cursor-pointer`}
                  title={syncStatus !== 'conflict' ? getStatusText() : undefined}
                >
                  {getStatusIcon()}
                  <span className="hidden sm:inline">
                    {syncStatus === 'synced' ? 'Synced' : syncStatus === 'saving' ? 'Saving' : syncStatus === 'conflict' ? 'Conflict' : 'Error'}
                  </span>
                </div>

                {/* Popover explaining conflict (visible on hover) */}
                {syncStatus === 'conflict' && (
                  <div className="absolute right-0 top-full pt-1 w-80 z-[200] hidden group-hover:block">
                    <div className="bg-card border border-border/90 rounded shadow-2xl animate-scale-in p-3.5">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-[#ffb84d] flex-shrink-0 mt-0.5" />
                        <div className="text-xs font-bold text-text-primary">Sync Conflict Detected</div>
                      </div>
                      
                      <p className="text-[10px] text-text-secondary leading-relaxed mb-3">
                        Your local browser workspace changes conflict with recent modifications saved to the cloud by another session or user. Normal saving is locked to prevent overwriting someone else's work.
                      </p>

                      <div className="text-[9px] font-bold text-text-muted mb-2 uppercase tracking-wide border-b border-border/40 pb-1">
                        Choose Resolution Option:
                      </div>
                      
                      <div className="space-y-2">
                        {/* Option 1: Force Push */}
                        <div className="p-2.5 bg-primary/5 border border-primary/20 rounded space-y-1">
                          <div className="text-[10.5px] font-bold text-primary flex items-center gap-1">
                            <CloudUpload className="w-3.5 h-3.5" />
                            <span>Option 1: Force Push to Cloud</span>
                          </div>
                          <p className="text-[9px] text-text-muted leading-snug">
                            Promote your local browser sandbox edits to be the source of truth, overwriting the server state.
                          </p>
                          <button
                            onClick={handleForcePush}
                            disabled={isSyncing}
                            className="w-full mt-2 py-1 text-center bg-primary hover:bg-primary-hover text-white text-[9.5px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isSyncing ? 'Pushing...' : 'Overwrite Cloud'}
                          </button>
                        </div>

                        {/* Option 2: Force Pull */}
                        <div className="p-2.5 bg-success/5 border border-success/20 rounded space-y-1">
                          <div className="text-[10.5px] font-bold text-success flex items-center gap-1">
                            <CloudDownload className="w-3.5 h-3.5" />
                            <span>Option 2: Force Pull from Cloud</span>
                          </div>
                          <p className="text-[9px] text-text-muted leading-snug">
                            Discard all local changes in this browser session and reload the server's version.
                          </p>
                          <button
                            onClick={handleForcePull}
                            disabled={isSyncing}
                            className="w-full mt-2 py-1 text-center bg-[#1e1e1e] border border-border hover:bg-[#2d2d2d] text-text-secondary hover:text-text-primary text-[9.5px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSyncing ? 'Pulling...' : 'Revert to Cloud'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowPackageManager(!showPackageManager)}
              className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                showPackageManager
                  ? 'bg-primary/20 border-primary text-primary font-bold'
                  : 'bg-input border-border hover:border-primary/50 text-text-secondary hover:text-text-primary'
              }`}
              title="Open Python Package Manager (PyPI)"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Packages</span>
            </button>

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

        {/* Iframe with loading overlay and package manager */}
        <div className="flex-1 overflow-hidden relative flex">
          <div className="flex-1 h-full relative">
            {showLoader && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] z-50">
                <div className="flex flex-col items-center justify-center max-w-sm w-full px-6">
                  
                  {/* DEP Brand Logo */}
                  <div className="w-16 h-16 mb-6 flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary rounded flex items-center justify-center">
                      <span className="text-white text-lg font-bold font-sans">DEP</span>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-lg mb-1">DEP Workbench</h3>
                  <p className="text-text-secondary text-xs mb-5 text-center font-medium">
                    {activeJupyterWorkspace === 'backend_hub'
                      ? (jupyterLiteStatus === 'loading'
                          ? 'Connecting to backend GPU JupyterHub server…'
                          : 'Starting your personal sandbox container…')
                      : (jupyterLiteStatus === 'loading'
                          ? 'Booting Pyodide WebAssembly kernel…'
                          : 'Initializing custom packages & libraries…')}
                  </p>
                  <div className="w-48 h-1 bg-[#252525] rounded-full overflow-hidden relative">
                    <div className="absolute left-0 top-0 h-full bg-primary rounded-full w-2/5 animate-loading-progress" />
                  </div>
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
          {/* Package Manager Sidebar (Resizable) */}
          {showPackageManager && (
            <div 
              style={{ width: `${packageManagerWidth}px` }} 
              className="h-full border-l border-border bg-card flex flex-col flex-shrink-0 z-20 relative select-none"
            >
              {/* Resizer handle bar */}
              <div
                onMouseDown={startResizePackages}
                className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-50"
                style={{ marginLeft: '-3px' }}
              />
              <div className="flex-1 flex flex-col h-full select-text">
                {renderPackageManager()}
              </div>
            </div>
          )}
        </div>

        {/* Status bar — live data */}
        <div className="h-6 bg-card border-t border-border flex items-center justify-between px-4 text-[10px] font-mono text-text-muted flex-shrink-0">
          <span>DEP Workbench · JupyterLite v0.8.0 · Pyodide 314.0</span>
          <span className="flex items-center gap-2">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${sdkInjected ? 'bg-[#6a9955]' : 'bg-yellow-500'}`} />
            <span>{sdkInjected ? 'dep_sdk injected' : 'dep_sdk pending'}</span>
            <span className="text-text-muted/40">·</span>
            <span>Role: {userRole}</span>
            <span className="text-text-muted/40">·</span>
            <span>
              {permittedCatalogs.length > 0
                ? `${permittedCatalogs.length} authorized catalog${permittedCatalogs.length !== 1 ? 's' : ''}`
                : 'fetching catalogs…'}
            </span>
          </span>
        </div>


        {/* ── PULL FROM COLLABORATOR MODAL ── */}
        <Modal
          isOpen={showPullOptionsModal}
          onClose={() => setShowPullOptionsModal(false)}
          title="Pull Collaborator Changes"
          description="Choose whose changes to pull into your local workspace. Your current work will be saved first."
        >
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <span className="text-amber-400 text-lg">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-amber-400 mb-0.5">This will overwrite your local view</p>
                <p className="text-[11px] text-text-muted leading-relaxed">Your current local changes will be backed up to the cloud first, then the selected collaborator's workspace will be loaded into your browser.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Collaborators with updates:</p>
              {collaboratorUpdates.map((collab) => {
                const capName = collab.username.charAt(0).toUpperCase() + collab.username.slice(1)
                const updatedAt = new Date(collab.last_modified * 1000)
                const timeAgo = (() => {
                  const diff = Math.floor((Date.now() - updatedAt.getTime()) / 1000)
                  if (diff < 60) return `${diff}s ago`
                  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
                  return `${Math.floor(diff / 3600)}h ago`
                })()
                const isSelected = selectedCollabToPull === collab.username
                return (
                  <button
                    key={collab.username}
                    onClick={() => setSelectedCollabToPull(collab.username)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-card border-border hover:border-primary/30 hover:bg-primary/5 text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {capName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{capName}</p>
                        <p className="text-[10px] text-text-muted">Pushed {timeAgo}</p>
                      </div>
                    </div>
                    {isSelected && <span className="text-primary text-sm font-bold">✓</span>}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowPullOptionsModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-input border border-border rounded-lg hover:border-text-secondary transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (selectedCollabToPull) handlePullFromCollaborator(selectedCollabToPull) }}
                disabled={!selectedCollabToPull || isPullingCollab}
                className="flex-1 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isPullingCollab ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pulling...</>
                ) : (
                  <><CloudDownload className="w-3.5 h-3.5" /> Pull Changes</>
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* ── GIT COMMIT SNAPSHOT MODAL ── */}
        <Modal
          isOpen={showCommitModal}
          onClose={() => setShowCommitModal(false)}
          title="Commit Workspace Snapshot"
          description="Save a tagged Git-like commit record to the snapshot registry."
        >
          <form onSubmit={handleCommitSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Commit Scope</label>
              <div className="flex gap-2 p-1 bg-input rounded-md max-w-sm">
                <button
                  type="button"
                  onClick={() => setCommitScope('workspace')}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                    commitScope === 'workspace' ? 'bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Entire Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (workspaceFilesList.length > 0) {
                      setCommitScope(workspaceFilesList[0])
                    } else {
                      setCommitScope('')
                    }
                  }}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                    commitScope !== 'workspace' ? 'bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Specific Notebook
                </button>
              </div>
            </div>

            {commitScope !== 'workspace' && (
              <div className="space-y-1.5 animate-fade-in-up">
                <label className="text-xs font-semibold text-text-secondary">Select Notebook</label>
                <div className="relative border border-border/80 bg-input rounded p-2.5 space-y-2">
                  <input
                    type="text"
                    placeholder="Search notebook by name..."
                    value={notebookSearchQuery}
                    onChange={(e) => setNotebookSearchQuery(e.target.value)}
                    className="w-full bg-card border border-border/60 text-text-primary text-xs rounded px-2.5 py-1.5 outline-none font-medium"
                  />
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {workspaceFilesList
                      .filter(path => path.toLowerCase().includes(notebookSearchQuery.toLowerCase()))
                      .map(path => {
                        const isSelected = commitScope === path
                        return (
                          <button
                            key={path}
                            type="button"
                            onClick={() => setCommitScope(path)}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-primary/10 transition-colors flex items-center justify-between ${
                              isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary font-medium'
                            }`}
                          >
                            <span className="truncate">{path}</span>
                            {isSelected && <span className="text-[10px]">✓</span>}
                          </button>
                        )
                      })}
                    {workspaceFilesList.filter(path => path.toLowerCase().includes(notebookSearchQuery.toLowerCase())).length === 0 && (
                      <div className="text-center text-[10px] text-text-muted py-3">No notebooks found</div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
          size="5xl"
        >
          <div className="space-y-4 pt-2">
            {/* Top controls: Filter and Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              {/* Filter Toggle */}
              <div className="flex gap-1.5 p-1 bg-input border border-border/40 rounded-md w-full sm:w-auto">
                <button
                  onClick={() => {
                    setHistoryFilter('all')
                    setPreviewingCommitId(null)
                    setPreviewingFilePath(null)
                    setPreviewingFileContent(null)
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-center text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                    historyFilter === 'all' ? 'bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  All Commits
                </button>
                <button
                  onClick={() => {
                    setHistoryFilter('notebook')
                    setPreviewingCommitId(null)
                    setPreviewingFilePath(null)
                    setPreviewingFileContent(null)
                    if (workspaceFilesList.length > 0 && !selectedNotebookForHistory) {
                      setSelectedNotebookForHistory(workspaceFilesList[0])
                    }
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-center text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                    historyFilter === 'notebook' ? 'bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Notebook Filter
                </button>
                <button
                  onClick={() => {
                    setHistoryFilter('uncommitted')
                    setPreviewingCommitId(null)
                    setPreviewingFilePath(null)
                    setPreviewingFileContent(null)
                    loadUncommittedChanges()
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-center text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                    historyFilter === 'uncommitted' ? 'bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Uncommitted Changes
                </button>
              </div>

              {/* Right side controls: Auto-stash Checkbox & Commit Search Input */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 flex-shrink-0 bg-primary/5 border border-primary/20 px-2.5 py-1 rounded-md">
                  <input 
                    type="checkbox"
                    id="stash-checkbox"
                    checked={shouldStashBeforeRestore}
                    onChange={(e) => setShouldStashBeforeRestore(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                  />
                  <label htmlFor="stash-checkbox" className="text-[10px] font-bold text-text-secondary cursor-pointer select-none" title="Auto-stash current active local files before restoring a version">
                    Auto-stash before restore
                  </label>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search commits (ID, msg, user)..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full bg-input border border-border/80 text-text-primary text-xs rounded px-3 py-1.5 outline-none font-medium"
                  />
                  {historySearchQuery && (
                    <button 
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-2 top-1.5 text-text-muted hover:text-text-primary text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notebook Selector (only visible if filtered by notebook) */}
            {historyFilter === 'notebook' && (
              <div className="space-y-1 animate-fade-in-up relative z-20">
                <label className="text-[10px] font-bold text-text-muted uppercase">Select Notebook</label>
                <div className="relative z-[170]">
                  <button
                    type="button"
                    onClick={() => setShowHistoryNotebookDropdown(!showHistoryNotebookDropdown)}
                    className="w-full bg-[#1b1b1f] border border-border/80 hover:border-primary/50 text-text-primary text-xs rounded p-2 text-left flex items-center justify-between outline-none font-medium cursor-pointer transition-all"
                  >
                    <span className="truncate">{selectedNotebookForHistory || 'Select a notebook...'}</span>
                    <span className="text-[8px] text-text-muted">▼</span>
                  </button>
                  
                  {showHistoryNotebookDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-2xl z-[160] p-1.5 space-y-2 animate-scale-in">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search notebook by name..."
                          value={notebookSearchQuery}
                          onChange={(e) => setNotebookSearchQuery(e.target.value)}
                          className="w-full bg-input border border-border/80 focus:border-primary/50 text-text-primary text-xs rounded px-2.5 py-1.5 outline-none font-medium"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        {notebookSearchQuery && (
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setNotebookSearchQuery(''); }}
                            className="absolute right-2.5 top-1.5 text-text-muted hover:text-text-primary text-xs font-semibold cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                        {filteredWorkspaceNotebooks.map(path => {
                          const isSelected = selectedNotebookForHistory === path
                          return (
                            <button
                              key={path}
                              type="button"
                              onClick={() => {
                                setSelectedNotebookForHistory(path)
                                setPreviewingCommitId(null)
                                setPreviewingFilePath(null)
                                setPreviewingFileContent(null)
                                setShowHistoryNotebookDropdown(false)
                              }}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-primary/10 transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:text-text-primary font-medium'
                              }`}
                            >
                              <span className="truncate">{path}</span>
                              {isSelected && <span className="text-[10px]">✓</span>}
                            </button>
                          )
                        })}
                        {filteredWorkspaceNotebooks.length === 0 && (
                          <div className="text-center text-[10px] text-text-muted py-3">No notebooks found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Split Layout: Left (Compact Git Tree / Uncommitted), Right (Collapsible Preview / Diff) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Commits List or Uncommitted Changes */}
              {historyFilter === 'uncommitted' ? (
                <div className="flex flex-col space-y-2 h-[450px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase">Uncommitted Changes</div>
                  <div className="flex flex-col flex-1 border border-border/40 bg-[#16161a] rounded p-2 min-h-0">
                    <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 min-h-0">
                      {isLoadingUncommitted ? (
                        <div className="flex items-center justify-center h-full text-xs text-text-muted">
                          Loading uncommitted changes...
                        </div>
                      ) : uncommittedChanges.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                          <div className="text-3xl mb-2 text-emerald-400">✓</div>
                          <p className="text-[11px] text-text-secondary font-bold">
                            No uncommitted changes
                          </p>
                          <p className="text-[9px] text-text-muted mt-1 leading-relaxed max-w-[180px]">
                            Your workspace is clean. Any changes you make in the editor will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Select all toggle */}
                          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/20 text-[10px] text-text-muted font-bold">
                            <input 
                              type="checkbox"
                              checked={uncommittedChanges.length > 0 && stagedFiles.length === uncommittedChanges.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStagedFiles(uncommittedChanges.map(c => c.path))
                                } else {
                                  setStagedFiles([])
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                            />
                            <span>Stage All ({stagedFiles.length} of {uncommittedChanges.length})</span>
                          </div>

                          <div className="space-y-1">
                            {uncommittedChanges.map((change) => {
                              const isStaged = stagedFiles.includes(change.path)
                              const isSelected = previewingUncommittedFile?.path === change.path
                              
                              let statusLabel = 'M'
                              let statusClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              if (change.status === 'added') {
                                statusLabel = 'A'
                                statusClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              } else if (change.status === 'deleted') {
                                statusLabel = 'D'
                                statusClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }

                              return (
                                <div 
                                  key={change.path}
                                  onClick={() => setPreviewingUncommittedFile(change)}
                                  className={`flex items-center gap-3 px-2 py-1.5 rounded border cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-primary/10 border-primary shadow-sm'
                                      : 'bg-input/20 border-border/40 hover:bg-bg-hover hover:border-border'
                                  }`}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={isStaged}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setStagedFiles([...stagedFiles, change.path])
                                      } else {
                                        setStagedFiles(stagedFiles.filter(p => p !== change.path))
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                                  />

                                  <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold border rounded-full flex-shrink-0 ${statusClass}`}>
                                    {statusLabel}
                                  </span>

                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-text-primary truncate flex items-center gap-1.5">
                                      <span>{change.type === 'notebook' ? '📓' : '📄'}</span>
                                      <span className="truncate">{change.path}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Commit input form at bottom of uncommitted changes */}
                    {uncommittedChanges.length > 0 && (
                      <form onSubmit={handleUncommittedCommitSubmit} className="pt-2.5 mt-1 border-t border-border/30 space-y-2 flex-shrink-0">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Enter commit message for staged changes..."
                            value={uncommittedMessage}
                            onChange={(e) => setUncommittedMessage(e.target.value)}
                            className="w-full bg-input border border-border/80 text-text-primary text-xs rounded px-2.5 py-1.5 outline-none font-medium"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSyncing || !uncommittedMessage.trim() || stagedFiles.length === 0}
                          className="w-full py-1.5 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <GitCommit className="w-3.5 h-3.5" />
                          <span>{isSyncing ? 'Committing...' : `Commit Staged Changes (${stagedFiles.length})`}</span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                /* Git Tree View */
                <div className="flex flex-col space-y-2">
                  <div className="text-[10px] font-bold text-text-muted uppercase">Version Tree</div>
                  <div className="relative border border-border/40 bg-[#16161a] rounded p-2 overflow-y-auto h-[450px] scrollbar-thin">
                    {/* Vertical timeline connector */}
                    {filteredCommits.length > 0 && (
                      <div className="absolute left-[28px] top-4 bottom-4 w-[2px] bg-primary/50 pointer-events-none" />
                    )}

                    <div className="space-y-1.5 relative z-10">
                      {filteredCommits.map((commit) => {
                        const isSelected = previewingCommitId === commit.id
                        const shortId = commit.id.replace('commit_', '').slice(-7)
                        const isStash = commit.message.startsWith('[Stash]')
                        
                        const formattedTime = new Date(commit.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        }) + ', ' + new Date(commit.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })

                        return (
                          <div 
                            key={commit.id} 
                            onClick={() => fetchCommitPreview(commit.id)}
                            className={`flex items-center gap-4 pl-3 pr-3 py-1.5 rounded border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-primary/10 border-primary shadow-sm' 
                                : 'bg-input/20 border-border/40 hover:bg-bg-hover hover:border-border'
                            }`}
                          >
                            {/* Dot Node */}
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
                              isSelected 
                                ? 'bg-primary border-primary shadow-[0_0_8px_rgba(124,58,237,0.5)]' 
                                : isStash 
                                  ? 'bg-amber-500/20 border-amber-500/60' 
                                  : 'bg-[#1c1c1e] border-text-secondary hover:border-primary'
                            }`}>
                              <div className="w-1.5 h-1.5 bg-[#16161a] rounded-full" />
                            </div>

                            {/* Commit details */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-semibold truncate ${
                                  isSelected ? 'text-primary' : isStash ? 'text-amber-500' : 'text-text-primary'
                                }`}>{commit.message}</span>
                              </div>
                              <div className="text-[10px] text-text-primary flex flex-wrap items-center gap-1.5 mt-0.5 font-medium">
                                <UserBadge 
                                  username={commit.created_by} 
                                  avatarSize="xs" 
                                  isClickable={true} 
                                />
                                <span className="text-text-muted">•</span>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(commit.id)
                                    showToast({
                                      type: 'success',
                                      title: 'Hash Copied',
                                      message: 'Commit hash copied to clipboard.',
                                      duration: 1500
                                    })
                                  }}
                                  className="px-1.5 py-0.5 bg-[#252526] hover:bg-[#323233] hover:text-primary border border-border/80 rounded text-[9px] font-mono text-text-primary flex-shrink-0 cursor-pointer font-bold select-none transition-all active:scale-95"
                                  title="Click to copy commit hash"
                                >
                                  {shortId}
                                </span>
                                <span className="text-text-muted">•</span>
                                <span className="px-1.5 py-0.5 bg-input border border-border/50 rounded text-[9px] font-bold text-text-primary max-w-[120px] truncate">
                                  {commit.scope === 'workspace' ? 'Workspace' : commit.scope.split('/').pop()}
                                </span>
                                <span className="text-text-muted">•</span>
                                <span className="px-1.5 py-0.5 bg-[#a855f7]/10 border border-[#a855f7]/25 text-[#d8b4fe] rounded text-[9px] font-bold flex items-center gap-1 font-mono">
                                  <GitBranch className="w-2.5 h-2.5 text-[#d8b4fe]" />
                                  <span>{commit.branch || 'main'}</span>
                                </span>
                                <span className="text-text-muted">•</span>
                                <span className="text-text-primary font-semibold">{formattedTime}</span>
                              </div>
                            </div>
                            
                            {/* Action Restore */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRollback(commit.id)
                              }}
                              disabled={isSyncing}
                              className="p-1 text-text-secondary hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
                              title="Restore to this version"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}

                      {filteredCommits.length === 0 && (
                        <div className="text-center text-xs text-text-muted py-12 font-medium">
                          No commits found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Preview Panel */}
              <div className="flex flex-col space-y-2">
                <div className="text-[10px] font-bold text-text-muted uppercase">Code Preview</div>
                <div className="border border-border/40 bg-[#16161a] rounded p-3 flex flex-col h-[450px] overflow-hidden">
                  {historyFilter === 'uncommitted' ? (
                    previewingUncommittedFile ? (
                      (() => {
                        const oldFile = previewingUncommittedFile.oldContent
                        const newFile = previewingUncommittedFile.currentContent

                        const oldText = oldFile 
                          ? (typeof oldFile.content === 'string' ? oldFile.content : JSON.stringify(oldFile.content, null, 2))
                          : ""
                        const newText = newFile
                          ? (typeof newFile.content === 'string' ? newFile.content : JSON.stringify(newFile.content, null, 2))
                          : ""

                        const diffLines = computeLineDiff(oldText, newText)

                        return (
                          <div className="flex-1 flex flex-col min-h-0">
                            {/* Sub-header inside diff panel */}
                            <div className="text-[10px] font-bold text-text-muted uppercase mb-2 border-b border-border/40 pb-1 flex items-center justify-between">
                              <span className="truncate pr-2">📄 Diff: {previewingUncommittedFile.path}</span>
                              <span className={`text-[8px] px-1 py-0.5 rounded flex-shrink-0 font-mono ${
                                previewingUncommittedFile.status === 'added' 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : previewingUncommittedFile.status === 'deleted'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {previewingUncommittedFile.status.toUpperCase()}
                              </span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin min-h-0 border border-border/30 rounded bg-[#101014] font-mono text-[9px] p-2 space-y-0.5">
                              {diffLines.map((line, idx) => {
                                let lineClass = 'text-text-secondary'
                                let prefix = ' '
                                if (line.type === 'added') {
                                  lineClass = 'bg-emerald-950/20 text-emerald-400 border-l-2 border-emerald-500 pl-1.5'
                                  prefix = '+'
                                } else if (line.type === 'removed') {
                                  lineClass = 'bg-rose-950/20 text-rose-400 border-l-2 border-rose-500 pl-1.5'
                                  prefix = '-'
                                } else {
                                  lineClass = 'text-text-muted pl-2 opacity-65'
                                }

                                return (
                                  <div key={idx} className={`whitespace-pre break-all ${lineClass}`}>
                                    <span className="select-none inline-block w-3 text-[8px] text-text-muted/40 mr-1.5">{prefix}</span>
                                    {line.text}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                        <div className="text-3xl mb-2 opacity-40">📝</div>
                        <p className="text-[10px] text-text-muted font-semibold leading-relaxed max-w-[180px]">
                          Select an uncommitted change in the list to view its line-by-line diff.
                        </p>
                      </div>
                    )
                  ) : previewingCommitId ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Sub-header inside preview panel */}
                      <div className="text-[10px] font-bold text-text-muted uppercase mb-2 border-b border-border/40 pb-1 flex items-center justify-between">
                        <span>
                          {previewingFilePath ? '📄 Notebook Cells' : '📁 Choose File'}
                        </span>
                        <span className="text-[9px] font-mono text-[#00b4d8]">
                          {previewingCommitId.replace('commit_', '').slice(-7)}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin text-xs min-h-0">
                        {/* 1. File List Preview */}
                        {!previewingFilePath ? (
                          <div className="space-y-1.5">
                            {previewingFilesList?.map((file) => (
                      <div 
                                key={file.path} 
                                onClick={() => fetchCommitPreview(previewingCommitId, file.path)}
                                className="p-2 bg-input border border-border/20 rounded hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span>{file.type === 'notebook' ? '📓' : '📄'}</span>
                                  <span className="truncate font-medium text-text-secondary">{file.path}</span>
                                </div>
                                <span className="text-[9px] text-text-muted font-mono">{file.type}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // 2. Notebook cell structure preview
                          <div className="space-y-2">
                            <button 
                              onClick={() => {
                                setPreviewingFilePath(null)
                                setPreviewingFileContent(null)
                              }}
                              className="text-[9px] text-primary hover:underline font-bold mb-2 flex items-center gap-1 cursor-pointer"
                            >
                              ← Back to File List
                            </button>

                            <div className="p-2 bg-card rounded border border-border/60 text-[10px] font-bold truncate text-text-primary mb-2 flex items-center justify-between">
                              <span>📄 {previewingFilePath.split('/').pop()}</span>
                              <span className="text-[8px] bg-primary/20 px-1 py-0.5 rounded text-primary">Preview</span>
                            </div>

                            {previewingFileContent?.content?.cells ? (
                              <div className="space-y-3">
                                {previewingFileContent.content.cells.slice(0, 10).map((cell: any, cellIdx: number) => (
                                  <div key={cell.id || cellIdx} className="border border-border/20 rounded bg-card overflow-hidden">
                                    <div className="bg-[#1c1c1e] px-2 py-0.5 border-b border-border/10 flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-text-muted">
                                      <span>{cell.cell_type} cell</span>
                                      {cell.cell_type === 'code' && <span>In [{cell.execution_count || ' '}]</span>}
                                    </div>
                                    {cell.cell_type === 'code' ? (
                                      <pre 
                                        className="p-2 text-[9px] font-mono whitespace-pre-wrap break-all bg-input/40 text-text-secondary max-h-32 overflow-y-auto"
                                        dangerouslySetInnerHTML={{
                                          __html: highlightPython(Array.isArray(cell.source) ? cell.source.join('') : cell.source)
                                        }}
                                      />
                                    ) : (
                                      <div 
                                        className="p-2 text-[10px] font-sans leading-relaxed text-text-secondary bg-[#1b1b1f]/30 max-h-32 overflow-y-auto"
                                        dangerouslySetInnerHTML={{
                                          __html: formatMarkdown(Array.isArray(cell.source) ? cell.source.join('') : cell.source)
                                        }}
                                      />
                                    )}
                                  </div>
                                ))}
                                {previewingFileContent.content.cells.length > 10 && (
                                  <div className="text-center text-[10px] text-text-muted italic py-1 border-t border-border/10">
                                    + {previewingFileContent.content.cells.length - 10} more cells in this notebook...
                                  </div>
                                )}
                              </div>
                            ) : (
                              // 3. Text/General file preview
                              previewingFilePath?.endsWith('.py') ? (
                                <pre 
                                  className="p-2 bg-card border border-border/30 rounded font-mono text-[9px] text-text-secondary whitespace-pre-wrap break-all max-h-64 overflow-y-auto"
                                  dangerouslySetInnerHTML={{
                                    __html: highlightPython(typeof previewingFileContent?.content === 'string' ? previewingFileContent.content : '')
                                  }}
                                />
                              ) : (
                                <pre className="p-2 bg-card border border-border/30 rounded font-mono text-[9px] text-text-secondary whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                                  {typeof previewingFileContent?.content === 'string'
                                    ? previewingFileContent.content
                                    : JSON.stringify(previewingFileContent?.content, null, 2)}
                                </pre>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                      <div className="text-3xl mb-2 opacity-40">🌳</div>
                      <p className="text-[10px] text-text-muted font-semibold leading-relaxed max-w-[180px]">
                        Select a version node in the tree to preview notebook code cells before reverting.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* ── CREATE BRANCH MODAL ── */}
        <Modal
          isOpen={showCreateBranchModal}
          onClose={() => setShowCreateBranchModal(false)}
          title="Create New Branch"
          description={`Branch off from your current active version on "${activeBranch}".`}
        >
          <form 
            onSubmit={async (e) => {
              e.preventDefault()
              const bname = newBranchName.trim().replace(/[^a-zA-Z0-9_\-/]+/g, '')
              if (!bname) return
              
              setIsSyncing(true)
              try {
                const dbName = `JupyterLite Storage - ${workspaceScope}`
                const currentFiles = await readAllFromIndexedDB(dbName, "files")
                if (Object.keys(currentFiles).length > 0) {
                  await apiFetch('/workspaces/sync', {
                    method: 'POST',
                    body: JSON.stringify({
                      workspace_id: workspaceScope,
                      branch: activeBranch,
                      files: currentFiles
                    })
                  })
                }

                const res = await apiFetch<any>(`/workspaces/${workspaceScope}/branches/create`, {
                  method: 'POST',
                  body: JSON.stringify({
                    branch_name: bname,
                    source_branch: activeBranch
                  })
                })
                
                if (res.active_branch) {
                  setActiveBranch(res.active_branch)
                  
                  if (jupyterIframeRef.current) {
                    const currentSrc = jupyterIframeRef.current.src
                    const urlObj = new URL(currentSrc, window.location.href)
                    urlObj.searchParams.set('t', Date.now().toString())
                    jupyterIframeRef.current.src = urlObj.toString()
                  }
                  
                  setShowCreateBranchModal(false)
                  showToast({
                    type: 'success',
                    title: 'Branch Created',
                    message: `Successfully branched "${bname}" off "${activeBranch}".`,
                    duration: 3000
                  })
                }
              } catch (err) {
                showToast({
                  type: 'error',
                  title: 'Branch Creation Failed',
                  message: err instanceof Error ? err.message : String(err),
                  duration: 5000
                })
              } finally {
                setIsSyncing(false)
              }
            }} 
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Branch Name</label>
              <input
                type="text"
                placeholder="e.g. feature-analysis, bugfix/data-load"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full bg-input border border-border/80 text-text-primary text-xs rounded p-2 outline-none font-medium"
                required
              />
              <span className="text-[10px] text-text-muted">Only letters, numbers, hyphens, slashes, and underscores are allowed.</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateBranchModal(false)}
                className="px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSyncing || !newBranchName.trim()}
                className="px-3 py-1.5 bg-primary text-white hover:bg-primary-hover disabled:opacity-50 rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Create and Checkout
              </button>
            </div>
          </form>
        </Modal>

        {/* ── MERGE BRANCH MODAL ── */}
        <Modal
          isOpen={showMergeBranchModal}
          onClose={() => setShowMergeBranchModal(false)}
          title="Merge Branch"
          description={`Select a branch to merge into your current checked-out branch "${activeBranch}".`}
        >
          <form 
            onSubmit={async (e) => {
              e.preventDefault()
              if (!mergeSourceBranch) return
              
              setIsSyncing(true)
              try {
                const dbName = `JupyterLite Storage - ${workspaceScope}`
                const currentFiles = await readAllFromIndexedDB(dbName, "files")
                if (Object.keys(currentFiles).length > 0) {
                  await apiFetch('/workspaces/sync', {
                    method: 'POST',
                    body: JSON.stringify({
                      workspace_id: workspaceScope,
                      branch: activeBranch,
                      files: currentFiles
                    })
                  })
                }

                const res = await apiFetch<any>(`/workspaces/${workspaceScope}/branches/merge`, {
                  method: 'POST',
                  body: JSON.stringify({
                    source_branch: mergeSourceBranch,
                    target_branch: activeBranch
                  })
                })
                
                if (res.status === 'ok') {
                  if (res.files) {
                    await writeAllToIndexedDB(dbName, "files", res.files)
                  }
                  
                  if (jupyterIframeRef.current) {
                    const currentSrc = jupyterIframeRef.current.src
                    const urlObj = new URL(currentSrc, window.location.href)
                    urlObj.searchParams.set('t', Date.now().toString())
                    jupyterIframeRef.current.src = urlObj.toString()
                  }
                  
                  setShowMergeBranchModal(false)
                  showToast({
                    type: 'success',
                    title: 'Merge Successful',
                    message: `Branch "${mergeSourceBranch}" merged into "${activeBranch}" successfully.`,
                    duration: 3000
                  })
                } else if (res.status === 'conflict') {
                  if (res.files) {
                    await writeAllToIndexedDB(dbName, "files", res.files)
                  }
                  
                  if (jupyterIframeRef.current) {
                    const currentSrc = jupyterIframeRef.current.src
                    const urlObj = new URL(currentSrc, window.location.href)
                    urlObj.searchParams.set('t', Date.now().toString())
                    jupyterIframeRef.current.src = urlObj.toString()
                  }
                  
                  setShowMergeBranchModal(false)
                  
                  const historyRes = await apiFetch<any[]>(`/workspaces/${workspaceScope}/history`)
                  setCommitHistory(historyRes || [])
                  await loadUncommittedChangesWithHistory(historyRes || [])
                  
                  setHistoryFilter('uncommitted')
                  setShowHistoryModal(true)
                  
                  showToast({
                    type: 'warning',
                    title: 'Merge Conflicts Detected',
                    message: `Please review conflict markers inside files and commit resolution.`,
                    duration: 10000
                  })
                }
              } catch (err) {
                showToast({
                  type: 'error',
                  title: 'Merge Failed',
                  message: err instanceof Error ? err.message : String(err),
                  duration: 5000
                })
              } finally {
                setIsSyncing(false)
              }
            }} 
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Source Branch (Incoming Changes)</label>
              <select
                value={mergeSourceBranch}
                onChange={(e) => setMergeSourceBranch(e.target.value)}
                className="w-full bg-input border border-border/80 text-text-primary text-xs rounded p-2 outline-none font-medium cursor-pointer"
                required
              >
                <option value="">-- Choose Branch to Merge From --</option>
                {Object.keys(branchesList.branches || {}).map(bname => {
                  if (bname === activeBranch) return null
                  return (
                    <option key={bname} value={bname}>
                      {bname}
                    </option>
                  )
                })}
              </select>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMergeBranchModal(false)}
                className="px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSyncing || !mergeSourceBranch}
                className="px-3 py-1.5 bg-[#00b4d8] text-white hover:bg-[#00b4d8]/90 disabled:opacity-50 rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Merge Changes
              </button>
            </div>
          </form>
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
              onNavigate={(page) => {
                if (!confirmLeaveWorkspace()) return
                setShowWorkspace(false)
                onNavigate(page)
              }}
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
          title={showWorkspace
            ? (activeWorkspaceDisplayName || getCurrentWorkspaceName() || 'Notebook Workspace')
            : getPageTitle(currentPage)}
          userRole={userRole}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onSelectJupyter={handleSelectJupyter}
          activeJupyter={activeJupyterWorkspace}
          hasActiveWorkspace={activeJupyterWorkspace !== null}
          showWorkspace={showWorkspace}
          onGoToWorkspace={() => setShowWorkspace(true)}
          onShowShortcuts={() => setShowShortcutsModal(true)}
          onNavigate={(page, targetTab) => {
            if (!confirmLeaveWorkspace()) return
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
              className={`p-0 ${
                isFocusMode
                  ? 'fixed inset-0 w-screen h-screen z-[100] bg-background'
                  : 'flex-1 h-full min-h-0'
              } ${
                showWorkspace
                  ? 'relative'
                  : 'absolute -top-[9999px] -left-[9999px] w-0 h-0 overflow-hidden pointer-events-none'
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
              className={`p-0 ${
                isFocusMode
                  ? 'fixed inset-0 w-screen h-screen z-[100] bg-background'
                  : 'flex-1 h-full min-h-0'
              } ${
                showWorkspace
                  ? 'relative'
                  : 'absolute -top-[9999px] -left-[9999px] w-0 h-0 overflow-hidden pointer-events-none'
              }`}
            >
              {renderJupyterLiteFrame()}
            </div>
          )}

          {/* Regular Page Render */}
          <div className={`flex-1 min-h-0 overflow-y-auto ${!showWorkspace ? 'block animate-fade-in-up' : 'hidden'}`}>
            {renderPage(currentPage, userRole, username || '', handleLaunchWorkspace, onNavigate)}
          </div>
        </main>
      </div>
      {/* ── KEYBOARD SHORTCUTS CHEAT SHEET MODAL ── */}
      {showShortcutsModal && (
        <Modal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
          title="Keyboard Shortcuts Cheat Sheet"
          description="Use these keyboard shortcuts to navigate the DEP workbench faster."
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
              <div className="p-3 bg-input rounded border border-border/40 space-y-2">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Navigation</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Dashboard</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 1</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Connections</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 2</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Catalog</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 3</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Explorer</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 4</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Saved Artifacts</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 5</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">User Directory</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 6</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Audit Trails</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 7</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Tutorials</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 8</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Settings</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + 9</kbd>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-input rounded border border-border/40 space-y-2">
                <h4 className="text-xs font-bold text-[#00b4d8] uppercase tracking-wider">Playground / Lite</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Launch Sandbox</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + W</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Exit Workspace</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + L</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Toggle Focus Mode</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + F</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Switch Workspace</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + S</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Commit Snapshot</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + C</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">History Timeline</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + H</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Promote Notebook</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + P</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Close any Modal</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Shortcuts Help</span>
                    <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">Alt + K</kbd>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 bg-primary text-white rounded hover:bg-primary-hover text-xs font-semibold transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </Modal>
      )}
      <OnboardingTour
        isOpen={tourActive}
        onClose={() => setTourActive(false)}
        currentPage={currentPage}
        username={username || ''}
        tourName={activeTour}
        userRole={userRole}
      />
    </div>
  )
}
