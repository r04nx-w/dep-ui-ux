'use client'

import { useState, useEffect } from 'react'
import { UserBadge } from '@/components/ui/user-badge'
import { apiFetch } from '@/lib/api'
import { ShieldCheck, ShieldAlert, RefreshCw, AlertCircle } from 'lucide-react'

interface AuditLogRaw {
  id: number
  user_id: number
  dataset_id: number | null
  outcome: string
  error_reason: string | null
  source_type: string | null
  policy_ids: number[] | null
  masked_columns: string[] | null
  row_filter_applied: boolean | null
  returned_rows: number | null
  created_at: string
}

interface UserRaw {
  id: number
  username: string
}

interface DatasetRaw {
  id: number
  name: string
}

interface FormattedLog {
  id: number
  action: string
  user: string
  resource: string
  timestamp: string
  status: 'success' | 'failed'
  error_reason?: string
  masked_columns?: string[]
  row_filter_applied?: boolean
}

export function AuditTrails() {
  const [currentPage, setCurrentPage] = useState(1)
  const [logs, setLogs] = useState<FormattedLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const itemsPerPage = 12

  const fetchLogs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [rawLogs, users, datasets] = await Promise.all([
        apiFetch<AuditLogRaw[]>('/audit/logs?limit=1000'),
        apiFetch<UserRaw[]>('/users'),
        apiFetch<DatasetRaw[]>('/datasets')
      ])

      const userMap = new Map(users.map(u => [u.id, u.username]))
      const datasetMap = new Map(datasets.map(d => [d.id, d.name]))

      const formatted = rawLogs.map(log => {
        let action = 'Data Access Attempt'
        if (log.source_type === 'query_api') {
          action = 'Catalog Query (API)'
        } else if (log.source_type === 'notebook') {
          action = 'Notebook Run'
        }

        const username = userMap.get(log.user_id) || `User #${log.user_id}`
        const datasetName = log.dataset_id ? (datasetMap.get(log.dataset_id) || `Dataset #${log.dataset_id}`) : 'N/A'
        
        const date = new Date(log.created_at)
        const timestamp = date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(',', '')

        // Helper to safely parse JSON strings or return arrays
        const parseJsonArray = (val: any): string[] | undefined => {
          if (!val) return undefined
          if (Array.isArray(val)) return val
          try {
            return JSON.parse(val)
          } catch {
            return undefined
          }
        }

        return {
          id: log.id,
          action,
          user: username,
          resource: datasetName,
          timestamp,
          status: log.outcome === 'ALLOWED' ? 'success' as const : 'failed' as const,
          error_reason: log.error_reason || undefined,
          masked_columns: parseJsonArray(log.masked_columns),
          row_filter_applied: log.row_filter_applied || undefined
        }
      })

      setLogs(formatted)
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err)
      setError(err.message || 'Failed to load audit trails.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const totalPages = Math.ceil(logs.length / itemsPerPage)
  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="p-6 max-w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Audit Trails</h2>
          <p className="text-sm text-text-muted mt-1">Comprehensive audit log of all system actions</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-input border border-border rounded text-xs font-semibold text-text-primary hover:bg-bg-hover disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-500/20 text-red-200 px-4 py-3 rounded flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted gap-2">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs">Loading audit events...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-input">
                  <th className="text-left px-4 py-3 text-text-secondary font-semibold uppercase text-xs">Action</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-semibold uppercase text-xs">User</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-semibold uppercase text-xs">Resource</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-semibold uppercase text-xs">Timestamp</th>
                  <th className="text-center px-4 py-3 text-text-secondary font-semibold uppercase text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log, idx) => (
                  <tr 
                    key={log.id} 
                    className={`border-b border-border hover:bg-border/50 transition-colors ${
                      idx === paginatedLogs.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-text-primary font-medium">{log.action}</span>
                        {log.error_reason && (
                          <span className="text-[11px] text-red-400 mt-0.5">
                            Reason: {log.error_reason}
                          </span>
                        )}
                        {(log.masked_columns || log.row_filter_applied) && (
                          <div className="flex flex-wrap gap-1.5 mt-1 select-none">
                            {log.masked_columns && log.masked_columns.length > 0 && (
                              <span className="inline-flex items-center text-[10px] bg-yellow-500/10 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                Masked ({log.masked_columns.length} cols)
                              </span>
                            )}
                            {log.row_filter_applied && (
                              <span className="inline-flex items-center text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">
                                Row Filter
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <UserBadge username={log.user} avatarSize="xs" isClickable={true} />
                    </td>
                    <td className="px-4 py-3 text-[#569cd6] font-mono text-xs">{log.resource}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{log.timestamp}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'success'
                            ? 'bg-[#6a9955]/20 text-[#b5dc94] border border-[#6a9955]/40'
                            : 'bg-[#f44747]/20 text-[#ff9999] border border-[#f44747]/40'
                        }`}
                      >
                        {log.status === 'success' ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#b5dc94]" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-[#ff9999]" />
                        )}
                        {log.status === 'success' ? 'Allowed' : 'Denied'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {logs.length > itemsPerPage && (
              <div className="flex items-center justify-between border-t border-border pt-4 mt-6 select-none">
                <div className="text-xs text-text-secondary">
                  Showing <span className="font-semibold text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, logs.length)}</span> of{' '}
                  <span className="font-semibold text-text-primary">{logs.length}</span> entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-input border border-border rounded text-[11px] font-semibold hover:bg-bg-hover disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 bg-input border border-border rounded text-[11px] font-semibold hover:bg-bg-hover disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
