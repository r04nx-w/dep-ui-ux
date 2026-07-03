'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'
  titleAction?: React.ReactNode
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  titleAction,
}: ModalProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
      setTimeout(() => setIsVisible(false), 200)
    }
  }, [isOpen])

  if (!isVisible) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '3xl': 'max-w-4xl',
    '4xl': 'max-w-5xl',
    '5xl': 'max-w-6xl',
    '6xl': 'max-w-7xl',
  }

  const modalContent = (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 md:py-10 ${isAnimating ? 'animate-backdrop-in' : ''}`}>
      <div
        className={`${sizeClasses[size]} w-full bg-card border border-border rounded-lg shadow-2xl my-auto transition-all duration-300 ${
          isAnimating ? 'animate-scale-in' : 'opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4 animate-stagger-1">
          <div className="flex-1 flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
              {description && (
                <p className="text-sm text-text-secondary mt-1">{description}</p>
              )}
            </div>
            {titleAction && <div className="ml-2">{titleAction}</div>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 hover:bg-bg-hover rounded transition-all duration-200 text-text-secondary hover:text-text-primary active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-track-card scrollbar-thumb-border hover:scrollbar-thumb-bg-hover text-text-primary animate-stagger-2">
          {children}
        </div>
      </div>
    </div>
  )

  if (mounted) {
    return createPortal(modalContent, document.body)
  }

  return null
}
