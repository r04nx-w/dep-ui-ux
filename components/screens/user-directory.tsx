'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Eye, EyeOff, User, Cpu, HardDrive, Clock, Mail,
  Shield, AlertTriangle, RefreshCw, Zap, Lock, Copy, Check, Link2, ExternalLink, Send,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/ui/status-badge'
import { apiFetch } from '@/lib/api'
import { UserBadge, capitalize } from '@/components/ui/user-badge'
import {
  FormField,
  TextInput,
  Select,
  Checkbox,
} from '@/components/ui/form-field'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserItem {
  id: number
  username: string
  full_name: string | null
  email: string | null
  role: string
  status: string
  created_at: string
  created_by: number | null
  force_change_password: boolean
  cpu_cores: string
  ram_gb: string
  storage_gb: number
  gpu_enabled: boolean
  idle_timeout: string
}

interface UserInviteItem {
  id: number
  code: string
  email: string
  role: string
  status: string
  created_by: string
  created_at: string
  used_at: string | null
  invite_link: string
}

interface UserForm {
  username: string
  full_name: string
  email: string
  password: string
  role: string
  status: string
  forceChangePassword: boolean
  cpu_cores: string
  ram_gb: string
  storage_gb: number
  gpu_enabled: boolean
  idle_timeout: string
}

// ─── Password utilities ───────────────────────────────────────────────────────

const CHARS = {
  lower:   'abcdefghijklmnopqrstuvwxyz',
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits:  '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
}

function generateStrongPassword(length = 16): string {
  const pool = CHARS.lower + CHARS.upper + CHARS.digits + CHARS.symbols
  const guaranteed = [
    CHARS.lower[Math.floor(Math.random() * CHARS.lower.length)],
    CHARS.upper[Math.floor(Math.random() * CHARS.upper.length)],
    CHARS.digits[Math.floor(Math.random() * CHARS.digits.length)],
    CHARS.symbols[Math.floor(Math.random() * CHARS.symbols.length)],
  ]
  const rest = Array.from({ length: length - 4 }, () =>
    pool[Math.floor(Math.random() * pool.length)]
  )
  return [...guaranteed, ...rest].sort(() => Math.random() - 0.5).join('')
}

interface PwStrength { score: 0|1|2|3|4; label: string; color: string; barColor: string }

function getPasswordStrength(pw: string): PwStrength {
  if (!pw) return { score: 0, label: '', color: 'text-text-muted', barColor: 'bg-border' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 14) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const s = Math.min(4, score) as 0|1|2|3|4
  const map: Record<number, PwStrength> = {
    0: { score: 0, label: 'Too short', color: 'text-[#f44747]', barColor: 'bg-[#f44747]' },
    1: { score: 1, label: 'Weak',      color: 'text-[#f44747]', barColor: 'bg-[#f44747]' },
    2: { score: 2, label: 'Fair',      color: 'text-[#ffb84d]', barColor: 'bg-[#ffb84d]' },
    3: { score: 3, label: 'Good',      color: 'text-[#7cb342]', barColor: 'bg-[#7cb342]' },
    4: { score: 4, label: 'Strong',    color: 'text-[#4caf50]', barColor: 'bg-[#4caf50]' },
  }
  return map[s]
}

// ─── Password Field component ─────────────────────────────────────────────────

function PasswordField({
  value, onChange, onGenerate,
}: { value: string; onChange: (v: string) => void; onGenerate?: () => void }) {
  const [show, setShow] = useState(false)
  const strength = getPasswordStrength(value)
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 pr-9 bg-input border border-border rounded text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            title="Generate strong password"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-colors whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            Generate
          </button>
        )}
      </div>
      {value.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1,2,3,4].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.barColor : 'bg-border'}`} />
            ))}
          </div>
          <p className={`text-[11px] font-medium ${strength.color}`}>{strength.label}</p>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: string) {
  if (role === 'super_admin')    return 'Super Admin'
  if (role === 'data_onboarder') return 'Data Onboarder'
  return 'Analyst'
}

function defaultForm(): UserForm {
  return {
    username: '', full_name: '', email: '', password: '',
    role: 'analyst', status: 'active', forceChangePassword: false,
    cpu_cores: '2 Cores', ram_gb: '8 GB', storage_gb: 20,
    gpu_enabled: false, idle_timeout: '1 Hour',
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UserDirectory() {
  const [users, setUsers]           = useState<UserItem[]>([])
  const [loading, setLoading]       = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  const [isDetailsModal, setIsDetailsModal] = useState(false)
  const [isCreateModal, setIsCreateModal]   = useState(false)
  const [isEditModal, setIsEditModal]       = useState(false)
  const [isDeleteModal, setIsDeleteModal]   = useState(false)

  // Invite Modal state
  const [isInviteModal, setIsInviteModal]   = useState(false)
  const [invites, setInvites]               = useState<UserInviteItem[]>([])
  const [inviteEmail, setInviteEmail]       = useState('')
  const [inviteRole, setInviteRole]         = useState('analyst')
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [generatedInvite, setGeneratedInvite] = useState<UserInviteItem | null>(null)
  const [copiedId, setCopiedId]             = useState<number | null>(null)

  const [createForm, setCreateForm] = useState<UserForm>(defaultForm())
  const [editForm,   setEditForm]   = useState<UserItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [isSaving, setIsSaving]     = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15
  
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success'|'error'|'warning'|'info',
    title: '', message: '',
  })
  const showAlert = (type: typeof alertState.type, title: string, message: string) =>
    setAlertState({ isOpen: true, type, title, message })

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<UserItem[]>('/users')
      setUsers(data)
    } catch (err: any) {
      showAlert('error', 'Fetch Failed', err.message || 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchInvites = useCallback(async () => {
    try {
      const data = await apiFetch<UserInviteItem[]>('/invites')
      setInvites(data)
    } catch (err: any) {
      console.error('Failed to load invites', err)
    }
  }, [])

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      showAlert('error', 'Validation Error', 'Please enter a valid target email address.')
      return
    }

    setIsGeneratingInvite(true)
    try {
      const newInv = await apiFetch<UserInviteItem>('/invites', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      setGeneratedInvite(newInv)
      showAlert('success', 'Invite Generated!', `Invitation code ${newInv.code} created for ${newInv.email}.`)
      setInviteEmail('')
      fetchInvites()
    } catch (err: any) {
      showAlert('error', 'Generate Failed', err.message || 'Could not generate invitation link.')
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const handleCopyInviteLink = (inv: UserInviteItem) => {
    const fullUrl = `${window.location.origin}${inv.invite_link}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedId(inv.id)
    showAlert('info', 'Link Copied', 'Invitation link copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevokeInvite = async (inviteId: number) => {
    if (!confirm('Revoke this invitation?')) return
    try {
      await apiFetch(`/invites/${inviteId}`, { method: 'DELETE' })
      showAlert('success', 'Invite Revoked', 'Invitation link has been revoked.')
      fetchInvites()
    } catch (err: any) {
      showAlert('error', 'Revoke Failed', err.message || 'Could not revoke invitation.')
    }
  }

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    if (users.length > 0) {
      const targetUserIdStr = localStorage.getItem('dep_search_target_user_id')
      if (targetUserIdStr) {
        const targetId = Number(targetUserIdStr)
        const found = users.find((u) => u.id === targetId)
        if (found) {
          setSelectedUser(found)
          setIsDetailsModal(true)
        }
        localStorage.removeItem('dep_search_target_user_id')
      }
    }
  }, [users])

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleSaveCreate = async () => {
    if (!createForm.username.trim() || !createForm.password.trim()) {
      showAlert('error', 'Validation Error', 'Username and password are required.')
      return
    }
    if (getPasswordStrength(createForm.password).score < 2) {
      showAlert('warning', 'Weak Password', 'Please choose a stronger password (at least Fair strength).')
      return
    }

    setIsSaving(true)
    try {
      const backendRole =
        createForm.role === 'admin'     ? 'super_admin'
        : createForm.role === 'onboarder' ? 'data_onboarder'
        : 'analyst'

      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          username:              createForm.username.trim(),
          password:              createForm.password,
          role:                  backendRole,
          full_name:             createForm.full_name.trim() || null,
          email:                 createForm.email.trim()     || null,
          force_change_password: createForm.forceChangePassword,
          cpu_cores:             createForm.cpu_cores,
          ram_gb:                createForm.ram_gb,
          storage_gb:            createForm.storage_gb,
          gpu_enabled:           createForm.gpu_enabled,
          idle_timeout:          createForm.idle_timeout,
        }),
      })

      showAlert('success', 'User Created', `"${createForm.username}" added successfully.`)
      setIsCreateModal(false)
      setCreateForm(defaultForm())
      fetchUsers()
    } catch (err: any) {
      showAlert('error', 'Create Failed', err.message || 'An error occurred.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Toggle status ──────────────────────────────────────────────────────────

  const handleToggleStatus = async (user: UserItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const endpoint = user.status === 'active'
      ? `/users/${user.id}/deactivate`
      : `/users/${user.id}/activate`
    try {
      await apiFetch(endpoint, { method: 'PATCH' })
      showAlert('success', 'Status Updated',
        `${user.username} is now ${user.status === 'active' ? 'inactive' : 'active'}.`)
      fetchUsers()
    } catch (err: any) {
      showAlert('error', 'Update Failed', err.message || 'Could not update status.')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsSaving(true)
    try {
      await apiFetch(`/users/${deleteTarget.id}`, {
        method: 'DELETE'
      })
      showAlert('success', 'User Removed', `User "${deleteTarget.username}" deleted successfully.`)
      setIsDeleteModal(false)
      setDeleteTarget(null)
      fetchUsers()
    } catch (err: any) {
      showAlert('error', 'Delete Failed', err.message || 'Could not delete user account.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editForm) return
    setIsSaving(true)
    try {
      await apiFetch(`/users/${editForm.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: editForm.full_name,
          email: editForm.email,
          role: editForm.role,
          status: editForm.status,
          cpu_cores: editForm.cpu_cores,
          ram_gb: editForm.ram_gb,
          storage_gb: editForm.storage_gb,
          gpu_enabled: editForm.gpu_enabled,
          idle_timeout: editForm.idle_timeout
        })
      })
      showAlert('success', 'User Updated', `Details for "${editForm.username}" have been updated.`)
      setIsEditModal(false)
      fetchUsers()
    } catch (err: any) {
      showAlert('error', 'Update Failed', err.message || 'Could not update user settings.')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Alert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        duration={3500}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">User Directory</h2>
          <p className="text-sm text-text-secondary mt-1">
            Manage user accounts, roles, access state, and compute allocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 rounded hover:bg-bg-hover text-text-muted disabled:opacity-40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setIsInviteModal(true)
              fetchInvites()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-input border border-border hover:bg-bg-hover text-text-primary rounded-sm text-sm font-medium transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4 text-primary" />
            Generate Invite Link
          </button>
          <button
            onClick={() => { setCreateForm(defaultForm()); setIsCreateModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-sm p-6">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left p-3 font-semibold">Name</th>
                  <th className="text-left p-3 font-semibold">Email</th>
                  <th className="text-left p-3 font-semibold">Role</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-right p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setIsDetailsModal(true) }}
                    className="border-b border-border hover:bg-bg-hover cursor-pointer transition-colors"
                  >
                    <td className="p-3">
                      <UserBadge
                        username={user.username}
                        fullName={user.full_name || undefined}
                        email={user.email || undefined}
                        role={user.role}
                        avatarSize="md"
                        isClickable={false}
                      />
                    </td>
                    <td className="p-3 text-text-secondary">{user.email || '—'}</td>
                    <td className="p-3">
                      <span className="inline-block px-2.5 py-0.5 bg-input text-primary text-xs font-medium rounded-sm border border-border">
                        {roleLabel(user.role).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={user.status === 'active' ? 'active' : 'inactive'} />
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditForm(user); setSelectedUser(user); setIsEditModal(true) }}
                          className="p-1.5 hover:bg-bg-hover rounded transition-colors text-primary"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleToggleStatus(user, e)}
                          className="p-1.5 hover:bg-bg-hover rounded transition-colors"
                          title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {user.status === 'active'
                            ? <ToggleRight className="w-5 h-5 text-[#6a9955]" />
                            : <ToggleLeft className="w-5 h-5 text-text-muted" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(user); setIsDeleteModal(true) }}
                          className="p-1.5 hover:bg-[#f44747]/20 rounded transition-colors text-text-muted hover:text-[#f44747]"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-text-muted">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {users.length > itemsPerPage && (
              <div className="flex items-center justify-between border-t border-border pt-4 mt-4 select-none">
                <div className="text-xs text-text-secondary">
                  Showing <span className="font-semibold text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, users.length)}</span> of{' '}
                  <span className="font-semibold text-text-primary">{users.length}</span> entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-input border border-border rounded text-[11px] font-semibold hover:bg-bg-hover disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.ceil(users.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(users.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(users.length / itemsPerPage)}
                    className="px-2.5 py-1 bg-input border border-border rounded text-[11px] font-semibold hover:bg-bg-hover disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Details Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={isDetailsModal} onClose={() => setIsDetailsModal(false)} title="User Profiles & Allocations" size="lg">
        {selectedUser && (
          <div className="space-y-6">
            {/* Identity */}
            <div className="bg-input p-4 rounded-sm border border-border flex items-start gap-4">
              <img 
                src="/placeholder-user.jpg" 
                alt={selectedUser.username} 
                className="w-12 h-12 rounded-sm border border-border/40 object-cover flex-shrink-0 bg-card"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-text-primary truncate">
                  {selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() + selectedUser.full_name.slice(1) : selectedUser.username.charAt(0).toUpperCase() + selectedUser.username.slice(1)}
                </h3>
                <p className="text-xs text-text-secondary font-medium mt-0.5">
                  Username: {selectedUser.username.charAt(0).toUpperCase() + selectedUser.username.slice(1)}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 bg-background border border-border rounded-sm text-primary font-mono uppercase">
                    {roleLabel(selectedUser.role)}
                  </span>
                  <StatusBadge status={selectedUser.status === 'active' ? 'active' : 'inactive'} />
                </div>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs text-text-secondary flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</p>
                <p className="text-sm text-text-primary font-medium mt-1">{selectedUser.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Created On</p>
                <p className="text-sm text-text-primary font-medium mt-1">
                  {new Date(selectedUser.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Compute Profile Panel */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-primary" />
                JupyterLab Container Allocations
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-bg-hover p-4 rounded-sm border border-border">
                {[
                  { icon: Cpu,       label: 'CPU Cores',    value: selectedUser.cpu_cores  },
                  { icon: Cpu,       label: 'RAM Memory',   value: selectedUser.ram_gb     },
                  { icon: HardDrive, label: 'Storage Quota', value: `${selectedUser.storage_gb} GB` },
                  { icon: Clock,     label: 'Idle Timeout', value: selectedUser.idle_timeout },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-text-secondary" />
                    <div>
                      <p className="text-[10px] text-text-secondary uppercase">{label}</p>
                      <p className="text-sm text-text-primary font-medium">{value}</p>
                    </div>
                  </div>
                ))}
                <div className="sm:col-span-2 pt-2 border-t border-border mt-1 flex justify-between text-xs">
                  <span className="text-text-secondary">GPU Accelerator Access:</span>
                  <span className={`font-semibold ${selectedUser.gpu_enabled ? 'text-[#6a9955]' : 'text-text-secondary'}`}>
                    {selectedUser.gpu_enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button onClick={() => setIsDetailsModal(false)} className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-hover rounded-sm hover:bg-bg-hover transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create User Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateModal}
        onClose={() => { setIsCreateModal(false); setCreateForm(defaultForm()) }}
        title="Add New Workbench User"
        description="Configure credential settings and isolated compute allocations."
        size="lg"
      >
        <div className="space-y-4">

          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name">
              <TextInput
                type="text"
                placeholder="e.g. John Doe"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              />
            </FormField>
            <FormField label="Username" required>
              <TextInput
                type="text"
                placeholder="e.g. johndoe"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Email Address">
            <TextInput
              type="email"
              placeholder="e.g. john@company.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="User Role">
              <Select
                options={[
                  { value: 'analyst',   label: 'Analyst'        },
                  { value: 'onboarder', label: 'Data Onboarder' },
                  { value: 'admin',     label: 'Super Admin'    },
                ]}
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              />
            </FormField>
            <FormField label="Initial Status">
              <Select
                options={[
                  { value: 'active',   label: 'Active'   },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={createForm.status}
                onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
              />
            </FormField>
          </div>

          {/* Password section */}
          <div className="border border-border rounded-sm p-4 space-y-3 bg-bg-hover">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Initial Password
            </h4>
            <FormField label="Password" required>
              <PasswordField
                value={createForm.password}
                onChange={(v) => setCreateForm({ ...createForm, password: v })}
                onGenerate={() => setCreateForm({ ...createForm, password: generateStrongPassword() })}
              />
            </FormField>
            <div className="flex items-center gap-2 pt-1">
              <input
                id="force-change-cb"
                type="checkbox"
                checked={createForm.forceChangePassword}
                onChange={(e) => setCreateForm({ ...createForm, forceChangePassword: e.target.checked })}
                className="w-4 h-4 accent-primary cursor-pointer rounded"
              />
              <label htmlFor="force-change-cb" className="text-sm text-text-secondary cursor-pointer select-none">
                Require password change on first login
              </label>
            </div>
          </div>

          {/* Compute Allocations */}
          <div className="bg-bg-hover p-4 rounded-sm border border-border space-y-4">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-primary" />
              Isolated Container Computes Allocations
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="CPU Cores">
                <Select
                  options={[
                    { value: '1 Core',  label: '1 Core'  },
                    { value: '2 Cores', label: '2 Cores' },
                    { value: '4 Cores', label: '4 Cores' },
                    { value: '8 Cores', label: '8 Cores' },
                  ]}
                  value={createForm.cpu_cores}
                  onChange={(e) => setCreateForm({ ...createForm, cpu_cores: e.target.value })}
                />
              </FormField>
              <FormField label="RAM Memory">
                <Select
                  options={[
                    { value: '2 GB',  label: '2 GB'  },
                    { value: '4 GB',  label: '4 GB'  },
                    { value: '8 GB',  label: '8 GB'  },
                    { value: '16 GB', label: '16 GB' },
                    { value: '32 GB', label: '32 GB' },
                  ]}
                  value={createForm.ram_gb}
                  onChange={(e) => setCreateForm({ ...createForm, ram_gb: e.target.value })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4 items-center">
              <FormField label="Session Idle Timeout">
                <Select
                  options={[
                    { value: '30 Minutes', label: '30 Minutes' },
                    { value: '1 Hour',     label: '1 Hour'     },
                    { value: '2 Hours',    label: '2 Hours'    },
                    { value: 'No Timeout', label: 'No Timeout' },
                  ]}
                  value={createForm.idle_timeout}
                  onChange={(e) => setCreateForm({ ...createForm, idle_timeout: e.target.value })}
                />
              </FormField>
              <div className="pt-4 pl-4">
                <Checkbox
                  label="Grant GPU Accelerator Access"
                  checked={createForm.gpu_enabled}
                  onChange={(e) => setCreateForm({ ...createForm, gpu_enabled: e.target.checked })}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>Storage Limit Size</span>
                <span className="font-mono text-text-primary">{createForm.storage_gb} GB</span>
              </div>
              <input
                type="range" min="5" max="100" step="5"
                value={createForm.storage_gb}
                onChange={(e) => setCreateForm({ ...createForm, storage_gb: parseInt(e.target.value, 10) })}
                className="w-full accent-primary h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button
              onClick={() => { setIsCreateModal(false); setCreateForm(defaultForm()) }}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-hover rounded-sm hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCreate}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSaving
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating…</>
                : 'Add User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit User Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditModal}
        onClose={() => setIsEditModal(false)}
        title="Edit User Settings"
        description={`Update account and compute resource parameters for ${selectedUser?.username}`}
        size="lg"
      >
        {editForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name">
                <TextInput
                  type="text"
                  placeholder="Full Name"
                  value={editForm.full_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </FormField>
              <FormField label="Username" required>
                <TextInput
                  type="text"
                  value={editForm.username}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
              </FormField>
            </div>

            <FormField label="Email Address">
              <TextInput
                type="email"
                placeholder="email@company.com"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="User Role">
                <Select
                  options={[
                    { value: 'analyst',      label: 'Analyst'        },
                    { value: 'data_onboarder', label: 'Data Onboarder' },
                    { value: 'super_admin',  label: 'Super Admin'    },
                  ]}
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  options={[
                    { value: 'active',   label: 'Active'   },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                />
              </FormField>
            </div>

            {/* Compute Allocations */}
            <div className="bg-bg-hover p-4 rounded-sm border border-border space-y-4">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-primary" />
                Isolated Container Computes Allocations
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="CPU Cores">
                  <Select
                    options={[
                      { value: '1 Core',  label: '1 Core'  },
                      { value: '2 Cores', label: '2 Cores' },
                      { value: '4 Cores', label: '4 Cores' },
                      { value: '8 Cores', label: '8 Cores' },
                    ]}
                    value={editForm.cpu_cores}
                    onChange={(e) => setEditForm({ ...editForm, cpu_cores: e.target.value })}
                  />
                </FormField>
                <FormField label="RAM Memory">
                  <Select
                    options={[
                      { value: '2 GB',  label: '2 GB'  },
                      { value: '4 GB',  label: '4 GB'  },
                      { value: '8 GB',  label: '8 GB'  },
                      { value: '16 GB', label: '16 GB' },
                      { value: '32 GB', label: '32 GB' },
                    ]}
                    value={editForm.ram_gb}
                    onChange={(e) => setEditForm({ ...editForm, ram_gb: e.target.value })}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <FormField label="Session Idle Timeout">
                  <Select
                    options={[
                      { value: '30 Minutes', label: '30 Minutes' },
                      { value: '1 Hour',     label: '1 Hour'     },
                      { value: '2 Hours',    label: '2 Hours'    },
                      { value: 'No Timeout', label: 'No Timeout' },
                    ]}
                    value={editForm.idle_timeout}
                    onChange={(e) => setEditForm({ ...editForm, idle_timeout: e.target.value })}
                  />
                </FormField>
                <div className="pt-4 pl-4">
                  <Checkbox
                    label="Grant GPU Accelerator Access"
                    checked={editForm.gpu_enabled}
                    onChange={(e) => setEditForm({ ...editForm, gpu_enabled: e.target.checked })}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-text-secondary text-xs mb-1">
                  <span>Storage Limit Size</span>
                  <span className="font-mono text-text-primary">{editForm.storage_gb} GB</span>
                </div>
                <input
                  type="range" min="5" max="100" step="5"
                  value={editForm.storage_gb}
                  onChange={(e) => setEditForm({ ...editForm, storage_gb: parseInt(e.target.value, 10) })}
                  className="w-full accent-primary h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <button onClick={() => setIsEditModal(false)} className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-hover rounded-sm hover:bg-bg-hover transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Generate Registration Invite Modal ──────────────────────────── */}
      <Modal isOpen={isInviteModal} onClose={() => setIsInviteModal(false)} title="Generate Registration Invite Link" size="lg">
        <div className="space-y-6">
          <form onSubmit={handleGenerateInvite} className="bg-input/20 border border-border p-4 rounded-lg space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
              <Send className="w-4 h-4 text-primary" />
              <span>Create New Registration Invite</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Target Email Address *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. user@company.com"
                  className="w-full bg-input border border-border rounded px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-input border border-border rounded px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="analyst">Analyst</option>
                  <option value="onboarder">Data Onboarder</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isGeneratingInvite}
                className="px-4 py-2 bg-primary text-white rounded text-xs font-bold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isGeneratingInvite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                <span>Generate Invitation Link</span>
              </button>
            </div>
          </form>

          {/* Recently generated invite banner */}
          {generatedInvite && (
            <div className="bg-success/10 border border-success/30 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-success flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Invite Link Generated Successfully
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-success/20 text-success rounded">
                  {generatedInvite.code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${generatedInvite.invite_link}`}
                  className="w-full bg-input border border-border rounded px-3 py-1.5 text-xs text-text-primary font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyInviteLink(generatedInvite)}
                  className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded flex items-center gap-1 hover:bg-primary-hover transition-colors whitespace-nowrap"
                >
                  {copiedId === generatedInvite.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === generatedInvite.id ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Invitations List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">
              All Platform Invitations ({invites.length})
            </h4>
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg bg-card">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted bg-input/40 text-[10px] uppercase font-mono">
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Target Email</th>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-bg-hover font-mono text-[11px]">
                      <td className="p-2 font-bold text-primary">{inv.code}</td>
                      <td className="p-2 text-text-primary">{inv.email}</td>
                      <td className="p-2 uppercase text-text-secondary">{inv.role}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          inv.status === 'pending'
                            ? 'bg-warning/20 text-warning'
                            : inv.status === 'used'
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyInviteLink(inv)}
                                className="p-1 hover:bg-primary/20 text-primary rounded transition-colors"
                                title="Copy Link"
                              >
                                {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(inv.id)}
                                className="p-1 hover:bg-destructive/20 text-text-muted hover:text-destructive rounded transition-colors"
                                title="Revoke Invite"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {invites.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-text-muted italic">
                        No invitations generated yet. Create an invitation above to onboard users.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────── */}
      <Modal isOpen={isDeleteModal} onClose={() => setIsDeleteModal(false)} title="Remove User Account" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#f44747] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary leading-relaxed">
              Are you sure you want to delete user{' '}
              <span className="font-semibold text-text-primary">
                {deleteTarget?.username ? capitalize(deleteTarget.username) : ''}
              </span>?
              This will permanently revoke all access permissions and delete workspace settings.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button onClick={() => setIsDeleteModal(false)} className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-hover rounded-sm hover:bg-bg-hover transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#f44747] rounded-sm hover:bg-[#f44747]/80 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Removing...' : 'Remove User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
