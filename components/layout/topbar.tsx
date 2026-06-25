'use client'

import { RefreshCw } from 'lucide-react'

interface TopBarProps {
  title: string
  userRole: 'admin' | 'onboarder' | 'analyst'
}

export function TopBar({ title, userRole }: TopBarProps) {
  return (
    <div className="h-16 bg-[#1e1e1e] border-b border-[#2b2b2b] flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-[#cccccc]">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="text-xs text-[#6a9955] flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-[#6a9955] rounded-full"></span>
          API: ONLINE
        </span>
        <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#a3a3a3] hover:text-[#cccccc]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
