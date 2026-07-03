'use client'

import { useState, useEffect, useCallback } from 'react'
import { ViewToggle } from '@/components/ui/view-toggle'
import { CopyButton } from '@/components/ui/copy-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Alert } from '@/components/ui/alert'
import { apiFetch } from '@/lib/api'
import { RefreshCw, Database, Lock, Clock, User } from 'lucide-react'

type ViewType = 'grid' | 'list' | 'compact'

interface SchemaField {
  column_name: string
  data_type: string
  ordinal_position: number
}

interface DataAccess {
  dataset_name: string
  allowed_columns: string[]
  source_type?: string
  status?: string
  owner_username?: string
  schema_fields?: SchemaField[]
}

interface AccessRequest {
  id: number
  dataset_name: string
  requested_columns: string[]
  reason?: string
  status: string
  valid_from?: string
  valid_until?: string
  created_at: string
}

function generatePythonSnippet(catalogName: string, columns: string[]): string {
  return `import dep_sdk
import pandas as pd

# ── Method 1: Load catalog directly as a governed Pandas DataFrame
df = dep_sdk.get_catalog("${catalogName}")

# Display basic info
print(f"Shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")
print(df.head())

# ── Method 2: Use fluent builder for limits, offsets, or Arrow formats
# result = dep_sdk.Dataset("${catalogName}").limit(100).get()
# df_subset = result.df
# print(f"Masked columns: {result.meta.masked_columns}")`
}

export function MyDataAccess() {
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [loading, setLoading] = useState(true)
  const [dataAccess, setDataAccess] = useState<DataAccess[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })
  const [selectedDataset, setSelectedDataset] = useState<DataAccess | null>(null)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestForm, setRequestForm] = useState({
    dataset_name: '',
    requested_columns: [] as string[],
    reason: '',
  })

  const fetchDataAccess = useCallback(async () => {
    try {
      setLoading(true)
      const [datasets, requests] = await Promise.all([
        apiFetch<DataAccess[]>('/access/datasets/me'),
        apiFetch<AccessRequest[]>('/access-requests/mine'),
      ])
      setDataAccess(datasets)
      setAccessRequests(requests)
    } catch (error) {
      console.error('Failed to fetch data access:', error)
      setDataAccess([])
      setAccessRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDataAccess()
  }, [fetchDataAccess])

  const handleCopy = () => {
    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Copied!',
      message: 'Python SDK snippet copied to clipboard',
    })
  }

  const handleRequestAccess = (dataset: DataAccess) => {
    setSelectedDataset(dataset)
    setRequestForm({
      dataset_name: dataset.dataset_name,
      requested_columns: dataset.schema_fields?.map(f => f.column_name) || [],
      reason: '',
    })
    setIsRequestModalOpen(true)
  }

  const submitAccessRequest = async () => {
    try {
      await apiFetch('/access-requests', {
        method: 'POST',
        body: JSON.stringify(requestForm),
      })
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Request Submitted',
        message: 'Your access request has been submitted for approval.',
      })
      setIsRequestModalOpen(false)
      fetchDataAccess()
    } catch (error) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Request Failed',
        message: error instanceof Error ? error.message : 'Failed to submit request',
      })
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
          <h2 className="text-2xl font-bold text-text-primary">My Data Access</h2>
          <p className="text-sm text-text-muted mt-1">
            View and manage your dataset access permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDataAccess}
            disabled={loading}
            className="p-2 rounded hover:bg-bg-hover text-text-muted disabled:opacity-40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <ViewToggle currentView={viewType} onViewChange={setViewType} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Accessible Datasets</p>
              <p className="text-2xl font-bold text-text-primary">{dataAccess.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6a9955]/10 rounded-lg">
              <Lock className="w-5 h-5 text-[#6a9955]" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Columns</p>
              <p className="text-2xl font-bold text-text-primary">
                {dataAccess.reduce((sum, d) => sum + d.allowed_columns.length, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ce9178]/10 rounded-lg">
              <Clock className="w-5 h-5 text-[#ce9178]" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Pending Requests</p>
              <p className="text-2xl font-bold text-text-primary">
                {accessRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewType === 'grid' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-text-muted" />
            </div>
          ) : dataAccess.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Database className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Dataset Access</h3>
              <p className="text-sm text-text-muted mb-4">
                You don't have access to any datasets yet. Browse the catalog to request access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataAccess.map((access) => (
                <div
                  key={access.dataset_name}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Database className="w-4 h-4 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-text-primary text-sm truncate">
                        {access.dataset_name}
                      </h3>
                    </div>
                    <StatusBadge status="active" size="sm" />
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Type:
                      </span>
                      <span className="text-text-primary font-medium">{access.source_type || 'unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Columns:
                      </span>
                      <span className="text-text-primary font-medium">{access.allowed_columns.length}</span>
                    </div>
                    {access.owner_username && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Owner:
                        </span>
                        <span className="text-text-primary font-medium">{access.owner_username}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-text-muted mb-4 pb-4 border-b border-border">
                    <div className="mb-1">
                      <span className="font-medium text-text-secondary">Accessible Columns:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {access.allowed_columns.slice(0, 6).map((col) => (
                        <span
                          key={col}
                          className="px-1.5 py-0.5 bg-border rounded text-[#569cd6] text-[10px]"
                        >
                          {col}
                        </span>
                      ))}
                      {access.allowed_columns.length > 6 && (
                        <span className="px-1.5 py-0.5 bg-border rounded text-text-muted text-[10px]">
                          +{access.allowed_columns.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  <CopyButton
                    content={generatePythonSnippet(access.dataset_name, access.allowed_columns)}
                    label="Copy SDK"
                    size="sm"
                    className="w-full justify-center"
                    onCopy={handleCopy}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* List View */}
      {viewType === 'list' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-input">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Dataset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Columns
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                ) : dataAccess.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                      No dataset access found
                    </td>
                  </tr>
                ) : (
                  dataAccess.map((access, idx) => (
                    <tr
                      key={access.dataset_name}
                      className={`border-b border-border hover:bg-border/50 transition-colors ${
                        idx === dataAccess.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-primary" />
                          {access.dataset_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {access.source_type || 'unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {access.allowed_columns.length} columns
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {access.owner_username || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status="active" size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CopyButton
                          content={generatePythonSnippet(
                            access.dataset_name,
                            access.allowed_columns
                          )}
                          label="Copy"
                          size="sm"
                          onCopy={handleCopy}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compact View */}
      {viewType === 'compact' && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 animate-spin text-text-muted" />
            </div>
          ) : dataAccess.length === 0 ? (
            <div className="bg-input border border-border rounded p-6 text-center text-sm text-text-muted">
              No dataset access found
            </div>
          ) : (
            dataAccess.map((access) => (
              <div
                key={access.dataset_name}
                className="bg-input border border-border rounded p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-primary flex-shrink-0" />
                    <h4 className="font-semibold text-text-primary text-sm truncate">
                      {access.dataset_name}
                    </h4>
                    <StatusBadge status="active" size="sm" />
                  </div>
                  <div className="text-xs text-text-muted">
                    {access.source_type} • {access.allowed_columns.length} columns
                    {access.owner_username && ` • ${access.owner_username}`}
                  </div>
                </div>
                <CopyButton
                  content={generatePythonSnippet(access.dataset_name, access.allowed_columns)}
                  label="Copy"
                  size="sm"
                  onCopy={handleCopy}
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Access Request Modal */}
      {isRequestModalOpen && selectedDataset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Request Access to {selectedDataset.dataset_name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Reason for Access
                  </label>
                  <textarea
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    placeholder="Explain why you need access to this dataset..."
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Requested Columns
                  </label>
                  <div className="bg-input border border-border rounded-sm p-3 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {selectedDataset.schema_fields?.map((field) => (
                        <label key={field.column_name} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={requestForm.requested_columns.includes(field.column_name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRequestForm({
                                  ...requestForm,
                                  requested_columns: [...requestForm.requested_columns, field.column_name],
                                })
                              } else {
                                setRequestForm({
                                  ...requestForm,
                                  requested_columns: requestForm.requested_columns.filter(c => c !== field.column_name),
                                })
                              }
                            }}
                            className="w-4 h-4 accent-primary"
                          />
                          <span className="text-sm text-text-primary">{field.column_name}</span>
                          <span className="text-xs text-text-muted">({field.data_type})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <button
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary bg-input rounded-sm hover:bg-bg-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAccessRequest}
                    disabled={requestForm.requested_columns.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
