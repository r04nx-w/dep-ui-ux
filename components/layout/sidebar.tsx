'use client'

import { ChevronDown, Database, FolderKanban, ShieldCheck, Compass, ShieldAlert, Terminal, FileSpreadsheet, UserCheck, History, Settings, LogOut, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  userRole: 'admin' | 'onboarder' | 'analyst'
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

const menuItems = {
  admin: [
    { section: 'GENERAL', items: [{ label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' }] },
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
    { section: 'GENERAL', items: [{ label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' }] },
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
      ],
    },
    {
      section: 'SYSTEM ADMINISTRATION',
      items: [{ label: 'User Directory', icon: UserCheck, id: 'users' }],
    },
  ],
  analyst: [
    { section: 'GENERAL', items: [{ label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' }] },
    {
      section: 'COLLABORATIVE PLAYGROUND',
      items: [
        { label: 'Catalog Explorer', icon: Compass, id: 'explorer' },
        { label: 'My Data Access', icon: ShieldAlert, id: 'access' },
        { label: 'Project Workspaces', icon: Terminal, id: 'workspaces' },
        { label: 'Saved Artifacts', icon: FileSpreadsheet, id: 'artifacts' },
      ],
    },
  ],
}

export function Sidebar({
  userRole,
  currentPage,
  onNavigate,
  onLogout,
}: SidebarProps) {
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
    <div className="w-64 bg-[#1e1e1e] border-r border-[#2b2b2b] flex flex-col h-screen overflow-y-auto">
      {/* Logo & Title */}
      <div className="px-4 py-4 border-b border-[#2b2b2b]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-[#007acc] rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">DEP</span>
          </div>
          <h1 className="text-sm font-bold text-[#cccccc]">DEP Workbench</h1>
        </div>
        <p className="text-xs text-[#606060]">v1.0</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-4 space-y-2">
        {sections.map((section) => (
          <div key={section.section}>
            <button
              onClick={() => toggleSection(section.section)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide hover:text-[#cccccc] transition-colors mb-1"
            >
              <span>{section.section}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  expandedSections[section.section] ? 'rotate-0' : '-rotate-90'
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
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-colors ${
                        isActive
                          ? 'bg-[#007acc] text-white'
                          : 'text-[#a3a3a3] hover:bg-[#37373d] hover:text-[#cccccc]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Profile Section */}
      <div className="border-t border-[#2b2b2b] p-3 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 bg-[#37373d] rounded-sm">
          <div className="w-8 h-8 bg-[#007acc] rounded-full flex items-center justify-center text-white text-xs font-bold">
            {userRole[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#cccccc]">
              {userRole === 'admin' ? 'super_admin' : userRole === 'onboarder' ? 'aditi' : 'analyst_user'}
            </p>
            <p className="text-xs text-[#a3a3a3]">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#a3a3a3] hover:bg-[#37373d] hover:text-[#cccccc] rounded-sm transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#f44747] hover:bg-[#f44747] hover:text-white rounded-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
