'use client'

import React, { useEffect, useState } from 'react'
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
  const [isAnimating, setIsAnimating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
      setTimeout(() => setIsVisible(false), 250)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && duration) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  if (!isVisible) return null

  const typeConfig = {
    success: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-success/60',
      iconColor: 'text-success',
      titleColor: 'text-success',
      Icon: CheckCircle,
    },
    error: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-destructive/60',
      iconColor: 'text-destructive',
      titleColor: 'text-destructive',
      Icon: AlertCircle,
    },
    warning: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-warning/60',
      iconColor: 'text-warning',
      titleColor: 'text-warning',
      Icon: AlertTriangle,
    },
    info: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-info/60',
      iconColor: 'text-info',
      titleColor: 'text-info',
      Icon: Info,
    },
  }

  const config = typeConfig[type]
  const IconComponent = config.Icon

  return (
    <div className="fixed bottom-4 right-4 z-[999999] max-w-md">
      <div
        className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 shadow-lg transition-all duration-300 ${
          isAnimating ? 'animate-toast-in' : 'opacity-0 translate-x-full scale-95'
        }`}
      >
        <div className="flex items-start gap-3">
          <IconComponent
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${type === 'success' ? 'animate-bounce-subtle' : ''} ${config.iconColor}`}
          />
          <div className="flex-1">
            <h3 className={`font-semibold mb-1 ${config.titleColor}`}>
              {title}
            </h3>
            <p className="text-sm text-text-secondary">{message}</p>
            {action && (
              <button
                onClick={action.onClick}
                className="mt-3 text-sm font-medium px-3 py-1 rounded hover:bg-border transition-all duration-200 text-text-primary active:scale-95"
              >
                {action.label}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-border rounded transition-all duration-200 text-text-secondary hover:text-text-primary active:scale-95 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
