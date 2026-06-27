'use client'

import { Trash2 } from 'lucide-react'

export function ACLBuilder() {
  return (
    <div className="p-6 max-w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: ACL Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Target Group Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide mb-4">Target Group</h3>
            <select className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-[#007acc]">
              <option>Analysts</option>
              <option>MarketingAnalysts</option>
              <option>Individual Users</option>
            </select>
          </div>

          {/* Column Access Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide mb-4">Column Access</h3>
            <div className="space-y-2">
              {['id', 'email', 'signup_date', 'phone', 'address'].map((col) => (
                <div key={col} className="flex items-center justify-between p-3 bg-input rounded hover:bg-bg-hover transition-colors">
                  <span className="text-sm text-text-primary font-medium">{col}</span>
                  <button className="text-xs px-3 py-1.5 bg-transparent text-[#ce9178] border border-[#ce9178]/40 hover:bg-[#ce9178]/20 rounded transition-colors font-medium">
                    Mask
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Row Filters Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide mb-4">Row Filters</h3>
            <div className="space-y-3">
              <select className="w-full bg-input border border-border rounded px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary">
                <option>AND</option>
                <option>OR</option>
              </select>
              {['country EQUALS "US"', 'order_value > 100'].map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-input rounded hover:bg-bg-hover transition-colors">
                  <span className="text-sm text-text-primary">{rule}</span>
                  <button className="text-[#f44747] hover:text-white p-1.5 hover:bg-[#f44747]/20 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full text-sm px-3 py-2.5 bg-input text-[#569cd6] hover:bg-bg-hover rounded transition-colors font-medium mt-3">
              + Add Filter
            </button>
          </div>

          {/* Access Duration Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide mb-4">Access Duration</h3>
            <div className="space-y-2">
              {['24 Hours', '7 Days', '30 Days'].map((duration) => (
                <button
                  key={duration}
                  className="w-full text-sm px-3 py-2.5 bg-input text-text-primary hover:bg-bg-hover rounded transition-colors font-medium"
                >
                  {duration}
                </button>
              ))}
            </div>
          </div>

          <button className="w-full px-4 py-3 bg-primary text-white rounded text-sm font-bold hover:bg-primary-hover transition-colors uppercase tracking-wide">
            Deploy Policy
          </button>
        </div>

        {/* Right Panel: Live Preview */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide mb-6">Live Policy Preview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-[#569cd6] font-semibold">id</th>
                    <th className="text-left p-3 text-[#569cd6] font-semibold">email</th>
                    <th className="text-left p-3 text-[#569cd6] font-semibold opacity-60">signup_date (MASKED)</th>
                    <th className="text-left p-3 text-[#f44747] font-semibold">phone (BLOCKED)</th>
                    <th className="text-left p-3 text-[#569cd6] font-semibold">country</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row} className="border-b border-border hover:bg-border/50 transition-colors">
                      <td className="p-3 text-text-primary">{row}</td>
                      <td className="p-3 text-text-primary">user{row}@example.com</td>
                      <td className="p-3 text-[#ce9178] font-mono">***MASKED***</td>
                      <td className="p-3 text-text-muted">-</td>
                      <td className="p-3 text-text-primary">US</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#6a9955] mt-6 flex items-center gap-2 font-medium">
              <span className="inline-block w-2 h-2 bg-[#6a9955] rounded-full"></span>
              3 rows visible with applied policies
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
