'use client'

import { ChevronDown, Database, FolderKanban, ShieldCheck, Compass, ShieldAlert, Terminal, FileSpreadsheet, UserCheck, History, Settings, LogOut, LayoutDashboard, BookOpen, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface SidebarProps {
  userRole: 'admin' | 'onboarder' | 'analyst'
  username?: string
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const menuItems = {
  admin: [
    { section: 'GENERAL', items: [{ label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' }, { label: 'Tutorials', icon: BookOpen, id: 'tutorials' }] },
    {
      section: 'DATA SOURCE REGISTRY',
      items: [
        { label: 'Connections', icon: Database, id: 'connections' },
        { label: 'Resource Catalog', icon: FolderKanban, id: 'catalog' },
        { label: 'Governance & ACL', icon: ShieldCheck, id: 'acl' },
      ],
    },
    {
      section: 'COLLABORATIVE PLAYGROUND',
      items: [
        { label: 'Catalog Explorer', icon: Compass, id: 'explorer' },
        { label: 'My Data Access', icon: ShieldAlert, id: 'access' },
        { label: 'Project Workspaces', icon: Terminal, id: 'workspaces' },
        { label: 'Saved Artifacts', icon: FileSpreadsheet, id: 'artifacts' },
        { label: 'AI Client', icon: Sparkles, id: 'ai-client' },
      ],
    },
    {
      section: 'SYSTEM ADMINISTRATION',
      items: [
        { label: 'User Directory', icon: UserCheck, id: 'users' },
        { label: 'Audit Trails', icon: History, id: 'audit' },
      ],
    },
  ],
  onboarder: [
    { section: 'GENERAL', items: [{ label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' }, { label: 'Tutorials', icon: BookOpen, id: 'tutorials' }] },
    {
      section: 'DATA SOURCE REGISTRY',
      items: [
        { label: 'Connections', icon: Database, id: 'connections' },
        { label: 'Resource Catalog', icon: FolderKanban, id: 'catalog' },
        { label: 'Governance & ACL', icon: ShieldCheck, id: 'acl' },
      ],
    },
    {
      section: 'COLLABORATIVE PLAYGROUND',
      items: [
        { label: 'Catalog Explorer', icon: Compass, id: 'explorer' },
        { label: 'My Data Access', icon: ShieldAlert, id: 'access' },
        { label: 'Project Workspaces', icon: Terminal, id: 'workspaces' },
        { label: 'Saved Artifacts', icon: FileSpreadsheet, id: 'artifacts' },
        { label: 'AI Client', icon: Sparkles, id: 'ai-client' },
      ],
    },
    {
      section: 'SYSTEM ADMINISTRATION',
      items: [{ label: 'User Directory', icon: UserCheck, id: 'users' }],
    },
  ],
  analyst: [
    { section: 'GENERAL', items: [{ label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' }, { label: 'Tutorials', icon: BookOpen, id: 'tutorials' }] },
    {
      section: 'COLLABORATIVE PLAYGROUND',
      items: [
        { label: 'Catalog Explorer', icon: Compass, id: 'explorer' },
        { label: 'My Data Access', icon: ShieldAlert, id: 'access' },
        { label: 'Project Workspaces', icon: Terminal, id: 'workspaces' },
        { label: 'Saved Artifacts', icon: FileSpreadsheet, id: 'artifacts' },
        { label: 'AI Client', icon: Sparkles, id: 'ai-client' },
      ],
    },
  ],
}

export function Sidebar({
  userRole,
  username,
  currentPage,
  onNavigate,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [profileName, setProfileName] = useState('')
  const [profileUsername, setProfileUsername] = useState('')

  const fetchProfile = async () => {
    try {
      const data = await apiFetch<{ username: string; full_name?: string }>('/users/me')
      setProfileUsername(data.username)
      setProfileName(data.full_name || '')
    } catch (e) {
      console.warn('Sidebar failed to fetch profile:', e)
    }
  }

  const [pendingRequestCount, setPendingRequestCount] = useState(0)

  const fetchPendingRequests = async () => {
    if (userRole !== 'admin') return
    try {
      const list = await apiFetch<any[]>('/access-requests')
      const pending = list.filter((r) => r.status === 'pending')
      setPendingRequestCount(pending.length)
    } catch (e) {
      console.warn('Sidebar failed to fetch pending requests:', e)
    }
  }

  useEffect(() => {
    fetchProfile()
    window.addEventListener('dep_profile_updated', fetchProfile)
    
    fetchPendingRequests()
    const interval = setInterval(fetchPendingRequests, 10000)
    window.addEventListener('dep_access_requests_updated', fetchPendingRequests)
    
    return () => {
      window.removeEventListener('dep_profile_updated', fetchProfile)
      clearInterval(interval)
      window.removeEventListener('dep_access_requests_updated', fetchPendingRequests)
    }
  }, [userRole])

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'GENERAL': true,
    'DATA SOURCE REGISTRY': true,
    'COLLABORATIVE PLAYGROUND': true,
    'SYSTEM ADMINISTRATION': true,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const sections = menuItems[userRole]

  return (
    <div className="w-full h-screen bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col overflow-y-auto">
      {/* Logo & Title */}
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-[var(--primary)] rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold font-sans">DEP</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text-primary)] leading-none">DEP Workbench</h1>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-none mt-1">by Wissen Technology</p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">v1.0</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-4 space-y-2">
        {sections.map((section) => (
          <div key={section.section}>
            <button
              onClick={() => toggleSection(section.section)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide hover:text-[var(--text-primary)] transition-colors mb-1"
            >
              <span>{section.section}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expandedSections[section.section] ? 'rotate-0' : '-rotate-90'
                  }`}
              />
            </button>

            {expandedSections[section.section] && (
              <div className="space-y-1 pl-2">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.id

                  return (
                    <button
                      key={item.id}
                      id={`tour-sidebar-${item.id}`}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-sm transition-colors ${isActive
                          ? 'bg-[var(--primary)] text-white font-semibold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                      </div>
                      {item.id === 'acl' && pendingRequestCount > 0 && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Profile Section */}
      <div className="border-t border-[var(--border)] p-3 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-hover)] rounded-sm">
          <img 
            src="/placeholder-user.jpg" 
            alt={profileUsername || username || "user"}
            className="w-8 h-8 rounded-sm border border-border/40 object-cover flex-shrink-0 bg-card"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {profileName ? profileName.charAt(0).toUpperCase() + profileName.slice(1) : (userRole === 'admin' ? 'Super Admin' : userRole === 'onboarder' ? 'Data Onboarder' : 'Corporate Analyst')}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] leading-none mt-1 truncate">
              {(profileUsername || username || (userRole === 'admin' ? 'super_admin' : userRole === 'onboarder' ? 'dataonboarder' : 'corporate_analyst')).charAt(0).toUpperCase() + (profileUsername || username || (userRole === 'admin' ? 'super_admin' : userRole === 'onboarder' ? 'dataonboarder' : 'corporate_analyst')).slice(1)}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-sm transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white rounded-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
