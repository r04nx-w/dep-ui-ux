'use client'

import { useState } from 'react'
import { Search, Zap, CheckCircle, AlertCircle, Database } from 'lucide-react'

export function DataSourcesHub() {
  const [activeTab, setActiveTab] = useState<'list' | 'sql' | 'csv'>('list')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [succeededId, setSucceededId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const connections = [
    { id: 1, name: 'sales_oltp', type: 'MySQL', host: '10.0.0.5', status: 'connected' },
    { id: 2, name: 'customer_analytics', type: 'PostgreSQL', host: 'localhost', status: 'connected' },
    { id: 3, name: 'sales_q1_raw.csv', type: 'CSV', host: 'uploaded', status: 'ready' },
  ]

  const handleTestConnection = (id: string) => {
    setTestingId(id)
    setTimeout(() => {
      setTestingId(null)
      setSucceededId(id)
    }, 1500)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Connections List */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4 h-fit">
            <h3 className="text-sm font-semibold text-[#cccccc] mb-4">Onboarded Connections</h3>
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060]" />
              <input
                type="text"
                placeholder="Search sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 pl-9 py-2 text-xs text-[#cccccc] focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div className="space-y-2">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-3 bg-[#2d2d2d] rounded-sm hover:bg-[#37373d] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-[#569cd6]" />
                    <span className="text-xs font-semibold text-[#cccccc]">{conn.name}</span>
                  </div>
                  <div className="text-xs text-[#a3a3a3]">{conn.type}</div>
                  <div className="text-xs text-[#606060] mt-1">{conn.host}</div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="inline-block w-2 h-2 bg-[#6a9955] rounded-full"></span>
                    <span className="text-xs text-[#6a9955]">Connected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:col-span-3">
          <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-[#2b2b2b] mb-6">
              {['list', 'sql', 'csv'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'list' | 'sql' | 'csv')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-[#007acc] text-[#007acc]'
                      : 'border-transparent text-[#a3a3a3] hover:text-[#cccccc]'
                  }`}
                >
                  {tab === 'list' ? 'Registered' : tab === 'sql' ? 'SQL Database' : 'CSV Upload'}
                </button>
              ))}
            </div>

            {activeTab === 'sql' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
                    Database Type
                  </label>
                  <div className="flex gap-2">
                    {['PostgreSQL', 'MySQL'].map((db) => (
                      <button
                        key={db}
                        className="flex-1 px-3 py-2 text-xs font-medium bg-[#2d2d2d] text-[#cccccc] rounded-sm hover:bg-[#37373d] transition-colors"
                      >
                        {db}
                      </button>
                    ))}
                  </div>
                </div>

                {['Host', 'Port', 'Database Name', 'Username', 'Password'].map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
                      {field}
                    </label>
                    <input
                      type={field === 'Password' ? 'password' : 'text'}
                      placeholder={field === 'Host' ? 'db.internal.net' : field === 'Port' ? '5432' : ''}
                      className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]"
                    />
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleTestConnection('conn-1')}
                    className={`flex-1 px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      succeededId === 'conn-1'
                        ? 'bg-[#6a9955] text-white'
                        : testingId === 'conn-1'
                        ? 'bg-[#2d2d2d] text-[#a3a3a3]'
                        : 'bg-[#2d2d2d] text-[#cccccc] hover:bg-[#37373d]'
                    }`}
                    disabled={testingId === 'conn-1'}
                  >
                    {succeededId === 'conn-1' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Connection Successful
                      </>
                    ) : testingId === 'conn-1' ? (
                      <>
                        <Zap className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                  <button className="flex-1 px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors">
                    Store Connection
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'csv' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-[#2b2b2b] rounded-sm p-8 text-center bg-[#2d2d2d] hover:border-[#37373d] transition-colors">
                  <Database className="w-12 h-12 text-[#606060] mx-auto mb-2" />
                  <p className="text-sm text-[#a3a3a3]">Drag and drop CSV files here, or browse</p>
                  <p className="text-xs text-[#606060] mt-1">Max: 50MB</p>
                </div>
                <input
                  type="text"
                  placeholder="Dataset Name"
                  className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]"
                />
                <textarea
                  placeholder="Dataset Description"
                  className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc] h-20 resize-none"
                />
                <button className="w-full px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors">
                  Upload CSV
                </button>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="text-center py-8">
                <p className="text-[#a3a3a3]">Select SQL Database or CSV Upload tab to add connections</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
