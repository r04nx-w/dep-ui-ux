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

              <div>
                {catalog.status === 'granted' && (
                  <CopyButton
                    content={generateSDKSnippet(catalog.name)}
                    label="Copy SDK"
                    size="sm"
                    className="w-full justify-center"
                    onCopy={handleCopy}
                  />
                )}

                {catalog.status === 'pending' && (
                  <div className="text-xs text-[#ffb84d] bg-[#ce9178]/10 border border-[#ce9178]/30 rounded px-3 py-2 text-center font-medium">
                    Awaiting Approval
                  </div>
                )}

                {(catalog.status === 'none' || catalog.status === 'rejected') && (
                  <button
                    onClick={() => {
                      setSelectedCatalog(catalog)
                      setIsRequestModal(true)
                    }}
                    className="w-full px-3 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors"
                  >
                    {catalog.status === 'rejected' ? 'Re-request Access' : 'Request Access'}
                  </button>
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
                          className="px-2 py-1 text-xs bg-primary text-white font-semibold rounded hover:bg-primary-hover transition-colors"
                        >
                          Request
                        </button>
                      )}
                      {catalog.status === 'pending' && (
                        <span className="text-xs text-[#ffb84d] font-medium">Pending</span>
                      )}
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
                  className="px-2 py-1 text-xs bg-primary text-white font-semibold rounded hover:bg-primary-hover transition-colors whitespace-nowrap ml-2"
                >
                  Request
                </button>
              )}
              {catalog.status === 'pending' && (
                <span className="text-xs text-[#ffb84d] font-medium ml-2">Pending</span>
              )}
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
    </div>
  )
}
