'use client'

import { Lock, CheckCircle, AlertCircle, Copy } from 'lucide-react'
import { useState } from 'react'

export function CatalogExplorer() {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  const catalogs = [
    {
      id: 1,
      name: 'corporate_financial_catalog',
      classification: 'Restricted PII',
      status: 'granted',
      tables: 2,
    },
    {
      id: 2,
      name: 'sales_metrics_catalog',
      classification: 'Confidential',
      status: 'pending',
      tables: 4,
    },
    {
      id: 3,
      name: 'marketing_data_catalog',
      classification: 'Internal',
      status: 'required',
      tables: 3,
    },
  ]

  const getStatusBadge = (status: string) => {
    const styles = {
      granted: 'bg-[#6a9955] text-white',
      pending: 'bg-[#ce9178] text-white',
      required: 'bg-[#606060] text-[#cccccc]',
    }
    const labels = {
      granted: 'Granted',
      pending: 'Pending',
      required: 'Required',
    }
    return (
      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-sm ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const handleCopy = (id: string) => {
    setCopiedSnippet(id)
    setTimeout(() => setCopiedSnippet(null), 2000)
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="space-y-4">
        {catalogs.map((catalog) => (
          <div key={catalog.id} className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6 hover:border-[#37373d] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#cccccc] mb-2">{catalog.name}</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-2 py-1 bg-[#37373d] text-[#569cd6] rounded text-xs font-medium">
                    {catalog.classification}
                  </span>
                  <span className="text-[#a3a3a3]">{catalog.tables} tables</span>
                </div>
              </div>
              <div>{getStatusBadge(catalog.status)}</div>
            </div>

            {catalog.status === 'granted' && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">Python SDK Query</label>
                <div className="bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm p-3 flex items-start justify-between gap-4">
                  <pre className="text-xs text-[#569cd6] font-mono overflow-x-auto flex-1">
{`import dep_sdk
df = dep_sdk.read_dataset("${catalog.name}")
print(df.head())`}
                  </pre>
                  <button
                    onClick={() => handleCopy(catalog.id.toString())}
                    className="flex items-center gap-2 px-3 py-1 bg-[#007acc] text-white text-xs font-medium rounded hover:bg-[#0e639c] transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedSnippet === catalog.id.toString() ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {catalog.status === 'pending' && (
              <div className="mt-4 p-3 bg-[#ce9178] bg-opacity-10 border border-[#ce9178] border-opacity-30 rounded-sm text-xs text-[#ce9178]">
                Awaiting Onboarder Approval
              </div>
            )}

            {catalog.status === 'required' && (
              <button className="mt-4 px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors w-full">
                Request Access
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
