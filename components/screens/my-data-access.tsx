'use client'

import { useState } from 'react'
import { ViewToggle } from '@/components/ui/view-toggle'
import { CopyButton } from '@/components/ui/copy-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Alert } from '@/components/ui/alert'

type ViewType = 'grid' | 'list' | 'compact'

interface DataAccess {
  id: string
  catalogName: string
  tables: string[]
  totalColumns: number
  accessedColumns: number
  status: 'active' | 'pending' | 'expired'
  expiresIn: string
  grantedBy: string
  grantedDate: string
}

const mockDataAccess: DataAccess[] = [
  {
    id: '1',
    catalogName: 'corporate_financial_catalog',
    tables: ['customers', 'orders', 'transactions'],
    totalColumns: 15,
    accessedColumns: 12,
    status: 'active',
    expiresIn: '90 days',
    grantedBy: 'Finance Team',
    grantedDate: '2024-06-15',
  },
  {
    id: '2',
    catalogName: 'sales_metrics_catalog',
    tables: ['sales_daily', 'sales_monthly', 'forecasts'],
    totalColumns: 22,
    accessedColumns: 18,
    status: 'active',
    expiresIn: '60 days',
    grantedBy: 'Sales Operations',
    grantedDate: '2024-06-10',
  },
  {
    id: '3',
    catalogName: 'customer_analytics_catalog',
    tables: ['user_events', 'user_segments'],
    totalColumns: 8,
    accessedColumns: 5,
    status: 'pending',
    expiresIn: 'Awaiting approval',
    grantedBy: 'Analytics Team',
    grantedDate: '2024-07-20',
  },
]

function generatePythonSnippet(catalogName: string, tables: string[]): string {
  return `import dep_sdk
import pandas as pd

# Initialize DEP SDK
dep = dep_sdk.DEP()

# Read the governed dataset
df = dep.read_catalog("${catalogName}")

# Query specific tables
${tables.map((t) => `# data = dep.query("${catalogName}/${t}")`).join('\n')}

# Display basic info
print(f"Shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")

# First 5 rows
print(df.head())`
}

export function MyDataAccess() {
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const handleCopy = () => {
    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Copied!',
      message: 'Python SDK snippet copied to clipboard',
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
          <h2 className="text-2xl font-bold text-text-primary">My Data Access</h2>
          <p className="text-sm text-text-muted mt-1">
            View and manage your dataset access permissions
          </p>
        </div>
        <ViewToggle currentView={viewType} onViewChange={setViewType} />
      </div>

      {/* Grid View */}
      {viewType === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockDataAccess.map((access) => (
            <div
              key={access.id}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-text-primary text-sm flex-1">
                  {access.catalogName}
                </h3>
                <StatusBadge status={access.status} size="sm" />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Tables:</span>
                  <span className="text-text-primary font-medium">{access.tables.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Columns:</span>
                  <span className="text-text-primary font-medium">
                    {access.accessedColumns}/{access.totalColumns}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Expires:</span>
                  <span className="text-text-primary font-medium">{access.expiresIn}</span>
                </div>
              </div>

              <div className="text-xs text-text-muted mb-4 pb-4 border-b border-border">
                <div className="mb-1">
                  <span className="font-medium text-text-secondary">Tables:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {access.tables.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 bg-border rounded text-[#569cd6]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <CopyButton
                content={generatePythonSnippet(access.catalogName, access.tables)}
                label="Copy SDK"
                size="sm"
                className="w-full justify-center"
                onCopy={handleCopy}
              />
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
                    Tables
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Columns
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockDataAccess.map((access, idx) => (
                  <tr
                    key={access.id}
                    className={`border-b border-border hover:bg-border/50 transition-colors ${
                      idx === mockDataAccess.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-text-primary font-medium">
                      {access.catalogName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {access.tables.length} tables
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {access.accessedColumns}/{access.totalColumns}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={access.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {access.expiresIn}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CopyButton
                        content={generatePythonSnippet(
                          access.catalogName,
                          access.tables
                        )}
                        label="Copy"
                        size="sm"
                        onCopy={handleCopy}
                      />
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
          {mockDataAccess.map((access) => (
            <div
              key={access.id}
              className="bg-input border border-border rounded p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-text-primary text-sm truncate">
                    {access.catalogName}
                  </h4>
                  <StatusBadge status={access.status} size="sm" />
                </div>
                <div className="text-xs text-text-muted">
                  {access.tables.length} tables • {access.accessedColumns}/{access.totalColumns}{' '}
                  columns • {access.expiresIn}
                </div>
              </div>
              <CopyButton
                content={generatePythonSnippet(access.catalogName, access.tables)}
                label="Copy"
                size="sm"
                onCopy={handleCopy}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
