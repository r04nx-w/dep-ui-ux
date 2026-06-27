'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react'

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
}

interface TypeDetectionResult {
  type: ColumnMetadata['type']
  subtype?: ColumnMetadata['subtype']
  minLength?: number
  maxLength?: number
  pattern?: string
}

interface CSVMetadata {
  fileName: string
  rowCount: number
  columnCount: number
  fileSize: number
  columns: ColumnMetadata[]
  previewData: string[][]
}

interface CSVUploaderProps {
  onFileUpload: (metadata: CSVMetadata, file: File) => void
  onClear: () => void
}

export function CSVUploader({ onFileUpload, onClear }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectColumnType = (values: string[]): TypeDetectionResult => {
    const nonNullValues = values.filter(v => v !== null && v !== '' && v !== 'null' && v !== 'NaN' && v !== 'undefined')
    if (nonNullValues.length === 0) return { type: 'unknown', subtype: undefined }

    const total = nonNullValues.length
    const threshold = 0.8
    const trimmedValues = nonNullValues.map(v => v.trim())

    // Calculate length statistics
    const lengths = trimmedValues.map(v => v.length)
    const minLength = Math.min(...lengths)
    const maxLength = Math.max(...lengths)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length

    // Check for boolean patterns
    const booleanPatterns = [
      /^(true|false)$/i,
      /^(yes|no)$/i,
      /^(y|n)$/i,
      /^(1|0)$/,
      /^(on|off)$/i,
      /^(enabled|disabled)$/i
    ]
    const booleanCount = trimmedValues.filter(v =>
      booleanPatterns.some(pattern => pattern.test(v))
    ).length
    if (booleanCount / total > threshold) {
      return { type: 'boolean', subtype: undefined, minLength, maxLength }
    }

    // Check for integer patterns
    const integerPattern = /^-?\d+$/
    const integerCount = trimmedValues.filter(v => integerPattern.test(v)).length
    if (integerCount / total > threshold) {
      return { type: 'number', subtype: 'integer', minLength, maxLength }
    }

    // Check for float/decimal patterns
    const floatPattern = /^-?\d+\.?\d*$/
    const floatCount = trimmedValues.filter(v => floatPattern.test(v)).length
    if (floatCount / total > threshold) {
      return { type: 'number', subtype: 'float', minLength, maxLength }
    }

    // Check for date patterns (ISO, US, European, etc.)
    const datePatterns = {
      isoDate: /^\d{4}-\d{2}-\d{2}$/,
      usDate: /^\d{2}\/\d{2}\/\d{4}$/,
      usDateDash: /^\d{2}-\d{2}-\d{4}$/,
      euDate: /^\d{2}\.\d{2}\.\d{4}$/,
      isoDateSlash: /^\d{4}\/\d{2}\/\d{2}$/,
      isoDateTime: /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/,
      usDateTime: /^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i,
    }

    const dateCount = trimmedValues.filter(v =>
      Object.values(datePatterns).some(pattern => pattern.test(v)) || !isNaN(Date.parse(v))
    ).length
    if (dateCount / total > threshold) {
      // Determine if it's datetime or date only
      const hasTime = trimmedValues.some(v =>
        datePatterns.isoDateTime.test(v) || datePatterns.usDateTime.test(v) || v.includes(':')
      )
      return {
        type: 'date',
        subtype: hasTime ? 'datetime' : 'date_only',
        minLength,
        maxLength
      }
    }

    // Check for email pattern
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const emailCount = trimmedValues.filter(v => emailPattern.test(v)).length
    if (emailCount / total > threshold) {
      return { type: 'string', subtype: 'email', minLength, maxLength, pattern: 'email' }
    }

    // Check for URL pattern
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    const urlCount = trimmedValues.filter(v => urlPattern.test(v)).length
    if (urlCount / total > threshold) {
      return { type: 'string', subtype: 'url', minLength, maxLength, pattern: 'url' }
    }

    // Check for phone number patterns
    const phonePatterns = [
      /^\+?[\d\s-()]{10,}$/, // International format
      /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/, // US format
      /^\(\d{3}\)\s*\d{3}[-.\s]?\d{4}$/, // US with parentheses
    ]
    const phoneCount = trimmedValues.filter(v =>
      phonePatterns.some(pattern => pattern.test(v))
    ).length
    if (phoneCount / total > threshold) {
      return { type: 'string', subtype: 'phone', minLength, maxLength, pattern: 'phone' }
    }

    // Check for ZIP/postal code patterns
    const zipPatterns = {
      usZip: /^\d{5}(-\d{4})?$/,
      canadianPostal: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      simple4Digit: /^\d{4}$/,
      ukPostcode: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2}$/,
    }
    const zipCount = trimmedValues.filter(v =>
      Object.values(zipPatterns).some(pattern => pattern.test(v))
    ).length
    if (zipCount / total > threshold) {
      return { type: 'string', subtype: 'zip', minLength, maxLength, pattern: 'postal' }
    }

    // Check for UUID/GUID pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const uuidCount = trimmedValues.filter(v => uuidPattern.test(v)).length
    if (uuidCount / total > threshold) {
      return { type: 'string', subtype: 'uuid', minLength: 36, maxLength: 36, pattern: 'uuid' }
    }

    // Check for JSON pattern
    const jsonCount = trimmedValues.filter(v => {
      try {
        JSON.parse(v)
        return true
      } catch {
        return false
      }
    }).length
    if (jsonCount / total > threshold) {
      return { type: 'string', subtype: 'json', minLength, maxLength, pattern: 'json' }
    }

    // Check if it's likely text (long strings with spaces)
    const hasSpaces = trimmedValues.filter(v => v.includes(' ')).length
    const avgWordLength = trimmedValues.reduce((sum, v) => sum + v.split(/\s+/).length, 0) / trimmedValues.length

    if (avgLength > 50 || (hasSpaces / total > 0.5 && avgWordLength > 3)) {
      return { type: 'string', subtype: 'text', minLength, maxLength }
    }

    // Default to string
    return { type: 'string', subtype: undefined, minLength, maxLength }
  }

  const parseCSV = (content: string): string[][] => {
    const lines = content.split('\n').filter(line => line.trim())
    const result: string[][] = []
    
    for (const line of lines) {
      const values: string[] = []
      let currentValue = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim())
          currentValue = ''
        } else {
          currentValue += char
        }
      }
      values.push(currentValue.trim())
      result.push(values)
    }
    
    return result
  }

  const extractMetadata = (file: File, content: string): CSVMetadata => {
    const data = parseCSV(content)
    const headers = data[0] || []
    const rows = data.slice(1)

    const columns: ColumnMetadata[] = headers.map((header, index) => {
      const columnValues = rows.map(row => row[index] || '')
      const uniqueValues = [...new Set(columnValues)]
      const typeDetection = detectColumnType(columnValues)

      return {
        name: header || `Column ${index + 1}`,
        type: typeDetection.type,
        subtype: typeDetection.subtype,
        description: '',
        nullable: columnValues.some(v => v === '' || v === 'null' || v === 'NaN'),
        uniqueCount: uniqueValues.length,
        sampleValues: uniqueValues.slice(0, 5),
        minLength: typeDetection.minLength,
        maxLength: typeDetection.maxLength,
        pattern: typeDetection.pattern
      }
    })

    return {
      fileName: file.name,
      rowCount: rows.length,
      columnCount: headers.length,
      fileSize: file.size,
      columns,
      previewData: data.slice(0, 6) // First 6 rows for preview
    }
  }

  const handleFile = async (file: File) => {
    setError(null)
    setIsProcessing(true)

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      setIsProcessing(false)
      return
    }

    try {
      const content = await file.text()
      const metadata = extractMetadata(file, content)
      setUploadedFile(file)
      onFileUpload(metadata, file)
    } catch (err) {
      setError('Failed to parse CSV file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleClear = () => {
    setUploadedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClear()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="space-y-3">
      {!uploadedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-border/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center gap-2">
            <div className={`p-2 rounded-full transition-colors ${
              isDragging ? 'bg-primary/10' : 'bg-border'
            }`}>
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className={`w-5 h-5 ${isDragging ? 'text-primary' : 'text-text-muted'}`} />
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-text-primary mb-0.5">
                {isProcessing ? 'Processing...' : 'Drop CSV or click to upload'}
              </p>
              <p className="text-[10px] text-text-muted">
                Up to 50MB
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-input border border-border rounded-lg p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-primary/10 rounded">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{uploadedFile.name}</p>
                <p className="text-[10px] text-text-muted">{formatFileSize(uploadedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors text-text-muted flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
