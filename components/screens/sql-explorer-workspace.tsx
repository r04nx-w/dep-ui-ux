'use client'

import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import {
  Play, Database, Search, Code, Table, Download, AlertCircle, CheckCircle2,
  Loader2, ChevronRight, ChevronDown, Copy, Check, FileText, Filter, X, TableProperties
} from 'lucide-react'

interface ColumnInfo {
  column_name: string
  data_type: string
}

interface Dataset {
  dataset_name: string
  allowed_columns: string[]
}

interface SqlExplorerWorkspaceProps {
  onClose: () => void
  username?: string
}

export function SqlExplorerWorkspace({ onClose, username = 'Analyst' }: SqlExplorerWorkspaceProps) {
  const { showToast } = useToast()
  
  // Data State
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [schemaFields, setSchemaFields] = useState<ColumnInfo[]>([])
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Query State
  const [sqlQuery, setSqlQuery] = useState<string>('')
  const [queryExecuting, setQueryExecuting] = useState<boolean>(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  
  // Results State
  const [rawMarkdownResult, setRawMarkdownResult] = useState<string>('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [totalRows, setTotalRows] = useState<number>(0)
  
  // Interactive Table State
  const [tableSearch, setTableSearch] = useState<string>('')
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(15)

  // Copy status
  const [copiedDataset, setCopiedDataset] = useState<string | null>(null)

  // Fetch permitted datasets on mount
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const data = await apiFetch<any[]>('/access/datasets/me')
        if (Array.isArray(data)) {
          setDatasets(data)
          if (data.length > 0) {
            setSelectedDataset(data[0].dataset_name)
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch permitted datasets:', err)
        showToast({
          type: 'error',
          title: 'Load Failed',
          message: 'Could not fetch permitted datasets catalog.'
        })
      }
    }
    fetchDatasets()
  }, [])

  // Fetch schema fields when dataset changes
  useEffect(() => {
    if (!selectedDataset) return
    
    const fetchSchema = async () => {
      setSchemaLoading(true)
      try {
        const res = await apiFetch<any>(`/catalog/${selectedDataset}`)
        if (res && Array.isArray(res.schema_fields)) {
          setSchemaFields(res.schema_fields)
        } else {
          setSchemaFields([])
        }
      } catch (err) {
        console.error('Failed to fetch dataset schema:', err)
        setSchemaFields([])
      } finally {
        setSchemaLoading(false)
      }
    }

    fetchSchema()
    
    // Set default query
    setSqlQuery(`SELECT * FROM "${selectedDataset}" LIMIT 25`)
    setQueryError(null)
    setHeaders([])
    setRows([])
    setTotalRows(0)
    setRawMarkdownResult('')
  }, [selectedDataset])

  // Execute SQL Query
  const handleExecuteQuery = async () => {
    if (!selectedDataset || !sqlQuery.trim()) return

    setQueryExecuting(true)
    setQueryError(null)
    setHeaders([])
    setRows([])
    setTotalRows(0)
    setRawMarkdownResult('')

    try {
      const response = await apiFetch<{ columns: string[], rows: any[][], total_count: number }>('/access/query', {
        method: 'POST',
        body: JSON.stringify({
          dataset_name: selectedDataset,
          sql: sqlQuery
        })
      })

      if (response && Array.isArray(response.columns)) {
        setHeaders(response.columns)
        // Convert all row cells to string format for display
        const stringRows = response.rows.map(row => 
          row.map(cell => cell !== null && cell !== undefined ? String(cell) : '')
        )
        setRows(stringRows)
        setTotalRows(response.total_count)
        setCurrentPage(1)
        
        if (response.columns.length === 0) {
          showToast({
            type: 'info',
            title: 'Query Complete',
            message: 'Query executed successfully with 0 columns returned.'
          })
        } else {
          showToast({
            type: 'success',
            title: 'Query Executed',
            message: `Successfully retrieved ${response.total_count} rows.`
          })
        }
      } else {
        setQueryError('Invalid server response format.')
      }
    } catch (err: any) {
      console.error('Failed to execute query:', err)
      setQueryError(err.message || 'Server connection error during SQL execution.')
    } finally {
      setQueryExecuting(false)
    }
  }

  // SQL Templates insertion helpers
  const insertTemplate = (templateType: string) => {
    if (!selectedDataset) return
    
    let query = ''
    switch (templateType) {
      case 'select_all':
        query = `SELECT * FROM "${selectedDataset}" LIMIT 25`
        break
      case 'count_groups':
        const firstCol = schemaFields[0]?.column_name || 'id'
        query = `SELECT "${firstCol}", COUNT(*) as count \nFROM "${selectedDataset}" \nGROUP BY "${firstCol}" \nORDER BY count DESC \nLIMIT 15`
        break
      case 'aggregates':
        const numericCol = schemaFields.find(f => 
          f.data_type.toLowerCase().includes('int') || 
          f.data_type.toLowerCase().includes('float') || 
          f.data_type.toLowerCase().includes('double') ||
          f.data_type.toLowerCase().includes('decimal') ||
          f.data_type.toLowerCase().includes('num')
        )?.column_name
        
        if (numericCol) {
          query = `SELECT \n  COUNT(*) as total_records,\n  AVG("${numericCol}") as average_value,\n  MIN("${numericCol}") as min_val,\n  MAX("${numericCol}") as max_val \nFROM "${selectedDataset}"`
        } else {
          query = `SELECT COUNT(*) as total_records \nFROM "${selectedDataset}"`
        }
        break
      case 'filter_nulls':
        const filterCol = schemaFields[0]?.column_name || 'id'
        query = `SELECT * \nFROM "${selectedDataset}" \nWHERE "${filterCol}" IS NOT NULL \nORDER BY "${filterCol}" ASC \nLIMIT 25`
        break
    }
    setSqlQuery(query)
  }

  // CSV Exporter
  const handleExportCSV = () => {
    if (headers.length === 0 || rows.length === 0) return

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${selectedDataset}_sql_results.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showToast({
      type: 'success',
      title: 'Export Success',
      message: 'Results downloaded as CSV file.'
    })
  }

  // Copy python dep_sdk snippet helper
  const handleCopySdk = (datasetName: string) => {
    const code = `import dep_sdk as dep\n\n# Fetch governed catalog\ndf = dep.get_catalog('${datasetName}')\nprint(df.head())\n`
    navigator.clipboard.writeText(code)
    setCopiedDataset(datasetName)
    setTimeout(() => setCopiedDataset(null), 2000)
    
    showToast({
      type: 'success',
      title: 'Copied Snippet',
      message: 'dep_sdk Python code copied to clipboard.'
    })
  }

  // Filtering datasets
  const filteredDatasets = datasets.filter(ds => 
    ds.dataset_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Interactive Table Operations
  const handleSort = (index: number) => {
    if (sortColumn === index) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(index)
      setSortDirection('asc')
    }
  }

  // Filter rows based on search input
  const filteredRows = rows.filter(row => {
    if (!tableSearch) return true
    return row.some(cell => cell.toLowerCase().includes(tableSearch.toLowerCase()))
  })

  // Sort rows based on sort state
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortColumn === null) return 0
    const valA = a[sortColumn] || ''
    const valB = b[sortColumn] || ''

    // Attempt numerical sort
    const numA = Number(valA)
    const numB = Number(valB)
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortDirection === 'asc' ? numA - numB : numB - numA
    }

    // Default string sort
    return sortDirection === 'asc' 
      ? valA.localeCompare(valB) 
      : valB.localeCompare(valA)
  })

  // Pagination calculation
  const totalPages = Math.ceil(sortedRows.length / pageSize)
  const paginatedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="flex-grow flex flex-col h-full bg-[#181818] overflow-hidden text-[#e8e8e8]">
      {/* Top Workspace Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#1e1e1e] border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-sky-500/10 border border-sky-500/20 p-2 rounded-lg text-sky-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-text-primary">Raw SQL Explorer Workspace</h1>
              <span className="text-[10px] bg-sky-500/15 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                SQL Console
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Query governed catalogs directly via standard SQL. Dynamic security policies are applied on the fly.
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Workspace Workspace Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar Datasets Navigation */}
        <div className="w-72 border-r border-border bg-[#1e1e1e] flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search catalogs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-input border border-border/80 focus:border-primary/50 text-xs text-text-primary rounded-lg pl-9 pr-3 py-2 outline-none font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Permitted Catalogs ({filteredDatasets.length})
            </div>
            {filteredDatasets.map(ds => {
              const isActive = selectedDataset === ds.dataset_name
              return (
                <button
                  key={ds.dataset_name}
                  onClick={() => setSelectedDataset(ds.dataset_name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                      : 'text-text-secondary hover:bg-bg-hover border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Database className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                    <span className="truncate">{ds.dataset_name}</span>
                  </div>
                  <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                    Select
                  </span>
                </button>
              )
            })}
            {filteredDatasets.length === 0 && (
              <div className="text-center py-6 text-xs text-text-muted italic">No permitted datasets found.</div>
            )}
          </div>

          {/* Schema Columns Explorer */}
          {selectedDataset && (
            <div className="h-64 border-t border-border bg-[#1e1e1e]/60 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <TableProperties className="w-3 h-3 text-text-muted" /> Columns ({schemaFields.length})
                </span>
                <button
                  onClick={() => handleCopySdk(selectedDataset)}
                  className="flex items-center gap-1 text-[10px] text-primary font-semibold hover:underline cursor-pointer"
                  title="Copy Python dep_sdk execution code snippet"
                >
                  {copiedDataset === selectedDataset ? (
                    <>
                      <Check className="w-2.5 h-2.5" /> Copied SDK
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" /> Copy SDK code
                    </>
                  )}
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {schemaLoading ? (
                  <div className="flex items-center justify-center py-8 text-text-muted text-xs gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading schema...
                  </div>
                ) : schemaFields.length > 0 ? (
                  schemaFields.map(f => (
                    <div key={f.column_name} className="flex items-center justify-between text-xs py-0.5">
                      <span className="font-mono text-[#a0a0a0] truncate" title={f.column_name}>
                        {f.column_name}
                      </span>
                      <span className="text-[9px] bg-input border border-border px-1.5 py-0.2 rounded text-text-muted font-mono flex-shrink-0">
                        {f.data_type.toLowerCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-text-muted italic">No column info available.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Work Area */}
        <div className="flex-grow flex flex-col min-w-0 overflow-hidden">
          
          {/* Query Input Editor */}
          <div className="p-4 border-b border-border bg-[#1e1e1e]/60 flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              {/* Templates */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-1">SQL Templates:</span>
                <button
                  onClick={() => insertTemplate('select_all')}
                  className="px-2 py-1 bg-input hover:bg-bg-hover border border-border/80 rounded text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Select Top 25
                </button>
                <button
                  onClick={() => insertTemplate('count_groups')}
                  className="px-2 py-1 bg-input hover:bg-bg-hover border border-border/80 rounded text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Count Groups
                </button>
                <button
                  onClick={() => insertTemplate('aggregates')}
                  className="px-2 py-1 bg-input hover:bg-bg-hover border border-border/80 rounded text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Aggregates Profile
                </button>
                <button
                  onClick={() => insertTemplate('filter_nulls')}
                  className="px-2 py-1 bg-input hover:bg-bg-hover border border-border/80 rounded text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Filter Nulls
                </button>
              </div>

              {/* Run button */}
              <button
                onClick={handleExecuteQuery}
                disabled={queryExecuting || !sqlQuery.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
              >
                {queryExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run Query
                  </>
                )}
              </button>
            </div>

            {/* Code editor textarea */}
            <div className="relative border border-border rounded-lg overflow-hidden bg-input focus-within:border-primary/50 transition-colors">
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                placeholder="Write your raw SQL query here... e.g. SELECT * FROM dataset LIMIT 10"
                className="w-full h-32 bg-transparent text-text-primary text-xs font-mono p-4 outline-none resize-none"
                style={{ lineHeight: '18px' }}
              />
              <div className="absolute right-3 bottom-2.5 text-[9px] font-mono text-text-muted select-none">
                SQLite standard dialect
              </div>
            </div>
            
            {/* dep_sdk Middle Simulation Panel */}
            <div className="bg-[#181818]/60 border border-border rounded-lg px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-text-secondary">
                <Code className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-semibold">dep_sdk execution pipeline:</span>
                <code className="bg-input px-1.5 py-0.5 rounded text-[10px] text-primary border border-border/40 font-mono">
                  dep.get_catalog(&apos;{selectedDataset}&apos;)
                </code>
                <span>→ in-memory SQLite wrapper</span>
              </div>
              <span className="text-[10px] text-text-muted italic hidden md:inline">
                Securely proxying columns and applying active masks in the background
              </span>
            </div>
          </div>

          {/* Results Workspace Panel */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            
            {/* Query Loader */}
            {queryExecuting && (
              <div className="absolute inset-0 bg-[#181818]/70 flex flex-col items-center justify-center z-10 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div className="text-xs text-text-secondary font-medium animate-pulse">
                  Fetching governed dataset and executing query...
                </div>
              </div>
            )}

            {/* Error Message */}
            {queryError && (
              <div className="m-6 p-4 bg-red-950/20 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#f44747] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#f44747] mb-1">Execution Failure</h4>
                  <p className="text-xs text-text-secondary leading-relaxed font-mono whitespace-pre-wrap">
                    {queryError}
                  </p>
                </div>
              </div>
            )}

            {/* Results Output Rendering */}
            {!queryExecuting && !queryError && headers.length > 0 && (
              <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
                {/* Search, Filter, Export Bar */}
                <div className="px-6 py-3 border-b border-border bg-[#1e1e1e]/40 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2" />
                      <input
                        type="text"
                        placeholder="Search result rows..."
                        value={tableSearch}
                        onChange={e => { setTableSearch(e.target.value); setCurrentPage(1); }}
                        className="bg-input border border-border/80 text-[11px] text-text-primary rounded-md pl-8 pr-2.5 py-1.5 outline-none w-48 focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <span className="text-xs text-text-muted">
                      Filtered: <strong>{filteredRows.length}</strong> of <strong>{totalRows}</strong> rows
                    </span>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c1e] hover:bg-bg-hover border border-border rounded-lg text-xs font-bold text-text-primary hover:text-white transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>

                {/* Table Data Viewer */}
                <div className="flex-grow overflow-auto scrollbar-thin">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-input border-b border-border sticky top-0 z-20 shadow-sm">
                        {headers.map((h, idx) => {
                          const isSorted = sortColumn === idx
                          return (
                            <th 
                              key={idx}
                              onClick={() => handleSort(idx)}
                              className="p-3 font-semibold text-text-secondary select-none cursor-pointer hover:bg-bg-hover hover:text-text-primary transition-colors border-r border-border/60 last:border-r-0"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono">{h}</span>
                                <span className="text-[10px] text-text-muted font-normal">
                                  {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                </span>
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paginatedRows.map((row, rIdx) => (
                        <tr 
                          key={rIdx} 
                          className="hover:bg-bg-hover/20 transition-colors"
                        >
                          {row.map((cell, cIdx) => (
                            <td 
                              key={cIdx} 
                              className="p-3 font-mono text-text-primary border-r border-border/30 last:border-r-0 whitespace-nowrap overflow-hidden max-w-xs truncate"
                              title={cell}
                            >
                              {cell === '***MASKED***' || cell === '***' ? (
                                <span className="px-1.5 py-0.5 bg-[#569cd6]/10 border border-[#569cd6]/20 text-[#569cd6] rounded-sm text-[10px] font-semibold tracking-wide">
                                  MASKED
                                </span>
                              ) : cell === '' || cell === 'None' ? (
                                <span className="text-text-muted/40 italic">null</span>
                              ) : (
                                cell
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-3 border-t border-border bg-[#1e1e1e]/40 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-input border border-border rounded px-1.5 py-0.5 outline-none cursor-pointer focus:border-primary/50 transition-colors text-text-primary"
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-text-muted">
                        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-2.5 py-1 bg-input border border-border rounded hover:bg-bg-hover hover:text-text-primary transition-colors text-xs font-bold text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Prev
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="px-2.5 py-1 bg-input border border-border rounded hover:bg-bg-hover hover:text-text-primary transition-colors text-xs font-bold text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty Console State */}
            {!queryExecuting && !queryError && headers.length === 0 && (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-12">
                <Table className="w-12 h-12 text-text-muted opacity-40 mb-3" />
                <h3 className="text-sm font-semibold text-text-primary mb-1">No Results</h3>
                <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                  Select a permitted catalog, customize your SQL query, and click **Run Query** to view interactive results.
                </p>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}
