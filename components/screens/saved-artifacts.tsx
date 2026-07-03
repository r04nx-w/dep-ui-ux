'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Download,
  Eye,
  Trash2,
  Share2,
  FileText,
  Image as ImageIcon,
  FileJson,
  Search,
  X,
  Users,
  User,
  Tag,
  FolderOpen,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
} from 'lucide-react'
import { ViewToggle } from '@/components/ui/view-toggle'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { apiFetch, API_BASE_URL } from '@/lib/api'

type ViewType = 'grid' | 'list' | 'compact'

interface Artifact {
  id: string
  name: string
  type: 'csv' | 'png' | 'pdf' | 'json' | 'html' | 'txt' | 'md'
  size: string
  sizeBytes: number
  source: string
  workspace: string
  notebook: string
  date: string
  tags: string[]
  isShared: boolean
  owner?: string
  shareId?: string
}

interface SharedUser {
  id: string
  name: string
  email?: string
  isTeam: boolean
  role: string
  sharedAt: string
}

const typeIcons = {
  csv: FileText,
  pdf: FileText,
  png: ImageIcon,
  json: FileJson,
  html: FileText,
  txt: FileText,
  md: FileText,
}

function formatWorkspaceName(rawScope: string): string {
  if (!rawScope) return 'Personal Sandbox'
  if (rawScope === 'user_sandbox') return 'Personal Sandbox'
  // Pattern: user_{username}_sandbox → Personal Sandbox
  if (/^user_.+_sandbox$/.test(rawScope)) return 'Personal Sandbox'
  if (rawScope === 'project_vwap_trading') return 'VWAP Algorithmic Trading'
  if (rawScope === 'project_analytics') return 'Financial Analytics Project'
  if (rawScope.startsWith('project_')) {
    return rawScope
      .replace('project_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') + ' Project'
  }
  if (rawScope.startsWith('team_')) {
    return rawScope
      .replace('team_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') + ' Team'
  }
  return rawScope
}

export function SavedArtifacts() {
  const [viewType, setViewType] = useState<ViewType>('list')
  const [loading, setLoading] = useState(true)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  
  // Modals & Selection States
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null)
  const [previewContent, setPreviewContent] = useState<any>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  
  const [shareArtifact, setShareArtifact] = useState<Artifact | null>(null)
  const [shareList, setShareList] = useState<SharedUser[]>([])
  const [shareListLoading, setShareListLoading] = useState(false)
  const [newTagsString, setNewTagsString] = useState('')
  const [isSavingTags, setIsSavingTags] = useState(false)
  
  const [deleteArtifact, setDeleteArtifact] = useState<Artifact | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Convert to Dataset Modal States
  const [convertArtifact, setConvertArtifact] = useState<Artifact | null>(null)
  const [datasetName, setDatasetName] = useState('')
  const [isConverting, setIsConverting] = useState(false)


  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedShares, setExpandedShares] = useState<Record<string, boolean>>({})
  const [sharesCache, setSharesCache] = useState<Record<string, SharedUser[]>>({})

  // Directory targets for sharing
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [sharingTargetsSearch, setSharingTargetsSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [isShareTargetDropdownOpen, setIsShareTargetDropdownOpen] = useState(false)

  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const triggerAlert = (type: typeof alertState.type, title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message })
  }

  // Load active catalog, shared, users, and teams list
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ownedList, sharedList, usersList, teamsList] = await Promise.all([
        apiFetch<any[]>('/outputs').catch(() => []),
        apiFetch<any[]>('/outputs/shared-with-me').catch(() => []),
        apiFetch<any[]>('/users').catch(() => []),
        apiFetch<any[]>('/teams').catch(() => []),
      ])

      setAllUsers(usersList || [])
      setAllTeams(teamsList || [])

      // Map owned outputs
      const mappedOwned: Artifact[] = ownedList.map((item): Artifact => {
        const ext = item.filename.split('.').pop()?.toLowerCase() || 'txt'
        const tagsList = item.tags ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
        // Use the real notebook name stored by the SDK — never fall back to a hardcoded name
        const notebookName = item.notebook && item.notebook.trim()
          ? item.notebook.trim()
          : 'Unknown Notebook'
        const workspaceRaw = item.workspace || 'user_sandbox'
        return {
          id: String(item.id),
          name: item.filename,
          type: ext as any,
          size: `${(item.size_bytes / (1024 * 1024)).toFixed(2)} MB`,
          sizeBytes: item.size_bytes,
          workspace: workspaceRaw,
          notebook: notebookName,
          source: `${workspaceRaw} / ${notebookName}`,
          date: new Date(item.created_at).toISOString().split('T')[0],
          tags: tagsList,
          isShared: false,
        }
      })

      // Map shared outputs
      const mappedShared: Artifact[] = sharedList.map((item): Artifact => {
        const ext = item.filename.split('.').pop()?.toLowerCase() || 'txt'
        return {
          id: String(item.output_id),
          shareId: String(item.share_id),
          name: item.filename,
          type: ext as any,
          size: `${(item.size_bytes / (1024 * 1024)).toFixed(2)} MB`,
          sizeBytes: item.size_bytes,
          workspace: 'shared_workspace',
          notebook: 'collaborative_notebook.ipynb',
          source: `Shared by @${item.owner_username} ${item.via_team_name ? `via team ${item.via_team_name}` : ''}`,
          date: new Date(item.created_at).toISOString().split('T')[0],
          tags: ['Shared'],
          isShared: true,
          owner: item.owner_username,
        }
      })

      const combined = [...mappedOwned, ...mappedShared]
      setArtifacts(combined)

      // Fetch shares for all owned artifacts to populate caches for "see more" list
      const caches: Record<string, SharedUser[]> = {}
      await Promise.all(
        mappedOwned.map(async (art) => {
          try {
            const grants = await apiFetch<any[]>(`/outputs/${art.id}/share`)
            caches[art.id] = grants.map((g): SharedUser => ({
              id: String(g.share_id),
              name: g.username || g.team_name || 'Collaborator',
              email: g.username ? `${g.username}@company.com` : undefined,
              isTeam: !!g.team_id,
              role: 'Viewer',
              sharedAt: new Date(g.created_at).toLocaleDateString(),
            }))
          } catch (e) {
            caches[art.id] = []
          }
        })
      )
      setSharesCache(caches)

    } catch (err: any) {
      console.error(err)
      triggerAlert('error', 'Failed to load artifacts', err.message || 'Error occurred while loading.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Download logic (streamed as a blob securely via authenticated endpoint)
  const handleDownload = async (artifact: Artifact) => {
    try {
      const url = artifact.isShared
        ? `${API_BASE_URL}/outputs/shared/${artifact.shareId}/download`
        : `${API_BASE_URL}/outputs/${artifact.id}/download`

      const token = localStorage.getItem('dep_jwt_token') || localStorage.getItem('token')
      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = artifact.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      triggerAlert('success', 'Download Complete', `${artifact.name} downloaded successfully.`)
    } catch (err: any) {
      console.error(err)
      triggerAlert('error', 'Download Failed', err.message || 'Could not stream download file.')
    }
  }

  // Load preview data dynamically
  const loadPreview = async (artifact: Artifact) => {
    // Revoke any previous blob URL to avoid memory leaks
    setPreviewBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setPreviewArtifact(artifact)
    setPreviewLoading(true)
    setPreviewContent(null)

    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes((artifact.type || '').toLowerCase())
    const token = localStorage.getItem('dep_jwt_token') || localStorage.getItem('token')
    const headers: Record<string, string> = { Authorization: token ? `Bearer ${token}` : '' }

    try {
      if (isImage) {
        // For images, stream raw binary directly and create a blob URL
        const streamUrl = artifact.isShared
          ? `${API_BASE_URL}/outputs/shared/${artifact.shareId}/download`
          : `${API_BASE_URL}/outputs/${artifact.id}/download`

        const response = await fetch(streamUrl, { headers })
        if (!response.ok) throw new Error('Failed to download image preview.')
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        setPreviewBlobUrl(objectUrl)
      } else {
        // For text/data types, use the JSON preview endpoint
        const previewUrl = artifact.isShared
          ? `${API_BASE_URL}/outputs/shared/${artifact.shareId}/preview`
          : `${API_BASE_URL}/outputs/${artifact.id}/preview`

        const response = await fetch(previewUrl, {
          headers: { ...headers, 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error('Failed to retrieve file contents.')

        const data = await response.json()
        if (data.type === 'csv') {
          const lines = data.content.split('\n').map((line: string) => line.split(','))
          setPreviewContent(lines)
        } else if (data.type === 'json') {
          try { setPreviewContent(JSON.parse(data.content)) } catch { setPreviewContent(data.content) }
        } else {
          setPreviewContent(data.content)
        }
      }
    } catch (err: any) {
      console.error(err)
      setPreviewContent(`Error loading preview: ${err.message}`)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Delete output
  const handleDelete = async () => {
    if (!deleteArtifact) return
    setIsDeleting(true)
    try {
      await apiFetch(`/outputs/${deleteArtifact.id}`, { method: 'DELETE' })
      triggerAlert('success', 'Deleted', `${deleteArtifact.name} has been permanently deleted.`)
      setDeleteArtifact(null)
      loadData()
    } catch (err: any) {
      console.error(err)
      triggerAlert('error', 'Deletion Failed', err.message || 'Could not delete the output.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Convert artifact to dataset
  const handleConvertToDataset = async () => {
    if (!convertArtifact || !datasetName.trim()) return
    setIsConverting(true)
    try {
      await apiFetch('/datasets/convert-artifact', {
        method: 'POST',
        body: JSON.stringify({
          artifact_id: parseInt(convertArtifact.id),
          dataset_name: datasetName.trim(),
        }),
      })
      const artifactName = convertArtifact.name
      const registeredName = datasetName.trim()
      setConvertArtifact(null)
      setDatasetName('')
      triggerAlert('success', 'Conversion Successful', `CSV Artifact "${artifactName}" has been successfully registered as dataset "${registeredName}" in the catalog explorer.`)
      loadData()
    } catch (err: any) {
      console.error(err)
      triggerAlert('error', 'Conversion Failed', err.message || 'Failed to convert artifact to dataset.')
    } finally {
      setIsConverting(false)
    }
  }

  // Share controls
  const handleOpenShare = async (artifact: Artifact) => {
    setShareArtifact(artifact)
    setShareListLoading(true)
    setSelectedUserIds([])
    setSelectedTeamId('')
    setSharingTargetsSearch('')
    setNewTagsString(artifact.tags.join(', '))
    try {
      const grants = await apiFetch<any[]>(`/outputs/${artifact.id}/share`)
      const mapped = grants.map((g): SharedUser => ({
        id: String(g.share_id),
        name: g.username || g.team_name || 'Collaborator',
        email: g.username ? `${g.username}@company.com` : undefined,
        isTeam: !!g.team_id,
        role: 'Viewer',
        sharedAt: new Date(g.created_at).toLocaleDateString(),
      }))
      setShareList(mapped)
    } catch (err) {
      console.error(err)
      setShareList([])
    } finally {
      setShareListLoading(false)
    }
  }

  const handleAddShare = async () => {
    if (!shareArtifact) return
    try {
      const userIdsNum = selectedUserIds.map(Number)
      const teamIdNum = selectedTeamId ? Number(selectedTeamId) : undefined

      await apiFetch(`/outputs/${shareArtifact.id}/share`, {
        method: 'POST',
        body: JSON.stringify({
          user_ids: userIdsNum.length > 0 ? userIdsNum : undefined,
          team_id: teamIdNum,
        }),
      })

      triggerAlert('success', 'Shared Successfully', 'Access privileges updated.')
      handleOpenShare(shareArtifact) // reload share list
    } catch (err: any) {
      console.error(err)
      triggerAlert('error', 'Share Failed', err.message || 'Could not share the output.')
    }
  }

  const handleUpdateTags = async () => {
    if (!shareArtifact) return
    setIsSavingTags(true)
    try {
      await apiFetch(`/outputs/${shareArtifact.id}/tags`, {
        method: 'PATCH',
        body: JSON.stringify({ tags: newTagsString }),
      })
      triggerAlert('success', 'Tags Updated', 'Tags saved successfully.')
      loadData()
      setShareArtifact(prev => prev ? { ...prev, tags: newTagsString.split(',').map(t => t.trim()).filter(Boolean) } : null)
    } catch (err: any) {
      console.error(err)
      triggerAlert('error', 'Update Failed', err.message || 'Could not update tags.')
    } finally {
      setIsSavingTags(false)
    }
  }

  const handleRevokeShare = async (share: SharedUser) => {
    if (!shareArtifact) return
    try {
      await apiFetch(`/outputs/${shareArtifact.id}/share`, { method: 'DELETE' })
      triggerAlert('success', 'Revoked', 'Revoked access grants.')
      handleOpenShare(shareArtifact)
    } catch (err: any) {
      console.error(err)
      triggerAlert('error', 'Revocation Failed', err.message || 'Could not revoke share.')
    }
  }

  // Filter targets for sharing dropdown
  const filteredSharingTargets = sharingTargetsSearch.trim() === ''
    ? []
    : [
        ...allUsers
          .filter((u) => u.username.toLowerCase().includes(sharingTargetsSearch.toLowerCase()))
          .map((u) => ({ id: String(u.id), name: u.username, email: u.email, isTeam: false })),
        ...allTeams
          .filter((t) => t.name.toLowerCase().includes(sharingTargetsSearch.toLowerCase()))
          .map((t) => ({ id: String(t.id), name: t.name, email: undefined, isTeam: true })),
      ].filter((item) => {
        return !shareList.some((s) => s.name === item.name)
      })

  // Search filtering on artifacts
  const filteredArtifacts = artifacts.filter((art) => {
    const query = searchQuery.toLowerCase()
    return (
      art.name.toLowerCase().includes(query) ||
      art.workspace.toLowerCase().includes(query) ||
      art.notebook.toLowerCase().includes(query) ||
      art.tags.some((t) => t.toLowerCase().includes(query))
    )
  })

  const getPreviewSize = (type: string) => {
    if (type === 'csv' || type === 'html') return '5xl'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'].includes(type)) return '4xl'
    return '2xl'
  }

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-text-secondary">Retrieving private output artifacts...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Alert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        duration={3000}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Saved Artifacts</h2>
          <p className="text-sm text-text-muted mt-1">
            Securely list, share, and stream-preview generated notebook outputs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search by name, tag, notebook..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border rounded px-3 py-1.5 pl-9 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
            />
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <ViewToggle currentView={viewType} onViewChange={setViewType} />
        </div>
      </div>

      {filteredArtifacts.length === 0 && (
        <div className="text-center py-12 text-sm text-text-secondary bg-card border border-border rounded-lg">
          No output artifacts matched your filters. Run notebook code and call <code className="bg-input px-1 py-0.5 rounded text-xs">dep.save_artifact()</code>.
        </div>
      )}

      {/* Grid View */}
      {viewType === 'grid' && filteredArtifacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArtifacts.map((artifact) => {
            const IconComponent = typeIcons[artifact.type] || FileText
            const sharesList = sharesCache[artifact.id] || []
            const isExpanded = expandedShares[artifact.id]

            return (
              <div
                key={artifact.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors flex flex-col justify-between min-h-[260px]"
              >
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 bg-input rounded-sm">
                      <IconComponent className="w-6 h-6 text-[#569cd6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary text-sm truncate" title={artifact.name}>
                        {artifact.name}
                      </h3>
                      <p className="text-[11px] text-[#4ec9b0] font-mono mt-0.5 truncate" title={artifact.source}>
                        {artifact.notebook}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-input text-[10px] text-text-muted rounded-sm">
                      <FolderOpen className="w-3 h-3" />
                      {formatWorkspaceName(artifact.workspace)}
                    </span>
                    {artifact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] rounded-sm font-medium"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Shared user initials list */}
                  {!artifact.isShared && (
                    <div className="mb-4 pb-3 border-b border-border">
                      <button
                        onClick={() => setExpandedShares(prev => ({ ...prev, [artifact.id]: !isExpanded }))}
                        className="flex items-center gap-1 text-[11px] text-[#ce9178] hover:underline"
                      >
                        <Users className="w-3 h-3" />
                        <span>Shared Access ({sharesList.length})</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto pr-1">
                          {sharesList.length === 0 ? (
                            <p className="text-[10px] text-text-muted italic">Private output</p>
                          ) : (
                            sharesList.map((s) => (
                              <div key={s.id} className="flex items-center justify-between text-[10px] bg-input/40 px-2 py-1 rounded">
                                <span className="font-medium text-text-primary">{s.name}</span>
                                <span className="text-text-muted font-mono">{s.sharedAt}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {artifact.isShared && (
                    <div className="mb-4 pb-3 border-b border-border text-[11px] text-text-muted">
                      Shared by <span className="text-[#ce9178]">@{artifact.owner}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => loadPreview(artifact)}
                    className="flex-1 py-1.5 bg-input text-xs text-[#569cd6] hover:bg-bg-hover transition-colors rounded flex items-center justify-center gap-1 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => handleDownload(artifact)}
                    className="flex-1 py-1.5 bg-input text-xs text-[#6a9955] hover:bg-bg-hover transition-colors rounded flex items-center justify-center gap-1 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Stream
                  </button>
                  {artifact.type === 'csv' && (
                    <button
                      onClick={() => {
                        setConvertArtifact(artifact)
                        setDatasetName(artifact.name.replace('.csv', ''))
                      }}
                      className="p-1.5 bg-input text-[#4ec9b0] hover:bg-bg-hover transition-colors rounded"
                      title="Convert to Dataset"
                    >
                      <Database className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!artifact.isShared && (
                    <>
                      <button
                        onClick={() => handleOpenShare(artifact)}
                        className="p-1.5 bg-input text-[#ce9178] hover:bg-bg-hover transition-colors rounded"
                        title="Access & Tag Settings"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteArtifact(artifact)}
                        className="p-1.5 bg-input text-[#f44747] hover:bg-[#f44747] hover:text-white transition-colors rounded"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewType === 'list' && filteredArtifacts.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-input">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Filename
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Notebook Context
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Workspace
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Tags
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredArtifacts.map((artifact, idx) => {
                  const IconComponent = typeIcons[artifact.type] || FileText
                  return (
                    <tr
                      key={artifact.id}
                      className={`border-b border-border hover:bg-border/50 transition-colors ${
                        idx === filteredArtifacts.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-[#569cd6]" />
                          {artifact.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#4ec9b0] font-mono">
                        {artifact.notebook}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {formatWorkspaceName(artifact.workspace)}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {artifact.size}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {artifact.tags.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 bg-input text-[10px] rounded text-text-muted font-mono">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => loadPreview(artifact)}
                            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-[#569cd6]"
                            title="Preview Content"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(artifact)}
                            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-[#6a9955]"
                            title="Stream File"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {artifact.type === 'csv' && (
                            <button
                              onClick={() => {
                                setConvertArtifact(artifact)
                                setDatasetName(artifact.name.replace('.csv', ''))
                              }}
                              className="p-1.5 hover:bg-bg-hover rounded transition-colors text-[#4ec9b0]"
                              title="Convert to Dataset"
                            >
                              <Database className="w-4 h-4" />
                            </button>
                          )}
                          {!artifact.isShared && (
                            <>
                              <button
                                onClick={() => handleOpenShare(artifact)}
                                className="p-1.5 hover:bg-bg-hover rounded transition-colors text-[#ce9178]"
                                title="Access & Tag settings"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteArtifact(artifact)}
                                className="p-1.5 hover:bg-[#f44747]/20 rounded transition-colors text-[#f44747]"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compact View */}
      {viewType === 'compact' && filteredArtifacts.length > 0 && (
        <div className="space-y-2">
          {filteredArtifacts.map((artifact) => {
            const IconComponent = typeIcons[artifact.type] || FileText
            return (
              <div
                key={artifact.id}
                className="bg-input border border-border rounded p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <IconComponent className="w-4 h-4 text-[#569cd6]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {artifact.name}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {artifact.size} • {formatWorkspaceName(artifact.workspace)} • {artifact.notebook}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => loadPreview(artifact)}
                    className="p-1.5 hover:bg-bg-hover rounded text-[#569cd6]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(artifact)}
                    className="p-1.5 hover:bg-bg-hover rounded text-[#6a9955]"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {artifact.type === 'csv' && (
                    <button
                      onClick={() => {
                        setConvertArtifact(artifact)
                        setDatasetName(artifact.name.replace('.csv', ''))
                      }}
                      className="p-1.5 hover:bg-bg-hover rounded text-[#4ec9b0]"
                      title="Convert to Dataset"
                    >
                      <Database className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!artifact.isShared && (
                    <>
                      <button
                        onClick={() => handleOpenShare(artifact)}
                        className="p-1.5 hover:bg-bg-hover rounded text-[#ce9178]"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteArtifact(artifact)}
                        className="p-1.5 hover:bg-bg-hover rounded text-[#f44747]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dynamic Sizing Preview Modal */}
      <Modal
        isOpen={!!previewArtifact}
        onClose={() => {
          setPreviewArtifact(null)
          setPreviewContent(null)
          setPreviewBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
        }}
        title={previewArtifact?.name || 'Preview'}
        size={previewArtifact ? getPreviewSize(previewArtifact.type) : 'md'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted border-b border-border pb-3">
            <div className="flex items-center gap-4">
              <span>Type: <strong className="text-text-primary">{previewArtifact?.type.toUpperCase()}</strong></span>
              <span>Size: <strong className="text-text-primary">{previewArtifact?.size}</strong></span>
            </div>
            <span>Generated from: <strong className="text-[#4ec9b0] font-mono">{previewArtifact?.notebook}</strong></span>
          </div>

          {previewLoading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              <span className="text-xs text-text-secondary">Streaming artifact content from S3...</span>
            </div>
          ) : (
            <div className="bg-input border border-border rounded max-h-[75vh] overflow-auto p-4">
              {/* Render CSV */}
              {previewArtifact?.type === 'csv' && Array.isArray(previewContent) && (
                <div className="space-y-2">
                  <p className="text-[10px] text-text-muted italic">Previewing first 100 rows for performance.</p>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-card">
                        {previewContent[0]?.map((h: string, i: number) => (
                          <th key={i} className="p-2 font-semibold text-text-secondary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewContent.slice(1).map((row: string[], rIdx: number) => (
                        <tr key={rIdx} className="border-b border-border hover:bg-card/30">
                          {row.map((val: string, cIdx: number) => (
                            <td key={cIdx} className="p-2 text-text-primary font-mono">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Render JSON */}
              {previewArtifact?.type === 'json' && (
                <pre className="text-xs font-mono text-[#9cdcfe]">
                  {JSON.stringify(previewContent, null, 2)}
                </pre>
              )}

              {/* Render HTML */}
              {previewArtifact?.type === 'html' && typeof previewContent === 'string' && (
                <iframe
                  srcDoc={previewContent}
                  className="w-full min-h-[400px] border-none bg-white rounded"
                  title="HTML Report"
                />
              )}

              {/* Render image types via blob URL */}
              {previewArtifact && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes((previewArtifact.type || '').toLowerCase()) && previewBlobUrl && (
                <div className="flex items-center justify-center p-4 bg-[#121212] rounded">
                  <img
                    src={previewBlobUrl}
                    alt={previewArtifact.name}
                    className="max-w-full max-h-[500px] object-contain border border-border shadow-lg rounded"
                    onError={(e) => { (e.target as HTMLImageElement).alt = 'Image failed to load' }}
                  />
                </div>
              )}

              {/* Text, markdown, or error fallbacks */}
              {previewArtifact?.type !== 'csv' &&
                previewArtifact?.type !== 'json' &&
                previewArtifact?.type !== 'html' &&
                previewArtifact?.type !== 'png' && (
                  <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap">
                    {String(previewContent)}
                  </pre>
                )}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={() => {
                setPreviewArtifact(null)
                setPreviewContent(null)
              }}
              className="px-4 py-2 text-xs font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      </Modal>

      {/* Sharing modal - Wide/lg sizing with Tag modification option */}
      <Modal
        isOpen={!!shareArtifact}
        onClose={() => setShareArtifact(null)}
        title={`Settings & Access for "${shareArtifact?.name}"`}
        size="lg"
      >
        <div className="space-y-6">
          
          {/* Edit Tags Section */}
          <div className="border-b border-border pb-4">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Manage Artifact Tags
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagsString}
                onChange={(e) => setNewTagsString(e.target.value)}
                placeholder="Comma separated tags: analysis, finance, Q3"
                className="flex-1 bg-input border border-border rounded px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleUpdateTags}
                disabled={isSavingTags}
                className="px-4 py-2 text-xs font-medium text-white bg-primary rounded hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isSavingTags ? 'Saving...' : 'Save Tags'}
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-1">Tags are searchable and categorize this artifact across notebooks.</p>
          </div>

          {/* Sharing Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Grant Access To Users & Teams
            </h4>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={sharingTargetsSearch}
                  onChange={(e) => {
                    setSharingTargetsSearch(e.target.value)
                    setIsShareTargetDropdownOpen(true)
                  }}
                  onFocus={() => setIsShareTargetDropdownOpen(true)}
                  className="w-full bg-input border border-border rounded px-3 py-2 pl-9 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                  placeholder="Search user accounts or teams..."
                />
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />

                {isShareTargetDropdownOpen && filteredSharingTargets.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-bg-hover border border-border rounded shadow-2xl max-h-48 overflow-y-auto z-50">
                    {filteredSharingTargets.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.isTeam) {
                            setSelectedTeamId(item.id)
                            setSelectedUserIds([])
                          } else {
                            setSelectedUserIds((prev) =>
                              prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                            )
                            setSelectedTeamId('')
                          }
                          setSharingTargetsSearch('')
                          setIsShareTargetDropdownOpen(false)
                        }}
                        className="p-2.5 hover:bg-card flex items-center justify-between cursor-pointer border-b border-[#2d2d2d] last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          {item.isTeam ? (
                            <Users className="w-4 h-4 text-[#569cd6]" />
                          ) : (
                            <User className="w-4 h-4 text-[#ce9178]" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-text-primary">{item.name}</p>
                            {item.email && <p className="text-[10px] text-text-muted">{item.email}</p>}
                          </div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 bg-background border border-[#2d2d2d] rounded text-text-muted font-mono uppercase">
                          {item.isTeam ? 'Team' : 'User'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleAddShare}
                disabled={selectedUserIds.length === 0 && !selectedTeamId}
                className="px-4 py-2 text-xs font-medium text-white bg-primary rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Grant Access
              </button>
            </div>

            {/* Target chips */}
            {(selectedUserIds.length > 0 || selectedTeamId) && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-input rounded border border-border">
                {selectedUserIds.map((uid) => {
                  const u = allUsers.find((user) => String(user.id) === uid)
                  return (
                    <span key={uid} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-card border border-[#37373d] rounded text-[11px] text-text-primary">
                      <User className="w-3 h-3 text-[#ce9178]" />
                      <span>{u?.username || uid}</span>
                      <button onClick={() => setSelectedUserIds(prev => prev.filter(id => id !== uid))}>
                        <X className="w-3 h-3 text-text-muted hover:text-text-primary" />
                      </button>
                    </span>
                  )
                })}
                {selectedTeamId && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-card border border-[#37373d] rounded text-[11px] text-text-primary">
                    <Users className="w-3 h-3 text-[#569cd6]" />
                    <span>{allTeams.find((t) => String(t.id) === selectedTeamId)?.name || selectedTeamId}</span>
                    <button onClick={() => setSelectedTeamId('')}>
                      <X className="w-3 h-3 text-text-muted hover:text-text-primary" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Roster of active grants */}
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 border-b border-border pb-1">
                Active Access Grants
              </h4>
              {shareListLoading ? (
                <div className="py-8 text-center text-xs text-text-secondary">Loading roster...</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {shareList.length === 0 ? (
                    <div className="text-center py-4 text-xs text-text-muted italic">
                      This artifact is private. Grant access using the field above.
                    </div>
                  ) : (
                    shareList.map((share) => (
                      <div key={share.id} className="flex items-center justify-between p-2 bg-input border border-border rounded">
                        <div className="flex items-center gap-3">
                          {share.isTeam ? (
                            <Users className="w-4 h-4 text-[#569cd6]" />
                          ) : (
                            <User className="w-4 h-4 text-[#ce9178]" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-text-primary">{share.name}</p>
                            <p className="text-[10px] text-text-muted">Shared on {share.sharedAt}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeShare(share)}
                          className="p-1 hover:bg-[#f44747]/20 rounded text-[#f44747] transition-colors"
                          title="Revoke access"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={() => setShareArtifact(null)}
              className="px-4 py-2 text-xs font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteArtifact}
        onClose={() => setDeleteArtifact(null)}
        title="Delete Output"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <span className="font-semibold text-text-primary">{deleteArtifact?.name}</span>?
            This will permanently remove the file from MinIO S3 storage and delete all shared access mappings.
          </p>
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button
              onClick={() => setDeleteArtifact(null)}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#f44747] rounded hover:bg-[#d84343] transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Convert to Dataset Modal */}
      <Modal
        isOpen={!!convertArtifact}
        onClose={() => {
          setConvertArtifact(null)
          setDatasetName('')
        }}
        title="Convert CSV Artifact to Dataset"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#1e293b]/50 border border-border rounded text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary">How conversion works:</span> This will copy the CSV file from your private notebook outputs into the main resource storage, automatically discover its schema (column types, count), and list it as a queryable dataset in the Catalog Explorer.
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Dataset Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g. sales_summary_2026"
                className="w-full bg-input border border-border focus:border-primary rounded px-3 py-2 text-sm text-text-primary outline-none transition-colors"
              />
              <p className="text-[10px] text-text-muted mt-1">
                Must be unique. Alphanumeric, underscores, or hyphens recommended.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Source Type
              </label>
              <input
                type="text"
                value="CSV File"
                disabled
                className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm text-text-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Dataset Owner
              </label>
              <input
                type="text"
                value={typeof window !== 'undefined' ? (localStorage.getItem('dep_username') || 'You') : 'You'}
                disabled
                className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm text-text-muted cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
            <button
              onClick={() => {
                setConvertArtifact(null)
                setDatasetName('')
              }}
              className="px-4 py-2 text-xs font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConvertToDataset}
              disabled={isConverting || !datasetName.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded hover:bg-primary/95 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isConverting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  Register as Dataset
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
