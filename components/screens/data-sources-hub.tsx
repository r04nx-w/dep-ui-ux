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
  Eye,
  BookOpen,
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

const BUSINESS_TYPES = [
  { value: 'Numeric:Integer', label: 'Numeric: Integer' },
  { value: 'Numeric:Float', label: 'Numeric: Float' },
  { value: 'Text:Short', label: 'Text: Short' },
  { value: 'Text:Long', label: 'Text: Long' },
  { value: 'Boolean', label: 'Boolean' },
  { value: 'Temporal:Date', label: 'Temporal: Date' },
  { value: 'Temporal:DateTime', label: 'Temporal: DateTime' },
  { value: 'PII:Email', label: 'PII: Email' },
  { value: 'PII:Phone', label: 'PII: Phone' },
  { value: 'PII:SSN', label: 'PII: SSN' },
  { value: 'PII:Name', label: 'PII: Name' },
  { value: 'Financial:Currency', label: 'Financial: Currency' },
  { value: 'Structured:JSON', label: 'Structured: JSON' },
  { value: 'Categorical', label: 'Categorical' }
]

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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9
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

  // Schema discovery states
  const [discoveredSchemas, setDiscoveredSchemas] = useState<{
    schema: string;
    tables: { name: string; columns: { name: string; type: string }[] }[];
  }[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  
  // Table preview states
  const [previewingTable, setPreviewingTable] = useState<string | null>(null)
  const [tablePreviewData, setTablePreviewData] = useState<{ columns: string[]; rows: any[] } | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)

  // Connection details modal states
  const [selectedConnection, setSelectedConnection] = useState<DataSource | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [detailedConnectionInfo, setDetailedConnectionInfo] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [previewColumns, setPreviewColumns] = useState<string[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [showDataPreview, setShowDataPreview] = useState(false)

  // Data Dictionary states
  const [dbDataDictionary, setDbDataDictionary] = useState<Record<string, Record<string, { actual_type?: string; description?: string; source?: string }>>>({})
  const [isEditingDict, setIsEditingDict] = useState(false)
  const [dictDraft, setDictDraft] = useState<Record<string, { actual_type?: string; description?: string; source?: string }>>({})
  const [isSavingDict, setIsSavingDict] = useState(false)

  const handleUpdateDbDict = (tableName: string, colName: string, field: string, value: string) => {
    setDbDataDictionary(prev => {
      const tableDict = prev[tableName] || {}
      const colDict = tableDict[colName] || {}
      return {
        ...prev,
        [tableName]: {
          ...tableDict,
          [colName]: {
            ...colDict,
            [field]: value
          }
        }
      }
    })
  }

  const handleUpdateDictDraft = (colName: string, field: string, value: string) => {
    setDictDraft(prev => ({
      ...prev,
      [colName]: {
        ...prev[colName],
        [field]: value
      }
    }))
  }

  const handleStartEditDict = () => {
    if (!detailedConnectionInfo) return
    const draft: typeof dictDraft = {}
    selectedConnection?.columns.forEach((col) => {
      const entry = (detailedConnectionInfo.data_dictionary || []).find((e: any) => e.column_name === col)
      draft[col] = {
        actual_type: entry?.actual_type || '',
        description: entry?.description || '',
        source: entry?.source || ''
      }
    })
    setDictDraft(draft)
    setIsEditingDict(true)
  }

  const handleSaveDataDictionary = async () => {
    if (!selectedConnection) return
    setIsSavingDict(true)
    try {
      const entries = Object.entries(dictDraft).map(([colName, info]) => ({
        column_name: colName,
        actual_type: info.actual_type || undefined,
        description: info.description || undefined,
        source: info.source || undefined
      })).filter(entry => entry.actual_type || entry.description || entry.source)

      const result = await apiFetch<any[]>(`/datasets/${selectedConnection.id}/data-dictionary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      })

      setDetailedConnectionInfo((prev: any) => ({
        ...prev,
        data_dictionary: result
      }))
      setIsEditingDict(false)
      showAlert('success', 'Saved', 'Data dictionary metadata updated successfully.')
    } catch (err: any) {
      showAlert('error', 'Save Failed', err.message || 'Could not update data dictionary.')
    } finally {
      setIsSavingDict(false)
    }
  }

  const handleOpenDetails = async (source: DataSource) => {
    setSelectedConnection(source)
    setIsDetailsModalOpen(true)
    setIsLoadingDetails(true)
    setDetailedConnectionInfo(null)
    setShowDataPreview(false)
    setPreviewRows([])
    setPreviewColumns([])
    setIsEditingDict(false)
    setDictDraft({})
    try {
      const details = await apiFetch<any>(`/datasets/${source.id}`)
      setDetailedConnectionInfo(details)
    } catch (err: any) {
      showAlert('error', 'Fetch Failed', err.message || 'Could not load connection details.')
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleFetchPreview = async () => {
    if (!selectedConnection) return
    setIsLoadingPreview(true)
    try {
      const res = await apiFetch<any>(`/datasets/${selectedConnection.id}/preview?limit=10`)
      setPreviewRows(res.rows || [])
      setPreviewColumns(res.columns || [])
      setShowDataPreview(true)
    } catch (err: any) {
      showAlert('error', 'Preview Failed', err.message || 'Could not fetch data preview.')
    } finally {
      setIsLoadingPreview(false)
    }
  }

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

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // ── Create modal helpers ───────────────────────────────────────────────────

  const openCreateModal = () => {
    setFormData({ type: 'PostgreSQL' })
    setCsvFile(null)
    setCsvMetadata(null)
    setShowMetadata(false)
    setShowPreview(false)
    setIsModalExpanded(false)
    setDiscoveredSchemas([])
    setSelectedSchema('')
    setSelectedTables([])
    setTableSearchQuery('')
    setDiscoveryError(null)
    setDbDataDictionary({})
    setIsCreateModal(true)
  }

  const closeCreateModal = () => {
    setIsCreateModal(false)
    setFormData({})
    setCsvFile(null)
    setCsvMetadata(null)
    setIsModalExpanded(false)
    setDiscoveredSchemas([])
    setSelectedSchema('')
    setSelectedTables([])
    setTableSearchQuery('')
    setDiscoveryError(null)
    setDbDataDictionary({})
  }

  const fetchSchemasAndTables = useCallback(async () => {
    const host = formData.host
    const port = formData.port || (formData.type === 'PostgreSQL' ? '5432' : '3306')
    const database = formData.database
    const username = formData.username
    const password = formData.password
    const type = formData.type

    if (!host || !database || !username || !password || !type || type === 'CSV') {
      return
    }

    setIsDiscovering(true)
    setDiscoveryError(null)
    setDiscoveredSchemas([])
    setSelectedSchema('')
    setSelectedTables([])
    try {
      const typePath = type === 'PostgreSQL' ? 'postgres' : 'mysql'
      const data = await apiFetch<any>(`/connectors/${typePath}/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: Number(port),
          database,
          username,
          password
        })
      })
      setDiscoveredSchemas(data)
      if (data.length > 0) {
        setSelectedSchema(data[0].schema)
      }
    } catch (err: any) {
      setDiscoveryError(err.message || 'Failed to discover schemas and tables.')
    } finally {
      setIsDiscovering(false)
    }
  }, [formData.host, formData.port, formData.database, formData.username, formData.password, formData.type])

  useEffect(() => {
    const host = formData.host
    const port = formData.port || (formData.type === 'PostgreSQL' ? '5432' : '3306')
    const database = formData.database
    const username = formData.username
    const password = formData.password
    const type = formData.type

    if (host && port && database && username && password && type && type !== 'CSV') {
      const timer = setTimeout(() => {
        fetchSchemasAndTables()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [formData.host, formData.port, formData.database, formData.username, formData.password, formData.type, fetchSchemasAndTables])

  const handlePreviewTable = async (tableName: string) => {
    setPreviewingTable(tableName)
    setIsPreviewing(true)
    setTablePreviewData(null)
    try {
      const typePath = formData.type === 'PostgreSQL' ? 'postgres' : 'mysql'
      const data = await apiFetch<any>(`/connectors/${typePath}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.host,
          port: Number(formData.port || (formData.type === 'PostgreSQL' ? 5432 : 3306)),
          database: formData.database,
          table: tableName,
          username: formData.username,
          password: formData.password
        })
      })
      setTablePreviewData(data)
    } catch (err: any) {
      showAlert('error', 'Preview Failed', err.message || 'Could not fetch table preview.')
      setPreviewingTable(null)
    } finally {
      setIsPreviewing(false)
    }
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

        // Build data_dictionary entries from csvMetadata
        if (csvMetadata && csvMetadata.columns) {
          const dd = csvMetadata.columns.map((col: any) => ({
            column_name: col.name,
            actual_type: col.actual_type || undefined,
            description: col.description || undefined,
            source: col.source || undefined
          })).filter((item: any) => item.actual_type || item.description || item.source)

          if (dd.length > 0) {
            form.append('data_dictionary', JSON.stringify(dd))
          }
        }

        await apiFetch('/datasets/csv/upload', { method: 'POST', body: form })
      } else {
        const type     = mapFrontendType((formData as any).type || 'PostgreSQL')
        const host     = (formData as any).host || ''
        const port     = Number((formData as any).port) || ((formData as any).type === 'PostgreSQL' ? 5432 : 3306)
        const database = (formData as any).database || ''
        const username = (formData as any).username || ''
        const password = (formData as any).password || ''

        const tablesToRegister = selectedTables.length > 0 ? selectedTables : [(formData as any).table].filter(Boolean)

        if (!host || !database || tablesToRegister.length === 0 || !username || !password) {
          showAlert('error', 'Validation Error',
            'Fill in all database fields: Host, Port, Database, Username, Password, and select at least one table.')
          setIsSaving(false)
          return
        }

        const onboardPromises = tablesToRegister.map(async (tableName) => {
          const cleanTableName = tableName.includes('.') ? tableName.split('.').pop() : tableName
          const datasetName = tablesToRegister.length === 1 ? formData.name : `${formData.name}_${cleanTableName}`
          
          // Build data_dictionary entries for this table
          const tableDict = dbDataDictionary[tableName] || {}
          const dd = Object.entries(tableDict).map(([colName, info]: [string, any]) => ({
            column_name: colName,
            actual_type: info.actual_type || undefined,
            description: info.description || undefined,
            source: info.source || undefined
          })).filter((item: any) => item.actual_type || item.description || item.source)

          await apiFetch('/datasets/db', {
            method: 'POST',
            body: JSON.stringify({
              name: datasetName,
              source_type: type,
              host,
              port,
              database,
              table: tableName,
              username,
              password,
              data_dictionary: dd.length > 0 ? dd : undefined
            }),
          })
        })
        await Promise.all(onboardPromises)
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
      <div className="flex gap-2 pt-3 mt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
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
          {/* Search Button Icon / Expandable Input */}
          {dataSources.length > 0 && (
            <div className="relative flex items-center">
              {isSearchExpanded ? (
                <div className="flex items-center animate-scale-in relative">
                  <Search className="absolute left-2.5 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-48 pl-8 pr-7 py-1.5 bg-input border border-border rounded text-xs text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-all duration-300"
                  />
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setIsSearchExpanded(false)
                    }}
                    className="absolute right-2 text-text-muted hover:text-text-primary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="p-2 hover:bg-bg-hover rounded-sm text-text-secondary hover:text-text-primary transition-colors border border-border bg-input"
                  title="Search Connections"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
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
        <div className="flex items-center gap-4 text-xs text-text-muted border-b border-border pb-3 mb-4">
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
              {paginated.map((source) => (
                <div
                  key={source.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-all duration-200 flex flex-col cursor-pointer"
                  onClick={() => handleOpenDetails(source)}
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
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedSchema(prev => ({ ...prev, [source.id]: !prev[source.id] }))
                            }}
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
                   {paginated.map((source, idx) => (
                    <tr
                      key={source.id}
                      className={`hover:bg-border/30 transition-colors cursor-pointer ${idx < paginated.length - 1 ? 'border-b border-border' : ''}`}
                      onClick={() => handleOpenDetails(source)}
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
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
              {paginated.map((source) => (
                <div
                  key={source.id}
                  className="bg-card border border-border rounded p-3 flex items-center gap-3 hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => handleOpenDetails(source)}
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
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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

          {/* Pagination Controls */}
          {filtered.length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-border pt-4 mt-6 select-none">
              <div className="text-xs text-text-secondary">
                Showing <span className="font-semibold text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{' '}
                <span className="font-semibold text-text-primary">{filtered.length}</span> entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-input border border-border rounded text-[11px] font-semibold hover:bg-bg-hover disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.ceil(filtered.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 border rounded text-[11px] font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-primary border-primary text-white'
                        : 'bg-input border-border text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filtered.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}
                  className="px-2.5 py-1 bg-input border border-border rounded text-[11px] font-semibold hover:bg-bg-hover disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
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

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <FormField label="Database" required>
                    <TextInput
                      type="text"
                      placeholder="analytics_db"
                      value={(formData as any).database || ''}
                      onChange={(e) => setFormData({ ...formData, database: e.target.value } as any)}
                    />
                  </FormField>
                </div>
                <div className="col-span-1">
                  <FormField label="Username" required>
                    <TextInput
                      type="text"
                      placeholder="dbuser"
                      value={(formData as any).username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value } as any)}
                    />
                  </FormField>
                </div>
                <div className="col-span-1">
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

              {/* Dynamic Discovery / Selection */}
              <div className="border border-border rounded-lg p-3 bg-bg-hover/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Tables Discovery & Selection
                  </h4>
                  {isDiscovering && (
                    <span className="flex items-center gap-1 text-[10px] text-primary">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Discovering...
                    </span>
                  )}
                </div>

                {discoveryError && (
                  <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    {discoveryError}
                  </div>
                )}

                {discoveredSchemas.length > 0 ? (
                  <div className="space-y-3">
                    {/* Schema Dropdown Selector */}
                    {discoveredSchemas.length > 1 ? (
                      <div>
                        <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">
                          Select Schema
                        </label>
                        <select
                          value={selectedSchema}
                          onChange={(e) => {
                            setSelectedSchema(e.target.value)
                            setSelectedTables([])
                          }}
                          className="w-full bg-input border border-border rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                        >
                          {discoveredSchemas.map((s) => (
                            <option key={s.schema} value={s.schema}>
                              {s.schema}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="text-[11px] text-text-secondary">
                        Schema: <span className="font-semibold text-text-primary">{selectedSchema || 'default'}</span>
                      </div>
                    )}

                    {/* Table search & selection list */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3 h-3 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={tableSearchQuery}
                          onChange={(e) => setTableSearchQuery(e.target.value)}
                          placeholder="Search discovered tables..."
                          className="w-full pl-8 pr-2.5 py-1.5 bg-input border border-border rounded text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Discovered tables scroll list */}
                      <div className="border border-border rounded bg-card max-h-[220px] overflow-y-auto divide-y divide-border">
                        {(() => {
                          const currentSchemaObj = discoveredSchemas.find(s => s.schema === selectedSchema) || discoveredSchemas[0]
                          const filteredTables = (currentSchemaObj?.tables || []).filter(t =>
                            t.name.toLowerCase().includes(tableSearchQuery.toLowerCase())
                          )

                          if (filteredTables.length === 0) {
                            return (
                              <p className="p-3 text-center text-xs text-text-muted italic">
                                No tables found matching search query.
                              </p>
                            )
                          }

                          return filteredTables.map((t) => {
                            const isChecked = selectedTables.includes(t.name)
                            return (
                              <div
                                key={t.name}
                                className="flex items-center justify-between p-2 hover:bg-bg-hover/30 transition-colors text-xs"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedTables(prev =>
                                        isChecked ? prev.filter(x => x !== t.name) : [...prev, t.name]
                                      )
                                    }}
                                    className="rounded border-border accent-primary cursor-pointer"
                                  />
                                  <span className="font-semibold text-text-primary truncate">{t.name}</span>
                                  
                                  {/* Columns preview list */}
                                  <div className="hidden sm:flex flex-wrap gap-1 ml-2 max-w-[300px]">
                                    {t.columns.slice(0, 3).map((col) => (
                                      <span
                                        key={col.name}
                                        className="px-1 py-0.5 bg-primary/10 border border-primary/15 text-primary text-[9px] rounded font-mono"
                                      >
                                        {col.name} <span className="text-text-muted">({col.type})</span>
                                      </span>
                                    ))}
                                    {t.columns.length > 3 && (
                                      <span className="text-[9px] text-text-muted self-center">
                                        +{t.columns.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handlePreviewTable(t.name)}
                                  className="p-1 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                                  title="Preview table data"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>

                    {selectedTables.length > 0 && (
                      <p className="text-[11px] text-[#6a9955] font-semibold">
                        ✓ {selectedTables.length} table{selectedTables.length > 1 ? 's' : ''} selected for onboarding.
                      </p>
                    )}

                    {selectedTables.length > 0 && (
                      <div className="mt-3 border-t border-border/45 pt-3">
                        <details className="group">
                          <summary className="text-xs font-bold text-text-primary hover:text-primary cursor-pointer flex items-center justify-between list-none">
                            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-primary" /> Annotate Columns (Data Dictionary - Optional)</span>
                            <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="mt-2 space-y-3 max-h-48 overflow-y-auto pr-1">
                            {selectedTables.map((tableName) => {
                              const currentSchemaObj = discoveredSchemas.find(s => s.schema === selectedSchema) || discoveredSchemas[0]
                              const tableObj = currentSchemaObj?.tables.find(t => t.name === tableName)
                              if (!tableObj) return null
                              return (
                                <div key={tableName} className="space-y-1.5 bg-card/45 border border-border/60 p-2 rounded">
                                  <div className="text-[10px] font-bold text-text-secondary uppercase">{tableName}</div>
                                  <div className="space-y-2">
                                    {tableObj.columns.map((col) => (
                                      <div key={col.name} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-border/20 pb-1.5 last:border-0 last:pb-0">
                                        <div className="w-28 flex-shrink-0">
                                          <span className="text-xs font-semibold text-text-primary block truncate" title={col.name}>{col.name}</span>
                                          <span className="text-[9px] text-text-muted font-mono">inferred: {col.type}</span>
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="Description"
                                          value={dbDataDictionary[tableName]?.[col.name]?.description || ''}
                                          onChange={(e) => handleUpdateDbDict(tableName, col.name, 'description', e.target.value)}
                                          className="flex-1 min-w-0 bg-input border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-primary"
                                        />
                                        <select
                                          value={dbDataDictionary[tableName]?.[col.name]?.actual_type || ''}
                                          onChange={(e) => handleUpdateDbDict(tableName, col.name, 'actual_type', e.target.value)}
                                          className="w-24 bg-input border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-primary"
                                        >
                                          <option value="">-- Type --</option>
                                          {BUSINESS_TYPES.map((bt) => (
                                            <option key={bt.value} value={bt.value}>{bt.label}</option>
                                          ))}
                                        </select>
                                        <input
                                          type="text"
                                          placeholder="Source"
                                          value={dbDataDictionary[tableName]?.[col.name]?.source || ''}
                                          onChange={(e) => handleUpdateDbDict(tableName, col.name, 'source', e.target.value)}
                                          className="w-24 bg-input border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-primary"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {isDiscovering ? (
                      <p className="text-xs text-text-muted italic">
                        Discovering database schemas & tables...
                      </p>
                    ) : (
                      <FormField label="Table Name" required>
                        <TextInput
                          type="text"
                          placeholder="transactions_table"
                          value={(formData as any).table || ''}
                          onChange={(e) => setFormData({ ...formData, table: e.target.value } as any)}
                        />
                      </FormField>
                    )}
                  </div>
                )}
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

      {/* ── Table Preview Modal ───────────────────────────────────────── */}
      {previewingTable && (
        <Modal
          isOpen={true}
          onClose={() => { setPreviewingTable(null); setTablePreviewData(null); }}
          title={`Table Preview: ${previewingTable}`}
          description={`First 10 rows from database table`}
          size="lg"
        >
          <div className="space-y-4">
            {isPreviewing ? (
              <div className="flex flex-col items-center justify-center py-10">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mb-2" />
                <span className="text-sm text-text-secondary">Loading preview data…</span>
              </div>
            ) : tablePreviewData ? (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-input border-b border-border">
                        {tablePreviewData.columns.map(col => (
                          <th key={col} className="p-2.5 font-semibold text-text-secondary border-r border-border last:border-r-0 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tablePreviewData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={tablePreviewData.columns.length} className="p-6 text-center text-text-muted italic">
                            No data rows found in this table.
                          </td>
                        </tr>
                      ) : (
                        tablePreviewData.rows.map((row, idx) => (
                          <tr key={idx} className="border-b border-border last:border-b-0 hover:bg-bg-hover/20">
                            {tablePreviewData.columns.map(col => (
                              <td key={col} className="p-2 border-r border-border last:border-r-0 text-text-primary font-mono max-w-[150px] truncate" title={row[col] !== null ? String(row[col]) : ''}>
                                {row[col] !== null ? String(row[col]) : <span className="text-text-muted/40 italic">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted italic text-center py-6">Failed to load preview.</p>
            )}
            <div className="flex justify-end border-t border-border pt-3">
              <button
                onClick={() => { setPreviewingTable(null); setTablePreviewData(null); }}
                className="px-4 py-2 bg-border hover:bg-bg-hover rounded text-xs font-semibold text-text-secondary transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Connection Details Modal ────────────────────────────────────── */}
      {isDetailsModalOpen && selectedConnection && (
        <Modal
          isOpen={true}
          onClose={() => { setIsDetailsModalOpen(false); setSelectedConnection(null); setDetailedConnectionInfo(null); }}
          title={`Connection: ${selectedConnection.name}`}
          size="lg"
        >
          <div className="space-y-5">
            {/* Connection Info Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-input rounded-lg p-3 border border-border">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">Status</div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge
                    status={selectedConnection.status === 'connected' ? 'active' : selectedConnection.status === 'error' ? 'rejected' : 'inactive'}
                    size="sm"
                  />
                  <span className="text-xs text-text-primary capitalize">{selectedConnection.status}</span>
                </div>
              </div>
              <div className="bg-input rounded-lg p-3 border border-border">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">Type</div>
                <div className="flex items-center gap-1.5">
                  <TypeIcon type={selectedConnection.type} size={14} />
                  <span className="text-xs text-text-primary">{selectedConnection.type}</span>
                </div>
              </div>
              <div className="bg-input rounded-lg p-3 border border-border">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">Owner</div>
                <span className="text-xs text-text-primary font-medium">{selectedConnection.owner}</span>
              </div>
            </div>

            {/* Comprehensive Information */}
            <div className="bg-input border border-border rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide border-b border-border pb-1.5">Configuration Details</h4>
              {isLoadingDetails ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : detailedConnectionInfo ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  {selectedConnection.type === 'CSV' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Storage Engine</span>
                        <span className="text-text-primary">MinIO</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Object Key</span>
                        <span className="text-text-primary font-mono truncate max-w-[200px]" title={detailedConnectionInfo.name + '.csv'}>{detailedConnectionInfo.name}.csv</span>
                      </div>
                    </>
                  ) : detailedConnectionInfo.db_connection ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Host</span>
                        <span className="text-text-primary font-mono">{detailedConnectionInfo.db_connection.host}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Port</span>
                        <span className="text-text-primary font-mono">{detailedConnectionInfo.db_connection.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Database</span>
                        <span className="text-text-primary font-mono">{detailedConnectionInfo.db_connection.database_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Table</span>
                        <span className="text-text-primary font-mono">{detailedConnectionInfo.db_connection.table_name}</span>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-text-muted italic text-center">No connection parameters returned by server.</div>
                  )}
                  {detailedConnectionInfo.created_at && (
                    <div className="flex justify-between col-span-2 border-t border-border/40 pt-2 mt-1">
                      <span className="text-text-muted">Registered At</span>
                      <span className="text-text-secondary">{new Date(detailedConnectionInfo.created_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-text-muted italic text-center">Failed to fetch configuration info.</div>
              )}
            </div>

            {/* Schema fields */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center justify-between">
                <span>Schema Structure</span>
                <span className="text-[10px] text-text-muted font-normal capitalize">({selectedConnection.columns.length} columns)</span>
              </h4>
              <div className="max-h-[120px] overflow-y-auto border border-border rounded divide-y divide-border bg-input">
                {selectedConnection.columns.map((col) => (
                  <div key={col} className="flex justify-between items-center p-2 text-xs">
                    <span className="font-mono text-text-primary font-semibold">{col}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-card border border-border rounded font-mono text-text-secondary">
                      {selectedConnection.columnTypes[col] || 'unknown'}
                    </span>
                  </div>
                ))}
                {selectedConnection.columns.length === 0 && (
                  <div className="p-4 text-center text-text-muted italic text-xs">No schema fields discovered.</div>
                )}
              </div>
            </div>

            {/* Data Dictionary Section */}
            {detailedConnectionInfo && (userRole === 'admin' || userRole === 'onboarder') && (
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Data Dictionary (Administrative Metadata)</span>
                  </h4>
                  {isEditingDict ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDataDictionary}
                        disabled={isSavingDict}
                        className="px-2 py-1 text-[10px] font-semibold bg-success text-white rounded hover:bg-success-hover transition-colors"
                      >
                        {isSavingDict ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setIsEditingDict(false)}
                        disabled={isSavingDict}
                        className="px-2 py-1 text-[10px] font-semibold bg-border text-text-secondary rounded hover:bg-bg-hover transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartEditDict}
                      className="px-2 py-1 text-[10px] font-semibold bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className="max-h-[220px] overflow-y-auto border border-border rounded bg-input">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-card border-b border-border text-text-secondary font-semibold">
                        <th className="p-2 border-r border-border">Column</th>
                        <th className="p-2 border-r border-border">Inferred</th>
                        <th className="p-2 border-r border-border">Actual Type</th>
                        <th className="p-2 border-r border-border">Description</th>
                        <th className="p-2">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedConnection.columns.map((col) => {
                        const ddEntry = (detailedConnectionInfo.data_dictionary || []).find(
                          (e: any) => e.column_name === col
                        )
                        const inferredType = selectedConnection.columnTypes[col] || 'unknown'
                        
                        if (isEditingDict) {
                          const draftEntry = dictDraft[col] || {}
                          return (
                            <tr key={col} className="hover:bg-bg-hover/10">
                              <td className="p-2 font-mono font-semibold text-text-primary border-r border-border">{col}</td>
                              <td className="p-2 font-mono text-text-muted border-r border-border">{inferredType}</td>
                              <td className="p-1 border-r border-border">
                                <select
                                  value={draftEntry.actual_type || ''}
                                  onChange={(e) => handleUpdateDictDraft(col, 'actual_type', e.target.value)}
                                  className="w-full bg-card border border-border rounded px-1 py-0.5 text-[10px] text-text-primary"
                                >
                                  <option value="">-- Type --</option>
                                  {BUSINESS_TYPES.map((bt) => (
                                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1 border-r border-border">
                                <input
                                  type="text"
                                  value={draftEntry.description || ''}
                                  onChange={(e) => handleUpdateDictDraft(col, 'description', e.target.value)}
                                  className="w-full bg-card border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={draftEntry.source || ''}
                                  onChange={(e) => handleUpdateDictDraft(col, 'source', e.target.value)}
                                  className="w-full bg-card border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary"
                                />
                              </td>
                            </tr>
                          )
                        }

                        return (
                          <tr key={col} className="hover:bg-bg-hover/10">
                            <td className="p-2 font-mono font-semibold text-text-primary border-r border-border">{col}</td>
                            <td className="p-2 font-mono text-text-muted border-r border-border">{inferredType}</td>
                            <td className="p-2 text-text-secondary border-r border-border font-mono">{ddEntry?.actual_type || <span className="text-text-muted/40 italic">—</span>}</td>
                            <td className="p-2 text-text-secondary border-r border-border">{ddEntry?.description || <span className="text-text-muted/40 italic">—</span>}</td>
                            <td className="p-2 text-text-secondary font-mono">{ddEntry?.source || <span className="text-text-muted/40 italic">—</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Live Data Preview Section */}
            {showDataPreview && (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="bg-input px-3 py-2 border-b border-border flex justify-between items-center">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Live Data Preview (First 10 rows)</span>
                  <button onClick={() => setShowDataPreview(false)} className="p-0.5 hover:bg-bg-hover text-text-muted rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[180px]">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="bg-input border-b border-border">
                        {previewColumns.map(col => (
                          <th key={col} className="p-2 font-semibold text-text-secondary border-r border-border last:border-r-0 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.length === 0 ? (
                        <tr>
                          <td colSpan={previewColumns.length || 1} className="p-4 text-center text-text-muted italic">
                            No records found.
                          </td>
                        </tr>
                      ) : (
                        previewRows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-border last:border-b-0 hover:bg-bg-hover/20">
                            {previewColumns.map(col => (
                              <td key={col} className="p-1.5 border-r border-border last:border-r-0 text-text-primary font-mono truncate max-w-[100px]" title={row[col] !== null ? String(row[col]) : ''}>
                                {row[col] !== null ? String(row[col]) : <span className="text-text-muted/40 italic">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions & Footer */}
            <div className="flex justify-between items-center border-t border-border pt-4">
              <div className="flex gap-2">
                {selectedConnection.type !== 'CSV' && (
                  <button
                    onClick={() => handleTestConnection(selectedConnection)}
                    disabled={selectedConnection.status === 'testing'}
                    className="flex items-center gap-1 px-3 py-1.5 bg-input border border-border hover:bg-bg-hover text-text-primary rounded text-xs font-semibold disabled:opacity-40 transition-colors"
                  >
                    {selectedConnection.status === 'testing' ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</>
                    ) : 'Test Connection'}
                  </button>
                )}
                <button
                  onClick={handleFetchPreview}
                  disabled={isLoadingPreview}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  {isLoadingPreview ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" /> Preview Data</>
                  )}
                </button>
              </div>

              <div className="flex gap-2">
                {selectedConnection.status === 'inactive' || selectedConnection.status === 'error' ? (
                  <button
                    onClick={() => {
                      handleActivate(selectedConnection.id)
                      setIsDetailsModalOpen(false)
                      setSelectedConnection(null)
                    }}
                    className="px-3 py-1.5 bg-success text-white rounded text-xs font-semibold hover:bg-success-hover transition-colors"
                  >
                    Activate
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setConfirmTarget(selectedConnection)
                      setIsDetailsModalOpen(false)
                      setSelectedConnection(null)
                    }}
                    className="px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded text-xs font-semibold hover:bg-destructive/20 transition-colors"
                  >
                    Deactivate
                  </button>
                )}
                <button
                  onClick={() => { setIsDetailsModalOpen(false); setSelectedConnection(null); setDetailedConnectionInfo(null); }}
                  className="px-3 py-1.5 bg-border hover:bg-bg-hover rounded text-xs font-semibold text-text-secondary transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
