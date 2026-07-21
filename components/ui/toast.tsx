'use client'

import React, { useEffect, useState, createContext, useContext } from 'react'
import ReactDOM from 'react-dom'
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
      <ToastPortal toasts={toasts} removeToast={removeToast} />
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

// ── Portal: renders toasts directly on document.body, bypassing ALL stacking
// contexts from modals, dropdowns, and other fixed/absolute ancestors.
function ToastPortal({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return ReactDOM.createPortal(
    <ToastContainer toasts={toasts} removeToast={removeToast} />,
    document.body
  )
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    // z-[2147483647] is the absolute maximum CSS z-index value —
    // nothing can render on top of this, including modals, dropdowns, or backdrops.
    <div
      className="fixed bottom-5 right-5 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      style={{ zIndex: 2147483647 }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
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
      border: '1px solid rgba(34,197,94,0.5)',
      leftBar: '#22c55e',
      iconColor: '#22c55e',
      titleColor: '#22c55e',
      Icon: CheckCircle,
    },
    error: {
      border: '1px solid rgba(239,68,68,0.5)',
      leftBar: '#ef4444',
      iconColor: '#ef4444',
      titleColor: '#ef4444',
      Icon: AlertCircle,
    },
    warning: {
      border: '1px solid rgba(245,158,11,0.5)',
      leftBar: '#f59e0b',
      iconColor: '#f59e0b',
      titleColor: '#f59e0b',
      Icon: AlertTriangle,
    },
    info: {
      border: '1px solid rgba(59,130,246,0.5)',
      leftBar: '#3b82f6',
      iconColor: '#3b82f6',
      titleColor: '#3b82f6',
      Icon: Info,
    },
    loading: {
      border: '1px solid rgba(var(--border-rgb, 60,60,60),0.6)',
      leftBar: 'var(--primary)',
      iconColor: 'var(--primary)',
      titleColor: 'var(--text-primary)',
      Icon: Loader2,
    },
  }

  const config = typeConfig[toast.type]
  const IconComponent = config.Icon

  return (
    <div
      style={{
        border: config.border,
        borderLeft: `4px solid ${config.leftBar}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'var(--bg-card, #1e1e1e)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
      }}
      className={`rounded-lg p-4 ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
    >
      <div className="flex items-start gap-3">
        <IconComponent
          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${toast.type === 'loading' ? 'animate-spin' : ''}`}
          style={{ color: config.iconColor }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold mb-0.5 text-sm" style={{ color: config.titleColor }}>
            {toast.title}
          </h3>
          <p className="text-xs text-text-secondary break-words leading-relaxed">{toast.message}</p>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick()
                handleRemove()
              }}
              className="mt-2 text-xs font-medium px-3 py-1 rounded hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)] border border-border"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        {toast.type !== 'loading' && (
          <button
            onClick={handleRemove}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
