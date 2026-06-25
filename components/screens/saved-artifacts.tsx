'use client'

import { Download, Eye, Trash2, Share2, Upload } from 'lucide-react'

export function SavedArtifacts() {
  const artifacts = [
    { name: 'sales_report_Q4.csv', type: 'CSV', size: '2.4 MB', source: 'Financial Analysis', date: '2 hours ago' },
    { name: 'customer_viz.png', type: 'PNG', size: '845 KB', source: 'Segmentation', date: '1 day ago' },
    { name: 'forecast_2025.pdf', type: 'PDF', size: '3.2 MB', source: 'Revenue Forecasting', date: '3 days ago' },
    { name: 'dashboard_export.html', type: 'HTML', size: '1.1 MB', source: 'Analytics', date: '1 week ago' },
  ]

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[#cccccc]">Saved Artifacts</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors">
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2b2b2b]">
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Filename</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Type</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Size</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Source</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Date</th>
                <th className="text-left p-3 text-[#a3a3a3] font-semibold uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artifacts.map((art, i) => (
                <tr key={i} className="border-b border-[#2b2b2b] hover:bg-[#2d2d2d] transition-colors">
                  <td className="p-3 text-[#cccccc]">{art.name}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-1 bg-[#37373d] text-[#569cd6] text-xs rounded">
                      {art.type}
                    </span>
                  </td>
                  <td className="p-3 text-[#a3a3a3]">{art.size}</td>
                  <td className="p-3 text-[#a3a3a3]">{art.source}</td>
                  <td className="p-3 text-[#a3a3a3]">{art.date}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#569cd6] hover:text-[#007acc]" title="Preview">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#6a9955] hover:text-[#7ab96d]" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#ce9178] hover:text-[#e0a478]" title="Share">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-[#37373d] rounded transition-colors text-[#f44747] hover:bg-[#f44747] hover:text-white" title="Delete">
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
