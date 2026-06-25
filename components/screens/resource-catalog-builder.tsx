'use client'

import { ChevronRight } from 'lucide-react'

export function ResourceCatalogBuilder() {
  return (
    <div className="p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Catalog Info */}
        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
          <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Create Catalog</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
                Catalog Name
              </label>
              <input
                type="text"
                placeholder="corporate_financial_catalog"
                className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
                Description
              </label>
              <textarea
                placeholder="Unified customer transaction and sales details"
                className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc] h-24 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
                Target Data Source
              </label>
              <select className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]">
                <option>sales_oltp (MySQL)</option>
                <option>customer_analytics (PostgreSQL)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Selection */}
        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
          <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Select Tables</h3>
          <div className="space-y-2">
            {[
              { name: 'public.customers', cols: 4 },
              { name: 'public.orders', cols: 3 },
              { name: 'public.transactions', cols: 5 },
            ].map((table) => (
              <div key={table.name} className="flex items-center gap-3 p-3 bg-[#2d2d2d] rounded-sm hover:bg-[#37373d] transition-colors cursor-pointer">
                <input type="checkbox" className="w-4 h-4 cursor-pointer" />
                <div className="flex-1">
                  <p className="text-sm text-[#cccccc] font-medium">{table.name}</p>
                  <p className="text-xs text-[#606060]">{table.cols} columns</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#606060]" />
              </div>
            ))}
          </div>
        </div>

        {/* Governance Metadata */}
        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
          <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Governance Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
                Data Classification
              </label>
              <select className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]">
                <option>Public</option>
                <option>Internal</option>
                <option>Confidential</option>
                <option>Restricted PII</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
                Retention Policy
              </label>
              <select className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]">
                <option>1 Year</option>
                <option>3 Years</option>
                <option>7 Years</option>
                <option>Indefinite</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
                Business Tags
              </label>
              <select className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]" multiple>
                <option>Sales KPIs</option>
                <option>Customer Metadata</option>
                <option>Compliance GDPR</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button className="px-4 py-2 bg-[#2d2d2d] text-[#cccccc] rounded-sm text-sm font-medium hover:bg-[#37373d] transition-colors">
              Cancel
            </button>
            <button className="px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors">
              Create Catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
