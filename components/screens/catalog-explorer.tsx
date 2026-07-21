'use client'

import { useState, useEffect, useCallback } from 'react'
import { ViewToggle } from '@/components/ui/view-toggle'
import { StatusBadge } from '@/components/ui/status-badge'
import { Modal } from '@/components/ui/modal'
import { CopyButton } from '@/components/ui/copy-button'
import { Alert } from '@/components/ui/alert'
import {
  FormField,
  TextInput,
  TextArea,
  Select,
} from '@/components/ui/form-field'
import { apiFetch } from '@/lib/api'
import { UserBadge } from '@/components/ui/user-badge'
import { RefreshCw } from 'lucide-react'

type ViewType = 'grid' | 'list' | 'compact'

interface Catalog {
  id: string
  name: string
  description: string
  classification: string
  status: 'granted' | 'pending' | 'rejected' | 'none'
  tables: number
  owner: string
  ownerFullName: string
  lastUpdated: string
  schema_fields: any[]
}

function generateSDKSnippet(catalogName: string): string {
  return `import dep_sdk

# Load governed dataset as a pandas DataFrame
df = dep_sdk.get_catalog("${catalogName}")

# Display basic info
print(f"Shape: {df.shape}")
print(df.head())`
}

export function CatalogExplorer() {
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [loading, setLoading] = useState(true)
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null)
  const [isRequestModal, setIsRequestModal] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [activeCatalogForDict, setActiveCatalogForDict] = useState<Catalog | null>(null)
  const [isDictModalOpen, setIsDictModalOpen] = useState(false)
  const [dictSearch, setDictSearch] = useState('')
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allCatalogEntries, permittedDatasets, myRequests] = await Promise.all([
        apiFetch<any[]>('/catalog'),
        apiFetch<any[]>('/access/datasets/me').catch(() => []),
        apiFetch<any[]>('/access-requests/mine').catch(() => []),
      ])

      const mapped = allCatalogEntries.map((entry): Catalog => {
        // Find permission
        const permitted = permittedDatasets.find((p: any) => p.dataset_name === entry.name)
        // Find requests
        const requestsForDataset = myRequests.filter((r: any) => r.dataset_name === entry.name)
        const pendingReq = requestsForDataset.find((r: any) => r.status === 'pending')
        const rejectedReq = requestsForDataset.find((r: any) => r.status === 'rejected')

        let status: 'granted' | 'pending' | 'rejected' | 'none' = 'none'
        if (permitted) {
          status = 'granted'
        } else if (pendingReq) {
          status = 'pending'
        } else if (rejectedReq) {
          status = 'rejected'
        }

        // Map classification
        let classification = 'Internal'
        if (entry.source_type === 'postgresql' || entry.source_type === 'mysql') {
          classification = 'Confidential'
        } else if (entry.name.toLowerCase().includes('financial') || entry.name.toLowerCase().includes('salary')) {
          classification = 'Restricted PII'
        }

        return {
          id: entry.name,
          name: entry.name,
          description: `Governed ${entry.source_type.toUpperCase()} data resource catalog table for ${entry.name}.`,
          classification,
          status,
          tables: entry.schema_fields?.length || 0,
          owner: entry.owner_username || 'system',
          ownerFullName: entry.owner_full_name || entry.owner_username || 'System',
          lastUpdated: new Date().toISOString().split('T')[0],
          schema_fields: entry.schema_fields || [],
        }
      })

      setCatalogs(mapped)
    } catch (err: any) {
      console.error(err)
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Error Loading Catalog',
        message: err.message || 'Failed to fetch catalog entries.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRequestAccess = async () => {
    if (selectedCatalog && requestReason.trim()) {
      try {
        const columns = selectedCatalog.schema_fields.map((f: any) => f.column_name)
        await apiFetch('/access-requests', {
          method: 'POST',
          body: JSON.stringify({
            dataset_name: selectedCatalog.name,
            requested_columns: columns,
            reason: requestReason,
          }),
        })
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Access Requested',
          message: `Your request for ${selectedCatalog.name} has been submitted for approval.`,
        })
        setIsRequestModal(false)
        setRequestReason('')
        loadData()
      } catch (err: any) {
        setAlertState({
          isOpen: true,
          type: 'error',
          title: 'Request Failed',
          message: err.message || 'Failed to submit access request.',
        })
      }
    }
  }

  const handleCopy = () => {
    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Copied!',
      message: 'Python SDK code copied to clipboard',
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-text-secondary">Loading datasets from catalog...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
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
          <h2 className="text-2xl font-bold text-text-primary">Catalog Explorer</h2>
          <p className="text-sm text-text-muted mt-1">
            Browse available datasets and request access
          </p>
        </div>
        <ViewToggle currentView={viewType} onViewChange={setViewType} />
      </div>

      {catalogs.length === 0 && (
        <div className="text-center py-12 text-sm text-text-secondary bg-card border border-border rounded-lg">
          No catalogs discovered. Please register datasets in the hub.
        </div>
      )}

      {/* Grid View */}
      {viewType === 'grid' && catalogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogs.map((catalog) => (
            <div
              key={catalog.id}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h3 className="font-semibold text-text-primary text-sm flex-1 truncate">
                    {catalog.name}
                  </h3>
                  {catalog.status !== 'none' && (
                    <StatusBadge
                      status={
                        catalog.status === 'granted'
                          ? 'approved'
                          : catalog.status === 'pending'
                            ? 'pending'
                            : 'rejected'
                      }
                      size="sm"
                    />
                  )}
                </div>

                <p className="text-xs text-text-muted mb-4 line-clamp-2">
                  {catalog.description}
                </p>

                <div className="space-y-2 mb-4 pb-4 border-b border-border">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Classification:</span>
                    <span className="text-[#569cd6]">{catalog.classification}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Columns:</span>
                    <span className="text-text-primary font-medium">{catalog.tables}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">Owner:</span>
                    <UserBadge username={catalog.owner} fullName={catalog.ownerFullName} avatarSize="xs" isClickable={false} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {catalog.status === 'granted' && (
                  <div className="flex gap-2 w-full">
                    <CopyButton
                      content={generateSDKSnippet(catalog.name)}
                      label="Copy SDK"
                      size="sm"
                      className="flex-grow justify-center"
                      onCopy={handleCopy}
                    />
                    <button
                      onClick={() => {
                        setActiveCatalogForDict(catalog)
                        setIsDictModalOpen(true)
                      }}
                      className="px-3 py-1.5 bg-input hover:bg-bg-hover border border-border text-text-primary rounded text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer select-none active:scale-95"
                    >
                      Dictionary
                    </button>
                  </div>
                )}

                {catalog.status === 'pending' && (
                  <div className="flex gap-2 w-full items-center">
                    <div className="flex-grow text-xs text-[#ffb84d] bg-[#ce9178]/10 border border-[#ce9178]/30 rounded px-3 py-2 text-center font-medium">
                      Awaiting Approval
                    </div>
                    <button
                      onClick={() => {
                        setActiveCatalogForDict(catalog)
                        setIsDictModalOpen(true)
                      }}
                      className="px-3 py-1.5 bg-input hover:bg-bg-hover border border-border text-text-primary rounded text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer select-none active:scale-95"
                    >
                      Dictionary
                    </button>
                  </div>
                )}

                {(catalog.status === 'none' || catalog.status === 'rejected') && (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => {
                        setSelectedCatalog(catalog)
                        setIsRequestModal(true)
                      }}
                      className="flex-grow px-3 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors cursor-pointer"
                    >
                      {catalog.status === 'rejected' ? 'Re-request' : 'Request Access'}
                    </button>
                    <button
                      onClick={() => {
                        setActiveCatalogForDict(catalog)
                        setIsDictModalOpen(true)
                      }}
                      className="px-3 py-1.5 bg-input hover:bg-bg-hover border border-border text-text-primary rounded text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer select-none active:scale-95"
                    >
                      Dictionary
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewType === 'list' && catalogs.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-input">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Catalog
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Classification
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
                {catalogs.map((catalog, idx) => (
                  <tr
                    key={catalog.id}
                    className={`border-b border-border hover:bg-border/50 transition-colors ${
                      idx === catalogs.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-text-primary font-medium truncate max-w-xs">
                      {catalog.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#569cd6]">
                      {catalog.classification}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {catalog.tables}
                    </td>
                    <td className="px-4 py-3">
                      <UserBadge username={catalog.owner} fullName={catalog.ownerFullName} avatarSize="xs" isClickable={false} />
                    </td>
                    <td className="px-4 py-3">
                      {catalog.status !== 'none' ? (
                        <StatusBadge
                          status={
                            catalog.status === 'granted'
                              ? 'approved'
                              : catalog.status === 'pending'
                                ? 'pending'
                                : 'rejected'
                          }
                          size="sm"
                        />
                      ) : (
                        <span className="text-xs text-text-muted">Unrequested</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {catalog.status === 'granted' && (
                          <CopyButton
                            content={generateSDKSnippet(catalog.name)}
                            label="Copy"
                            size="sm"
                            onCopy={handleCopy}
                          />
                        )}
                        {(catalog.status === 'none' || catalog.status === 'rejected') && (
                          <button
                            onClick={() => {
                              setSelectedCatalog(catalog)
                              setIsRequestModal(true)
                            }}
                            className="px-2 py-1 text-xs bg-primary text-white font-semibold rounded hover:bg-primary-hover transition-colors cursor-pointer"
                          >
                            Request
                          </button>
                        )}
                        {catalog.status === 'pending' && (
                          <span className="text-xs text-[#ffb84d] font-medium">Pending</span>
                        )}
                        <button
                          onClick={() => {
                            setActiveCatalogForDict(catalog)
                            setIsDictModalOpen(true)
                          }}
                          className="px-2 py-1 bg-input hover:bg-bg-hover border border-border text-text-primary rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer select-none active:scale-95"
                        >
                          Dictionary
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compact View */}
      {viewType === 'compact' && catalogs.length > 0 && (
        <div className="space-y-2">
          {catalogs.map((catalog) => (
            <div
              key={catalog.id}
              className="bg-input border border-border rounded p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-text-primary text-sm truncate">
                    {catalog.name}
                  </h4>
                  {catalog.status !== 'none' && (
                    <StatusBadge
                      status={
                        catalog.status === 'granted'
                          ? 'approved'
                          : catalog.status === 'pending'
                            ? 'pending'
                            : 'rejected'
                      }
                      size="sm"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
                  <span>{catalog.tables} columns</span>
                  <span>•</span>
                  <span>{catalog.classification}</span>
                  <span>•</span>
                  <UserBadge username={catalog.owner} fullName={catalog.ownerFullName} avatarSize="xs" isClickable={false} />
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                {catalog.status === 'granted' && (
                  <CopyButton
                    content={generateSDKSnippet(catalog.name)}
                    label="Copy"
                    size="sm"
                    onCopy={handleCopy}
                  />
                )}
                {(catalog.status === 'none' || catalog.status === 'rejected') && (
                  <button
                    onClick={() => {
                      setSelectedCatalog(catalog)
                      setIsRequestModal(true)
                    }}
                    className="px-2 py-1 text-xs bg-primary text-white font-semibold rounded hover:bg-primary-hover transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Request
                  </button>
                )}
                {catalog.status === 'pending' && (
                  <span className="text-xs text-[#ffb84d] font-medium">Pending</span>
                )}
                <button
                  onClick={() => {
                    setActiveCatalogForDict(catalog)
                    setIsDictModalOpen(true)
                  }}
                  className="px-2 py-1 bg-input hover:bg-bg-hover border border-border text-text-primary rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer select-none active:scale-95"
                >
                  Dictionary
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Access Request Modal */}
      <Modal
        isOpen={isRequestModal}
        onClose={() => {
          setIsRequestModal(false)
          setSelectedCatalog(null)
          setRequestReason('')
        }}
        title="Request Access"
        description={`Request access to ${selectedCatalog?.name}`}
        size="md"
      >
        <div className="space-y-4">
          <FormField
            label="Catalog Name"
            description="The dataset you are requesting access to"
          >
            <TextInput
              type="text"
              value={selectedCatalog?.name || ''}
              disabled
              className="opacity-50 cursor-not-allowed"
            />
          </FormField>

          <FormField
            label="Business Justification"
            description="Explain why you need access to this dataset"
            required
          >
            <TextArea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="E.g., Financial analysis for Q3 planning..."
              rows={4}
              className="font-mono text-xs"
            />
          </FormField>

          <FormField
            label="Duration"
            description="How long do you need access?"
          >
            <Select
              options={[
                { value: '30', label: '30 days' },
                { value: '60', label: '60 days' },
                { value: '90', label: '90 days' },
                { value: '180', label: '6 months' },
                { value: '365', label: '1 year' },
              ]}
              defaultValue="90"
            />
          </FormField>

          <FormField
            label="Data Classification Level"
            description="Acknowledge the classification level"
          >
            <Select
              options={[
                {
                  value: 'acknowledged',
                  label: 'I acknowledge this is ' +
                    (selectedCatalog?.classification || 'classified') +
                    ' data',
                },
              ]}
              defaultValue="acknowledged"
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button
              onClick={() => {
                setIsRequestModal(false)
                setSelectedCatalog(null)
                setRequestReason('')
              }}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestAccess}
              disabled={!requestReason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit Request
            </button>
          </div>
        </div>
      </Modal>

      {/* Catalog Data Dictionary Modal */}
      {isDictModalOpen && activeCatalogForDict && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsDictModalOpen(false)
            setActiveCatalogForDict(null)
            setDictSearch('')
          }}
          title={`Data Dictionary: ${activeCatalogForDict.name}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between bg-input/40 p-3 rounded border border-border/80">
              <div className="space-y-1">
                <p className="text-xs text-text-secondary leading-relaxed">
                  {activeCatalogForDict.description}
                </p>
                <div className="flex gap-4 text-[10px] text-text-muted mt-1.5">
                  <span>Classification: <strong className="text-[#569cd6]">{activeCatalogForDict.classification}</strong></span>
                  <span>Owner: <strong className="text-text-primary">{activeCatalogForDict.ownerFullName}</strong></span>
                  <span>Total Columns: <strong className="text-text-primary">{activeCatalogForDict.tables}</strong></span>
                </div>
              </div>
              {activeCatalogForDict.status === 'granted' && (
                <div className="flex-shrink-0">
                  <span className="px-2 py-0.5 bg-success/15 border border-success/35 text-success rounded text-[10px] font-bold uppercase tracking-wider">
                    Access Authorized
                  </span>
                </div>
              )}
            </div>

            {activeCatalogForDict.status !== 'granted' ? (
              <div className="p-8 text-center bg-card border border-border rounded-xl space-y-4">
                <div className="max-w-md mx-auto space-y-2">
                  <p className="text-sm font-semibold text-text-primary">
                    Access Permission Required
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    You do not have active access permissions to view this dataset's column schemas.
                    Please submit an access request to the governance team.
                  </p>
                </div>
                {activeCatalogForDict.status === 'pending' ? (
                  <div className="inline-block text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                    Awaiting approval for this dataset
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsDictModalOpen(false)
                      setSelectedCatalog(activeCatalogForDict)
                      setIsRequestModal(true)
                    }}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors active:scale-95 cursor-pointer"
                  >
                    Request Dataset Access
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={dictSearch}
                    onChange={(e) => setDictSearch(e.target.value)}
                    placeholder="Search columns by name, logical name, or description..."
                    className="w-full bg-input border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors"
                  />
                  <span className="absolute left-2.5 top-2.5 text-text-muted text-xs">🔍</span>
                </div>

                {/* Table */}
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-input border-b border-border text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                          <th className="p-3 border-r border-border">Field/Variable Name</th>
                          <th className="p-3 border-r border-border min-w-[150px]">Description</th>
                          <th className="p-3 border-r border-border">Logical Data Type</th>
                          <th className="p-3 border-r border-border">Allowed Values or Range</th>
                          <th className="p-3 border-r border-border">Units of Measurement</th>
                          <th className="p-3 border-r border-border text-center">Null Constraints</th>
                          <th className="p-3 border-r border-border text-center">Governance Tag</th>
                          <th className="p-3 border-r border-border text-center">Database Constraints</th>
                          <th className="p-3">Default Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCatalogForDict.schema_fields
                          .filter(f => {
                            const q = dictSearch.toLowerCase()
                            return (
                              f.column_name.toLowerCase().includes(q) ||
                              (f.logical_name || '').toLowerCase().includes(q) ||
                              (f.description || '').toLowerCase().includes(q)
                            )
                          })
                          .map((field) => (
                            <tr key={field.column_name} className="border-b border-border last:border-b-0 hover:bg-bg-hover/20">
                              <td className="p-3 border-r border-border font-mono font-semibold text-text-primary">
                                <div>{field.column_name}</div>
                                {field.logical_name && (
                                  <div className="text-[10px] text-text-secondary font-sans font-normal mt-0.5" title="Logical Name">
                                    {field.logical_name}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 border-r border-border text-text-secondary max-w-[200px] truncate" title={field.description}>
                                {field.description || <span className="text-text-muted italic">No description</span>}
                              </td>
                              <td className="p-3 border-r border-border">
                                <span className="px-2 py-0.5 bg-bg-hover border border-border rounded text-[10px] font-mono text-text-primary capitalize">
                                  {field.logical_type || field.data_type || 'String'}
                                </span>
                              </td>
                              <td className="p-3 border-r border-border text-text-secondary font-mono">
                                {field.allowed_values || '-'}
                              </td>
                              <td className="p-3 border-r border-border text-text-secondary">
                                {field.unit_of_measurement || '-'}
                              </td>
                              <td className="p-3 border-r border-border text-center font-mono text-[10px]">
                                {field.is_nullable === false ? (
                                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 rounded font-bold border border-rose-200 dark:border-rose-900/50">
                                    NOT NULL
                                  </span>
                                ) : (
                                  <span className="text-text-muted">NULL</span>
                                )}
                              </td>
                              <td className="p-3 border-r border-border text-center">
                                {field.classification ? (
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {field.classification.split(',').map(tag => {
                                      const cleanTag = tag.trim();
                                      if (!cleanTag) return null;
                                      const isRestricted = ['PII', 'PCI-DSS', 'Sensitive', 'Confidential'].includes(cleanTag);
                                      return (
                                        <span key={cleanTag} className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          isRestricted
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                                            : 'bg-bg-hover text-text-secondary border border-border'
                                        }`}>
                                          {cleanTag}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-text-muted/50">-</span>
                                )}
                              </td>
                              <td className="p-3 border-r border-border text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {field.is_primary_key && (
                                    <span className="px-1.5 py-0.5 bg-[#0d213f] text-[#cbd5e1] rounded text-[8px] font-bold" title="Primary Key">PK</span>
                                  )}
                                  {field.is_foreign_key && (
                                    <span className="px-1.5 py-0.5 bg-bg-hover text-text-primary rounded text-[8px] font-bold border border-border" title={`Foreign Key: ${field.foreign_key_ref}`}>FK</span>
                                  )}
                                  {field.is_unique && (
                                    <span className="px-1.5 py-0.5 bg-bg-hover text-text-primary rounded text-[8px] font-bold border border-border" title="Unique constraint">UQ</span>
                                  )}
                                  {!field.is_primary_key && !field.is_foreign_key && !field.is_unique && (
                                    <span className="text-text-muted/50">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-text-secondary font-mono">
                                {field.default_value || '-'}
                              </td>
                            </tr>
                          ))}
                        {activeCatalogForDict.schema_fields.length === 0 && (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-text-muted italic">
                              No columns found or permitted for this dataset.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={() => {
                  setIsDictModalOpen(false)
                  setActiveCatalogForDict(null)
                  setDictSearch('')
                }}
                className="px-4 py-2 text-xs font-semibold text-text-secondary bg-border hover:bg-bg-hover rounded transition-colors active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
