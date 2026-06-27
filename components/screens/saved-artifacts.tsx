'use client'

import { useState } from 'react'
import { Download, Eye, Trash2, Share2, Upload, FileText, Image, FileJson, Search, X, Users, User, ShieldCheck } from 'lucide-react'
import { ViewToggle } from '@/components/ui/view-toggle'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'

type ViewType = 'grid' | 'list' | 'compact'

interface Artifact {
  id: string
  name: string
  type: 'csv' | 'png' | 'pdf' | 'json' | 'html'
  size: string
  source: string
  date: string
  preview?: string
  description?: string
}

interface SharedAccess {
  id: string
  name: string
  email?: string
  isTeam: boolean
  role: 'Viewer' | 'Editor'
  sharedAt: string
}

const mockArtifacts: Artifact[] = [
  {
    id: '1',
    name: 'sales_report_Q4.csv',
    type: 'csv',
    size: '2.4 MB',
    source: 'Financial Analysis',
    date: '2024-07-20',
    description: 'Quarterly sales performance report with regional breakdowns',
  },
  {
    id: '2',
    name: 'customer_viz.png',
    type: 'png',
    size: '845 KB',
    source: 'Customer Segmentation',
    date: '2024-07-19',
    description: 'Customer segmentation visualization',
  },
  {
    id: '3',
    name: 'forecast_2025.pdf',
    type: 'pdf',
    size: '3.2 MB',
    source: 'Revenue Forecasting',
    date: '2024-07-18',
    description: 'Annual revenue forecast with confidence intervals',
  },
  {
    id: '4',
    name: 'analysis_summary.json',
    type: 'json',
    size: '512 KB',
    source: 'Data Analysis',
    date: '2024-07-17',
    description: 'Structured analysis results with metadata',
  },
]

const typeIcons = {
  csv: FileText,
  pdf: FileText,
  png: Image,
  json: FileJson,
  html: FileText,
}

// Available share directory users/teams
const availableShareTargets = [
  { id: 'u1', name: 'John Doe', email: 'john@company.com', isTeam: false },
  { id: 'u2', name: 'Maria Chen', email: 'maria@company.com', isTeam: false },
  { id: 'u3', name: 'aditi', email: 'aditi@company.com', isTeam: false },
  { id: 'u4', name: 'Alice Johnson', email: 'alice@company.com', isTeam: false },
  { id: 't1', name: 'RiskAnalytics', isTeam: true },
  { id: 't2', name: 'ComplianceGDPR', isTeam: true },
  { id: 't3', name: 'Engineering', isTeam: true }
]

export function SavedArtifacts() {
  const [viewType, setViewType] = useState<ViewType>('list')
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null)
  const [shareArtifact, setShareArtifact] = useState<Artifact | null>(null)
  const [deleteArtifact, setDeleteArtifact] = useState<Artifact | null>(null)
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  // Google Workspace sharing state (map artifactId -> roster)
  const [sharesMap, setSharesMap] = useState<Record<string, SharedAccess[]>>({
    '1': [
      { id: 'u1', name: 'John Doe', email: 'john@company.com', isTeam: false, role: 'Editor', sharedAt: 'Jun 25, 2026, 10:15 AM' },
      { id: 't1', name: 'RiskAnalytics', isTeam: true, role: 'Viewer', sharedAt: 'Jun 25, 2026, 11:30 AM' }
    ],
    '2': [
      { id: 'u3', name: 'aditi', email: 'aditi@company.com', isTeam: false, role: 'Viewer', sharedAt: 'Jun 25, 2026, 04:45 PM' }
    ]
  })

  // Local sharing inputs
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTargets, setSelectedTargets] = useState<typeof availableShareTargets>([])
  const [selectedRole, setSelectedRole] = useState<'Viewer' | 'Editor'>('Viewer')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const triggerAlert = (type: typeof alertState.type, title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message })
  }

  const handleDelete = () => {
    if (deleteArtifact) {
      triggerAlert('success', 'Deleted', `${deleteArtifact.name} has been deleted.`)
      setDeleteArtifact(null)
    }
  }

  const handleShareModalOpen = (artifact: Artifact) => {
    setShareArtifact(artifact)
    setSearchQuery('')
    setSelectedTargets([])
    setSelectedRole('Viewer')
    setIsDropdownOpen(false)
  }

  const handleAddTarget = (target: typeof availableShareTargets[0]) => {
    if (!selectedTargets.find((t) => t.id === target.id)) {
      setSelectedTargets([...selectedTargets, target])
    }
    setSearchQuery('')
    setIsDropdownOpen(false)
  }

  const handleRemoveTarget = (id: string) => {
    setSelectedTargets(selectedTargets.filter((t) => t.id !== id))
  }

  const handleSaveShares = () => {
    if (!shareArtifact) return

    const currentShares = sharesMap[shareArtifact.id] || []
    
    // Convert selected targets into share entries
    const newShares: SharedAccess[] = selectedTargets.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      isTeam: t.isTeam,
      role: selectedRole,
      sharedAt: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric' })
    }))

    // Filter out duplicates (overwrite with new role if re-added)
    const updatedShares = [
      ...currentShares.filter((cs) => !newShares.some((ns) => ns.id === cs.id)),
      ...newShares
    ]

    setSharesMap({
      ...sharesMap,
      [shareArtifact.id]: updatedShares
    })

    triggerAlert(
      'success',
      'Access Updated',
      `Successfully shared ${shareArtifact.name} with ${selectedTargets.length} collaborator(s).`
    )
    setSelectedTargets([])
  }

  const handleRevokeAccess = (targetId: string) => {
    if (!shareArtifact) return
    const currentShares = sharesMap[shareArtifact.id] || []
    const target = currentShares.find((c) => c.id === targetId)
    
    setSharesMap({
      ...sharesMap,
      [shareArtifact.id]: currentShares.filter((cs) => cs.id !== targetId)
    })

    triggerAlert(
      'info',
      'Access Revoked',
      `Access for "${target?.name}" has been revoked.`
    )
  }

  // Filter share targets matching search query
  const filteredTargets = searchQuery.trim() === '' 
    ? [] 
    : availableShareTargets.filter((t) => {
        const matchesQuery = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
        
        // Exclude already selected
        const isSelected = selectedTargets.some((st) => st.id === t.id)
        
        // Exclude already holding access
        const hasAccess = shareArtifact && (sharesMap[shareArtifact.id] || []).some((ha) => ha.id === t.id)
        
        return matchesQuery && !isSelected && !hasAccess
      })

  return (
    <div className="p-6 space-y-6">
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
            Export, download, and share analysis results
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle currentView={viewType} onViewChange={setViewType} />
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium">
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewType === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockArtifacts.map((artifact) => {
            const IconComponent = typeIcons[artifact.type] || FileText
            return (
              <div
                key={artifact.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 mb-3">
                  <IconComponent className="w-8 h-8 text-[#569cd6] mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary text-sm truncate">
                      {artifact.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">{artifact.source}</p>
                  </div>
                </div>

                <p className="text-xs text-text-secondary mb-4 h-10 overflow-hidden line-clamp-2">
                  {artifact.description}
                </p>

                <div className="flex justify-between text-xs text-text-muted mb-4 pb-4 border-b border-border">
                  <span>{artifact.size}</span>
                  <span>{artifact.date}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewArtifact(artifact)}
                    className="flex-1 px-2 py-1.5 text-xs bg-input text-[#569cd6] rounded hover:bg-bg-hover transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => {
                      triggerAlert('success', 'Downloaded', `${artifact.name} download started.`)
                    }}
                    className="flex-1 px-2 py-1.5 text-xs bg-input text-[#6a9955] rounded hover:bg-bg-hover transition-colors flex items-center justify-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Get
                  </button>
                  <button
                    onClick={() => handleShareModalOpen(artifact)}
                    className="flex-1 px-2 py-1.5 text-xs bg-input text-[#ce9178] rounded hover:bg-bg-hover transition-colors flex items-center justify-center gap-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                  <button
                    onClick={() => setDeleteArtifact(artifact)}
                    className="p-1.5 bg-input text-[#f44747] rounded hover:bg-[#f44747] hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewType === 'list' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-input">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Filename
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockArtifacts.map((artifact, idx) => {
                  const IconComponent = typeIcons[artifact.type] || FileText
                  return (
                    <tr
                      key={artifact.id}
                      className={`border-b border-border hover:bg-border/50 transition-colors ${
                        idx === mockArtifacts.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-[#569cd6]" />
                          {artifact.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {artifact.source}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {artifact.size}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {artifact.date}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewArtifact(artifact)}
                            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-[#569cd6]"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              triggerAlert('success', 'Downloaded', `${artifact.name} download started.`)
                            }}
                            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-[#6a9955]"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShareModalOpen(artifact)}
                            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-[#ce9178]"
                            title="Share"
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
      {viewType === 'compact' && (
        <div className="space-y-2">
          {mockArtifacts.map((artifact) => {
            const IconComponent = typeIcons[artifact.type] || FileText
            return (
              <div
                key={artifact.id}
                className="bg-input border border-border rounded p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <IconComponent className="w-4 h-4 text-[#569cd6]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate font-medium">
                      {artifact.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {artifact.size} • {artifact.date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => setPreviewArtifact(artifact)}
                    className="p-1 hover:bg-bg-hover rounded text-[#569cd6]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      triggerAlert('success', 'Downloaded', `${artifact.name} download started.`)
                    }}
                    className="p-1 hover:bg-bg-hover rounded text-[#6a9955]"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleShareModalOpen(artifact)}
                    className="p-1 hover:bg-bg-hover rounded text-[#ce9178]"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteArtifact(artifact)}
                    className="p-1 hover:bg-bg-hover rounded text-[#f44747]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewArtifact}
        onClose={() => setPreviewArtifact(null)}
        title={previewArtifact?.name || 'Preview'}
        size="lg"
      >
        <div className="bg-input rounded p-6 text-center">
          <p className="text-text-secondary text-sm mb-4">
            Preview of {previewArtifact?.type.toUpperCase()} artifact
          </p>
          <div className="bg-[#3d3d3d] rounded p-12 text-center">
            <p className="text-text-primary text-sm">
              {previewArtifact?.description}
            </p>
          </div>
        </div>
      </Modal>

      {/* Google Workspace Share Modal */}
      <Modal
        isOpen={!!shareArtifact}
        onClose={() => setShareArtifact(null)}
        title={`Share "${shareArtifact?.name}"`}
        size="md"
      >
        <div className="space-y-4">
          
          {/* Add collaborators */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Add people, groups, or teams
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 pl-9 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                  placeholder="Enter name, email, or team..."
                />
                
                {/* Auto-suggest dropdown */}
                {isDropdownOpen && filteredTargets.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-bg-hover border border-border rounded-sm shadow-2xl max-h-48 overflow-y-auto z-50">
                    {filteredTargets.map((target) => (
                      <div
                        key={target.id}
                        onClick={() => handleAddTarget(target)}
                        className="p-2.5 hover:bg-bg-hover flex items-center justify-between cursor-pointer border-b border-[#2d2d2d] last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          {target.isTeam ? (
                            <Users className="w-4 h-4 text-[#569cd6]" />
                          ) : (
                            <User className="w-4 h-4 text-[#ce9178]" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-text-primary">{target.name}</p>
                            {target.email && <p className="text-[10px] text-text-muted">{target.email}</p>}
                          </div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 bg-background border border-[#2d2d2d] rounded-sm text-text-muted font-mono uppercase">
                          {target.isTeam ? 'Team' : 'User'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {isDropdownOpen && searchQuery.trim() !== '' && filteredTargets.length === 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-bg-hover border border-border rounded-sm p-3 text-center text-xs text-text-muted z-50">
                    No matching users or teams found.
                  </div>
                )}
              </div>

              {/* Share Role selector */}
              <div className="w-28">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full h-[38px] bg-input border border-border rounded-sm px-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Editor">Editor</option>
                </select>
              </div>

              {/* Add Button */}
              <button
                onClick={handleSaveShares}
                disabled={selectedTargets.length === 0}
                className="px-4 bg-primary text-white rounded-sm text-xs font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Share
              </button>
            </div>
          </div>

          {/* Selected targets chips */}
          {selectedTargets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-input rounded-sm border border-border">
              {selectedTargets.map((target) => (
                <span
                  key={target.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-card border border-[#37373d] rounded-sm text-xs text-text-primary"
                >
                  {target.isTeam ? (
                    <Users className="w-3 h-3 text-[#569cd6]" />
                  ) : (
                    <User className="w-3 h-3 text-[#ce9178]" />
                  )}
                  <span>{target.name}</span>
                  <button
                    onClick={() => handleRemoveTarget(target.id)}
                    className="p-0.5 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* People with Access Roster */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 border-b border-border pb-1">
              People & Groups with Access
            </h4>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              
              {/* Owner (Permanent) */}
              <div className="flex items-center justify-between p-2 hover:bg-bg-hover rounded-sm transition-colors border border-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    S
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">super_admin</p>
                    <p className="text-[10px] text-text-muted">admin@company.com • Workspace Owner</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-[#6a9955]/15 text-[#6a9955] font-semibold rounded-sm">
                  Owner
                </span>
              </div>

              {/* Dynamic Shares */}
              {shareArtifact && (sharesMap[shareArtifact.id] || []).map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 hover:bg-bg-hover rounded-sm transition-colors border border-[#2d2d2d]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-input rounded-full flex items-center justify-center border border-[#37373d]">
                      {share.isTeam ? (
                        <Users className="w-3.5 h-3.5 text-[#569cd6]" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-[#ce9178]" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{share.name}</p>
                      <p className="text-[10px] text-text-muted">
                        {share.isTeam ? 'Team Group' : share.email} • Shared {share.sharedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-input border border-[#37373d] text-text-secondary rounded-sm">
                      {share.role}
                    </span>
                    <button
                      onClick={() => handleRevokeAccess(share.id)}
                      className="p-1 hover:bg-[#f44747]/20 rounded text-[#f44747] transition-colors"
                      title="Revoke access"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty share message */}
              {shareArtifact && (!sharesMap[shareArtifact.id] || sharesMap[shareArtifact.id].length === 0) && (
                <div className="text-center py-4 text-xs text-text-muted">
                  No external shares configured yet. This artifact is currently private.
                </div>
              )}
            </div>
          </div>

          {/* Copy general link */}
          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>General Link: https://dep.internal/artifacts/{shareArtifact?.id}</span>
            <button
              onClick={() => {
                if (shareArtifact) {
                  navigator.clipboard.writeText(`https://dep.internal/artifacts/${shareArtifact.id}`)
                  triggerAlert('success', 'Copied Link', 'Direct artifact access link copied.')
                }
              }}
              className="text-primary hover:underline"
            >
              Copy Link
            </button>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setShareArtifact(null)}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-border rounded-sm hover:bg-bg-hover transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteArtifact}
        onClose={() => setDeleteArtifact(null)}
        title="Delete Artifact"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <span className="font-semibold text-text-primary">{deleteArtifact?.name}</span>?
            This action cannot be undone.
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
              className="px-4 py-2 text-sm font-medium text-white bg-[#f44747] rounded hover:bg-[#d84343] transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
