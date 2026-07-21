'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ChevronRight, Database, FileText, Upload, CheckCircle, AlertCircle, 
  RefreshCw, Plus, Trash2, Search, FolderPlus, Folder, Layers, X, PlusCircle 
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Modal } from '@/components/ui/modal'
import { apiFetch, uploadFileWithProgress } from '@/lib/api'

type DataSourceType = 'csv' | 'postgresql' | 'mysql'
type Step = 'source' | 'configure' | 'review'
type ActiveTab = 'catalogs' | 'onboard'

interface SchemaField {
  column_name: string
  data_type: string
  ordinal_position: number
}

interface TableInfo {
  name: string
  schema: string
  columns: number
}

interface CatalogGroup {
  group_name: string
  datasets: string[]
}

interface ResourceCatalog {
  id: number
  name: string
  description?: string
  groups: CatalogGroup[]
  created_at: string
  updated_at: string
}

export function ResourceCatalogBuilder() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalogs')
  const [loading, setLoading] = useState(false)
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  // ── Resource Catalog Management State ──────────────────────────────────────
  const [resourceCatalogs, setResourceCatalogs] = useState<ResourceCatalog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [allDatasets, setAllDatasets] = useState<any[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Create Catalog Form State
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatGroups, setNewCatGroups] = useState<CatalogGroup[]>([])
  const [tempGroupName, setTempGroupName] = useState('')
  const [tempGroupDatasets, setTempGroupDatasets] = useState<string[]>([])

  // ── Onboard Wizard (CSV/DB) State ──────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<Step>('source')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [sourceType, setSourceType] = useState<DataSourceType>('csv')

  // CSV Form
  const [csvForm, setCsvForm] = useState({
    name: '',
    file: null as File | null,
  })

  // DB Form
  const [dbForm, setDbForm] = useState({
    name: '',
    host: '',
    port: 5432,
    database: '',
    table: '',
    username: '',
    password: '',
  })

  const [availableTables, setAvailableTables] = useState<TableInfo[]>([])
  const [selectedTables, setSelectedTables] = useState<string[]>([])

  // Governance metadata
  const [governance, setGovernance] = useState({
    classification: 'internal',
    retention: '3_years',
    tags: [] as string[],
    description: '',
  })

  // Connection test result
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean
    error?: string
  } | null>(null)

  const showAlert = (type: typeof alertState.type, title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message })
  }

  // ── API Fetchers ───────────────────────────────────────────────────────────
  const fetchCatalogs = useCallback(async () => {
    try {
      const data = await apiFetch<ResourceCatalog[]>('/resource-catalogs')
      setResourceCatalogs(data)
    } catch (e) {
      console.error('Failed to fetch resource catalogs:', e)
    }
  }, [])

  const fetchAllDatasets = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>('/catalog')
      setAllDatasets(data)
    } catch (e) {
      console.error('Failed to fetch datasets:', e)
    }
  }, [])

  useEffect(() => {
    fetchCatalogs()
    fetchAllDatasets()
  }, [fetchCatalogs, fetchAllDatasets])

  // ── Onboarding Connection Testers & Submission ────────────────────────────
  const testConnection = async () => {
    if (sourceType === 'csv') return

    setTestingConnection(true)
    setConnectionTestResult(null)

    try {
      const endpoint = sourceType === 'mysql' ? '/connectors/mysql/test' : '/connectors/postgres/test'
      const result = await apiFetch<{ success: boolean; error?: string; tables?: TableInfo[] }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          host: dbForm.host,
          port: dbForm.port,
          database: dbForm.database,
          username: dbForm.username,
          password: dbForm.password,
        }),
      })

      setConnectionTestResult({ success: result.success, error: result.error })
      if (result.success && result.tables) {
        setAvailableTables(result.tables)
      }

      showAlert(
        result.success ? 'success' : 'error',
        result.success ? 'Connection Successful' : 'Connection Failed',
        result.success ? 'Successfully connected to database' : result.error || 'Connection failed'
      )
    } catch (error) {
      setConnectionTestResult({ success: false, error: error instanceof Error ? error.message : 'Connection failed' })
      showAlert('error', 'Connection Failed', error instanceof Error ? error.message : 'Failed to test connection')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        showAlert('error', 'Invalid File', 'Only CSV files are allowed')
        return
      }
      setCsvForm({ ...csvForm, file })
    }
  }

  const createDataset = async () => {
    setLoading(true)

    try {
      if (sourceType === 'csv') {
        if (!csvForm.name || !csvForm.file) {
          showAlert('error', 'Validation Error', 'Please provide a name and select a CSV file')
          setLoading(false)
          return
        }

        const formData = new FormData()
        formData.append('name', csvForm.name)
        formData.append('file', csvForm.file)

        setUploadProgress(0)
        try {
          await uploadFileWithProgress('/datasets/csv/upload', formData, (progress) => {
            setUploadProgress(progress)
          })
        } finally {
          setUploadProgress(null)
        }
      } else {
        if (!dbForm.name || !dbForm.host || !dbForm.database || !dbForm.table) {
          showAlert('error', 'Validation Error', 'Please fill in all required fields')
          setLoading(false)
          return
        }

        const endpoint = sourceType === 'mysql' ? '/datasets/mysql/register' : '/datasets/postgres/register'
        await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            name: dbForm.name,
            host: dbForm.host,
            port: dbForm.port,
            database: dbForm.database,
            table: dbForm.table,
            username: dbForm.username,
            password: dbForm.password,
          }),
        })
      }

      // Add governance metadata if any description exists
      if (governance.description) {
        const dsName = sourceType === 'csv' ? csvForm.name : dbForm.name
        // Resolve dataset ID
        const catalogsList = await apiFetch<any[]>('/catalog')
        const matchingDs = catalogsList.find((ds) => ds.name === dsName)
        if (matchingDs) {
          // Put schema update to include governance tags
          await apiFetch(`/datasets/${matchingDs.name}/schema`, {
            method: 'PUT',
            body: JSON.stringify(
              matchingDs.schema_fields.map((f: any) => ({
                ...f,
                classification: governance.classification,
              }))
            ),
          })
        }
      }

      showAlert('success', 'Success', 'Data connection has been registered successfully.')
      
      // Reset forms and return to catalogs list
      setCsvForm({ name: '', file: null })
      setDbForm({ name: '', host: '', port: 5432, database: '', table: '', username: '', password: '' })
      setCurrentStep('source')
      setActiveTab('catalogs')
      fetchCatalogs()
      fetchAllDatasets()
    } catch (err: any) {
      showAlert('error', 'Save Failed', err.message || 'An error occurred while saving.')
    } finally {
      setLoading(false)
    }
  }

  // ── Resource Catalog Operations ───────────────────────────────────────────
  const handleSaveCatalog = async () => {
    if (!newCatName.trim()) {
      showAlert('error', 'Validation Error', 'Please enter a name for the resource catalog.')
      return
    }
    if (newCatGroups.length === 0) {
      showAlert('error', 'Validation Error', 'Please add at least one group of datasets.')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/resource-catalogs', {
        method: 'POST',
        body: JSON.stringify({
          name: newCatName,
          description: newCatDesc,
          groups: newCatGroups,
        }),
      })

      showAlert('success', 'Catalog Created', 'Resource catalog has been package-registered successfully.')
      setIsCreateModalOpen(false)
      // reset form
      setNewCatName('')
      setNewCatDesc('')
      setNewCatGroups([])
      setTempGroupName('')
      setTempGroupDatasets([])
      fetchCatalogs()
    } catch (err: any) {
      showAlert('error', 'Creation Failed', err.message || 'Could not create resource catalog.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCatalog = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resource catalog?')) return
    try {
      await apiFetch(`/resource-catalogs/${id}`, { method: 'DELETE' })
      showAlert('success', 'Catalog Deleted', 'Resource catalog deleted successfully.')
      fetchCatalogs()
    } catch (err: any) {
      showAlert('error', 'Delete Failed', err.message || 'Could not delete resource catalog.')
    }
  }

  // Filter resource catalogs based on search query
  const filteredCatalogs = resourceCatalogs.filter((cat) => {
    const q = searchQuery.toLowerCase()
    const nameMatch = cat.name.toLowerCase().includes(q)
    const descMatch = (cat.description || '').toLowerCase().includes(q)
    const groupMatch = cat.groups.some(
      (g) =>
        g.group_name.toLowerCase().includes(q) ||
        g.datasets.some((d) => d.toLowerCase().includes(q))
    )
    return nameMatch || descMatch || groupMatch
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Alert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        duration={4000}
      />

      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            {activeTab === 'catalogs' ? 'Resource Catalog Builder' : 'Onboard Dataset'}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {activeTab === 'catalogs'
              ? 'Group multiple datasets into governed catalogs and manage catalog packages'
              : 'Register a new data resource connection from database or upload a CSV file'}
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-border mb-8">
        <button
          onClick={() => setActiveTab('catalogs')}
          className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
            activeTab === 'catalogs'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Manage Resource Catalogs
        </button>
        <button
          onClick={() => setActiveTab('onboard')}
          className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
            activeTab === 'onboard'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Onboard Dataset (CSV/DB)
        </button>
      </div>

      {/* ── Tab 1: Manage Resource Catalogs ──────────────────────────────────── */}
      {activeTab === 'catalogs' && (
        <div className="space-y-6">
          {/* Top Actions & Search */}
          <div className="flex gap-3 justify-between items-center bg-card p-4 border border-border rounded-lg">
            <div className="relative flex-grow max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalogs by name, group, or dataset..."
                className="w-full bg-input border border-border rounded pl-8 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-text-muted" />
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer select-none active:scale-95"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Catalog</span>
            </button>
          </div>

          {/* Grid of Resource Catalogs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCatalogs.map((catalog) => (
              <div
                key={catalog.id}
                className="bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <Folder className="w-4 h-4 text-primary" />
                      <span>{catalog.name}</span>
                    </h3>
                    <button
                      onClick={() => handleDeleteCatalog(catalog.id)}
                      className="text-text-secondary hover:text-destructive p-1 transition-colors"
                      title="Delete Catalog"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary mb-4 min-h-[32px]">
                    {catalog.description || <span className="text-text-muted italic">No description provided.</span>}
                  </p>

                  {/* Logical groups listing */}
                  <div className="space-y-3 pt-3 border-t border-border/60">
                    {catalog.groups.map((group, idx) => (
                      <div key={idx} className="space-y-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
                          {group.group_name}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {group.datasets.map((dataset) => (
                            <span
                              key={dataset}
                              className="px-2 py-0.5 bg-input border border-border text-text-secondary rounded text-[9px] font-mono"
                            >
                              {dataset}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {filteredCatalogs.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-lg">
                No resource catalogs found matching your search. Click "Create Catalog" to package your datasets.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Onboard Dataset ───────────────────────────────────────────── */}
      {activeTab === 'onboard' && (
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center gap-4 mb-6">
            {(['source', 'configure', 'review'] as Step[]).map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    currentStep === step
                      ? 'bg-primary text-white'
                      : index < ['source', 'configure', 'review'].indexOf(currentStep)
                      ? 'bg-success text-white'
                      : 'bg-input text-text-muted'
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    currentStep === step ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {step === 'source' ? 'Data Source' : step === 'configure' ? 'Configure' : 'Review'}
                </span>
                {index < 2 && (
                  <div
                    className={`flex-1 h-0.5 ml-4 ${
                      index < ['source', 'configure', 'review'].indexOf(currentStep) ? 'bg-success' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Onboard Step 1: Data Source Selection */}
          {currentStep === 'source' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setSourceType('csv')}
                  className={`p-6 bg-card border rounded-lg text-left transition-all ${
                    sourceType === 'csv' ? 'border-primary bg-primary/5' : 'border-border hover:border-border-hover'
                  }`}
                >
                  <Upload className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-semibold text-text-primary mb-1">CSV File</h3>
                  <p className="text-xs text-text-secondary">Upload a structured CSV file from your computer</p>
                </button>

                <button
                  onClick={() => setSourceType('postgresql')}
                  className={`p-6 bg-card border rounded-lg text-left transition-all ${
                    sourceType === 'postgresql' ? 'border-primary bg-primary/5' : 'border-border hover:border-border-hover'
                  }`}
                >
                  <Database className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-semibold text-text-primary mb-1">PostgreSQL</h3>
                  <p className="text-xs text-text-secondary">Connect to a live governed PostgreSQL database</p>
                </button>

                <button
                  onClick={() => setSourceType('mysql')}
                  className={`p-6 bg-card border rounded-lg text-left transition-all ${
                    sourceType === 'mysql' ? 'border-primary bg-primary/5' : 'border-border hover:border-border-hover'
                  }`}
                >
                  <Database className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-semibold text-text-primary mb-1">MySQL</h3>
                  <p className="text-xs text-text-secondary">Connect to a live governed MySQL database</p>
                </button>
              </div>

              {/* CSV Upload Form */}
              {sourceType === 'csv' && (
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Upload CSV File</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Dataset Name</label>
                      <input
                        type="text"
                        value={csvForm.name}
                        onChange={(e) => setCsvForm({ ...csvForm, name: e.target.value })}
                        placeholder="e.g. sales_transactions"
                        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Select File</label>
                      <div className="border border-dashed border-border rounded p-8 text-center bg-input/10 hover:bg-input/20 transition-all relative">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Upload className="w-8 h-8 text-text-secondary mx-auto mb-2" />
                        <p className="text-xs font-semibold text-text-primary">
                          {csvForm.file ? csvForm.file.name : 'Click or drag CSV file to upload'}
                        </p>
                        {csvForm.file && (
                          <p className="text-[10px] text-text-muted mt-1 font-mono">
                            {(csvForm.file.size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DB Connection Form */}
              {sourceType !== 'csv' && (
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Database Connection</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Dataset Name</label>
                      <input
                        type="text"
                        value={dbForm.name}
                        onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })}
                        placeholder="e.g. core_financial_records"
                        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Host</label>
                      <input
                        type="text"
                        value={dbForm.host}
                        onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })}
                        placeholder="localhost or DB Hostname"
                        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Port</label>
                      <input
                        type="number"
                        value={dbForm.port}
                        onChange={(e) => setDbForm({ ...dbForm, port: parseInt(e.target.value) })}
                        placeholder={sourceType === 'mysql' ? '3306' : '5432'}
                        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Database Name</label>
                      <input
                        type="text"
                        value={dbForm.database}
                        onChange={(e) => setDbForm({ ...dbForm, database: e.target.value })}
                        placeholder="e.g. governance_prod"
                        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Username</label>
                      <input
                        type="text"
                        value={dbForm.username}
                        onChange={(e) => setDbForm({ ...dbForm, username: e.target.value })}
                        placeholder="dbuser"
                        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Password</label>
                      <input
                        type="password"
                        value={dbForm.password}
                        onChange={(e) => setDbForm({ ...dbForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Table Name</label>
                      <input
                        type="text"
                        value={dbForm.table}
                        onChange={(e) => setDbForm({ ...dbForm, table: e.target.value })}
                        placeholder="e.g. employee_salary"
                        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-start">
                    <button
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="px-4 py-2 border border-primary text-primary hover:bg-primary/5 rounded-sm text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {testingConnection ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                      <span>Test Database Connection</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep('configure')}
                  className="px-4 py-2 bg-primary text-white rounded-sm text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Onboard Step 2: Configure Governance */}
          {currentStep === 'configure' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Governance Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Sensitivity Classification</label>
                    <select
                      value={governance.classification}
                      onChange={(e) => setGovernance({ ...governance, classification: e.target.value })}
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary outline-none cursor-pointer"
                    >
                      <option value="public">Public (Unrestricted)</option>
                      <option value="internal">Internal (Company wide)</option>
                      <option value="confidential">Confidential (Restricted)</option>
                      <option value="sensitive">Sensitive (Highly restricted PII)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Data Retention Period</label>
                    <select
                      value={governance.retention}
                      onChange={(e) => setGovernance({ ...governance, retention: e.target.value })}
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary outline-none cursor-pointer"
                    >
                      <option value="1_year">1 Year</option>
                      <option value="3_years">3 Years</option>
                      <option value="5_years">5 Years</option>
                      <option value="permanent">Indefinite/Permanent</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Description</label>
                    <textarea
                      value={governance.description}
                      onChange={(e) => setGovernance({ ...governance, description: e.target.value })}
                      placeholder="Explain the contents and purpose of this dataset..."
                      rows={3}
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted resize-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('source')}
                  className="px-4 py-2 bg-input text-text-primary rounded-sm text-sm font-medium hover:bg-bg-hover transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('review')}
                  className="px-4 py-2 bg-primary text-white rounded-sm text-sm font-semibold hover:bg-primary-hover transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Onboard Step 3: Review & Create */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Review Configuration</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-muted">Source Type:</span>
                      <span className="ml-2 text-text-primary font-medium">{sourceType.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Dataset Name:</span>
                      <span className="ml-2 text-text-primary font-medium">
                        {sourceType === 'csv' ? csvForm.name : dbForm.name}
                      </span>
                    </div>
                    {sourceType !== 'csv' && (
                      <>
                        <div>
                          <span className="text-text-muted">Host:</span>
                          <span className="ml-2 text-text-primary font-medium">{dbForm.host}</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Database:</span>
                          <span className="ml-2 text-text-primary font-medium">{dbForm.database}</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Table:</span>
                          <span className="ml-2 text-text-primary font-medium">{dbForm.table}</span>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-text-muted">Classification:</span>
                      <span className="ml-2 text-text-primary font-medium capitalize">
                        {governance.classification.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Retention:</span>
                      <span className="ml-2 text-text-primary font-medium capitalize">
                        {governance.retention.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {governance.description && (
                    <div>
                      <span className="text-text-muted text-sm">Description:</span>
                      <p className="text-sm text-text-primary mt-1">{governance.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('configure')}
                  className="px-4 py-2 bg-input text-text-primary rounded-sm text-sm font-medium hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={createDataset}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-sm text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Dataset'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create Resource Catalog Modal ────────────────────────────────────── */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false)
            setNewCatName('')
            setNewCatDesc('')
            setNewCatGroups([])
            setTempGroupName('')
            setTempGroupDatasets([])
          }}
          title="Create Resource Catalog"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Catalog Name</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Executive Sales Pack"
                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Description</label>
              <textarea
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Explain the contents and purpose of this catalog package collection..."
                rows={2}
                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted resize-none transition-colors"
              />
            </div>

            {/* Group Addition Form Section */}
            <div className="bg-input/20 border border-border p-4 rounded space-y-3">
              <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-primary" />
                <span>Define Catalog Dataset Group</span>
              </h4>
              
              <div>
                <label className="block text-[10px] font-semibold text-text-secondary mb-1">Group Name</label>
                <input
                  type="text"
                  value={tempGroupName}
                  onChange={(e) => setTempGroupName(e.target.value)}
                  placeholder="e.g. Financial Performance, Customer Demographics"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-text-secondary mb-1">Select Datasets in Group</label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto border border-border p-2 rounded bg-card">
                  {allDatasets.map((ds) => {
                    const isChecked = tempGroupDatasets.includes(ds.name)
                    return (
                      <label
                        key={ds.name}
                        className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setTempGroupDatasets(tempGroupDatasets.filter((n) => n !== ds.name))
                            } else {
                              setTempGroupDatasets([...tempGroupDatasets, ds.name])
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>{ds.name}</span>
                      </label>
                    )
                  })}
                  {allDatasets.length === 0 && (
                    <div className="col-span-2 text-text-muted italic text-[10px] text-center py-2">
                      No onboarded datasets available. Please onboard datasets first.
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!tempGroupName.trim()) {
                    showAlert('error', 'Group Validation', 'Please enter a name for the group.')
                    return
                  }
                  if (tempGroupDatasets.length === 0) {
                    showAlert('error', 'Group Validation', 'Please select at least one dataset for this group.')
                    return
                  }
                  setNewCatGroups([...newCatGroups, { group_name: tempGroupName, datasets: tempGroupDatasets }])
                  setTempGroupName('')
                  setTempGroupDatasets([])
                }}
                className="w-full px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Group to Catalog</span>
              </button>
            </div>

            {/* Added Groups Summary List */}
            <div className="space-y-2 border-t border-border pt-3">
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Catalog Groups ({newCatGroups.length})
              </label>
              {newCatGroups.map((g, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-input/40 p-2.5 rounded border border-border/80"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-text-primary font-mono">{g.group_name}</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {g.datasets.map((d) => (
                        <span
                          key={d}
                          className="px-1.5 py-0.5 bg-primary/15 border border-primary/20 text-primary rounded text-[9px] font-semibold font-mono"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewCatGroups(newCatGroups.filter((_, i) => i !== idx))}
                    className="text-text-secondary hover:text-destructive p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {newCatGroups.length === 0 && (
                <div className="text-center py-4 text-xs text-text-muted border border-dashed border-border rounded">
                  No groups added yet. Create a group above to package your datasets.
                </div>
              )}
            </div>

            {/* Save Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setNewCatName('')
                  setNewCatDesc('')
                  setNewCatGroups([])
                  setTempGroupName('')
                  setTempGroupDatasets([])
                }}
                className="px-4 py-2 text-xs font-semibold text-text-secondary bg-border hover:bg-bg-hover rounded transition-colors active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCatalog}
                disabled={loading || newCatGroups.length === 0}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95 cursor-pointer"
              >
                Save Catalog Package
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV upload progress overlay */}
      {uploadProgress !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-panel border border-border p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 flex flex-col items-center text-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <span className="absolute text-xs font-semibold text-text-primary">{uploadProgress}%</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Uploading Dataset</h3>
              <p className="text-xs text-text-secondary mt-1">
                Please keep this window open while we upload and validate your CSV file.
              </p>
            </div>
            <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-text-secondary">
              {uploadProgress < 100 ? 'Streaming raw chunks...' : 'Validating & onboarding...'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
