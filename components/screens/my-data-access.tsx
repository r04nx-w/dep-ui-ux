'use client'

import { Copy } from 'lucide-react'
import { useState } from 'react'

export function MyDataAccess() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (id: string) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">My Permitted Datasets</h3>
        <div className="space-y-4">
          {[
            { name: 'corporate_financial_catalog', tables: ['customers', 'orders', 'transactions'], cols: 12 },
            { name: 'sales_metrics_catalog', tables: ['sales_daily', 'sales_monthly'], cols: 8 },
          ].map((dataset, i) => (
            <div key={i} className="border border-[#2b2b2b] rounded-sm p-4 bg-[#2d2d2d]">
              <h4 className="text-sm font-semibold text-[#cccccc] mb-3">{dataset.name}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div>
                  <span className="text-xs text-[#a3a3a3]">Tables</span>
                  <p className="text-sm font-semibold text-[#cccccc]">{dataset.tables.length}</p>
                </div>
                <div>
                  <span className="text-xs text-[#a3a3a3]">Columns</span>
                  <p className="text-sm font-semibold text-[#cccccc]">{dataset.cols}</p>
                </div>
                <div>
                  <span className="text-xs text-[#a3a3a3]">Status</span>
                  <p className="text-sm font-semibold text-[#6a9955]">Active</p>
                </div>
                <div>
                  <span className="text-xs text-[#a3a3a3]">Expires</span>
                  <p className="text-sm font-semibold text-[#cccccc]">90 days</p>
                </div>
              </div>
              <div className="text-xs text-[#a3a3a3]">
                Tables: {dataset.tables.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SDK Snippet */}
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Python SDK Snippet</h3>
        <div className="bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm p-4">
          <pre className="text-xs text-[#569cd6] font-mono overflow-x-auto mb-4">
{`import dep_sdk
import pandas as pd

# Read the governed dataset catalog
df = dep_sdk.read_dataset("corporate_financial_catalog")

# Display first 5 rows
print(df.head())

# Perform analysis
summary = df.describe()
print(summary)`}
          </pre>
          <button
            onClick={() => handleCopy('sdk')}
            className="flex items-center gap-2 px-4 py-2 bg-[#007acc] text-white text-sm font-medium rounded hover:bg-[#0e639c] transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copiedId === 'sdk' ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>
    </div>
  )
}
