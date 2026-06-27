'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Search, Plus, ChevronDown } from 'lucide-react'

interface DropdownOption {
  id: string
  label: string
  description?: string
}

interface SearchableDropdownProps {
  options: DropdownOption[]
  selected: DropdownOption | null
  onSelect: (option: DropdownOption) => void
  onCreateNew?: () => void
  placeholder?: string
  searchPlaceholder?: string
  label?: string
  description?: string
}

export function SearchableDropdown({
  options,
  selected,
  onSelect,
  onCreateNew,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  label,
  description,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.description?.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-muted mb-2">{description}</p>
      )}

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-input border border-border rounded text-left text-text-primary hover:border-primary focus:border-primary focus:outline-none transition-colors flex items-center justify-between"
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-text-secondary transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded shadow-lg z-50">
            {/* Search Field */}
            <div className="border-b border-border p-2">
              <div className="flex items-center gap-2 px-2 py-1 bg-input rounded">
                <Search className="w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-text-primary text-sm placeholder-text-muted"
                  autoFocus
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-card scrollbar-thumb-border">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onSelect(option)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-border transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="text-sm text-text-primary font-medium">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-text-muted mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-text-muted text-sm">
                  No results found
                </div>
              )}
            </div>

            {/* Create New Button */}
            {onCreateNew && (
              <button
                onClick={() => {
                  onCreateNew()
                  setIsOpen(false)
                  setSearch('')
                }}
                className="w-full px-3 py-2 border-t border-border flex items-center gap-2 text-primary hover:bg-border transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create New
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
