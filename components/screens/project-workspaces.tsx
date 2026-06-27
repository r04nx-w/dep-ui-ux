'use client'

import { useState } from 'react'
import { Plus, Lock, Users, GitBranch, Share2, Info } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'

interface Workspace {
  id: string
  name: string
  description: string
  lead: string
  team: string[]
  notebooks: number
}

interface Notebook {
  id: string
  name: string
  project: string
  status: 'editing' | 'locked' | 'view'
  lockedBy?: string
  lastModified: string
}

const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Q4 Financial Analysis',
    description: 'Financial forecasting and quarterly analysis',
    lead: 'You',
    team: ['Sarah Johnson', 'Mike Davis'],
    notebooks: 5,
  },
  {
    id: '2',
    name: 'Customer Segmentation',
    description: 'Behavioral segmentation and targeting',
    lead: 'Maria Chen',
    team: ['You', 'John Lee'],
    notebooks: 3,
  },
  {
    id: '3',
    name: 'Revenue Forecasting',
    description: 'Annual revenue projections',
    lead: 'John Doe',
    team: ['Sarah Johnson', 'Alex Kumar'],
    notebooks: 8,
  },
]

const mockNotebooks: Notebook[] = [
  {
    id: '1',
    name: 'Analysis_Q4.ipynb',
    project: 'Q4 Financial Analysis',
    status: 'editing',
    lockedBy: 'You',
    lastModified: '2024-07-20 14:35',
  },
  {
    id: '2',
    name: 'Segmentation_v2.ipynb',
    project: 'Customer Segmentation',
    status: 'locked',
    lockedBy: 'Maria Chen',
    lastModified: '2024-07-20 13:20',
  },
  {
    id: '3',
    name: 'Forecast_2025.ipynb',
    project: 'Revenue Forecasting',
    status: 'view',
    lastModified: '2024-07-20 11:45',
  },
]

export function ProjectWorkspaces({ onLaunchWorkspace }: { onLaunchWorkspace?: () => void }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [showWorkspaceInfo, setShowWorkspaceInfo] = useState(false)
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
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
          <p className="text-sm text-text-muted mt-1">
            Collaborate on data analysis projects
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockWorkspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-text-primary text-sm flex-1">
                {workspace.name}
              </h3>
              <button
                onClick={() => {
                  setSelectedWorkspace(workspace)
                  setShowWorkspaceInfo(true)
                }}
                className="p-1.5 hover:bg-input rounded transition-colors text-text-secondary"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-3 line-clamp-2">
              {workspace.description}
            </p>

            <div className="space-y-2 mb-4 pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted">Lead:</span>
                <span className="text-text-primary font-medium">{workspace.lead}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Users className="w-3 h-3 text-[#569cd6]" />
                <span className="text-text-muted">{workspace.team.length} team members</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted">Notebooks:</span>
                <span className="text-text-primary font-medium">{workspace.notebooks}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => onLaunchWorkspace?.(workspace.name)}
                className="flex-1 px-3 py-2 text-xs bg-primary text-white font-medium rounded hover:bg-primary-hover transition-colors"
              >
                Open
              </button>
              <button className="px-3 py-2 text-xs bg-input text-text-secondary font-medium rounded hover:bg-bg-hover transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Notebooks Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4">Recent Notebooks</h3>
        <div className="space-y-2 overflow-y-auto max-h-96">
          {mockNotebooks.map((notebook, idx) => (
            <div
              key={notebook.id}
              className="flex items-center gap-4 p-3 bg-input rounded hover:bg-bg-hover transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary font-medium truncate">
                  {notebook.name}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {notebook.project}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {notebook.lastModified}
                </div>
              </div>

              {/* Status Badge */}
              {notebook.status === 'editing' && (
                <div className="px-3 py-1.5 bg-[#6a9955]/20 border border-[#6a9955]/40 rounded flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-2 h-2 bg-[#6a9955] rounded-full"></div>
                  <span className="text-xs font-medium text-[#b5dc94]">
                    Editing (you)
                  </span>
                </div>
              )}
              {notebook.status === 'locked' && (
                <div className="px-3 py-1.5 bg-[#f44747]/20 border border-[#f44747]/40 rounded flex items-center gap-1.5 whitespace-nowrap">
                  <Lock className="w-3 h-3 text-[#f44747]" />
                  <span className="text-xs font-medium text-[#ff9999]">
                    Locked by {notebook.lockedBy}
                  </span>
                </div>
              )}
              {notebook.status === 'view' && (
                <div className="px-3 py-1.5 bg-[#569cd6]/20 border border-[#569cd6]/40 rounded flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-2 h-2 bg-[#569cd6] rounded-full"></div>
                  <span className="text-xs font-medium text-[#88bef4]">
                    View Only
                  </span>
                </div>
              )}

              <button 
                onClick={() => onLaunchWorkspace?.(notebook.project)}
                className="px-3 py-1.5 text-xs bg-primary text-white font-medium rounded hover:bg-primary-hover transition-colors whitespace-nowrap"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Workspace Info Modal */}
      <Modal
        isOpen={showWorkspaceInfo && !!selectedWorkspace}
        onClose={() => setShowWorkspaceInfo(false)}
        title={selectedWorkspace?.name || ''}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
              Description
            </h4>
            <p className="text-sm text-text-primary leading-relaxed">
              {selectedWorkspace?.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-input rounded p-3">
              <span className="text-xs text-text-muted block mb-1">Project Lead</span>
              <span className="text-sm font-semibold text-text-primary">
                {selectedWorkspace?.lead}
              </span>
            </div>
            <div className="bg-input rounded p-3">
              <span className="text-xs text-text-muted block mb-1">Total Notebooks</span>
              <span className="text-sm font-semibold text-text-primary">
                {selectedWorkspace?.notebooks}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase mb-3">
              Team Members
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedWorkspace?.team.map((member) => (
                <div
                  key={member}
                  className="px-3 py-1.5 bg-input border border-[#37373d] rounded text-xs text-text-primary flex items-center gap-1.5"
                >
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  {member}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button
              onClick={() => setShowWorkspaceInfo(false)}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                setAlertState({
                  isOpen: true,
                  type: 'success',
                  title: 'Opened',
                  message: `${selectedWorkspace?.name} is now open.`,
                })
                setShowWorkspaceInfo(false)
                if (onLaunchWorkspace) onLaunchWorkspace()
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-hover transition-colors"
            >
              Open Workspace
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
