'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Upload,
  Download,
  Lock,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { ViewToggle } from '@/components/ui/view-toggle'
import { StatusBadge } from '@/components/ui/status-badge'
import { CSVUploader } from '@/components/ui/csv-uploader'
import { CSVMetadataDisplay } from '@/components/ui/csv-metadata-display'
import { CSVDataPreview } from '@/components/ui/csv-data-preview'
import { apiFetch, uploadFileWithProgress } from '@/lib/api'
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

interface NestedField {
  id: string
  path: string
  type: string
  description: string
}

interface ColumnDictionary {
  logicalName?: string
  logicalType?: string
  description?: string
  allowedValues?: string
  unitOfMeasurement?: string
  isNullable?: boolean
  classification?: 'Public' | 'Internal' | 'Confidential' | 'PII' | 'PCI-DSS' | 'Sensitive'
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  foreignKeyRef?: string
  isUnique?: boolean
  defaultValue?: string
  formatPattern?: string
  nestedFields?: NestedField[]
}

type DatasetDictionary = Record<string, ColumnDictionary>

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

interface SearchableSelectProps {
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function SearchableSelect({ options, value, onChange, placeholder = 'Select option...' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  )

  const selectedOpt = options.find(opt => opt.value === value)

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary cursor-pointer flex justify-between items-center select-none min-h-[34px]"
      >
        <span>{selectedOpt ? selectedOpt.label : placeholder}</span>
        <span className="text-[10px] text-text-secondary">▼</span>
      </div>
      {isOpen && (
        <div className="absolute z-[99999] left-0 right-0 mt-1 bg-card border border-border rounded shadow-xl max-h-[200px] flex flex-col overflow-hidden animate-scale-in">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-input border-b border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none placeholder-text-muted"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 bg-card">
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-bg-hover transition-colors flex justify-between items-center ${
                  value === opt.value ? 'bg-primary/10 text-primary font-semibold' : 'text-text-primary'
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <span className="text-[10px]">✓</span>}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-center text-text-muted italic text-xs">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface SearchableMultiSelectProps {
  options: { label: string; value: string }[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

function SearchableMultiSelect({ options, values, onChange, placeholder = 'Select options...' }: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full bg-input border border-border rounded-sm px-3 py-1.5 text-xs text-text-primary cursor-pointer flex flex-wrap gap-1 items-center min-h-[34px] select-none pr-8"
      >
        {values.length === 0 ? (
          <span className="text-text-muted">{placeholder}</span>
        ) : (
          values.map(val => {
            const opt = options.find(o => o.value === val)
            return (
              <span
                key={val}
                className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded flex items-center gap-1 text-[10px] font-semibold"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleOption(val)
                }}
              >
                <span>{opt ? opt.label : val}</span>
                <span className="text-primary hover:text-destructive text-[8px]">✕</span>
              </span>
            )
          })
        )}
        <span className="absolute right-3 top-2.5 text-[10px] text-text-secondary">▼</span>
      </div>
      {isOpen && (
        <div className="absolute z-[99999] left-0 right-0 mt-1 bg-card border border-border rounded shadow-xl max-h-[200px] flex flex-col overflow-hidden animate-scale-in">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search options..."
            className="w-full bg-input border-b border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none placeholder-text-muted"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 bg-card">
            {filtered.map(opt => {
              const isSelected = values.includes(opt.value)
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`px-3 py-2 text-xs cursor-pointer hover:bg-bg-hover transition-colors flex justify-between items-center ${
                    isSelected ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <span className="text-[10px] text-primary">✓</span>}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="p-3 text-center text-text-muted italic text-xs">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  position?: 'top' | 'bottom'
}

function AutocompleteInput({ value, onChange, suggestions, placeholder = 'Search column...', position = 'bottom' }: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = suggestions.filter(sug => {
    if (!value) return true
    return sug.toLowerCase().includes(value.toLowerCase())
  })

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors font-mono"
      />
      {isOpen && filtered.length > 0 && (
        <div className={`absolute z-[99999] left-0 right-0 bg-card border border-border rounded shadow-xl max-h-[180px] overflow-y-auto animate-scale-in ${
          position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {filtered.map(sug => (
            <div
              key={sug}
              onClick={() => {
                onChange(sug)
                setIsOpen(false)
              }}
              className="px-3 py-2 text-xs cursor-pointer hover:bg-bg-hover transition-colors text-text-primary font-mono"
            >
              {sug}
            </div>
          ))}
        </div>
      )}
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

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
  const [detailsTab, setDetailsTab] = useState<'info' | 'dictionary'>('info')
  const [localSchemaFields, setLocalSchemaFields] = useState<any[]>([])
  const [editingColName, setEditingColName] = useState<string | null>(null)
  const [isColEditorOpen, setIsColEditorOpen] = useState(false)
  const [editingColData, setEditingColData] = useState<Partial<ColumnDictionary>>({})
  const [dictionarySearchQuery, setDictionarySearchQuery] = useState('')

  const handleOpenDetails = async (source: DataSource) => {
    setSelectedConnection(source)
    setIsDetailsModalOpen(true)
    setIsLoadingDetails(true)
    setDetailedConnectionInfo(null)
    setLocalSchemaFields([])
    setDetailsTab('info')
    setShowDataPreview(false)
    setPreviewRows([])
    setPreviewColumns([])
    try {
      const details = await apiFetch<any>(`/datasets/${source.id}`)
      setDetailedConnectionInfo(details)
      setLocalSchemaFields(details.schema_fields || [])
    } catch (err: any) {
      showAlert('error', 'Fetch Failed', err.message || 'Could not load connection details.')
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleOpenColEditor = (columnName: string) => {
    const field = localSchemaFields.find((f: any) => f.column_name === columnName)
    setEditingColName(columnName)
    setEditingColData({
      logicalName: field?.logical_name || '',
      logicalType: field?.logical_type || field?.data_type || 'String',
      description: field?.description || '',
      allowedValues: field?.allowed_values || '',
      unitOfMeasurement: field?.unit_of_measurement || '',
      isNullable: field?.is_nullable !== false,
      classification: field?.classification || 'Public',
      isPrimaryKey: !!field?.is_primary_key,
      isForeignKey: !!field?.is_foreign_key,
      foreignKeyRef: field?.foreign_key_ref || '',
      isUnique: !!field?.is_unique,
      defaultValue: field?.default_value || '',
      formatPattern: field?.format_pattern || '',
      nestedFields: field?.nested_fields ? JSON.parse(field.nested_fields) : [],
    })
    setIsColEditorOpen(true)
  }

  const handleSaveColEdits = () => {
    setLocalSchemaFields(prev => prev.map(field => {
      if (field.column_name === editingColName) {
        return {
          ...field,
          logical_name: editingColData.logicalName || '',
          logical_type: editingColData.logicalType || 'String',
          description: editingColData.description || '',
          allowed_values: editingColData.allowedValues || '',
          unit_of_measurement: editingColData.unitOfMeasurement || '',
          is_nullable: editingColData.isNullable !== false,
          classification: editingColData.classification || 'Public',
          is_primary_key: !!editingColData.isPrimaryKey,
          is_foreign_key: !!editingColData.isForeignKey,
          foreign_key_ref: editingColData.foreignKeyRef || '',
          is_unique: !!editingColData.isUnique,
          default_value: editingColData.defaultValue || '',
          format_pattern: editingColData.formatPattern || '',
          nested_fields: JSON.stringify(editingColData.nestedFields || []),
        }
      }
      return field
    }))
    setIsColEditorOpen(false)
    setEditingColName(null)
  }

  const handleSaveBulkDictionary = async () => {
    if (!selectedConnection) return
    setIsSaving(true)
    try {
      const res = await apiFetch<any>(`/datasets/${selectedConnection.id}/schema`, {
        method: 'PUT',
        body: localSchemaFields,
      })
      setLocalSchemaFields(res)
      setDetailedConnectionInfo(prev => ({ ...prev, schema_fields: res }))
      showAlert('success', 'Success', 'Data dictionary saved successfully.')
    } catch (err: any) {
      showAlert('error', 'Save Failed', err.message || 'Could not save data dictionary.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportJSON = () => {
    if (!selectedConnection) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localSchemaFields, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `${selectedConnection.name}_dictionary.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const handleImportDictionary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      try {
        let importedFields: any[] = []
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) {
            importedFields = parsed
          } else {
            importedFields = Object.entries(parsed).map(([colName, data]: [string, any]) => ({
              column_name: colName,
              ...data
            }))
          }
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split(/\r?\n/)
          if (lines.length < 2) return
          const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue
            const values: string[] = []
            let current = ''
            let inQuotes = false
            for (let cIdx = 0; cIdx < line.length; cIdx++) {
              const char = line[cIdx]
              if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim())
                current = ''
              } else {
                current += char
              }
            }
            values.push(current.trim())
            const cleanedValues = values.map(v => v.replace(/^["']|["']$/g, ''))
            const row: any = {}
            headers.forEach((header, idx) => {
              row[header] = cleanedValues[idx] || ''
            })
            if (row.column_name || row.field_name) {
              importedFields.push({
                column_name: row.column_name || row.field_name,
                logical_name: row.logical_name || row.logical_title,
                logical_type: row.logical_type || row.data_type,
                description: row.description,
                allowed_values: row.allowed_values || row.range,
                unit_of_measurement: row.unit_of_measurement || row.unit,
                is_nullable: row.is_nullable === 'true' || row.is_nullable === '1' || row.is_nullable === '',
                classification: row.classification || row.governance,
                is_primary_key: row.is_primary_key === 'true' || row.is_primary_key === '1',
                is_foreign_key: row.is_foreign_key === 'true' || row.is_foreign_key === '1',
                foreign_key_ref: row.foreign_key_ref,
                is_unique: row.is_unique === 'true' || row.is_unique === '1',
                default_value: row.default_value,
                format_pattern: row.format_pattern || row.pattern,
                nested_fields: row.nested_fields || '',
              })
            }
          }
        }

        if (importedFields.length > 0) {
          setLocalSchemaFields(prev => prev.map(field => {
            const match = importedFields.find(f => f.column_name === field.column_name)
            if (match) {
              return {
                ...field,
                logical_name: match.logical_name !== undefined ? match.logical_name : field.logical_name,
                logical_type: match.logical_type !== undefined ? match.logical_type : field.logical_type,
                description: match.description !== undefined ? match.description : field.description,
                allowed_values: match.allowed_values !== undefined ? match.allowed_values : field.allowed_values,
                unit_of_measurement: match.unit_of_measurement !== undefined ? match.unit_of_measurement : field.unit_of_measurement,
                is_nullable: match.is_nullable !== undefined ? match.is_nullable : field.is_nullable,
                classification: match.classification !== undefined ? match.classification : field.classification,
                is_primary_key: match.is_primary_key !== undefined ? match.is_primary_key : field.is_primary_key,
                is_foreign_key: match.is_foreign_key !== undefined ? match.is_foreign_key : field.is_foreign_key,
                foreign_key_ref: match.foreign_key_ref !== undefined ? match.foreign_key_ref : field.foreign_key_ref,
                is_unique: match.is_unique !== undefined ? match.is_unique : field.is_unique,
                default_value: match.default_value !== undefined ? match.default_value : field.default_value,
                format_pattern: match.format_pattern !== undefined ? match.format_pattern : field.format_pattern,
                nested_fields: match.nested_fields !== undefined ? match.nested_fields : field.nested_fields,
              }
            }
            return field
          }))
          showAlert('success', 'Import Successful', `Successfully matched and imported metadata for ${importedFields.length} columns.`)
        } else {
          showAlert('warning', 'Import Warning', 'No matching columns found in the uploaded file.')
        }
      } catch (err: any) {
        showAlert('error', 'Import Failed', 'Invalid file format: ' + err.message)
      }
    }
    reader.readAsText(file)
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
        setUploadProgress(0)
        try {
          await uploadFileWithProgress('/datasets/csv/upload', form, (progress) => {
            setUploadProgress(progress)
          })
        } finally {
          setUploadProgress(null)
        }
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
              password
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
          size="6xl"
        >
          <div className="space-y-5">
            {/* Modal Tabs */}
            <div className="flex border-b border-border mb-4">
              <button
                onClick={() => setDetailsTab('info')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  detailsTab === 'info'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Connection Info & Preview
              </button>
              <button
                onClick={() => setDetailsTab('dictionary')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  detailsTab === 'dictionary'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Data Dictionary
              </button>
            </div>

            {detailsTab === 'info' ? (
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
              </div>
            ) : (
              <div className="space-y-4">
                {/* Data Dictionary toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-input p-3 border border-border rounded-lg">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search dictionary fields..."
                      value={dictionarySearchQuery}
                      onChange={(e) => setDictionarySearchQuery(e.target.value)}
                      className="w-full bg-card border border-border rounded-sm pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-hover rounded text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import Dictionary</span>
                      <input
                        type="file"
                        accept=".json,.csv"
                        onChange={handleImportDictionary}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleExportJSON}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-hover rounded text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                </div>

                {/* Dictionary Grid/Table */}
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  <div className="overflow-x-auto max-h-[350px]">
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
                          <th className="p-3 border-r border-border">Default Value</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {localSchemaFields
                          .filter(f => {
                            const q = dictionarySearchQuery.toLowerCase()
                            return (
                              f.column_name.toLowerCase().includes(q) ||
                              (f.logical_name || '').toLowerCase().includes(q) ||
                              (f.description || '').toLowerCase().includes(q)
                            )
                          })
                          .map((field) => {
                            const nestedCount = field.nested_fields ? JSON.parse(field.nested_fields).length : 0
                            return (
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
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="px-2 py-0.5 bg-bg-hover border border-border rounded text-[10px] font-mono text-text-primary capitalize">
                                      {field.logical_type || field.data_type || 'String'}
                                      {nestedCount > 0 && ` (${nestedCount} nested)`}
                                    </span>
                                    {field.format_pattern && (
                                      <span className="text-[9px] font-mono text-text-muted truncate max-w-[120px]" title={`Format Pattern: ${field.format_pattern}`}>
                                        /{field.format_pattern}/
                                      </span>
                                    )}
                                  </div>
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
                                      <span className="px-1.5 py-0.5 bg-bg-hover text-text-primary rounded text-[8px] font-bold border border-border" title="Unique constraint"><Lock className="w-2 h-2 inline mr-0.5" />UQ</span>
                                    )}
                                    {!field.is_primary_key && !field.is_foreign_key && !field.is_unique && (
                                      <span className="text-text-muted/50">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 border-r border-border text-text-secondary font-mono">
                                  {field.default_value || '-'}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleOpenColEditor(field.column_name)}
                                    className="px-2 py-1 bg-input border border-border hover:bg-bg-hover text-text-primary rounded text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                  >
                                    Edit Details
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        {localSchemaFields.length === 0 && (
                          <tr>
                            <td colSpan={10} className="p-6 text-center text-text-muted italic">
                              No dictionary elements found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Live Data Preview Section */}
            {detailsTab === 'info' && showDataPreview && (
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
                {detailsTab === 'info' ? (
                  <>
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
                  </>
                ) : null}
              </div>

              <div className="flex gap-2">
                {detailsTab === 'dictionary' ? (
                  <button
                    onClick={handleSaveBulkDictionary}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                ) : (
                  <>
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
                  </>
                )}
                <button
                  onClick={() => { setIsDetailsModalOpen(false); setSelectedConnection(null); setDetailedConnectionInfo(null); }}
                  className="px-3 py-1.5 bg-border hover:bg-bg-hover rounded text-xs font-semibold text-text-secondary transition-colors"
                >
                  {detailsTab === 'dictionary' ? 'Cancel' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Column Dictionary Sub-Modal ────────────────────────────────── */}
      {isColEditorOpen && editingColName && (
        <Modal
          isOpen={true}
          onClose={() => { setIsColEditorOpen(false); setEditingColName(null); }}
          title={`Edit Column: ${editingColName}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Description</label>
              <textarea
                value={editingColData.description || ''}
                onChange={(e) => setEditingColData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this column..."
                rows={2}
                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted resize-none transition-colors"
              />
            </div>

            {/* Grid for Logical Name, Type, Allowed Values, Units, Default Value, Pattern */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Logical Name</label>
                <input
                  type="text"
                  value={editingColData.logicalName || ''}
                  onChange={(e) => setEditingColData(prev => ({ ...prev, logicalName: e.target.value }))}
                  placeholder="e.g. User Identifier"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Logical Data Type</label>
                <SearchableSelect
                  options={[
                    { label: 'String (Text)', value: 'String' },
                    { label: 'Integer', value: 'Integer' },
                    { label: 'Float (Decimal)', value: 'Float' },
                    { label: 'Boolean', value: 'Boolean' },
                    { label: 'DateTime / Timestamp', value: 'DateTime' },
                    { label: 'JSON/Document (Nested)', value: 'JSON/Document' },
                    { label: 'Array (List)', value: 'Array' },
                    { label: 'Custom Struct', value: 'Custom Struct' }
                  ]}
                  value={editingColData.logicalType || 'String'}
                  onChange={(val) => setEditingColData(prev => ({ ...prev, logicalType: val }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Allowed Values or Range</label>
                <input
                  type="text"
                  value={editingColData.allowedValues || ''}
                  onChange={(e) => setEditingColData(prev => ({ ...prev, allowedValues: e.target.value }))}
                  placeholder="e.g. 0 to 120 or Yes/No"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Units of Measurement</label>
                <input
                  type="text"
                  value={editingColData.unitOfMeasurement || ''}
                  onChange={(e) => setEditingColData(prev => ({ ...prev, unitOfMeasurement: e.target.value }))}
                  placeholder="e.g. USD, cm, years, days"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Default Value</label>
                <input
                  type="text"
                  value={editingColData.defaultValue || ''}
                  onChange={(e) => setEditingColData(prev => ({ ...prev, defaultValue: e.target.value }))}
                  placeholder="e.g. NULL, CURRENT_TIMESTAMP"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Format Pattern / Regex</label>
                <input
                  type="text"
                  value={editingColData.formatPattern || ''}
                  onChange={(e) => setEditingColData(prev => ({ ...prev, formatPattern: e.target.value }))}
                  placeholder="e.g. ^[a-z0-9]+$"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors"
                />
              </div>
            </div>

            {/* Governance Tag & DB constraints checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Governance Classification</label>
                <SearchableMultiSelect
                  options={[
                    { label: 'Public (Unrestricted)', value: 'Public' },
                    { label: 'Internal (Company wide)', value: 'Internal' },
                    { label: 'Confidential (Restricted)', value: 'Confidential' },
                    { label: 'PII (Personally Identifiable)', value: 'PII' },
                    { label: 'PCI-DSS (Financial cardholder data)', value: 'PCI-DSS' },
                    { label: 'Sensitive (Highly restricted)', value: 'Sensitive' }
                  ]}
                  values={(editingColData.classification || 'Public').split(',').map(s => s.trim()).filter(Boolean)}
                  onChange={(vals) => setEditingColData(prev => ({ ...prev, classification: vals.join(', ') }))}
                  placeholder="Select governance tags..."
                />
              </div>

              <div className="flex flex-col gap-2 justify-center pt-2">
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingColData.isNullable !== false}
                    onChange={(e) => setEditingColData(prev => ({ ...prev, isNullable: e.target.checked }))}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Nullable (Allows missing/null values)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingColData.isPrimaryKey}
                    onChange={(e) => setEditingColData(prev => ({ ...prev, isPrimaryKey: e.target.checked }))}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Primary Key (Unique row identifier)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingColData.isUnique}
                    onChange={(e) => setEditingColData(prev => ({ ...prev, isUnique: e.target.checked }))}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Unique Constraint (No duplicate values)</span>
                </label>
              </div>
            </div>

            {/* Foreign Key Constraints */}
            <div className="border-t border-border pt-3">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={!!editingColData.isForeignKey}
                  onChange={(e) => setEditingColData(prev => ({ ...prev, isForeignKey: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Is Foreign Key Reference?</span>
              </label>
              {editingColData.isForeignKey && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Target Table & Column Reference</label>
                  <AutocompleteInput
                    value={editingColData.foreignKeyRef || ''}
                    onChange={(val) => setEditingColData(prev => ({ ...prev, foreignKeyRef: val }))}
                    suggestions={dataSources.flatMap(ds => ds.columns.map(col => `${ds.name}/${col}`))}
                    placeholder="e.g. customers/id"
                    position="top"
                  />
                </div>
              )}
            </div>

            {/* Nested Schema Builder (For JSON, struct, array) */}
            {(editingColData.logicalType === 'JSON/Document' ||
              editingColData.logicalType === 'Custom Struct' ||
              editingColData.logicalType === 'Array') && (
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider">
                    Nested Schema Builder
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newField: NestedField = {
                        id: Math.random().toString(),
                        path: '',
                        type: 'String',
                        description: '',
                      }
                      setEditingColData(prev => ({
                        ...prev,
                        nestedFields: [...(prev.nestedFields || []), newField],
                      }))
                    }}
                    className="px-2 py-1 bg-primary text-white rounded text-[10px] font-semibold flex items-center gap-1 hover:bg-primary-hover transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Field</span>
                  </button>
                </div>

                <div className="max-h-[180px] overflow-y-auto border border-border rounded p-2 bg-input/50 space-y-2">
                  {(editingColData.nestedFields || []).map((nested, idx) => (
                    <div key={nested.id || idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={nested.path}
                        placeholder="path (e.g. user.age)"
                        onChange={(e) => {
                          const updated = [...(editingColData.nestedFields || [])]
                          updated[idx] = { ...updated[idx], path: e.target.value }
                          setEditingColData(prev => ({ ...prev, nestedFields: updated }))
                        }}
                        className="bg-card border border-border rounded-sm px-2 py-1 text-xs text-text-primary flex-1 focus:outline-none placeholder-text-muted focus:border-primary transition-colors"
                      />
                      <select
                        value={nested.type}
                        onChange={(e) => {
                          const updated = [...(editingColData.nestedFields || [])]
                          updated[idx] = { ...updated[idx], type: e.target.value }
                          setEditingColData(prev => ({ ...prev, nestedFields: updated }))
                        }}
                        className="bg-card border border-border rounded-sm px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="String">String</option>
                        <option value="Integer">Integer</option>
                        <option value="Float">Float</option>
                        <option value="Boolean">Boolean</option>
                        <option value="Array">Array</option>
                        <option value="Object">Object</option>
                      </select>
                      <input
                        type="text"
                        value={nested.description}
                        placeholder="description"
                        onChange={(e) => {
                          const updated = [...(editingColData.nestedFields || [])]
                          updated[idx] = { ...updated[idx], description: e.target.value }
                          setEditingColData(prev => ({ ...prev, nestedFields: updated }))
                        }}
                        className="bg-card border border-border rounded-sm px-2 py-1 text-xs text-text-primary flex-1 focus:outline-none placeholder-text-muted focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editingColData.nestedFields || []).filter((_, i) => i !== idx)
                          setEditingColData(prev => ({ ...prev, nestedFields: updated }))
                        }}
                        className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(editingColData.nestedFields || []).length === 0 && (
                    <p className="text-[10px] text-text-muted italic text-center py-4">
                      No nested fields defined. Click 'Add Field' to document JSON parameters.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 border-t border-border pt-3 mt-4">
              <button
                type="button"
                onClick={handleSaveColEdits}
                className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-hover transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => { setIsColEditorOpen(false); setEditingColName(null); }}
                className="px-4 py-2 bg-border hover:bg-bg-hover rounded text-xs font-semibold text-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {uploadProgress !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-panel border border-border p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 flex flex-col items-center text-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <span className="absolute text-xs font-semibold text-text-primary">{uploadProgress}%</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Uploading Dataset</h3>
              <p className="text-xs text-text-secondary mt-1">Please keep this window open while we upload and validate your CSV file.</p>
            </div>
            <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-out" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-text-secondary">
              {uploadProgress < 100 ? 'Streaming raw chunks...' : 'Validating & onboarding...'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
