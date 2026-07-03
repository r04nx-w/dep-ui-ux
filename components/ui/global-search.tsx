'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Database, BookOpen, Terminal, User, Folder, FileSpreadsheet, CornerDownLeft } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { UserBadge } from '@/components/ui/user-badge'

interface SearchResult {
  id: string
  title: string
  type: 'catalog' | 'dataset' | 'user' | 'project' | 'notebook' | 'output' | 'tutorial'
  description?: string
  pageId?: string
}

const localPages = [
  { id: 'nav-dashboard', title: 'Dashboard Console', type: 'project' as const, description: 'Go to workspace main activity dashboard', pageId: 'dashboard' },
  { id: 'nav-tutorials', title: 'Tutorials & SDK Guides', type: 'tutorial' as const, description: 'Open interactive onboarding and SDK references', pageId: 'tutorials' },
  { id: 'nav-connections', title: 'Data Connections (MySQL/PostgreSQL)', type: 'dataset' as const, description: 'Manage connection credentials and secure ports', pageId: 'connections' },
  { id: 'nav-catalog', title: 'Resource Catalog Builder', type: 'catalog' as const, description: 'Define metadata schemas and structural tables', pageId: 'catalog' },
  { id: 'nav-acl', title: 'Governance & ACL Rules', type: 'catalog' as const, description: 'Set cell security and column masking rules', pageId: 'acl' },
  { id: 'nav-explorer', title: 'Catalog Explorer', type: 'catalog' as const, description: 'Explore data directories and tables', pageId: 'explorer' },
  { id: 'nav-access', title: 'My Data Access Requests', type: 'user' as const, description: 'Review security clearance requests', pageId: 'access' },
  { id: 'nav-workspaces', title: 'Project Workspaces & Notebooks', type: 'project' as const, description: 'Launch collaborative Jupyter sandboxes', pageId: 'workspaces' },
  { id: 'nav-artifacts', title: 'Saved Artifacts & Outputs', type: 'output' as const, description: 'View MinIO export file logs', pageId: 'artifacts' },
  { id: 'nav-users', title: 'User Directory', type: 'user' as const, description: 'Manage members and roles', pageId: 'users' },
  { id: 'nav-audit', title: 'System Audit Trails', type: 'user' as const, description: 'Review security compliance logs', pageId: 'audit' },
]

const localTutorials = [
  { id: 'tutorial-onboard-db', title: 'Tutorial: Onboarding MySQL or PostgreSQL Data Source', type: 'tutorial' as const, description: 'Learn to connect databases securely' },
  { id: 'tutorial-create-acl', title: 'Tutorial: Creating Access Control List (ACL) Policies', type: 'tutorial' as const, description: 'Define governance rules and row filtering' },
  { id: 'tutorial-manage-projects', title: 'Tutorial: Creating Projects & Managing Team Members', type: 'tutorial' as const, description: 'Organize collaborative workspaces' },
  { id: 'tutorial-access-workspace', title: 'Tutorial: Accessing the Sandbox Workspace', type: 'tutorial' as const, description: 'Launch isolated Pyodide Jupyter environments' },
  { id: 'tutorial-share-outputs', title: 'Tutorial: Saving Notebook Outputs & Sharing', type: 'tutorial' as const, description: 'Store results and manage download permissions' },
]

interface GlobalSearchProps {
  onNavigate?: (page: string, targetTab?: string) => void
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const typeColors: Record<SearchResult['type'], string> = {
    catalog: 'bg-[#569cd6]/20 text-[#569cd6]',
    dataset: 'bg-[#6a9955]/20 text-[#6a9955]',
    user: 'bg-[#ce9178]/20 text-[#ce9178]',
    project: 'bg-primary/20 text-primary',
    notebook: 'bg-[#d4a96f]/20 text-[#d4a96f]',
    output: 'bg-[#4caf50]/20 text-[#4caf50]',
    tutorial: 'bg-[#007acc]/20 text-[#007acc]',
  }

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Debounced API & Hybrid Local Search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    const delayDebounceFn = setTimeout(async () => {
      try {
        const qLower = query.toLowerCase()
        
        // 1. Search local components & pages (hybrid)
        const localMatches = [
          ...localPages.filter(
            (p) =>
              p.title.toLowerCase().includes(qLower) ||
              p.description.toLowerCase().includes(qLower)
          ),
          ...localTutorials.filter(
            (t) =>
              t.title.toLowerCase().includes(qLower) ||
              t.description.toLowerCase().includes(qLower)
          ),
        ]

        // 2. Fetch remote DB records from endpoint
        let remoteMatches: SearchResult[] = []
        try {
          remoteMatches = await apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`)
        } catch (err) {
          console.error('Remote search error:', err)
        }

        // 3. Merge matches and deduplicate by ID, or title + type
        const merged: SearchResult[] = [...localMatches]
        remoteMatches.forEach((rm) => {
          const isDup = merged.some(
            (m) =>
              m.id === rm.id ||
              (m.title.toLowerCase() === rm.title.toLowerCase() && m.type === rm.type)
          )
          if (!isDup) {
            merged.push(rm)
          }
        })

        setResults(merged)
        setSelectedIndex(0)
      } catch (err) {
        console.error('Hybrid search error:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  // Keyboard navigation inside search results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleItemClick(results[selectedIndex])
    }
  }

  const handleItemClick = (item: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    setResults([])

    if (!onNavigate) return

    // If it is a local page navigation
    if (item.pageId) {
      onNavigate(item.pageId)
      return
    }

    // Navigate to page based on item type
    switch (item.type) {
      case 'dataset':
        onNavigate('connections')
        break
      case 'catalog':
        onNavigate('explorer')
        break
      case 'project':
        onNavigate('workspaces')
        break
      case 'notebook':
        onNavigate('workspaces')
        break
      case 'output':
        onNavigate('artifacts')
        break
      case 'user':
        const userId = item.id.replace('user-', '')
        localStorage.setItem('dep_search_target_user_id', userId)
        onNavigate('users')
        break
      case 'tutorial':
        const tab = item.id.replace('tutorial-', '')
        onNavigate('tutorials', tab)
        break
      default:
        onNavigate('dashboard')
    }
  }

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'dataset':
      case 'catalog':
        return <Database className="w-4 h-4 text-[#6a9955]" />
      case 'user':
        return <User className="w-4 h-4 text-[#ce9178]" />
      case 'project':
        return <Folder className="w-4 h-4 text-primary" />
      case 'notebook':
        return <Terminal className="w-4 h-4 text-[#d4a96f]" />
      case 'output':
        return <FileSpreadsheet className="w-4 h-4 text-[#4caf50]" />
      case 'tutorial':
        return <BookOpen className="w-4 h-4 text-[#007acc]" />
      default:
        return <Search className="w-4 h-4" />
    }
  }

  return (
    <>
      {/* Header Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-between w-80 px-3 py-2 bg-input border border-border rounded text-sm text-text-secondary hover:border-primary/50 transition-all text-left"
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-text-muted" />
          <span>Search everything...</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-card border border-border text-[10px] font-mono rounded text-text-muted">
          <span>Ctrl</span><span>K</span>
        </kbd>
      </button>

      {/* Fullscreen Backdrop Blur Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-24 bg-black/35 backdrop-blur-sm animate-fade-in">
          {/* Click outside backdrop */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          {/* Search Content Window */}
          <div className="relative bg-card border border-border w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
            {/* Input bar */}
            <div className={`p-4 flex items-center gap-3 relative bg-input ${query ? 'border-b border-border' : ''}`}>
              <Search className="w-5 h-5 text-text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search datasets, catalogs, projects, notebooks, outputs, tutorials..."
                className="w-full bg-transparent text-text-primary text-base placeholder-text-muted focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 hover:bg-bg-hover text-text-muted hover:text-text-primary rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="px-1.5 py-0.5 bg-card border border-border text-[10px] font-mono rounded text-text-muted">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results body */}
            {query && (
              <div className="flex-1 overflow-y-auto p-2 min-h-[100px]">
                {loading && (
                  <div className="flex items-center justify-center py-12 text-sm text-text-muted gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Searching databases & metadata...</span>
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="space-y-1">
                    {results.map((result, idx) => (
                      <button
                        key={result.id}
                        onClick={() => handleItemClick(result)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-4 py-3 rounded-md transition-colors flex items-center justify-between ${
                          idx === selectedIndex ? 'bg-primary/10 border-l-4 border-primary pl-3' : 'hover:bg-bg-hover'
                        }`}
                      >
                   <div className="flex items-center gap-3">
                          {result.type === 'user' ? (
                            (() => {
                              const [uname, role] = (result.description || '').split('|')
                              const roleColorMap: Record<string, string> = {
                                'Super Admin': 'bg-[#f44747]/10 text-[#f44747] border-[#f44747]/25',
                                'Data Onboarder': 'bg-[#569cd6]/10 text-[#569cd6] border-[#569cd6]/25',
                                'Analyst': 'bg-[#6a9955]/10 text-[#6a9955] border-[#6a9955]/25',
                              }
                              const roleColor = roleColorMap[role] || 'bg-primary/10 text-primary border-primary/25'
                              return (
                                <div className="flex items-center gap-2.5">
                                  <UserBadge
                                    username={uname || result.title}
                                    fullName={result.title}
                                    avatarSize="md"
                                    hideName={true}
                                    isClickable={false}
                                  />
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-semibold text-text-primary leading-tight">{result.title}</span>
                                    <div className="flex items-center gap-1.5">
                                      {uname && (
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-input border border-border text-text-muted">
                                          @{uname}
                                        </span>
                                      )}
                                      {role && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleColor}`}>
                                          {role}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })()
                          ) : (
                            <>
                              <div className="flex-shrink-0 w-8 h-8 rounded bg-input border border-border flex items-center justify-center overflow-hidden">
                                {getTypeIcon(result.type)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-text-primary leading-tight">
                                  {result.title}
                                </p>
                                {result.description && (
                                  <p className="text-xs text-text-secondary mt-0.5 truncate max-w-lg">
                                    {result.description}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase whitespace-nowrap ml-2 ${typeColors[result.type]}`}>
                            {result.type}
                          </span>
                          {idx === selectedIndex && (
                            <CornerDownLeft className="w-3.5 h-3.5 text-text-muted" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!loading && results.length === 0 && (
                  <div className="text-center py-12 text-sm text-text-muted">
                    No matching results found in dataset, projects, notebooks, outputs, users, or tutorials.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
