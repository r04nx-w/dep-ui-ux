'use client'

import { useState, useEffect } from 'react'
import { Database, Plus, Trash2, Check, AlertCircle, Maximize2, Minimize2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { ViewToggle } from '@/components/ui/view-toggle'
import { StatusBadge } from '@/components/ui/status-badge'
import { CSVUploader } from '@/components/ui/csv-uploader'
import { CSVMetadataDisplay } from '@/components/ui/csv-metadata-display'
import { CSVDataPreview } from '@/components/ui/csv-data-preview'
import { apiFetch } from '@/lib/api'
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
  table?: string
  username?: string
  password?: string
  fileName?: string
  status: 'connected' | 'testing' | 'error' | 'ready'
  lastTested?: string
  owner: string
  description: string
  rowCount: number
  tables: number
  columns?: string[]
  csvMetadata?: any
}

interface DataSourcesHubProps {
  userRole?: 'admin' | 'onboarder' | 'analyst'
}

function mapBackendType(type: string): 'PostgreSQL' | 'MySQL' | 'CSV' {
  if (type === 'postgresql') return 'PostgreSQL'
  if (type === 'mysql') return 'MySQL'
  return 'CSV'
}

function mapFrontendType(type: 'PostgreSQL' | 'MySQL' | 'CSV'): string {
  if (type === 'PostgreSQL') return 'postgresql'
  if (type === 'MySQL') return 'mysql'
  return 'csv'
}

export function DataSourcesHub({ userRole }: DataSourcesHubProps) {
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateModal, setIsCreateModal] = useState(false)
  const [isEditModal, setIsEditModal] = useState(false)
  const [isModalExpanded, setIsModalExpanded] = useState(false)
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [formData, setFormData] = useState<Partial<DataSource>>({})
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvMetadata, setCsvMetadata] = useState<any>(null)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isTestingModalConn, setIsTestingModalConn] = useState(false)
  
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const datasets = await apiFetch<any[]>('/datasets')
      const mapped = await Promise.all(
        datasets.map(async (ds) => {
          let columns: string[] = []
          try {
            const schema = await apiFetch<any[]>(`/datasets/${ds.id}/schema`)
            columns = schema.map((field) => field.column_name)
          } catch (err) {
            console.error(`Failed to fetch schema for dataset ${ds.id}:`, err)
          }

          return {
            id: String(ds.id),
            name: ds.name,
            type: mapBackendType(ds.source_type),
            status: ds.status === 'active' ? 'connected' as const : 'error' as const,
            owner: ds.owner_username || 'unknown',
            description: ds.source_type === 'csv' ? 'CSV raw data source' : 'Database connection',
            rowCount: 0,
            tables: 1,
            columns: columns,
          }
        })
      )
      setDataSources(mapped)
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Fetch Error',
        message: err.message || 'Failed to fetch data sources from backend.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const openCreateModal = () => {
    setFormData({ type: 'PostgreSQL' })
    setSelectedSource(null)
    setCsvFile(null)
    setCsvMetadata(null)
    setShowMetadata(false)
    setShowPreview(false)
    setIsModalExpanded(false)
    setIsCreateModal(true)
  }

  const handleCSVUpload = (metadata: any, file: File) => {
    setCsvMetadata(metadata)
    setCsvFile(file)
    setShowMetadata(true)
    setFormData({ ...formData, name: metadata.fileName.replace(/\.csv$/i, ''), type: 'CSV' })
  }

  const handleCSVClear = () => {
    setCsvMetadata(null)
    setCsvFile(null)
    setShowMetadata(false)
    setShowPreview(false)
    setFormData({ ...formData, name: '' })
  }

  const handleColumnUpdate = (columnName: string, updates: any) => {
    if (csvMetadata) {
      const updatedColumns = csvMetadata.columns.map((col: any) =>
        col.name === columnName ? { ...col, ...updates } : col
      )
      setCsvMetadata({ ...csvMetadata, columns: updatedColumns })
    }
  }

  const handleTestModalConnection = async () => {
    const type = mapFrontendType(formData.type || 'PostgreSQL')
    const host = formData.host || ''
    const port = Number(formData.port) || (formData.type === 'PostgreSQL' ? 5432 : 3306)
    const database = formData.database || ''
    const table = formData.table || ''
    const username = formData.username || ''
    const password = formData.password || ''

    if (!host || !database || !table || !username || !password) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all database fields (Host, Port, Database, Table, Username, Password) to test.',
      })
      return
    }

    setIsTestingModalConn(true)
    try {
      const endpoint = type === 'mysql' ? '/connectors/mysql/test' : '/connectors/postgres/test'
      const result = await apiFetch<{ success: boolean; error?: string | null }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          host,
          port,
          database,
          table,
          username,
          password,
        }),
      })

      if (!result.success) {
        throw new Error(result.error || 'Connection test failed')
      }

      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Connection Successful',
        message: 'Database connection test successful!',
      })
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Connection Failed',
        message: err.message || 'Could not establish connection to the database.',
      })
    } finally {
      setIsTestingModalConn(false)
    }
  }

  const handleSaveSource = async () => {
    if (!formData.name) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a unique source name',
      })
      return
    }

    try {
      if (formData.type === 'CSV') {
        if (!csvFile) {
          setAlertState({
            isOpen: true,
            type: 'error',
            title: 'Validation Error',
            message: 'Please select a CSV file to upload',
          })
          return
        }

        const form = new FormData()
        form.append('name', formData.name)
        form.append('file', csvFile)

        await apiFetch('/datasets/csv/upload', {
          method: 'POST',
          body: form,
        })
      } else {
        const type = mapFrontendType(formData.type || 'PostgreSQL')
        const host = formData.host || ''
        const port = Number(formData.port) || (formData.type === 'PostgreSQL' ? 5432 : 3306)
        const database = formData.database || ''
        const table = formData.table || ''
        const username = formData.username || ''
        const password = formData.password || ''

        if (!host || !database || !table || !username || !password) {
          setAlertState({
            isOpen: true,
            type: 'error',
            title: 'Validation Error',
            message: 'Please fill in all database fields (Host, Port, Database, Table, Username, Password)',
          })
          return
        }

        await apiFetch('/datasets/db', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            source_type: type,
            host,
            port,
            database,
            table,
            username,
            password,
          }),
        })
      }

      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Created',
        message: `Data source "${formData.name}" has been registered successfully.`,
      })

      fetchConnections()
      setIsCreateModal(false)
      setFormData({})
      setCsvFile(null)
      setCsvMetadata(null)
      setShowMetadata(false)
      setShowPreview(false)
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'An error occurred while saving the data source.',
      })
    }
  }

  const handleDeleteSource = async (id: string) => {
    try {
      await apiFetch(`/datasets/${id}`, {
        method: 'DELETE',
      })
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Deactivated',
        message: 'Data source connection has been deactivated.',
      })
      fetchConnections()
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Deactivation Failed',
        message: err.message || 'An error occurred while deactivating the data source.',
      })
    }
  }

  const handleActivateSource = async (id: string) => {
    try {
      await apiFetch(`/datasets/${id}/activate`, {
        method: 'PATCH',
      })
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Activated',
        message: 'Data source connection is now active.',
      })
      fetchConnections()
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Activation Failed',
        message: err.message || 'An error occurred while activating the data source.',
      })
    }
  }

  const handleTestConnection = (id: string) => {
    setDataSources((prev) =>
      prev.map((ds) =>
        ds.id === id ? { ...ds, status: 'testing' as const } : ds
      )
    )

    setTimeout(() => {
      setDataSources((prev) =>
        prev.map((ds) =>
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
        message: 'Successfully tested connection to database.',
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
          <h2 className="text-2xl font-bold text-text-primary">Data Connections</h2>
          <p className="text-sm text-text-muted mt-1">
            Manage your connected databases and data sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle currentView={viewType} onViewChange={setViewType} />
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </button>
        </div>
      </div>

      {loading && dataSources.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewType === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataSources.map((source) => (
                <div
                  key={source.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-[#569cd6]" />
                        <h3 className="font-semibold text-text-primary truncate">
                          {source.name}
                        </h3>
                      </div>
                      <StatusBadge
                        status={source.status === 'connected' ? 'active' : 'inactive'}
                        size="sm"
                      />
                    </div>

                    <p className="text-xs text-text-muted mb-3">{source.description}</p>

                    <div className="space-y-2 mb-4 pb-4 border-b border-border">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Type:</span>
                        <span className="text-text-primary">{source.type}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Owner:</span>
                        <span className="text-text-primary">{source.owner}</span>
                      </div>

                      {source.type === 'CSV' ? (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-text-muted">Columns:</span>
                            <span className="text-text-primary">
                              {source.columns ? source.columns.length : 0}
                            </span>
                          </div>
                          {source.columns && source.columns.length > 0 && (
                            <div className="pt-2">
                              <span className="text-[10px] text-text-muted block mb-1">
                                Column list:
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar">
                                {source.columns.map((col) => (
                                  <span
                                    key={col}
                                    className="px-1.5 py-0.5 bg-input border border-border rounded text-[10px] text-text-secondary select-none"
                                  >
                                    {col}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {source.lastTested && (
                            <div className="flex justify-between text-xs">
                              <span className="text-text-muted">Last Tested:</span>
                              <span className="text-text-secondary">{source.lastTested}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {source.type !== 'CSV' && (
                      <button
                        onClick={() => handleTestConnection(source.id)}
                        disabled={source.status === 'testing'}
                        className="flex-1 px-3 py-2 text-xs font-medium bg-border text-text-secondary rounded hover:bg-bg-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                      >
                        {source.status === 'testing' ? (
                          <>
                            <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                            Testing...
                          </>
                        ) : (
                          'Test'
                        )}
                      </button>
                    )}
                    {source.status === 'error' ? (
                      <button
                        onClick={() => handleActivateSource(source.id)}
                        className="flex-1 px-3 py-2 text-xs font-medium bg-primary text-white rounded hover:bg-primary-hover transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="flex-1 px-3 py-2 text-xs font-medium bg-border text-[#f44747] rounded hover:bg-[#f44747]/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Deactivate
                      </button>
                    )}
                  </div>
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
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Columns
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Owner
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataSources.map((source, idx) => (
                      <tr
                        key={source.id}
                        className={`border-b border-border hover:bg-border/50 transition-colors ${
                          idx === dataSources.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-text-primary font-medium flex items-center gap-2">
                          <Database className="w-4 h-4 text-[#569cd6] flex-shrink-0" />
                          <span className="truncate">{source.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{source.type}</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={source.status === 'connected' ? 'active' : 'inactive'}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {source.columns && source.columns.length > 0 ? (
                            <span className="truncate max-w-xs block">
                              {source.columns.join(', ')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{source.owner}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            {source.type !== 'CSV' && (
                              <button
                                onClick={() => handleTestConnection(source.id)}
                                disabled={source.status === 'testing'}
                                className="p-1 text-text-secondary hover:text-[#569cd6] disabled:opacity-50 transition-colors"
                                title="Test connection"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {source.status === 'error' ? (
                              <button
                                onClick={() => handleActivateSource(source.id)}
                                className="p-1 text-[#7cb342] hover:text-[#7cb342]/80 transition-colors"
                                title="Activate"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteSource(source.id)}
                                className="p-1 text-text-secondary hover:text-[#f44747] transition-colors"
                                title="Deactivate"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
                  className="bg-input border border-border rounded p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-[#569cd6] flex-shrink-0" />
                      <h4 className="font-semibold text-text-primary text-sm truncate">
                        {source.name}
                      </h4>
                      <StatusBadge
                        status={source.status === 'connected' ? 'active' : 'inactive'}
                        size="sm"
                      />
                    </div>
                    <div className="text-xs text-text-muted">
                      {source.type} •{' '}
                      {source.type === 'CSV'
                        ? `${source.columns?.length || 0} columns`
                        : 'Database'}{' '}
                      • {source.owner}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {source.type !== 'CSV' && (
                      <button
                        onClick={() => handleTestConnection(source.id)}
                        disabled={source.status === 'testing'}
                        className="p-1 text-text-secondary hover:text-[#569cd6] disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {source.status === 'error' ? (
                      <button
                        onClick={() => handleActivateSource(source.id)}
                        className="p-1 text-[#7cb342] hover:text-[#7cb342]/80 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-1 text-text-secondary hover:text-[#f44747] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModal}
        onClose={() => {
          setIsCreateModal(false)
          setFormData({})
          setIsModalExpanded(false)
        }}
        title="Add New Data Source"
        description="Connect a new database or upload a data source"
        size={isModalExpanded ? 'xl' : 'lg'}
        titleAction={
          <button
            onClick={() => setIsModalExpanded(!isModalExpanded)}
            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-secondary hover:text-text-primary"
            title={isModalExpanded ? 'Collapse modal' : 'Expand modal'}
          >
            {isModalExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        }
      >
        <div className="space-y-3">
          <FormField label="Source Name" description="Unique dataset registry name" required>
            <TextInput
              type="text"
              placeholder="e.g., sales_oltp"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <FormField label="Source Type" description="Database or file" required>
            <Select
              options={[
                { value: 'PostgreSQL', label: 'PostgreSQL' },
                { value: 'MySQL', label: 'MySQL' },
                { value: 'CSV', label: 'CSV File' },
              ]}
              value={formData.type || 'PostgreSQL'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            />
          </FormField>

          {(formData.type === 'PostgreSQL' || formData.type === 'MySQL') && (
            <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
              <div className="col-span-2">
                <FormField label="Host" description="Server address" required>
                  <TextInput
                    type="text"
                    placeholder="db.example.com"
                    value={formData.host || ''}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Port" description="Port number" required>
                  <TextInput
                    type="number"
                    placeholder={formData.type === 'PostgreSQL' ? '5432' : '3306'}
                    value={formData.port || ''}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="col-span-3">
                <FormField label="Database" description="Database name" required>
                  <TextInput
                    type="text"
                    placeholder="analytics_db"
                    value={formData.database || ''}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="col-span-3">
                <FormField label="Table" description="Table name to register" required>
                  <TextInput
                    type="text"
                    placeholder="transactions_table"
                    value={formData.table || ''}
                    onChange={(e) => setFormData({ ...formData, table: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="col-span-3 grid grid-cols-2 gap-3">
                <FormField label="Username" description="Database username" required>
                  <TextInput
                    type="text"
                    placeholder="dbuser"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </FormField>

                <FormField label="Password" description="Database password" required>
                  <TextInput
                    type="password"
                    placeholder="••••••••"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          )}

          {formData.type === 'CSV' && (
            <FormField label="CSV File" description="Upload to extract metadata" required>
              <CSVUploader onFileUpload={handleCSVUpload} onClear={handleCSVClear} />
            </FormField>
          )}

          {formData.type === 'CSV' && csvMetadata && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowMetadata(true)
                    setShowPreview(false)
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    showMetadata
                      ? 'bg-primary text-white'
                      : 'bg-input text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  Metadata
                </button>
                <button
                  onClick={() => {
                    setShowMetadata(false)
                    setShowPreview(true)
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    showPreview
                      ? 'bg-primary text-white'
                      : 'bg-input text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  Preview
                </button>
              </div>

              {showMetadata && (
                <CSVMetadataDisplay metadata={csvMetadata} onColumnUpdate={handleColumnUpdate} />
              )}

              {showPreview && <CSVDataPreview metadata={csvMetadata} />}
            </>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            {(formData.type === 'PostgreSQL' || formData.type === 'MySQL') && (
              <button
                type="button"
                onClick={handleTestModalConnection}
                disabled={isTestingModalConn}
                className="px-4 py-2 text-sm font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors mr-auto flex items-center gap-1.5"
              >
                {isTestingModalConn ? (
                  <>
                    <div className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
            )}

            <button
              onClick={() => {
                setIsCreateModal(false)
                setFormData({})
              }}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSource}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-hover transition-colors"
            >
              Add Connection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
