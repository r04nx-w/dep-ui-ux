'use client'

import { Plus, Lock, Bookmark, GitBranch, Share2 } from 'lucide-react'

export function ProjectWorkspaces() {
  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#cccccc]">Project Workspaces</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Q4 Financial Analysis', owner: 'You', notebooks: 5 },
          { name: 'Customer Segmentation', owner: 'Maria Chen', notebooks: 3 },
          { name: 'Revenue Forecasting', owner: 'John Doe', notebooks: 8 },
        ].map((project, i) => (
          <div key={i} className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4 hover:border-[#37373d] transition-colors">
            <h3 className="text-sm font-semibold text-[#cccccc] mb-2">{project.name}</h3>
            <div className="flex items-center justify-between text-xs text-[#a3a3a3] mb-4">
              <span>by {project.owner}</span>
              <span>{project.notebooks} notebooks</span>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-[#007acc] text-white text-xs font-medium rounded hover:bg-[#0e639c] transition-colors">
                Open
              </button>
              <button className="px-3 py-2 bg-[#2d2d2d] text-[#cccccc] text-xs font-medium rounded hover:bg-[#37373d] transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Notebooks Section */}
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Recent Notebooks</h3>
        <div className="space-y-2">
          {[
            { name: 'Analysis_Q4.ipynb', project: 'Q4 Financial Analysis', status: 'editing', locked_by: 'You' },
            { name: 'Segmentation_v2.ipynb', project: 'Customer Segmentation', status: 'locked', locked_by: 'Maria Chen' },
            { name: 'Forecast_2025.ipynb', project: 'Revenue Forecasting', status: 'view', locked_by: null },
          ].map((nb, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-[#2d2d2d] rounded-sm hover:bg-[#37373d] transition-colors">
              <div className="flex-1">
                <div className="text-sm text-[#cccccc] font-medium mb-1">{nb.name}</div>
                <div className="text-xs text-[#a3a3a3]">{nb.project}</div>
              </div>
              <div className="flex items-center gap-2">
                {nb.status === 'editing' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#6a9955] bg-opacity-20 text-[#6a9955] text-xs rounded">
                    <Bookmark className="w-3 h-3" />
                    Editing (you)
                  </span>
                )}
                {nb.status === 'locked' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#f44747] bg-opacity-20 text-[#f44747] text-xs rounded">
                    <Lock className="w-3 h-3" />
                    Locked by {nb.locked_by}
                  </span>
                )}
              </div>
              <button className="px-3 py-1 bg-[#007acc] text-white text-xs font-medium rounded hover:bg-[#0e639c] transition-colors">
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
