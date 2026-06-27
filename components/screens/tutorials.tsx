'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Play, Check, Copy, ArrowRight, ArrowLeft, X, Terminal, Shield, Database, Info, Layers, RefreshCw, ChevronRight } from 'lucide-react'
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

export function Tutorials() {
  const [activeTab, setActiveTab] = useState<'ingestion' | 'acl' | 'sdk'>('sdk')
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const { showToast } = useToast()

  // Simulated Console Execution State
  const [executingSnippet, setExecutingSnippet] = useState<string | null>(null)
  const [executionOutput, setExecutionOutput] = useState<Record<string, string>>({})

  // Handle outside messages/navigation trigger
  useEffect(() => {
    // Listen for custom search navigate event
    const handleTabChange = (e: Event) => {
      const tabDetail = (e as CustomEvent).detail
      if (['sdk', 'acl', 'ingestion'].includes(tabDetail)) {
        setActiveTab(tabDetail as any)
      } else {
        startTour(tabDetail)
      }
    }
    window.addEventListener('dep_tutorials_tab_change', handleTabChange)
    return () => window.removeEventListener('dep_tutorials_tab_change', handleTabChange)
  }, [])

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
          {activeTab === 'sdk' && (
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
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">1. dep.whoami() — Identity Verification</span>
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

              {/* Snippet 2: list_datasets / list_datasources */}
              <div className="space-y-3 border-t border-border pt-6">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">2. list_datasets() & list_datasources() — Registry Discoverability</span>
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

              {/* Snippet 3: save_output */}
              <div className="space-y-3 border-t border-border pt-6">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">3. save_output(filename, df) — Export & Share</span>
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
          )}

          {activeTab === 'acl' && (
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
          )}

          {activeTab === 'ingestion' && (
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
          )}
        </div>
      </div>
    </div>
  )
}

// SDK Python Snippets Code
const sdkWhoamiCode = `import dep_sdk as dep

# Establish secure local session credentials
client = dep.connect()

# Query active user context from server
user = client.whoami()
print(user)`

const sdkWhoamiSimulated = `>>> Running dep.whoami()...
[DEP SDK v1.2.4] Initializing secure credentials token...
[DEP SDK v1.2.4] Fetching remote identity context...

{
  "user_id": 14,
  "username": "corporate_analyst",
  "email": "analyst@wissen.com",
  "role": "ANALYST",
  "session_token_status": "VALID"
}`

const sdkListCode = `import dep_sdk as dep

client = dep.connect()

# List secure database connectors
sources = client.list_datasources()
print("Data Sources:", sources)

# List columns allowed inside dataset catalog
catalogs = client.list_datasets()
print("Permitted Catalogs:", catalogs)`

const sdkListSimulated = `>>> Running listing functions...
[DEP SDK v1.2.4] Fetching registered data sources...
[DEP SDK v1.2.4] Fetching active catalog entities...

Data Sources: [
  {"id": 1, "name": "finance_postgres_prod", "type": "postgresql"},
  {"id": 2, "name": "sales_mysql_replica", "type": "mysql"}
]

Permitted Catalogs: [
  {"id": "catalog-1", "name": "customer_profiles", "status": "active"},
  {"id": "catalog-2", "name": "q4_financial_records", "status": "active"}
]`

const sdkSaveCode = `import dep_sdk as dep
import pandas as pd

client = dep.connect()

# Prepare analysis results frame
data = {
  "model_accuracy": [0.941, 0.956, 0.963],
  "loss": [0.12, 0.08, 0.04]
}
df = pd.DataFrame(data)

# Export output straight to object storage (MinIO)
client.save_output("model_summary.csv", df)
print("Saved output successfully.")`

const sdkSaveSimulated = `>>> Running dep.save_output()...
[DEP SDK v1.2.4] Validating dataframe structure...
[DEP SDK v1.2.4] Accessing local credentials...
[DEP SDK v1.2.4] Writing bytes -> MinIO target folder "user-outputs"
[DEP SDK v1.2.4] Registering catalog share record in Postgres metadata...

Success: File uploaded and saved as 'model_summary.csv' with output ID: output-77491.
Saved output successfully.`

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
