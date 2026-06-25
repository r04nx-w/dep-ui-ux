'use client'

import { BarChart3, Database, FileText, Users } from 'lucide-react'

interface DashboardProps {
  userRole: 'admin' | 'onboarder' | 'analyst'
}

export function Dashboard({ userRole }: DashboardProps) {
  const stats = [
    { label: 'Data Catalogs', value: '24', icon: Database, color: '#007acc' },
    { label: 'Active Connections', value: '8', icon: Database, color: '#6a9955' },
    { label: 'Pending Requests', value: '3', icon: FileText, color: '#ce9178' },
    { label: 'Active Users', value: '47', icon: Users, color: '#569cd6' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#cccccc] mb-2">Welcome back!</h1>
        <p className="text-[#a3a3a3]">
          {userRole === 'admin'
            ? 'You have full administrative access to the platform.'
            : userRole === 'onboarder'
            ? 'Manage data sources, catalogs, and access control policies.'
            : 'Explore available datasets and manage your data access requests.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4 hover:border-[#37373d] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
                  {stat.label}
                </h3>
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div className="text-3xl font-bold text-[#cccccc]">{stat.value}</div>
              <p className="text-xs text-[#606060] mt-2">Last 30 days</p>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'Access request approved', user: 'John Doe', time: '2 hours ago' },
            { action: 'New dataset cataloged', user: 'Maria Chen', time: '5 hours ago' },
            { action: 'Connection test failed', user: 'System', time: '1 day ago' },
            { action: 'User directory updated', user: 'Admin', time: '2 days ago' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-[#2d2d2d] rounded-sm hover:bg-[#37373d] transition-colors">
              <div>
                <p className="text-sm text-[#cccccc]">{item.action}</p>
                <p className="text-xs text-[#606060]">by {item.user}</p>
              </div>
              <span className="text-xs text-[#a3a3a3]">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Create New Catalog', desc: 'Organize datasets into catalogs' },
          { title: 'Review Access Requests', desc: 'Manage pending data access requests' },
          { title: 'Configure ACL Policies', desc: 'Set up granular access controls' },
        ].map((action, i) => (
          <div
            key={i}
            className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4 hover:border-[#007acc] hover:bg-[#1e1e1e] cursor-pointer transition-colors group"
          >
            <h4 className="text-sm font-semibold text-[#cccccc] group-hover:text-[#007acc] transition-colors">
              {action.title}
            </h4>
            <p className="text-xs text-[#606060] mt-2">{action.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
