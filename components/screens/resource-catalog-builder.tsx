'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, Database, FileText, Upload, CheckCircle, AlertCircle, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { apiFetch } from '@/lib/api'

type DataSourceType = 'csv' | 'postgresql' | 'mysql'
type Step = 'source' | 'configure' | 'review'

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

export function ResourceCatalogBuilder() {
  const [currentStep, setCurrentStep] = useState<Step>('source')
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  // Source selection
  const [sourceType, setSourceType] = useState<DataSourceType>('csv')

  // CSV form
  const [csvForm, setCsvForm] = useState({
    name: '',
    file: null as File | null,
  })

  // DB form
  const [dbForm, setDbForm] = useState({
    name: '',
    host: '',
    port: 5432,
    database: '',
    table: '',
    username: '',
    password: '',
  })

  // Available tables from DB connection
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

        await apiFetch('/datasets/csv/upload', {
          method: 'POST',
          body: formData,
        })
      } else {
        if (!dbForm.name || !dbForm.host || !dbForm.database || !dbForm.table) {
          showAlert('error', 'Validation Error', 'Please fill in all required fields')
          setLoading(false)
          return
        }

        if (!connectionTestResult?.success) {
          showAlert('error', 'Connection Required', 'Please test the database connection first')
          setLoading(false)
          return
        }

        await apiFetch('/datasets/db', {
          method: 'POST',
          body: JSON.stringify({
            name: dbForm.name,
            source_type: sourceType,
            host: dbForm.host,
            port: dbForm.port,
            database: dbForm.database,
            table: dbForm.table,
            username: dbForm.username,
            password: dbForm.password,
          }),
        })
      }

      showAlert('success', 'Dataset Created', 'Your dataset has been successfully registered')
      // Reset form
      setCsvForm({ name: '', file: null })
      setDbForm({ name: '', host: '', port: 5432, database: '', table: '', username: '', password: '' })
      setAvailableTables([])
      setSelectedTables([])
      setCurrentStep('source')
    } catch (error) {
      showAlert('error', 'Creation Failed', error instanceof Error ? error.message : 'Failed to create dataset')
    } finally {
      setLoading(false)
    }
  }

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables(prev =>
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    )
  }

  const addTag = (tag: string) => {
    if (tag && !governance.tags.includes(tag)) {
      setGovernance({ ...governance, tags: [...governance.tags, tag] })
    }
  }

  const removeTag = (tag: string) => {
    setGovernance({ ...governance, tags: governance.tags.filter(t => t !== tag) })
  }

  return (
    <div className="p-6 max-w-6xl">
      <Alert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        duration={4000}
      />

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Create Resource Catalog</h2>
        <p className="text-sm text-text-muted mt-1">
          Register a new dataset from CSV file or database connection
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-8">
        {(['source', 'configure', 'review'] as Step[]).map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
              currentStep === step
                ? 'bg-primary text-white'
                : index < ['source', 'configure', 'review'].indexOf(currentStep)
                ? 'bg-[#6a9955] text-white'
                : 'bg-input text-text-muted'
            }`}>
              {index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              currentStep === step ? 'text-text-primary' : 'text-text-muted'
            }`}>
              {step === 'source' ? 'Data Source' : step === 'configure' ? 'Configure' : 'Review'}
            </span>
            {index < 2 && (
              <div className={`flex-1 h-0.5 ml-4 ${
                index < ['source', 'configure', 'review'].indexOf(currentStep)
                  ? 'bg-[#6a9955]'
                  : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Source Selection Step */}
      {currentStep === 'source' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSourceType('csv')}
              className={`p-6 border rounded-lg transition-all ${
                sourceType === 'csv'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <FileText className={`w-8 h-8 mb-3 ${sourceType === 'csv' ? 'text-primary' : 'text-text-muted'}`} />
              <h3 className="font-semibold text-text-primary mb-1">CSV File</h3>
              <p className="text-xs text-text-muted">Upload a CSV file from your computer</p>
            </button>
            <button
              onClick={() => setSourceType('postgresql')}
              className={`p-6 border rounded-lg transition-all ${
                sourceType === 'postgresql'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Database className={`w-8 h-8 mb-3 ${sourceType === 'postgresql' ? 'text-primary' : 'text-text-muted'}`} />
              <h3 className="font-semibold text-text-primary mb-1">PostgreSQL</h3>
              <p className="text-xs text-text-muted">Connect to a PostgreSQL database</p>
            </button>
            <button
              onClick={() => setSourceType('mysql')}
              className={`p-6 border rounded-lg transition-all ${
                sourceType === 'mysql'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Database className={`w-8 h-8 mb-3 ${sourceType === 'mysql' ? 'text-primary' : 'text-text-muted'}`} />
              <h3 className="font-semibold text-text-primary mb-1">MySQL</h3>
              <p className="text-xs text-text-muted">Connect to a MySQL database</p>
            </button>
          </div>

          {/* CSV Upload Form */}
          {sourceType === 'csv' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Upload CSV File</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Dataset Name *
                  </label>
                  <input
                    type="text"
                    value={csvForm.name}
                    onChange={(e) => setCsvForm({ ...csvForm, name: e.target.value })}
                    placeholder="e.g., sales_data_2024"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    CSV File *
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <Upload className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-sm text-text-primary mb-2">
                      {csvForm.file ? csvForm.file.name : 'Drop your CSV file here or click to browse'}
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-block px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover cursor-pointer transition-colors"
                    >
                      Select File
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Database Connection Form */}
          {sourceType !== 'csv' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Database Connection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Dataset Name *
                  </label>
                  <input
                    type="text"
                    value={dbForm.name}
                    onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })}
                    placeholder="e.g., customer_db"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Host *
                  </label>
                  <input
                    type="text"
                    value={dbForm.host}
                    onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })}
                    placeholder="localhost"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Port *
                  </label>
                  <input
                    type="number"
                    value={dbForm.port}
                    onChange={(e) => setDbForm({ ...dbForm, port: parseInt(e.target.value) })}
                    placeholder={sourceType === 'postgresql' ? '5432' : '3306'}
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Database *
                  </label>
                  <input
                    type="text"
                    value={dbForm.database}
                    onChange={(e) => setDbForm({ ...dbForm, database: e.target.value })}
                    placeholder="database_name"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Table *
                  </label>
                  <input
                    type="text"
                    value={dbForm.table}
                    onChange={(e) => setDbForm({ ...dbForm, table: e.target.value })}
                    placeholder="table_name"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Username
                  </label>
                  <input
                    type="text"
                    value={dbForm.username}
                    onChange={(e) => setDbForm({ ...dbForm, username: e.target.value })}
                    placeholder="db_user"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    value={dbForm.password}
                    onChange={(e) => setDbForm({ ...dbForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="flex items-center gap-2 px-4 py-2 bg-input text-text-primary rounded-sm text-sm font-medium hover:bg-bg-hover disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
                  Test Connection
                </button>
                {connectionTestResult && (
                  <div className={`flex items-center gap-2 text-sm ${
                    connectionTestResult.success ? 'text-[#6a9955]' : 'text-[#f44747]'
                  }`}>
                    {connectionTestResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {connectionTestResult.success ? 'Connection successful' : connectionTestResult.error}
                  </div>
                )}
              </div>

              {availableTables.length > 0 && (
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Available Tables
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableTables.map((table) => (
                      <div
                        key={table.name}
                        className="flex items-center gap-3 p-3 bg-input rounded-sm hover:bg-bg-hover transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTables.includes(table.name)}
                          onChange={() => toggleTableSelection(table.name)}
                          className="w-4 h-4 accent-primary"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-text-primary font-medium">{table.name}</p>
                          <p className="text-xs text-text-muted">{table.schema} • {table.columns} columns</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep('configure')}
              disabled={
                sourceType === 'csv'
                  ? !csvForm.name || !csvForm.file
                  : !dbForm.name || !dbForm.host || !dbForm.database || !dbForm.table || !connectionTestResult?.success
              }
              className="px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Configure Step */}
      {currentStep === 'configure' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Governance Metadata</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Description
                </label>
                <textarea
                  value={governance.description}
                  onChange={(e) => setGovernance({ ...governance, description: e.target.value })}
                  placeholder="Describe the purpose and contents of this dataset..."
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Data Classification
                  </label>
                  <select
                    value={governance.classification}
                    onChange={(e) => setGovernance({ ...governance, classification: e.target.value })}
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                    <option value="confidential">Confidential</option>
                    <option value="restricted_pii">Restricted PII</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Retention Policy
                  </label>
                  <select
                    value={governance.retention}
                    onChange={(e) => setGovernance({ ...governance, retention: e.target.value })}
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="1_year">1 Year</option>
                    <option value="3_years">3 Years</option>
                    <option value="7_years">7 Years</option>
                    <option value="indefinite">Indefinite</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Business Tags
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a tag..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                      className="flex-1 bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add a tag..."]') as HTMLInputElement
                        if (input) {
                          addTag(input.value)
                          input.value = ''
                        }
                      }}
                      className="px-3 py-2 bg-input text-text-primary rounded-sm text-sm font-medium hover:bg-bg-hover transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {governance.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-sm text-xs"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-text-primary"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
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
              className="px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Review Step */}
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
                  <span className="ml-2 text-text-primary font-medium capitalize">{governance.classification.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-text-muted">Retention:</span>
                  <span className="ml-2 text-text-primary font-medium capitalize">{governance.retention.replace('_', ' ')}</span>
                </div>
              </div>
              {governance.tags.length > 0 && (
                <div>
                  <span className="text-text-muted text-sm">Tags:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {governance.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-input rounded text-xs text-text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
              className="px-4 py-2 bg-input text-text-primary rounded-sm text-sm font-medium hover:bg-bg-hover transition-colors"
            >
              Back
            </button>
            <button
              onClick={createDataset}
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2"
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
  )
}
