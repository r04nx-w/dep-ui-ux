'use client'

import { useState } from 'react'
import { Database, FileText, Hash, Type, Edit2, Check, AlertTriangle, Info, X } from 'lucide-react'

interface ColumnMetadata {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'unknown'
  subtype?: 'email' | 'phone' | 'url' | 'zip' | 'uuid' | 'json' | 'integer' | 'float' | 'datetime' | 'date_only' | 'text'
  description: string
  nullable: boolean
  uniqueCount: number
  sampleValues: string[]
  minLength?: number
  maxLength?: number
  pattern?: string
  actual_type?: string
  source?: string
}

interface CSVMetadata {
  fileName: string
  rowCount: number
  columnCount: number
  fileSize: number
  columns: ColumnMetadata[]
  previewData: string[][]
}

interface CSVMetadataDisplayProps {
  metadata: CSVMetadata
  onColumnUpdate: (columnName: string, updates: Partial<ColumnMetadata>) => void
}

const typeColors = {
  string: '#569cd6',
  number: '#6a9955',
  boolean: '#ce9178',
  date: '#dcdcaa',
  unknown: '#808080'
}

const subtypeColors = {
  email: '#4ec9b0',
  phone: '#ce9178',
  url: '#569cd6',
  zip: '#6a9955',
  uuid: '#dcdcaa',
  json: '#c586c0',
  integer: '#6a9955',
  float: '#6a9955',
  datetime: '#dcdcaa',
  date_only: '#dcdcaa',
  text: '#569cd6'
}

const typeIcons = {
  string: Type,
  number: Hash,
  boolean: Check,
  date: Info,
  unknown: AlertTriangle
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

export function CSVMetadataDisplay({ metadata, onColumnUpdate }: CSVMetadataDisplayProps) {
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [tempDescription, setTempDescription] = useState('')
  const [tempActualType, setTempActualType] = useState('')
  const [tempSource, setTempSource] = useState('')

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const handleEditColumn = (column: ColumnMetadata) => {
    setEditingColumn(column.name)
    setTempDescription(column.description || '')
    setTempActualType(column.actual_type || '')
    setTempSource(column.source || '')
  }

  const handleSaveColumnData = (columnName: string) => {
    onColumnUpdate(columnName, {
      description: tempDescription,
      actual_type: tempActualType || undefined,
      source: tempSource || undefined
    })
    setEditingColumn(null)
    setTempDescription('')
    setTempActualType('')
    setTempSource('')
  }

  const handleCancelEdit = () => {
    setEditingColumn(null)
    setTempDescription('')
    setTempActualType('')
    setTempSource('')
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* File Overview */}
      <div className="bg-input border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{metadata.fileName}</h3>
              <p className="text-[10px] text-text-muted">CSV Metadata</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card border border-border rounded p-2 text-center">
            <p className="text-[10px] text-text-muted mb-0.5">Rows</p>
            <p className="text-sm font-bold text-text-primary">{formatNumber(metadata.rowCount)}</p>
          </div>

          <div className="bg-card border border-border rounded p-2 text-center">
            <p className="text-[10px] text-text-muted mb-0.5">Columns</p>
            <p className="text-sm font-bold text-text-primary">{metadata.columnCount}</p>
          </div>

          <div className="bg-card border border-border rounded p-2 text-center">
            <p className="text-[10px] text-text-muted mb-0.5">Size</p>
            <p className="text-sm font-bold text-text-primary">{formatFileSize(metadata.fileSize)}</p>
          </div>

          <div className="bg-card border border-border rounded p-2 text-center">
            <p className="text-[10px] text-text-muted mb-0.5">Types</p>
            <p className="text-sm font-bold text-text-primary">
              {[...new Set(metadata.columns.map(c => c.type))].length}
            </p>
          </div>
        </div>
      </div>

      {/* Column Schema */}
      <div className="bg-input border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            Column Schema
          </h3>
          <span className="text-[10px] text-text-muted">
            {metadata.columns.length} columns
          </span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-card scrollbar-thumb-border hover:scrollbar-thumb-bg-hover">
          {metadata.columns.map((column, index) => {
            const TypeIcon = typeIcons[column.type]
            return (
              <div
                key={column.name}
                className="bg-card border border-border rounded p-2 hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {column.name}
                      </span>
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                        style={{
                          backgroundColor: `${typeColors[column.type]}15`,
                          color: typeColors[column.type],
                          border: `1px solid ${typeColors[column.type]}30`
                        }}
                      >
                        <TypeIcon className="w-2.5 h-2.5" />
                        {column.type}
                      </span>
                      {column.subtype && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{
                            backgroundColor: `${subtypeColors[column.subtype]}15`,
                            color: subtypeColors[column.subtype],
                            border: `1px solid ${subtypeColors[column.subtype]}30`
                          }}
                        >
                          {column.subtype}
                        </span>
                      )}
                      {column.nullable && (
                        <span className="text-[9px] text-text-muted bg-border px-1.5 py-0.5 rounded">
                          null
                        </span>
                      )}
                    </div>

                    {editingColumn === column.name ? (
                      <div className="flex flex-col gap-1.5 w-full bg-input border border-border p-2 rounded mt-1">
                        <input
                          type="text"
                          value={tempDescription}
                          onChange={(e) => setTempDescription(e.target.value)}
                          className="w-full bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-primary transition-colors"
                          placeholder="Description..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <select
                            value={tempActualType}
                            onChange={(e) => setTempActualType(e.target.value)}
                            className="flex-1 bg-card border border-border rounded px-2 py-1.5 text-[10px] text-text-primary focus:outline-none focus:border-primary transition-colors"
                          >
                            <option value="">-- Select Actual Type --</option>
                            {BUSINESS_TYPES.map((bt) => (
                              <option key={bt.value} value={bt.value}>{bt.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={tempSource}
                            onChange={(e) => setTempSource(e.target.value)}
                            className="flex-1 bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-primary transition-colors"
                            placeholder="Source (e.g. CRM)..."
                          />
                        </div>
                        <div className="flex justify-end gap-1.5 pt-1.5 border-t border-border/40">
                          <button
                            onClick={() => handleSaveColumnData(column.name)}
                            className="px-2 py-1 text-[10px] bg-primary text-white rounded hover:bg-primary-hover transition-colors flex items-center gap-1"
                          >
                            <Check className="w-2.5 h-2.5" /> Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 text-[10px] bg-border text-text-secondary rounded hover:bg-bg-hover transition-colors flex items-center gap-1"
                          >
                            <X className="w-2.5 h-2.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] text-text-secondary mb-1 min-h-[1rem] truncate">
                          {column.description || 'No description'}
                        </p>
                        {(column.actual_type || column.source) && (
                          <div className="text-[9px] text-text-muted flex gap-3 mb-2">
                            {column.actual_type && <span>Actual Type: <span className="text-text-secondary font-mono">{column.actual_type}</span></span>}
                            {column.source && <span>Source: <span className="text-text-secondary font-mono">{column.source}</span></span>}
                          </div>
                        )}
                        <button
                          onClick={() => handleEditColumn(column)}
                          className="text-[10px] text-text-muted hover:text-primary transition-colors flex items-center gap-0.5"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          {column.description || column.actual_type || column.source ? 'Edit' : 'Add metadata'}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-[10px] text-text-muted">
                      {formatNumber(column.uniqueCount)} unique
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Type Distribution */}
      <div className="bg-input border border-border rounded-lg p-3">
        <h3 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-2">
          <Type className="w-3.5 h-3.5" />
          Type Distribution
        </h3>

        <div className="space-y-1.5">
          {Object.entries(
            metadata.columns.reduce((acc, col) => {
              acc[col.type] = (acc[col.type] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          ).map(([type, count]) => {
            const percentage = (count / metadata.columnCount) * 100
            const TypeIcon = typeIcons[type as keyof typeof typeIcons]
            return (
              <div key={type} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 w-20">
                  <TypeIcon className="w-3 h-3" style={{ color: typeColors[type as keyof typeof typeColors] }} />
                  <span className="text-[10px] text-text-secondary capitalize">{type}</span>
                </div>
                <div className="flex-1 bg-input rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: typeColors[type as keyof typeof typeColors]
                    }}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className="text-[10px] font-medium text-text-primary">{count}</span>
                  <span className="text-[10px] text-text-muted ml-0.5">({percentage.toFixed(0)}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
