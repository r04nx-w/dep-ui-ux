'use client'

import React, { useEffect, useState, createContext, useContext } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
    
    if (toast.duration && toast.type !== 'loading') {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 250)
  }

  const typeConfig = {
    success: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-[#6a9955]/60',
      iconColor: '#6a9955',
      titleColor: '#7cb342',
      Icon: CheckCircle,
    },
    error: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-[#f44747]/60',
      iconColor: '#f44747',
      titleColor: '#ff6b6b',
      Icon: AlertCircle,
    },
    warning: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-[#ce9178]/60',
      iconColor: '#ce9178',
      titleColor: '#ffb84d',
      Icon: AlertTriangle,
    },
    info: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-[#569cd6]/60',
      iconColor: '#569cd6',
      titleColor: '#64b5f6',
      Icon: Info,
    },
    loading: {
      bgColor: 'bg-[#1a1a1a]',
      borderColor: 'border-[#007acc]/60',
      iconColor: '#007acc',
      titleColor: '#007acc',
      Icon: Loader2,
    },
  }

  const config = typeConfig[toast.type]
  const IconComponent = config.Icon

  return (
    <div
      className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 shadow-lg ${
        isExiting ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <div className="flex items-start gap-3">
        <IconComponent
          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${toast.type === 'loading' ? 'animate-spin' : ''}`}
          style={{ color: config.iconColor }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1 text-sm" style={{ color: config.titleColor }}>
            {toast.title}
          </h3>
          <p className="text-sm text-text-secondary break-words">{toast.message}</p>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick()
                handleRemove()
              }}
              className="mt-3 text-sm font-medium px-3 py-1 rounded hover:bg-border transition-colors text-text-primary"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        {toast.type !== 'loading' && (
          <button
            onClick={handleRemove}
            className="p-1 hover:bg-border rounded transition-colors text-text-secondary hover:text-text-primary flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
