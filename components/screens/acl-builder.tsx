'use client'

import { Trash2 } from 'lucide-react'

export function ACLBuilder() {
  return (
    <div className="p-6 max-w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: ACL Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4">
            <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">Target Group</label>
            <select className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]">
              <option>Analysts</option>
              <option>MarketingAnalysts</option>
              <option>Individual Users</option>
            </select>
          </div>

          <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-3">Column Access</h4>
            <div className="space-y-2">
              {['id', 'email', 'signup_date', 'phone', 'address'].map((col) => (
                <div key={col} className="flex items-center gap-2 p-2 bg-[#2d2d2d] rounded">
                  <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer" />
                  <span className="text-xs text-[#cccccc] flex-1">{col}</span>
                  <button className="text-xs px-2 py-1 bg-[#37373d] text-[#ce9178] hover:bg-[#ce9178] hover:text-white rounded transition-colors">
                    Mask
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-3">Row Filters</h4>
            <div className="space-y-2 mb-3">
              <select className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-2 py-1 text-xs text-[#cccccc]">
                <option>AND</option>
                <option>OR</option>
              </select>
              {['country EQUALS "US"', 'order_value > 100'].map((rule, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-[#2d2d2d] rounded text-xs text-[#cccccc]">
                  {rule}
                  <button className="ml-auto text-[#f44747] hover:bg-[#f44747] hover:text-white p-1 rounded transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full text-xs px-2 py-1 bg-[#2d2d2d] text-[#569cd6] hover:bg-[#37373d] rounded transition-colors">
              + Add Filter
            </button>
          </div>

          <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-3">Access Duration</h4>
            <div className="space-y-2 mb-3">
              {['24 Hours', '7 Days', '30 Days'].map((duration) => (
                <button key={duration} className="w-full text-xs px-2 py-1 bg-[#2d2d2d] text-[#cccccc] hover:bg-[#37373d] rounded transition-colors">
                  {duration}
                </button>
              ))}
            </div>
          </div>

          <button className="w-full px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors">
            Deploy Policy
          </button>
        </div>

        {/* Right Panel: Live Preview */}
        <div className="lg:col-span-2">
          <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-4">
            <h4 className="text-sm font-semibold text-[#cccccc] mb-4">Live Policy Preview</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#2b2b2b]">
                    <th className="text-left p-2 text-[#569cd6]">id</th>
                    <th className="text-left p-2 text-[#569cd6]">email</th>
                    <th className="text-left p-2 text-[#569cd6] opacity-50">signup_date (MASKED)</th>
                    <th className="text-left p-2 text-[#f44747]">phone (BLOCKED)</th>
                    <th className="text-left p-2 text-[#569cd6]">country</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row} className="border-b border-[#2b2b2b] hover:bg-[#2d2d2d]">
                      <td className="p-2 text-[#cccccc]">{row}</td>
                      <td className="p-2 text-[#cccccc]">user{row}@example.com</td>
                      <td className="p-2 text-[#ce9178]">***MASKED***</td>
                      <td className="p-2 text-[#606060]">-</td>
                      <td className="p-2 text-[#cccccc]">US</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#6a9955] mt-4 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#6a9955] rounded-full"></span>
              3 rows visible with applied policies
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
