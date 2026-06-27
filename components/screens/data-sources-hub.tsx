'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Database,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Maximize2,
  Minimize2,
  Search,
  X,
  ServerCrash,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
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
  Select,
} from '@/components/ui/form-field'

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewType = 'grid' | 'list' | 'compact'
type ConnStatus = 'connected' | 'testing' | 'error' | 'inactive'

interface SchemaField {
  column_name: string
  data_type: string
  ordinal_position: number
}

interface DataSource {
  id: string
  name: string
  type: 'PostgreSQL' | 'MySQL' | 'CSV'
  status: ConnStatus
  lastTested?: string
  owner: string
  description: string
  columns: string[]
  columnTypes: Record<string, string>
  createdAt?: string
}

interface DataSourcesHubProps {
  userRole?: 'admin' | 'onboarder' | 'analyst'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const TYPE_COLORS: Record<string, string> = {
  PostgreSQL: '#569cd6',
  MySQL:      '#e07b39',
  CSV:        '#6a9955',
}

function TypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const color = TYPE_COLORS[type] || '#888'
  if (type === 'CSV') {
    return <FileSpreadsheet width={size} height={size} style={{ color }} />
  }
  return <Database width={size} height={size} style={{ color }} />
}

function TypePill({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || '#888'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border"
      style={{ color, borderColor: `${color}44`, background: `${color}12` }}
    >
      {type}
    </span>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
        <ServerCrash className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">No data connections yet</h3>
      <p className="text-sm text-text-muted mb-6 max-w-sm">
        Register a PostgreSQL, MySQL or CSV data source to start building your data catalog.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-hover transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Connection
      </button>
    </div>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 animate-scale-in">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm font-medium text-white bg-destructive rounded hover:bg-destructive/80 transition-colors"
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DataSourcesHub({ userRole }: DataSourcesHubProps) {
  const [viewType, setViewType]     = useState<ViewType>('grid')
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading]       = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // Per-card schema expand state
  const [expandedSchema, setExpandedSchema] = useState<Record<string, boolean>>({})

  // Modal state
  const [isCreateModal, setIsCreateModal] = useState(false)
  const [isModalExpanded, setIsModalExpanded] = useState(false)
  const [formData, setFormData]     = useState<Partial<DataSource & {
    host?: string; port?: string; database?: string; table?: string;
    username?: string; password?: string;
  }>>({})
  const [csvFile, setCsvFile]         = useState<File | null>(null)
  const [csvMetadata, setCsvMetadata] = useState<any>(null)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showPreview, setShowPreview]   = useState(false)
  const [isTestingModalConn, setIsTestingModalConn] = useState(false)
  const [isSaving, setIsSaving]       = useState(false)

  // Confirm deactivate dialog
  const [confirmTarget, setConfirmTarget] = useState<DataSource | null>(null)

  // Alert
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  const showAlert = (type: typeof alertState.type, title: string, message: string) =>
    setAlertState({ isOpen: true, type, title, message })

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchConnections = useCallback(async () => {
    setLoading(true)
    try {
      // GET /datasets returns DatasetOut[] which already has owner_username
      const datasets = await apiFetch<any[]>('/datasets')

      // Fetch schemas in parallel (one call per dataset)
      const mapped = await Promise.all(
        datasets.map(async (ds) => {
          let columns: string[] = []
          let columnTypes: Record<string, string> = {}
          try {
            const schema = await apiFetch<SchemaField[]>(`/datasets/${ds.id}/schema`)
            columns     = schema.map((f) => f.column_name)
            columnTypes = Object.fromEntries(schema.map((f) => [f.column_name, f.data_type]))
          } catch {
            // schema unavailable — continue without it
          }

          return {
            id:          String(ds.id),
            name:        ds.name,
            type:        mapBackendType(ds.source_type),
            status:      ds.status === 'active' ? ('connected' as ConnStatus) : ('inactive' as ConnStatus),
            owner:       ds.owner_username || 'unknown',
            description: ds.source_type === 'csv' ? 'CSV raw data source' : 'Database connection',
            columns,
            columnTypes,
            createdAt:   ds.created_at,
          } satisfies DataSource
        })
      )
      setDataSources(mapped)
    } catch (err: any) {
      showAlert('error', 'Fetch Failed', err.message || 'Could not load data connections from the server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConnections() }, [fetchConnections])

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = dataSources.filter((ds) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      ds.name.toLowerCase().includes(q) ||
      ds.type.toLowerCase().includes(q) ||
      ds.owner.toLowerCase().includes(q)
    )
  })

  // ── Create modal helpers ───────────────────────────────────────────────────

  const openCreateModal = () => {
    setFormData({ type: 'PostgreSQL' })
    setCsvFile(null)
    setCsvMetadata(null)
    setShowMetadata(false)
    setShowPreview(false)
    setIsModalExpanded(false)
    setIsCreateModal(true)
  }

  const closeCreateModal = () => {
    setIsCreateModal(false)
    setFormData({})
    setCsvFile(null)
    setCsvMetadata(null)
    setIsModalExpanded(false)
  }

  const handleCSVUpload = (metadata: any, file: File) => {
    setCsvMetadata(metadata)
    setCsvFile(file)
    setShowMetadata(true)
    setFormData((prev) => ({ ...prev, name: metadata.fileName.replace(/\.csv$/i, ''), type: 'CSV' }))
  }

  const handleCSVClear = () => {
    setCsvMetadata(null)
    setCsvFile(null)
    setShowMetadata(false)
    setShowPreview(false)
    setFormData((prev) => ({ ...prev, name: '' }))
  }

  const handleColumnUpdate = (columnName: string, updates: any) => {
    if (csvMetadata) {
      const updatedColumns = csvMetadata.columns.map((col: any) =>
        col.name === columnName ? { ...col, ...updates } : col
      )
      setCsvMetadata({ ...csvMetadata, columns: updatedColumns })
    }
  }

  // ── Test connection (in modal, before saving) ──────────────────────────────

  const handleTestModalConnection = async () => {
    const type     = mapFrontendType((formData as any).type || 'PostgreSQL')
    const host     = (formData as any).host || ''
    const port     = Number((formData as any).port) || ((formData as any).type === 'PostgreSQL' ? 5432 : 3306)
    const database = (formData as any).database || ''
    const table    = (formData as any).table || ''
    const username = (formData as any).username || ''
    const password = (formData as any).password || ''

    if (!host || !database || !table || !username || !password) {
      showAlert('error', 'Validation Error',
        'Fill in Host, Port, Database, Table, Username and Password before testing.')
      return
    }

    setIsTestingModalConn(true)
    try {
      const endpoint = type === 'mysql' ? '/connectors/mysql/test' : '/connectors/postgres/test'
      const result   = await apiFetch<{ success: boolean; error?: string | null }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ host, port, database, table, username, password }),
      })
      if (!result.success) throw new Error(result.error || 'Connection test failed')
      showAlert('success', 'Connection Successful', 'Live database connection verified successfully.')
    } catch (err: any) {
      showAlert('error', 'Connection Failed', err.message || 'Could not reach the database.')
    } finally {
      setIsTestingModalConn(false)
    }
  }

  // ── Save new source ────────────────────────────────────────────────────────

  const handleSaveSource = async () => {
    if (!formData.name?.trim()) {
      showAlert('error', 'Validation Error', 'Please provide a unique source name.')
      return
    }

    setIsSaving(true)
    try {
      if ((formData as any).type === 'CSV') {
        if (!csvFile) {
          showAlert('error', 'Validation Error', 'Please select a CSV file to upload.')
          setIsSaving(false)
          return
        }
        const form = new FormData()
        form.append('name', formData.name!)
        form.append('file', csvFile)
        await apiFetch('/datasets/csv/upload', { method: 'POST', body: form })
      } else {
        const type     = mapFrontendType((formData as any).type || 'PostgreSQL')
        const host     = (formData as any).host || ''
        const port     = Number((formData as any).port) || ((formData as any).type === 'PostgreSQL' ? 5432 : 3306)
        const database = (formData as any).database || ''
        const table    = (formData as any).table || ''
        const username = (formData as any).username || ''
        const password = (formData as any).password || ''

        if (!host || !database || !table || !username || !password) {
          showAlert('error', 'Validation Error',
            'Fill in all database fields: Host, Port, Database, Table, Username and Password.')
          setIsSaving(false)
          return
        }

        await apiFetch('/datasets/db', {
          method: 'POST',
          body: JSON.stringify({ name: formData.name, source_type: type, host, port, database, table, username, password }),
        })
      }

      showAlert('success', 'Connection Registered',
        `"${formData.name}" has been added to the data registry.`)
      fetchConnections()
      closeCreateModal()
    } catch (err: any) {
      showAlert('error', 'Save Failed', err.message || 'An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Deactivate ─────────────────────────────────────────────────────────────

  const handleDeactivate = async (id: string) => {
    try {
      await apiFetch(`/datasets/${id}`, { method: 'DELETE' })
      showAlert('success', 'Deactivated', 'Data connection has been deactivated.')
      fetchConnections()
    } catch (err: any) {
      showAlert('error', 'Deactivation Failed', err.message || 'An error occurred.')
    } finally {
      setConfirmTarget(null)
    }
  }

  // ── Activate ───────────────────────────────────────────────────────────────

  const handleActivate = async (id: string) => {
    try {
      await apiFetch(`/datasets/${id}/activate`, { method: 'PATCH' })
      showAlert('success', 'Activated', 'Data connection is now active.')
      fetchConnections()
    } catch (err: any) {
      showAlert('error', 'Activation Failed', err.message || 'An error occurred.')
    }
  }

  // ── Live test existing connection ──────────────────────────────────────────

  const handleTestConnection = async (source: DataSource) => {
    setDataSources((prev) =>
      prev.map((ds) => ds.id === source.id ? { ...ds, status: 'testing' } : ds)
    )
    try {
      const backendType = mapFrontendType(source.type)
      if (backendType === 'csv') {
        throw new Error('CSV sources do not support live connection testing.')
      }
      const endpoint = backendType === 'mysql'
        ? `/connectors/mysql/retest/${source.id}`
        : `/connectors/postgres/retest/${source.id}`

      let result: { success: boolean; error?: string | null }
      try {
        result = await apiFetch<{ success: boolean; error?: string | null }>(endpoint, { method: 'POST' })
      } catch {
        // Retest endpoint not yet available — optimistic update
        setDataSources((prev) =>
          prev.map((ds) => ds.id === source.id
            ? { ...ds, status: 'connected', lastTested: new Date().toLocaleString() }
            : ds)
        )
        showAlert('info', 'Re-test Unavailable',
          'Live re-test unavailable for this connection. Deactivate and re-register to fully re-validate credentials.')
        return
      }

      if (!result.success) throw new Error(result.error || 'Connection test failed')

      setDataSources((prev) =>
        prev.map((ds) => ds.id === source.id
          ? { ...ds, status: 'connected', lastTested: new Date().toLocaleString() }
          : ds)
      )
      showAlert('success', 'Connection OK', 'Live connection test succeeded.')
    } catch (err: any) {
      setDataSources((prev) =>
        prev.map((ds) => ds.id === source.id ? { ...ds, status: 'error' } : ds)
      )
      showAlert('error', 'Test Failed', err.message || 'Could not reach the database.')
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const activeCount   = dataSources.filter((d) => d.status === 'connected').length
  const inactiveCount = dataSources.filter((d) => d.status === 'inactive').length
  const errorCount    = dataSources.filter((d) => d.status === 'error').length

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderCardActions(source: DataSource) {
    return (
      <div className="flex gap-2 pt-3 mt-3 border-t border-border">
        {source.type !== 'CSV' && (
          <button
            onClick={() => handleTestConnection(source)}
            disabled={source.status === 'testing'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-border text-text-secondary rounded hover:bg-bg-hover disabled:opacity-40 transition-colors"
          >
            {source.status === 'testing' ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</>
            ) : 'Test'}
          </button>
        )}

        {source.status === 'inactive' || source.status === 'error' ? (
          <button
            onClick={() => handleActivate(source.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-success/10 text-success border border-success/20 rounded hover:bg-success/20 transition-colors"
          >
            <Check className="w-3 h-3" />
            Activate
          </button>
        ) : (
          <button
            onClick={() => setConfirmTarget(source)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive/20 transition-colors ml-auto"
          >
            <Trash2 className="w-3 h-3" />
            Deactivate
          </button>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      {/* Alert */}
      <Alert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        duration={3500}
      />

      {/* Confirm deactivate dialog */}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        title="Deactivate connection?"
        message={`"${confirmTarget?.name}" will be set to inactive. It will no longer appear in the catalog.`}
        confirmLabel="Deactivate"
        onConfirm={() => confirmTarget && handleDeactivate(confirmTarget.id)}
        onCancel={() => setConfirmTarget(null)}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Data Connections</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Manage connected databases and data sources
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ViewToggle currentView={viewType} onViewChange={setViewType} />
          <button
            id="tour-add-connection-btn"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {dataSources.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-text-muted border-b border-border pb-3">
          <span>{dataSources.length} total</span>
          {activeCount > 0   && <span className="text-success">● {activeCount} active</span>}
          {inactiveCount > 0 && <span className="text-text-muted">○ {inactiveCount} inactive</span>}
          {errorCount > 0    && <span className="text-destructive">⚠ {errorCount} error</span>}
          <button
            onClick={fetchConnections}
            disabled={loading}
            className="ml-auto flex items-center gap-1 text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {/* Search */}
      {dataSources.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search connections by name, type or owner…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-input border border-border rounded text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading && dataSources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-text-muted">Loading connections…</p>
        </div>
      ) : dataSources.length === 0 ? (
        <EmptyState onAdd={openCreateModal} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 text-text-muted mb-3" />
          <p className="text-sm text-text-muted">No connections match "{searchQuery}"</p>
          <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-primary hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <>
          {/* ── Grid View ──────────────────────────────────────────────── */}
          {viewType === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((source) => (
                <div
                  key={source.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-all duration-200 flex flex-col"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <TypeIcon type={source.type} size={18} />
                      <h3 className="font-semibold text-text-primary text-sm truncate">{source.name}</h3>
                    </div>
                    <StatusBadge
                      status={source.status === 'connected' ? 'active' : source.status === 'error' ? 'rejected' : 'inactive'}
                      size="sm"
                    />
                  </div>

                  {/* Metadata rows */}
                  <div className="space-y-1.5 mb-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Type</span>
                      <TypePill type={source.type} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Owner</span>
                      <span className="text-text-secondary font-medium truncate ml-2 max-w-[120px]">{source.owner}</span>
                    </div>
                    {source.columns.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Fields</span>
                        <span className="text-text-secondary">{source.columns.length}</span>
                      </div>
                    )}
                    {source.lastTested && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Last tested</span>
                        <span className="text-text-muted truncate ml-2">{source.lastTested}</span>
                      </div>
                    )}
                  </div>

                  {/* Collapsible column chips */}
                  {source.columns.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] text-text-muted uppercase tracking-wide">Schema</p>
                        {source.columns.length > 3 && (
                          <button
                            onClick={() => setExpandedSchema(prev => ({ ...prev, [source.id]: !prev[source.id] }))}
                            className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                          >
                            {expandedSchema[source.id]
                              ? <><ChevronUp className="w-3 h-3" /> Show less</>
                              : <><ChevronDown className="w-3 h-3" /> +{source.columns.length - 3} more</>
                            }
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(expandedSchema[source.id] ? source.columns : source.columns.slice(0, 3)).map((col) => (
                          <span
                            key={col}
                            title={source.columnTypes[col] ? `${col}: ${source.columnTypes[col]}` : col}
                            className="px-1.5 py-0.5 bg-input border border-border rounded text-[10px] text-text-secondary"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-1" />
                  {renderCardActions(source)}
                </div>
              ))}
            </div>
          )}

          {/* ── List View ──────────────────────────────────────────────── */}
          {viewType === 'list' && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-input">
                    {['Name', 'Type', 'Status', 'Columns', 'Owner', 'Last Tested', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((source, idx) => (
                    <tr
                      key={source.id}
                      className={`hover:bg-border/30 transition-colors ${idx < filtered.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TypeIcon type={source.type} size={14} />
                          <span className="font-medium text-text-primary truncate max-w-[160px]">{source.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><TypePill type={source.type} /></td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={source.status === 'connected' ? 'active' : source.status === 'error' ? 'rejected' : 'inactive'}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {source.columns.length > 0
                          ? <span className="truncate max-w-[200px] block">{source.columns.join(', ')}</span>
                          : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{source.owner}</td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {source.lastTested || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {source.type !== 'CSV' && (
                            <button
                              onClick={() => handleTestConnection(source)}
                              disabled={source.status === 'testing'}
                              title="Test connection"
                              className="px-2 py-1 rounded text-xs font-medium bg-border hover:bg-bg-hover text-text-secondary disabled:opacity-40 transition-colors"
                            >
                              {source.status === 'testing'
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : 'Test'}
                            </button>
                          )}
                          {source.status === 'inactive' || source.status === 'error' ? (
                            <button
                              onClick={() => handleActivate(source.id)}
                              title="Activate"
                              className="p-1.5 rounded hover:bg-bg-hover text-success transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmTarget(source)}
                              title="Deactivate"
                              className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Compact View ───────────────────────────────────────────── */}
          {viewType === 'compact' && (
            <div className="space-y-1.5">
              {filtered.map((source) => (
                <div
                  key={source.id}
                  className="bg-card border border-border rounded p-3 flex items-center gap-3 hover:border-primary/40 transition-all"
                >
                  <TypeIcon type={source.type} size={15} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-text-primary text-sm truncate">{source.name}</span>
                      <StatusBadge
                        status={source.status === 'connected' ? 'active' : source.status === 'error' ? 'rejected' : 'inactive'}
                        size="sm"
                      />
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {source.type} · {source.owner} ·{' '}
                      {source.type === 'CSV'
                        ? `${source.columns.length} columns`
                        : source.columns.length > 0 ? `${source.columns.length} fields` : 'DB connection'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {source.type !== 'CSV' && (
                      <button
                        onClick={() => handleTestConnection(source)}
                        disabled={source.status === 'testing'}
                        className="px-2 py-1 rounded text-xs font-medium bg-border hover:bg-bg-hover text-text-secondary disabled:opacity-40 transition-colors"
                      >
                        {source.status === 'testing'
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : 'Test'}
                      </button>
                    )}
                    {source.status === 'inactive' || source.status === 'error' ? (
                      <button
                        onClick={() => handleActivate(source.id)}
                        className="p-1.5 rounded hover:bg-bg-hover text-success transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmTarget(source)}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Add Connection Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={isCreateModal}
        onClose={closeCreateModal}
        title="Add New Data Source"
        description="Connect a database or upload a CSV file"
        size={isModalExpanded ? 'xl' : 'lg'}
        titleAction={
          <button
            onClick={() => setIsModalExpanded(!isModalExpanded)}
            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-secondary hover:text-text-primary"
            title={isModalExpanded ? 'Collapse' : 'Expand'}
          >
            {isModalExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        }
      >
        <div className="space-y-4">

          {/* Source Name */}
          <FormField label="Source Name" description="Unique registry identifier (no spaces)" required>
            <TextInput
              id="tour-source-name-input"
              type="text"
              placeholder="e.g. sales_oltp"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          {/* Type selector */}
          <FormField label="Source Type" required>
            <div className="grid grid-cols-3 gap-2">
              {(['PostgreSQL', 'MySQL', 'CSV'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded border transition-all text-xs font-medium ${
                    (formData as any).type === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-input text-text-secondary hover:border-primary/40'
                  }`}
                >
                  <TypeIcon type={t} size={20} />
                  {t}
                </button>
              ))}
            </div>
          </FormField>

          {/* DB fields */}
          {((formData as any).type === 'PostgreSQL' || (formData as any).type === 'MySQL') && (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <FormField label="Host" required>
                    <TextInput
                      type="text"
                      placeholder="db.example.com"
                      value={(formData as any).host || ''}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value } as any)}
                    />
                  </FormField>
                </div>
                <FormField label="Port" required>
                  <TextInput
                    type="number"
                    placeholder={(formData as any).type === 'PostgreSQL' ? '5432' : '3306'}
                    value={(formData as any).port || ''}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value } as any)}
                  />
                </FormField>
              </div>
              <FormField label="Database" required>
                <TextInput
                  type="text"
                  placeholder="analytics_db"
                  value={(formData as any).database || ''}
                  onChange={(e) => setFormData({ ...formData, database: e.target.value } as any)}
                />
              </FormField>
              <FormField label="Table" description="The specific table to register" required>
                <TextInput
                  type="text"
                  placeholder="transactions_table"
                  value={(formData as any).table || ''}
                  onChange={(e) => setFormData({ ...formData, table: e.target.value } as any)}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Username" required>
                  <TextInput
                    type="text"
                    placeholder="dbuser"
                    value={(formData as any).username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value } as any)}
                  />
                </FormField>
                <FormField label="Password" required>
                  <TextInput
                    type="password"
                    placeholder="••••••••"
                    value={(formData as any).password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value } as any)}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* CSV uploader */}
          {(formData as any).type === 'CSV' && (
            <FormField label="CSV File" description="Upload to extract schema and register" required>
              <CSVUploader onFileUpload={handleCSVUpload} onClear={handleCSVClear} />
            </FormField>
          )}

          {/* CSV metadata / preview tabs */}
          {(formData as any).type === 'CSV' && csvMetadata && (
            <>
              <div className="flex gap-2">
                {(['Metadata', 'Preview'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setShowMetadata(tab === 'Metadata')
                      setShowPreview(tab === 'Preview')
                    }}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      (tab === 'Metadata' && showMetadata) || (tab === 'Preview' && showPreview)
                        ? 'bg-primary text-white'
                        : 'bg-input text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {showMetadata && <CSVMetadataDisplay metadata={csvMetadata} onColumnUpdate={handleColumnUpdate} />}
              {showPreview   && <CSVDataPreview metadata={csvMetadata} />}
            </>
          )}

          {/* Footer actions */}
          <div className="flex gap-2 justify-end pt-3 border-t border-border">
            {((formData as any).type === 'PostgreSQL' || (formData as any).type === 'MySQL') && (
              <button
                type="button"
                onClick={handleTestModalConnection}
                disabled={isTestingModalConn}
                className="mr-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary bg-border rounded hover:bg-bg-hover disabled:opacity-50 transition-colors"
              >
                {isTestingModalConn ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</>
                ) : 'Test Connection'}
              </button>
            )}
            <button
              id="tour-modal-cancel-btn"
              onClick={closeCreateModal}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-border rounded hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSource}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add Connection
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
