'use client'

import { RefreshCw, Menu } from 'lucide-react'
import { GlobalSearch } from '@/components/ui/global-search'

interface TopBarProps {
  title: string
  userRole: 'admin' | 'onboarder' | 'analyst'
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
}

export function TopBar({ title, userRole, onToggleSidebar, sidebarOpen }: TopBarProps) {
  return (
    <div className="h-16 bg-[#1e1e1e] border-b border-[#2b2b2b] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#a0a0a0] hover:text-[#e8e8e8]"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-[#e8e8e8]">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        <GlobalSearch />
        <span className="text-xs text-[#6a9955] flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-[#6a9955] rounded-full"></span>
          API: ONLINE
        </span>
        <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#a0a0a0] hover:text-[#e8e8e8]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
