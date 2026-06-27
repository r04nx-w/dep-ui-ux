'use client'

import { useState } from 'react'
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

type ViewType = 'grid' | 'list' | 'compact'

interface Catalog {
  id: string
  name: string
  description: string
  classification: string
  status: 'granted' | 'pending' | 'rejected'
  tables: number
  owner: string
  lastUpdated: string
}

const mockCatalogs: Catalog[] = [
  {
    id: '1',
    name: 'corporate_financial_catalog',
    description: 'Financial records including transactions, budgets, and forecasts',
    classification: 'Restricted PII',
    status: 'granted',
    tables: 8,
    owner: 'Finance Team',
    lastUpdated: '2024-07-15',
  },
  {
    id: '2',
    name: 'sales_metrics_catalog',
    description: 'Sales performance data with regional breakdowns',
    classification: 'Confidential',
    status: 'pending',
    tables: 12,
    owner: 'Sales Operations',
    lastUpdated: '2024-07-20',
  },
  {
    id: '3',
    name: 'marketing_data_catalog',
    description: 'Campaign performance and customer engagement metrics',
    classification: 'Internal',
    status: 'granted',
    tables: 6,
    owner: 'Marketing Team',
    lastUpdated: '2024-07-18',
  },
  {
    id: '4',
    name: 'customer_analytics_catalog',
    description: 'Customer behavior and segmentation data',
    classification: 'Confidential',
    status: 'rejected',
    tables: 10,
    owner: 'Analytics Team',
    lastUpdated: '2024-07-22',
  },
]

function generateSDKSnippet(catalogName: string): string {
  return `import dep_sdk
from dep_sdk import AccessLevel

# Initialize DEP client
client = dep_sdk.Client()

# Read catalog with governed access
df = client.read_catalog(
    name="${catalogName}",
    access_level=AccessLevel.READ
)

# Display info
print(f"Shape: {df.shape}")
print(df.head())`
}

export function CatalogExplorer() {
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null)
  const [isRequestModal, setIsRequestModal] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const handleRequestAccess = () => {
    if (selectedCatalog && requestReason.trim()) {
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Access Requested',
        message: `Your request for ${selectedCatalog.name} has been submitted for approval.`,
      })
      setIsRequestModal(false)
      setRequestReason('')
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
          <h2 className="text-2xl font-bold text-text-primary">Catalog Explorer</h2>
          <p className="text-sm text-text-muted mt-1">
            Browse available datasets and request access
          </p>
        </div>
        <ViewToggle currentView={viewType} onViewChange={setViewType} />
      </div>

      {/* Grid View */}
      {viewType === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockCatalogs.map((catalog) => (
            <div
              key={catalog.id}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-text-primary text-sm flex-1 truncate">
                  {catalog.name}
                </h3>
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
              </div>

              <p className="text-xs text-text-muted mb-4 flex-1">
                {catalog.description}
              </p>

              <div className="space-y-2 mb-4 pb-4 border-b border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Classification:</span>
                  <span className="text-[#569cd6]">{catalog.classification}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Tables:</span>
                  <span className="text-text-primary font-medium">{catalog.tables}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Owner:</span>
                  <span className="text-text-primary font-medium">{catalog.owner}</span>
                </div>
              </div>

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
                <div className="text-xs text-[#ffb84d] bg-[#ce9178]/10 border border-[#ce9178]/30 rounded px-3 py-2 text-center">
                  Awaiting Approval
                </div>
              )}

              {catalog.status === 'rejected' && (
                <button
                  onClick={() => {
                    setSelectedCatalog(catalog)
                    setIsRequestModal(true)
                  }}
                  className="px-3 py-2 bg-primary text-white text-xs font-medium rounded hover:bg-primary-hover transition-colors"
                >
                  Request Access
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewType === 'list' && (
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
                    Tables
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
                {mockCatalogs.map((catalog, idx) => (
                  <tr
                    key={catalog.id}
                    className={`border-b border-border hover:bg-border/50 transition-colors ${
                      idx === mockCatalogs.length - 1 ? 'border-b-0' : ''
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
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {catalog.owner}
                    </td>
                    <td className="px-4 py-3">
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
                      {catalog.status === 'rejected' && (
                        <button
                          onClick={() => {
                            setSelectedCatalog(catalog)
                            setIsRequestModal(true)
                          }}
                          className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                        >
                          Request
                        </button>
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
      {viewType === 'compact' && (
        <div className="space-y-2">
          {mockCatalogs.map((catalog) => (
            <div
              key={catalog.id}
              className="bg-input border border-border rounded p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-text-primary text-sm truncate">
                    {catalog.name}
                  </h4>
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
                </div>
                <div className="text-xs text-text-muted">
                  {catalog.tables} tables • {catalog.classification} • {catalog.owner}
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
              {catalog.status === 'rejected' && (
                <button
                  onClick={() => {
                    setSelectedCatalog(catalog)
                    setIsRequestModal(true)
                  }}
                  className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover transition-colors whitespace-nowrap ml-2"
                >
                  Request
                </button>
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
