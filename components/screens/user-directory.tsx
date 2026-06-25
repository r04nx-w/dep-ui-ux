'use client'

import { Plus, Edit2, Trash2, ToggleLeft } from 'lucide-react'

export function UserDirectory() {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@company.com', role: 'Analyst', status: 'active' },
    { id: 2, name: 'Maria Chen', email: 'maria@company.com', role: 'Data Onboarder', status: 'active' },
    { id: 3, name: 'aditi', email: 'aditi@company.com', role: 'Data Onboarder', status: 'active' },
    { id: 4, name: 'Alice Johnson', email: 'alice@company.com', role: 'Analyst', status: 'inactive' },
  ]

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#cccccc]">User Directory</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2b2b2b]">
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Name</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Email</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Role</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Status</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#2b2b2b] hover:bg-[#2d2d2d] transition-colors">
                  <td className="p-3 text-[#cccccc]">{user.name}</td>
                  <td className="p-3 text-[#a3a3a3]">{user.email}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-1 bg-[#37373d] text-[#569cd6] text-xs rounded">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        user.status === 'active'
                          ? 'bg-[#6a9955] bg-opacity-20 text-[#6a9955]'
                          : 'bg-[#606060] bg-opacity-20 text-[#a3a3a3]'
                      }`}
                    >
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#569cd6]">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#ce9178]">
                        <ToggleLeft className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#f44747]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
