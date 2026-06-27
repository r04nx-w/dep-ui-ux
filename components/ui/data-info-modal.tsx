'use client'

import { useState } from 'react'
import { X, Download, Share2, Lock, Globe, Users, Calendar, FileText } from 'lucide-react'
import { Modal } from './modal'

interface DataInfoModalProps {
  isOpen: boolean
  onClose: () => void
  data: {
    name: string
    description: string
    classification: string
    owner: string
    lastUpdated: string
    tables?: number
    columns?: number
    rows?: string
    size?: string
    accessLevel?: string
    team?: string[]
    tags?: string[]
    metadata?: Record<string, any>
  }
}

export function DataInfoModal({ isOpen, onClose, data }: DataInfoModalProps) {
  const tabs = ['Overview', 'Columns', 'Metadata', 'Access', 'History']
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={data.name} size="lg">
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border -mx-6 px-6 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'Overview' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                Description
              </h4>
              <p className="text-sm text-text-primary leading-relaxed">
                {data.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-input rounded p-3">
                <span className="text-xs text-text-muted block mb-1">Owner</span>
                <span className="text-sm font-semibold text-text-primary">
                  {data.owner}
                </span>
              </div>
              <div className="bg-input rounded p-3">
                <span className="text-xs text-text-muted block mb-1">Classification</span>
                <span className="text-sm font-semibold text-[#569cd6]">
                  {data.classification}
                </span>
              </div>
              <div className="bg-input rounded p-3">
                <span className="text-xs text-text-muted block mb-1">Last Updated</span>
                <span className="text-sm font-semibold text-text-primary">
                  {data.lastUpdated}
                </span>
              </div>
              <div className="bg-input rounded p-3">
                <span className="text-xs text-text-muted block mb-1">Tables</span>
                <span className="text-sm font-semibold text-text-primary">
                  {data.tables || 'N/A'}
                </span>
              </div>
            </div>

            {data.team && (
              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                  Team Members
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.team.map((member) => (
                    <span
                      key={member}
                      className="px-2 py-1 text-xs bg-input text-text-primary rounded"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.tags && (
              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-primary/20 text-[#569cd6] border border-primary/30 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Columns Tab */}
        {activeTab === 'Columns' && (
          <div className="space-y-2">
            <div className="text-sm text-text-secondary">
              {data.columns && (
                <div className="text-center py-8">
                  <p className="text-2xl font-bold text-text-primary">{data.columns}</p>
                  <p className="text-xs text-text-muted mt-1">Total Columns</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata Tab */}
        {activeTab === 'Metadata' && (
          <div className="space-y-2">
            {data.metadata ? (
              Object.entries(data.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{key}</span>
                  <span className="text-text-primary font-mono">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted">No metadata available</p>
            )}
          </div>
        )}

        {/* Access Tab */}
        {activeTab === 'Access' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Globe className="w-4 h-4 text-[#569cd6] mt-1" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Access Level</p>
                <p className="text-xs text-text-secondary">{data.accessLevel || 'Read-Only'}</p>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'History' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-[#6a9955] mt-1" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Last Modified</p>
                <p className="text-xs text-text-secondary">{data.lastUpdated}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
