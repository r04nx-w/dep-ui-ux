'use client'

import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`${sizeClasses[size]} w-full mx-4 bg-[#1e1e1e] border border-[#2b2b2b] rounded-lg shadow-2xl`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#2b2b2b] px-6 py-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#e8e8e8]">{title}</h2>
            {description && (
              <p className="text-sm text-[#808080] mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 hover:bg-[#2b2b2b] rounded transition-colors text-[#a0a0a0] hover:text-[#e8e8e8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-track-[#1e1e1e] scrollbar-thumb-[#2b2b2b] hover:scrollbar-thumb-[#37373d]">
          {children}
        </div>
      </div>
    </div>
  )
}
