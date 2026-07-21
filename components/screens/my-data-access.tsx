'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ViewToggle } from '@/components/ui/view-toggle'
import { CopyButton } from '@/components/ui/copy-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Alert } from '@/components/ui/alert'
import { apiFetch } from '@/lib/api'
import { RefreshCw, Database, Lock, Clock, User, Search, ChevronDown, Check, X, Eye } from 'lucide-react'

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
  row_count?: number
  masked_columns?: string[]
  partially_masked_columns?: string[]
}

const getColumnColor = (colName: string, access: DataAccess) => {
  const allowed = access.allowed_columns.includes(colName);
  const masked = access.masked_columns?.includes(colName);
  const partiallyMasked = access.partially_masked_columns?.includes(colName);
  
  if (!allowed) return { color: '#f44747', bg: 'rgba(244, 71, 71, 0.1)', border: 'rgba(244, 71, 71, 0.2)', label: 'Blocked' };
  if (masked) return { color: '#ce9178', bg: 'rgba(206, 145, 120, 0.1)', border: 'rgba(206, 145, 120, 0.2)', label: 'Masked' };
  if (partiallyMasked) return { color: '#569cd6', bg: 'rgba(86, 156, 214, 0.1)', border: 'rgba(86, 156, 214, 0.2)', label: 'Partially Masked' };
  return { color: '#6a9955', bg: 'rgba(106, 153, 85, 0.1)', border: 'rgba(106, 153, 85, 0.2)', label: 'Allowed' };
};

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
  const [columnSearchQuery, setColumnSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    const requestableCols = dataset.schema_fields
      ?.filter(f => {
        const isMasked = dataset.masked_columns?.includes(f.column_name)
        const isPartial = dataset.partially_masked_columns?.includes(f.column_name)
        return isMasked || isPartial;
      })
      ?.map(f => f.column_name) || []
      
    setRequestForm({
      dataset_name: dataset.dataset_name,
      requested_columns: requestableCols,
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
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Rows:
                      </span>
                      <span className="text-text-primary font-medium">
                        {access.row_count !== undefined && access.row_count !== null ? access.row_count : 'unknown'}
                      </span>
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
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-semibold text-text-secondary">Catalog Columns:</span>
                      <div className="flex gap-1.5 text-[8px] scale-90 origin-right">
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#6a9955]" /> Allowed</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#569cd6]" /> Partial</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#ce9178]" /> Masked</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {(access.schema_fields || [])
                        .filter((field) => access.allowed_columns.includes(field.column_name))
                        .map((field) => {
                        const style = getColumnColor(field.column_name, access);
                        return (
                          <span
                            key={field.column_name}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono border"
                            style={{
                              color: style.color,
                              backgroundColor: style.bg,
                              borderColor: style.border,
                            }}
                            title={`${field.column_name} (${field.data_type}) - ${style.label}`}
                          >
                            {field.column_name}
                          </span>
                        );
                      })}
                      {(!access.schema_fields || access.schema_fields.length === 0) &&
                        access.allowed_columns.map((col) => (
                          <span
                            key={col}
                            className="px-1.5 py-0.5 bg-border rounded text-[#6a9955] text-[10px]"
                          >
                            {col}
                          </span>
                        ))
                      }
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <CopyButton
                      content={generatePythonSnippet(access.dataset_name, access.allowed_columns)}
                      label="Copy SDK"
                      size="sm"
                      className="flex-1 justify-center"
                      onCopy={handleCopy}
                    />
                    {(() => {
                      const pendingRequest = accessRequests.find(r => r.dataset_name === access.dataset_name && r.status === 'pending');
                      if (pendingRequest) {
                        return (
                          <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1 bg-[#569cd6]/10 text-[#569cd6] border border-[#569cd6]/20 rounded text-xs font-semibold uppercase">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Approval
                          </div>
                        );
                      }
                      return (
                        <button
                          onClick={() => handleRequestAccess(access)}
                          className="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Lock className="w-3.5 h-3.5" /> Request Access
                        </button>
                      );
                    })()}
                  </div>
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
                    Rows
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
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                ) : dataAccess.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
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
                        {access.allowed_columns.length} / {access.schema_fields?.length || 0} allowed
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {access.row_count !== undefined && access.row_count !== null ? access.row_count : 'unknown'} rows
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {access.owner_username || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status="active" size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CopyButton
                            content={generatePythonSnippet(
                              access.dataset_name,
                              access.allowed_columns
                            )}
                            label="Copy"
                            size="sm"
                            onCopy={handleCopy}
                          />
                          {(() => {
                            const pendingRequest = accessRequests.find(r => r.dataset_name === access.dataset_name && r.status === 'pending');
                            if (pendingRequest) {
                              return (
                                <span className="px-2 py-1 bg-[#569cd6]/10 text-[#569cd6] border border-[#569cd6]/20 rounded text-[10px] font-semibold uppercase flex items-center gap-1">
                                  <Clock className="w-3 h-3 animate-pulse" /> Pending
                                </span>
                              );
                            }
                            return (
                              <button
                                onClick={() => handleRequestAccess(access)}
                                className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3" /> Request
                              </button>
                            );
                          })()}
                        </div>
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
                    {access.source_type} • {access.allowed_columns.length} columns • {access.row_count !== undefined && access.row_count !== null ? access.row_count : 'unknown'} rows
                    {access.owner_username && ` • ${access.owner_username}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton
                    content={generatePythonSnippet(access.dataset_name, access.allowed_columns)}
                    label="Copy"
                    size="sm"
                    onCopy={handleCopy}
                  />
                  {(() => {
                    const pendingRequest = accessRequests.find(r => r.dataset_name === access.dataset_name && r.status === 'pending');
                    if (pendingRequest) {
                      return (
                        <span className="px-2 py-1 bg-[#569cd6]/10 text-[#569cd6] border border-[#569cd6]/20 rounded text-[10px] font-semibold uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-pulse" /> Pending
                        </span>
                      );
                    }
                    return (
                      <button
                        onClick={() => handleRequestAccess(access)}
                        className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-white rounded text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" /> Request
                      </button>
                    );
                  })()}
                </div>
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
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Requested Columns
                  </label>
                  
                  {/* Select Trigger / Tag Container */}
                  <div 
                    onClick={() => setIsDropdownOpen(true)}
                    className="w-full min-h-[42px] bg-input border border-border rounded-sm px-3 py-1.5 flex flex-wrap gap-1.5 items-center cursor-text focus-within:border-primary transition-all"
                  >
                    {requestForm.requested_columns.map(col => {
                      const style = getColumnColor(col, selectedDataset);
                      return (
                        <span 
                          key={col} 
                          className="px-2 py-0.5 bg-[#4d3ca6]/10 text-text-primary rounded text-xs flex items-center gap-1 font-mono border border-[#4d3ca6]/20 shadow-sm"
                        >
                          {col}
                          <span 
                            className="text-[8px] font-sans font-semibold px-1 rounded uppercase scale-90 border"
                            style={{ color: style.color, backgroundColor: style.bg, borderColor: style.border }}
                          >
                            {style.label}
                          </span>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRequestForm({
                                ...requestForm,
                                requested_columns: requestForm.requested_columns.filter(c => c !== col)
                              });
                            }}
                            className="text-text-muted hover:text-text-primary transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    
                    {/* Inline Search Input */}
                    <input
                      type="text"
                      placeholder={requestForm.requested_columns.length === 0 ? "Select or search columns..." : ""}
                      value={columnSearchQuery}
                      onChange={(e) => {
                        setColumnSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="flex-1 bg-transparent text-sm text-text-primary outline-none min-w-[120px]"
                    />
                    
                    <ChevronDown className="w-4 h-4 text-text-muted ml-auto cursor-pointer" />
                  </div>

                  {/* Autocomplete Dropdown list */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-xl z-50 max-h-56 overflow-y-auto font-sans">
                      {(() => {
                        const availableFields = (selectedDataset.schema_fields || [])
                          .filter(field => {
                            const isMasked = selectedDataset.masked_columns?.includes(field.column_name);
                            const isPartial = selectedDataset.partially_masked_columns?.includes(field.column_name);
                            return isMasked || isPartial;
                          })
                          .filter(field => field.column_name.toLowerCase().includes(columnSearchQuery.toLowerCase()));

                        if (availableFields.length === 0) {
                          return (
                            <div className="px-4 py-3 text-center text-xs text-text-muted font-medium">
                              No requestable columns found
                            </div>
                          );
                        }

                        return availableFields.map(field => {
                          const isSelected = requestForm.requested_columns.includes(field.column_name);
                          const style = getColumnColor(field.column_name, selectedDataset);
                          return (
                            <button
                              key={field.column_name}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setRequestForm({
                                    ...requestForm,
                                    requested_columns: requestForm.requested_columns.filter(c => c !== field.column_name)
                                  });
                                } else {
                                  setRequestForm({
                                    ...requestForm,
                                    requested_columns: [...requestForm.requested_columns, field.column_name]
                                  });
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-[var(--bg-hover)]/40 transition-colors border-b border-border/20 last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-primary border-primary text-white' : 'border-border'
                                }`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                                </div>
                                <span className="text-text-primary font-mono font-semibold">{field.column_name}</span>
                                <span className="text-text-muted font-mono text-[10px]">({field.data_type})</span>
                              </div>
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider"
                                style={{
                                  color: style.color,
                                  backgroundColor: style.bg,
                                  borderColor: style.border,
                                }}
                              >
                                {style.label}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Previous Requests Section */}
                {(() => {
                  const datasetRequests = accessRequests
                    .filter(r => r.dataset_name === selectedDataset.dataset_name)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                  if (datasetRequests.length === 0) return null;

                  return (
                    <div className="mt-4 pt-4 border-t border-border/60">
                      <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                        Previous Requests ({datasetRequests.length})
                      </label>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {datasetRequests.map((req) => (
                          <div 
                            key={req.id} 
                            className="p-2 rounded bg-input/40 border border-border/40 text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-text-primary">
                                Columns: {req.requested_columns.join(', ')}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                req.status === 'approved' 
                                  ? 'bg-[#6a9955]/15 text-[#6a9955] border border-[#6a9955]/30'
                                  : req.status === 'rejected'
                                  ? 'bg-[#f44747]/15 text-[#f44747] border border-[#f44747]/30'
                                  : 'bg-[#569cd6]/15 text-[#569cd6] border border-[#569cd6]/30'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            {req.reason && (
                              <div className="text-text-muted italic text-[11px] truncate">
                                "{req.reason}"
                              </div>
                            )}
                            <div className="text-[10px] text-text-muted flex items-center justify-between mt-0.5">
                              <span>
                                {new Date(req.created_at).toLocaleString()}
                              </span>
                              {(req.valid_from || req.valid_until) && (
                                <span className="text-[9px] bg-border/40 px-1 rounded text-text-secondary">
                                  Validity: {req.valid_from ? new Date(req.valid_from).toLocaleDateString() : 'Now'} - {req.valid_until ? new Date(req.valid_until).toLocaleDateString() : 'Forever'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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
