'use client'

export function AuditTrails() {
  const auditLogs = [
    { id: 1, action: 'Data access granted', user: 'super_admin', resource: 'corporate_financial_catalog', timestamp: '2024-06-25 14:32:15', status: 'success' },
    { id: 2, action: 'ACL policy deployed', user: 'aditi', resource: 'sales_metrics_catalog', timestamp: '2024-06-25 13:21:42', status: 'success' },
    { id: 3, action: 'User created', user: 'super_admin', resource: 'john@company.com', timestamp: '2024-06-25 11:45:20', status: 'success' },
    { id: 4, action: 'Database connection test', user: 'aditi', resource: 'postgres_db', timestamp: '2024-06-25 10:12:08', status: 'failed' },
    { id: 5, action: 'Notebook locked', user: 'maria_chen', resource: 'Analysis_Q4.ipynb', timestamp: '2024-06-24 16:33:55', status: 'success' },
  ]

  return (
    <div className="p-6 max-w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#e8e8e8]">Audit Trails</h2>
        <p className="text-sm text-[#808080] mt-1">Comprehensive audit log of all system actions</p>
      </div>

      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2b2b2b] bg-[#2d2d2d]">
                <th className="text-left px-4 py-3 text-[#a0a0a0] font-semibold uppercase text-xs">Action</th>
                <th className="text-left px-4 py-3 text-[#a0a0a0] font-semibold uppercase text-xs">User</th>
                <th className="text-left px-4 py-3 text-[#a0a0a0] font-semibold uppercase text-xs">Resource</th>
                <th className="text-left px-4 py-3 text-[#a0a0a0] font-semibold uppercase text-xs">Timestamp</th>
                <th className="text-center px-4 py-3 text-[#a0a0a0] font-semibold uppercase text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, idx) => (
                <tr 
                  key={log.id} 
                  className={`border-b border-[#2b2b2b] hover:bg-[#2b2b2b]/50 transition-colors ${
                    idx === auditLogs.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-[#e8e8e8] font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-[#a0a0a0]">{log.user}</td>
                  <td className="px-4 py-3 text-[#569cd6]">{log.resource}</td>
                  <td className="px-4 py-3 text-[#a0a0a0] font-mono text-xs">{log.timestamp}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${
                        log.status === 'success'
                          ? 'bg-[#6a9955]/20 text-[#b5dc94] border border-[#6a9955]/40'
                          : 'bg-[#f44747]/20 text-[#ff9999] border border-[#f44747]/40'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-[#6a9955]' : 'bg-[#f44747]'}`}></span>
                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
