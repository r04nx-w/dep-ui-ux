'use client'

import React from 'react'
import { Grid3x3, List, Zap } from 'lucide-react'

type ViewType = 'grid' | 'list' | 'compact'

interface ViewToggleProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  const views: { type: ViewType; icon: React.ReactNode; label: string }[] = [
    { type: 'grid', icon: <Grid3x3 className="w-4 h-4" />, label: 'Grid' },
    { type: 'list', icon: <List className="w-4 h-4" />, label: 'List' },
    { type: 'compact', icon: <Zap className="w-4 h-4" />, label: 'Compact' },
  ]

  return (
    <div className="flex items-center gap-1 bg-input border border-border rounded-lg p-1">
      {views.map((view) => (
        <button
          key={view.type}
          onClick={() => onViewChange(view.type)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            currentView === view.type
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          title={view.label}
        >
          {view.icon}
          <span className="text-sm font-medium">{view.label}</span>
        </button>
      ))}
    </div>
  )
}
