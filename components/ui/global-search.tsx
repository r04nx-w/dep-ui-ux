'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  type: 'catalog' | 'dataset' | 'user' | 'project' | 'notebook'
  description?: string
}

const allResults: SearchResult[] = [
  { id: '1', title: 'corporate_financial_catalog', type: 'catalog', description: 'Financial records' },
  { id: '2', title: 'sales_metrics_catalog', type: 'catalog', description: 'Sales data' },
  { id: '3', title: 'Q4 Financial Analysis', type: 'project', description: 'Active project' },
  { id: '4', title: 'Analysis_Q4.ipynb', type: 'notebook', description: 'Recent notebook' },
  { id: '5', title: 'Maria Chen', type: 'user', description: 'Team member' },
  { id: '6', title: 'Customer Analytics', type: 'catalog', description: 'Customer data' },
]

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

  const typeColors: Record<SearchResult['type'], string> = {
    catalog: 'bg-[#569cd6]/20 text-[#569cd6]',
    dataset: 'bg-[#6a9955]/20 text-[#6a9955]',
    user: 'bg-[#ce9178]/20 text-[#ce9178]',
    project: 'bg-[#007acc]/20 text-[#007acc]',
    notebook: 'bg-[#d4a96f]/20 text-[#d4a96f]',
  }

  useEffect(() => {
    if (query.trim()) {
      const filtered = allResults.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.description?.toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered)
    } else {
      setResults([])
    }
  }, [query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808080]" />
        <input
          type="text"
          placeholder="Search catalogs, projects, users..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="w-80 pl-10 pr-10 py-2 bg-[#2d2d2d] border border-[#2b2b2b] rounded text-sm text-[#e8e8e8] placeholder-[#606060] focus:outline-none focus:border-[#007acc]"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#808080] hover:text-[#e8e8e8]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (results.length > 0 || query.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e1e1e] border border-[#2b2b2b] rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    setQuery('')
                    setResults([])
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#2d2d2d] transition-colors border-b border-[#2b2b2b] last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-[#e8e8e8] font-medium">
                        {result.title}
                      </p>
                      {result.description && (
                        <p className="text-xs text-[#808080] mt-0.5">
                          {result.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ml-2 ${typeColors[result.type]}`}
                    >
                      {result.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[#808080]">No results found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
