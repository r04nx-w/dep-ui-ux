'use client'

import { RefreshCw, Menu, Terminal, FlaskConical, ChevronDown, ChevronUp, Check, Keyboard, Database } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { GlobalSearch } from '@/components/ui/global-search'

// ── API health status hook ─────────────────────────────────────────────────
type ApiStatus = 'checking' | 'online' | 'degraded' | 'offline'

function useApiHealth(intervalMs = 30_000) {
  const [status, setStatus] = useState<ApiStatus>('checking')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const check = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const t0 = performance.now()
    try {
      const res = await fetch('/api/health', {
        signal: ctrl.signal,
        cache: 'no-store',
      })
      const ms = Math.round(performance.now() - t0)
      setLatencyMs(ms)
      setLastChecked(new Date())
      if (res.ok) {
        setStatus(ms > 800 ? 'degraded' : 'online')
      } else {
        setStatus('degraded')
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setLatencyMs(null)
      setLastChecked(new Date())
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    check()
    const id = setInterval(check, intervalMs)
    return () => {
      clearInterval(id)
      abortRef.current?.abort()
    }
  }, [check, intervalMs])

  return { status, latencyMs, lastChecked, refresh: check }
}

interface TopBarProps {
  title: string
  userRole: 'admin' | 'onboarder' | 'analyst'
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
  onSelectJupyter?: (type: 'embedded' | 'generic' | 'custom_lite' | 'backend_hub' | 'sql_explorer' | null) => void
  activeJupyter?: 'embedded' | 'generic' | 'custom_lite' | 'backend_hub' | 'sql_explorer' | null
  onGoToWorkspace?: () => void
  hasActiveWorkspace?: boolean
  showWorkspace?: boolean
  onNavigate?: (page: string, targetTab?: string) => void
  onShowShortcuts?: () => void
}

export function TopBar({
  title,
  userRole,
  onToggleSidebar,
  sidebarOpen,
  onSelectJupyter,
  activeJupyter,
  onGoToWorkspace,
  hasActiveWorkspace,
  showWorkspace = false,
  onNavigate,
  onShowShortcuts
}: TopBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { status: apiStatus, latencyMs, lastChecked, refresh: refreshHealth } = useApiHealth()

  const statusColor = {
    checking : 'text-text-muted',
    online   : 'text-success',
    degraded : 'text-[#ce9178]',
    offline  : 'text-destructive',
  }[apiStatus]

  const dotColor = {
    checking : 'bg-text-muted',
    online   : 'bg-success',
    degraded : 'bg-[#ce9178]',
    offline  : 'bg-destructive',
  }[apiStatus]

  const statusLabel = {
    checking : 'API: CHECKING…',
    online   : 'API: ONLINE',
    degraded : 'API: DEGRADED',
    offline  : 'API: OFFLINE',
  }[apiStatus]

  const tooltipText = (() => {
    const parts: string[] = []
    if (latencyMs !== null) parts.push(`Latency: ${latencyMs}ms`)
    if (lastChecked) parts.push(`Last checked: ${lastChecked.toLocaleTimeString()}`)
    return parts.join(' · ') || 'Checking…'
  })()

  return (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0 z-40 select-none">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-secondary hover:text-text-primary"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        {hasActiveWorkspace && onGoToWorkspace && (
          <div
            onClick={onGoToWorkspace}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all bg-success/10 hover:bg-success/20 ${
              showWorkspace
                ? 'border-b-2 border-emerald-400 text-emerald-400'
                : 'border-b-2 border-success text-success'
            }`}
            title={showWorkspace ? 'Workspace is active — currently viewing' : 'Resume your active Jupyter Workspace session'}
          >
            <Terminal className={`w-3.5 h-3.5 ${showWorkspace ? 'text-emerald-400' : 'text-success'}`} />
            <span>Workspace</span>
          </div>
        )}
        {onSelectJupyter && (
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 hover:border-primary/50 text-primary text-xs font-semibold rounded transition-all cursor-pointer"
              title="Select and launch Jupyter environments"
            >
              {activeJupyter === 'custom_lite' ? (
                <>
                  <FlaskConical className="w-3.5 h-3.5 text-success" />
                  <span>In-Browser Kernel</span>
                </>
              ) : activeJupyter === 'backend_hub' ? (
                <>
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  <span>Backend GPU Kernel</span>
                </>
              ) : activeJupyter === 'embedded' ? (
                <>
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  <span>Custom Inbuilt</span>
                </>
              ) : activeJupyter === 'generic' ? (
                <>
                  <FlaskConical className="w-3.5 h-3.5 text-success" />
                  <span>Regular Generic</span>
                </>
              ) : (
                <>
                  <FlaskConical className="w-3.5 h-3.5 text-text-secondary" />
                  <span>Select Kernel</span>
                </>
              )}
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded shadow-2xl p-1 z-50 animate-scale-in">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border mb-1">
                    Select Kernel / Environment
                  </div>
                  {[
                    {
                      id: 'custom_lite',
                      name: 'In-Browser (Lightweight)',
                      desc: 'Local WebAssembly kernel (Pyodide). Zero server load.',
                      icon: FlaskConical,
                      color: 'text-success'
                    },
                    {
                      id: 'backend_hub',
                      name: 'Backend GPU (Accelerated)',
                      desc: 'Runs on remote JupyterHub server with GPU access.',
                      icon: Terminal,
                      color: 'text-primary'
                    },
                    {
                      id: 'sql_explorer',
                      name: 'SQL Explorer',
                      desc: 'Query governed datasets directly via SQL (using dep_sdk).',
                      icon: Database,
                      color: 'text-sky-400'
                    }
                  ].map((option) => {
                    const Icon = option.icon
                    const isSelected = activeJupyter === option.id
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          onSelectJupyter(option.id as any)
                          setIsOpen(false)
                        }}
                        className={`w-full text-left p-2 rounded-sm hover:bg-bg-hover flex items-start gap-2.5 transition-colors cursor-pointer ${
                          isSelected ? 'bg-bg-hover' : ''
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${option.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-text-primary flex items-center justify-between">
                            <span className="truncate">{option.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                          </div>
                          <div className="text-[10px] text-text-secondary mt-0.5 leading-snug">
                            {option.desc}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {activeJupyter && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <button
                        onClick={() => {
                          onSelectJupyter(null)
                          setIsOpen(false)
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive rounded-sm transition-colors text-xs font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        Close Workspace
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        <GlobalSearch onNavigate={onNavigate} />
        <button
          onClick={refreshHealth}
          title={tooltipText}
          className={`text-xs flex items-center gap-1.5 cursor-pointer select-none ${statusColor} hover:opacity-80 transition-opacity`}
        >
          <span className="relative flex h-2 w-2">
            {(apiStatus === 'online' || apiStatus === 'checking') && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${dotColor}`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
          </span>
          {statusLabel}
          {latencyMs !== null && apiStatus !== 'offline' && (
            <span className="text-[10px] text-text-muted font-mono ml-0.5">{latencyMs}ms</span>
          )}
        </button>
        {onShowShortcuts && (
          <button 
            onClick={onShowShortcuts}
            className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-secondary hover:text-text-primary"
            title="Keyboard Shortcuts Cheat Sheet (Alt + K)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}
        <button className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-secondary hover:text-text-primary">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
