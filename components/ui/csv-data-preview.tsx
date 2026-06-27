'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Table, Maximize2, Minimize2 } from 'lucide-react'

interface CSVMetadata {
  fileName: string
  rowCount: number
  columnCount: number
  fileSize: number
  columns: any[]
  previewData: string[][]
}

interface CSVDataPreviewProps {
  metadata: CSVMetadata
}

export function CSVDataPreview({ metadata }: CSVDataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const rowsPerPage = 10
  const totalPages = Math.ceil(metadata.previewData.length / rowsPerPage)

  const filteredData = metadata.previewData.filter(row =>
    row.some(cell =>
      cell.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortColumn === null) return 0
    const aVal = a[sortColumn] || ''
    const bVal = b[sortColumn] || ''
    const comparison = aVal.localeCompare(bVal)
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const paginatedData = sortedData.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  )

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnIndex)
      setSortDirection('asc')
    }
  }

  const handlePreviousPage = () => {
    setCurrentPage(Math.max(0, currentPage - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
  }

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''} animate-fade-in`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Table className="w-4 h-4" />
          Data Preview
        </h3>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 bg-input border border-border rounded hover:border-primary/50 text-text-secondary hover:text-text-primary transition-all"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search data..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-input">
                {metadata.previewData[0]?.map((header, index) => (
                  <th
                    key={index}
                    onClick={() => handleSort(index)}
                    className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:bg-border/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-32">{header}</span>
                      {sortColumn === index && (
                        <span className="text-primary">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border hover:bg-border/30 transition-colors"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-2 text-sm text-text-secondary whitespace-nowrap"
                    >
                      <span className="truncate block max-w-48" title={cell}>
                        {cell || '-'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-input">
          <div className="text-xs text-text-muted">
            Showing {currentPage * rowsPerPage + 1} to{' '}
            {Math.min((currentPage + 1) * rowsPerPage, sortedData.length)} of{' '}
            {sortedData.length} rows
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
              className="p-1 bg-border rounded hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-secondary">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className="p-1 bg-border rounded hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-input border border-border rounded p-3 text-center">
          <p className="text-xs text-text-muted mb-1">Total Rows</p>
          <p className="text-lg font-bold text-text-primary">
            {metadata.rowCount.toLocaleString()}
          </p>
        </div>
        <div className="bg-input border border-border rounded p-3 text-center">
          <p className="text-xs text-text-muted mb-1">Columns</p>
          <p className="text-lg font-bold text-text-primary">{metadata.columnCount}</p>
        </div>
        <div className="bg-input border border-border rounded p-3 text-center">
          <p className="text-xs text-text-muted mb-1">Preview Rows</p>
          <p className="text-lg font-bold text-text-primary">
            {metadata.previewData.length}
          </p>
        </div>
      </div>
    </div>
  )
}
