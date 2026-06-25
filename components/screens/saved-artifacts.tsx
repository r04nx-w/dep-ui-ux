'use client'

import { useState } from 'react'
import { Download, Eye, Trash2, Share2, Upload, FileText, Image, FileJson } from 'lucide-react'
import { ViewToggle } from '@/components/ui/view-toggle'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'

type ViewType = 'grid' | 'list' | 'compact'

interface Artifact {
  id: string
  name: string
  type: 'csv' | 'png' | 'pdf' | 'json' | 'html'
  size: string
  source: string
  date: string
  preview?: string
  description?: string
}

const mockArtifacts: Artifact[] = [
  {
    id: '1',
    name: 'sales_report_Q4.csv',
    type: 'csv',
    size: '2.4 MB',
    source: 'Financial Analysis',
    date: '2024-07-20',
    description: 'Quarterly sales performance report with regional breakdowns',
  },
  {
    id: '2',
    name: 'customer_viz.png',
    type: 'png',
    size: '845 KB',
    source: 'Customer Segmentation',
    date: '2024-07-19',
    description: 'Customer segmentation visualization',
  },
  {
    id: '3',
    name: 'forecast_2025.pdf',
    type: 'pdf',
    size: '3.2 MB',
    source: 'Revenue Forecasting',
    date: '2024-07-18',
    description: 'Annual revenue forecast with confidence intervals',
  },
  {
    id: '4',
    name: 'analysis_summary.json',
    type: 'json',
    size: '512 KB',
    source: 'Data Analysis',
    date: '2024-07-17',
    description: 'Structured analysis results with metadata',
  },
]

const typeIcons = {
  csv: FileText,
  pdf: FileText,
  png: Image,
  json: FileJson,
  html: FileText,
}

export function SavedArtifacts() {
  const [viewType, setViewType] = useState<ViewType>('list')
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null)
  const [shareArtifact, setShareArtifact] = useState<Artifact | null>(null)
  const [deleteArtifact, setDeleteArtifact] = useState<Artifact | null>(null)
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const handleDelete = () => {
    if (deleteArtifact) {
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Deleted',
        message: `${deleteArtifact.name} has been deleted.`,
      })
      setDeleteArtifact(null)
    }
  }

  const handleShare = () => {
    if (shareArtifact) {
      setAlertState({
        isOpen: true,
        type: 'info',
        title: 'Shared',
        message: `${shareArtifact.name} link copied to clipboard.`,
      })
      setShareArtifact(null)
    }
  }

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
          <h2 className="text-2xl font-bold text-[#e8e8e8]">Saved Artifacts</h2>
          <p className="text-sm text-[#808080] mt-1">
            Export and manage analysis results
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle currentView={viewType} onViewChange={setViewType} />
          <button className="flex items-center gap-2 px-4 py-2 bg-[#007acc] text-white rounded hover:bg-[#0e639c] transition-colors text-sm font-medium">
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewType === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockArtifacts.map((artifact) => {
            const IconComponent = typeIcons[artifact.type] || FileText
            return (
              <div
                key={artifact.id}
                className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-lg p-4 hover:border-[#007acc]/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <IconComponent className="w-8 h-8 text-[#569cd6] mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#e8e8e8] text-sm truncate">
                        {artifact.name}
                      </h3>
                      <p className="text-xs text-[#808080] mt-1">{artifact.source}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#a0a0a0] mb-4">
                  {artifact.description}
                </p>

                <div className="flex justify-between text-xs text-[#808080] mb-4 pb-4 border-b border-[#2b2b2b]">
                  <span>{artifact.size}</span>
                  <span>{artifact.date}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewArtifact(artifact)}
                    className="flex-1 px-2 py-1.5 text-xs bg-[#2d2d2d] text-[#569cd6] rounded hover:bg-[#37373d] transition-colors"
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => {
                      setAlertState({
                        isOpen: true,
                        type: 'success',
                        title: 'Downloaded',
                        message: `${artifact.name} download started.`,
                      })
                    }}
                    className="flex-1 px-2 py-1.5 text-xs bg-[#2d2d2d] text-[#6a9955] rounded hover:bg-[#37373d] transition-colors"
                  >
                    <Download className="w-3 h-3 inline mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => setShareArtifact(artifact)}
                    className="flex-1 px-2 py-1.5 text-xs bg-[#2d2d2d] text-[#ce9178] rounded hover:bg-[#37373d] transition-colors"
                  >
                    <Share2 className="w-3 h-3 inline mr-1" />
                    Share
                  </button>
                  <button
                    onClick={() => setDeleteArtifact(artifact)}
                    className="flex-1 px-2 py-1.5 text-xs bg-[#2d2d2d] text-[#f44747] rounded hover:bg-[#f44747] hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3 h-3 inline" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewType === 'list' && (
        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2b2b2b] bg-[#2d2d2d]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#a0a0a0] uppercase">
                    Filename
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#a0a0a0] uppercase">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#a0a0a0] uppercase">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#a0a0a0] uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#a0a0a0] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockArtifacts.map((artifact, idx) => {
                  const IconComponent = typeIcons[artifact.type] || FileText
                  return (
                    <tr
                      key={artifact.id}
                      className={`border-b border-[#2b2b2b] hover:bg-[#2b2b2b]/50 transition-colors ${
                        idx === mockArtifacts.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-[#e8e8e8] font-medium">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-[#569cd6]" />
                          {artifact.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#a0a0a0]">
                        {artifact.source}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#a0a0a0]">
                        {artifact.size}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#a0a0a0]">
                        {artifact.date}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewArtifact(artifact)}
                            className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#569cd6]"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setAlertState({
                                isOpen: true,
                                type: 'success',
                                title: 'Downloaded',
                                message: `${artifact.name} download started.`,
                              })
                            }}
                            className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#6a9955]"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShareArtifact(artifact)}
                            className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#ce9178]"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteArtifact(artifact)}
                            className="p-1.5 hover:bg-[#f44747]/20 rounded transition-colors text-[#f44747]"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compact View */}
      {viewType === 'compact' && (
        <div className="space-y-2">
          {mockArtifacts.map((artifact) => {
            const IconComponent = typeIcons[artifact.type] || FileText
            return (
              <div
                key={artifact.id}
                className="bg-[#2d2d2d] border border-[#2b2b2b] rounded p-3 flex items-center justify-between hover:border-[#007acc]/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <IconComponent className="w-4 h-4 text-[#569cd6]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e8e8e8] truncate font-medium">
                      {artifact.name}
                    </p>
                    <p className="text-xs text-[#808080]">
                      {artifact.size} • {artifact.date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => setPreviewArtifact(artifact)}
                    className="p-1 hover:bg-[#37373d] rounded text-[#569cd6]"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setAlertState({
                        isOpen: true,
                        type: 'success',
                        title: 'Downloaded',
                        message: `${artifact.name} download started.`,
                      })
                    }}
                    className="p-1 hover:bg-[#37373d] rounded text-[#6a9955]"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShareArtifact(artifact)}
                    className="p-1 hover:bg-[#37373d] rounded text-[#ce9178]"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setDeleteArtifact(artifact)}
                    className="p-1 hover:bg-[#37373d] rounded text-[#f44747]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewArtifact}
        onClose={() => setPreviewArtifact(null)}
        title={previewArtifact?.name || 'Preview'}
        size="lg"
      >
        <div className="bg-[#2d2d2d] rounded p-6 text-center">
          <p className="text-[#a0a0a0] text-sm mb-4">
            Preview of {previewArtifact?.type.toUpperCase()} artifact
          </p>
          <div className="bg-[#3d3d3d] rounded p-12 text-center">
            <p className="text-[#606060]">
              {previewArtifact?.description}
            </p>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={!!shareArtifact}
        onClose={() => setShareArtifact(null)}
        title="Share Artifact"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] uppercase mb-2">
              Share Link
            </label>
            <input
              type="text"
              value={`https://dep.internal/artifacts/${shareArtifact?.id}`}
              readOnly
              className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded px-3 py-2 text-sm text-[#e8e8e8] font-mono"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-[#2b2b2b]">
            <button
              onClick={() => setShareArtifact(null)}
              className="px-4 py-2 text-sm font-medium text-[#a0a0a0] bg-[#2b2b2b] rounded hover:bg-[#37373d] transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 text-sm font-medium text-white bg-[#007acc] rounded hover:bg-[#0e639c] transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteArtifact}
        onClose={() => setDeleteArtifact(null)}
        title="Delete Artifact"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#a0a0a0]">
            Are you sure you want to delete <span className="font-semibold text-[#e8e8e8]">{deleteArtifact?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end pt-4 border-t border-[#2b2b2b]">
            <button
              onClick={() => setDeleteArtifact(null)}
              className="px-4 py-2 text-sm font-medium text-[#a0a0a0] bg-[#2b2b2b] rounded hover:bg-[#37373d] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-[#f44747] rounded hover:bg-[#d84343] transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
