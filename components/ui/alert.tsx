'use client'

import React, { useEffect } from 'react'
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'

interface AlertProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function Alert({
  isOpen,
  onClose,
  type,
  title,
  message,
  duration,
  action,
}: AlertProps) {
  useEffect(() => {
    if (isOpen && duration) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  const typeConfig = {
    success: {
      bgColor: 'bg-[#6a9955]/10',
      borderColor: 'border-[#6a9955]/30',
      iconColor: '#6a9955',
      titleColor: '#7cb342',
      Icon: CheckCircle,
    },
    error: {
      bgColor: 'bg-[#f44747]/10',
      borderColor: 'border-[#f44747]/30',
      iconColor: '#f44747',
      titleColor: '#ff6b6b',
      Icon: AlertCircle,
    },
    warning: {
      bgColor: 'bg-[#ce9178]/10',
      borderColor: 'border-[#ce9178]/30',
      iconColor: '#ce9178',
      titleColor: '#ffb84d',
      Icon: AlertTriangle,
    },
    info: {
      bgColor: 'bg-[#569cd6]/10',
      borderColor: 'border-[#569cd6]/30',
      iconColor: '#569cd6',
      titleColor: '#64b5f6',
      Icon: Info,
    },
  }

  const config = typeConfig[type]
  const IconComponent = config.Icon

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4">
      <div
        className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 shadow-lg`}
      >
        <div className="flex items-start gap-3">
          <IconComponent
            className="w-5 h-5 mt-0.5 flex-shrink-0"
            style={{ color: config.iconColor }}
          />
          <div className="flex-1">
            <h3 className="font-semibold mb-1" style={{ color: config.titleColor }}>
              {title}
            </h3>
            <p className="text-sm text-[#a0a0a0]">{message}</p>
            {action && (
              <button
                onClick={action.onClick}
                className="mt-3 text-sm font-medium px-3 py-1 rounded hover:bg-[#2b2b2b] transition-colors text-[#e8e8e8]"
              >
                {action.label}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#2b2b2b] rounded transition-colors text-[#a0a0a0] hover:text-[#e8e8e8] flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
