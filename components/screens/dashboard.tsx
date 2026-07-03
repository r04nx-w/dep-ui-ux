'use client'

import { useState, useEffect } from 'react'
import { Database, FileText, Users, FolderKanban, ShieldCheck, Play, Sparkles, FolderOpen, RefreshCw, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface DashboardProps {
  userRole: 'admin' | 'onboarder' | 'analyst'
  onNavigate?: (page: string) => void
}

interface DatasetRaw {
  id: number
  name: string
  source_type: string
  status: string
}

interface UserRaw {
  id: number
  status: string
  username: string
}

interface AccessRequestRaw {
  id: number
  dataset_name?: string
  dataset_id?: number
  status: string
  created_at: string
}

interface AuditLogRaw {
  id: number
  user_id: number
  dataset_id: number | null
  outcome: string
  source_type: string | null
  created_at: string
}

interface PermittedDatasetRaw {
  dataset_name: string
  allowed_columns: string[]
}

interface StatItem {
  label: string
  value: string | number
  icon: any
  color: string
}

interface ActivityItem {
  action: string
  user: string
  time: string
  status?: 'success' | 'failed' | 'pending'
}

export function Dashboard({ userRole, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<StatItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (userRole === 'admin' || userRole === 'onboarder') {
        // Fetch Admin Dashboard Data
        const [datasets, users, requests, auditLogs] = await Promise.all([
          apiFetch<DatasetRaw[]>('/datasets'),
          apiFetch<UserRaw[]>('/users'),
          apiFetch<AccessRequestRaw[]>('/access-requests'),
          apiFetch<AuditLogRaw[]>('/audit/logs?limit=5').catch(() => []) // Gracefully fallback if forbidden
        ])

        const userMap = new Map(users.map(u => [u.id, u.username]))
        const datasetMap = new Map(datasets.map(d => [d.id, d.name]))

        const activeCatalogs = datasets.length
        const activeConnections = datasets.filter(d => d.source_type !== 'csv' && d.status === 'active').length
        const pendingRequests = requests.filter(r => r.status.toLowerCase() === 'pending').length
        const activeUsersCount = users.filter(u => u.status === 'active').length

        setStats([
          { label: 'Data Catalogs', value: activeCatalogs, icon: Database, color: 'text-primary' },
          { label: 'Active DB Connections', value: activeConnections, icon: Database, color: 'text-success' },
          { label: 'Pending Requests', value: pendingRequests, icon: FileText, color: 'text-warning' },
          { label: 'Active Users', value: activeUsersCount, icon: Users, color: 'text-info' },
        ])

        // Form compact activities list from audit logs
        const formattedLogs = auditLogs.map(log => {
          let action = 'Data access attempt'
          if (log.source_type === 'query_api') {
            action = 'Catalog Query (API)'
          } else if (log.source_type === 'notebook') {
            action = 'Notebook Run'
          }

          const username = userMap.get(log.user_id) || `User #${log.user_id}`
          const datasetName = log.dataset_id ? (datasetMap.get(log.dataset_id) || `Dataset #${log.dataset_id}`) : ''
          const targetText = datasetName ? ` on "${datasetName}"` : ''

          // Format relative time helper
          const time = getRelativeTime(new Date(log.created_at))

          return {
            action: `${action}${targetText} was ${log.outcome.toLowerCase()}`,
            user: username,
            time,
            status: log.outcome === 'ALLOWED' ? ('success' as const) : ('failed' as const)
          }
        })

        // If no audit logs yet, put a fallback
        if (formattedLogs.length === 0) {
          formattedLogs.push({
            action: 'System initialized and ready',
            user: 'System',
            time: 'Just now',
            status: 'success'
          })
        }

        setActivities(formattedLogs)
      } else {
        // Fetch Analyst Dashboard Data
        const [permittedDatasets, requests, workspaces] = await Promise.all([
          apiFetch<PermittedDatasetRaw[]>('/access/datasets/me'),
          apiFetch<AccessRequestRaw[]>('/access-requests/mine'),
          apiFetch<any[]>('/workspaces').catch(() => []) // Fallback
        ])

        const permittedCount = permittedDatasets.length
        const pendingCount = requests.filter(r => r.status.toLowerCase() === 'pending').length
        const totalAllowedColumns = permittedDatasets.reduce((sum, d) => sum + d.allowed_columns.length, 0)
        const activeWorkspacesCount = workspaces.length || 0

        setStats([
          { label: 'My Permitted Catalogs', value: permittedCount, icon: Database, color: 'text-primary' },
          { label: 'Active Workspaces', value: activeWorkspacesCount, icon: FolderKanban, color: 'text-success' },
          { label: 'Pending Requests', value: pendingCount, icon: FileText, color: 'text-warning' },
          { label: 'Allowed Data Fields', value: totalAllowedColumns, icon: ShieldCheck, color: 'text-info' },
        ])

        // Form compact activities list from analyst access requests
        const formattedRequests = requests.slice(0, 5).map(r => {
          const time = getRelativeTime(new Date(r.created_at))
          const name = r.dataset_name || 'Dataset access'
          return {
            action: `Access request for "${name}"`,
            user: 'You',
            time,
            status: r.status.toLowerCase() as any
          }
        })

        if (formattedRequests.length === 0) {
          formattedRequests.push({
            action: 'No recent activity. Explore catalogs to request data access!',
            user: 'System',
            time: 'Just now'
          })
        }

        setActivities(formattedRequests)
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err)
      setError(err.message || 'Failed to load dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }

  // Relative time formatter helper
  const getRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 600)
    const diffDay = Math.floor(diffHr / 24)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    return `${diffDay}d ago`
  }

  useEffect(() => {
    fetchDashboardData()
  }, [userRole])

  // Define Quick Actions based on Role
  const quickActions = userRole === 'admin' || userRole === 'onboarder'
    ? [
        { title: 'Create New Catalog', desc: 'Organize source datasets into logical catalogs', page: 'catalog', icon: Database },
        { title: 'Review Access Requests', desc: 'Approve or deny pending analyst requests', page: 'acl', icon: FileText },
        { title: 'Configure ACL Policies', desc: 'Set up row-level or column-masking rules', page: 'acl', icon: ShieldCheck },
      ]
    : [
        { title: 'Request Dataset Access', desc: 'Browse catalogs and request new data fields', page: 'access', icon: FileText },
        { title: 'Launch Jupyter Notebook', desc: 'Start writing Python code in your workspace', page: 'workspaces', icon: Play },
        { title: 'View Saved Artifacts', desc: 'Review dataset summaries and model outputs', page: 'artifacts', icon: FolderOpen },
      ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome back!</h1>
          <p className="text-text-muted">
            {userRole === 'admin'
              ? 'You have full administrative access to the platform.'
              : userRole === 'onboarder'
              ? 'Manage data sources, catalogs, and access control policies.'
              : 'Explore available datasets and manage your data access requests.'}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-sm p-4 animate-pulse h-28 flex flex-col justify-between">
                <div className="h-4 bg-border rounded w-2/3"></div>
                <div className="h-8 bg-border rounded w-1/3 mt-2"></div>
              </div>
            ))
          : stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="bg-card border border-border rounded-sm p-4 hover:border-[#37373d] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      {stat.label}
                    </h3>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-text-primary">{stat.value}</div>
                  <p className="text-[10px] text-text-muted mt-1">Live platform count</p>
                </div>
              )
            })}
      </div>

      {/* Recent Activity - Compact styling as requested */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Recent Activity</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 bg-input rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {activities.map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between py-2 text-xs hover:bg-bg-hover/30 px-2 rounded-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  {item.status && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'success' || item.status === 'approved'
                        ? 'bg-[#6a9955]'
                        : item.status === 'failed' || item.status === 'rejected'
                        ? 'bg-[#f44747]'
                        : 'bg-yellow-500'
                    }`} />
                  )}
                  <span className="text-text-primary font-medium">{item.action}</span>
                  <span className="text-text-muted text-[10px]">by {item.user}</span>
                </div>
                <span className="text-text-secondary text-[10px] font-mono">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon
            return (
              <div
                key={i}
                onClick={() => onNavigate && onNavigate(action.page)}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary hover:bg-card cursor-pointer transition-colors group flex items-start gap-3"
              >
                <div className="p-2 bg-input rounded group-hover:text-primary transition-colors">
                  <Icon className="w-4 h-4 text-text-secondary group-hover:text-primary" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{action.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
