'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Play, Check, Copy, ArrowRight, ArrowLeft, X, Terminal, Shield, Database, Info, Layers, RefreshCw, ChevronRight, Keyboard, Key } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

// Custom Python Highlighter Component
function PythonHighlighter({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <code className="font-mono text-xs block text-[#d4d4d4] leading-relaxed">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-4" />
        }
        if (line.trim().startsWith('#')) {
          return <div key={lineIdx} className="text-[#6a9955]">{line}</div>
        }
        
        const tokens = line.split(/(\s+|=|\(|\)|\.|\[|\]|,|:|"|'|#)/)
        let inString = false
        let stringChar = ''
        let isComment = false
        
        return (
          <div key={lineIdx} className="min-h-[1.2rem] whitespace-pre">
            {tokens.map((token, tokIdx) => {
              if (!token) return null
              if (isComment) {
                return <span key={tokIdx} className="text-[#6a9955]">{token}</span>
              }
              if (token === '#') {
                isComment = true
                return <span key={tokIdx} className="text-[#6a9955]">{token}</span>
              }
              if ((token === '"' || token === "'") && !inString) {
                inString = true
                stringChar = token
                return <span key={tokIdx} className="text-[#ce9178]">{token}</span>
              }
              if (token === stringChar && inString) {
                inString = false
                return <span key={tokIdx} className="text-[#ce9178]">{token}</span>
              }
              if (inString) {
                return <span key={tokIdx} className="text-[#ce9178]">{token}</span>
              }
              
              const keywords = [
                'import', 'as', 'from', 'print', 'def', 'return', 'class', 
                'if', 'else', 'elif', 'for', 'in', 'while', 'try', 'except', 
                'pass', 'None', 'True', 'False', 'with', 'lambda', 'global', 
                'nonlocal', 'assert', 'break', 'continue', 'yield', 'del', 
                'and', 'or', 'not', 'is'
              ]
              if (keywords.includes(token.trim())) {
                return <span key={tokIdx} className="text-[#569cd6] font-semibold">{token}</span>
              }
              
              if (token.trim() && !isNaN(Number(token.trim()))) {
                return <span key={tokIdx} className="text-[#b5cea8]">{token}</span>
              }
              
              const functions = ['connect', 'whoami', 'list_datasets', 'list_datasources', 'save_output', 'load_dataset', 'head']
              if (functions.includes(token.trim())) {
                return <span key={tokIdx} className="text-[#dcdcaa] font-medium">{token}</span>
              }
              
              return <span key={tokIdx}>{token}</span>
            })}
          </div>
        )
      })}
    </code>
  )
}

// ── Tab 1: Keyboard Shortcuts Component ──
function ShortcutsTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 border-b border-border pb-4">
        <h3 className="text-lg font-bold text-text-primary">Platform Keyboard Shortcuts</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          Navigate the DEP Workbench and control your interactive sandboxes faster using these global keyboard hotkeys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Navigation Section */}
        <div className="p-4 bg-input rounded-sm border border-border/60 space-y-3">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/40 pb-1.5 flex items-center gap-1.5">
            <span>Navigation Shortcuts</span>
          </h4>
          <div className="space-y-2">
            {[
              { key: 'Alt + 1', desc: 'Navigate to Dashboard' },
              { key: 'Alt + 2', desc: 'Navigate to Data Connections' },
              { key: 'Alt + 3', desc: 'Navigate to Resource Catalog' },
              { key: 'Alt + 4', desc: 'Navigate to Catalog Explorer' },
              { key: 'Alt + 5', desc: 'Navigate to Saved Artifacts' },
              { key: 'Alt + 6', desc: 'Navigate to User Directory' },
              { key: 'Alt + 7', desc: 'Navigate to Audit Trails' },
              { key: 'Alt + 8', desc: 'Navigate to Tutorials & Guided Tours' },
              { key: 'Alt + 9', desc: 'Navigate to Account Settings' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{item.desc}</span>
                <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">{item.key}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Workspace Sandbox Section */}
        <div className="p-4 bg-input rounded-sm border border-border/60 space-y-3">
          <h4 className="text-xs font-bold text-[#00b4d8] uppercase tracking-wider border-b border-border/40 pb-1.5 flex items-center gap-1.5">
            <span>Sandbox Workspace Control</span>
          </h4>
          <div className="space-y-2">
            {[
              { key: 'Alt + W', desc: 'Quick-Launch Personal Sandbox' },
              { key: 'Alt + L', desc: 'Exit Workspace (Back to Platform)' },
              { key: 'Alt + F', desc: 'Toggle Fullscreen / Focus Mode' },
              { key: 'Alt + S', desc: 'Switch Workspace Selector' },
              { key: 'Alt + C', desc: 'Commit Snapshot of Sandbox' },
              { key: 'Alt + H', desc: 'View Commit History Registry' },
              { key: 'Alt + P', desc: 'Promote Notebook to Platform' },
              { key: 'Alt + K', desc: 'Toggle Keyboard Shortcuts Cheat Sheet' },
              { key: 'Esc', desc: 'Dismiss Active Popovers / Modals' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{item.desc}</span>
                <kbd className="px-1.5 py-0.5 bg-[#252526] border border-border rounded text-[10px] font-mono text-text-primary shadow-sm">{item.key}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips banner */}
      <div className="flex items-start gap-2.5 p-3.5 bg-primary/10 border border-primary/20 rounded-sm">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-text-secondary leading-normal">
          <span className="font-bold text-text-primary">Pro Tip:</span> Hitting <kbd className="px-1 py-0.5 bg-input border border-border rounded text-[9px] font-mono">Enter</kbd> on any login or modal input form submits the action instantly without needing to click.
        </p>
      </div>
    </div>
  )
}

// ── Tab 2: JupyterLab SDK Component ──
interface SDKTabProps {
  copiedText: string | null
  handleCopy: (text: string, id: string) => void
  executingSnippet: string | null
  handleExecuteSnippet: (id: string, output: string) => void
  executionOutput: Record<string, string>
}
function SDKTab({ copiedText, handleCopy, executingSnippet, handleExecuteSnippet, executionOutput }: SDKTabProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2 border-b border-border pb-4">
        <h3 className="text-lg font-bold text-text-primary">Using the JupyterLab SDK (`dep_sdk`)</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          Inside notebook environments, the `dep_sdk` package provides direct API calls to interact with server catalog databases. Calculations respect ACL masking constraints automatically.
        </p>
      </div>

      {/* Snippet 1: whoami */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">1. dep_sdk.whoami() — Identity Verification</span>
          <button
            onClick={() => handleCopy(sdkWhoamiCode, 'whoami')}
            className="flex items-center gap-1 hover:text-text-primary transition-colors font-medium text-[11px]"
          >
            {copiedText === 'whoami' ? <Check className="w-3.5 h-3.5 text-[#6a9955]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === 'whoami' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="bg-input border border-border p-4 rounded-sm overflow-x-auto">
          <PythonHighlighter code={sdkWhoamiCode} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExecuteSnippet('whoami', sdkWhoamiSimulated)}
            disabled={executingSnippet === 'whoami'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
          >
            {executingSnippet === 'whoami' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3" />}
            <span>Execute Code (Dry Run)</span>
          </button>
        </div>
        {executionOutput['whoami'] && (
          <pre className="bg-black/90 border border-emerald-950/40 p-3 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 shadow-inner">
            <code>{executionOutput['whoami']}</code>
          </pre>
        )}
      </div>

      {/* Snippet 2: list_catalogs / list_datasets */}
      <div className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">2. dep_sdk.list_catalogs() — Discover Allowed Datasets</span>
          <button
            onClick={() => handleCopy(sdkListCode, 'list_code')}
            className="flex items-center gap-1 hover:text-text-primary transition-colors font-medium text-[11px]"
          >
            {copiedText === 'list_code' ? <Check className="w-3.5 h-3.5 text-[#6a9955]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === 'list_code' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="bg-input border border-border p-4 rounded-sm overflow-x-auto">
          <PythonHighlighter code={sdkListCode} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExecuteSnippet('list_code', sdkListSimulated)}
            disabled={executingSnippet === 'list_code'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
          >
            {executingSnippet === 'list_code' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3" />}
            <span>Execute Code (Dry Run)</span>
          </button>
        </div>
        {executionOutput['list_code'] && (
          <pre className="bg-black/90 border border-emerald-950/40 p-3 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 shadow-inner">
            <code>{executionOutput['list_code']}</code>
          </pre>
        )}
      </div>

      {/* Snippet 3: get_catalog & save_artifact */}
      <div className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">3. dep_sdk.get_catalog(name) & save_artifact(name, content) — Load & Share</span>
          <button
            onClick={() => handleCopy(sdkSaveCode, 'save_code')}
            className="flex items-center gap-1 hover:text-text-primary transition-colors font-medium text-[11px]"
          >
            {copiedText === 'save_code' ? <Check className="w-3.5 h-3.5 text-[#6a9955]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === 'save_code' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="bg-input border border-border p-4 rounded-sm overflow-x-auto">
          <PythonHighlighter code={sdkSaveCode} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExecuteSnippet('save_code', sdkSaveSimulated)}
            disabled={executingSnippet === 'save_code'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
          >
            {executingSnippet === 'save_code' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3" />}
            <span>Execute Code (Dry Run)</span>
          </button>
        </div>
        {executionOutput['save_code'] && (
          <pre className="bg-black/90 border border-emerald-950/40 p-3 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 shadow-inner">
            <code>{executionOutput['save_code']}</code>
          </pre>
        )}
      </div>
    </div>
  )
}

// ── Tab 3: ACL Policies Component ──
interface ACLTabProps {
  copiedText: string | null
  handleCopy: (text: string, id: string) => void
}
function ACLTab({ copiedText, handleCopy }: ACLTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 border-b border-border pb-4">
        <h3 className="text-lg font-bold text-text-primary">ACL & Column Masking Rules</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          ACL policies are compiled using YAML configurations. They specify targeted roles, column whitelist restrictions, and active validity timeframes.
        </p>
      </div>

      {/* YAML Snippet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">Snippet: Sample Governance YAML Policy</span>
          <button
            onClick={() => handleCopy(aclYamlSnippet, 'acl_yaml')}
            className="flex items-center gap-1 hover:text-text-primary transition-colors font-medium text-[11px]"
          >
            {copiedText === 'acl_yaml' ? <Check className="w-3.5 h-3.5 text-[#6a9955]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === 'acl_yaml' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="bg-input border border-border p-4 rounded-sm overflow-x-auto">
          <PythonHighlighter code={aclYamlSnippet} />
        </div>
      </div>
    </div>
  )
}

// ── Tab 4: Ingestion Component ──
interface IngestionTabProps {
  copiedText: string | null
  handleCopy: (text: string, id: string) => void
}
function IngestionTab({ copiedText, handleCopy }: IngestionTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 border-b border-border pb-4">
        <h3 className="text-lg font-bold text-text-primary">Dataset Ingestion Recipes</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          You can register Postgres, MySQL, or CSV data tables into the catalog. Secure connection credentials are encrypted using Fernet keys before saving to SQLite.
        </p>
      </div>

      {/* API Ingestion Snippet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">Snippet: Register MySQL Data Source via curl</span>
          <button
            onClick={() => handleCopy(curlSnippet, 'curl')}
            className="flex items-center gap-1 hover:text-text-primary transition-colors font-medium text-[11px]"
          >
            {copiedText === 'curl' ? <Check className="w-3.5 h-3.5 text-[#6a9955]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === 'curl' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="bg-input border border-border p-4 rounded-sm overflow-x-auto font-medium">
          <PythonHighlighter code={curlSnippet} />
        </div>
      </div>
    </div>
  )
}

interface TutorialsProps {
  userRole?: 'admin' | 'onboarder' | 'analyst'
}

export function Tutorials({ userRole }: TutorialsProps) {
  const [activeTab, setActiveTab] = useState<'ingestion' | 'acl' | 'sdk' | 'shortcuts' | 'mcp'>('sdk')
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const { showToast } = useToast()

  // Simulated Console Execution State
  const [executingSnippet, setExecutingSnippet] = useState<string | null>(null)
  const [executionOutput, setExecutionOutput] = useState<Record<string, string>>({})

  useEffect(() => {
    if (userRole === 'analyst' && (activeTab === 'acl' || activeTab === 'ingestion')) {
      setActiveTab('sdk')
    }
  }, [userRole, activeTab])

  // Handle outside messages/navigation trigger
  useEffect(() => {
    // Listen for custom search navigate event
    const handleTabChange = (e: Event) => {
      const tabDetail = (e as CustomEvent).detail
      if (['sdk', 'acl', 'ingestion', 'shortcuts', 'mcp'].includes(tabDetail)) {
        if (userRole === 'analyst' && (tabDetail === 'acl' || tabDetail === 'ingestion')) {
          return
        }
        setActiveTab(tabDetail as any)
      } else {
        if (userRole === 'analyst' && ['onboard-db', 'create-acl', 'manage-projects'].includes(tabDetail)) {
          return
        }
        startTour(tabDetail)
      }
    }
    window.addEventListener('dep_tutorials_tab_change', handleTabChange)
    return () => window.removeEventListener('dep_tutorials_tab_change', handleTabChange)
  }, [userRole])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    showToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: 'Code snippet is ready to be pasted inside your notebook.',
      duration: 2000,
    })
    setTimeout(() => setCopiedText(null), 3000)
  }

  const startTour = (tourName: string) => {
    window.dispatchEvent(new CustomEvent('dep_start_tour', { detail: tourName }))
    showToast({
      type: 'info',
      title: 'Interactive Guided Tour Launched',
      message: `Running: ${tourName.replace('-', ' ').toUpperCase()} tutorial spotlight sequence.`,
      duration: 3000,
    })
  }

  const handleExecuteSnippet = (id: string, simulatedOutput: string) => {
    setExecutingSnippet(id)
    setTimeout(() => {
      setExecutionOutput((prev) => ({
        ...prev,
        [id]: simulatedOutput
      }))
      setExecutingSnippet(null)
      showToast({
        type: 'success',
        title: 'Execution Completed',
        message: 'Snippet ran successfully against sandbox mock client.',
        duration: 2000,
      })
    }, 1200)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-border p-8 rounded-sm animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
        
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" /> Corporate Ready Guide
          </span>
          <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">Onboarding & Tutorials</h2>
          <p className="text-sm text-text-secondary max-w-xl">
            Learn to query resources safely, construct access policies, and run calculations inside the sandbox using copyable integration recipes.
          </p>
        </div>
      </div>

      {/* Docs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-2">
        
        {/* Left Sidebar Tabs (Includes tours shifted here) */}
        <div id="tour-tutorials-left-nav" className="bg-card border border-border rounded-sm p-4 space-y-4 lg:col-span-1 select-none flex-shrink-0">
          <div>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-3 mb-2">Documentation & SDK</h3>
            
            <button
              onClick={() => setActiveTab('sdk')}
              className={`w-full text-left px-3 py-2.5 rounded-sm text-sm font-medium transition-all flex items-center justify-between gap-2.5 ${
                activeTab === 'sdk'
                  ? 'bg-primary/15 text-primary border-l-2 border-primary font-semibold'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4" />
                <span>JupyterLab SDK (dep_sdk)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            {userRole !== 'analyst' && (
              <>
                <button
                  onClick={() => setActiveTab('acl')}
                  className={`w-full text-left px-3 py-2.5 rounded-sm text-sm font-medium transition-all flex items-center justify-between gap-2.5 ${
                    activeTab === 'acl'
                      ? 'bg-primary/15 text-primary border-l-2 border-primary font-semibold'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4" />
                    <span>ACL Security Policies</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => setActiveTab('ingestion')}
                  className={`w-full text-left px-3 py-2.5 rounded-sm text-sm font-medium transition-all flex items-center justify-between gap-2.5 ${
                    activeTab === 'ingestion'
                      ? 'bg-primary/15 text-primary border-l-2 border-primary font-semibold'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4" />
                    <span>Dataset Ingestion</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full text-left px-3 py-2.5 rounded-sm text-sm font-medium transition-all flex items-center justify-between gap-2.5 ${
                activeTab === 'shortcuts'
                  ? 'bg-primary/15 text-primary border-l-2 border-primary font-semibold'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-4 h-4" />
                <span>Keyboard Shortcuts</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`w-full text-left px-3 py-2.5 rounded-sm text-sm font-medium transition-all flex items-center justify-between gap-2.5 ${
                activeTab === 'mcp'
                  ? 'bg-primary/15 text-primary border-l-2 border-primary font-semibold'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-primary" />
                <span>AI Agent MCP Server</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-3 mb-2">Interactive Guided Tours</h3>
            
            <button
              onClick={() => startTour('overview')}
              className="w-full text-left px-3 py-2.5 rounded-sm text-xs font-medium text-text-secondary hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2.5"
            >
              <Play className="w-3.5 h-3.5 text-primary fill-current" />
              <span>Launch Platform Overview</span>
            </button>

            {userRole !== 'analyst' && (
              <>
                <button
                  onClick={() => startTour('onboard-db')}
                  className="w-full text-left px-3 py-2.5 rounded-sm text-xs font-medium text-text-secondary hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2.5"
                >
                  <Database className="w-3.5 h-3.5 text-primary" />
                  <span>Tour: Onboard Data Source</span>
                </button>

                <button
                  onClick={() => startTour('create-acl')}
                  className="w-full text-left px-3 py-2.5 rounded-sm text-xs font-medium text-text-secondary hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2.5"
                >
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>Tour: Creating ACL Rules</span>
                </button>

                <button
                  onClick={() => startTour('manage-projects')}
                  className="w-full text-left px-3 py-2.5 rounded-sm text-xs font-medium text-text-secondary hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2.5"
                >
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Tour: Projects & Members</span>
                </button>
              </>
            )}

            <button
              onClick={() => startTour('access-workspace')}
              className="w-full text-left px-3 py-2.5 rounded-sm text-xs font-medium text-text-secondary hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2.5"
            >
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>Tour: Access Sandbox Workspace</span>
            </button>

            <button
              onClick={() => startTour('share-outputs')}
              className="w-full text-left px-3 py-2.5 rounded-sm text-xs font-medium text-text-secondary hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>Tour: Save & Share Artifacts</span>
            </button>
          </div>
        </div>

        {/* Right Tab Contents Card - Scrollable internally */}
        <div className="bg-card border border-border rounded-sm p-6 lg:col-span-2 max-h-[calc(100vh-270px)] overflow-y-auto pr-4 min-h-[400px]">
          {activeTab === 'shortcuts' && <ShortcutsTab />}
          {activeTab === 'sdk' && (
            <SDKTab
              copiedText={copiedText}
              handleCopy={handleCopy}
              executingSnippet={executingSnippet}
              handleExecuteSnippet={handleExecuteSnippet}
              executionOutput={executionOutput}
            />
          )}
          {activeTab === 'acl' && <ACLTab copiedText={copiedText} handleCopy={handleCopy} />}
          {activeTab === 'ingestion' && <IngestionTab copiedText={copiedText} handleCopy={handleCopy} />}
          {activeTab === 'mcp' && <MCPTab copiedText={copiedText} handleCopy={handleCopy} />}
        </div>
      </div>
    </div>
  )
}

// SDK Python Snippets Code
const sdkWhoamiCode = `import dep_sdk

# Verify identity and get profile (returns a pandas DataFrame)
df_profile = dep_sdk.whoami()`

const sdkWhoamiSimulated = `>>> Running dep_sdk.whoami()...
============================================================
  DEP Workbench - User Profile Information
============================================================
  User Id                  : 7
  Username                 : rahul
  Role                     : ANALYST
  Full Name                : Rahul Sharma
  Email                    : rahul@wissen.com
  Accessible Datasets Count: 1
  Api Url                  : http://localhost:8000
============================================================`

const sdkListCode = `import dep_sdk

# Discover allowed datasets and catalogs (returns a pandas DataFrame)
df_catalogs = dep_sdk.list_catalogs()
print(f"Accessible catalogs: {len(df_catalogs)}")`

const sdkListSimulated = `>>> Running dep_sdk.list_catalogs()...
[DEP] Found 1 accessible catalogs
Accessible catalogs: 1
   id  name  type  status  owner  allowed_columns_count
0   1   L&T   sql  active  admin                      6`

const sdkSaveCode = `import dep_sdk
import pandas as pd

# Load a governed catalog as a pandas DataFrame
df = dep_sdk.get_catalog("L&T")

# Query specific sub-resource column (respects ACL masking)
volume_series = dep_sdk.query("L&T/volume")

# Save and upload an analytics summary artifact (CSV or JSON)
summary_df = df.describe()
dep_sdk.save_artifact(
    name="lt_summary",
    content=summary_df,
    artifact_type="csv",
    description="L&T descriptive statistics report"
)`

const sdkSaveSimulated = `>>> Running dep_sdk.get_catalog("L&T")...
[DEP] Governed load successful: Loaded 'L&T' (50625 rows)

>>> Running dep_sdk.query("L&T/volume")...
[DEP] Extracted column 'volume' from governed dataset 'L&T'

>>> Running dep_sdk.save_artifact()...
[DEP] ✓ Saved local file: lt_summary.csv
[DEP] ✓ Uploaded artifact successfully to backend output store (ID: 42)`

const aclYamlSnippet = `version: "1"
entries:
  - user: "analyst"
    dataset: "transactions"
    allowed_columns: ["id", "amount", "transaction_date"]
    valid_until: "2026-12-31T23:59:59Z"
  - user: "dataonboarder"
    dataset: "transactions"
    allowed_columns: ["*"]`

const curlSnippet = `curl -X POST http://localhost:8000/api/datasets/db \\
  -H "Authorization: Bearer <your_jwt_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "corporate_transactions",
    "source_type": "mysql",
    "host": "mysql-db.internal",
    "port": 3306,
    "database_name": "production",
    "table_name": "transactions",
    "username": "workbench_reader",
    "password": "secure_password_here"
  }'`

function MCPTab({ copiedText, handleCopy }: { copiedText: string | null; handleCopy: (text: string, id: string) => void }) {
  const claudeConfig = `{
  "mcpServers": {
    "dep-mcp": {
      "command": "python",
      "args": [
        "c:/Users/Wissen/Documents/DataExploration/server/src/mcp_server.py"
      ],
      "env": {
        "DEP_API_KEY": "YOUR_API_KEY_HERE",
        "DEP_CONTROL_PLANE_URL": "http://localhost:8000"
      }
    }
  }
}`;

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      <div className="space-y-2 border-b border-border pb-4">
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Model Context Protocol (MCP) Server Setup
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          Connect your governed catalog and analytics sandbox directly to local AI assistants (Claude Desktop, Cursor, Cline, etc.) to query datasets, search artifacts, and execute automated analytics.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-1">Step 1: Generate an API Access Key</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Go to your <strong>Settings</strong> page, scroll down to <strong>API Access Tokens</strong>, give your token a friendly name (e.g. <em>Claude Desktop</em>), select your expiration window, and click <strong>Generate New API Token</strong>. Copy the key immediately (it starts with `dep_ak_`).
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-text-primary mb-2">Step 2: Configure your AI Client</h4>
          
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-text-primary">Option A: Claude Desktop Configuration</h5>
            <p className="text-xs text-text-secondary">
              Open your Claude Desktop config file (located at <code>%APPDATA%\\Claude\\claude_desktop_config.json</code>) and add the following JSON block:
            </p>
            
            <div className="relative bg-input border border-border rounded-sm p-3 font-mono text-[11px] text-[#d4d4d4] leading-relaxed max-w-full overflow-x-auto">
              <pre>{claudeConfig}</pre>
              <button
                onClick={() => handleCopy(claudeConfig, 'mcp-claude')}
                className="absolute top-2 right-2 p-1 bg-card hover:bg-bg-hover border border-border rounded-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Copy JSON Config"
              >
                {copiedText === 'mcp-claude' ? <Check className="w-3.5 h-3.5 text-[#6a9955]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border/40 mt-4">
            <h5 className="text-xs font-semibold text-text-primary">Option B: Cursor / Antigravity Setup</h5>
            <p className="text-xs text-text-secondary leading-relaxed">
              Go to <strong>Settings &rarr; Features &rarr; MCP</strong> in your editor. Click <strong>+ Add New MCP Server</strong>:
            </p>
            <ul className="list-disc pl-5 text-xs text-text-secondary space-y-1">
              <li><strong>Name</strong>: <code>dep-mcp</code></li>
              <li><strong>Type</strong>: <code>command</code></li>
              <li><strong>Command</strong>: <code>python c:/Users/Wissen/Documents/DataExploration/server/src/mcp_server.py</code></li>
              <li><strong>Environment Variables</strong>: Add <code>DEP_API_KEY=YOUR_KEY_HERE</code> and <code>DEP_CONTROL_PLANE_URL=http://localhost:8000</code></li>
            </ul>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-border/40">
          <h4 className="text-sm font-bold text-text-primary mb-2">Available MCP Tools for AI Agents</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: 'list_datasets', desc: 'Lists all available governed catalogs and permitted columns.' },
              { name: 'get_dataset_columns', desc: 'Queries full schema mapping (names and types) of a dataset.' },
              { name: 'get_dataset_shape', desc: 'Fetches row count and column counts of a dataset.' },
              { name: 'get_dataset_sample', desc: 'Retrieves a quick 5-row preview to inspect values.' },
              { name: 'get_dataset_summary', desc: 'Retrieves full statistical profiles (nulls, min, max, mean, top occurrences) of all columns.' },
              { name: 'get_dataset_rows', desc: 'Fetches governed table data rows using offset/limit pagination.' },
              { name: 'query_sql', desc: 'Runs standard SQL SELECT statements against governed datasets in an in-memory database.' },
              { name: 'query_python', desc: 'Executes pandas / matplotlib analytics scripts with automatically injected credentials.' },
              { name: 'semantic_search_artifacts', desc: 'Searches datasets, teams, notebooks, and outputs matching query terms.' },
              { name: 'upload_artifact', desc: 'Uploads generated CSV/text files directly to the saved outputs catalog.' },
            ].map((tool) => (
              <div key={tool.name} className="p-3 bg-input border border-border/60 rounded-sm space-y-1 text-xs">
                <p className="font-semibold text-primary font-mono">{tool.name}</p>
                <p className="text-text-secondary leading-normal">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
