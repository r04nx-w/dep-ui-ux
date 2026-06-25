'use client'

import { useState } from 'react'
import { Database, Plus, Edit2, Trash2, Check, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { ViewToggle } from '@/components/ui/view-toggle'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  FormField,
  TextInput,
  TextArea,
  Select,
  Checkbox,
} from '@/components/ui/form-field'

type ViewType = 'grid' | 'list' | 'compact'

interface DataSource {
  id: string
  name: string
  type: 'PostgreSQL' | 'MySQL' | 'CSV'
  host?: string
  port?: string
  database?: string
  fileName?: string
  status: 'connected' | 'testing' | 'error' | 'ready'
  lastTested?: string
  owner: string
  description: string
  rowCount: number
  tables: number
}

const mockDataSources: DataSource[] = [
  {
    id: '1',
    name: 'sales_oltp',
    type: 'MySQL',
    host: '10.0.0.5',
    port: '3306',
    database: 'sales_db',
    status: 'connected',
    lastTested: '2024-07-22 14:30',
    owner: 'Sales Team',
    description: 'OLTP database for sales transactions',
    rowCount: 5200000,
    tables: 8,
  },
  {
    id: '2',
    name: 'customer_analytics',
    type: 'PostgreSQL',
    host: 'analytics.internal',
    port: '5432',
    database: 'analytics_prod',
    status: 'connected',
    lastTested: '2024-07-22 11:15',
    owner: 'Analytics Team',
    description: 'Customer behavior and segment data',
    rowCount: 2100000,
    tables: 12,
  },
  {
    id: '3',
    name: 'sales_q1_raw.csv',
    type: 'CSV',
    fileName: 'sales_q1_raw.csv',
    status: 'ready',
    owner: 'Finance Team',
    description: 'Q1 sales raw data export',
    rowCount: 45000,
    tables: 1,
  },
]

export function DataSourcesHub() {
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [dataSources, setDataSources] = useState(mockDataSources)
  const [isCreateModal, setIsCreateModal] = useState(false)
  const [isEditModal, setIsEditModal] = useState(false)
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [formData, setFormData] = useState<Partial<DataSource>>({})
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const openCreateModal = () => {
    setFormData({})
    setSelectedSource(null)
    setIsCreateModal(true)
  }

  const openEditModal = (source: DataSource) => {
    setFormData(source)
    setSelectedSource(source)
    setIsEditModal(true)
  }

  const handleSaveSource = () => {
    if (!formData.name) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields',
      })
      return
    }

    if (isEditModal && selectedSource) {
      setDataSources(
        dataSources.map((ds) =>
          ds.id === selectedSource.id ? { ...ds, ...formData } : ds
        )
      )
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Updated',
        message: `Data source "${formData.name}" has been updated successfully.`,
      })
    } else {
      const newSource: DataSource = {
        id: Date.now().toString(),
        ...formData,
        status: 'testing',
        owner: 'Current User',
        rowCount: 0,
        tables: 0,
      } as DataSource

      setDataSources([...dataSources, newSource])
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Created',
        message: `Data source "${formData.name}" has been added. Testing connection...`,
      })
    }

    setIsCreateModal(false)
    setIsEditModal(false)
    setFormData({})
  }

  const handleDeleteSource = (id: string) => {
    const source = dataSources.find((ds) => ds.id === id)
    setDataSources(dataSources.filter((ds) => ds.id !== id))
    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Deleted',
      message: `Data source "${source?.name}" has been deleted.`,
    })
  }

  const handleTestConnection = (id: string) => {
    setDataSources(
      dataSources.map((ds) =>
        ds.id === id ? { ...ds, status: 'testing' as const } : ds
      )
    )

    setTimeout(() => {
      setDataSources(
        dataSources.map((ds) =>
          ds.id === id
            ? {
                ...ds,
                status: 'connected' as const,
                lastTested: new Date().toLocaleString(),
              }
            : ds
        )
      )
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Connection Successful',
        message: 'Successfully connected to the data source.',
      })
    }, 1500)
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
          <h2 className="text-2xl font-bold text-[#e8e8e8]">Data Sources Hub</h2>
          <p className="text-sm text-[#808080] mt-1">
            Manage your connected databases and data sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle currentView={viewType} onViewChange={setViewType} />
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#007acc] text-white text-sm font-medium rounded hover:bg-[#0e639c] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewType === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSources.map((source) => (
            <div
              key={source.id}
              className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-lg p-4 hover:border-[#007acc]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#569cd6]" />
                  <h3 className="font-semibold text-[#e8e8e8] truncate">
                    {source.name}
                  </h3>
                </div>
                <StatusBadge
                  status={
                    source.status === 'connected'
                      ? 'active'
                      : source.status === 'error'
                        ? 'inactive'
                        : 'pending'
                  }
                  size="sm"
                />
              </div>

              <p className="text-xs text-[#808080] mb-3">{source.description}</p>

              <div className="space-y-2 mb-4 pb-4 border-b border-[#2b2b2b]">
                <div className="flex justify-between text-xs">
                  <span className="text-[#808080]">Type:</span>
                  <span className="text-[#e8e8e8]">{source.type}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#808080]">Tables:</span>
                  <span className="text-[#e8e8e8]">{source.tables}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#808080]">Rows:</span>
                  <span className="text-[#e8e8e8]">
                    {(source.rowCount / 1000000).toFixed(1)}M
                  </span>
                </div>
                {source.lastTested && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#808080]">Last Tested:</span>
                    <span className="text-[#a0a0a0]">{source.lastTested}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTestConnection(source.id)}
                  disabled={source.status === 'testing'}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-[#2b2b2b] text-[#a0a0a0] rounded hover:bg-[#37373d] disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                >
                  {source.status === 'testing' ? (
                    <>
                      <div className="w-3 h-3 border border-[#007acc] border-t-transparent rounded-full animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test'
                  )}
                </button>
                <button
                  onClick={() => openEditModal(source)}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-[#2b2b2b] text-[#a0a0a0] rounded hover:bg-[#37373d] transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-[#2b2b2b] text-[#f44747] rounded hover:bg-[#f44747]/20 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
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
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#a0a0a0] uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#a0a0a0] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#a0a0a0] uppercase">
                    Tables
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#a0a0a0] uppercase">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#a0a0a0] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((source, idx) => (
                  <tr
                    key={source.id}
                    className={`border-b border-[#2b2b2b] hover:bg-[#2b2b2b]/50 transition-colors ${
                      idx === dataSources.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-[#e8e8e8] font-medium flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#569cd6] flex-shrink-0" />
                      <span className="truncate">{source.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#a0a0a0]">
                      {source.type}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          source.status === 'connected'
                            ? 'active'
                            : source.status === 'error'
                              ? 'inactive'
                              : 'pending'
                        }
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-[#a0a0a0]">
                      {source.tables}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#a0a0a0]">
                      {source.owner}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleTestConnection(source.id)}
                          disabled={source.status === 'testing'}
                          className="p-1 text-[#a0a0a0] hover:text-[#569cd6] disabled:opacity-50 transition-colors"
                          title="Test connection"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(source)}
                          className="p-1 text-[#a0a0a0] hover:text-[#007acc] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="p-1 text-[#a0a0a0] hover:text-[#f44747] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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
      {viewType === 'compact' && (
        <div className="space-y-2">
          {dataSources.map((source) => (
            <div
              key={source.id}
              className="bg-[#2d2d2d] border border-[#2b2b2b] rounded p-3 flex items-center justify-between hover:border-[#007acc]/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-4 h-4 text-[#569cd6] flex-shrink-0" />
                  <h4 className="font-semibold text-[#e8e8e8] text-sm truncate">
                    {source.name}
                  </h4>
                  <StatusBadge
                    status={
                      source.status === 'connected'
                        ? 'active'
                        : source.status === 'error'
                          ? 'inactive'
                          : 'pending'
                    }
                    size="sm"
                  />
                </div>
                <div className="text-xs text-[#808080]">
                  {source.type} • {source.tables} tables • {source.owner}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleTestConnection(source.id)}
                  disabled={source.status === 'testing'}
                  className="p-1 text-[#a0a0a0] hover:text-[#569cd6] disabled:opacity-50 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(source)}
                  className="p-1 text-[#a0a0a0] hover:text-[#007acc] transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="p-1 text-[#a0a0a0] hover:text-[#f44747] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModal || isEditModal}
        onClose={() => {
          setIsCreateModal(false)
          setIsEditModal(false)
          setFormData({})
        }}
        title={isEditModal ? 'Edit Data Source' : 'Add New Data Source'}
        description={
          isEditModal
            ? `Update the details for ${selectedSource?.name}`
            : 'Connect a new database or upload a data source'
        }
        size="lg"
      >
        <div className="space-y-4">
          <FormField
            label="Source Name"
            description="A unique identifier for this data source"
            required
          >
            <TextInput
              type="text"
              placeholder="e.g., sales_oltp"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <FormField
            label="Source Type"
            description="Select the type of data source"
            required
          >
            <Select
              options={[
                { value: 'PostgreSQL', label: 'PostgreSQL' },
                { value: 'MySQL', label: 'MySQL' },
                { value: 'CSV', label: 'CSV File' },
              ]}
              value={formData.type || 'PostgreSQL'}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as any })
              }
            />
          </FormField>

          {(formData.type === 'PostgreSQL' || formData.type === 'MySQL') && (
            <>
              <FormField
                label="Host Address"
                description="The hostname or IP address of your database server"
                required
              >
                <TextInput
                  type="text"
                  placeholder="e.g., db.example.com"
                  value={formData.host || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, host: e.target.value })
                  }
                />
              </FormField>

              <FormField
                label="Port"
                description="Database port number"
                required
              >
                <TextInput
                  type="number"
                  placeholder={formData.type === 'PostgreSQL' ? '5432' : '3306'}
                  value={formData.port || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, port: e.target.value })
                  }
                />
              </FormField>

              <FormField
                label="Database Name"
                description="The name of the database to connect to"
                required
              >
                <TextInput
                  type="text"
                  placeholder="e.g., analytics_db"
                  value={formData.database || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, database: e.target.value })
                  }
                />
              </FormField>
            </>
          )}

          {formData.type === 'CSV' && (
            <FormField
              label="File Name"
              description="Upload or provide the CSV file"
              required
            >
              <TextInput
                type="text"
                placeholder="e.g., sales_data.csv"
                value={formData.fileName || ''}
                onChange={(e) =>
                  setFormData({ ...formData, fileName: e.target.value })
                }
              />
            </FormField>
          )}

          <FormField
            label="Description"
            description="Describe the purpose and content of this data source"
          >
            <TextArea
              placeholder="e.g., OLTP database for sales transactions..."
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </FormField>

          <FormField label="Sensitive Data">
            <Checkbox label="This source contains PII or sensitive data" />
          </FormField>

          <div className="flex gap-3 justify-end pt-4 border-t border-[#2b2b2b]">
            <button
              onClick={() => {
                setIsCreateModal(false)
                setIsEditModal(false)
                setFormData({})
              }}
              className="px-4 py-2 text-sm font-medium text-[#a0a0a0] bg-[#2b2b2b] rounded hover:bg-[#37373d] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSource}
              className="px-4 py-2 text-sm font-medium text-white bg-[#007acc] rounded hover:bg-[#0e639c] transition-colors"
            >
              {isEditModal ? 'Save Changes' : 'Add Source'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
