'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch, API_BASE_URL } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { AIChart, MermaidChart } from '@/components/screens/ai-charts'
import {
  Send, Bot, Loader2, Sparkles, Settings2, Eye, EyeOff, ChevronDown, ChevronRight,
  Copy, Check, Download, RefreshCw, Trash2, Plus, Clock, Terminal,
  BarChart2, Wrench, X, Edit2, MessageSquare, Database, Shield, List,
  AlertCircle, CheckCircle2, Info, Zap, Save, User, Play,
  Filter, Table, Search, Upload, FileCode, SlidersHorizontal
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type LLMProvider = 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'anthropic'

interface ToolCallStep {
  id: string
  tool_name: string
  arguments: Record<string, any>
  status: 'running' | 'done' | 'error'
  result?: any
  error?: string
  duration_ms?: number
  extra_fields?: Record<string, any>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  tool_steps?: ToolCallStep[]
  thinking?: string
  isStreaming?: boolean
  model?: string
}

interface ChatSession {
  id: string
  title: string
  created_at: number
  updated_at: number
  messages: ChatMessage[]
  provider: LLMProvider
  model: string
}

// ─── Provider Config ──────────────────────────────────────────────────────────

const PROVIDERS: Record<LLMProvider, { name: string; logoUrl: string; color: string; apiUrl: (endpoint: string) => string; hasKey: boolean }> = {
  gemini: {
    name: 'Google Gemini',
    logoUrl: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    color: '#1a73e8',
    apiUrl: () => 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    hasKey: true,
  },
  groq: {
    name: 'Groq',
    logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain=groq.com',
    color: '#f55036',
    apiUrl: () => 'https://api.groq.com/openai/v1/chat/completions',
    hasKey: true,
  },
  openrouter: {
    name: 'OpenRouter',
    logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain=openrouter.ai',
    color: '#7c3aed',
    apiUrl: () => 'https://openrouter.ai/api/v1/chat/completions',
    hasKey: true,
  },
  ollama: {
    name: 'Ollama (Local)',
    logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain=ollama.com',
    color: '#64748b',
    apiUrl: (endpoint) => `${(endpoint || 'http://localhost:11434').replace(/\/$/, '')}/v1/chat/completions`,
    hasKey: false,
  },
  anthropic: {
    name: 'Anthropic Claude',
    logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain=anthropic.com',
    color: '#d97706',
    apiUrl: () => 'https://api.anthropic.com/v1/messages',
    hasKey: true,
  },
}

function buildSystemPrompt(privacyMode: boolean): string {
  if (privacyMode) {
    return `You are the DEP Private AI Analyst, an expert data analyst embedded inside the Data Exploration Platform.
You have access to governed dataset catalogs via secure MCP tools. Privacy Mode is currently ACTIVE.

PRIVACY MODE RULES (strictly enforced):
- Always start by listing datasets if unsure what data is available
- When writing Python code via query_python, use "import dep_sdk as dep" and call dep.get_catalog('DatasetName') to load data
- NEVER display, print, or reveal raw individual records from any dataset
- NEVER show personally identifiable information (PII) such as names, emails, dates of birth, IDs, or any individual-level data
- Always format headings with a clean double-newline (\n\n) before the #### or ### characters. Never put list items and headings on the same block without a clean line break; otherwise, the markdown parser renders the hashes as literal text.
- Only present aggregated statistics, distributions, and group-level summaries
- Sample previews shown by get_dataset_sample contain SYNTHETIC placeholder data only — do not treat them as real records
- For visualizations, ALWAYS save charts using this EXACT pattern — no variation allowed:
    import io
    fig, ax = plt.subplots(figsize=(10, 6))
    # ... draw your chart on ax ...
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    result = dep.save_artifact('chart_name', buf.read(), 'png')
    plt.close(fig)
    print(f"ID: {result['id']}")
  Then embed it: ![Chart Title](/api/outputs/<id>/preview) — replace <id> with the printed numeric ID. NEVER pass a Figure object directly to save_artifact.
- Always clearly label outputs as aggregated/anonymized insights
- Keep privacy: only share aggregated insights, not individual records

Available tools:
- list_datasets: Lists all accessible datasets
- get_dataset_columns: Get column schema of a dataset
- get_dataset_shape: Get row/column counts
- get_dataset_sample: Gets a 5-row synthetic placeholder preview (schema verification only — data is NOT real)
- get_dataset_summary: Statistical profile of all columns (aggregated — safe under privacy mode)
- query_python: Execute Python analysis scripts — must only output aggregated results
- semantic_search_artifacts: Search existing saved artifacts and reports`
  }

  return `You are DEP Analyst — a powerful, autonomous AI data analyst embedded inside the Data Exploration Platform.
You have FULL access to governed datasets via MCP tools. Privacy Mode is OFF. Operate like a senior data scientist.

ANALYST MINDSET:
- Be proactive: don't wait for the user to tell you what to do — explore, discover, and surface insights autonomously
- Chain multiple tool calls intelligently: list → inspect schema → sample → summarize → run Python → upload artifact
- Always ground your analysis in real data — use query_python to compute statistics and run code
- Provide rich, structured responses with tables, code blocks, and numbered insights
- When asked for analysis, go deep: distributions, outliers, correlations, trends, top-N, time series if applicable
- Suggest follow-up analyses proactively after completing a task

POWERFUL TOOL USAGE STRATEGY:
1. Start with list_datasets if you don\'t know what data exists
2. Use get_dataset_columns to inspect schema before querying
3. Use get_dataset_sample to see real data rows immediately
4. Use get_dataset_shape to understand dataset size
5. Use get_dataset_summary for instant statistical profiling of all columns
6. Use get_dataset_rows to fetch specific paginated slices of data
7. Use query_sql to run precise SQL SELECT queries directly on a dataset
8. Use query_python for complex analysis, pandas operations, matplotlib charts
9. Use upload_artifact to save important results, reports, and charts
10. Use semantic_search_artifacts to find previously saved reports and outputs

PYTHON CODE RULES:
- Always use: import dep_sdk as dep  then  df = dep.get_catalog('DatasetName')
- You CAN print raw rows, display DataFrames, and show individual records
- Perform: filtering, sorting, groupby, pivot, merge, time-series, regression, correlation
- For charts: use matplotlib with dark theme (plt.style.use('dark_background')). ALWAYS save using this EXACT pattern:
    import io
    fig, ax = plt.subplots(figsize=(10, 6))
    plt.style.use('dark_background')
    # ... draw chart ...
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    result = dep.save_artifact('chart_name', buf.read(), 'png')
    plt.close(fig)
    print(f"ID: {result['id']}")
  Then embed in response: ![Chart Title](/api/outputs/<id>/preview) where <id> is the printed numeric ID. NEVER pass the fig or plt object directly — always pass buf.read() (raw PNG bytes).
- Always print shape, dtypes, and .head() to show what was loaded
- When running exploratory analysis, print intermediate results step by step

NATIVE CHART RENDERING (use for quick summaries — no Python required):
The DEP UI has a built-in chart renderer. For quick data visualizations from tool results, output a fenced code block with a chart: language tag. The UI renders it natively.

  \`\`\`chart:bar
  {"title": "Record Count by Category", "xKey": "name", "data": [{"name": "A", "count": 120}], "bars": [{"key": "count", "label": "Count"}]}
  \`\`\`
  \`\`\`chart:pie
  {"title": "Distribution", "data": [{"label": "X", "value": 40}, {"label": "Y", "value": 60}]}
  \`\`\`
  \`\`\`chart:line
  {"title": "Trend", "xKey": "date", "data": [{"date": "Jan", "val": 100}], "lines": [{"key": "val", "label": "Value"}]}
  \`\`\`
  \`\`\`chart:area
  {"title": "Growth", "xKey": "month", "data": [{"month": "Jan", "v": 1000}], "areas": [{"key": "v", "label": "Volume"}]}
  \`\`\`
  \`\`\`chart:radar
  {"title": "Profile", "angleKey": "metric", "data": [{"metric": "Speed", "score": 80}], "radars": [{"key": "score", "label": "Score"}]}
  \`\`\`
  \`\`\`chart:treemap
  {"title": "Breakdown", "data": [{"name": "A", "value": 300}, {"name": "B", "value": 200}]}
  \`\`\`
  Prefer native charts for: distributions, comparisons, breakdowns from SQL/summary results. Use query_python only for complex matplotlib/seaborn plots or when the data needs preprocessing.

SQL RULES:
- query_sql runs SQL SELECT against a specific dataset loaded into an in-memory SQLite table
- Use standard SQL: SELECT, WHERE, GROUP BY, ORDER BY, HAVING, LIMIT, subqueries, CTEs
- The table name equals the dataset name exactly

OUTPUT FORMAT:
- Use markdown with headers, bold labels, and tables for structured data
- Show code blocks for all Python/SQL you run
- Summarize key findings in bullet points after showing raw results
- Always explain what you found, not just what you ran

Available tools:
- list_datasets: Discover all accessible datasets and their permitted columns
- get_dataset_columns: Get full schema with column names and data types
- get_dataset_shape: Get total row count and column count
- get_dataset_sample: Fetch real 5-row preview of actual dataset records
- get_dataset_summary: Full statistical profile — mean, std, min, max, nulls, top values per column
- get_dataset_rows: Fetch a paginated slice of real data rows (specify limit and offset)
- query_sql: Run SQL SELECT queries directly on any governed dataset
- query_python: Execute full Python scripts with pandas, matplotlib, numpy for deep analysis
- upload_artifact: Save analysis reports, tables, or chart files to the artifact catalog
- semantic_search_artifacts: Search previously saved reports and outputs by keyword`
}

const MCP_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_datasets',
      description: 'List all governed datasets accessible to the current user with their permitted columns. Always call this first if unsure what data is available.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_dataset_columns',
      description: 'Get the full column schema (column names and data types) of a specific dataset. Use before writing SQL or Python queries.',
      parameters: { type: 'object', properties: { name: { type: 'string', description: 'The exact dataset name' } }, required: ['name'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_dataset_shape',
      description: 'Get the total row count and column count of a dataset. Useful for understanding dataset size before fetching data.',
      parameters: { type: 'object', properties: { name: { type: 'string', description: 'The exact dataset name' } }, required: ['name'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_dataset_sample',
      description: 'Fetch a 5-row real data preview from the dataset. Use to quickly see the actual values and structure before deeper analysis.',
      parameters: { type: 'object', properties: { name: { type: 'string', description: 'The exact dataset name' } }, required: ['name'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_dataset_summary',
      description: 'Get a comprehensive statistical profile of all columns in a dataset: data types, null counts, unique values, mean, std, min, max, and top frequent values. Best used for exploratory analysis.',
      parameters: { type: 'object', properties: { name: { type: 'string', description: 'The exact dataset name' } }, required: ['name'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_dataset_rows',
      description: 'Fetch a paginated slice of real data rows from a governed dataset. Use limit and offset to retrieve specific ranges of records.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The exact dataset name' },
          limit: { type: 'integer', description: 'Max number of rows to return (default 100, max 1000)' },
          offset: { type: 'integer', description: 'Number of rows to skip from the start (default 0)' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_sql',
      description: 'Execute a SQL SELECT query directly on a governed dataset loaded into an in-memory SQLite database. The table name equals the dataset name. Supports SELECT, WHERE, GROUP BY, ORDER BY, HAVING, LIMIT, subqueries, and CTEs.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The dataset name (used as the SQL table name)' },
          sql: { type: 'string', description: 'A valid SQL SELECT statement, e.g. SELECT column, COUNT(*) FROM dataset GROUP BY column ORDER BY COUNT(*) DESC LIMIT 10' }
        },
        required: ['name', 'sql']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_python',
      description: 'Execute a full Python analytics script in a sandboxed environment with dep_sdk, pandas, numpy, matplotlib, and seaborn available. Use for complex analysis, statistical computations, filtering, aggregations, merges, time-series, and chart generation. Load data with: import dep_sdk as dep; df = dep.get_catalog(\'DatasetName\')',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Complete Python script to execute. Must be self-contained. Use dep.get_catalog(name) to load datasets.' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'upload_artifact',
      description: 'Save a generated report, analysis table, chart description, or text output to the DEP artifact catalog. Use after completing a significant analysis to persist results.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Filename with extension, e.g. sales_summary.csv or analysis_report.txt' },
          content: { type: 'string', description: 'The text content of the report or data to save' },
          tags: { type: 'string', description: 'Optional comma-separated tags, e.g. sales,q2,summary' }
        },
        required: ['filename', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'semantic_search_artifacts',
      description: 'Search previously saved reports, analysis outputs, notebooks, and datasets by keyword. Use to discover existing work before running new analysis.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keyword or phrase to find matching artifacts' }
        },
        required: ['query']
      }
    }
  },
]

const TOOL_ICONS: Record<string, any> = {
  list_datasets: Database,
  get_dataset_columns: Terminal,
  get_dataset_shape: BarChart2,
  get_dataset_sample: Eye,
  get_dataset_summary: SlidersHorizontal,
  get_dataset_rows: Table,
  query_sql: Filter,
  query_python: Zap,
  upload_artifact: Upload,
  semantic_search_artifacts: Search,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10)

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatSessionDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function genSessionTitle(firstMessage: string): string {
  const words = firstMessage.trim().split(/\s+/).slice(0, 6).join(' ')
  return words.length > 40 ? words.slice(0, 40) + '…' : words
}

// ─── Minimal Markdown Renderer (no external deps) ────────────────────────────

function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const renderDiagram = () => {
      const w = window as any
      if (!containerRef.current || !w.mermaid) return
      try {
        containerRef.current.innerHTML = `<div class="mermaid">${chart}</div>`
        w.mermaid.init(undefined, containerRef.current.querySelectorAll('.mermaid'))
      } catch (e) {
        console.error(e)
      }
    }

    const w = window as any
    if (w.mermaid) {
      renderDiagram()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
    script.async = true
    script.onload = () => {
      w.mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })
      renderDiagram()
    }
    document.body.appendChild(script)
  }, [chart])

  return (
    <div className="my-3 flex justify-center bg-[#18181c] p-4 rounded-xl border border-border/60 overflow-x-auto w-full">
      <div ref={containerRef} className="w-full flex justify-center" />
    </div>
  )
}

function parseMentions(text: string): React.ReactNode {
  const regex = /@([a-zA-Z0-9_&]+)(?:\.([a-zA-Z0-9_]+))?/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`txt-${idx++}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    const dataset = match[1]
    const column = match[2]

    parts.push(
      <span
        key={`mention-${idx++}-${match.index}`}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold font-mono tracking-wide align-middle select-all mx-0.5"
      >
        <Database className="w-2.5 h-2.5 text-primary flex-shrink-0" />
        <span>{dataset}</span>
        {column && (
          <>
            <span className="text-text-muted">.</span>
            <span className="text-text-primary font-semibold">{column}</span>
          </>
        )}
      </span>
    )
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`txt-${idx++}`}>{text.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
}

function SaveButton({ outputId }: { outputId: number }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch(`/outputs/${outputId}/persist`, { method: 'POST' })
      setSaved(true)
    } catch (e) {
      console.error('Failed to persist temporary output:', e)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <span className="px-2 py-1 bg-[#6a9955]/20 text-[#6a9955] rounded text-[10px] font-bold flex items-center gap-1 border border-[#6a9955]/30 font-sans">
        <Check className="w-3.5 h-3.5" /> Saved to Gallery
      </span>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className="px-2 py-1 bg-primary text-white hover:bg-primary-hover rounded text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-50 font-sans"
    >
      {saving ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
        </>
      ) : (
        <>
          <Save className="w-3.5 h-3.5" /> Save to Gallery
        </>
      )}
    </button>
  )
}

function VisualizationImage({ outputId, alt }: { outputId: number; alt: string }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrlToRevoke: string | null = null

    const loadImage = async () => {
      try {
        setLoading(true)
        setError(false)

        // Try getting preview base64 first
        const data = await apiFetch<{ type: string; content: string }>(`/outputs/${outputId}/preview`)
        if (!active) return

        if (data && data.type === 'image' && data.content) {
          setImgSrc(data.content)
          setLoading(false)
          return
        }
      } catch (err) {
        console.warn('Failed to load image preview JSON, falling back to download stream:', err)
      }

      // Fallback: fetch the raw binary stream and create an Object URL
      try {
        if (!active) return
        const token = localStorage.getItem('dep_jwt_token') || localStorage.getItem('token')
        const response = await fetch(`${API_BASE_URL}/outputs/${outputId}/download`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })

        if (!active) return

        if (response.ok) {
          const blob = await response.blob()
          const objectUrl = URL.createObjectURL(blob)
          objectUrlToRevoke = objectUrl
          if (active) {
            setImgSrc(objectUrl)
            setLoading(false)
          }
        } else {
          if (active) {
            setError(true)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Failed to stream visualization image:', err)
        if (active) {
          setError(true)
          setLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      active = false
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke)
      }
    }
  }, [outputId])

  if (loading) {
    return (
      <div className="w-full h-48 flex flex-col items-center justify-center bg-input/20 animate-pulse rounded my-4 gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-text-muted">Loading visualization...</span>
      </div>
    )
  }

  if (error || !imgSrc) {
    return (
      <div className="w-full h-48 flex flex-col items-center justify-center bg-input/20 border border-dashed border-border rounded my-4 gap-2">
        <span className="text-xs text-red-400">Failed to load visualization image</span>
        <button
          onClick={() => window.open(`/api/outputs/${outputId}/download`, '_blank')}
          className="text-[10px] text-primary underline"
        >
          Open download link in new tab
        </button>
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="max-h-80 object-contain mx-auto my-4 rounded shadow-md border border-border/40 bg-white p-1"
    />
  )
}

function MarkdownBlock({ content }: { content: string }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const parts: Array<{ type: 'code'; lang: string; code: string } | { type: 'text'; content: string }> = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', lang: match[1] || 'text', code: match[2].trim() })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }

  function renderText(text: string): React.ReactNode {
    const lines = text.split('\n')
    const nodes: React.ReactNode[] = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      if (line.trim() === '') {
        i++
        continue
      }

      // 1. Table detection: line starts and ends with '|'
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const headerRow = line
        const nextLine = lines[i + 1]
        
        if (nextLine && nextLine.trim().startsWith('|') && nextLine.trim().endsWith('|') && nextLine.includes('-')) {
          const headers = headerRow.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          const separators = nextLine.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          
          const alignments = separators.map(sep => {
            const left = sep.startsWith(':')
            const right = sep.endsWith(':')
            if (left && right) return 'center'
            if (right) return 'right'
            return 'left'
          })
          
          const rows: string[][] = []
          i += 2 // skip header and separator
          
          while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            const cells = lines[i].split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            rows.push(cells)
            i++
          }
          
          nodes.push(
            <div key={`table-${i}`} className="overflow-x-auto my-3 border border-border/60 rounded-xl bg-input/40 w-full">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-input border-b border-border/80">
                    {headers.map((h, colIdx) => (
                      <th
                        key={colIdx}
                        className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px] text-text-muted"
                        style={{ textAlign: alignments[colIdx] as any }}
                      >
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-bg-hover/20 transition-colors">
                      {headers.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-4 py-2 text-text-secondary font-mono"
                          style={{ textAlign: alignments[colIdx] as any }}
                        >
                          {renderInline(row[colIdx] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          continue
        }
      }

      // 2. Image / Chart / Visualization detection
      if (line.match(/!\[([^\]]*)\]\(([^)]+)\)/)) {
        const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
        if (match) {
          const alt = match[1]
          const src = match[2]
          const outputIdMatch = src.match(/\/outputs\/(\d+)/)
          const outputId = outputIdMatch ? parseInt(outputIdMatch[1], 10) : null

          nodes.push(
            <div key={i} className="my-3 rounded-xl overflow-hidden border border-border bg-input/40 w-full flex flex-col">
              <div className="p-2 bg-input/20 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 font-sans">
                  <BarChart2 className="w-4 h-4 text-primary" /> Generated Visualization
                </span>
                {outputId && (
                  <div className="flex gap-2 font-sans">
                    <SaveButton outputId={outputId} />
                    <button
                      onClick={() => {
                        window.open(`/api/outputs/${outputId}/download`, '_blank');
                      }}
                      className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[10px] font-bold transition-all flex items-center gap-1"
                      title="Download Image"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                )}
              </div>
              {outputId ? (
                <VisualizationImage outputId={outputId} alt={alt} />
              ) : (
                <img src={src} alt={alt} className="max-h-80 object-contain mx-auto my-4 rounded shadow-md border border-border/40 bg-white p-1" />
              )}
              {alt && <div className="px-3 py-1.5 bg-input/80 text-[10px] text-text-muted text-center border-t border-border/60 font-mono">{alt}</div>}
            </div>
          )
          i++; continue
        }
      }

      if (line.startsWith('# ')) {
        nodes.push(<h1 key={i} className="text-base font-bold text-text-primary mt-3 mb-1.5 border-b border-border/40 pb-1">{renderInline(line.slice(2))}</h1>)
        i++; continue
      }
      if (line.startsWith('## ')) {
        nodes.push(<h2 key={i} className="text-sm font-bold text-text-primary mt-2.5 mb-1">{renderInline(line.slice(3))}</h2>)
        i++; continue
      }
      if (line.startsWith('### ')) {
        nodes.push(<h3 key={i} className="text-xs font-bold text-text-primary mt-2 mb-1 uppercase tracking-wide">{renderInline(line.slice(4))}</h3>)
        i++; continue
      }

      if (line.startsWith('> ')) {
        nodes.push(
          <blockquote key={i} className="border-l-2 border-primary pl-3 py-0.5 my-1 text-text-secondary italic text-xs">
            {renderInline(line.slice(2))}
          </blockquote>
        )
        i++; continue
      }

      if (line.match(/^[-*+] /)) {
        const items: string[] = []
        while (i < lines.length && lines[i].match(/^[-*+] /)) {
          items.push(lines[i].slice(2))
          i++
        }
        nodes.push(
          <ul key={`ul-${i}`} className="list-none space-y-0.5 my-1.5 pl-1">
            {items.map((it, j) => (
              <li key={j} className="flex items-start gap-2 text-xs text-text-primary">
                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                <span>{renderInline(it)}</span>
              </li>
            ))}
          </ul>
        )
        continue
      }

      if (line.match(/^\d+\. /)) {
        const items: string[] = []
        while (i < lines.length && lines[i].match(/^\d+\. /)) {
          items.push(lines[i].replace(/^\d+\. /, ''))
          i++
        }
        nodes.push(
          <ol key={`ol-${i}`} className="space-y-0.5 my-1.5 pl-1">
            {items.map((it, j) => (
              <li key={j} className="flex items-start gap-2 text-xs text-text-primary">
                <span className="text-primary font-mono flex-shrink-0 w-4 text-right">{j + 1}.</span>
                <span>{renderInline(it)}</span>
              </li>
            ))}
          </ol>
        )
        continue
      }

      if (line.match(/^[-*_]{3,}$/)) {
        nodes.push(<hr key={i} className="border-border/40 my-2" />)
        i++; continue
      }

      nodes.push(
        <p key={i} className="text-xs text-text-primary leading-relaxed my-0.5">
          {renderInline(line)}
        </p>
      )
      i++
    }

    return <>{nodes}</>
  }

  function renderInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    const regex = /(`[^`]+`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(__([^_]+)__)|(_([^_]+)_)/g
    let last = 0
    let m: RegExpExecArray | null

    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index))
      if (m[1]) {
        parts.push(<code key={m.index} className="px-1 py-0.5 bg-[var(--bg-input)] text-[var(--foreground)] font-mono text-[11px] rounded-sm border border-[var(--border)]">{m[1].slice(1, -1)}</code>)
      } else if (m[2]) {
        parts.push(<strong key={m.index} className="font-bold text-text-primary">{m[3]}</strong>)
      } else if (m[4]) {
        parts.push(<em key={m.index} className="italic text-text-secondary">{m[5]}</em>)
      } else if (m[6]) {
        parts.push(<strong key={m.index} className="font-bold text-text-primary">{m[7]}</strong>)
      } else if (m[8]) {
        parts.push(<em key={m.index} className="italic text-text-secondary">{m[9]}</em>)
      }
      last = m.index + m[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    
    // Map text elements to parseMentions for styling dataset references
    const finalParts = parts.map((part, idx) => {
      const uniqueKey = `inline-${idx}`
      if (typeof part === 'string') {
        return <React.Fragment key={uniqueKey}>{parseMentions(part)}</React.Fragment>
      }
      if (React.isValidElement(part)) {
        return React.cloneElement(part, { key: uniqueKey } as any)
      }
      return part
    })
    return <>{finalParts}</>
  }

  return (
    <div className="space-y-1 font-mono text-xs">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          // ── Mermaid diagram (legacy CDN path still supported) ──
          if (part.lang === 'mermaid') {
            return (
              <div key={i} className="my-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[#0d1117]/80">
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-sidebar)] border-b border-[var(--border)]">
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">◆ Diagram</span>
                </div>
                <div className="p-3">
                  <MermaidChart code={part.code} />
                </div>
              </div>
            )
          }

          // ── Native recharts blocks ──
          if (part.lang.startsWith('chart:')) {
            const chartType = part.lang.replace('chart:', '') as any
            let spec: any = null
            let parseError: string | null = null
            try {
              spec = JSON.parse(part.code)
              spec.type = chartType
            } catch (e: any) {
              parseError = e.message
            }
            const chartLabel: Record<string, string> = {
              pie: '🥧 Pie Chart', bar: '📊 Bar Chart', line: '📈 Line Chart',
              area: '🌊 Area Chart', radar: '🕸 Radar Chart', treemap: '🗺 Treemap',
            }
            return (
              <div key={i} className="my-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]/60 shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-sidebar)] border-b border-[var(--border)]">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-wide">
                    {chartLabel[chartType] || `Chart: ${chartType}`}
                    {spec?.title && <span className="text-[var(--text-primary)] ml-2">{spec.title}</span>}
                  </span>
                  <button
                    onClick={() => copyCode(part.code)}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                  >
                    {copiedCode === part.code ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy data</>}
                  </button>
                </div>
                <div className="px-4 py-3">
                  {parseError ? (
                    <div className="relative group">
                      <pre className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-4 py-3 overflow-x-auto text-[11.5px] leading-relaxed text-[var(--text-secondary)] font-mono">
                        <code>{part.code}</code>
                      </pre>
                      <span className="absolute bottom-2 right-2 text-[9px] text-[var(--text-muted)] animate-pulse bg-black/50 border border-[var(--border)]/40 px-2 py-0.5 rounded font-sans">
                        Streaming data...
                      </span>
                    </div>
                  ) : (
                    <AIChart spec={spec} />
                  )}
                </div>
              </div>
            )
          }

          // ── Standard code block ──
          return (
            <div key={i} className="relative group my-2">
              <div className="flex items-center justify-between bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-t-sm px-3 py-1.5">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">{part.lang || 'code'}</span>
                <button
                  onClick={() => copyCode(part.code)}
                  className="text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                >
                  {copiedCode === part.code ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="bg-[var(--bg-input)] border border-[var(--border)] border-t-0 rounded-b-sm px-4 py-3 overflow-x-auto text-[11px] leading-relaxed text-[var(--text-primary)]">
                <code>{part.code}</code>
              </pre>
            </div>
          )
        }
        return <div key={i}>{renderText(part.content)}</div>
      })}
    </div>
  )
}

// ─── Tool Step Card (Claude-style collapsible) ────────────────────────────────

function parseArtifactIdsFromOutput(output: string): { id: number; name: string }[] {
  if (typeof output !== 'string') return []
  const list: { id: number; name: string }[] = []
  const localFileRegex = /Saved local file:\s*([^\s\n\r]+)/gi
  const uploadRegex = /Uploaded artifact successfully to backend output store \(ID:\s*(\d+)\)/gi

  let uploadMatch
  const uploadIds: number[] = []
  while ((uploadMatch = uploadRegex.exec(output)) !== null) {
    uploadIds.push(parseInt(uploadMatch[1], 10))
  }

  let fileMatch
  const filenames: string[] = []
  while ((fileMatch = localFileRegex.exec(output)) !== null) {
    filenames.push(fileMatch[1])
  }

  for (let i = 0; i < uploadIds.length; i++) {
    const id = uploadIds[i]
    const fname = filenames[i] || `artifact-${id}.png`
    list.push({ id, name: fname })
  }
  return list
}

function ArtifactImagePreview({ id, name }: { id: number; name: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const fetchImage = async () => {
      try {
        const token = localStorage.getItem('dep_jwt_token') || localStorage.getItem('token') || ''
        const url = `/api/outputs/${id}/download`
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        if (active) {
          const objectUrl = URL.createObjectURL(blob)
          setBlobUrl(objectUrl)
          setLoading(false)
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Error loading image')
          setLoading(false)
        }
      }
    }

    fetchImage()
    return () => {
      active = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono py-2">
        <Loader2 className="w-3 h-3 animate-spin text-primary" />
        <span>Loading generated chart '{name}'...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-[10px] text-red-400 font-mono py-1">
        Failed to load chart '{name}': {error}
      </div>
    )
  }

  return (
    <div className="my-2.5 max-w-full">
      <p className="text-[10px] font-mono uppercase text-[var(--text-secondary)] mb-1.5">Generated Visualisation: {name}</p>
      <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[#1e1e1e] p-2 inline-block max-w-full">
        <img
          src={blobUrl || ''}
          alt={name}
          className="max-h-96 object-contain rounded-lg shadow-md max-w-full"
        />
      </div>
    </div>
  )
}

function highlightPython(code: string) {
  const lines = code.split('\n')
  return lines.map((line, idx) => {
    const tokens: React.ReactNode[] = []
    const regex = /(\s+)|(#.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(?:def|class|import|from|as|try|except|print|if|else|elif|for|in|while|return|raise|pass|with|lambda|Exception|None|True|False)\b)|(\b\d+\b)/g
    
    let last = 0
    let match
    
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) {
        tokens.push(line.slice(last, match.index))
      }
      
      const [full, ws, comment, str, keyword, num] = match
      if (ws) {
        tokens.push(ws)
      } else if (comment) {
        tokens.push(<span key={match.index} className="text-[#6a9955] italic">{comment}</span>)
      } else if (str) {
        tokens.push(<span key={match.index} className="text-[#ce9178]">{str}</span>)
      } else if (keyword) {
        tokens.push(<span key={match.index} className="text-[#569cd6] font-semibold">{keyword}</span>)
      } else if (num) {
        tokens.push(<span key={match.index} className="text-[#b5cea8]">{num}</span>)
      }
      last = regex.lastIndex
    }
    
    if (last < line.length) {
      tokens.push(line.slice(last))
    }
    
    return (
      <div key={idx} className="min-h-[1.5em] whitespace-pre font-mono">
        <span className="text-[10px] text-text-muted select-none w-6 inline-block text-right pr-2 border-r border-border/20 mr-2">{idx + 1}</span>
        <span>{tokens.length > 0 ? tokens : line}</span>
      </div>
    )
  })
}

function ToolStepCard({ step, index }: { step: ToolCallStep; index: number }) {
  const [open, setOpen] = useState(step.status === 'running')
  const Icon = TOOL_ICONS[step.tool_name] || Wrench

  useEffect(() => {
    if (step.status !== 'running') {
      setOpen(false)
    } else {
      setOpen(true)
    }
  }, [step.status])

  const statusColor = step.status === 'running' ? 'text-blue-400' : step.status === 'error' ? 'text-red-400' : 'text-green-400'
  const statusBg = step.status === 'running' ? 'border-blue-500/40 bg-blue-500/10' : step.status === 'error' ? 'border-red-500/40 bg-red-500/10' : 'border-green-500/40 bg-green-500/10'

  const formatResult = (result: any): string => {
    if (!result) return ''
    if (typeof result === 'string') return result
    if (result.content && Array.isArray(result.content)) {
      return result.content.map((c: any) => c.text || c.content || '').join('\n')
    }
    return JSON.stringify(result, null, 2)
  }

  return (
    <div className={`border rounded-xl my-2 transition-all ${statusBg}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
      >
        <div className={`flex-shrink-0 ${statusColor}`}>
          {step.status === 'running'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : step.status === 'error'
            ? <AlertCircle className="w-3.5 h-3.5" />
            : <CheckCircle2 className="w-3.5 h-3.5" />}
        </div>
        <Icon className="w-3 h-3 text-text-secondary flex-shrink-0" />
        <span className="text-[11px] font-mono font-semibold text-text-primary flex-1">
          {step.tool_name}
          {step.arguments && Object.keys(step.arguments).length > 0 && (
            <span className="text-text-secondary font-normal ml-1.5">
              ({Object.entries(step.arguments).map(([k, v]) => {
                let valStr = String(v)
                if (k === 'code' && step.tool_name === 'query_python') {
                  const firstLine = valStr.split('\n')[0].trim()
                  valStr = firstLine + ' ...'
                } else if (valStr.length > 50) {
                  valStr = valStr.slice(0, 50) + '...'
                }
                return `${k}: "${valStr}"`
              }).join(', ')})
            </span>
          )}
        </span>
        {step.duration_ms && (
          <span className="text-[10px] text-text-muted font-mono">{step.duration_ms}ms</span>
        )}
        {open ? <ChevronDown className="w-3 h-3 text-text-muted" /> : <ChevronRight className="w-3 h-3 text-text-muted" />}
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
          {step.arguments && Object.entries(step.arguments).map(([key, val]) => {
            if (key === 'code' && step.tool_name === 'query_python') {
              return (
                <div key={key} className="w-full">
                  <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Python Source Code</p>
                  <div className="bg-[#1e1e1e] border border-border/60 rounded-xl px-4 py-3 overflow-x-auto text-[11px] leading-relaxed text-[#d4d4d4] max-h-72 overflow-y-auto w-full">
                    {highlightPython(String(val))}
                  </div>
                </div>
              )
            }
            return (
              <div key={key}>
                <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Argument: {key}</p>
                <pre className="text-[11px] font-mono text-text-secondary bg-[var(--bg-input)] border border-[var(--border)] rounded-sm px-2.5 py-1.5 overflow-x-auto w-full">
                  {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                </pre>
              </div>
            )
          })}
          {step.status !== 'running' && (
            <div>
              <p className="text-[10px] font-mono uppercase text-text-muted mb-1">
                {step.status === 'error' ? 'Error' : 'Output'}
              </p>
              <pre className={`text-[11px] font-mono rounded-sm px-2.5 py-1.5 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto w-full ${
                step.status === 'error' ? 'text-[#f44747] bg-[#f44747]/5 border border-[#f44747]/20' : 'text-[#6a9955] bg-[var(--bg-input)] border border-[var(--border)]'
              }`}>
                {step.status === 'error' ? step.error : formatResult(step.result)}
              </pre>
            </div>
          )}
          {step.status === 'done' && step.tool_name === 'query_python' && (
            <div className="pt-2">
              {parseArtifactIdsFromOutput(formatResult(step.result)).map(art => (
                <ArtifactImagePreview key={art.id} id={art.id} name={art.name} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  provider,
  username,
  onCopy,
  onDelete,
  onRetry,
  isLast,
  isGenerating,
  handleContinue,
  onEdit,
}: {
  message: ChatMessage
  provider: LLMProvider
  username: string
  onCopy: (text: string) => void
  onDelete: (id: string) => void
  onRetry?: () => void
  isLast?: boolean
  isGenerating?: boolean
  handleContinue?: () => void
  onEdit?: (id: string, newContent: string) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const [copied, setCopied] = useState(false)
  const [thinkingOpen, setThinkingOpen] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editVal, setEditVal] = useState(message.content)

  const isUser = message.role === 'user'
  const prov = PROVIDERS[provider]

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([message.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dep-ai-response-${new Date(message.timestamp).toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col w-full">
      <div
      className={`group relative flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]/30 ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-sm border border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-center overflow-hidden">
            <img
              src={prov.logoUrl}
              alt={prov.name}
              className="w-4 h-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
              }}
            />
            <Sparkles className="w-3.5 h-3.5 text-primary hidden" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col gap-1.5 max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Meta row */}
        <div className={`flex items-center gap-2 text-[10px] text-text-muted font-mono ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="font-semibold text-text-secondary">{isUser ? (username ? username.charAt(0).toUpperCase() + username.slice(1) : 'You') : prov.name}</span>
          {message.model && !isUser && <span className="opacity-60">· {message.model}</span>}
          <span className="opacity-50">{formatTime(message.timestamp)}</span>
        </div>

        {/* Thinking block */}
        {message.thinking && (
          <button
            onClick={() => setThinkingOpen(!thinkingOpen)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors self-start"
          >
            {thinkingOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Info className="w-3 h-3" />
            Thinking process
          </button>
        )}
        {message.thinking && thinkingOpen && (
          <div className="bg-[#0f1117] border border-[#2a2a3e] rounded-sm px-3 py-2.5 text-[11px] font-mono text-[#8a9bb0] italic leading-relaxed max-h-40 overflow-y-auto self-start w-full">
            {message.thinking}
          </div>
        )}

        {/* Tool steps */}
        {message.tool_steps && message.tool_steps.length > 0 && (
          <div className="w-full space-y-0.5">
            {message.tool_steps.map((step, i) => (
              <ToolStepCard key={step.id} step={step} index={i} />
            ))}
          </div>
        )}

        {/* Main message bubble */}
        {message.content && (
          <div className={`rounded-2xl px-4 py-3 border w-full ${
            isUser
              ? 'bg-[var(--chat-user-bg)] border-[var(--chat-user-border)] text-[var(--chat-user-text)] rounded-tr-none'
              : 'bg-[var(--chat-ai-bg)] border-[var(--chat-ai-border)] text-[var(--chat-ai-text)] rounded-tl-none'
          }`}>
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full min-w-[280px] py-1">
                <textarea
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-sm p-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-primary resize-none min-h-[60px] leading-relaxed"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      if (editVal.trim()) {
                        onEdit?.(message.id, editVal.trim())
                        setIsEditing(false)
                      }
                    }}
                    disabled={isGenerating || !editVal.trim()}
                    className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-white rounded-sm text-[10px] font-bold transition-colors disabled:opacity-40"
                  >
                    Save & Resend
                  </button>
                  <button
                    onClick={() => {
                      setEditVal(message.content)
                      setIsEditing(false)
                    }}
                    className="px-2.5 py-1 border border-border text-text-secondary hover:text-text-primary rounded-sm text-[10px] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : message.isStreaming && !message.content ? (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : isUser ? (
              <p className="text-xs font-mono whitespace-pre-wrap">{parseMentions(message.content)}</p>
            ) : (
              <MarkdownBlock content={message.content} />
            )}
          </div>
        )}

        {/* Streaming indicator when no content yet */}
        {message.isStreaming && !message.content && !message.tool_steps?.length && (
          <div className="bg-[var(--chat-ai-bg)] border border-[var(--chat-ai-border)] text-[var(--chat-ai-text)] rounded-2xl rounded-tl-none px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)]" />
              Processing...
            </div>
          </div>
        )}
      </div>

      {/* Action buttons on hover */}
      {showActions && !message.isStreaming && (
        <div className={`absolute top-2 flex items-center gap-0.5 bg-[#252526] border border-border rounded-sm px-1 py-0.5 shadow-lg z-10 ${
          isUser ? 'left-2' : 'right-2'
        }`}>
          <button
            onClick={handleCopy}
            title="Copy"
            className="p-1 hover:bg-bg-hover rounded-sm transition-colors text-text-secondary hover:text-text-primary"
          >
            {copied ? <Check className="w-3 h-3 text-[#6a9955]" /> : <Copy className="w-3 h-3" />}
          </button>
          
          {isUser && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              title="Edit Message"
              className="p-1 hover:bg-bg-hover rounded-sm transition-colors text-text-secondary hover:text-text-primary"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}

          {!isUser && (
            <button
              onClick={handleDownload}
              title="Download as Markdown"
              className="p-1 hover:bg-bg-hover rounded-sm transition-colors text-text-secondary hover:text-text-primary"
            >
              <Download className="w-3 h-3" />
            </button>
          )}
          {!isUser && onRetry && (
            <button
              onClick={onRetry}
              title="Regenerate"
              className="p-1 hover:bg-bg-hover rounded-sm transition-colors text-text-secondary hover:text-text-primary"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => onDelete(message.id)}
            title="Delete"
            className="p-1 hover:bg-[#f44747]/10 rounded-sm transition-colors text-text-secondary hover:text-[#f44747]"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-sm border border-[#007acc]/40 bg-[#007acc] flex items-center justify-center text-[11px] font-bold text-white font-mono">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      )}
    </div>
    {isLast && !isUser && !message.isStreaming && !isGenerating && handleContinue && (
      <div className="flex justify-start pl-14 pb-2">
        <button
          onClick={handleContinue}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/20 rounded-full text-[10px] font-semibold transition-all duration-300 shadow-sm"
        >
          <Play className="w-2.5 h-2.5 fill-[var(--primary)] text-[var(--primary)] animate-pulse" />
          <span>Continue Response</span>
        </button>
      </div>
    )}
  </div>
  )
}

function parseThinkingAndContent(rawText: string): { thinking?: string; content: string } {
  const thinkStart = rawText.indexOf('<think>')
  const thinkEnd = rawText.indexOf('</think>')

  if (thinkStart !== -1) {
    if (thinkEnd !== -1) {
      const thinking = rawText.slice(thinkStart + 7, thinkEnd).trim()
      const content = (rawText.slice(0, thinkStart) + rawText.slice(thinkEnd + 8)).trim()
      return { thinking, content }
    } else {
      const thinking = rawText.slice(thinkStart + 7).trim()
      const content = rawText.slice(0, thinkStart).trim()
      return { thinking, content }
    }
  }
  return { content: rawText }
}

function translateOpenAiToAnthropic(messages: any[]) {
  const anthropicMessages: any[] = []

  for (const m of messages) {
    if (m.role === 'system') continue

    if (m.role === 'user') {
      anthropicMessages.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant') {
      if (m.tool_calls && m.tool_calls.length > 0) {
        const contentArray: any[] = []
        if (m.content) {
          contentArray.push({ type: 'text', text: m.content })
        }
        m.tool_calls.forEach((tc: any) => {
          contentArray.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments
          })
        })
        anthropicMessages.push({ role: 'assistant', content: contentArray })
      } else {
        anthropicMessages.push({ role: 'assistant', content: m.content })
      }
    } else if (m.role === 'tool') {
      const resultBlock = {
        type: 'tool_result',
        tool_use_id: m.tool_call_id,
        content: m.content
      }

      const prevMessage = anthropicMessages[anthropicMessages.length - 1]
      if (prevMessage && prevMessage.role === 'user' && Array.isArray(prevMessage.content) && prevMessage.content[0]?.type === 'tool_result') {
        prevMessage.content.push(resultBlock)
      } else {
        anthropicMessages.push({
          role: 'user',
          content: [resultBlock]
        })
      }
    }
  }

  return anthropicMessages
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GovernedAIClient({ username }: { username: string }) {
  const { showToast } = useToast()

  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  // LLM Config
  const [provider, setProvider] = useState<LLMProvider>(() => {
    if (typeof window !== 'undefined' && username) {
      return (localStorage.getItem(`dep-llm-provider-${username}`) as LLMProvider) || 'gemini'
    }
    return 'gemini'
  })
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined' && username) {
      return localStorage.getItem(`dep-llm-apikey-${username}`) || ''
    }
    return ''
  })
  const [endpoint, setEndpoint] = useState(() => {
    if (typeof window !== 'undefined' && username) {
      return localStorage.getItem(`dep-llm-endpoint-${username}`) || ''
    }
    return ''
  })
  const [model, setModel] = useState(() => {
    if (typeof window !== 'undefined' && username) {
      return localStorage.getItem(`dep-llm-model-${username}`) || ''
    }
    return ''
  })
  const [modelsList, setModelsList] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [providersConfig, setProvidersConfig] = useState<Record<string, { api_key: string; endpoint: string; model: string }>>(() => {
    if (typeof window !== 'undefined' && username) {
      const cached = localStorage.getItem(`dep-llm-providers-config-${username}`)
      if (cached) {
        try {
          return JSON.parse(cached)
        } catch (_) {}
      }
    }
    return {}
  })

  // Dynamic Zero-Row Privacy Mode toggle in the UI
  const [chatPrivacyMode, setChatPrivacyMode] = useState(true)

  // Chat Input
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Autocomplete mentions state ──
  interface DatasetAutocomplete {
    name: string
    columns: string[]
  }
  const [autocompleteData, setAutocompleteData] = useState<DatasetAutocomplete[]>([])
  const [mentionTrigger, setMentionTrigger] = useState<{
    type: 'dataset' | 'column'
    query: string
    startIndex: number
    datasetName?: string
  } | null>(null)
  const [suggestedIndex, setSuggestedIndex] = useState(0)

  // Load autocomplete data (datasets & permitted columns)
  useEffect(() => {
    if (!username) return
    const fetchAutocomplete = async () => {
      try {
        const res = await apiFetch<any[]>('/access/datasets/me')
        const mapped = res.map((d: any) => ({
          name: d.dataset_name,
          columns: d.allowed_columns || []
        }))
        setAutocompleteData(mapped)
      } catch (_) {
        try {
          const res = await apiFetch<any[]>('/catalog')
          const mapped = res.map((d: any) => ({
            name: d.name,
            columns: (d.schema_fields || []).map((sf: any) => sf.column_name)
          }))
          setAutocompleteData(mapped)
        } catch (err) {
          console.error("Failed to load autocomplete data", err)
        }
      }
    }
    fetchAutocomplete()
  }, [username])

  const getActiveMention = (text: string, cursorIndex: number) => {
    const sub = text.slice(0, cursorIndex)
    
    // Check for column trigger: e.g. @L&T.col
    const colMatch = sub.match(/@([a-zA-Z0-9_&]+)\.([a-zA-Z0-9_]*)$/)
    if (colMatch) {
      const datasetName = colMatch[1]
      const columnQuery = colMatch[2]
      const startIndex = cursorIndex - colMatch[0].length
      return {
        type: 'column' as const,
        query: columnQuery,
        datasetName,
        startIndex
      }
    }

    // Check for dataset trigger: e.g. @L&T
    const dsMatch = sub.match(/@([a-zA-Z0-9_&]*)$/)
    if (dsMatch) {
      const datasetQuery = dsMatch[1]
      const startIndex = cursorIndex - dsMatch[0].length
      return {
        type: 'dataset' as const,
        query: datasetQuery,
        startIndex
      }
    }

    return null
  }

  const getFilteredSuggestions = () => {
    if (!mentionTrigger) return []
    const query = mentionTrigger.query.toLowerCase()
    
    if (mentionTrigger.type === 'dataset') {
      return autocompleteData
        .map(d => d.name)
        .filter(name => name.toLowerCase().includes(query))
    } else {
      const ds = autocompleteData.find(
        d => d.name.toLowerCase() === mentionTrigger.datasetName?.toLowerCase()
      )
      if (!ds) return []
      return ds.columns.filter(col => col.toLowerCase().includes(query))
    }
  }

  const filteredSuggestions = getFilteredSuggestions()

  const applySuggestion = (suggestion: string) => {
    if (!mentionTrigger || !inputRef.current) return

    const before = input.slice(0, mentionTrigger.startIndex)
    const after = input.slice(inputRef.current.selectionStart)
    
    let inserted = ''
    if (mentionTrigger.type === 'dataset') {
      inserted = `@${suggestion}.`
    } else {
      inserted = `@${mentionTrigger.datasetName}.${suggestion} `
    }

    const newVal = before + inserted + after
    setInput(newVal)
    setMentionTrigger(null)
    setSuggestedIndex(0)

    const newCursorPos = mentionTrigger.startIndex + inserted.length
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleSelectionChange = () => {
    if (!inputRef.current) return
    const cursor = inputRef.current.selectionStart
    const trigger = getActiveMention(input, cursor)
    setMentionTrigger(trigger)
    setSuggestedIndex(0)
  }

  // ── Sync states from localStorage when username becomes available ──
  useEffect(() => {
    if (!username) return

    const cachedProvider = localStorage.getItem(`dep-llm-provider-${username}`) as LLMProvider
    if (cachedProvider) setProvider(cachedProvider)

    const cachedApiKey = localStorage.getItem(`dep-llm-apikey-${username}`)
    if (cachedApiKey) setApiKey(cachedApiKey)

    const cachedEndpoint = localStorage.getItem(`dep-llm-endpoint-${username}`)
    if (cachedEndpoint) setEndpoint(cachedEndpoint)

    const cachedModel = localStorage.getItem(`dep-llm-model-${username}`)
    if (cachedModel) setModel(cachedModel)

    const cachedProvRaw = localStorage.getItem(`dep-llm-providers-config-${username}`)
    if (cachedProvRaw) {
      try {
        setProvidersConfig(JSON.parse(cachedProvRaw))
      } catch (_) {}
    }
  }, [username])

  // ── Load state: server-first, localStorage fallback ──────────────────────
  useEffect(() => {
    if (!username) return
    const localKey = `dep-ai-sessions-${username}`

    const load = async () => {
      try {
        // 1. Fetch sessions from server
        const serverSessions: ChatSession[] = await apiFetch<ChatSession[]>('/ai-sessions')

        // 2. Check for any local sessions that haven't been synced yet
        const localRaw = localStorage.getItem(localKey)
        const localSessions: ChatSession[] = localRaw ? JSON.parse(localRaw) : []

        // 3. Merge: local sessions not present on server get bulk-migrated
        const serverIds = new Set(serverSessions.map(s => s.id))
        const unsynced = localSessions.filter(s => !serverIds.has(s.id))
        if (unsynced.length > 0) {
          try {
            await apiFetch('/ai-sessions/bulk', {
              method: 'POST',
              body: JSON.stringify({ sessions: unsynced }),
            })
          } catch (_) { /* best-effort migration */ }
        }

        // 4. Build final merged list: server is source of truth, local fills gaps
        const merged = [...serverSessions]
        unsynced.forEach(s => { if (!serverIds.has(s.id)) merged.unshift(s) })
        merged.sort((a, b) => b.updated_at - a.updated_at)

        setSessions(merged)
        if (merged.length > 0) setActiveSessionId(merged[0].id)

        // 5. Load LLM prefs from server
        const prefs = await apiFetch<{
          provider: string
          api_key: string
          endpoint: string
          model: string
          providers?: Record<string, { api_key: string; endpoint: string; model: string }>
        }>('/ai-sessions/prefs')

        if (prefs.providers) {
          setProvidersConfig(prefs.providers)
        }
        if (prefs.provider) setProvider(prefs.provider as LLMProvider)
        if (prefs.api_key)  setApiKey(prefs.api_key)
        if (prefs.endpoint) setEndpoint(prefs.endpoint)
        if (prefs.model)    setModel(prefs.model)

        // Keep localStorage in sync as offline cache
        localStorage.setItem(localKey, JSON.stringify(merged))
        localStorage.setItem(`dep-llm-provider-${username}`, prefs.provider || 'gemini')
        localStorage.setItem(`dep-llm-apikey-${username}`,   prefs.api_key  || '')
        localStorage.setItem(`dep-llm-endpoint-${username}`, prefs.endpoint || '')
        localStorage.setItem(`dep-llm-model-${username}`,    prefs.model    || '')
        if (prefs.providers) {
          localStorage.setItem(`dep-llm-providers-config-${username}`, JSON.stringify(prefs.providers))
        }
      } catch (_) {
        // Server unreachable — fall back to localStorage
        const localRaw = localStorage.getItem(localKey)
        const saved: ChatSession[] = localRaw ? JSON.parse(localRaw) : []
        setSessions(saved)
        if (saved.length > 0) setActiveSessionId(saved[0].id)

        const cachedProvRaw = localStorage.getItem(`dep-llm-providers-config-${username}`)
        if (cachedProvRaw) {
          try {
            setProvidersConfig(JSON.parse(cachedProvRaw))
          } catch {}
        }

        setProvider((localStorage.getItem(`dep-llm-provider-${username}`) as LLMProvider) || 'gemini')
        setApiKey(localStorage.getItem(`dep-llm-apikey-${username}`) || '')
        setEndpoint(localStorage.getItem(`dep-llm-endpoint-${username}`) || '')
        setModel(localStorage.getItem(`dep-llm-model-${username}`) || '')
      }
    }

    load()
  }, [username])

  // ── Persist sessions: debounced server upsert + localStorage cache ─────────
  const pendingUpsertRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!username || sessions.length === 0) return
    const localKey = `dep-ai-sessions-${username}`
    // Always update localStorage immediately as offline cache
    localStorage.setItem(localKey, JSON.stringify(sessions))
    // Debounce server upserts to avoid hammering on every keystroke
    if (pendingUpsertRef.current) clearTimeout(pendingUpsertRef.current)
    pendingUpsertRef.current = setTimeout(async () => {
      try {
        await apiFetch('/ai-sessions/bulk', {
          method: 'POST',
          body: JSON.stringify({ sessions }),
        })
      } catch (_) { /* best-effort */ }
    }, 1500)
    return () => {
      if (pendingUpsertRef.current) clearTimeout(pendingUpsertRef.current)
    }
  }, [sessions, username])

  // ── Fetch models when provider/key changes ──
  useEffect(() => {
    if (provider !== 'ollama' && !apiKey.trim()) { setModelsList([]); return }
    let active = true
    setIsFetchingModels(true)
    const load = async () => {
      // Curated fallback model lists (shown when API fetch fails or key is invalid)
      const FALLBACK_MODELS: Partial<Record<LLMProvider, string[]>> = {
        gemini: [
          'gemini-2.5-flash',
          'gemini-2.5-pro',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
          'gemini-1.5-flash',
          'gemini-1.5-flash-8b',
          'gemini-1.5-pro',
        ],
        groq: [
          'llama-3.3-70b-versatile',
          'llama-3.1-8b-instant',
          'mixtral-8x7b-32768',
          'gemma2-9b-it',
        ],
      }
      try {
        let list: string[] = []
        if (provider === 'gemini') {
          // Attempt API fetch with key — Google issues both AIza... and AQ... style keys
          if (apiKey.trim().length > 10) {
            try {
              const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
              if (r.ok) {
                const d = await r.json()
                list = (d.models || [])
                  .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                  .map((m: any) => m.name.replace('models/', ''))
              }
            } catch { /* ignore, fall through to curated list */ }
          }
          // Always merge curated fallbacks (deduplicate)
          const fallback = FALLBACK_MODELS.gemini || []
          list = [...new Set([...list, ...fallback])]
        } else if (provider === 'groq') {
          const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } })
          if (!r.ok) throw new Error()
          list = (await r.json()).data?.map((m: any) => m.id) || []
          const fallback = FALLBACK_MODELS.groq || []
          list = [...new Set([...list, ...fallback])]
        } else if (provider === 'openrouter') {
          const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } })
          if (!r.ok) throw new Error()
          list = (await r.json()).data?.map((m: any) => m.id) || []
        } else if (provider === 'ollama') {
          const base = endpoint || 'http://localhost:11434'
          const r = await fetch(`${base.replace(/\/$/, '')}/api/tags`)
          if (!r.ok) throw new Error()
          list = (await r.json()).models?.map((m: any) => m.name) || []
        }
        if (active) {
          setModelsList(list)
          if (list.length > 0 && !list.includes(model)) setModel(list[0])
        }
      } catch {
        if (active) {
          // On any failure, show fallback curated list so the UI is never empty
          const fallback = FALLBACK_MODELS[provider] || []
          setModelsList(fallback)
          if (fallback.length > 0 && !fallback.includes(model)) setModel(fallback[0])
        }
      } finally { if (active) setIsFetchingModels(false) }
    }
    load()
    return () => { active = false }
  }, [provider, apiKey, endpoint])

  // ── Auto-scroll ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions, isGenerating])

  const lastSyncedSessionIdRef = useRef<string | null>(null)
  // ── Sync global LLM config when switching sessions ──
  useEffect(() => {
    if (!activeSessionId || Object.keys(providersConfig).length === 0) return
    if (lastSyncedSessionIdRef.current === activeSessionId) return
    const s = sessions.find(sess => sess.id === activeSessionId)
    if (s && s.provider) {
      const conf = providersConfig[s.provider] || { api_key: '', endpoint: '', model: '' }
      setProvider(s.provider)
      setApiKey(conf.api_key || '')
      setEndpoint(conf.endpoint || '')
      setModel(s.model || conf.model || '')
      lastSyncedSessionIdRef.current = activeSessionId
    }
  }, [activeSessionId, sessions, providersConfig])

  // ── Active session helpers ──
  const activeSession = sessions.find(s => s.id === activeSessionId) || null

  const updateSession = useCallback((id: string, updater: (s: ChatSession) => ChatSession) => {
    setSessions(prev => prev.map(s => s.id === id ? updater(s) : s))
  }, [])

  const newSession = () => {
    const s: ChatSession = {
      id: genId(),
      title: 'New conversation',
      created_at: Date.now(),
      updated_at: Date.now(),
      messages: [],
      provider,
      model,
    }
    setSessions(prev => [s, ...prev])
    setActiveSessionId(s.id)
  }

  const deleteSession = async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id)
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null)
    }
    // Delete from server (fire-and-forget)
    try {
      await apiFetch(`/ai-sessions/${id}`, { method: 'DELETE' })
    } catch (_) { /* best-effort */ }
    // Remove from localStorage cache
    if (username) {
      const localKey = `dep-ai-sessions-${username}`
      const cached: ChatSession[] = JSON.parse(localStorage.getItem(localKey) || '[]')
      localStorage.setItem(localKey, JSON.stringify(cached.filter(s => s.id !== id)))
    }
  }

  const handleProviderChange = (newProvider: LLMProvider) => {
    // 1. Save currently edited values for the old provider
    const updated = {
      ...providersConfig,
      [provider]: {
        api_key: apiKey || '',
        endpoint: endpoint || '',
        model: model || '',
      }
    }
    const sanitized: Record<string, { api_key: string; endpoint: string; model: string }> = {}
    for (const key of Object.keys(updated)) {
      const conf = updated[key] || {}
      sanitized[key] = {
        api_key: conf.api_key || '',
        endpoint: conf.endpoint || '',
        model: conf.model || '',
      }
    }
    setProvidersConfig(sanitized)

    // 2. Load values for the new provider
    const conf = sanitized[newProvider] || { api_key: '', endpoint: '', model: '' }
    setProvider(newProvider)
    setApiKey(conf.api_key || '')
    setEndpoint(conf.endpoint || '')
    setModel(conf.model || '')
    setModelsList([])
  }

  const saveSettings = async () => {
    const rawConfigs = {
      ...providersConfig,
      [provider]: {
        api_key: apiKey || '',
        endpoint: endpoint || '',
        model: model || '',
      }
    }

    const sanitizedProviders: Record<string, { api_key: string; endpoint: string; model: string }> = {}
    for (const key of Object.keys(rawConfigs)) {
      const conf = rawConfigs[key] || {}
      sanitizedProviders[key] = {
        api_key: conf.api_key || '',
        endpoint: conf.endpoint || '',
        model: conf.model || '',
      }
    }
    setProvidersConfig(sanitizedProviders)

    // Persist to localStorage as offline cache
    localStorage.setItem(`dep-llm-provider-${username}`, provider)
    localStorage.setItem(`dep-llm-apikey-${username}`, apiKey || '')
    localStorage.setItem(`dep-llm-endpoint-${username}`, endpoint || '')
    localStorage.setItem(`dep-llm-model-${username}`, model || '')
    localStorage.setItem(`dep-llm-providers-config-${username}`, JSON.stringify(sanitizedProviders))

    // Persist to server for cross-device/cross-login persistence
    try {
      await apiFetch('/ai-sessions/prefs', {
        method: 'PUT',
        body: JSON.stringify({
          provider,
          api_key: apiKey || '',
          endpoint: endpoint || '',
          model: model || '',
          providers: sanitizedProviders,
        }),
      })
    } catch (_) { /* best-effort */ }

    // Sync active session provider and model
    if (activeSessionId) {
      updateSession(activeSessionId, s => ({
        ...s,
        provider,
        model,
      }))
    }

    setShowSettings(false)
    showToast({ type: 'success', title: 'Settings Saved', message: 'LLM configuration updated.' })
  }

  // ── Send message ──
  const sendMessage = async () => {
    if (!input.trim() || isGenerating) return
    if (provider !== 'ollama' && !apiKey) {
      showToast({ type: 'error', title: 'API Key Required', message: `Enter an API key for ${PROVIDERS[provider].name} in settings.` })
      setShowSettings(true)
      return
    }

    let sessionId = activeSessionId
    const userContent = input.trim()
    setInput('')

    // Create session if needed
    if (!sessionId) {
      const s: ChatSession = {
        id: genId(),
        title: genSessionTitle(userContent),
        created_at: Date.now(),
        updated_at: Date.now(),
        messages: [],
        provider,
        model,
      }
      setSessions(prev => [s, ...prev])
      setActiveSessionId(s.id)
      sessionId = s.id
    }

    const userMsg: ChatMessage = { id: genId(), role: 'user', content: userContent, timestamp: Date.now() }
    const assistantMsgId = genId()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      tool_steps: [],
      isStreaming: true,
      model,
    }

    updateSession(sessionId, s => ({
      ...s,
      title: s.messages.length === 0 ? genSessionTitle(userContent) : s.title,
      updated_at: Date.now(),
      messages: [...s.messages, userMsg, assistantMsg],
    }))

    setIsGenerating(true)

    const currentSession = sessions.find(s => s.id === sessionId)
    const historyMessages = currentSession?.messages || []

    // Build messages for API
    const apiMessages: any[] = [
      { role: 'system', content: buildSystemPrompt(chatPrivacyMode) }
    ]

    for (const m of historyMessages) {
      if (m.role === 'system') continue

      if (m.role === 'user') {
        apiMessages.push({ role: 'user', content: m.content })
      } else if (m.role === 'assistant') {
        if (m.tool_steps && m.tool_steps.length > 0) {
          // Push assistant message with tool_calls
          apiMessages.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.tool_steps.map(step => {
              const tc: any = {
                id: step.id,
                type: 'function',
                function: {
                  name: step.tool_name,
                  arguments: typeof step.arguments === 'string'
                    ? step.arguments
                    : JSON.stringify(step.arguments)
                }
              }
              if (step.extra_fields) {
                Object.assign(tc, step.extra_fields)
              }
              return tc
            })
          })
          // Push corresponding tool responses
          for (const step of m.tool_steps) {
            // IMPORTANT: JSON.stringify(undefined) returns JS `undefined` (not a string),
            // which silently drops the `content` key — causing 400 "content is missing".
            // Always fall back to the string "null" to satisfy the OpenAI/Groq spec.
            const toolContent = step.error
              ? JSON.stringify({ error: step.error })
              : (JSON.stringify(step.result) ?? 'null')
            apiMessages.push({
              role: 'tool',
              tool_call_id: step.id,
              name: step.tool_name,
              content: toolContent || 'null',
            })
          }
        } else {
          apiMessages.push({ role: 'assistant', content: m.content })
        }
      }
    }

    apiMessages.push({ role: 'user', content: userContent })

    runGenerationLoop(sessionId, assistantMsgId, apiMessages)
  }

  // ── Generation Loop ──
  const runGenerationLoop = async (
    sessionId: string,
    assistantMsgId: string,
    initialApiMessages: any[]
  ) => {
    setIsGenerating(true)
    try {
      const provConfig = PROVIDERS[provider]
      const url = provConfig.apiUrl(endpoint)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

      let apiMessages = [...initialApiMessages]
      let finalContent = ''
      let accumulatedContent = ''
      let accumulatedReasoning = ''
      let loopCount = 0
      const maxLoops = 6

      while (loopCount < maxLoops) {
        let body: any
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }

        if (provider === 'anthropic') {
          headers['x-api-key'] = apiKey
          headers['anthropic-version'] = '2023-06-01'
          headers['anthropic-dangerous-direct-browser-access'] = 'true'

          body = {
            model: model || 'claude-3-5-sonnet-20241022',
            messages: translateOpenAiToAnthropic(apiMessages),
            system: buildSystemPrompt(chatPrivacyMode),
            tools: MCP_TOOLS.map(t => ({
              name: t.function.name,
              description: t.function.description,
              input_schema: t.function.parameters
            })),
            stream: true,
            max_tokens: 4096
          }
        } else {
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
          body = {
            model,
            messages: apiMessages,
            tools: MCP_TOOLS,
            tool_choice: 'auto',
            max_tokens: 4096,
            stream: true
          }
        }
        
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
        if (!res.ok) {
          const err = await res.text()
          throw new Error(`${provider.toUpperCase()} API Error (${res.status}): ${err}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('Response body is not readable')

        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        accumulatedContent = ''
        accumulatedReasoning = ''
        let accumulatedToolCalls: any[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const cleanLine = line.trim()
            if (!cleanLine) continue
            if (cleanLine === 'data: [DONE]') continue

            if (cleanLine.startsWith('data: ')) {
              const jsonStr = cleanLine.slice(6)
              try {
                const parsed = JSON.parse(jsonStr)

                if (provider === 'anthropic') {
                  const type = parsed.type
                  if (type === 'content_block_delta') {
                    const delta = parsed.delta
                    if (delta.type === 'text_delta') {
                      accumulatedContent += delta.text
                    } else if (delta.type === 'input_json_delta') {
                      const stepIdx = accumulatedToolCalls.length - 1
                      if (stepIdx >= 0) {
                        accumulatedToolCalls[stepIdx].function.arguments += delta.partial_json
                      }
                    }
                  } else if (type === 'content_block_start') {
                    const block = parsed.content_block
                    if (block.type === 'tool_use') {
                      accumulatedToolCalls.push({
                        id: block.id,
                        type: 'function',
                        function: {
                          name: block.name,
                          arguments: ''
                        }
                      })
                    }
                  }

                  if (accumulatedContent) {
                    const { thinking: parsedThinking, content: parsedContent } = parseThinkingAndContent(accumulatedContent)
                    updateSession(sessionId, s => ({
                      ...s,
                      messages: s.messages.map(m => m.id === assistantMsgId ? {
                        ...m,
                        content: parsedContent,
                        thinking: parsedThinking,
                      } : m)
                    }))
                  }
                } else {
                  const choice = parsed.choices?.[0]
                  const delta = choice?.delta

                  if (delta) {
                    if (delta.reasoning_content) {
                      accumulatedReasoning += delta.reasoning_content
                    }
                    
                    if (delta.content) {
                      accumulatedContent += delta.content
                    }

                    if (delta.content || delta.reasoning_content) {
                      const { thinking: parsedThinking, content: parsedContent } = parseThinkingAndContent(accumulatedContent)
                      const finalThinking = (accumulatedReasoning || parsedThinking) ? (accumulatedReasoning + (parsedThinking || '')) : undefined

                      updateSession(sessionId, s => ({
                        ...s,
                        messages: s.messages.map(m => m.id === assistantMsgId ? {
                          ...m,
                          content: parsedContent,
                          thinking: finalThinking,
                        } : m)
                      }))
                    }

                    if (delta.tool_calls) {
                      for (const tc of delta.tool_calls) {
                        const idx = tc.index ?? 0
                        // If the incoming id differs from what we have, reset this slot (new tool call)
                        if (tc.id && accumulatedToolCalls[idx] && accumulatedToolCalls[idx].id && accumulatedToolCalls[idx].id !== tc.id) {
                          accumulatedToolCalls[idx] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } }
                        }
                        if (!accumulatedToolCalls[idx]) {
                          accumulatedToolCalls[idx] = {
                            id: tc.id,
                            type: 'function',
                            function: { name: '', arguments: '' }
                          }
                        }
                        if (tc.id) accumulatedToolCalls[idx].id = tc.id
                        if (tc.function?.name) {
                          // Smart name accumulation: avoid duplicating the full name on repeat deltas
                          const cur = accumulatedToolCalls[idx].function.name
                          const inc = tc.function.name
                          if (!cur) {
                            accumulatedToolCalls[idx].function.name = inc
                          } else if (cur === inc) {
                            // Gemini re-sent the full name — do not double-append
                          } else if (inc.startsWith(cur)) {
                            accumulatedToolCalls[idx].function.name = inc
                          } else if (!cur.endsWith(inc)) {
                            accumulatedToolCalls[idx].function.name += inc
                          }
                        }
                        if (tc.function?.arguments) accumulatedToolCalls[idx].function.arguments += tc.function.arguments
                        
                        // Accumulate custom fields like thought_signature (required for Gemini tool calls)
                        for (const key of Object.keys(tc)) {
                          if (key !== 'index' && key !== 'id' && key !== 'type' && key !== 'function') {
                            const val = tc[key]
                            if (typeof val === 'string') {
                              accumulatedToolCalls[idx][key] = (accumulatedToolCalls[idx][key] || '') + val
                            } else {
                              accumulatedToolCalls[idx][key] = val
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch (e) {}
            }
          }
        }

        const finalToolCalls = accumulatedToolCalls.filter(Boolean)
        
        // Build the message block to append to apiMessages
        const assistantRoleMessage: any = { role: 'assistant' }
        if (accumulatedContent) assistantRoleMessage.content = accumulatedContent
        if (finalToolCalls.length > 0) {
          assistantRoleMessage.tool_calls = finalToolCalls.map(tc => {
            const mapped: any = {
              id: tc.id,
              type: 'function',
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments
              }
            }
            for (const key of Object.keys(tc)) {
              if (key !== 'id' && key !== 'type' && key !== 'function') {
                mapped[key] = tc[key]
              }
            }
            return mapped
          })
        }
        
        apiMessages.push(assistantRoleMessage)

        // If tool calls
        if (finalToolCalls.length > 0) {
          const toolOutputs: any[] = []

          for (const tc of finalToolCalls) {
            const toolName = tc.function.name
            let parsedArgs: Record<string, any> = {}
            try { parsedArgs = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments } catch {}

            const stepId = genId()
            const startTime = Date.now()

            // Add running step
            const extraFields: Record<string, any> = {}
            for (const key of Object.keys(tc)) {
              if (key !== 'id' && key !== 'type' && key !== 'function') {
                extraFields[key] = tc[key]
              }
            }

            updateSession(sessionId, s => ({
              ...s,
              messages: s.messages.map(m => m.id === assistantMsgId ? {
                ...m,
                tool_steps: [...(m.tool_steps || []), {
                  id: stepId,
                  tool_name: toolName,
                  arguments: parsedArgs,
                  status: 'running',
                  extra_fields: Object.keys(extraFields).length > 0 ? extraFields : undefined
                }]
              } : m)
            }))

            // Execute tool via backend MCP, forwarding the X-DEP-Privacy-Mode header
            let toolResult: any
            let toolError: string | undefined
            const fetchHeaders: Record<string, string> = {}
            if (chatPrivacyMode) {
              fetchHeaders['X-DEP-Privacy-Mode'] = 'true'
            }

            try {
              toolResult = await apiFetch<any>('/mcp/tool', {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify({ tool_name: toolName, arguments: parsedArgs })
              })
            } catch (err: any) {
              toolError = err.message || String(err)
            }

            const duration = Date.now() - startTime

            // Update step as done/error
            updateSession(sessionId, s => ({
              ...s,
              messages: s.messages.map(m => m.id === assistantMsgId ? {
                ...m,
                tool_steps: (m.tool_steps || []).map(step =>
                  step.id === stepId ? {
                    ...step,
                    status: toolError ? 'error' : 'done',
                    result: toolResult,
                    error: toolError,
                    duration_ms: duration,
                  } : step
                )
              } : m)
            }))

            toolOutputs.push({
              tool_call_id: tc.id,
              role: 'tool',
              name: toolName,
              content: toolError ? JSON.stringify({ error: toolError }) : JSON.stringify(toolResult)
            })
          }

          apiMessages.push(...toolOutputs)
          loopCount++
        } else {
          const parsed = parseThinkingAndContent(accumulatedContent)
          finalContent = parsed.content
          break
        }
      }

      // Final update
      const { thinking: finalThinking, content: finalCleanContent } = parseThinkingAndContent(accumulatedContent)
      const mergedThinking = (accumulatedReasoning || finalThinking) ? (accumulatedReasoning + (finalThinking || '')) : undefined

      updateSession(sessionId, s => ({
        ...s,
        updated_at: Date.now(),
        messages: s.messages.map(m => m.id === assistantMsgId ? {
          ...m,
          content: finalCleanContent,
          thinking: mergedThinking,
          isStreaming: false,
        } : m)
      }))

    } catch (err: any) {
      const errMsg = err.message || 'Unknown error'
      updateSession(sessionId, s => ({
        ...s,
        messages: s.messages.map(m => m.id === assistantMsgId ? {
          ...m,
          content: `**Error**: ${errMsg}\n\nPlease check your API key and model settings, then try again.`,
          isStreaming: false,
        } : m)
      }))
      showToast({ type: 'error', title: 'AI Error', message: errMsg })
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Continue Generation ──
  const handleContinue = async (sessionId: string) => {
    if (isGenerating) return

    const session = sessions.find(s => s.id === sessionId)
    if (!session || session.messages.length === 0) return

    const lastMsg = session.messages[session.messages.length - 1]
    if (lastMsg.role !== 'assistant') return

    const assistantMsgId = lastMsg.id
    updateSession(sessionId, s => ({
      ...s,
      messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, isStreaming: true } : m)
    }))

    const historyMessages = session.messages.slice(0, -1)
    const apiMessages: any[] = [
      { role: 'system', content: buildSystemPrompt(chatPrivacyMode) }
    ]

    for (const m of historyMessages) {
      if (m.role === 'system') continue

      if (m.role === 'user') {
        apiMessages.push({ role: 'user', content: m.content })
      } else if (m.role === 'assistant') {
        if (m.tool_steps && m.tool_steps.length > 0) {
          apiMessages.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.tool_steps.map(step => {
              const tc: any = {
                id: step.id,
                type: 'function',
                function: {
                  name: step.tool_name,
                  arguments: typeof step.arguments === 'string' ? step.arguments : JSON.stringify(step.arguments)
                }
              }
              // Re-attach thought_signature and any other extra_fields for Gemini compatibility
              if (step.extra_fields) {
                Object.assign(tc, step.extra_fields)
              }
              return tc
            })
          })
          for (const step of m.tool_steps) {
            apiMessages.push({
              role: 'tool',
              tool_call_id: step.id,
              name: step.tool_name,
              content: step.error ? JSON.stringify({ error: step.error }) : JSON.stringify(step.result)
            })
          }
        } else {
          apiMessages.push({ role: 'assistant', content: m.content })
        }
      }
    }

    if (lastMsg.tool_steps && lastMsg.tool_steps.length > 0) {
      apiMessages.push({
        role: 'assistant',
        content: lastMsg.content || null,
        tool_calls: lastMsg.tool_steps.map(step => ({
          id: step.id,
          type: 'function',
          function: {
            name: step.tool_name,
            arguments: typeof step.arguments === 'string' ? step.arguments : JSON.stringify(step.arguments)
          }
        }))
      })
      for (const step of lastMsg.tool_steps) {
        apiMessages.push({
          role: 'tool',
          tool_call_id: step.id,
          name: step.tool_name,
          content: step.error ? JSON.stringify({ error: step.error }) : JSON.stringify(step.result)
        })
      }
    }

    runGenerationLoop(sessionId, assistantMsgId, apiMessages)
  }

  const editMessageAndResend = async (sessionId: string, msgId: string, newContent: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return

    const msgIdx = session.messages.findIndex(m => m.id === msgId)
    if (msgIdx === -1) return

    // 1. Get history up to the edited message, and replace the edited message content
    const updatedUserMsg: ChatMessage = {
      ...session.messages[msgIdx],
      content: newContent,
      timestamp: Date.now()
    }
    
    const historyBefore = session.messages.slice(0, msgIdx)
    
    // 2. Generate a new assistant message placeholder
    const assistantMsgId = genId()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      tool_steps: [],
      isStreaming: true,
      model,
    }

    const newMessages = [...historyBefore, updatedUserMsg, assistantMsg]

    updateSession(sessionId, s => ({
      ...s,
      updated_at: Date.now(),
      messages: newMessages
    }))

    setIsGenerating(true)

    // Build messages list for API
    const apiMessages: any[] = [
      { role: 'system', content: buildSystemPrompt(chatPrivacyMode) }
    ]

    for (const m of historyBefore) {
      if (m.role === 'system') continue
      if (m.role === 'user') {
        apiMessages.push({ role: 'user', content: m.content })
      } else if (m.role === 'assistant') {
        if (m.tool_steps && m.tool_steps.length > 0) {
          apiMessages.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.tool_steps.map(step => ({
              id: step.id,
              type: 'function',
              function: {
                name: step.tool_name,
                arguments: typeof step.arguments === 'string' ? step.arguments : JSON.stringify(step.arguments)
              }
            }))
          })
          for (const step of m.tool_steps) {
            apiMessages.push({
              role: 'tool',
              tool_call_id: step.id,
              name: step.tool_name,
              content: step.error ? JSON.stringify({ error: step.error }) : JSON.stringify(step.result)
            })
          }
        } else {
          apiMessages.push({ role: 'assistant', content: m.content })
        }
      }
    }

    // Push the edited user message
    apiMessages.push({ role: 'user', content: newContent })

    runGenerationLoop(sessionId, assistantMsgId, apiMessages)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionTrigger && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggestedIndex(prev => (prev + 1) % filteredSuggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggestedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        applySuggestion(filteredSuggestions[suggestedIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionTrigger(null)
        setSuggestedIndex(0)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const deleteMessage = (sessionId: string, msgId: string) => {
    updateSession(sessionId, s => ({ ...s, messages: s.messages.filter(m => m.id !== msgId) }))
  }

  const clearSession = (sessionId: string) => {
    updateSession(sessionId, s => ({ ...s, messages: [] }))
  }

  // ── Group sessions by date ──
  const sessionGroups: Record<string, ChatSession[]> = {}
  sessions.forEach(s => {
    const group = formatSessionDate(s.updated_at)
    if (!sessionGroups[group]) sessionGroups[group] = []
    sessionGroups[group].push(s)
  })

  const prov = PROVIDERS[provider]

  return (
    <div className="flex h-full overflow-hidden bg-background font-mono">

      {/* ── Left Sessions Sidebar ── */}
      {showSidebar && (
        <div className="w-60 flex-shrink-0 border-r border-border bg-[var(--bg-sidebar)] flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-border">
            <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">Conversations</span>
            <button
              onClick={newSession}
              title="New conversation"
              className="p-1 hover:bg-bg-hover rounded-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto py-1">
            {sessions.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <MessageSquare className="w-6 h-6 text-text-muted mx-auto mb-2" />
                <p className="text-[11px] text-text-muted">No conversations yet.</p>
                <button
                  onClick={newSession}
                  className="mt-2 text-[11px] text-primary hover:underline"
                >
                  Start one
                </button>
              </div>
            ) : (
              Object.entries(sessionGroups).map(([group, groupSessions]) => (
                <div key={group}>
                  <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-text-muted font-semibold">{group}</p>
                  {groupSessions.map(s => (
                    <div
                      key={s.id}
                      className={`group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                        activeSessionId === s.id ? 'bg-primary/10 text-text-primary' : 'hover:bg-bg-hover text-text-secondary hover:text-text-primary'
                      }`}
                      onClick={() => setActiveSessionId(s.id)}
                    >
                      <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-60" />
                      <span className="flex-1 truncate text-[11px]">{s.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#f44747] transition-all flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Provider badge */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <img src={prov.logoUrl} alt={prov.name} className="w-4 h-4 object-contain" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-text-primary truncate">{prov.name}</p>
                <p className="text-[9px] text-text-muted truncate">{model || 'No model selected'}</p>
              </div>
              <button onClick={() => setShowSettings(true)} className="p-1 hover:bg-bg-hover rounded-sm text-text-muted hover:text-text-primary transition-colors">
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 hover:bg-bg-hover rounded-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-text-primary">Governed AI Engine</span>
            </div>
            {activeSession && (
              <>
                <span className="text-text-muted">·</span>
                <span className="text-xs text-text-secondary truncate max-w-48">{activeSession.title}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Interactive Dynamic Privacy Mode Toggle Switch directly in the Chat interface */}
            <div className="flex items-center gap-2 border border-border/80 rounded-sm bg-input/40 px-3 py-1 cursor-pointer select-none" onClick={() => setChatPrivacyMode(!chatPrivacyMode)}>
              <Shield className={`w-3.5 h-3.5 ${chatPrivacyMode ? 'text-primary' : 'text-text-muted'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Privacy Mode</span>
              <button
                className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors focus:outline-none ${
                  chatPrivacyMode ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    chatPrivacyMode ? 'translate-x-3.75' : 'translate-x-0.75'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {activeSession && activeSession.messages.length > 0 && (
                <button
                  onClick={() => clearSession(activeSession.id)}
                  title="Clear conversation"
                  className="px-2 py-1 text-[10px] font-mono text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-sm transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
              <button
                onClick={newSession}
                className="px-2 py-1 text-[10px] font-mono text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-sm transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-2 py-1 text-[10px] font-mono text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-sm transition-colors flex items-center gap-1"
              >
                <Settings2 className="w-3.5 h-3.5" /> Settings
              </button>
            </div>
          </div>
        </div>

        {/* Messages viewport */}
        <div className="flex-1 overflow-y-auto">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center font-mono">
              <div className="w-14 h-14 rounded-sm border border-border bg-[#1e1e1e] flex items-center justify-center">
                <img src={prov.logoUrl} alt={prov.name} className="w-8 h-8 object-contain" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary mb-1">Governed AI Analyst</h2>
                <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
                  Securely query your governed data catalogs using natural language. Analysis runs on the host — no raw data leaves the system.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-2xl w-full">
                {[
                  'What datasets do I have access to?',
                  'Analyze the customer_profiles dataset and show me key stats',
                  'How many rows are in the L&T catalog?',
                  'Run a Python summary of all accessible datasets',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); inputRef.current?.focus() }}
                    className="text-left px-4 py-3 border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-xl text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors leading-relaxed shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-2">
              {activeSession.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  provider={activeSession.provider || provider}
                  username={username}
                  onCopy={(text) => navigator.clipboard.writeText(text)}
                  onDelete={(id) => deleteMessage(activeSession.id, id)}
                  isLast={activeSession.messages[activeSession.messages.length - 1]?.id === msg.id}
                  isGenerating={isGenerating}
                  handleContinue={() => handleContinue(activeSession.id)}
                  onEdit={(id, content) => editMessageAndResend(activeSession.id, id, content)}
                  onRetry={msg.role === 'assistant' && !msg.isStreaming ? () => {
                    const lastUserIdx = [...activeSession.messages].reverse().findIndex(m => m.role === 'user')
                    if (lastUserIdx >= 0) {
                      const lastUserMsg = activeSession.messages[activeSession.messages.length - 1 - lastUserIdx]
                      updateSession(activeSession.id, s => ({
                        ...s,
                        messages: s.messages.filter(m => m.id !== msg.id)
                      }))
                      setInput(lastUserMsg.content)
                    }
                  } : undefined}
                />
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              {mentionTrigger && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 bottom-full mb-2 w-64 max-h-48 overflow-y-auto bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border)] rounded-sm shadow-2xl z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="px-2 py-1 text-[9px] font-bold font-mono text-text-muted uppercase tracking-wider border-b border-border/20 mb-1">
                    {mentionTrigger.type === 'dataset' ? 'Datasets' : `Columns for ${mentionTrigger.datasetName}`}
                  </div>
                  {filteredSuggestions.map((suggestion, idx) => {
                    const isSelected = idx === suggestedIndex;
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-sm text-xs font-mono transition-all duration-150 ${
                          isSelected
                            ? 'bg-primary/20 text-primary font-bold border-l-2 border-primary'
                            : 'hover:bg-bg-hover text-text-secondary'
                        }`}
                      >
                        {mentionTrigger.type === 'dataset' ? (
                          <Database className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                        ) : (
                          <List className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                        )}
                        <span className="truncate">{suggestion}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleSelectionChange}
                onClick={handleSelectionChange}
                placeholder="Ask for catalog insights, Python analysis, or data summaries… (Enter to send, Shift+Enter for newline)"
                rows={1}
                disabled={isGenerating}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-text-muted disabled:opacity-50 max-h-32 shadow-sm"
                style={{ lineHeight: '1.6' }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={isGenerating || !input.trim()}
              className="flex-shrink-0 w-9 h-9 bg-primary hover:bg-primary-hover text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {isGenerating
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1.5 px-0.5">
            <div className="flex items-center gap-1.5">
              <Shield className={`w-2.5 h-2.5 ${chatPrivacyMode ? 'text-primary' : 'text-text-muted'}`} />
              <span className="text-[9px] text-text-muted uppercase tracking-wider">
                {chatPrivacyMode ? 'Zero-Row Privacy Mode Active (Redaction Enforced)' : 'Privacy Mode Inactive (Real Row Access)'}
              </span>
            </div>
            <span className="text-text-muted text-[9px]">·</span>
            <span className="text-[9px] text-text-muted">{model || 'No model selected'}</span>
          </div>
        </div>
      </div>

      {/* ── Settings Overlay ── */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-sm w-full max-w-md p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">LLM Configuration</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-bg-hover rounded-sm text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Provider grid */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PROVIDERS) as LLMProvider[]).map(p => {
                    const cfg = PROVIDERS[p]
                    const isConfigured = (() => {
                      const keyVal = p === provider ? apiKey : (providersConfig[p]?.api_key || '')
                      const modelVal = p === provider ? model : (providersConfig[p]?.model || '')
                      if (p === 'ollama') {
                        return !!modelVal
                      }
                      return !!keyVal.trim()
                    })()
                    return (
                      <button
                        key={p}
                        onClick={() => handleProviderChange(p)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-sm transition-all text-left w-full ${
                          provider === p ? 'border-primary bg-primary/10' : 'border-border hover:border-border bg-input'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={cfg.logoUrl}
                            alt={cfg.name}
                            className="w-4 h-4 object-contain flex-shrink-0"
                            onError={e => (e.target as HTMLImageElement).style.display = 'none'}
                          />
                          <span className="text-xs font-semibold text-text-primary truncate">{cfg.name}</span>
                        </div>
                        {isConfigured && (
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 ml-1.5" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* API Key / Endpoint */}
              {provider !== 'ollama' ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-1.5">
                    <span>API Key</span>
                    {apiKey.trim().length > 10 && <Check className="w-3 h-3 text-green-500" />}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder={provider === 'gemini' ? 'AIzaSy... or AQ.... — from aistudio.google.com/apikey' : `Enter ${PROVIDERS[provider].name} API key`}
                      className="w-full bg-input border border-border rounded-sm pl-3 pr-9 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-primary transition-colors"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-2 text-text-muted hover:text-text-primary"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-1.5">
                    <span>Local Endpoint</span>
                    {endpoint.trim() && <Check className="w-3 h-3 text-green-500" />}
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}

              {/* Model */}
              <div className="relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    Model {isFetchingModels && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                    {model.trim() && <Check className="w-3 h-3 text-green-500" />}
                  </span>
                  {modelsList.length > 0 && (
                    <span className="text-[9px] text-text-muted font-normal font-mono">
                      ({modelsList.length} loaded)
                    </span>
                  )}
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    value={model}
                    onChange={e => {
                      setModel(e.target.value)
                      setModelDropdownOpen(true)
                    }}
                    onFocus={() => setModelDropdownOpen(true)}
                    placeholder={modelsList.length > 0 ? "Select model or type custom name" : "Enter custom model name..."}
                    className="w-full bg-input border border-border rounded-sm pl-3 pr-9 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Model suggestions dropdown */}
                  {modelDropdownOpen && (
                    <>
                      {/* Transparent click-away overlay */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setModelDropdownOpen(false)} 
                      />
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-sm shadow-2xl z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        {isFetchingModels ? (
                          <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-muted font-mono italic">
                            <Loader2 className="w-3 h-3 animate-spin" /> Fetching available models...
                          </div>
                        ) : (
                          (() => {
                            const query = model.toLowerCase();
                            const filtered = modelsList.filter(m => m.toLowerCase().includes(query));
                            
                            if (filtered.length === 0) {
                              return (
                                <div className="px-2.5 py-1.5 text-xs text-text-muted font-mono italic">
                                  {modelsList.length > 0 ? 'No matching models. Press Save to use custom name.' : 'Enter custom name above and press Save.'}
                                </div>
                              );
                            }
                            
                            return filtered.map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setModel(m)
                                  setModelDropdownOpen(false)
                                }}
                                className={`w-full flex items-center px-2.5 py-1.5 text-left rounded-sm text-xs font-mono transition-colors ${
                                  model === m
                                    ? 'bg-primary/20 text-primary font-bold border-l-2 border-primary'
                                    : 'hover:bg-bg-hover text-text-secondary'
                                }`}
                              >
                                {m}
                              </button>
                            ));
                          })()
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={saveSettings}
                className="flex-1 py-2 bg-primary text-white rounded-sm text-xs font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save Configuration
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-border text-text-secondary hover:text-text-primary rounded-sm text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
