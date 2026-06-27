'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Play, RotateCcw, Save, Plus, Scissors, Copy, FileCode,
  Terminal, BarChart3, Settings, FolderOpen, PlaySquare, Maximize2,
  Minimize2, X, ChevronDown, Check, Columns, Info, Variable, Database,
  Search, Eye, HelpCircle, HardDrive, Cpu, FileText, ChevronRight,
  Compass, ExternalLink, RefreshCw, Share2, MoreVertical, AlertTriangle,
  Keyboard, Code, Sliders, ToggleLeft, ToggleRight
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'

interface NotebookOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  name?: 'stdout' | 'stderr'
  text?: string
  data?: {
    'text/plain'?: string
    'text/html'?: string
    'image/svg+xml'?: string
    'image/png'?: string
  }
  ename?: string
  evalue?: string
  traceback?: string[]
  executionCount?: number
}

interface Cell {
  id: string
  type: 'code' | 'markdown'
  input: string
  outputs: NotebookOutput[]
  executionCount?: number | null
  isRunning?: boolean
  executionTime?: string
  showLineNumbers?: boolean
}

interface ColabWorkspaceProps {
  isFocusMode: boolean
  onToggleFocusMode: () => void
  onClose: () => void
}

// Autocomplete suggestions vocabulary
const PYTHON_SUGGESTIONS = [
  { label: 'pd.read_json', type: 'function', insertText: 'pd.read_json("api/v1/catalogs/customer_profiles")' },
  { label: 'pd.DataFrame', type: 'class', insertText: 'pd.DataFrame(data)' },
  { label: 'df.groupby', type: 'method', insertText: 'df.groupby("segment")["transaction_value"].mean()' },
  { label: 'df.head', type: 'method', insertText: 'df.head(5)' },
  { label: 'df.describe', type: 'method', insertText: 'df.describe()' },
  { label: 'df.columns', type: 'property', insertText: 'df.columns' },
  { label: 'plt.bar', type: 'function', insertText: 'plt.bar(segments, values, color="var(--primary)")' },
  { label: 'plt.show', type: 'function', insertText: 'plt.show()' },
  { label: 'plt.figure', type: 'function', insertText: 'plt.figure(figsize=(8, 4))' },
  { label: 'plt.title', type: 'function', insertText: 'plt.title("Avg Transaction metrics per Cohort Segment")' },
  { label: 'plt.grid', type: 'function', insertText: 'plt.grid(True, linestyle="--", alpha=0.3)' },
  { label: 'KMeans', type: 'class', insertText: 'KMeans(n_clusters=4, random_state=42)' },
  { label: 'fit_predict', type: 'method', insertText: 'fit_predict(features)' },
  { label: 'silhouette_score', type: 'function', insertText: 'silhouette_score(features, labels)' },
  { label: 'print', type: 'function', insertText: 'print(f"Metrics computed: {value}")' },
  { label: 'import pandas as pd', type: 'snippet', insertText: 'import pandas as pd' },
  { label: 'import numpy as np', type: 'snippet', insertText: 'import numpy as np' },
  { label: 'import matplotlib.pyplot as plt', type: 'snippet', insertText: 'import matplotlib.pyplot as plt' },
]

// Tokenize a single line of Python into colored React spans
function tokenizeLine(line: string, lineNum: number): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let lastIdx = 0
  const regex = /(#.*)|(`{3}[\s\S]*?`{3}|"{3}[\s\S]*?"{3}|'{3}[\s\S]*?'{3}|f"(?:\\.|[^"\\])*"|f'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:import|from|as|def|class|return|print|if|else|elif|in|for|while|and|or|not|None|True|False|lambda|yield|with|pass|break|continue|raise|try|except|finally|global|nonlocal|del|assert|is|async|await)\b)|(\b\d+\.?\d*\b)|([a-zA-Z_][a-zA-Z0-9_]*(?=\s*\())/g
  let match
  while ((match = regex.exec(line)) !== null) {
    const start = match.index
    const text = match[0]
    if (start > lastIdx) tokens.push(<span key={`${lineNum}-t${lastIdx}`}>{line.slice(lastIdx, start)}</span>)
    if (match[1]) tokens.push(<span key={`${lineNum}-cm${start}`} style={{ color: '#6a737d', fontStyle: 'italic' }}>{text}</span>)
    else if (match[2]) tokens.push(<span key={`${lineNum}-st${start}`} style={{ color: '#ce9178' }}>{text}</span>)
    else if (match[3]) tokens.push(<span key={`${lineNum}-kw${start}`} style={{ color: '#569cd6', fontWeight: 600 }}>{text}</span>)
    else if (match[4]) tokens.push(<span key={`${lineNum}-nm${start}`} style={{ color: '#b5cea8' }}>{text}</span>)
    else if (match[5]) tokens.push(<span key={`${lineNum}-fn${start}`} style={{ color: '#dcdcaa' }}>{text}</span>)
    lastIdx = regex.lastIndex
  }
  if (lastIdx < line.length) tokens.push(<span key={`${lineNum}-tail${lastIdx}`}>{line.slice(lastIdx)}</span>)
  return tokens.length > 0 ? tokens : [line]
}

const EDITOR_FONT = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace"
const EDITOR_LINE_H = '20px'
const EDITOR_FONT_SIZE = '12.5px'

// Live syntax-highlighting code editor: transparent textarea over highlighted pre backdrop
function CodeEditorWithHighlight({
  value, onChange, onKeyDown, textareaRef,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  textareaRef?: (el: HTMLTextAreaElement | null) => void
}) {
  const lines = value.split('\n')
  const sharedPad = '8px 12px'
  const sharedStyle: React.CSSProperties = {
    fontFamily: EDITOR_FONT,
    fontSize: EDITOR_FONT_SIZE,
    lineHeight: EDITOR_LINE_H,
    padding: sharedPad,
    margin: 0,
    whiteSpace: 'pre',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    tabSize: 4,
  }
  return (
    <div className="relative w-full rounded overflow-hidden border border-border bg-[#1e1e1e] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all" style={{ minHeight: 60 }}>
      <div className="flex overflow-x-auto">
        {/* Gutter */}
        <div className="select-none flex-shrink-0 text-right py-2 pr-2 pl-2" style={{ fontFamily: EDITOR_FONT, fontSize: '11px', lineHeight: EDITOR_LINE_H, width: 40, color: '#454545', background: '#1a1a1a', borderRight: '1px solid rgba(255,255,255,0.05)', userSelect: 'none', pointerEvents: 'none' }}>
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        {/* Stacked: highlighted backdrop + transparent textarea */}
        <div className="relative flex-1" style={{ minWidth: 0 }}>
          {/* Highlighted pre — positions absolutely behind textarea */}
          <pre aria-hidden="true" style={{ ...sharedStyle, position: 'absolute', inset: 0, color: '#d4d4d4', background: 'transparent', overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ minHeight: EDITOR_LINE_H }}>{tokenizeLine(line, i)}{'\n'}</div>
            ))}
          </pre>
          {/* Transparent textarea — sits on top, caret visible */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
              onChange(e)
            }}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            style={{ ...sharedStyle, position: 'relative', zIndex: 2, width: '100%', color: 'transparent', caretColor: '#aeafad', background: 'transparent', outline: 'none', resize: 'none', display: 'block', minHeight: 60, overflow: 'hidden' }}
          />
        </div>
      </div>
    </div>
  )
}

// View-only highlighted display (non-edit mode)
function PythonHighlight({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <pre style={{ fontFamily: EDITOR_FONT, fontSize: EDITOR_FONT_SIZE, lineHeight: EDITOR_LINE_H, margin: 0, whiteSpace: 'pre', color: '#d4d4d4', background: 'transparent', overflow: 'visible' }}>
      {lines.map((line, i) => (
        <div key={i} className="flex" style={{ minHeight: EDITOR_LINE_H }}>
          <span style={{ width: 36, textAlign: 'right', paddingRight: 10, color: '#454545', fontSize: '11px', lineHeight: EDITOR_LINE_H, flexShrink: 0, userSelect: 'none' }}>{i + 1}</span>
          <span>{tokenizeLine(line, i)}</span>
        </div>
      ))}
    </pre>
  )
}

const DEFAULT_CELLS: Cell[] = [
  {
    id: 'cell_1',
    type: 'markdown',
    input: `# Customer Segmentation & Lifetime Value (LTV) Analysis
Welcome to the interactive **DEP Jupyter Notebook Workspace**.

### ⌨️ Jupyter Shortcuts Built-In
- **\`Shift + Enter\`**: Run cell & select next cell.
- **\`Alt + Enter\`**: Run cell & insert new cell below.
- **\`Esc\`**: Exit editor to Command Mode.
- **In Command Mode**:
  - **\`A\`** / **\`B\`**: Insert cell above / below.
  - **\`D, D\`** (double tap): Delete active cell.
  - **\`Y\`** / **\`M\`**: Change cell to Code / Text.
  - **\`Enter\`**: Focus into editor.

### 💡 Autocomplete Feature
Type \`df.\` or \`plt.\` inside any code cell editor to trigger the **Jupyter Autocomplete Popup**. Use **Up/Down Arrows** to select and **Tab/Enter** to commit code snippets instantly!`,
    outputs: [],
  },
  {
    id: 'cell_2',
    type: 'code',
    input: `import pandas as pd
import numpy as np

# Retrieve registered user connection profile from DEP catalog
customer_data = {
    "customer_id": [1092, 1488, 2023, 1105, 3049],
    "segment": ["Active", "Churned", "Active", "New/Engaged", "Dormant"],
    "recency": [12, 180, 4, 8, 94],
    "frequency": [24, 2, 48, 5, 8],
    "transaction_value": [145.20, 38.50, 210.00, 98.33, 55.80]
}
df = pd.DataFrame(customer_data)
df.head(5)`,
    outputs: [
      {
        output_type: 'execute_result',
        executionCount: 1,
        data: {
          'text/plain': "   customer_id      segment  recency  frequency  transaction_value\n0         1092       Active       12          24             145.20\n1         1488      Churned      180           2              38.50\n2         2023       Active        4          48             210.00\n3         1105  New/Engaged        8           5              98.33\n4         3049      Dormant       94           8              55.80",
          'text/html': `<table border="1" class="dataframe text-text-primary text-xs w-full text-left rounded overflow-hidden border-collapse border border-border">
  <thead>
    <tr class="bg-input text-text-secondary">
      <th class="p-2 border border-border"></th>
      <th class="p-2 border border-border">customer_id</th>
      <th class="p-2 border border-border">segment</th>
      <th class="p-2 border border-border">recency</th>
      <th class="p-2 border border-border">frequency</th>
      <th class="p-2 border border-border">transaction_value</th>
    </tr>
  </thead>
  <tbody class="bg-card/25">
    <tr class="hover:bg-bg-hover/30 border-b border-border">
      <td class="p-2 border border-border font-mono text-text-muted text-[10px]">0</td>
      <td class="p-2 border border-border font-semibold">1092</td>
      <td class="p-2 border border-border"><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#6a9955]/15 text-[#b5dc94]">Active</span></td>
      <td class="p-2 border border-border">12 days</td>
      <td class="p-2 border border-border">24</td>
      <td class="p-2 border border-border text-primary font-bold">$145.20</td>
    </tr>
    <tr class="hover:bg-bg-hover/30 border-b border-border">
      <td class="p-2 border border-border font-mono text-text-muted text-[10px]">1</td>
      <td class="p-2 border border-border font-semibold">1488</td>
      <td class="p-2 border border-border"><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f44747]/15 text-[#ff9999]">Churned</span></td>
      <td class="p-2 border border-border">180 days</td>
      <td class="p-2 border border-border">2</td>
      <td class="p-2 border border-border text-primary font-bold">$38.50</td>
    </tr>
    <tr class="hover:bg-bg-hover/30 border-b border-border">
      <td class="p-2 border border-border font-mono text-text-muted text-[10px]">2</td>
      <td class="p-2 border border-border font-semibold">2023</td>
      <td class="p-2 border border-border"><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#6a9955]/15 text-[#b5dc94]">Active</span></td>
      <td class="p-2 border border-border">4 days</td>
      <td class="p-2 border border-border">48</td>
      <td class="p-2 border border-border text-primary font-bold">$210.00</td>
    </tr>
    <tr class="hover:bg-bg-hover/30 border-b border-border">
      <td class="p-2 border border-border font-mono text-text-muted text-[10px]">3</td>
      <td class="p-2 border border-border font-semibold">1105</td>
      <td class="p-2 border border-border"><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#569cd6]/15 text-[#88bef4]">New/Engaged</span></td>
      <td class="p-2 border border-border">8 days</td>
      <td class="p-2 border border-border">5</td>
      <td class="p-2 border border-border text-primary font-bold">$98.33</td>
    </tr>
    <tr class="hover:bg-bg-hover/30 border-b border-border">
      <td class="p-2 border border-border font-mono text-text-muted text-[10px]">4</td>
      <td class="p-2 border border-border font-semibold">3049</td>
      <td class="p-2 border border-border"><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#ce9178]/15 text-[#e5c0b0]">Dormant</span></td>
      <td class="p-2 border border-border">94 days</td>
      <td class="p-2 border border-border">8</td>
      <td class="p-2 border border-border text-primary font-bold">$55.80</td>
    </tr>
  </tbody>
</table>`
        }
      }
    ],
    executionCount: 1,
    executionTime: '0.4s',
    showLineNumbers: true,
  },
  {
    id: 'cell_3',
    type: 'code',
    input: '# Edit these lists to test interactive vector plot outputs!\n' +
      'segments = ["Active", "Churned", "Dormant", "New/Engaged"]\n' +
      'values = [128.45, 42.11, 55.80, 98.33]\n' +
      '\n' +
      'print("Aggregating averages per customer cohort segment...")\n' +
      'for s, v in zip(segments, values):\n' +
      '    print(f"Segment: {s:<12} Average Value: ${v:.2f}")',
    outputs: [
      {
        output_type: 'stream',
        name: 'stdout',
        text: "Aggregating averages per customer cohort segment...\nSegment: Active       Average Value: $128.45\nSegment: Churned      Average Value: $42.11\nSegment: Dormant      Average Value: $55.80\nSegment: New/Engaged  Average Value: $98.33\n"
      }
    ],
    executionCount: 2,
    executionTime: '0.1s',
    showLineNumbers: true,
  },
  {
    id: 'cell_4',
    type: 'code',
    input: `# Matplotlib bar plot generation (adapts dynamically to primary accent color)
import matplotlib.pyplot as plt

plt.figure(figsize=(8, 4))
plt.bar(segments, values, color="var(--primary)")
plt.ylabel("USD ($)")
plt.title("Avg Transaction metrics per Cohort Segment")
plt.show()`,
    outputs: [
      {
        output_type: 'display_data',
        data: {
          'text/plain': '<Figure size 800x400 with 1 Axes>',
          'image/svg+xml': 'BAR_CHART_SVG_PLACEHOLDER'
        }
      }
    ],
    executionCount: 3,
    executionTime: '0.6s',
    showLineNumbers: true,
  },
]

const DEFAULT_FS: Record<string, { name: string; type: 'notebook' | 'file' | 'directory'; content: string }> = {
  '/': { name: 'root', type: 'directory', content: '' },
  '/my_notebooks': { name: 'my_notebooks', type: 'directory', content: '' },
  '/shared_with_me': { name: 'shared_with_me', type: 'directory', content: '' },
  '/my_notebooks/Analysis_Q4.ipynb': {
    name: 'Analysis_Q4.ipynb',
    type: 'notebook',
    content: JSON.stringify(DEFAULT_CELLS)
  },
  '/my_notebooks/churn_model_v1.py': {
    name: 'churn_model_v1.py',
    type: 'file',
    content: `import pandas as pd
import numpy as np

def predict_churn(customer_id):
    """
    Predict probability of churn for a given customer.
    """
    print(f"Analyzing transaction patterns for customer {customer_id}...")
    # Mock analysis
    return 0.24
`
  },
  '/shared_with_me/Segmentation_v2.ipynb': {
    name: 'Segmentation_v2.ipynb',
    type: 'notebook',
    content: JSON.stringify([
      {
        id: 'seg_cell_1',
        type: 'markdown',
        input: '# Segmentation Model v2\nShared by Super Admin.',
        outputs: []
      }
    ])
  },
  '/customer_profiles.csv': {
    name: 'customer_profiles.csv',
    type: 'file',
    content: `customer_id,segment,recency,frequency,transaction_value
1092,Active,12,24,145.20
1488,Churned,180,2,38.50
2023,Active,4,48,210.00
1105,New/Engaged,8,5,98.33
3049,Dormant,94,8,55.80
`
  }
}

export function JupyterLabWorkspace({ isFocusMode, onToggleFocusMode, onClose }: ColabWorkspaceProps) {
  const [cells, setCells] = useState<Cell[]>(DEFAULT_CELLS)

  // Virtual Filesystem State
  const [virtualFS, setVirtualFS] = useState<Record<string, { name: string; type: 'notebook' | 'file' | 'directory'; content: string }>>(DEFAULT_FS)
  const [currentDir, setCurrentDir] = useState<string>('/my_notebooks')
  const [activeFilePath, setActiveFilePath] = useState<string>('/my_notebooks/Analysis_Q4.ipynb')
  const [selectedFileForViewer, setSelectedFileForViewer] = useState<{ path: string; name: string; content: string } | null>(null)

  // File explorer action dialog states
  const [isCreatingFile, setIsCreatingFile] = useState<'notebook' | 'file' | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false)
  const [isRenamingPath, setIsRenamingPath] = useState<string | null>(null)
  const [newInputName, setNewInputName] = useState<string>('')

  // Load filesystem on mount (client-side only to prevent hydration mismatches)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Start with DEFAULT_FS as baseline
      let mergedFS = { ...DEFAULT_FS }
      
      const saved = localStorage.getItem('dep-jupyter-virtual-fs')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          
          // Only merge valid user-created files (not core system files)
          // Core system files are: /, /my_notebooks, /shared_with_me
          const corePaths = ['/', '/my_notebooks', '/shared_with_me']
          
          for (const [path, item] of Object.entries(parsed)) {
            // Skip core system paths - always use DEFAULT_FS versions
            if (corePaths.includes(path)) continue
            
            // Validate entry has required properties
            if (item && typeof item === 'object' && 'name' in item && 'type' in item && 'content' in item) {
              // For notebooks, validate that content is valid JSON
              if (item.type === 'notebook') {
                try {
                  JSON.parse(item.content)
                  mergedFS[path] = item
                } catch {
                  console.warn(`Skipping invalid notebook from localStorage: ${path}`)
                }
              } else {
                mergedFS[path] = item
              }
            }
          }
          
          setVirtualFS(mergedFS)

          // Load active file content if it still exists in merged FS
          if (mergedFS[activeFilePath] && mergedFS[activeFilePath].type === 'notebook') {
            try {
              const parsedCells = JSON.parse(mergedFS[activeFilePath].content)
              setCells(parsedCells)
              if (parsedCells[0]?.id) {
                setActiveCellId(parsedCells[0].id)
              }
            } catch (e) {
              console.error("Error parsing active notebook", e)
              // Reset to default cells if parsing fails
              setCells(DEFAULT_CELLS)
              setActiveCellId(DEFAULT_CELLS[0]?.id || '')
            }
          } else {
            // Active file no longer exists, reset to default
            setCells(DEFAULT_CELLS)
            setActiveCellId(DEFAULT_CELLS[0]?.id || '')
            setActiveFilePath('/my_notebooks/Analysis_Q4.ipynb')
          }
        } catch (e) {
          console.error("Error reading saved virtualFS from localStorage", e)
          // Reset to default filesystem on error
          setVirtualFS(DEFAULT_FS)
          setCells(DEFAULT_CELLS)
          setActiveCellId(DEFAULT_CELLS[0]?.id || '')
        }
      } else {
        // No localStorage data, use DEFAULT_FS
        setVirtualFS(DEFAULT_FS)
      }
    }
  }, [])

  // Sync virtual filesystem state to localStorage
  useEffect(() => {
    localStorage.setItem('dep-jupyter-virtual-fs', JSON.stringify(virtualFS))
  }, [virtualFS])

  const [activeCellId, setActiveCellId] = useState<string>('cell_3')
  const [editorMode, setEditorMode] = useState<'command' | 'edit'>('command') // Jupyter dual modes
  const [activeSidebarTab, setActiveSidebarTab] = useState<'toc' | 'vars' | 'files' | 'data' | 'catalog'>('toc')

  // Catalog Explorer state
  const [catalogSearch, setCatalogSearch] = useState('')
  const [expandedCatalogNodes, setExpandedCatalogNodes] = useState<Record<string, boolean>>({
    'proj_analytics': true,
    'proj_operations': false,
    'cat_customer_profiles': true,
    'cat_sales_transactions': false,
    'cat_revenue_forecasting_db': false,
    'cat_product_inventory': false,
  })
  const toggleCatalogNode = (key: string) =>
    setExpandedCatalogNodes(prev => ({ ...prev, [key]: !prev[key] }))
  const [isStarred, setIsStarred] = useState(false)
  const [kernelState, setKernelState] = useState<'idle' | 'busy' | 'starting'>('idle')

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const isResizingSidebar = useRef(false)
  const sidebarResizeStartX = useRef(0)
  const sidebarResizeStartWidth = useRef(240)

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; name: string; type: string } | null>(null)

  // Dialogs and Settings State
  const [showResourceDialog, setShowResourceDialog] = useState(false)
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false)
  const [showNotebookSettings, setShowNotebookSettings] = useState(false)
  const [globalLineNumbers, setGlobalLineNumbers] = useState(true)
  const [activeMenuDropdown, setActiveMenuDropdown] = useState<string | null>(null)

  const [ramUsage, setRamUsage] = useState(25)
  const [diskUsage, setDiskUsage] = useState(36)
  const [alertOpen, setAlertOpen] = useState(false)
  const [notebookSaved, setNotebookSaved] = useState(true)

  // Shared scope parameters for runtime calculations
  const [userSegments, setUserSegments] = useState<string[]>(["Active", "Churned", "Dormant", "New/Engaged"])
  const [userValues, setUserValues] = useState<number[]>([128.45, 42.11, 55.80, 98.33])

  // Autocomplete UI state
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)
  const [autocompleteFilter, setAutocompleteFilter] = useState('')
  const [autocompleteIndex, setAutocompleteIndex] = useState(0)
  const [autocompleteCoords, setAutocompleteCoords] = useState({ top: 0, left: 0 })
  const editorRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  // Double tap D state
  const lastDTime = useRef<number>(0)

  // Sidebar resize mouse handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar.current) return
      const delta = e.clientX - sidebarResizeStartX.current
      const next = Math.max(160, Math.min(480, sidebarResizeStartWidth.current + delta))
      setSidebarWidth(next)
    }
    const onMouseUp = () => {
      isResizingSidebar.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Autosave to virtual filesystem when cells change
  useEffect(() => {
    if (activeFilePath && virtualFS[activeFilePath]) {
      setVirtualFS(prev => {
        const currentStringified = JSON.stringify(cells)
        if (prev[activeFilePath].content === currentStringified) {
          return prev
        }
        return {
          ...prev,
          [activeFilePath]: {
            ...prev[activeFilePath],
            content: currentStringified
          }
        }
      })
      setNotebookSaved(false)
    }
  }, [cells, activeFilePath])

  // Textarea Auto-height Resizing Helpers
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight + 4}px`
  }

  useEffect(() => {
    if (editorMode === 'edit' && activeCellId) {
      const el = editorRefs.current[activeCellId]
      if (el) {
        setTimeout(() => adjustTextareaHeight(el), 10)
      }
    }
  }, [editorMode, activeCellId])

  useEffect(() => {
    if (editorMode === 'edit' && activeCellId) {
      const el = editorRefs.current[activeCellId]
      if (el) {
        adjustTextareaHeight(el)
      }
    }
  }, [cells])

  // Filesystem Helpers
  const getParentPath = (path: string) => {
    if (path === '/') return null
    const parts = path.split('/')
    parts.pop()
    const parent = parts.join('/')
    return parent === '' ? '/' : parent
  }

  const getFilesForDir = (dirPath: string) => {
    const normalizedDir = dirPath === '/' ? '/' : dirPath + '/'
    const items = []

    for (const [p, item] of Object.entries(virtualFS)) {
      if (p === '/' || p === dirPath) continue

      // Check if it's a direct child
      if (p.startsWith(normalizedDir)) {
        const relativePath = p.slice(normalizedDir.length)
        if (!relativePath.includes('/')) {
          items.push({
            path: p,
            ...item
          })
        }
      }
    }
    return items
  }

  const handleCreateFile = (name: string, type: 'notebook' | 'file') => {
    if (!name || name.trim() === '') return
    let finalName = name.trim()
    if (type === 'notebook' && !finalName.endsWith('.ipynb')) {
      finalName += '.ipynb'
    } else if (type === 'file' && !finalName.includes('.')) {
      finalName += '.py'
    }

    const dirPrefix = currentDir === '/' ? '/' : currentDir + '/'
    const newPath = dirPrefix + finalName

    if (virtualFS[newPath]) {
      alert('A file or folder with that name already exists.')
      return
    }

    let defaultContent = ''
    if (type === 'notebook') {
      defaultContent = JSON.stringify([
        {
          id: `cell_${Date.now()}`,
          type: 'code',
          input: '# Write python code here\n',
          outputs: []
        }
      ])
    } else {
      defaultContent = '# Write script here\n'
    }

    setVirtualFS(prev => ({
      ...prev,
      [newPath]: {
        name: finalName,
        type,
        content: defaultContent
      }
    }))
  }

  const handleCreateFolder = (name: string) => {
    if (!name || name.trim() === '') return
    const finalName = name.trim()
    const dirPrefix = currentDir === '/' ? '/' : currentDir + '/'
    const newPath = dirPrefix + finalName

    if (virtualFS[newPath]) {
      alert('A file or folder with that name already exists.')
      return
    }

    setVirtualFS(prev => ({
      ...prev,
      [newPath]: {
        name: finalName,
        type: 'directory',
        content: ''
      }
    }))
  }

  const handleRename = (oldPath: string, newName: string) => {
    if (!newName || newName.trim() === '') return

    let finalName = newName.trim()
    const itemType = virtualFS[oldPath]?.type
    if (!itemType) return

    if (itemType === 'notebook' && !finalName.endsWith('.ipynb')) {
      finalName += '.ipynb'
    } else if (itemType === 'file' && !finalName.includes('.')) {
      finalName += '.py'
    }

    const parts = oldPath.split('/')
    parts.pop()
    const parentPath = parts.join('/')
    const newPath = (parentPath === '' ? '/' : parentPath) + (parentPath === '/' ? '' : '/') + finalName

    if (virtualFS[newPath]) {
      alert('A file or folder with that name already exists.')
      return
    }

    setVirtualFS(prev => {
      const nextFS = { ...prev }
      const oldItem = nextFS[oldPath]

      // If it's a directory, rename all child paths recursively
      if (oldItem.type === 'directory') {
        const oldPrefix = oldPath === '/' ? '/' : oldPath + '/'
        const newPrefix = newPath + '/'

        for (const p of Object.keys(nextFS)) {
          if (p.startsWith(oldPrefix)) {
            const relativePart = p.slice(oldPrefix.length)
            const newChildPath = newPrefix + relativePart
            nextFS[newChildPath] = {
              ...nextFS[p],
              name: nextFS[p].name // keep name
            }
            delete nextFS[p]
          }
        }
      }

      nextFS[newPath] = {
        name: finalName,
        type: oldItem.type,
        content: oldItem.content
      }
      delete nextFS[oldPath]

      return nextFS
    })

    if (activeFilePath === oldPath) {
      setActiveFilePath(newPath)
    }
  }

  const handleDelete = (targetPath: string) => {
    if (targetPath === '/' || targetPath === '/my_notebooks' || targetPath === '/shared_with_me') {
      alert('Cannot delete system root or core folders.')
      return
    }

    setVirtualFS(prev => {
      const nextFS = { ...prev }
      const oldItem = nextFS[targetPath]

      if (oldItem && oldItem.type === 'directory') {
        const prefix = targetPath + '/'
        for (const p of Object.keys(nextFS)) {
          if (p.startsWith(prefix)) {
            delete nextFS[p]
          }
        }
      }

      delete nextFS[targetPath]
      return nextFS
    })

    if (activeFilePath === targetPath) {
      alert('The current notebook has been deleted.')
      setCells([
        {
          id: 'cell_empty',
          type: 'markdown',
          input: '# No notebook loaded\nDouble-click a notebook in the Files pane to open.',
          outputs: []
        }
      ])
      setActiveFilePath('')
    }
  }

  const handleDownload = (path: string) => {
    const file = virtualFS[path]
    if (!file || file.type === 'directory') return

    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string || ''
        const dirPrefix = currentDir === '/' ? '/' : currentDir + '/'
        const newPath = dirPrefix + file.name

        let fileType: 'notebook' | 'file' = 'file'
        if (file.name.endsWith('.ipynb')) {
          fileType = 'notebook'
        }

        setVirtualFS(prev => ({
          ...prev,
          [newPath]: {
            name: file.name,
            type: fileType,
            content
          }
        }))
      }
      reader.readAsText(file)
    }
    e.target.value = ''
  }

  const handleOpenFile = (path: string) => {
    const file = virtualFS[path]
    if (!file) return

    if (file.type === 'directory') {
      setCurrentDir(path)
    } else if (file.type === 'notebook') {
      if (activeFilePath && virtualFS[activeFilePath]) {
        setVirtualFS(prev => ({
          ...prev,
          [activeFilePath]: {
            ...prev[activeFilePath],
            content: JSON.stringify(cells)
          }
        }))
      }

      try {
        const parsedCells = JSON.parse(file.content)
        setCells(parsedCells)
        setActiveCellId(parsedCells[0]?.id || '')
        setActiveFilePath(path)
        setNotebookSaved(true)
      } catch (e) {
        alert('Invalid notebook structure: unable to parse JSON.')
      }
    } else {
      setSelectedFileForViewer({
        path,
        name: file.name,
        content: file.content
      })
    }
  }

  const handleResetWorkspace = () => {
    if (confirm('Reset workspace to default? This will clear all your files and restore the default filesystem.')) {
      localStorage.removeItem('dep-jupyter-virtual-fs')
      setVirtualFS(DEFAULT_FS)
      setCells(DEFAULT_CELLS)
      setActiveCellId(DEFAULT_CELLS[0]?.id || '')
      setActiveFilePath('/my_notebooks/Analysis_Q4.ipynb')
      setCurrentDir('/my_notebooks')
    }
  }

  // Top Menu configuration
  const menus = {
    File: [
      { label: 'Save Notebook', action: () => handleSave() },
      { label: 'New Notebook', action: () => setIsCreatingFile('notebook') },
      { label: 'Download Current .ipynb', action: () => { if (activeFilePath) handleDownload(activeFilePath) } },
      { label: 'Reset Workspace', action: () => handleResetWorkspace() },
      { label: 'Close Workspace', action: () => onClose() },
    ],
    Edit: [
      { label: 'Cut Cells', action: () => deleteCell(activeCellId) },
      { label: 'Copy Cells', action: () => alert('Cell copied') },
      { label: 'Paste Cells Below', action: () => addCellAtPosition(cells.findIndex(c => c.id === activeCellId) + 1, 'code') },
      { label: 'Delete Selected Cells', action: () => deleteCell(activeCellId) },
    ],
    View: [
      { label: 'Toggle Line Numbers', action: () => setGlobalLineNumbers(!globalLineNumbers) },
      { label: 'Toggle Sidebar Panel', action: () => setActiveSidebarTab(activeSidebarTab ? '' as any : 'toc') },
    ],
    Insert: [
      { label: 'Insert Code Cell Above', action: () => addCellAtPosition(cells.findIndex(c => c.id === activeCellId), 'code') },
      { label: 'Insert Code Cell Below', action: () => addCellAtPosition(cells.findIndex(c => c.id === activeCellId) + 1, 'code') },
      { label: 'Insert Text Cell Below', action: () => addCellAtPosition(cells.findIndex(c => c.id === activeCellId) + 1, 'markdown') },
    ],
    Runtime: [
      { label: 'Run Selected Cell', action: () => handleRunCell(activeCellId) },
      { label: 'Run All Cells', action: () => runAllCells() },
      { label: 'Restart Kernel', action: () => setCells(cells.map(c => ({ ...c, executionCount: null, outputs: [] }))) },
    ],
    Tools: [
      { label: 'Keyboard Shortcuts', action: () => setShowShortcutsDialog(true) },
      { label: 'Notebook Settings', action: () => setShowNotebookSettings(true) },
    ],
    Help: [
      { label: 'Jupyter Reference Guide', action: () => window.open('https://jupyter.org', '_blank') },
      { label: 'About DEP Workbench', action: () => alert('DEP Workbench v1.0 by Wissen Technology') },
    ]
  }

  // Dual mode keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Shortcuts while in EDIT MODE (inside textarea)
      if (editorMode === 'edit') {
        // Shift + Enter: Run and select next
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault()
          handleRunCell(activeCellId)

          const idx = cells.findIndex(c => c.id === activeCellId)
          if (idx !== -1 && idx < cells.length - 1) {
            setActiveCellId(cells[idx + 1].id)
          } else {
            // Last cell, add a new code cell
            addCellAtPosition(cells.length, 'code')
          }
          setEditorMode('command')
        }

        // Alt + Enter: Run and insert below
        if (e.key === 'Enter' && e.altKey) {
          e.preventDefault()
          handleRunCell(activeCellId)
          const idx = cells.findIndex(c => c.id === activeCellId)
          addCellAtPosition(idx + 1, 'code')
          setEditorMode('edit')
        }

        // Escape: Go to Command Mode
        if (e.key === 'Escape') {
          e.preventDefault()
          setEditorMode('command')
          setAutocompleteOpen(false)
          // blur active editor
          const activeEditor = editorRefs.current[activeCellId]
          if (activeEditor) activeEditor.blur()
        }

        return
      }

      // 2. Shortcuts while in COMMAND MODE
      if (editorMode === 'command') {
        const idx = cells.findIndex(c => c.id === activeCellId)

        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          if (idx < cells.length - 1) {
            setActiveCellId(cells[idx + 1].id)
          }
        }

        if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault()
          if (idx > 0) {
            setActiveCellId(cells[idx - 1].id)
          }
        }

        if (e.key === 'Enter') {
          e.preventDefault()
          setEditorMode('edit')
          setTimeout(() => {
            const activeEditor = editorRefs.current[activeCellId]
            if (activeEditor) activeEditor.focus()
          }, 50)
        }

        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          addCellAtPosition(idx, 'code')
        }

        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault()
          addCellAtPosition(idx + 1, 'code')
        }

        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault()
          setCells(cells.map(c => c.id === activeCellId ? { ...c, type: 'code' } : c))
        }

        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault()
          setCells(cells.map(c => c.id === activeCellId ? { ...c, type: 'markdown' } : c))
        }

        // Double tap D: Delete Cell
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault()
          const now = Date.now()
          if (now - lastDTime.current < 500) {
            deleteCell(activeCellId)
            lastDTime.current = 0
          } else {
            lastDTime.current = now
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeCellId, cells, editorMode])

  // Autocomplete positioning and selection listener
  const handleEditorInput = (e: React.FormEvent<HTMLTextAreaElement>, cellId: string) => {
    const el = e.currentTarget
    const val = el.value
    const selectionEnd = el.selectionEnd
    const precedingText = val.slice(0, selectionEnd)

    // Check if user is typing a variable or library call (e.g. df. or plt. or pd.)
    const match = precedingText.match(/([a-zA-Z0-9_]+\.[a-zA-Z0-9_]*)$/)

    if (match) {
      const filter = match[1].toLowerCase()
      setAutocompleteFilter(filter)
      setAutocompleteOpen(true)
      setAutocompleteIndex(0)

      // Calculate coordinates to float the popup near the typing position
      const { caret } = getCursorXY(el, selectionEnd)
      setAutocompleteCoords({
        top: caret.top + 22,
        left: Math.min(el.clientWidth - 200, caret.left + 45)
      })
    } else {
      setAutocompleteOpen(false)
    }
    setNotebookSaved(false)
  }

  // Get coordinates of cursor position inside textarea
  const getCursorXY = (textarea: HTMLTextAreaElement, position: number) => {
    const { offsetLeft, offsetTop, scrollLeft, scrollTop } = textarea
    const div = document.createElement('div')
    const styles = window.getComputedStyle(textarea)
    for (const prop of styles) {
      div.style.setProperty(prop, styles.getPropertyValue(prop))
    }
    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    div.style.whiteSpace = 'pre-wrap'
    div.style.wordBreak = 'break-word'
    div.textContent = textarea.value.slice(0, position)
    document.body.appendChild(div)

    // Create span for caret helper
    const span = document.createElement('span')
    span.textContent = textarea.value.slice(position) || '.'
    div.appendChild(span)

    const coords = {
      top: span.offsetTop - scrollTop + offsetTop,
      left: span.offsetLeft - scrollLeft + offsetLeft
    }
    document.body.removeChild(div)
    return { caret: coords }
  }

  // Autocomplete key intercepts
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, cellId: string) => {
    if (autocompleteOpen) {
      const filtered = PYTHON_SUGGESTIONS.filter(s => s.label.toLowerCase().includes(autocompleteFilter))

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAutocompleteIndex(prev => (prev + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAutocompleteIndex(prev => (prev - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        if (filtered[autocompleteIndex]) {
          commitAutocomplete(filtered[autocompleteIndex].insertText)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setAutocompleteOpen(false)
      }
    }
  }

  const commitAutocomplete = (insertText: string) => {
    const el = editorRefs.current[activeCellId]
    if (!el) return

    const val = el.value
    const selectionEnd = el.selectionEnd

    // Find preceding match boundary to swap
    const precedingText = val.slice(0, selectionEnd)
    const match = precedingText.match(/([a-zA-Z0-9_]+\.[a-zA-Z0-9_]*)$/)

    if (match) {
      const matchStart = selectionEnd - match[1].length
      const newVal = val.slice(0, matchStart) + insertText + val.slice(selectionEnd)

      setCells(cells.map(c => c.id === activeCellId ? { ...c, input: newVal } : c))

      setTimeout(() => {
        el.value = newVal
        el.selectionStart = el.selectionEnd = matchStart + insertText.length
        el.focus()
      }, 50)
    }
    setAutocompleteOpen(false)
  }

  // Execution interpreter
  const executePythonInterpreter = (cellId: string, code: string) => {
    const segmentsRegex = /segments\s*=\s*\[(.*?)\]/
    const segmentsMatch = code.match(segmentsRegex)
    let parsedSegments = [...userSegments]
    if (segmentsMatch) {
      try {
        const items = segmentsMatch[1].split(',').map(s => s.replace(/['"\[\]\s]/g, ''))
        if (items.length > 0 && items[0] !== '') {
          parsedSegments = items
          setUserSegments(items)
        }
      } catch (e) { }
    }

    const valuesRegex = /values\s*=\s*\[(.*?)\]/
    const valuesMatch = code.match(valuesRegex)
    let parsedValues = [...userValues]
    if (valuesMatch) {
      try {
        const items = valuesMatch[1].split(',').map(v => parseFloat(v.trim()))
        if (items.length > 0 && !items.some(isNaN)) {
          parsedValues = items
          setUserValues(items)
        }
      } catch (e) { }
    }

    const newOutputs: NotebookOutput[] = []
    const printRegex = /print\((.*?)\)/g
    let printMatch
    let stdoutText = ""

    const hasZipLoop = code.includes('for s, v in zip(segments, values):')

    if (hasZipLoop) {
      stdoutText += "Aggregating averages per customer cohort segment...\n"
      for (let i = 0; i < Math.min(parsedSegments.length, parsedValues.length); i++) {
        stdoutText += `Segment: ${parsedSegments[i].padEnd(12)} Average Value: $${parsedValues[i].toFixed(2)}\n`
      }
    } else {
      while ((printMatch = printRegex.exec(code)) !== null) {
        let arg = printMatch[1].trim()
        if (arg.startsWith('f"') || arg.startsWith('f\'') || arg.startsWith('f`')) {
          let innerText = arg.slice(2, -1)
          innerText = innerText.replace(/\{s:<12\}/g, '').replace(/\{v:\.2f\}/g, '')
          innerText = innerText.replace(/\{s\}/g, parsedSegments[0]).replace(/\{v\}/g, parsedValues[0].toString())
          innerText = innerText.replace(/\{0\.712\}/g, '0.712')
          stdoutText += innerText + "\n"
        } else if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
          stdoutText += arg.slice(1, -1) + "\n"
        } else {
          if (arg === 'segment_summary') {
            stdoutText += `      segment  transaction_value\n`
            for (let i = 0; i < Math.min(parsedSegments.length, parsedValues.length); i++) {
              stdoutText += `${i} ${parsedSegments[i].padEnd(12)} ${parsedValues[i].toFixed(6)}\n`
            }
          } else {
            stdoutText += `[Out: ${arg}]\n`
          }
        }
      }
    }

    if (stdoutText) {
      newOutputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: stdoutText
      })
    }

    const hasPlotShow = code.includes('plt.show()') || code.includes('plt.bar')
    if (hasPlotShow) {
      newOutputs.push({
        output_type: 'display_data',
        data: {
          'text/plain': '<Figure size 800x400 with 1 Axes>',
          'image/svg+xml': 'BAR_CHART_SVG_PLACEHOLDER'
        }
      })
    }

    const hasDFHead = code.includes('df.head(')
    if (hasDFHead) {
      let rowsHtml = ""
      const colors = ["#6a9955", "#f44747", "#569cd6", "#ce9178", "#888888"]
      const bgs = ["rgba(106,153,85,0.15)", "rgba(244,71,71,0.15)", "rgba(86,156,214,0.15)", "rgba(206,145,120,0.15)", "rgba(100,100,100,0.15)"]

      for (let i = 0; i < Math.min(parsedSegments.length, parsedValues.length); i++) {
        const seg = parsedSegments[i]
        const colIdx = i % colors.length
        rowsHtml += `
          <tr class="hover:bg-bg-hover/30 border-b border-border">
            <td class="p-2 border border-border font-mono text-text-muted text-[10px]">${i}</td>
            <td class="p-2 border border-border font-semibold">${1000 + i * 29}</td>
            <td class="p-2 border border-border"><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" style="background-color: ${bgs[colIdx]}; color: ${colors[colIdx]}">${seg}</span></td>
            <td class="p-2 border border-border">${i * 14 + 4} days</td>
            <td class="p-2 border border-border">${i * 12 + 5}</td>
            <td class="p-2 border border-border text-primary font-bold">$${parsedValues[i].toFixed(2)}</td>
          </tr>`
      }

      const tableHtml = `
        <table border="1" class="dataframe text-text-primary text-xs w-full text-left rounded overflow-hidden border-collapse border border-border">
          <thead>
            <tr class="bg-input text-text-secondary">
              <th class="p-2 border border-border"></th>
              <th class="p-2 border border-border">customer_id</th>
              <th class="p-2 border border-border">segment</th>
              <th class="p-2 border border-border">recency</th>
              <th class="p-2 border border-border">frequency</th>
              <th class="p-2 border border-border">transaction_value</th>
            </tr>
          </thead>
          <tbody class="bg-card/25">
            ${rowsHtml}
          </tbody>
        </table>`

      newOutputs.push({
        output_type: 'execute_result',
        data: {
          'text/plain': `df columns: customer_id, segment, recency, frequency, transaction_value`,
          'text/html': tableHtml
        }
      })
    }

    const hasSyntaxError = code.includes('print("') && !code.includes('")')
    if (hasSyntaxError) {
      newOutputs.length = 0
      newOutputs.push({
        output_type: 'error',
        ename: 'SyntaxError',
        evalue: 'unterminated string literal (detected at line 3)',
        traceback: [
          '  File \u001b[1;35m"<ipython-input-1>"\u001b[0m, line \u001b[1;36m3\u001b[0m',
          '    print("Aggregating transaction averages...)',
          '                                              ^',
          '\u001b[1;31mSyntaxError\u001b[0m: unterminated string literal (detected at line 3)'
        ]
      })
    }

    return newOutputs
  }

  const handleRunCell = (cellId: string) => {
    setCells(prev => prev.map(c => {
      if (c.id === cellId) {
        return { ...c, isRunning: true }
      }
      return c
    }))
    setKernelState('busy')


    setTimeout(() => {
      setCells(prev => prev.map(c => {
        if (c.id === cellId) {
          const nextCount = (c.executionCount || 0) + 1
          const execTime = (Math.random() * 0.4 + 0.1).toFixed(1) + 's'
          const outputsResult = executePythonInterpreter(c.id, c.input)
          return {
            ...c,
            isRunning: false,
            executionCount: nextCount,
            executionTime: execTime,
            outputs: outputsResult
          }
        }
        return c
      }))
      setKernelState('idle')
    }, 850)
  }

  const runAllCells = () => {
    let delay = 0
    cells.forEach(cell => {
      if (cell.type === 'code') {
        setTimeout(() => {
          handleRunCell(cell.id)
        }, delay)
        delay += 1100
      }
    })
  }

  const addCellAtPosition = (index: number, type: 'code' | 'markdown') => {
    const newId = `cell_${Date.now()}`
    const newCell: Cell = {
      id: newId,
      type,
      input: type === 'code' ? '# Write python code here' : '### Double click to edit text',
      outputs: [],
      executionCount: null,
      showLineNumbers: true,
    }
    const newCells = [...cells]
    newCells.splice(index, 0, newCell)
    setCells(newCells)
    setActiveCellId(newId)
    setNotebookSaved(false)
  }

  const deleteCell = (cellId: string) => {
    if (cells.length <= 1) return
    setCells(cells.filter(c => c.id !== cellId))
    setNotebookSaved(false)
  }

  const handleSave = () => {
    setNotebookSaved(true)
    setAlertOpen(true)
  }

  // Filter autocomplete list based on user input
  const filteredSuggestions = PYTHON_SUGGESTIONS.filter(s =>
    s.label.toLowerCase().includes(autocompleteFilter.toLowerCase())
  )

  return (
    <div className="h-screen flex flex-col bg-background text-text-primary overflow-hidden font-sans border border-border transition-all duration-300">

      {/* Click outside to close menus */}
      {activeMenuDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuDropdown(null)} />
      )}

      {/* 1. Google Colab-style Top Header Panel */}
      <div className="bg-card border-b border-border flex flex-col select-none relative z-50">

        {/* Title, Star, Share, Status */}
        <div className="h-12 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <span className="text-xs font-semibold hover:text-text-primary cursor-pointer" onClick={onClose}>DEP Workbench</span>
              <ChevronRight className="w-3 h-3" />
            </div>

            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" />
              <input
                type="text"
                defaultValue="Analysis_Q4.ipynb"
                onChange={() => setNotebookSaved(false)}
                className="bg-transparent border-b border-transparent hover:border-border focus:border-primary text-sm font-semibold text-text-primary px-1 focus:outline-none transition-colors"
              />
              <button
                onClick={() => setIsStarred(!isStarred)}
                className={`p-1 hover:bg-bg-hover rounded-full transition-colors cursor-pointer ${isStarred ? 'text-[#ce9178]' : 'text-text-secondary'}`}
              >
                <Star className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} />
              </button>

              <span className="text-[10px] text-text-muted ml-2 bg-input px-2 py-0.5 rounded-sm">
                {notebookSaved ? 'All changes saved' : 'Unsaved changes'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Keyboard mode label status indicator */}
            <span className="flex items-center gap-1 px-2 py-0.5 bg-input border border-border text-[9px] font-bold text-text-secondary uppercase tracking-wider rounded-sm select-none">
              <Keyboard className="w-3.5 h-3.5 text-primary" />
              <span>Mode: {editorMode}</span>
            </span>

            <div
              onClick={() => setShowResourceDialog(!showResourceDialog)}
              className="flex items-center gap-2 bg-input border border-border px-2.5 py-1 rounded-full cursor-pointer hover:border-primary/50 transition-all text-[11px] font-mono text-text-secondary"
            >
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-primary" />
                <span>RAM: {ramUsage}%</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-[#6a9955]" />
                <span>Disk: {diskUsage}%</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-[#6a9955] inline-block animate-pulse ml-0.5" />
            </div>

            <button className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-hover transition-colors cursor-pointer">
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              onClick={onToggleFocusMode}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-input border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary rounded-sm transition-all text-xs font-medium cursor-pointer"
              title={isFocusMode ? 'Exit Full Screen Focus' : 'Enter Focus Mode'}
            >
              {isFocusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#f44747]" />
                  <span>Exit Focus</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-primary" />
                  <span>Focus Mode</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1 hover:bg-[#f44747] hover:text-white rounded text-text-secondary transition-colors cursor-pointer"
              title="Close Notebook Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Menu Dropdowns Bar */}
        <div className="h-8 bg-card/60 border-t border-border flex items-center px-4 justify-between relative">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {Object.keys(menus).map(menuKey => (
              <div key={menuKey} className="relative">
                <button
                  onClick={() => setActiveMenuDropdown(activeMenuDropdown === menuKey ? null : menuKey)}
                  className={`hover:text-text-primary hover:bg-bg-hover px-2 py-1 rounded transition-colors cursor-pointer ${activeMenuDropdown === menuKey ? 'bg-bg-hover text-text-primary' : ''}`}
                >
                  {menuKey}
                </button>

                {/* Menu Options dropdown */}
                {activeMenuDropdown === menuKey && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-card border border-border shadow-2xl rounded p-1 z-50 animate-scale-in">
                    {menus[menuKey as keyof typeof menus].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          item.action()
                          setActiveMenuDropdown(null)
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-bg-hover rounded-sm text-text-secondary hover:text-text-primary transition-colors text-xs font-medium cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="w-px h-3 bg-border mx-1" />

            <button onClick={handleSave} className="flex items-center gap-1 hover:text-text-primary cursor-pointer" title="Save Notebook">
              <Save className="w-3.5 h-3.5 text-text-muted hover:text-primary transition-colors" />
              <span>Save</span>
            </button>
            <button onClick={runAllCells} className="flex items-center gap-1 hover:text-text-primary cursor-pointer text-primary" title="Run All Cells">
              <Play className="w-3.5 h-3.5" />
              <span className="font-semibold">Run All</span>
            </button>
            <button onClick={() => setCells(cells.map(c => ({ ...c, executionCount: null, outputs: [] })))} className="flex items-center gap-1 hover:text-text-primary cursor-pointer" title="Restart Runtime">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          </div>

          <div className="text-[10px] text-text-muted flex items-center gap-1.5 font-mono pr-2">
            <span className={`inline-flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${kernelState === 'busy' ? 'bg-[#ce9178] animate-pulse' : 'bg-[#6a9955]'
                }`} />
              {kernelState === 'busy' ? 'Kernel Busy' : 'Python 3 · Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main split notebook area */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Right-click context menu */}
        {contextMenu && (
          <div
            className="fixed z-[200] bg-card border border-border rounded shadow-2xl py-1 w-48 text-xs font-sans animate-scale-in"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            {contextMenu.type !== 'directory' && (
              <button
                onClick={() => { handleOpenFile(contextMenu.path); setContextMenu(null) }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary/10 hover:text-primary text-text-secondary transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </button>
            )}
            {contextMenu.type === 'directory' && (
              <button
                onClick={() => { setCurrentDir(contextMenu.path); setContextMenu(null) }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary/10 hover:text-primary text-text-secondary transition-colors flex items-center gap-2"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Open Folder
              </button>
            )}
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => {
                setIsRenamingPath(contextMenu.path)
                setNewInputName(contextMenu.name)
                setContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
            >
              <Sliders className="w-3.5 h-3.5" />
              Rename
            </button>
            {contextMenu.type !== 'directory' && (
              <button
                onClick={() => { handleDownload(contextMenu.path); setContextMenu(null) }}
                className="w-full text-left px-3 py-1.5 hover:bg-bg-hover text-text-secondary hover:text-primary transition-colors flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                Download
              </button>
            )}
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { handleDelete(contextMenu.path); setContextMenu(null) }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#f44747]/10 text-text-secondary hover:text-[#f44747] transition-colors flex items-center gap-2"
            >
              <X className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}

        {/* Left Sidebar Tab Navigator */}
        <div className="w-12 bg-card border-r border-border flex flex-col items-center py-3 gap-4 select-none">
          {[
            { id: 'toc', icon: FileText, label: 'Table of Contents' },
            { id: 'vars', icon: Variable, label: 'Variables' },
            { id: 'files', icon: FolderOpen, label: 'Files' },
            { id: 'catalog', icon: Compass, label: 'DEP Catalog Explorer' },
            { id: 'data', icon: Database, label: 'DEP Connections (Legacy)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSidebarTab(tab.id as any)}
              className={`p-2 rounded-lg transition-all cursor-pointer relative group ${activeSidebarTab === tab.id
                ? 'text-primary bg-primary/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              title={tab.label}
            >
              <tab.icon className="w-5 h-5" />
              {tab.id === 'catalog' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#6a9955] rounded-full border border-card" />
              )}
            </button>
          ))}
        </div>

        {/* Sidebar expansion panel content — resizable */}
        <div
          className="bg-card border-r border-border flex flex-col select-none relative"
          style={{ width: `${sidebarWidth}px`, minWidth: '160px', maxWidth: '480px' }}
        >
          {activeSidebarTab === 'toc' && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="p-3 border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                Table of Contents
              </div>
              <div className="p-3 space-y-2 text-xs overflow-y-auto">
                <div className="font-semibold text-primary cursor-pointer hover:underline">1. Q4 Segmentation Overview</div>
                <div className="pl-3 text-text-secondary cursor-pointer hover:text-text-primary">1.1 Data Load & Setup</div>
                <div className="pl-3 text-text-secondary cursor-pointer hover:text-text-primary">1.2 Aggregations & Grouping</div>
                <div className="pl-3 text-text-secondary cursor-pointer hover:text-text-primary">1.3 Visualizations</div>
              </div>
            </div>
          )}

          {activeSidebarTab === 'vars' && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="p-3 border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                <span>Variables</span>
                <span className="text-[10px] bg-input px-1.5 py-0.5 rounded text-text-muted font-mono">3 active</span>
              </div>
              <div className="p-2 space-y-2 overflow-y-auto flex-1 font-mono text-[11px]">
                <div className="p-1.5 bg-input/40 border border-border/60 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold">segments</span>
                    <span className="text-[9px] text-text-muted">list</span>
                  </div>
                  <div className="text-[10px] text-text-secondary truncate mt-0.5">[{userSegments.map(s => `"${s}"`).join(', ')}]</div>
                </div>
                <div className="p-1.5 bg-input/40 border border-border/60 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold">values</span>
                    <span className="text-[9px] text-text-muted">list</span>
                  </div>
                  <div className="text-[10px] text-text-secondary truncate mt-0.5">[{userValues.join(', ')}]</div>
                </div>
                <div className="p-1.5 bg-input/40 border border-border/60 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold">df</span>
                    <span className="text-[9px] text-text-muted">DataFrame</span>
                  </div>
                  <div className="text-[10px] text-text-secondary truncate mt-0.5">{userSegments.length} rows x 5 columns</div>
                </div>
              </div>
            </div>
          )}

          {activeSidebarTab === 'files' && (
            <div className="flex flex-col h-full animate-fade-in text-xs">
              <div className="p-3 border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                <span>Files</span>
                <span className="text-[10px] bg-input px-1.5 py-0.5 rounded text-text-muted font-mono">
                  {Object.keys(virtualFS).length - 1} items
                </span>
              </div>

              {/* Action Toolbar */}
              <div className="p-2 border-b border-border flex items-center justify-around bg-card/30 gap-1 flex-wrap">
                <button
                  onClick={() => setIsCreatingFile('notebook')}
                  className="flex items-center gap-1 px-1.5 py-1 bg-input hover:bg-primary/10 hover:text-primary rounded border border-border text-[9px] font-semibold transition-all cursor-pointer"
                  title="Create Notebook"
                >
                  <Plus className="w-3 h-3 text-primary" />
                  <span>Notebook</span>
                </button>
                <button
                  onClick={() => setIsCreatingFile('file')}
                  className="flex items-center gap-1 px-1.5 py-1 bg-input hover:bg-primary/10 hover:text-primary rounded border border-border text-[9px] font-semibold transition-all cursor-pointer"
                  title="Create Python/Script file"
                >
                  <Plus className="w-3 h-3 text-primary" />
                  <span>Script</span>
                </button>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center gap-1 px-1.5 py-1 bg-input hover:bg-primary/10 hover:text-primary rounded border border-border text-[9px] font-semibold transition-all cursor-pointer"
                  title="Create Folder"
                >
                  <Plus className="w-3 h-3 text-primary" />
                  <span>Folder</span>
                </button>

                <input
                  type="file"
                  id="jupyter-file-upload"
                  onChange={handleUpload}
                  className="hidden"
                  multiple
                />
                <button
                  onClick={() => document.getElementById('jupyter-file-upload')?.click()}
                  className="flex items-center gap-1 px-1.5 py-1 bg-input hover:bg-primary/10 hover:text-primary rounded border border-border text-[9px] font-semibold transition-all cursor-pointer"
                  title="Upload files from computer"
                >
                  <FolderOpen className="w-3 h-3 text-text-muted" />
                  <span>Upload</span>
                </button>
              </div>

              {/* Path Navigator Breadcrumbs */}
              <div className="p-2 border-b border-border bg-card/45 flex items-center gap-1 overflow-x-auto text-[10px] text-text-secondary font-semibold font-mono whitespace-nowrap">
                <button
                  onClick={() => setCurrentDir('/')}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  root
                </button>
                {currentDir !== '/' && currentDir.split('/').filter(Boolean).map((part, index, arr) => {
                  const linkPath = '/' + arr.slice(0, index + 1).join('/')
                  return (
                    <div key={linkPath} className="flex items-center gap-1">
                      <ChevronRight className="w-2.5 h-2.5 text-text-muted" />
                      <button
                        onClick={() => setCurrentDir(linkPath)}
                        className="hover:text-primary transition-colors cursor-pointer"
                      >
                        {part}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Files Directory List */}
              <div className="p-2 space-y-1 overflow-y-auto flex-1 font-mono text-[11px]">
                {/* Parent directory navigate back button */}
                {currentDir !== '/' && (
                  <div
                    onClick={() => {
                      const parent = getParentPath(currentDir)
                      if (parent) setCurrentDir(parent)
                    }}
                    className="flex items-center gap-2 hover:bg-bg-hover/30 p-1 rounded cursor-pointer text-text-secondary hover:text-text-primary transition-colors select-none"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted rotate-180" />
                    <span className="font-semibold">.. (Parent folder)</span>
                  </div>
                )}

                {(() => {
                  const items = getFilesForDir(currentDir)

                  // Sort: directories first, then notebooks, then others
                  const sorted = [...items].sort((a, b) => {
                    if (a.type === 'directory' && b.type !== 'directory') return -1
                    if (a.type !== 'directory' && b.type === 'directory') return 1
                    if (a.type === 'notebook' && b.type === 'file') return -1
                    if (a.type === 'file' && b.type === 'notebook') return 1
                    return a.name.localeCompare(b.name)
                  })

                  if (sorted.length === 0 && currentDir === '/') {
                    return <div className="text-center text-text-muted text-[10px] py-4">Workspace root is empty</div>
                  } else if (sorted.length === 0 && currentDir !== '/') {
                    return <div className="text-center text-text-muted text-[10px] py-4">Folder is empty</div>
                  }

                  return sorted.map(item => {
                    // Match icons
                    let IconComponent = FileText
                    let iconColorClass = "text-text-muted"

                    if (item.type === 'directory') {
                      IconComponent = FolderOpen
                      iconColorClass = "text-[#b5dc94]"
                    } else if (item.type === 'notebook') {
                      IconComponent = FileCode
                      iconColorClass = "text-primary"
                    } else if (item.name.endsWith('.py')) {
                      IconComponent = Code
                      iconColorClass = "text-[#ce9178]"
                    }

                    const isCurrentOpenNotebook = item.path === activeFilePath

                    return (
                      <div
                        key={item.path}
                        onClick={() => handleOpenFile(item.path)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            path: item.path,
                            name: item.name,
                            type: item.type
                          })
                        }}
                        className={`group relative flex items-center justify-between hover:bg-bg-hover/40 p-1.5 rounded cursor-pointer transition-all ${isCurrentOpenNotebook ? 'bg-primary/10 border-l-2 border-primary pl-1' : ''
                          }`}
                        title={`Click to open · Right-click for options`}
                      >
                        <div className="flex items-center gap-2 pr-8 truncate select-none">
                          <IconComponent className={`w-3.5 h-3.5 ${iconColorClass} flex-shrink-0`} />
                          {isRenamingPath === item.path ? (
                            <input
                              autoFocus
                              value={newInputName}
                              onChange={e => setNewInputName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleRename(item.path, newInputName)
                                  setIsRenamingPath(null)
                                  setNewInputName('')
                                } else if (e.key === 'Escape') {
                                  setIsRenamingPath(null)
                                  setNewInputName('')
                                }
                              }}
                              onBlur={() => {
                                if (newInputName.trim()) handleRename(item.path, newInputName)
                                setIsRenamingPath(null)
                                setNewInputName('')
                              }}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 bg-input border border-primary text-text-primary text-[11px] px-1 py-0.5 rounded outline-none font-mono"
                            />
                          ) : (
                            <span className={`truncate text-[11px] ${isCurrentOpenNotebook ? 'text-primary font-bold' : 'text-text-secondary hover:text-text-primary'}`}>
                              {item.name}
                            </span>
                          )}
                        </div>

                        {/* Inline Hover Action Tools — only show when not renaming */}
                        {isRenamingPath !== item.path && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-card border border-border shadow-md rounded p-0.5 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setIsRenamingPath(item.path)
                                setNewInputName(item.name)
                              }}
                              className="p-1 hover:bg-bg-hover text-text-secondary hover:text-text-primary rounded transition-colors"
                              title="Rename"
                            >
                              <Sliders className="w-3 h-3" />
                            </button>
                            {item.type !== 'directory' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownload(item.path)
                                }}
                                className="p-1 hover:bg-bg-hover text-text-secondary hover:text-primary rounded transition-colors"
                                title="Download"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(item.path)
                              }}
                              className="p-1 hover:bg-bg-hover text-text-secondary hover:text-[#f44747] rounded transition-colors"
                              title="Delete"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {activeSidebarTab === 'catalog' && (
            <div className="flex flex-col h-full animate-fade-in text-[11px]">
              {/* Header */}
              <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Catalog Explorer</span>
                </div>
                <span className="text-[9px] bg-[#6a9955]/15 text-[#b5dc94] px-1.5 py-0.5 rounded font-semibold">4 catalogs</span>
              </div>

              {/* Search bar */}
              <div className="px-2 py-2 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-1.5 bg-input border border-border rounded px-2 py-1">
                  <Search className="w-3 h-3 text-text-muted flex-shrink-0" />
                  <input
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Search catalogs, columns…"
                    className="flex-1 bg-transparent text-[10px] text-text-primary placeholder:text-text-muted outline-none"
                  />
                  {catalogSearch && (
                    <button onClick={() => setCatalogSearch('')} className="text-text-muted hover:text-text-primary">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tree content */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {([
                  {
                    id: 'proj_analytics',
                    label: '📊 Analytics Project',
                    role: 'ANALYST',
                    catalogs: [
                      {
                        id: 'cat_customer_profiles',
                        name: 'customer_profiles',
                        type: 'Mock / JSON',
                        rows: '5K',
                        access: 'READ',
                        varName: 'df_customers',
                        columns: [
                          { name: 'customer_id', dtype: 'int64' },
                          { name: 'segment', dtype: 'str' },
                          { name: 'recency_days', dtype: 'int64' },
                          { name: 'frequency', dtype: 'int64' },
                          { name: 'transaction_value', dtype: 'float64' },
                        ]
                      },
                      {
                        id: 'cat_sales_transactions',
                        name: 'sales_transactions',
                        type: 'CSV File',
                        rows: '30',
                        access: 'READ',
                        varName: 'df_sales',
                        columns: [
                          { name: 'transaction_id', dtype: 'str' },
                          { name: 'date', dtype: 'datetime' },
                          { name: 'customer_id', dtype: 'str' },
                          { name: 'customer_name', dtype: 'str' },
                          { name: 'region', dtype: 'str' },
                          { name: 'product_category', dtype: 'str' },
                          { name: 'product_name', dtype: 'str' },
                          { name: 'quantity', dtype: 'int64' },
                          { name: 'unit_price', dtype: 'float64' },
                          { name: 'discount_pct', dtype: 'float64' },
                          { name: 'revenue', dtype: 'float64' },
                          { name: 'cost', dtype: 'float64' },
                          { name: 'profit', dtype: 'float64' },
                          { name: 'channel', dtype: 'str' },
                          { name: 'payment_method', dtype: 'str' },
                          { name: 'status', dtype: 'str' },
                        ]
                      },
                    ]
                  },
                  {
                    id: 'proj_operations',
                    label: '⚙️ Operations Project',
                    role: 'ANALYST',
                    catalogs: [
                      {
                        id: 'cat_revenue_forecasting_db',
                        name: 'revenue_forecasting_db',
                        type: 'Mock / PostgreSQL',
                        rows: '5',
                        access: 'READ',
                        varName: 'df_revenue',
                        columns: [
                          { name: 'month', dtype: 'str' },
                          { name: 'revenue', dtype: 'float64' },
                          { name: 'forecast', dtype: 'float64' },
                          { name: 'confidence_lower', dtype: 'float64' },
                          { name: 'confidence_upper', dtype: 'float64' },
                        ]
                      },
                      {
                        id: 'cat_product_inventory',
                        name: 'product_inventory',
                        type: 'Mock / MySQL',
                        rows: '4',
                        access: 'READ',
                        varName: 'df_inventory',
                        columns: [
                          { name: 'sku', dtype: 'str' },
                          { name: 'product', dtype: 'str' },
                          { name: 'stock', dtype: 'int64' },
                          { name: 'price', dtype: 'float64' },
                        ]
                      },
                    ]
                  },
                ] as const).map(project => {
                  const projectMatches = !catalogSearch || project.label.toLowerCase().includes(catalogSearch.toLowerCase())
                  const visibleCatalogs = project.catalogs.filter(cat =>
                    !catalogSearch ||
                    cat.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    cat.columns.some(col => col.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                  )
                  if (!projectMatches && visibleCatalogs.length === 0) return null

                  const projExpanded = expandedCatalogNodes[project.id] ?? true

                  return (
                    <div key={project.id} className="animate-fade-in">
                      {/* Project header row */}
                      <button
                        onClick={() => toggleCatalogNode(project.id)}
                        className="w-full flex items-center gap-1.5 px-1 py-1.5 rounded hover:bg-bg-hover transition-colors cursor-pointer group"
                      >
                        <ChevronRight
                          className={`w-3 h-3 text-text-muted transition-transform duration-150 ${
                            projExpanded ? 'rotate-90' : ''
                          }`}
                        />
                        <span className="text-[11px] font-bold text-text-primary flex-1 text-left">{project.label}</span>
                        <span className="text-[9px] text-text-muted bg-input px-1 rounded">{project.catalogs.length}</span>
                      </button>

                      {projExpanded && (
                        <div className="ml-3 border-l border-border/50 pl-2 space-y-0.5 mb-1">
                          {visibleCatalogs.map(catalog => {
                            const catExpanded = expandedCatalogNodes[catalog.id] ?? false
                            const visibleCols = catalog.columns.filter(col =>
                              !catalogSearch || col.name.toLowerCase().includes(catalogSearch.toLowerCase())
                            )

                            // dtype badge color
                            const dtypeColor = (dt: string) => {
                              if (dt === 'float64' || dt === 'int64') return 'text-[#b5cea8]'
                              if (dt === 'datetime') return 'text-[#a78bfa]'
                              return 'text-[#ce9178]'
                            }

                            return (
                              <div key={catalog.id} className="rounded border border-transparent hover:border-border/40 transition-all">
                                {/* Catalog row */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => toggleCatalogNode(catalog.id)}
                                    className="flex-1 flex items-center gap-1.5 px-1.5 py-1.5 hover:bg-bg-hover rounded transition-colors cursor-pointer"
                                  >
                                    <ChevronRight
                                      className={`w-3 h-3 text-text-muted flex-shrink-0 transition-transform duration-150 ${
                                        catExpanded ? 'rotate-90' : ''
                                      }`}
                                    />
                                    <Database className="w-3 h-3 text-primary flex-shrink-0" />
                                    <span className="font-semibold text-text-primary truncate flex-1 text-left text-[10.5px]">{catalog.name}</span>
                                    <span className="text-[8.5px] text-text-muted bg-input px-1 rounded whitespace-nowrap">{catalog.rows} rows</span>
                                  </button>

                                  {/* Inject button */}
                                  <button
                                    onClick={() => {
                                      const targetCell = cells.find(c => c.id === activeCellId)
                                      if (targetCell && targetCell.type === 'code') {
                                        const injection = `import dep_sdk as dep\n${catalog.varName} = dep.get_catalog("${catalog.name}")\n${catalog.varName}.head()`
                                        setCells(cells.map(c => c.id === activeCellId
                                          ? { ...c, input: c.input ? c.input + '\n\n' + injection : injection }
                                          : c
                                        ))
                                      } else {
                                        // Insert as a new code cell below active cell
                                        const idx = cells.findIndex(c => c.id === activeCellId)
                                        const newCell: Cell = {
                                          id: `cell_cat_${Date.now()}`,
                                          type: 'code',
                                          input: `import dep_sdk as dep\n${catalog.varName} = dep.get_catalog("${catalog.name}")\n${catalog.varName}.head()`,
                                          outputs: [],
                                          showLineNumbers: true,
                                        }
                                        const newCells = [...cells]
                                        newCells.splice(idx + 1, 0, newCell)
                                        setCells(newCells)
                                        setActiveCellId(newCell.id)
                                      }
                                    }}
                                    className="px-1.5 py-1 text-[8.5px] font-semibold bg-primary/10 hover:bg-primary text-primary hover:text-white rounded transition-all mr-1 cursor-pointer whitespace-nowrap flex-shrink-0"
                                    title={`Insert dep.get_catalog("${catalog.name}") into active cell`}
                                  >
                                    ↳ Load
                                  </button>
                                </div>

                                {/* Catalog metadata badges */}
                                {catExpanded && (
                                  <div className="ml-6 pb-1">
                                    <div className="flex items-center gap-1 px-1 mb-1.5 flex-wrap">
                                      <span className="text-[8.5px] bg-input border border-border/50 text-text-muted px-1.5 py-0.5 rounded">{catalog.type}</span>
                                      <span className="text-[8.5px] bg-[#6a9955]/10 border border-[#6a9955]/20 text-[#b5dc94] px-1.5 py-0.5 rounded">{catalog.access}</span>
                                    </div>

                                    {/* Column list */}
                                    <div className="space-y-0.5">
                                      {(catalogSearch ? visibleCols : catalog.columns).map(col => (
                                        <button
                                          key={col.name}
                                          onClick={() => {
                                            const varN = catalog.varName
                                            const targetCell = cells.find(c => c.id === activeCellId)
                                            if (targetCell && targetCell.type === 'code') {
                                              const insertion = `${varN}['${col.name}']`
                                              const el = editorRefs.current[activeCellId]
                                              if (el) {
                                                const start = el.selectionStart
                                                const end = el.selectionEnd
                                                const newInput = targetCell.input.slice(0, start) + insertion + targetCell.input.slice(end)
                                                setCells(cells.map(c => c.id === activeCellId ? { ...c, input: newInput } : c))
                                              } else {
                                                setCells(cells.map(c => c.id === activeCellId ? { ...c, input: c.input + insertion } : c))
                                              }
                                            }
                                          }}
                                          title={`Insert ${catalog.varName}['${col.name}']`}
                                          className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all cursor-pointer group"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-border flex-shrink-0 group-hover:bg-primary transition-colors" />
                                          <span className="font-mono text-text-secondary group-hover:text-text-primary transition-colors text-[10px] flex-1 text-left">{col.name}</span>
                                          <span className={`text-[8.5px] font-mono ${dtypeColor(col.dtype)}`}>{col.dtype}</span>
                                        </button>
                                      ))}
                                    </div>

                                    {/* Quick snippet buttons */}
                                    <div className="mt-2 flex gap-1 flex-wrap">
                                      {[
                                        { label: '.head()', code: `${catalog.varName}.head()` },
                                        { label: '.describe()', code: `${catalog.varName}.describe()` },
                                        { label: '.shape', code: `${catalog.varName}.shape` },
                                        { label: '.dtypes', code: `${catalog.varName}.dtypes` },
                                      ].map(snip => (
                                        <button
                                          key={snip.label}
                                          onClick={() => {
                                            const targetCell = cells.find(c => c.id === activeCellId)
                                            if (targetCell && targetCell.type === 'code') {
                                              setCells(cells.map(c => c.id === activeCellId
                                                ? { ...c, input: c.input + (c.input.endsWith('\n') ? '' : '\n') + snip.code }
                                                : c
                                              ))
                                            }
                                          }}
                                          className="text-[8.5px] px-1.5 py-0.5 bg-input border border-border hover:border-primary/40 hover:text-primary text-text-muted rounded font-mono transition-all cursor-pointer"
                                        >
                                          {snip.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer hint */}
              <div className="flex-shrink-0 px-3 py-2 border-t border-border bg-card/50">
                <p className="text-[9.5px] text-text-muted leading-relaxed">
                  <span className="text-primary font-semibold">↳ Load</span> → injects <code className="bg-input px-0.5 rounded">dep.get_catalog()</code> into the active cell. Click any column to insert a column reference.
                </p>
              </div>
            </div>
          )}

          {activeSidebarTab === 'data' && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="p-3 border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                DEP Connections
              </div>
              <div className="p-3 space-y-3 text-xs overflow-y-auto flex-1">
                <p className="text-[11px] text-text-muted">Inject registered connections into python cell environment:</p>
                {[
                  { name: 'customer_profiles', type: 'JSON Stream' },
                  { name: 'revenue_forecasting_db', type: 'PostgreSQL' }
                ].map(conn => (
                  <div key={conn.name} className="p-2 bg-input rounded border border-border space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-text-primary">{conn.name}</span>
                      <span className="text-[9px] text-primary">{conn.type}</span>
                    </div>
                    <button
                      onClick={() => {
                        const targetCell = cells.find(c => c.id === activeCellId)
                        if (targetCell && targetCell.type === 'code') {
                          const injection = `\n# Link from database: ${conn.name}\n${conn.name}_db = pd.read_json("api/v1/catalogs/${conn.name}")\n`
                          setCells(cells.map(c => c.id === activeCellId ? { ...c, input: c.input + injection } : c))
                        }
                      }}
                      className="w-full text-center py-1 mt-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded transition-colors text-[9px] font-semibold cursor-pointer"
                    >
                      Inject Connection reference
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar resize drag handle */}
        <div
          className="w-1 bg-transparent hover:bg-primary/40 cursor-col-resize transition-colors active:bg-primary/60 flex-shrink-0 select-none"
          onMouseDown={(e) => {
            isResizingSidebar.current = true
            sidebarResizeStartX.current = e.clientX
            sidebarResizeStartWidth.current = sidebarWidth
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
        />

        {/* Center: Notebook Panel */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden relative">

          {/* Autocomplete floating list overlay */}
          {autocompleteOpen && filteredSuggestions.length > 0 && (
            <div
              className="absolute bg-card border border-border rounded shadow-2xl p-1 z-[100] w-64 max-h-48 overflow-y-auto font-mono text-[11px] animate-scale-in"
              style={{ top: `${autocompleteCoords.top}px`, left: `${autocompleteCoords.left}px` }}
            >
              {filteredSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => commitAutocomplete(item.insertText)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer transition-colors ${autocompleteIndex === idx
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className={`text-[9px] uppercase px-1 rounded ${autocompleteIndex === idx ? 'bg-white/20 text-white' : 'bg-input text-text-muted'}`}>
                    {item.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-2 scrollbar-track-card">
            {cells.map((cell, index) => {
              const isActive = activeCellId === cell.id
              const isEditing = editorMode === 'edit' && isActive

              return (
                <div key={cell.id} className="group relative">

                  {/* Google Colab Hover insert cell line */}
                  <div className="absolute -top-1.5 left-0 right-0 h-3 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20">
                    <div className="w-full h-0.5 bg-border flex items-center justify-center">
                      <div className="flex items-center gap-1.5 bg-background px-2 text-[10px] font-semibold">
                        <button
                          onClick={() => addCellAtPosition(index, 'code')}
                          className="flex items-center gap-1 px-2 py-0.5 bg-input border border-border text-text-secondary hover:text-primary hover:border-primary rounded-full transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Code</span>
                        </button>
                        <button
                          onClick={() => addCellAtPosition(index, 'markdown')}
                          className="flex items-center gap-1 px-2 py-0.5 bg-input border border-border text-text-secondary hover:text-primary hover:border-primary rounded-full transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Text</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cell Box container */}
                  <div
                    onClick={() => {
                      setActiveCellId(cell.id)
                      if (editorMode === 'edit' && activeCellId !== cell.id) {
                        setEditorMode('command')
                      }
                    }}
                    onDoubleClick={() => {
                      setActiveCellId(cell.id)
                      setEditorMode('edit')
                      setTimeout(() => {
                        const ed = editorRefs.current[cell.id]
                        if (ed) ed.focus()
                      }, 50)
                    }}
                    className={`flex items-start transition-all relative pl-12 rounded-sm border ${isActive
                      ? isEditing
                        ? 'border-primary bg-input/5 ring-1 ring-primary/30'
                        : 'border-primary/50 bg-input/5'
                      : 'border-transparent hover:border-border/30'
                      }`}
                  >

                    {/* Hover Play Button */}
                    {cell.type === 'code' && (
                      <div className="absolute left-2.5 top-3 flex flex-col items-center">
                        <button
                          onClick={() => handleRunCell(cell.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${cell.isRunning
                            ? 'border-primary bg-transparent'
                            : isActive
                              ? 'border-primary bg-primary/15 text-primary hover:bg-primary hover:text-white'
                              : 'border-border bg-input text-text-secondary opacity-0 group-hover:opacity-100 hover:border-primary hover:text-primary'
                            }`}
                        >
                          {cell.isRunning ? (
                            <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 ml-0.5 fill-current" />
                          )}
                        </button>

                        {!cell.isRunning && cell.executionCount !== null && (
                          <span className="text-[9px] text-text-muted mt-1 font-mono">
                            [{cell.executionCount}]
                          </span>
                        )}
                      </div>
                    )}

                    {cell.type === 'markdown' && (
                      <div className="absolute left-2.5 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-text-muted font-bold font-mono uppercase bg-input border border-border px-1.5 py-0.5 rounded-sm">
                          Text
                        </span>
                      </div>
                    )}

                    {/* Cell Body */}
                    <div className="flex-1 flex flex-col">
                      <div className="p-3 pr-6 text-sm">
                        {cell.type === 'markdown' ? (
                          isEditing ? (
                            <textarea
                              ref={el => { editorRefs.current[cell.id] = el }}
                              value={cell.input}
                              onChange={(e) => {
                                const nextVal = e.target.value
                                setCells(cells.map(c => c.id === cell.id ? { ...c, input: nextVal } : c))
                                setNotebookSaved(false)
                                adjustTextareaHeight(e.target)
                              }}
                              className="w-full bg-input text-text-primary border border-border p-2 focus:ring-1 focus:ring-primary rounded-sm font-sans text-sm resize-y outline-none"
                              style={{ minHeight: '80px' }}
                            />
                          ) : (
                            <div
                              className="text-text-primary font-sans leading-relaxed whitespace-pre-wrap select-text cursor-text min-h-[20px]"
                              title="Double click to edit markdown text"
                            >
                              {cell.input.startsWith('#') ? (
                                <h2 className="text-base font-bold border-b border-border pb-1 mb-2 text-text-primary">
                                  {cell.input.replace('#', '').trim()}
                                </h2>
                              ) : (
                                cell.input
                              )}
                            </div>
                          )
                        ) : (
                          // Code editor
                          <div className="relative">
                            <textarea
                              ref={el => { editorRefs.current[cell.id] = el }}
                              value={cell.input}
                              onChange={(e) => {
                                const nextVal = e.target.value
                                setCells(cells.map(c => c.id === cell.id ? { ...c, input: nextVal } : c))
                                handleEditorInput(e, cell.id)
                                adjustTextareaHeight(e.target)
                              }}
                              onKeyDown={(e) => handleEditorKeyDown(e, cell.id)}
                              className={`w-full font-mono text-xs leading-5 bg-input border border-border rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary resize-y ${isEditing ? 'block' : 'hidden'
                                }`}
                              style={{ minHeight: '60px' }}
                            />
                            {!isEditing && (
                              <div className="w-full bg-input/30 rounded border border-border/40 p-2 cursor-text relative overflow-x-auto">
                                <PythonHighlight code={cell.input} />
                                <span className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-50 text-[9px] text-text-muted select-none">
                                  Double-click to Edit
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {cell.type === 'code' && cell.executionTime && !cell.isRunning && (
                        <div className="px-3 pb-1.5 flex items-center justify-between text-[9px] text-text-muted font-mono select-none">
                          <div className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#6a9955]" />
                            <span>Executed in {cell.executionTime}</span>
                          </div>
                        </div>
                      )}

                      {/* Dynamic Outputs rendering */}
                      {cell.type === 'code' && cell.outputs.length > 0 && (
                        <div className="border-t border-border bg-card/10 p-3 text-xs overflow-x-auto min-h-[45px] animate-fade-in-up">
                          {cell.outputs.map((out, outIdx) => (
                            <div key={outIdx} className="space-y-2">

                              {out.output_type === 'execute_result' && out.data?.['text/html'] && (
                                <div
                                  dangerouslySetInnerHTML={{ __html: out.data['text/html'] }}
                                  className="overflow-x-auto rounded border border-border bg-background"
                                />
                              )}

                              {out.output_type === 'stream' && out.text && (
                                <pre className="text-text-secondary font-mono whitespace-pre-wrap leading-5">{out.text}</pre>
                              )}

                              {out.output_type === 'error' && out.traceback && (
                                <div className="bg-[#f44747]/5 border-l-4 border-[#f44747] p-2.5 rounded font-mono text-[11px] text-[#ff9999] space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold mb-1">
                                    <AlertTriangle className="w-4 h-4 text-[#f44747]" />
                                    <span>{out.ename}: {out.evalue}</span>
                                  </div>
                                  <pre className="whitespace-pre-wrap leading-relaxed opacity-90">
                                    {out.traceback.join('\n')}
                                  </pre>
                                </div>
                              )}

                              {out.output_type === 'display_data' && out.data?.['image/svg+xml'] && (
                                <div className="flex flex-col items-center p-4 bg-background rounded border border-border">
                                  <span className="text-[10px] font-sans font-semibold text-text-secondary mb-3">
                                    Matplotlib Output Chart: Avg Transaction Value
                                  </span>
                                  <div className="w-full max-w-md h-48 flex items-end justify-between px-8 border-b border-l border-border/80 pt-6 relative select-none">
                                    <div className="absolute left-0 right-0 top-1/4 border-t border-border/10" />
                                    <div className="absolute left-0 right-0 top-2/4 border-t border-border/10" />
                                    <div className="absolute left-0 right-0 top-3/4 border-t border-border/10" />

                                    {userSegments.map((seg, i) => {
                                      const val = userValues[i] || 0
                                      const maxVal = Math.max(...userValues, 1)
                                      const hPx = Math.max(10, Math.floor((val / maxVal) * 135))

                                      return (
                                        <div key={i} className="flex flex-col items-center w-16 group z-10">
                                          <div
                                            className="w-full bg-primary rounded-t-sm transition-all duration-500 hover:opacity-85 cursor-pointer relative"
                                            style={{ height: `${hPx}px` }}
                                          >
                                            <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-input border border-border px-1.5 py-0.5 rounded text-[9px] font-sans text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                              ${val.toFixed(2)}
                                            </span>
                                          </div>
                                          <span className="text-[9px] text-text-secondary mt-2 font-sans rotate-12 origin-top-left whitespace-nowrap">{seg}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                      <button
                        onClick={() => deleteCell(cell.id)}
                        className="p-1 hover:bg-[#f44747] hover:text-white rounded text-text-secondary transition-colors cursor-pointer"
                        title="Delete Cell"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              )
            })}

            <div className="flex justify-center pt-4 opacity-50 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addCellAtPosition(cells.length, 'code')}
                  className="flex items-center gap-1 px-3 py-1 bg-input border border-border text-xs text-text-primary hover:border-primary hover:text-primary rounded-full transition-all cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Code Cell</span>
                </button>
                <button
                  onClick={() => addCellAtPosition(cells.length, 'markdown')}
                  className="flex items-center gap-1 px-3 py-1 bg-input border border-border text-xs text-text-primary hover:border-primary hover:text-primary rounded-full transition-all cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Text Cell</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* File Viewer Overlay — for non-notebook files (.py, .csv, .txt, .json) */}
      {selectedFileForViewer && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-text-primary">{selectedFileForViewer.name}</span>
                <span className="text-[10px] bg-input border border-border text-text-muted px-2 py-0.5 rounded font-mono">
                  {selectedFileForViewer.name.split('.').pop()?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setVirtualFS(prev => ({
                      ...prev,
                      [selectedFileForViewer.path]: {
                        ...prev[selectedFileForViewer.path],
                        content: selectedFileForViewer.content
                      }
                    }))
                    setSelectedFileForViewer(null)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save & Close
                </button>
                <button
                  onClick={() => setSelectedFileForViewer(null)}
                  className="p-1.5 hover:bg-bg-hover text-text-secondary hover:text-text-primary rounded transition-colors cursor-pointer"
                  title="Close without saving"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editor area */}
            <div className="flex-1 overflow-hidden relative">
              <textarea
                value={selectedFileForViewer.content}
                onChange={e => setSelectedFileForViewer(prev => prev ? { ...prev, content: e.target.value } : null)}
                className="w-full h-full bg-background text-text-primary font-mono text-xs leading-5 p-4 resize-none outline-none border-0 focus:ring-0"
                spellCheck={false}
              />
              {/* Line numbers gutter overlay */}
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-card/50 border-r border-border pointer-events-none">
                <div className="p-4 font-mono text-[10px] text-text-muted leading-5 text-right select-none">
                  {selectedFileForViewer.content.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
              </div>
              {/* Indent editor content to account for gutter */}
              <style>{`.file-viewer-textarea { padding-left: 3rem !important; }`}</style>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-card/50 text-[10px] text-text-muted font-mono">
              <span>Lines: {selectedFileForViewer.content.split('\n').length}</span>
              <span>Chars: {selectedFileForViewer.content.length}</span>
              <span>{selectedFileForViewer.name.endsWith('.py') ? 'Python' : selectedFileForViewer.name.endsWith('.csv') ? 'CSV' : 'Plain Text'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Inline create dialog — name input overlay */}
      {(isCreatingFile || isCreatingFolder) && (
        <div className="fixed inset-0 z-[160] bg-black/50 flex items-center justify-center" onClick={() => { setIsCreatingFile(null); setIsCreatingFolder(false); setNewInputName('') }}>
          <div className="bg-card border border-border rounded-lg shadow-2xl p-6 w-80 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-text-primary mb-1">
              {isCreatingFolder ? 'New Folder' : isCreatingFile === 'notebook' ? 'New Notebook' : 'New Script'}
            </h3>
            <p className="text-[11px] text-text-muted mb-4">
              Creating in: <span className="font-mono text-primary">{currentDir}</span>
            </p>
            <input
              autoFocus
              placeholder={isCreatingFolder ? 'folder_name' : isCreatingFile === 'notebook' ? 'my_notebook.ipynb' : 'script.py'}
              value={newInputName}
              onChange={e => setNewInputName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (isCreatingFolder) { handleCreateFolder(newInputName); setIsCreatingFolder(false) }
                  else if (isCreatingFile) { handleCreateFile(newInputName, isCreatingFile); setIsCreatingFile(null) }
                  setNewInputName('')
                } else if (e.key === 'Escape') {
                  setIsCreatingFile(null); setIsCreatingFolder(false); setNewInputName('')
                }
              }}
              className="w-full bg-input border border-border text-text-primary text-sm px-3 py-2 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-mono"
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => {
                  if (isCreatingFolder) { handleCreateFolder(newInputName); setIsCreatingFolder(false) }
                  else if (isCreatingFile) { handleCreateFile(newInputName, isCreatingFile); setIsCreatingFile(null) }
                  setNewInputName('')
                }}
                className="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors cursor-pointer"
              >
                Create
              </button>
              <button
                onClick={() => { setIsCreatingFile(null); setIsCreatingFolder(false); setNewInputName('') }}
                className="flex-1 py-2 bg-input border border-border text-text-secondary text-xs font-semibold rounded hover:bg-bg-hover transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource status details modal */}
      {showResourceDialog && (
        <div className="absolute top-14 right-48 w-72 bg-card border border-border shadow-2xl rounded p-4 z-50 animate-scale-in">
          <div className="flex items-center justify-between pb-2 border-b border-border mb-3 font-sans">
            <span className="text-xs font-bold text-text-primary">Connected VM Hardware Summary</span>
            <button onClick={() => setShowResourceDialog(false)} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 text-xs font-sans">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-text-secondary">System RAM Usage</span>
                <span className="font-mono text-primary font-semibold">{(ramUsage * 0.12).toFixed(1)} GB / 12.7 GB</span>
              </div>
              <div className="w-full bg-input h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${ramUsage}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-text-secondary">Persistent Storage Disk</span>
                <span className="font-mono text-[#6a9955] font-semibold">{(diskUsage * 1.07).toFixed(1)} GB / 107.7 GB</span>
              </div>
              <div className="w-full bg-input h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#6a9955] h-full transition-all duration-300" style={{ width: `${diskUsage}%` }} />
              </div>
            </div>

            <button
              onClick={() => {
                setCells(cells.map(c => ({ ...c, executionCount: null, outputs: [] })))
                setRamUsage(12)
                setShowResourceDialog(false)
              }}
              className="w-full py-1.5 bg-input hover:bg-[#f44747] hover:text-white border border-border hover:border-transparent rounded transition-colors text-center text-text-secondary text-[11px] font-semibold cursor-pointer font-sans"
            >
              Reset Connection & Flush RAM
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Helper Dialog */}
      {showShortcutsDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2 text-primary">
                <Keyboard className="w-5 h-5" />
                <h3 className="font-bold text-sm">Jupyter Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShowShortcutsDialog(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-text-secondary uppercase mb-2">Edit Mode (Inside cell)</h4>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span>Shift + Enter</span>
                    <span className="text-primary font-semibold">Run cell, select next</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Alt + Enter</span>
                    <span className="text-primary font-semibold">Run cell, insert below</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Escape</span>
                    <span className="text-primary font-semibold">Exit to Command Mode</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="font-bold text-text-secondary uppercase mb-2">Command Mode (No typing cursor)</h4>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span>Arrow Up / Down</span>
                    <span className="text-primary font-semibold">Select cell up / down</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enter</span>
                    <span className="text-primary font-semibold">Focus editor (Edit Mode)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>A / B</span>
                    <span className="text-primary font-semibold">Insert cell above / below</span>
                  </div>
                  <div className="flex justify-between">
                    <span>D, D (double tap)</span>
                    <span className="text-[#f44747] font-semibold">Delete active cell</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Y / M</span>
                    <span className="text-primary font-semibold">Convert to Code / Text</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsDialog(false)}
              className="w-full py-2 mt-6 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Notebook Settings Dialog */}
      {showNotebookSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2 text-primary">
                <Settings className="w-5 h-5" />
                <h3 className="font-bold text-sm">Jupyter Workspace Settings</h3>
              </div>
              <button onClick={() => setShowNotebookSettings(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between p-2 bg-input/40 border border-border/50 rounded">
                <div>
                  <p className="font-semibold text-text-primary">Global Line Numbers</p>
                  <p className="text-[10px] text-text-muted">Display editor lines index inside code cells</p>
                </div>
                <button
                  onClick={() => setGlobalLineNumbers(!globalLineNumbers)}
                  className="text-primary cursor-pointer hover:opacity-80"
                >
                  {globalLineNumbers ? (
                    <ToggleRight className="w-8 h-8 text-primary" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-text-muted" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 bg-input/40 border border-border/50 rounded">
                <div>
                  <p className="font-semibold text-text-primary">Interactive Graph Output</p>
                  <p className="text-[10px] text-text-muted">Compile input values to SVG vectors in real-time</p>
                </div>
                <ToggleRight className="w-8 h-8 text-primary" />
              </div>
            </div>

            <button
              onClick={() => setShowNotebookSettings(false)}
              className="w-full py-2 mt-6 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Save Notification Toast Alert */}
      <Alert
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        type="success"
        title="Notebook Saved"
        message="Your notebook progress 'Analysis_Q4.ipynb' has been committed to the team repository."
        duration={2500}
      />
    </div>
  )
}
