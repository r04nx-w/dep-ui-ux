'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Lock, Users, GitBranch, Share2, Info, GitCommit, FileCode, Check, Trash2, Search, UserMinus, Bell, Mail } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { apiFetch } from '@/lib/api'
import { UserBadge } from '@/components/ui/user-badge'

interface Workspace {
  id: string
  name: string
  description: string
  lead: string
  team: string[]
  notebooks: number
  notebooksList: string[]
  invited_users?: string[]
}

interface Notebook {
  id: string
  name: string
  project: string
  projectScope: string
  status: 'editing' | 'locked' | 'view'
  lockedBy?: string
  lastModified: string
  timestamp: number
}

export function ProjectWorkspaces({ 
  onLaunchWorkspace,
  userRole = 'analyst',
  username = ''
}: { 
  onLaunchWorkspace?: (workspaceName: string) => void
  userRole?: string
  username?: string
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [recentNotebooks, setRecentNotebooks] = useState<Notebook[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [showWorkspaceInfo, setShowWorkspaceInfo] = useState(false)
  
  // Create Project states
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)

  // Commit history loading for the info modal
  const [selectedCommitHistory, setSelectedCommitHistory] = useState<any[] | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isAccessDenied, setIsAccessDenied] = useState(false)
  const [isNotebooksExpanded, setIsNotebooksExpanded] = useState(false)

  // Sharing states
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharingWorkspace, setSharingWorkspace] = useState<Workspace | null>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [selectedUsersToInvite, setSelectedUsersToInvite] = useState<string[]>([])
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [loadingShareData, setLoadingShareData] = useState(false)

  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [showInviteDropdown, setShowInviteDropdown] = useState(false)
  const inviteBellRef = useRef<HTMLDivElement>(null)

  // Delete Project states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
  
  const paginatedWorkspaces = workspaces.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const [loading, setLoading] = useState(true)
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const checkWorkspaceAccess = (leadName: string, teamMembers: string[]): boolean => {
    if (userRole === 'admin' || userRole === 'onboarder') return true
    if (!username) return true // default to true if auth not loaded yet
    return leadName === username || teamMembers.includes(username)
  }

  const fetchAllWorkspaces = async () => {
    setLoading(true)
    try {
      const teams = await apiFetch<any[]>('/teams')
      const loadedWorkspaces: Workspace[] = []
      const allNotebooks: Notebook[] = []

      for (const team of teams) {
        const safeName = team.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_')
        const scope = `project_${safeName}`
        const teamMembers = team.members.map((m: any) => m.username)
        const leadName = team.leader_username || 'No lead assigned'

        let notebooksCount = 0
        let notebooksList: string[] = []

        // Only fetch files if user has permissions
        const hasAccess = userRole === 'admin' || userRole === 'onboarder' || leadName === username || teamMembers.includes(username)

        if (hasAccess) {
          try {
            // Fetch workspace files list from server
            const res = await apiFetch<{ files: Record<string, any> }>(`/workspaces/sync/${scope}?branch=main`)
            if (res && res.files) {
              const files = res.files
              notebooksList = Object.keys(files).filter(path => path.endsWith('.ipynb'))
              notebooksCount = notebooksList.length

              // Accumulate notebooks for the recent notebooks list
              notebooksList.forEach(nbPath => {
                const fileObj = files[nbPath]
                const mtime = fileObj.mtime || Date.now()
                const formattedTime = new Date(mtime).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })

                allNotebooks.push({
                  id: `${scope}_${nbPath}`,
                  name: nbPath,
                  project: team.name,
                  projectScope: scope,
                  status: leadName === username ? 'editing' : 'view', 
                  lockedBy: leadName !== username ? leadName : undefined,
                  lastModified: formattedTime,
                  timestamp: mtime
                })
              })
            }
          } catch (err) {
            console.warn(`Failed to fetch workspace files for scope ${scope}:`, err)
          }
        }

        const invitedUsers = team.invited_users ? team.invited_users.map((u: any) => u.username) : []

        if (hasAccess) {
          loadedWorkspaces.push({
            id: String(team.id),
            name: team.name,
            description: team.description || 'No description provided.',
            lead: leadName,
            team: teamMembers,
            notebooks: notebooksCount,
            notebooksList: notebooksList,
            invited_users: invitedUsers
          })
        }
      }

      // Sort recent notebooks by modified timestamp descending
      allNotebooks.sort((a, b) => b.timestamp - a.timestamp)
      setRecentNotebooks(allNotebooks.slice(0, 10))
      setWorkspaces(loadedWorkspaces)
    } catch (err) {
      console.error('Failed to load project workspaces:', err)
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Loading Failed',
        message: 'Could not fetch project workspaces from the backend database.',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingInvites = async () => {
    try {
      const invites = await apiFetch<any[]>('/teams/invites/mine')
      setPendingInvites(invites || [])
    } catch (err) {
      console.warn("Failed to fetch pending project invites:", err)
    }
  }

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      const res = await apiFetch<any>(`/teams/invites/${inviteId}/accept`, {
        method: 'POST'
      })
      if (res && res.success) {
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Invite Accepted',
          message: 'You have joined the workspace project team successfully.',
        })
        await fetchAllWorkspaces()
        await fetchPendingInvites()
      }
    } catch (err) {
      console.error('Failed to accept invite:', err)
    }
  }

  const handleDeclineInvite = async (inviteId: number) => {
    try {
      const res = await apiFetch<any>(`/teams/invites/${inviteId}/decline`, {
        method: 'POST'
      })
      if (res && res.success) {
        setAlertState({
          isOpen: true,
          type: 'info',
          title: 'Invite Declined',
          message: 'Project access invite declined.',
        })
        await fetchPendingInvites()
      }
    } catch (err) {
      console.error('Failed to decline invite:', err)
    }
  }

  // Close invite dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inviteBellRef.current && !inviteBellRef.current.contains(e.target as Node)) {
        setShowInviteDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    fetchAllWorkspaces()
    fetchPendingInvites()
  }, [username, userRole])

  const handleOpenInfo = async (ws: Workspace) => {
    setSelectedWorkspace(ws)
    setShowWorkspaceInfo(true)
    setLoadingHistory(true)
    setSelectedCommitHistory(null)
    setIsAccessDenied(false)
    setIsNotebooksExpanded(false)

    const hasAccess = checkWorkspaceAccess(ws.lead, ws.team)
    if (!hasAccess) {
      setIsAccessDenied(true)
      setLoadingHistory(false)
      return
    }

    const safeName = ws.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_')
    const scope = `project_${safeName}`

    try {
      const history = await apiFetch<any[]>(`/workspaces/${scope}/history`)
      setSelectedCommitHistory(history || [])
    } catch (err) {
      console.error('Failed to load workspace history:', err)
      setSelectedCommitHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleOpenShare = async (ws: Workspace) => {
    setSharingWorkspace(ws)
    setShowShareModal(true)
    setLoadingShareData(true)
    setSelectedUsersToInvite([])
    setSearchUserQuery('')

    try {
      const users = await apiFetch<any[]>('/users')
      setAllUsers(users || [])
    } catch (err) {
      console.error('Failed to load users for sharing:', err)
    } finally {
      setLoadingShareData(false)
    }
  }

  const handleAddMembers = async () => {
    if (!sharingWorkspace || selectedUsersToInvite.length === 0) return

    setLoadingShareData(true)
    try {
      for (const userId of selectedUsersToInvite) {
        await apiFetch(`/teams/${sharingWorkspace.id}/invites`, {
          method: 'POST',
          body: JSON.stringify({ user_id: Number(userId) })
        })
      }

      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Invite Sent',
        message: 'Project access invites sent successfully. Collaborators will receive a notification to accept.',
      })
      setShowShareModal(false)

      await fetchAllWorkspaces()

      // Refresh local share modal list
      const teams = await apiFetch<any[]>('/teams')
      const teamObj = teams.find(t => String(t.id) === sharingWorkspace.id)
      if (teamObj) {
        setSharingWorkspace({
          ...sharingWorkspace,
          team: teamObj.members.map((m: any) => m.username),
          invited_users: teamObj.invited_users ? teamObj.invited_users.map((m: any) => m.username) : []
        })
      }

      setSelectedUsersToInvite([])
    } catch (err) {
      console.error('Failed to share project:', err)
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Sharing Failed',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoadingShareData(false)
    }
  }

  const handleRemoveMember = async (memberUsername: string) => {
    if (!sharingWorkspace) return

    const userObj = allUsers.find(u => u.username === memberUsername)
    if (!userObj) return

    setLoadingShareData(true)
    try {
      await apiFetch(`/teams/${sharingWorkspace.id}/members/${userObj.id}`, {
        method: 'DELETE'
      })

      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Access Revoked',
        message: `Removed ${memberUsername}'s access to this workspace.`,
      })

      await fetchAllWorkspaces()
      
      setSharingWorkspace(prev => {
        if (!prev) return null
        return {
          ...prev,
          team: prev.team.filter(t => t !== memberUsername)
        }
      })
    } catch (err) {
      console.error('Failed to remove member:', err)
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Revoke Failed',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoadingShareData(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!deletingWorkspace) return
    setIsDeleting(true)
    try {
      await apiFetch(`/teams/${deletingWorkspace.id}`, {
        method: 'DELETE'
      })
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Project Deleted',
        message: `Project "${deletingWorkspace.name}" has been deleted successfully.`,
      })
      setShowDeleteModal(false)
      setDeletingWorkspace(null)
      await fetchAllWorkspaces()
    } catch (err) {
      console.error('Failed to delete project:', err)
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Deletion Failed',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setIsSubmittingProject(true)
    try {
      const res = await apiFetch<any>('/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null
        })
      })

      if (res && res.id) {
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Project Created',
          message: `Project workspace "${newProjectName}" created successfully.`,
        })

        await fetchAllWorkspaces()

        setShowCreateProjectModal(false)
        setNewProjectName('')
        setNewProjectDescription('')
      }
    } catch (err) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Creation Failed',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsSubmittingProject(false)
    }
  }

  // Filter users that can be invited (excluding existing team members & the project lead)
  const filteredUsersToInvite = allUsers.filter(u => {
    if (!sharingWorkspace) return false
    const isLead = u.username === sharingWorkspace.lead
    const isMember = sharingWorkspace.team.includes(u.username)
    const matchesSearch = u.username.toLowerCase().includes(searchUserQuery.toLowerCase()) || 
                          (u.full_name && u.full_name.toLowerCase().includes(searchUserQuery.toLowerCase()))
    return !isLead && !isMember && matchesSearch
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
          <h2 className="text-2xl font-bold text-text-primary">Project Workspaces</h2>
          <p className="text-sm text-text-muted mt-1">Collaborate on data analysis projects</p>
        </div>

        <div className="flex items-center gap-3">
          {/* ── Bell notification icon with invite dropdown ── */}
          <div ref={inviteBellRef} className="relative">
            <button
              onClick={() => setShowInviteDropdown(prev => !prev)}
              className="relative flex items-center justify-center w-9 h-9 rounded bg-input border border-border hover:border-primary/60 hover:bg-bg-hover transition-all cursor-pointer group"
              title={pendingInvites.length > 0 ? `${pendingInvites.length} pending invite${pendingInvites.length > 1 ? 's' : ''}` : 'No pending invites'}
            >
              <Bell className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
              {/* Simple dot indicator when there are pending invites */}
              {pendingInvites.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary shadow-sm" />
              )}
            </button>

            {/* Dropdown panel — uses app card/border theme */}
            {showInviteDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-80 z-50 rounded bg-card border border-border shadow-xl overflow-hidden">
                {/* Dropdown header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-input">
                  <Bell className="w-3.5 h-3.5 text-text-secondary" />
                  <span className="text-xs font-semibold text-text-secondary">Project Invitations</span>
                  {pendingInvites.length > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-primary text-white text-[10px] font-bold">
                      {pendingInvites.length}
                    </span>
                  )}
                </div>

                {pendingInvites.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Bell className="w-5 h-5 text-text-muted mx-auto mb-2 opacity-40" />
                    <p className="text-xs text-text-muted">No pending invitations</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {pendingInvites.map(invite => (
                      <div key={invite.id} className="px-3 py-3 hover:bg-bg-hover transition-colors">
                        {/* Invite info */}
                        <div className="flex items-start gap-2.5 mb-2.5">
                          <div className="w-7 h-7 rounded bg-input border border-border flex items-center justify-center flex-shrink-0 text-xs mt-0.5 text-text-muted">✉</div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text-primary leading-snug">
                              Invited to join{' '}
                              <span className="text-primary">{invite.team_name}</span>
                            </p>
                            <div className="text-[10px] text-text-muted mt-1 flex flex-wrap items-center gap-1.5">
                              <span>by</span>
                              <UserBadge username={invite.created_by_username} avatarSize="xs" />
                              <span>·</span>
                              <span>Lead:</span>
                              <UserBadge username={invite.lead_username} avatarSize="xs" />
                              <span>·</span>
                              <span>{invite.team_members_count} members</span>
                            </div>
                            {invite.team_description && (
                              <p className="text-[10px] text-text-muted italic mt-0.5 truncate">{invite.team_description}</p>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleDeclineInvite(invite.id)}
                            className="px-3 py-1 text-[11px] font-semibold rounded border border-border hover:border-danger/40 text-text-secondary hover:text-danger hover:bg-danger-bg transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptInvite(invite.id)}
                            className="px-3 py-1 text-[11px] font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-colors cursor-pointer"
                          >
                            Accept & Join
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New Project button */}
          <button
            onClick={() => {
              setNewProjectName('')
              setNewProjectDescription('')
              setShowCreateProjectModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>


      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs text-text-muted font-semibold">Fetching workspace catalogs...</div>
        </div>
      ) : (
        <>

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedWorkspaces.map((workspace) => {
              const hasAccess = checkWorkspaceAccess(workspace.lead, workspace.team)
              return (
                <div
                  key={workspace.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                >
                  {!hasAccess && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-[9px] font-bold text-rose-400 rounded">
                      <Lock className="w-2.5 h-2.5" />
                      Locked
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-text-primary text-sm flex-1 truncate mr-6">
                        {workspace.name}
                      </h3>
                      <button
                        onClick={() => handleOpenInfo(workspace)}
                        className="p-1.5 hover:bg-input rounded transition-colors text-text-secondary cursor-pointer"
                        title="View Workspace Information"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-text-secondary mb-3 line-clamp-2 min-h-[32px]">
                      {workspace.description}
                    </p>

                    <div className="space-y-2 mb-4 pb-4 border-b border-border">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-text-muted">Lead:</span>
                        <UserBadge username={workspace.lead} avatarSize="xs" isClickable={true} />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Users className="w-3 h-3 text-[#569cd6]" />
                        <span className="text-text-muted">{workspace.team.length} team members</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-text-muted">Notebooks:</span>
                        <span className="text-text-primary font-medium">
                          {hasAccess ? workspace.notebooks : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => onLaunchWorkspace?.(workspace.name)}
                      disabled={!hasAccess}
                      className="flex-1 px-3 py-2 text-xs bg-primary disabled:bg-[#2d2d30] disabled:text-text-muted text-white font-semibold rounded hover:bg-primary-hover disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Open
                    </button>
                    <button 
                      onClick={() => handleOpenShare(workspace)}
                      className="px-3 py-2 text-xs bg-input border border-border/60 text-text-secondary hover:text-text-primary font-semibold rounded hover:bg-bg-hover transition-colors cursor-pointer"
                      title="Manage Access Invite Link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {(workspace.lead === username || userRole === 'admin') && (
                      <button 
                        onClick={() => {
                          setDeletingWorkspace(workspace)
                          setShowDeleteModal(true)
                        }}
                        className="px-3 py-2 text-xs bg-input border border-border/60 text-text-secondary hover:text-danger hover:border-danger/30 font-semibold rounded hover:bg-danger-bg transition-colors cursor-pointer"
                        title="Delete Project Workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {workspaces.length === 0 && (
              <div className="col-span-full bg-card border border-border/80 rounded-lg p-12 text-center">
                <div className="text-4xl mb-3 opacity-30">📁</div>
                <h4 className="text-sm font-semibold text-text-secondary">No workspaces found</h4>
                <p className="text-xs text-text-muted mt-1.5 max-w-xs mx-auto">Create a new project in the top header to initialize your collaborative sandbox workspace.</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {workspaces.length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-border pt-4 mt-6 select-none">
              <div className="text-xs text-text-secondary">
                Showing <span className="font-semibold text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, workspaces.length)}</span> of{' '}
                <span className="font-semibold text-text-primary">{workspaces.length}</span> entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-input border border-border rounded text-[11px] font-semibold hover:bg-bg-hover disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.ceil(workspaces.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 border rounded text-[11px] font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-primary border-primary text-white'
                        : 'bg-input border-border text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(workspaces.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(workspaces.length / itemsPerPage)}
                  className="px-2.5 py-1 bg-input border border-border rounded text-[11px] font-semibold hover:bg-bg-hover disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Recent Notebooks Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Recent Notebooks</h3>
            <div className="space-y-2 overflow-y-auto max-h-96 pr-1 scrollbar-thin">
              {recentNotebooks.map((notebook) => (
                <div
                  key={notebook.id}
                  className="flex items-center gap-4 p-3 bg-input rounded hover:bg-bg-hover transition-colors border border-border/10"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{notebook.name}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-1 flex items-center gap-2">
                      <span className="font-semibold text-text-secondary">{notebook.project}</span>
                      <span>•</span>
                      <span>Modified: {notebook.lastModified}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {notebook.status === 'editing' ? (
                    <div className="px-3 py-1.5 bg-[#6a9955]/20 border border-[#6a9955]/40 rounded flex items-center gap-1.5 whitespace-nowrap">
                      <div className="w-1.5 h-1.5 bg-[#6a9955] rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-[#b5dc94]">
                        Editing (you)
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 bg-[#569cd6]/20 border border-[#569cd6]/40 rounded flex items-center gap-1.5 whitespace-nowrap">
                      <Lock className="w-3 h-3 text-[#569cd6]" />
                      <span className="text-[10px] font-bold text-[#88bef4]">
                        Locked by {notebook.lockedBy}
                      </span>
                    </div>
                  )}

                  <button 
                    onClick={() => onLaunchWorkspace?.(notebook.project)}
                    className="px-3 py-1.5 text-xs bg-primary text-white font-semibold rounded hover:bg-primary-hover transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Open
                  </button>
                </div>
              ))}

              {recentNotebooks.length === 0 && (
                <div className="text-center text-xs text-text-muted py-12 italic border border-dashed border-border/40 rounded">
                  No notebooks found. Open a workspace and create a notebook cell to display it here.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Workspace Info Modal */}
      <Modal
        isOpen={showWorkspaceInfo && !!selectedWorkspace}
        onClose={() => setShowWorkspaceInfo(false)}
        title={selectedWorkspace?.name || ''}
        size="md"
      >
        <div className="space-y-4 pt-1">
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase mb-1.5">
              Description
            </h4>
            <p className="text-sm text-text-secondary leading-relaxed bg-[#1b1b1f] p-3 rounded border border-border/40 font-medium">
              {selectedWorkspace?.description}
            </p>
          </div>

          {isAccessDenied ? (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded text-xs space-y-1.5 font-medium">
              <div className="flex items-center gap-1.5 font-bold text-[13px]">
                <Lock className="w-4 h-4" />
                Access Restricted
              </div>
              <p>You must be a member of this project workspace team to view git commits or notebook files.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1b1b1f] border border-border/30 rounded p-3">
                  <span className="text-xs text-text-muted block mb-1 font-semibold">Project Lead</span>
                  {selectedWorkspace && (
                    <UserBadge 
                      username={selectedWorkspace.lead}
                      avatarSize="sm"
                      isClickable={true}
                    />
                  )}
                </div>
                <div className="bg-[#1b1b1f] border border-border/30 rounded p-3">
                  <span className="text-xs text-text-muted block mb-1 font-semibold">Total Notebooks</span>
                  <span className="text-sm font-bold text-text-primary">
                    {selectedWorkspace?.notebooks}
                  </span>
                </div>
              </div>

              {/* Latest Commit Details */}
              <div className="bg-[#1b1b1f] border border-[#a855f7]/20 rounded p-3.5">
                <h4 className="text-xs font-bold text-text-muted uppercase mb-2.5 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[#c084fc]" />
                  <span className="text-text-secondary">Latest Version Status</span>
                </h4>
                {loadingHistory ? (
                  <div className="text-xs text-text-muted animate-pulse font-medium">Loading workspace version history...</div>
                ) : selectedCommitHistory && selectedCommitHistory.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-[#d8b4fe] truncate flex items-center gap-1">
                        <GitCommit className="w-3.5 h-3.5" />
                        <span>{selectedCommitHistory[0].message}</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#252526] text-text-primary rounded border border-border/60 flex-shrink-0">
                        {selectedCommitHistory[0].id.replace('commit_', '').slice(-7)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted font-medium">
                      <UserBadge 
                        username={selectedCommitHistory[0].created_by}
                        avatarSize="xs"
                        isClickable={true}
                      />
                      <span>•</span>
                      <span>
                        {new Date(selectedCommitHistory[0].created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-text-muted italic font-medium">No commits recorded on main branch yet.</div>
                )}
              </div>

              {/* Team Members List */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase mb-2.5">
                  Team Members ({selectedWorkspace?.team.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedWorkspace?.team.map((member) => (
                    <UserBadge
                      key={member}
                      username={member}
                      avatarSize="sm"
                      withBackground={true}
                      showFirstNameOnly={true}
                    />
                  ))}
                  {selectedWorkspace?.team.length === 0 && (
                    <div className="text-xs text-text-muted italic font-medium">No members assigned to this team.</div>
                  )}
                </div>
              </div>

              {/* Notebook Files list */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase mb-2">
                  Notebook Files ({selectedWorkspace?.notebooksList.length})
                </h4>
                <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                  {(isNotebooksExpanded 
                    ? selectedWorkspace?.notebooksList 
                    : selectedWorkspace?.notebooksList.slice(0, 2)
                  )?.map((nb) => (
                    <div
                      key={nb}
                      className="px-2.5 py-1.5 bg-[#1b1b1f] border border-border/30 rounded text-xs text-text-primary flex items-center justify-between hover:border-primary/50 transition-colors"
                    >
                      <span className="font-mono text-text-secondary truncate">{nb}</span>
                      <button
                        onClick={() => {
                          setShowWorkspaceInfo(false)
                          if (onLaunchWorkspace && selectedWorkspace) onLaunchWorkspace(selectedWorkspace.name)
                        }}
                        className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded text-[10px] font-semibold cursor-pointer"
                      >
                        Launch
                      </button>
                    </div>
                  ))}
                  {selectedWorkspace?.notebooksList.length === 0 && (
                    <div className="text-xs text-text-muted italic py-1 font-medium">No notebooks found in this workspace.</div>
                  )}
                </div>
                {selectedWorkspace && selectedWorkspace.notebooksList.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setIsNotebooksExpanded(!isNotebooksExpanded)}
                    className="w-full text-center py-1.5 border border-dashed border-border/40 hover:border-primary/50 text-[10px] font-bold text-text-muted hover:text-primary rounded cursor-pointer mt-2 transition-all"
                  >
                    {isNotebooksExpanded ? 'Show Less' : `+ ${selectedWorkspace.notebooksList.length - 2} more`}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
            <button
              onClick={() => setShowWorkspaceInfo(false)}
              className="px-4 py-2 text-xs font-bold text-text-secondary bg-input border border-border/80 rounded hover:bg-bg-hover transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowWorkspaceInfo(false)
                if (onLaunchWorkspace && selectedWorkspace) onLaunchWorkspace(selectedWorkspace.name)
              }}
              disabled={isAccessDenied}
              className="px-4 py-2 text-xs font-bold text-white bg-primary rounded hover:bg-primary-hover disabled:bg-[#2d2d30] disabled:text-text-muted disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Open Workspace
            </button>
          </div>
        </div>
      </Modal>

      {/* Share / Access Invite Management Modal */}
      <Modal
        isOpen={showShareModal && !!sharingWorkspace}
        onClose={() => setShowShareModal(false)}
        title={`Share Access: ${sharingWorkspace?.name}`}
        description="Share project invites with available analysts or revoke existing team members access."
        size="lg"
      >
        <div className="space-y-4 pt-1">
          {/* Invite form */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-muted uppercase">Invite Analysts to Project</h4>
            <div className="flex gap-2">
              <div className="relative flex-1 bg-input border border-border/80 rounded flex items-center px-2.5">
                <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Search analysts by name or email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full bg-transparent text-text-primary text-xs py-2 outline-none font-medium"
                  disabled={loadingShareData}
                />
              </div>
            </div>

            {searchUserQuery.trim() && (
              <div className="border border-border/60 bg-[#16161a] rounded max-h-40 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
                {filteredUsersToInvite.map(user => {
                  const isSelected = selectedUsersToInvite.includes(String(user.id))
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedUsersToInvite(prev => prev.filter(id => id !== String(user.id)))
                        } else {
                          setSelectedUsersToInvite(prev => [...prev, String(user.id)])
                        }
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-primary/10 transition-colors flex items-center justify-between ${
                        isSelected ? 'bg-primary/5 text-primary font-bold' : 'text-text-secondary font-medium'
                      }`}
                    >
                      <UserBadge
                        username={user.username}
                        fullName={user.full_name || undefined}
                        email={user.email || undefined}
                        role={user.role}
                        avatarSize="md"
                        showRoleSubtext={true}
                        roleSubtext={user.full_name ? `${user.full_name} (${user.email})` : 'Collaborator'}
                        isClickable={true}
                      />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-border/80'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  )
                })}

                {filteredUsersToInvite.length === 0 && (
                  <div className="text-center text-xs text-text-muted py-4">No analysts match your search query</div>
                )}
              </div>
            )}

            {selectedUsersToInvite.length > 0 && (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-2.5 rounded">
                <span className="text-xs font-semibold text-primary">Selected: {selectedUsersToInvite.length} analysts</span>
                <button
                  onClick={handleAddMembers}
                  disabled={loadingShareData}
                  className="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-[11px] font-bold rounded cursor-pointer transition-colors"
                >
                  Share Invite
                </button>
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-text-muted uppercase">People with Access</h4>
            <div className="bg-[#16161a] border border-border/40 rounded overflow-hidden">
              <div className="max-h-48 overflow-y-auto divide-y divide-border/20 scrollbar-thin">
                {/* Lead Row */}
                {sharingWorkspace && (
                  <div className="flex items-center justify-between p-2.5 text-xs">
                    <UserBadge
                      username={sharingWorkspace.lead}
                      avatarSize="md"
                      showRoleSubtext={true}
                      roleSubtext="Project Owner / Lead"
                    />
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 border border-primary/20 rounded">
                      Owner
                    </span>
                  </div>
                )}

                {/* Team Members Rows */}
                {sharingWorkspace?.team.map(member => {
                  if (member === sharingWorkspace.lead) return null // already rendered above
                  const showRevoke = (sharingWorkspace.lead === username || userRole === 'admin') && member !== username
                  return (
                    <div key={member} className="flex items-center justify-between p-2.5 text-xs hover:bg-[#1b1b1f]">
                      <UserBadge
                        username={member}
                        avatarSize="md"
                        showRoleSubtext={true}
                        roleSubtext="Analyst Collaborator"
                      />
                      {showRevoke && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={loadingShareData}
                          className="p-1 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-text-muted hover:text-rose-400 rounded transition-colors cursor-pointer"
                          title="Revoke access"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Pending Invites Rows */}
                {sharingWorkspace?.invited_users?.map(invitedUsername => (
                  <div key={`invited-${invitedUsername}`} className="flex items-center justify-between p-2.5 text-xs hover:bg-[#1b1b1f] border-t border-border/10">
                    <UserBadge
                      username={invitedUsername}
                      avatarSize="md"
                      showRoleSubtext={true}
                      roleSubtext="Invite Sent • Pending Acceptance"
                    />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[10px] font-semibold select-none flex-shrink-0">
                      <Mail className="w-3 h-3 animate-pulse" />
                      Pending
                    </span>
                  </div>
                ))}

                {sharingWorkspace && 
                 sharingWorkspace.team.filter(t => t !== sharingWorkspace.lead).length === 0 && 
                 (!sharingWorkspace.invited_users || sharingWorkspace.invited_users.length === 0) && (
                  <div className="text-center text-xs text-text-muted py-6 italic">
                    No collaborators added yet. Invite analysts above to begin team collaboration.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border/40">
            <button
              onClick={() => setShowShareModal(false)}
              className="px-4 py-2 text-xs font-bold text-text-secondary bg-input border border-border/80 rounded hover:bg-bg-hover transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        title="Create New Project"
        description="Initialize a new collaborative sandbox workspace governed by a dedicated team."
        size="md"
      >
        <form onSubmit={handleCreateProjectSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Project / Team Name</label>
            <input
              type="text"
              placeholder="e.g. Q1 Sales, Marketing Optimization"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full bg-input border border-border/80 text-text-primary text-xs rounded p-2 outline-none font-medium"
              required
              disabled={isSubmittingProject}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Description</label>
            <textarea
              placeholder="Provide a summary of the forecasting, segmentation, or analysis goals..."
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              className="w-full bg-input border border-border/80 text-text-primary text-xs rounded p-2 h-20 outline-none font-medium resize-none"
              disabled={isSubmittingProject}
            />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={() => setShowCreateProjectModal(false)}
              className="px-4 py-2 text-xs font-bold text-text-secondary bg-input border border-border/80 rounded hover:bg-bg-hover transition-colors cursor-pointer"
              disabled={isSubmittingProject}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingProject || !newProjectName.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-primary rounded hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmittingProject ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Implications Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={`Delete Project: ${deletingWorkspace?.name || ''}`}
        description="Review the implications of permanently deleting this collaborative workspace. This action cannot be undone."
        size="md"
      >
        <div className="space-y-4 pt-1">
          {/* Warning Banner */}
          <div className="p-3 bg-danger-bg border border-danger/30 rounded text-xs text-danger flex items-start gap-2">
            <span className="text-sm">⚠️</span>
            <div>
              <p className="font-bold">Crucial Warning</p>
              <p className="mt-0.5 opacity-90">Deleting this project will permanently remove its repository, all notebook files, commit history, and collaborator clearances.</p>
            </div>
          </div>

          {/* Notebooks detail section */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
              <span>Permanently Deleting Notebooks</span>
              <span className="text-[10px] bg-input px-1.5 py-0.5 rounded text-text-muted font-bold">
                {deletingWorkspace?.notebooksList?.length || 0} files
              </span>
            </h4>
            <div className="bg-input border border-border rounded p-2 text-xs max-h-32 overflow-y-auto scrollbar-thin">
              {deletingWorkspace?.notebooksList && deletingWorkspace.notebooksList.length > 0 ? (
                <ul className="space-y-1 list-disc pl-4 text-text-secondary font-medium">
                  {deletingWorkspace.notebooksList.map(nb => (
                    <li key={nb} className="truncate">{nb}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted italic">No notebooks present in this project.</p>
              )}
            </div>
          </div>

          {/* Collaborators detail section */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
              <span>Revoking Access Clearances</span>
              <span className="text-[10px] bg-input px-1.5 py-0.5 rounded text-text-muted font-bold">
                {deletingWorkspace?.team?.length || 0} collaborators
              </span>
            </h4>
            <div className="bg-input border border-border rounded p-2 text-xs max-h-32 overflow-y-auto scrollbar-thin">
              {deletingWorkspace?.team && deletingWorkspace.team.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {deletingWorkspace.team.map(member => (
                    <UserBadge
                      key={member}
                      username={member}
                      avatarSize="xs"
                      withBackground={true}
                      showRoleSubtext={member === deletingWorkspace.lead}
                      roleSubtext={member === deletingWorkspace.lead ? 'Lead' : undefined}
                      showFirstNameOnly={true}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-text-muted italic">No collaborators belong to this project.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-xs font-bold text-text-secondary bg-input border border-border/80 rounded hover:bg-bg-hover transition-colors cursor-pointer"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteWorkspace}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-bold text-white bg-[#f44747] hover:bg-[#d13b3b] rounded transition-colors cursor-pointer"
            >
              {isDeleting ? 'Deleting...' : 'Delete Anyway'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
