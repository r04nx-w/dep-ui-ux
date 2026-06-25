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
    <div className="p-6 max-w-6xl space-y-6">
      <h2 className="text-2xl font-bold text-[#cccccc]">Audit Trails</h2>

      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2b2b2b]">
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Action</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">User</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Resource</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Timestamp</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-[#2b2b2b] hover:bg-[#2d2d2d] transition-colors">
                  <td className="p-3 text-[#cccccc]">{log.action}</td>
                  <td className="p-3 text-[#a3a3a3]">{log.user}</td>
                  <td className="p-3 text-[#569cd6]">{log.resource}</td>
                  <td className="p-3 text-[#a3a3a3] font-mono text-xs">{log.timestamp}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                        log.status === 'success'
                          ? 'bg-[#6a9955] bg-opacity-20 text-[#6a9955]'
                          : 'bg-[#f44747] bg-opacity-20 text-[#f44747]'
                      }`}
                    >
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
