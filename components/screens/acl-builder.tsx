'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Shield, Users, Database, RefreshCw, Eye, EyeOff, Lock, Unlock, Copy, Edit2, Trash2, Search, X, Filter, ChevronDown, CheckCircle, MoreVertical, CheckCircle2, XCircle, Compass, AlertTriangle, Clock, PlusCircle, Check } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { UserBadge } from '@/components/ui/user-badge'
import { apiFetch } from '@/lib/api'

type TargetType = 'user' | 'team' | 'role'
type ColumnAccess = 'allow' | 'mask' | 'partial' | 'block'
type LogicalOperator = 'AND' | 'OR'
type ComparisonOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_EQUAL' | 'LESS_EQUAL' | 'CONTAINS' | 'STARTS_WITH' | 'IN' | 'NOT_IN'

interface ColumnInfo {
  column_name: string
  data_type: string
}

interface Dataset {
  id: number
  name: string
  source_type: string
  status: string
  schema_fields?: { column_name: string; data_type: string }[]
}

interface User {
  id: number
  username: string
  full_name?: string
  role: string
  status: string
}

interface Team {
  id: number
  name: string
  members?: { user_id: number; username: string }[]
}

interface ColumnAccessConfig {
  column_name: string
  access: ColumnAccess
}

interface RowFilterCondition {
  column: string
  operator: ComparisonOperator
  value: string
}

interface RowFilterGroup {
  logical_operator: LogicalOperator
  conditions: RowFilterCondition[]
}

interface CellMaskRule {
  column: string
  operator: ComparisonOperator
  value: string
  mask_type: 'full' | 'partial' | 'hash'
}

interface AclPolicy {
  id?: number
  version_number?: number
  acl_policy_id?: number
  name: string
  target_type: TargetType
  target_values: string[]
  dataset: string
  column_access: ColumnAccessConfig[]
  row_filters: RowFilterGroup[]
  cell_masks: CellMaskRule[]
  created_at?: string
  status?: 'active' | 'inactive' | 'superseded' | 'draft'
}

export function ACLBuilder() {
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showCreateDatasetModal, setShowCreateDatasetModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<AclPolicy | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'compact'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [detailPolicy, setDetailPolicy] = useState<AclPolicy | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [columnSearch, setColumnSearch] = useState('')
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  })

  // Access Requests & Approval flow state
  const [activeTab, setActiveTab] = useState<'policies' | 'requests'>('policies')
  const [accessRequests, setAccessRequests] = useState<any[]>([])
  const [approvingRequestId, setApprovingRequestId] = useState<number | null>(null)
  const [approvingRequest, setApprovingRequest] = useState<any | null>(null)
  const [validFrom, setValidFrom] = useState<string>('')
  const [validUntil, setValidUntil] = useState<string>('')

  // Conflict review & Version control state
  const [conflicts, setConflicts] = useState<any[]>([])
  const [showConflictModal, setShowConflictModal] = useState(false)

  const handleAutoResolve = (action: any) => {
    if (action.fix_type === 'remove_masked_columns') {
      const colsToRemove = action.columns || []
      setFormState(prev => ({
        ...prev,
        column_access: prev.column_access?.map(c => {
          if (colsToRemove.includes(c.column_name) && c.access === 'allow') {
            return { ...c, access: 'block' } as ColumnAccessConfig
          }
          return c
        }) || []
      }))
      setShowConflictModal(false)
      showAlert('success', 'Resolved Conflict', 'Masked columns blocked in allowed columns list. Ready to deploy.')
    }
  }

  // Data from backend
  const [aclPolicies, setAclPolicies] = useState<AclPolicy[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [datasetColumns, setDatasetColumns] = useState<ColumnInfo[]>([])
  const [datasetPreview, setDatasetPreview] = useState<{ head: any[]; tail: any[]; columns: string[]; row_count: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState<'head' | 'tail'>('head')
  const [rowFiltersActive, setRowFiltersActive] = useState(true)

  // Create/Edit Form State
  const [formState, setFormState] = useState<Partial<AclPolicy>>({
    name: '',
    target_type: 'user',
    target_values: [],
    dataset: '',
    column_access: [],
    row_filters: [],
    cell_masks: [],
  })

  // Search states
  const [userSearch, setUserSearch] = useState('')
  const [datasetSearch, setDatasetSearch] = useState('')
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')
  const [debouncedDatasetSearch, setDebouncedDatasetSearch] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showDatasetDropdown, setShowDatasetDropdown] = useState(false)
  const [copyPolicySearch, setCopyPolicySearch] = useState('')
  const [showCopyDropdown, setShowCopyDropdown] = useState(false)

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearch(userSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  // Debounce dataset search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDatasetSearch(datasetSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [datasetSearch])

  // Sync selectedVersionId when detailPolicy changes
  useEffect(() => {
    if (detailPolicy) {
      setSelectedVersionId(detailPolicy.id || null)
    } else {
      setSelectedVersionId(null)
    }
  }, [detailPolicy])

  // User creation form
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'analyst',
  })

  // Dataset creation form
  const [datasetForm, setDatasetForm] = useState({
    name: '',
    source_type: 'csv',
  })

  const showAlert = (type: typeof alertState.type, title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message })
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [aclPoliciesData, policyHistoryData, datasetsData, usersData, teamsData, requestsList] = await Promise.all([
        apiFetch<any[]>('/acl/policies').catch(() => []),
        apiFetch<any[]>('/policies/history').catch(() => []),
        apiFetch<Dataset[]>('/catalog'),
        apiFetch<User[]>('/users'),
        apiFetch<Team[]>('/teams'),
        apiFetch<any[]>('/access-requests').catch(() => []),
      ])
      
      setAccessRequests(requestsList || [])
      
      const transformedPolicies: AclPolicy[] = []
      
      if (Array.isArray(aclPoliciesData)) {
        aclPoliciesData.forEach((aclVersion: any) => {
          if (aclVersion.dataset) {
            transformedPolicies.push({
              id: aclVersion.id,
              version_number: aclVersion.version_number,
              acl_policy_id: aclVersion.acl_policy_id,
              name: aclVersion.policy_name || `ACL Policy - ${aclVersion.dataset}`,
              target_type: aclVersion.target_type,
              target_values: aclVersion.target_values,
              dataset: aclVersion.dataset,
              column_access: aclVersion.column_access || [],
              row_filters: aclVersion.row_filters || [],
              cell_masks: aclVersion.cell_masks || [],
              created_at: aclVersion.created_at,
              status: aclVersion.status,
            })
            return
          }

          // Find matching policy version by status or created_at (closest timestamp)
          let matchedPolicyVersion: any = null
          if (Array.isArray(policyHistoryData)) {
            const aclTime = new Date(aclVersion.created_at).getTime()
            matchedPolicyVersion = policyHistoryData.find(pv => {
              const pvTime = new Date(pv.created_at).getTime()
              return Math.abs(aclTime - pvTime) < 5000
            })
            if (!matchedPolicyVersion) {
              matchedPolicyVersion = policyHistoryData.find(pv => pv.status === aclVersion.status)
            }
          }

          if (aclVersion.entries && Array.isArray(aclVersion.entries)) {
            const datasetGroups: { [key: string]: any[] } = {}
            aclVersion.entries.forEach((entry: any) => {
              const key = entry.dataset_name
              if (!datasetGroups[key]) {
                datasetGroups[key] = []
              }
              datasetGroups[key].push(entry)
            })
            
            Object.entries(datasetGroups).forEach(([datasetName, entries]) => {
              const matchedPolicies = matchedPolicyVersion?.policies?.filter(
                (p: any) => p.dataset_name === datasetName
              ) || []

              const rowFilters: RowFilterGroup[] = []
              const cellMasks: CellMaskRule[] = []
              let policyName = `ACL Policy - ${datasetName}`
              let targetType: TargetType = 'user'
              let targetValues: string[] = entries.map((e: any) => e.username)

              if (matchedPolicies.length > 0) {
                policyName = matchedPolicies[0].name.replace(/_\d+$/, '')
                targetType = matchedPolicies[0].target_type as TargetType
                targetValues = matchedPolicies.map((p: any) => p.target_value)

                matchedPolicies.forEach((p: any) => {
                  (p.rules || []).forEach((r: any) => {
                    if (r.rule_type === 'row_filter' && r.rule.condition) {
                      const cond = r.rule.condition
                      if (cond.operator) {
                        const logicalOperator = (cond.operator || 'AND').toUpperCase() as LogicalOperator
                        const conditions = (cond.conditions || []).map((c: any) => ({
                          column: c.column || '',
                          operator: ((c.op || 'eq').toUpperCase() === 'EQ' ? 'EQUALS' :
                                    (c.op || 'eq').toUpperCase() === 'NE' ? 'NOT_EQUALS' :
                                    (c.op || 'eq').toUpperCase() === 'GT' ? 'GREATER_THAN' :
                                    (c.op || 'eq').toUpperCase() === 'LT' ? 'LESS_THAN' :
                                    (c.op || 'eq').toUpperCase() === 'GTE' ? 'GREATER_EQUAL' :
                                    (c.op || 'eq').toUpperCase() === 'LTE' ? 'LESS_EQUAL' :
                                    (c.op || 'eq').toUpperCase() === 'IN' ? 'IN' : 'NOT_IN') as ComparisonOperator,
                          value: String(c.value !== undefined ? c.value : ''),
                        }))
                        const exists = rowFilters.some(
                          rf => rf.logical_operator === logicalOperator &&
                          JSON.stringify(rf.conditions) === JSON.stringify(conditions)
                        )
                        if (!exists) {
                          rowFilters.push({ logical_operator: logicalOperator, conditions })
                        }
                      } else if (cond.column) {
                        const conditions = [{
                          column: cond.column || '',
                          operator: ((cond.op || 'eq').toUpperCase() === 'EQ' ? 'EQUALS' :
                                    (cond.op || 'eq').toUpperCase() === 'NE' ? 'NOT_EQUALS' :
                                    (cond.op || 'eq').toUpperCase() === 'GT' ? 'GREATER_THAN' :
                                    (cond.op || 'eq').toUpperCase() === 'LT' ? 'LESS_THAN' :
                                    (cond.op || 'eq').toUpperCase() === 'GTE' ? 'GREATER_EQUAL' :
                                    (cond.op || 'eq').toUpperCase() === 'LTE' ? 'LESS_EQUAL' :
                                    (cond.op || 'eq').toUpperCase() === 'IN' ? 'IN' : 'NOT_IN') as ComparisonOperator,
                          value: String(cond.value !== undefined ? cond.value : ''),
                        }]
                        const exists = rowFilters.some(
                          rf => rf.logical_operator === 'AND' &&
                          JSON.stringify(rf.conditions) === JSON.stringify(conditions)
                        )
                        if (!exists) {
                          rowFilters.push({ logical_operator: 'AND', conditions })
                        }
                      }
                    } else if (r.rule_type === 'cell_mask' && r.rule.column && r.rule.show_when) {
                      const showWhen = r.rule.show_when
                      const cellMask: CellMaskRule = {
                        column: r.rule.column,
                        operator: (showWhen.op || 'eq').toUpperCase() === 'EQ' ? 'EQUALS' :
                                  (showWhen.op || 'eq').toUpperCase() === 'NE' ? 'NOT_EQUALS' :
                                  (showWhen.op || 'eq').toUpperCase() === 'GT' ? 'GREATER_THAN' :
                                  (showWhen.op || 'eq').toUpperCase() === 'LT' ? 'LESS_THAN' :
                                  (showWhen.op || 'eq').toUpperCase() === 'GTE' ? 'GREATER_EQUAL' :
                                  (showWhen.op || 'eq').toUpperCase() === 'LTE' ? 'LESS_EQUAL' :
                                  (showWhen.op || 'eq').toUpperCase() === 'IN' ? 'IN' : 'NOT_IN',
                        value: String(showWhen.value !== undefined ? showWhen.value : ''),
                        mask_type: 'full',
                      }
                      const exists = cellMasks.some(
                        cm => cm.column === cellMask.column &&
                        cm.operator === cellMask.operator &&
                        cm.value === cellMask.value
                      )
                      if (!exists) {
                        cellMasks.push(cellMask)
                      }
                    }
                  })
                })
              }

              const columnsAccessMap: { [col: string]: ColumnAccess } = {}
              entries.forEach((e: any) => {
                (e.allowed_columns || []).forEach((col: string) => {
                  columnsAccessMap[col] = 'allow'
                })
              })

              matchedPolicies.forEach((p: any) => {
                (p.rules || []).forEach((r: any) => {
                  if (r.rule_type === 'column_mask') {
                    (r.rule.columns || []).forEach((col: string) => {
                      columnsAccessMap[col] = 'mask'
                    })
                  }
                })
              })

              const matchedDataset = datasetsData.find((d: any) => d.name === datasetName)
              const schemaFields = matchedDataset?.schema_fields || []
              
              const columnAccess: ColumnAccessConfig[] = schemaFields.map((f: any) => {
                const colName = f.column_name
                const access = columnsAccessMap[colName] || 'block'
                return { column_name: colName, access }
              })

              if (columnAccess.length === 0) {
                Object.entries(columnsAccessMap).forEach(([colName, access]) => {
                  columnAccess.push({ column_name: colName, access })
                })
              }

              transformedPolicies.push({
                id: aclVersion.id,
                version_number: aclVersion.version_number,
                acl_policy_id: aclVersion.acl_policy_id,
                name: policyName,
                target_type: targetType,
                target_values: targetValues,
                dataset: datasetName,
                column_access: columnAccess,
                row_filters: rowFilters,
                cell_masks: cellMasks,
                created_at: aclVersion.created_at,
                status: aclVersion.status,
              })
            })
          }
        })
      }
      
      setAclPolicies(transformedPolicies)
      setDatasets(datasetsData)
      setUsers(usersData)
      setTeams(teamsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDatasetColumns = async (datasetName: string, existingAccess?: ColumnAccessConfig[]) => {
    try {
      const catalog = await apiFetch<{ schema_fields: ColumnInfo[] }>(`/catalog/${datasetName}`)
      setDatasetColumns(catalog.schema_fields || [])
      setFormState(prev => {
        const columns = catalog.schema_fields || []
        const column_access = columns.map(col => {
          const existing = existingAccess?.find(c => c.column_name === col.column_name)
          if (existing) {
            return { column_name: col.column_name, access: existing.access }
          }
          return { column_name: col.column_name, access: 'allow' as ColumnAccess }
        })
        return { ...prev, column_access }
      })
    } catch (error) {
      console.error('Failed to fetch dataset columns:', error)
      setDatasetColumns([])
    }
  }

  const fetchDatasetPreview = async (datasetName: string, state = formState) => {
    try {
      setPreviewLoading(true)
      setDatasetPreview(null)
      const preview = await apiFetch<{ head: any[]; tail: any[]; columns: string[]; row_count: number }>(
        `/catalog/${datasetName}/preview?head_rows=5&tail_rows=5`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_type: state.target_type || 'user',
            target_values: state.target_values || [],
            column_access: state.column_access || [],
            row_filters: state.row_filters || [],
            cell_masks: state.cell_masks || [],
          })
        }
      )
      setDatasetPreview(preview)
    } catch (error) {
      console.error('Failed to fetch dataset preview:', error)
      setDatasetPreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (formState.dataset) {
      fetchDatasetColumns(formState.dataset, formState.column_access)
      fetchDatasetPreview(formState.dataset, formState)
    }
  }, [formState.dataset])

  useEffect(() => {
    if (formState.dataset) {
      const timer = setTimeout(() => {
        fetchDatasetPreview(formState.dataset, formState)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [
    formState.column_access,
    formState.row_filters,
    formState.cell_masks,
    formState.target_type,
    formState.target_values
  ])

  const openCreateModal = () => {
    setEditingPolicy(null)
    setFormState({
      name: '',
      target_type: 'user',
      target_values: [],
      dataset: '',
      column_access: [],
      row_filters: [],
      cell_masks: [],
    })
    setDatasetColumns([])
    setDatasetPreview(null)
    setShowCreateModal(true)
  }

  const openEditModal = (policy: AclPolicy) => {
    setEditingPolicy(policy)
    setFormState({ ...policy })
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setEditingPolicy(null)
    setApprovingRequestId(null)
    setApprovingRequest(null)
    setValidFrom('')
    setValidUntil('')
    setFormState({
      name: '',
      target_type: 'user',
      target_values: [],
      dataset: '',
      column_access: [],
      row_filters: [],
      cell_masks: [],
    })
    setDatasetColumns([])
    setDatasetPreview(null)
  }

  const handleApproveRequestClick = async (req: any) => {
    setApprovingRequestId(req.id)
    setApprovingRequest(req)
    
    // Default 1-year window for approval
    setValidFrom(new Date().toISOString().slice(0, 16))
    setValidUntil(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16))

    // Find if there is an existing policy for this user and dataset
    const existingPolicy = aclPolicies.find(
      p => p.dataset === req.dataset_name &&
           p.target_type === 'user' &&
           p.target_values.includes(req.username)
    )

    let initForm: Partial<AclPolicy>
    if (existingPolicy) {
      setEditingPolicy(existingPolicy)
      initForm = JSON.parse(JSON.stringify(existingPolicy)) // Deep copy
    } else {
      initForm = {
        name: `Policy for ${req.username} - ${req.dataset_name}`,
        target_type: 'user',
        target_values: [req.username],
        dataset: req.dataset_name,
        column_access: [],
        row_filters: [],
        cell_masks: [],
      }
    }
    
    setFormState(initForm)
    setShowCreateModal(true)

    try {
      const catalog = await apiFetch<{ schema_fields: ColumnInfo[] }>(`/catalog/${req.dataset_name}`)
      const columns = catalog.schema_fields || []
      setDatasetColumns(columns)
      
      setFormState(prev => {
        // Merge with existing column access or build default
        const existingMap = new Map((prev.column_access || []).map(c => [c.column_name, c.access]))
        const column_access = columns.map(col => {
          let access = existingMap.get(col.column_name) || 'block'
          // If the column is explicitly requested, grant access ('allow')
          if (req.requested_columns.includes(col.column_name)) {
            access = 'allow'
          }
          return {
            column_name: col.column_name,
            access: access as any
          }
        })
        return { ...prev, column_access }
      })
      fetchDatasetPreview(req.dataset_name)
    } catch (error) {
      console.error('Failed to load dataset metadata for approval:', error)
    }
  }

  const handleRejectRequest = async (id: number) => {
    const reason = prompt("Enter a rejection reason (optional):")
    if (reason === null) return
    try {
      await apiFetch(`/access-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: reason || undefined })
      })
      showAlert('success', 'Rejected', 'Access request rejected.')
      fetchData()
      window.dispatchEvent(new Event('dep_access_requests_updated'))
    } catch (e: any) {
      showAlert('error', 'Rejection Failed', e.message || 'Could not reject request.')
    }
  }

  const updateColumnAccess = (columnName: string, access: ColumnAccess) => {
    setFormState(prev => ({
      ...prev,
      column_access: prev.column_access?.map(c =>
        c.column_name === columnName ? { ...c, access } : c
      ) || [],
    }))
  }

  const addRowFilterGroup = () => {
    setFormState(prev => ({
      ...prev,
      row_filters: [
        ...(prev.row_filters || []),
        { logical_operator: 'AND', conditions: [] },
      ],
    }))
  }

  const addRowFilterCondition = (groupIndex: number) => {
    setFormState(prev => {
      const newFilters = [...(prev.row_filters || [])]
      newFilters[groupIndex].conditions.push({
        column: '',
        operator: 'EQUALS',
        value: '',
      })
      return { ...prev, row_filters: newFilters }
    })
  }

  const updateRowFilterCondition = (groupIndex: number, conditionIndex: number, field: keyof RowFilterCondition, value: string) => {
    setFormState(prev => {
      const newFilters = [...(prev.row_filters || [])]
      newFilters[groupIndex].conditions[conditionIndex] = {
        ...newFilters[groupIndex].conditions[conditionIndex],
        [field]: value,
      }
      return { ...prev, row_filters: newFilters }
    })
  }

  const removeRowFilterCondition = (groupIndex: number, conditionIndex: number) => {
    setFormState(prev => {
      const newFilters = [...(prev.row_filters || [])]
      newFilters[groupIndex].conditions = newFilters[groupIndex].conditions.filter(
        (_, i) => i !== conditionIndex
      )
      return { ...prev, row_filters: newFilters }
    })
  }

  const removeRowFilterGroup = (groupIndex: number) => {
    setFormState(prev => ({
      ...prev,
      row_filters: prev.row_filters?.filter((_, i) => i !== groupIndex) || [],
    }))
  }

  const addCellMask = () => {
    setFormState(prev => ({
      ...prev,
      cell_masks: [
        ...(prev.cell_masks || []),
        { column: '', operator: 'EQUALS', value: '', mask_type: 'full' },
      ],
    }))
  }

  const updateCellMask = (index: number, field: keyof CellMaskRule, value: string) => {
    setFormState(prev => {
      const newMasks = [...(prev.cell_masks || [])]
      newMasks[index] = { ...newMasks[index], [field]: value }
      return { ...prev, cell_masks: newMasks }
    })
  }

  const removeCellMask = (index: number) => {
    setFormState(prev => ({
      ...prev,
      cell_masks: prev.cell_masks?.filter((_, i) => i !== index) || [],
    }))
  }

  const mapOperator = (op: ComparisonOperator): string => {
    switch (op) {
      case 'EQUALS': return 'eq'
      case 'NOT_EQUALS': return 'ne'
      case 'GREATER_THAN': return 'gt'
      case 'LESS_THAN': return 'lt'
      case 'GREATER_EQUAL': return 'gte'
      case 'LESS_EQUAL': return 'lte'
      case 'IN': return 'in'
      case 'NOT_IN': return 'not_in'
      default: return 'eq'
    }
  }

  const compileAclYaml = (form: Partial<AclPolicy>, usersList: User[], teamsList: Team[]): string => {
    let y = "entries:\n"
    const added = new Set<string>()
    const dataset = form.dataset || ""
    const allowedCols = form.column_access?.filter(c => c.access !== 'block').map(c => c.column_name) || []

    const writeEntry = (user: string) => {
      const key = `${user}:${dataset}`
      if (added.has(key)) return
      added.add(key)

      y += `  - user: "${user}"\n`
      y += `    dataset: "${dataset}"\n`
      const cols = allowedCols.map(c => `"${c}"`).join(", ")
      y += `    columns: [${cols}]\n`
    }

    if (form.target_type === "user") {
      form.target_values?.forEach(user => writeEntry(user))
    } else if (form.target_type === "role") {
      form.target_values?.forEach(role => {
        usersList
          .filter(u => u.role === role)
          .forEach(u => writeEntry(u.username))
      })
    } else if (form.target_type === "team") {
      form.target_values?.forEach(teamName => {
        const team = teamsList.find(t => t.name === teamName)
        if (team && team.members) {
          team.members.forEach(m => writeEntry(m.username))
        }
      })
    }

    return y
  }

  const compilePolicyYaml = (form: Partial<AclPolicy>): string => {
    let y = "policies:\n"
    const targetType = form.target_type || "user"
    const dataset = form.dataset || ""
    const name = form.name || `policy_${targetType}_${dataset.replace(/[^a-zA-Z0-9]/g, "_")}`
    
    const columnMasks = form.column_access?.filter(c => c.access === 'mask').map(c => c.column_name) || []
    const hasRules = columnMasks.length > 0 || (form.row_filters && form.row_filters.length > 0) || (form.cell_masks && form.cell_masks.length > 0)
    
    if (!hasRules) {
      y += `  - name: "${name}"\n`
      y += `    target:\n`
      y += `      type: "${targetType}"\n`
      y += `      value: "${form.target_values?.[0] || 'all'}"\n`
      y += `    resource:\n`
      y += `      dataset: "${dataset}"\n`
      y += `    priority: 10\n`
      y += `    rules: []\n`
      return y
    }

    form.target_values?.forEach((targetVal, idx) => {
      y += `  - name: "${name}_${idx}"\n`
      y += `    target:\n`
      y += `      type: "${targetType}"\n`
      y += `      value: "${targetVal}"\n`
      y += `    resource:\n`
      y += `      dataset: "${dataset}"\n`
      y += `    priority: ${10 + idx}\n`
      y += `    rules:\n`

      if (columnMasks.length > 0) {
        y += `      - type: "column_mask"\n`
        const cols = columnMasks.map(c => `"${c}"`).join(", ")
        y += `        columns: [${cols}]\n`
      }

      form.row_filters?.forEach(rfGroup => {
        if (rfGroup.conditions && rfGroup.conditions.length > 0) {
          y += `      - type: "row_filter"\n`
          y += `        condition:\n`
          
          if (rfGroup.conditions.length === 1) {
            const cond = rfGroup.conditions[0]
            y += `          column: "${cond.column}"\n`
            y += `          op: "${mapOperator(cond.operator)}"\n`
            const isNumeric = !isNaN(Number(cond.value)) && String(cond.value).trim() !== ""
            const val = isNumeric ? cond.value : `"${cond.value}"`
            y += `          value: ${val}\n`
          } else {
            y += `          operator: "${rfGroup.logical_operator.toLowerCase()}"\n`
            y += `          conditions:\n`
            rfGroup.conditions.forEach(cond => {
              y += `            - column: "${cond.column}"\n`
              y += `              op: "${mapOperator(cond.operator)}"\n`
              const isNumeric = !isNaN(Number(cond.value)) && String(cond.value).trim() !== ""
              const val = isNumeric ? cond.value : `"${cond.value}"`
              y += `              value: ${val}\n`
            })
          }
        }
      })

      form.cell_masks?.forEach(cm => {
        y += `      - type: "cell_mask"\n`
        y += `        column: "${cm.column}"\n`
        y += `        show_when:\n`
        y += `          column: "${cm.column}"\n`
        y += `          op: "${mapOperator(cm.operator)}"\n`
        const isNumeric = !isNaN(Number(cm.value)) && String(cm.value).trim() !== ""
        const val = isNumeric ? cm.value : `"${cm.value}"`
        y += `          value: ${val}\n`
      })
    })

    return y
  }

  const generateYaml = () => {
    const aclYaml = compileAclYaml(formState, users, teams)
    const policyYaml = compilePolicyYaml(formState)
    return `# === ACL CONFIG ===\n${aclYaml}\n# === POLICY CONFIG ===\n${policyYaml}`
  }

  const copyYamlToClipboard = () => {
    const yaml = generateYaml()
    navigator.clipboard.writeText(yaml)
    showAlert('success', 'Copied', 'YAML copied to clipboard')
  }

  const deployAcl = async (bypassConflicts = false) => {
    setDeploying(true)
    try {
      const aclYaml = compileAclYaml(formState, users, teams)
      const policyYaml = compilePolicyYaml(formState)

      if (!bypassConflicts) {
        const checkRes = await apiFetch<{ has_conflicts: boolean; conflicts: any[] }>('/acl/check-conflicts', {
          method: 'POST',
          body: JSON.stringify({ acl_yaml: aclYaml, policy_yaml: policyYaml })
        })
        if (checkRes.has_conflicts) {
          setConflicts(checkRes.conflicts)
          setShowConflictModal(true)
          setDeploying(false)
          return
        }
      }

      const payload = {
        name: formState.name || `policy_${formState.target_type}_${(formState.dataset || '').replace(/[^a-zA-Z0-9]/g, '_')}`,
        target_type: formState.target_type,
        target_values: formState.target_values,
        dataset: formState.dataset,
        column_access: formState.column_access || [],
        row_filters: formState.row_filters || [],
        cell_masks: formState.cell_masks || [],
      }

      if (!bypassConflicts) {
        const checkRes = await apiFetch<{ has_conflicts: boolean; conflicts: any[] }>('/acl/check-conflicts', {
          method: 'POST',
          body: JSON.stringify({ acl_yaml: aclYaml, policy_yaml: policyYaml })
        }).catch(() => ({ has_conflicts: false, conflicts: [] }))
        if (checkRes.has_conflicts) {
          setConflicts(checkRes.conflicts)
          setShowConflictModal(true)
          setDeploying(false)
          return
        }
      }

      const policyId = editingPolicy?.acl_policy_id
      const url = policyId 
        ? `/acl/named-policies/${policyId}/deploy-json`
        : `/acl/deploy-json`

      await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (approvingRequestId) {
        await apiFetch(`/access-requests/${approvingRequestId}/approve`, {
          method: 'POST',
          body: JSON.stringify({
            granted_columns: formState.column_access?.filter(c => c.access !== 'block').map(c => c.column_name) || [],
            valid_from: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
            valid_until: validUntil ? new Date(validUntil).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
        })
        setApprovingRequestId(null)
        setApprovingRequest(null)
        setValidFrom('')
        setValidUntil('')
        window.dispatchEvent(new Event('dep_access_requests_updated'))
      }
      
      showAlert('success', 'ACL & Policies Deployed', 'ACL and policies have been successfully deployed')
      closeCreateModal()
      fetchData()
    } catch (error) {
      showAlert('error', 'Deployment Failed', error instanceof Error ? error.message : 'Failed to deploy ACL')
    } finally {
      setDeploying(false)
    }
  }

  const deleteAcl = async (id: number) => {
    try {
      await apiFetch(`/acl/policies/${id}`, { method: 'DELETE' })
      showAlert('success', 'ACL Deleted', 'ACL policy has been deleted')
      fetchData()
    } catch (error) {
      showAlert('error', 'Deletion Failed', error instanceof Error ? error.message : 'Failed to delete ACL')
    }
  }

  const toggleAclStatus = async (id: number, newStatus: 'active' | 'superseded') => {
    try {
      await apiFetch(`/acl/policies/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      showAlert('success',
        newStatus === 'active' ? 'Policy Activated' : 'Policy Deactivated',
        newStatus === 'active' ? 'ACL policy is now active.' : 'ACL policy has been deactivated.'
      )
      fetchData()
    } catch (error) {
      showAlert('error', 'Status Update Failed', error instanceof Error ? error.message : 'Failed to update status')
    }
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredDatasets = datasets.filter(d =>
    d.name.toLowerCase().includes(datasetSearch.toLowerCase())
  )

  const getPreviewValue = (value: any, columnName: string, row?: any) => {
    const adaptiveMask = (v: any) => {
      if (v === null || v === undefined) return ''
      const val = String(v)
      if (val.trim() === '' || val.toLowerCase() === 'none' || val.toLowerCase() === 'nan') return val
      const length = val.length
      if (length <= 3) {
        return val[0] + '*'.repeat(length - 1)
      } else if (length <= 7) {
        return val[0] + '*'.repeat(length - 2) + val[length - 1]
      } else {
        return val.substring(0, 2) + '*'.repeat(length - 4) + val.substring(length - 2)
      }
    }

    const columnAccess = formState.column_access?.find(c => c.column_name === columnName)
    if (columnAccess) {
      if (columnAccess.access === 'block') return '—'
      if (columnAccess.access === 'mask') return '***'
      if (columnAccess.access === 'partial') return adaptiveMask(value)
    }
    
    // Check cell masks
    const cellMasks = formState.cell_masks?.filter(cm => cm.column === columnName) || []
    for (const cm of cellMasks) {
      const condCol = cm.column
      const condVal = row ? row[condCol] : undefined
      if (condVal !== undefined) {
        let matches = false
        const op = cm.operator
        const cv = String(cm.value).trim().toLowerCase()
        const rv = String(condVal).trim().toLowerCase()
        
        const rvNum = Number(rv)
        const cvNum = Number(cv)
        const isNumeric = !isNaN(rvNum) && !isNaN(cvNum)
        
        if (op === 'EQUALS') matches = isNumeric ? rvNum === cvNum : rv === cv
        else if (op === 'NOT_EQUALS') matches = isNumeric ? rvNum !== cvNum : rv !== cv
        else if (op === 'GREATER_THAN') matches = isNumeric ? rvNum > cvNum : rv > cv
        else if (op === 'LESS_THAN') matches = isNumeric ? rvNum < cvNum : rv < cv
        else if (op === 'GREATER_EQUAL') matches = isNumeric ? rvNum >= cvNum : rv >= cv
        else if (op === 'LESS_EQUAL') matches = isNumeric ? rvNum <= cvNum : rv <= cv
        else if (op === 'IN') {
          const items = cv.split(',').map(i => i.trim())
          matches = items.includes(rv)
        } else if (op === 'NOT_IN') {
          const items = cv.split(',').map(i => i.trim())
          matches = !items.includes(rv)
        }
        
        if (!matches) { // show_when = True, so mask when not matched
          if (cm.mask_type === 'full') return '***'
          if (cm.mask_type === 'partial') return adaptiveMask(value)
          if (cm.mask_type === 'hash') return '••••'
        }
      }
    }
    
    return value
  }

  const applyRowFilters = (row: any) => {
    if (!rowFiltersActive) return true
    if (!formState.row_filters || formState.row_filters.length === 0) return true
    
    return formState.row_filters.every(group => {
      const { logical_operator, conditions } = group
      if (!conditions || conditions.length === 0) return true
      
      const evalCondition = (cond: RowFilterCondition) => {
        if (!cond.column) return true
        const cellValue = row[cond.column]
        if (cellValue === undefined || cellValue === null) return false
        
        const cellStr = String(cellValue).toLowerCase()
        const condStr = String(cond.value || '').toLowerCase()
        
        switch (cond.operator) {
          case 'EQUALS':
            return cellStr === condStr
          case 'NOT_EQUALS':
            return cellStr !== condStr
          case 'GREATER_THAN':
            return Number(cellValue) > Number(cond.value)
          case 'LESS_THAN':
            return Number(cellValue) < Number(cond.value)
          case 'GREATER_EQUAL':
            return Number(cellValue) >= Number(cond.value)
          case 'LESS_EQUAL':
            return Number(cellValue) <= Number(cond.value)
          case 'CONTAINS':
            return cellStr.includes(condStr)
          case 'STARTS_WITH':
            return cellStr.startsWith(condStr)
          case 'IN': {
            const list = (cond.value || '').split(',').map(s => s.trim().toLowerCase())
            return list.includes(cellStr)
          }
          case 'NOT_IN': {
            const list = (cond.value || '').split(',').map(s => s.trim().toLowerCase())
            return !list.includes(cellStr)
          }
          default:
            return true
        }
      }
      
      if (logical_operator === 'AND') {
        return conditions.every(evalCondition)
      } else {
        return conditions.some(evalCondition)
      }
    })
  }

  return (
    <div className="p-6 max-w-full">
      <Alert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        duration={4000}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Access Control Policies</h2>
            <p className="text-sm text-text-muted mt-1">
              Manage ACL policies for data access governance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded hover:bg-bg-hover text-text-muted disabled:opacity-40 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create ACL
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'policies'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Shield className="w-4 h-4 text-primary" />
          <span>Governance Policies ({aclPolicies.filter(p => p.status === 'active').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 relative ${
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Compass className="w-4 h-4 text-success" />
          <span>Access Requests ({accessRequests.length})</span>
          {accessRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#f44747] text-white rounded-full">
              {accessRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'policies' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            placeholder="Search policies, datasets…"
            className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Superseded</option>
        </select>

        {/* Active Version Label */}
        {(() => {
          const actVer = aclPolicies.find(p => p.status === 'active')
          return actVer ? (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#6a9955]/10 text-[#6a9955] border border-[#6a9955]/20 rounded-lg text-xs font-semibold flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active Version: v{actVer.version_number || actVer.id}</span>
            </div>
          ) : null
        })()}

        {/* View switcher */}
        <div className="flex items-center bg-input border border-border rounded-lg p-0.5 gap-0.5 flex-shrink-0">
          {(['table', 'grid', 'compact'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all capitalize ${
                viewMode === mode ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (() => {
        const filteredPolicies = aclPolicies.filter(p => {
          if (p.status !== 'active') return false
          const matchQ = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.dataset?.toLowerCase().includes(searchQuery.toLowerCase())
          return matchQ
        })
        return (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-lg mb-3">
            <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <button
              onClick={() => {
                setSelectedIds(new Set(filteredPolicies.map(p => p.id!).filter(Boolean)))
              }}
              className="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-bg-hover"
            >
              Select all ({filteredPolicies.length})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-bg-hover"
            >
              Clear
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={async () => {
                for (const id of selectedIds) { try { await deleteAcl(id) } catch {} }
                setSelectedIds(new Set())
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#f44747]/10 text-[#f44747] border border-[#f44747]/30 rounded hover:bg-[#f44747]/20 transition-colors font-medium"
            >
              <Trash2 className="w-3 h-3" /> Delete selected
            </button>
          </div>
        )
      })()}

      {/* ACL Policies List */}
      {(() => {
        const filteredPolicies = aclPolicies.filter(p => {
          if (p.status !== 'active') return false
          const matchQ = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.dataset?.toLowerCase().includes(searchQuery.toLowerCase())
          return matchQ
        })
        const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / pageSize))
        const pagePolicies = filteredPolicies.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        const allOnPageSelected = pagePolicies.length > 0 && pagePolicies.every(p => selectedIds.has(p.id!))

        const toggleSelect = (id: number) => {
          setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
          })
        }

        const colBadge = (col: ColumnAccessConfig) => (
          <span
            key={col.column_name}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
              col.access === 'allow'   ? 'bg-[#6a9955]/10 text-[#6a9955] border-[#6a9955]/20'
              : col.access === 'mask'    ? 'bg-[#ce9178]/10 text-[#ce9178] border-[#ce9178]/20'
              : col.access === 'partial' ? 'bg-[#569cd6]/10 text-[#569cd6] border-[#569cd6]/20'
              : 'bg-[#f44747]/10 text-[#f44747] border-[#f44747]/20'
            }`}
          >
            {col.column_name}
          </span>
        )

        const statusLabel = (s?: string) => {
          if (s === 'active') return 'Active'
          if (s === 'superseded') return 'Inactive'
          if (s === 'draft') return 'Draft'
          return 'Active'
        }

        const statusPill = (policy: AclPolicy) => (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 tracking-wide ${
            policy.status === 'active'
              ? 'bg-[#6a9955]/15 text-[#6a9955] border border-[#6a9955]/20'
              : policy.status === 'draft'
              ? 'bg-[#569cd6]/15 text-[#569cd6] border border-[#569cd6]/20'
              : 'bg-text-muted/10 text-text-muted border border-border'
          }`}>
            {statusLabel(policy.status)}
          </span>
        )

        const rowActions = (policy: AclPolicy) => {
          const isOpen = openMenuId === `${policy.id}-${policy.dataset}`
          return (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={e => {
                  e.stopPropagation()
                  if (isOpen) {
                    setOpenMenuId(null)
                    setMenuPosition(null)
                  } else {
                    setOpenMenuId(`${policy.id}-${policy.dataset}`)
                    const rect = e.currentTarget.getBoundingClientRect()
                    setMenuPosition({
                      top: rect.bottom + 4,
                      left: rect.right - 176, // 176px is the width of the dropdown (w-44)
                    })
                  }
                }}
                className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                title="Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isOpen && menuPosition && createPortal(
                <>
                  {/* Click-away overlay */}
                  <div className="fixed inset-0 z-[9999]" onClick={() => { setOpenMenuId(null); setMenuPosition(null); }} />
                  <div
                    style={{
                      position: 'fixed',
                      top: `${menuPosition.top}px`,
                      left: `${menuPosition.left}px`,
                    }}
                    className="z-[10000] w-44 bg-card border border-border rounded-lg shadow-xl overflow-hidden py-1"
                  >
                    {/* View */}
                    <button
                      onClick={() => { setOpenMenuId(null); setMenuPosition(null); setDetailPolicy(policy) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-text-muted" /> View details
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => { setOpenMenuId(null); setMenuPosition(null); openEditModal(policy) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-text-muted" /> Edit
                    </button>

                    <div className="my-1 border-t border-border" />

                    {/* Activate / Deactivate */}
                    {policy.status !== 'active' ? (
                      <button
                        onClick={() => { setOpenMenuId(null); setMenuPosition(null); policy.id && toggleAclStatus(policy.id, 'active') }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#6a9955] hover:bg-[#6a9955]/10 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => { setOpenMenuId(null); setMenuPosition(null); policy.id && toggleAclStatus(policy.id, 'superseded') }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:bg-bg-hover transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    )}

                    <div className="my-1 border-t border-border" />

                    {/* Delete */}
                    <button
                      onClick={() => { setOpenMenuId(null); setMenuPosition(null); policy.id && deleteAcl(policy.id) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#f44747] hover:bg-[#f44747]/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>     ,
                document.body
              )}
            </div>
          )
        }


        if (filteredPolicies.length === 0) return (
          <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
            <Shield className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-semibold text-text-primary mb-1">{searchQuery || statusFilter !== 'all' ? 'No results' : 'No ACL Policies'}</h3>
            <p className="text-xs text-text-muted mb-3">{searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first ACL policy to govern data access'}</p>
            {!searchQuery && statusFilter === 'all' && (
              <button onClick={openCreateModal} className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-hover transition-colors">Create ACL</button>
            )}
          </div>
        )

        return (
          <>
            {/* ── TABLE view ─────────────────────────────────────── */}
            {viewMode === 'table' && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-input border-b border-border">
                        <th className="p-3 w-8">
                          <input type="checkbox" checked={allOnPageSelected}
                            onChange={() => {
                              if (allOnPageSelected) setSelectedIds(prev => { const n = new Set(prev); pagePolicies.forEach(p => n.delete(p.id!)); return n })
                              else setSelectedIds(prev => { const n = new Set(prev); pagePolicies.forEach(p => p.id && n.add(p.id)); return n })
                            }}
                            className="rounded border-border bg-input accent-primary cursor-pointer"
                          />
                        </th>
                        <th className="p-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Policy</th>
                        <th className="p-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Dataset</th>
                        <th className="p-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Target</th>
                        <th className="p-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Columns</th>
                        <th className="p-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Rules</th>
                        <th className="p-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                        <th className="p-3 w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {pagePolicies.map(policy => (
                        <tr key={`${policy.id}-${policy.dataset}`}
                          onClick={() => setDetailPolicy(policy)}
                          className={`border-b border-border last:border-b-0 hover:bg-bg-hover transition-colors cursor-pointer group ${
                            selectedIds.has(policy.id!) ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="p-3" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.has(policy.id!)}
                              onChange={() => policy.id && toggleSelect(policy.id)}
                              className="rounded border-border bg-input accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="font-semibold text-text-primary truncate max-w-[150px]">{policy.name}</div>
                              <span className="text-[9px] bg-input border border-border px-1.5 py-0.2 rounded text-text-secondary font-medium flex-shrink-0">v{policy.version_number || policy.id}</span>
                            </div>
                            {policy.created_at && <div className="text-[10px] text-text-muted mt-0.5">{new Date(policy.created_at).toLocaleDateString()}</div>}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 text-text-secondary">
                              <Database className="w-3 h-3 flex-shrink-0 text-text-muted" />
                              <span className="text-xs font-medium">{policy.dataset}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                              <Users className="w-3 h-3" />
                              <span className="capitalize">{policy.target_type}</span>
                              <span className="font-bold text-text-primary ml-0.5">{policy.target_values?.length}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {(policy.column_access || []).slice(0, 4).map(colBadge)}
                              {(policy.column_access?.length || 0) > 4 && <span className="text-[9px] text-text-muted">+{(policy.column_access?.length || 0) - 4}</span>}
                            </div>
                          </td>
                          <td className="p-3">
                            {(() => {
                              const filterCount = policy.row_filters?.length || 0
                              const fullMaskCount = (policy.column_access || []).filter(c => c.access === 'mask').length
                              const partialMaskCount = (policy.column_access || []).filter(c => c.access === 'partial').length
                              const cellMaskCount = policy.cell_masks?.length || 0
                              const hasAny = filterCount > 0 || fullMaskCount > 0 || partialMaskCount > 0 || cellMaskCount > 0
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-muted">
                                  {filterCount > 0 && <span className="flex items-center gap-1"><Filter className="w-2.5 h-2.5" />{filterCount} filter{filterCount > 1 ? 's' : ''}</span>}
                                  {fullMaskCount > 0 && <span className="flex items-center gap-1 text-[#ce9178]"><EyeOff className="w-2.5 h-2.5" />{fullMaskCount} masked</span>}
                                  {partialMaskCount > 0 && <span className="flex items-center gap-1 text-[#569cd6]"><Eye className="w-2.5 h-2.5" />{partialMaskCount} partial</span>}
                                  {cellMaskCount > 0 && <span className="flex items-center gap-1"><EyeOff className="w-2.5 h-2.5" />{cellMaskCount} cell mask{cellMaskCount > 1 ? 's' : ''}</span>}
                                  {!hasAny && <span className="text-text-muted/40">—</span>}
                                </div>
                              )
                            })()}
                          </td>
                          <td className="p-3">{statusPill(policy)}</td>
                          <td className="p-3" onClick={e => e.stopPropagation()}>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">{rowActions(policy)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── GRID view ──────────────────────────────────────── */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pagePolicies.map(policy => (
                  <div key={`${policy.id}-${policy.dataset}`}
                    onClick={() => setDetailPolicy(policy)}
                    className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 group relative ${
                      selectedIds.has(policy.id!) ? 'border-primary/60 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2" onClick={e => { e.stopPropagation(); policy.id && toggleSelect(policy.id) }}>
                        <input type="checkbox" checked={selectedIds.has(policy.id!)}
                          onChange={() => policy.id && toggleSelect(policy.id)}
                          className="rounded border-border bg-input accent-primary cursor-pointer mt-0.5"
                        />
                      </div>
                      {statusPill(policy)}
                    </div>
                    <h3 className="text-sm font-bold text-text-primary mb-1 leading-snug flex items-center gap-1.5 min-w-0">
                      <span className="truncate max-w-[150px]">{policy.name}</span>
                      <span className="text-[9px] bg-input border border-border px-1 py-0.2 rounded text-text-secondary font-medium flex-shrink-0">v{policy.id}</span>
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted mb-3">
                      <Database className="w-3 h-3" />{policy.dataset}
                      <span className="mx-1">·</span>
                      <Users className="w-3 h-3" />{policy.target_values?.length} {policy.target_type}{(policy.target_values?.length || 0) !== 1 ? 's' : ''}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(policy.column_access || []).slice(0, 5).map(colBadge)}
                      {(policy.column_access?.length || 0) > 5 && <span className="text-[9px] text-text-muted">+{(policy.column_access?.length || 0) - 5}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        {(policy.row_filters?.length || 0) > 0 && <span className="flex items-center gap-1"><Filter className="w-2.5 h-2.5" />{policy.row_filters?.length}</span>}
                        {(policy.cell_masks?.length || 0) > 0 && <span className="flex items-center gap-1"><EyeOff className="w-2.5 h-2.5" />{policy.cell_masks?.length}</span>}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>{rowActions(policy)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── COMPACT view ───────────────────────────────────── */}
            {viewMode === 'compact' && (
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                {pagePolicies.map(policy => (
                  <div key={`${policy.id}-${policy.dataset}`}
                    onClick={() => setDetailPolicy(policy)}
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-bg-hover cursor-pointer transition-colors group ${
                      selectedIds.has(policy.id!) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(policy.id!)}
                        onChange={() => policy.id && toggleSelect(policy.id)}
                        className="rounded border-border bg-input accent-primary cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="text-sm font-semibold text-text-primary truncate max-w-[160px]">{policy.name}</span>
                      <span className="text-[9px] bg-input border border-border px-1.5 py-0.2 rounded text-text-secondary font-medium flex-shrink-0">v{policy.id}</span>
                      {statusPill(policy)}
                      <span className="text-[11px] text-text-muted flex items-center gap-1 flex-shrink-0"><Database className="w-3 h-3" />{policy.dataset}</span>
                      <span className="text-[11px] text-text-muted flex items-center gap-1 flex-shrink-0"><Users className="w-3 h-3" />{policy.target_values?.length}</span>
                      <div className="hidden sm:flex items-center gap-1">
                        {(policy.column_access || []).slice(0, 3).map(colBadge)}
                        {(policy.column_access?.length || 0) > 3 && <span className="text-[9px] text-text-muted">+{(policy.column_access?.length || 0) - 3}</span>}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>{rowActions(policy)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Pagination ─────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-text-muted">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredPolicies.length)} of {filteredPolicies.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 text-xs bg-input border border-border rounded hover:bg-bg-hover disabled:opacity-40 transition-colors"
                  >← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, n, i, arr) => {
                      if (i > 0 && (arr[i - 1] as number) < n - 1) acc.push('...')
                      acc.push(n)
                      return acc
                    }, [])
                    .map((item, i) =>
                      item === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-text-muted text-xs">…</span>
                      ) : (
                        <button key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                            currentPage === item ? 'bg-primary text-white border-primary' : 'bg-input border-border hover:bg-bg-hover'
                          }`}
                        >{item}</button>
                      )
                    )
                  }
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 text-xs bg-input border border-border rounded hover:bg-bg-hover disabled:opacity-40 transition-colors"
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )
      })()}
        </>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-input border-b border-border text-left">
                    <th className="p-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">User</th>
                    <th className="p-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Dataset</th>
                    <th className="p-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Requested Columns</th>
                    <th className="p-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Reason</th>
                    <th className="p-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                    <th className="p-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Submitted At</th>
                    <th className="p-3 text-right text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-text-muted italic text-xs">
                        No access requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    accessRequests.map((req) => (
                      <tr key={req.id} className="border-b border-border last:border-b-0 hover:bg-bg-hover/30 transition-colors">
                        <td className="p-3 text-xs text-text-primary font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-[10px]">
                              {req.username.substring(0, 2).toUpperCase()}
                            </span>
                            <span>{req.username}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-text-secondary font-medium">
                          {req.dataset_name}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {req.requested_columns.map((c: string) => (
                              <span key={c} className="px-1.5 py-0.5 bg-input text-text-muted border border-border text-[9px] rounded font-mono">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-text-secondary max-w-[200px] truncate" title={req.reason}>
                          {req.reason || '—'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                            req.status === 'approved' ? 'bg-[#6a9955]/15 text-[#6a9955] border border-[#6a9955]/20'
                            : req.status === 'rejected' ? 'bg-[#f44747]/15 text-[#f44747] border border-[#f44747]/20'
                            : 'bg-[#569cd6]/15 text-[#569cd6] border border-[#569cd6]/20'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-text-muted">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveRequestClick(req)}
                                className="px-2 py-1 bg-[#6a9955] text-white hover:bg-[#5b8549] text-xs font-semibold rounded transition-colors font-sans"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectRequest(req.id)}
                                className="px-2 py-1 bg-[#f44747] text-white hover:bg-[#d83737] text-xs font-semibold rounded transition-colors font-sans"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">
                              Closed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Policy Detail Modal */}
      {detailPolicy && (() => {
        const policyVersions = aclPolicies
          .filter(p => p.acl_policy_id === detailPolicy.acl_policy_id)
          .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
        const currentPolicy = aclPolicies.find(p => p.id === selectedVersionId && p.acl_policy_id === detailPolicy.acl_policy_id) || detailPolicy
        return createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4" onClick={() => setDetailPolicy(null)}>
            <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-border">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-text-primary">{currentPolicy.name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      currentPolicy.status === 'active' ? 'bg-[#6a9955]/20 text-[#6a9955]' : 'bg-text-muted/15 text-text-muted'
                    }`}>{currentPolicy.status || 'active'}</span>
                  </div>
                  {currentPolicy.created_at && (
                    <p className="text-xs text-text-muted mb-2">Created {new Date(currentPolicy.created_at).toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Explore Version:</span>
                    <select
                      value={selectedVersionId || ''}
                      onChange={e => setSelectedVersionId(Number(e.target.value))}
                      className="bg-input border border-border rounded px-2.5 py-1 text-xs font-semibold text-text-primary focus:outline-none focus:border-primary cursor-pointer transition-colors"
                    >
                       {policyVersions.map(p => (
                        <option key={p.id} value={p.id}>
                          v{p.version_number || p.id} ({p.status === 'active' ? 'Active' : p.status === 'draft' ? 'Draft' : 'Superseded'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setDetailPolicy(null); openEditModal(currentPolicy) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/30 rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
                    title="Create a new version draft pre-populated with this policy's rules"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> New Version
                  </button>
                  {currentPolicy.status !== 'active' && (
                    <button
                      onClick={async () => {
                        try {
                          await apiFetch(`/acl/policies/${currentPolicy.id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'active' })
                          })
                          showAlert('success', 'Version Activated', `ACL Version v${currentPolicy.version_number || currentPolicy.id} is now active`)
                          setDetailPolicy(null)
                          fetchData()
                        } catch (error) {
                          showAlert('error', 'Activation Failed', error instanceof Error ? error.message : 'Failed to activate version')
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6a9955]/20 text-[#6a9955] border border-[#6a9955]/30 rounded-lg text-xs font-semibold hover:bg-[#6a9955]/35 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Make Active / Rollback
                    </button>
                  )}
                  <button onClick={() => setDetailPolicy(null)}
                    className="p-2 rounded-lg hover:bg-bg-hover text-text-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Dataset & Target */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-input rounded-xl p-4 border border-border">
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Database className="w-3 h-3" /> Dataset
                    </div>
                    <div className="text-sm font-bold text-text-primary">{currentPolicy.dataset}</div>
                  </div>
                  <div className="bg-input rounded-xl p-4 border border-border">
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Target Type
                    </div>
                    <div className="text-sm font-bold text-text-primary capitalize">{currentPolicy.target_type}</div>
                  </div>
                </div>

                {/* Target principals */}
                <div>
                  <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Principals ({currentPolicy.target_values?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(currentPolicy.target_values || []).map(val => (
                      <UserBadge
                        key={val}
                        username={val}
                        avatarSize="sm"
                        showRoleSubtext={true}
                        withBackground={true}
                        isClickable={true}
                      />
                    ))}
                    {(!currentPolicy.target_values || currentPolicy.target_values.length === 0) && (
                      <span className="text-xs text-text-muted italic">No principals defined</span>
                    )}
                  </div>
                </div>

                {/* Column Access */}
                {(currentPolicy.column_access?.length || 0) > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Column Access ({currentPolicy.column_access?.length})
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                      {['allow', 'mask', 'partial', 'block'].map(access => {
                        const cols = (currentPolicy.column_access || []).filter(c => c.access === access)
                        if (cols.length === 0) return null
                        const color = access === 'allow' ? '#6a9955' : access === 'mask' ? '#ce9178' : access === 'partial' ? '#569cd6' : '#f44747'
                        const label = access === 'allow' ? '✓ Allowed' : access === 'mask' ? '◐ Masked' : access === 'partial' ? '◑ Partially Masked' : '✕ Blocked'
                        return (
                          <div key={access} className="rounded-lg p-3 border" style={{ backgroundColor: `${color}08`, borderColor: `${color}25` }}>
                            <div className="text-[10px] font-bold uppercase mb-2" style={{ color }}>{label}</div>
                            <div className="flex flex-wrap gap-1">
                              {cols.map(c => (
                                <span key={c.column_name} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${color}15`, color }}>
                                  {c.column_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Row Filters */}
                {(currentPolicy.row_filters?.length || 0) > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5" /> Row Level Filters ({currentPolicy.row_filters?.length})
                    </div>
                    <div className="space-y-2">
                      {currentPolicy.row_filters?.map((group, gi) => (
                        <div key={gi} className="rounded-lg border border-border bg-input p-3">
                          <div className="text-[10px] font-bold text-primary mb-2">
                            Match {group.logical_operator === 'AND' ? 'ALL' : 'ANY'} conditions
                          </div>
                          <div className="space-y-1">
                            {group.conditions.map((cond, ci) => (
                              <div key={ci} className="flex items-center gap-2 text-xs">
                                <code className="px-2 py-0.5 bg-card border border-border rounded text-[#569cd6] font-mono">{cond.column}</code>
                                <span className="text-text-muted font-mono text-[10px]">{cond.operator.replace('_', ' ').toLowerCase()}</span>
                                <code className="px-2 py-0.5 bg-card border border-border rounded text-[#ce9178] font-mono">{cond.value}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cell Masks */}
                {(currentPolicy.cell_masks?.length || 0) > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5" /> Cell Level Masks ({currentPolicy.cell_masks?.length})
                    </div>
                    <div className="space-y-1.5">
                      {currentPolicy.cell_masks?.map((mask, mi) => (
                        <div key={mi} className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-2 text-xs">
                          <EyeOff className="w-3 h-3 text-text-muted flex-shrink-0" />
                          <span className="text-text-muted">Mask</span>
                          <code className="px-1.5 py-0.5 bg-card border border-border rounded text-[#569cd6] font-mono">{mask.column}</code>
                          <span className="text-text-muted">when</span>
                          <code className="px-1.5 py-0.5 bg-card border border-border rounded text-[#569cd6] font-mono">{mask.column}</code>
                          <span className="text-text-muted font-mono text-[10px]">{mask.operator.replace('_', ' ').toLowerCase()}</span>
                          <code className="px-1.5 py-0.5 bg-card border border-border rounded text-[#ce9178] font-mono">{mask.value}</code>
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-[#ce9178]/15 text-[#ce9178] rounded font-semibold uppercase">{mask.mask_type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Version History */}
                <div className="border-t border-border pt-4">
                  <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-text-muted" /> Version History & Rollback
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-input border-b border-border text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                          <th className="p-2.5">Version</th>
                          <th className="p-2.5">Created</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {policyVersions.map(p => (
                          <tr key={p.id} className="hover:bg-bg-hover transition-colors">
                            <td className="p-2.5 font-medium text-text-primary">v{p.version_number || p.id}</td>
                            <td className="p-2.5 text-text-muted">{p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                                p.status === 'active'
                                  ? 'bg-[#6a9955]/15 text-[#6a9955] border border-[#6a9955]/20'
                                  : p.status === 'draft'
                                  ? 'bg-[#569cd6]/15 text-[#569cd6] border border-[#569cd6]/20'
                                  : 'bg-text-muted/10 text-text-muted border border-border'
                              }`}>
                                {p.status === 'active' ? 'Active' : p.status === 'draft' ? 'Draft' : 'Superseded'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              {p.status !== 'active' ? (
                                <button
                                  onClick={async () => {
                                    try {
                                      await apiFetch(`/acl/policies/${p.id}/status`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({ status: 'active' })
                                      })
                                      showAlert('success', 'Rollback Successful', `Restored and activated ACL Version v${p.version_number || p.id}`)
                                      setDetailPolicy(null)
                                      fetchData()
                                    } catch (error) {
                                      showAlert('error', 'Rollback Failed', error instanceof Error ? error.message : 'Failed to revert version')
                                    }
                                  }}
                                  className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all rounded text-[10px] font-semibold mr-1"
                                >
                                  Revert / Rollback
                                </button>
                              ) : (
                                <span className="text-[10px] font-semibold text-[#6a9955] mr-2">✓ Active</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      })()}

      {/* Create/Edit Modal */}
      {showCreateModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg max-w-4xl w-full h-[95vh] overflow-hidden flex flex-col shadow-2xl relative">
              <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between flex-shrink-0 z-10">
                <h2 className="text-xl font-bold text-text-primary">
                  {editingPolicy ? 'Edit ACL Policy' : 'Create ACL Policy'}
                </h2>
                <button
                  onClick={closeCreateModal}
                  className="p-2 rounded hover:bg-bg-hover text-text-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {approvingRequest && (
                <div className="bg-[#1e1e2f] border border-[#4d3ca6]/40 rounded-xl p-4 flex flex-col gap-3 text-xs font-mono shadow-inner">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Shield className="w-4 h-4 text-[#a78bfa]" />
                    REVIEWING ACCESS REQUEST
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-text-secondary bg-[#0c0c14]/40 p-3 rounded-lg border border-border/40">
                    <div>
                      <span className="text-text-muted">User:</span> <span className="text-text-primary font-bold">{approvingRequest.username}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Dataset:</span> <span className="text-text-primary font-bold">{approvingRequest.dataset_name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-text-muted">Requested Columns:</span>{' '}
                      <span className="text-[#a78bfa] font-bold">
                        {approvingRequest.requested_columns.join(', ')}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-text-muted">Reason:</span> <span className="text-text-primary italic">"{approvingRequest.reason || 'No reason provided'}"</span>
                    </div>
                  </div>
                  
                  {/* Validity Window Picker */}
                  <div className="border-t border-[#4d3ca6]/20 pt-3 mt-1 flex flex-wrap gap-4 items-center">
                    <span className="text-text-muted font-bold">Approval Validity Window:</span>
                    <div className="flex gap-2 items-center">
                      <label className="text-[10px] text-text-muted">From:</label>
                      <input
                        type="datetime-local"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        className="bg-input border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="text-[10px] text-text-muted">Until:</label>
                      <input
                        type="datetime-local"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="bg-input border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Policy Name */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Policy Name
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g., analyst_sales_data_access"
                  className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* Target Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                    Target Type
                  </label>
                  <select
                    value={formState.target_type}
                    onChange={(e) => setFormState({ ...formState, target_type: e.target.value as TargetType })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="team">Team</option>
                    <option value="role">Role</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                    Target Values
                  </label>
                  {formState.target_type === 'user' ? (
                    <div className="relative">
                      {/* Combobox field — chips + input inline */}
                      <div
                        className="flex flex-wrap items-center gap-1.5 w-full min-h-[42px] bg-input border border-border rounded px-2 py-1.5 focus-within:border-primary transition-colors cursor-text"
                        onClick={() => setShowUserDropdown(true)}
                      >
                        {/* Selected user badges inside the field */}
                        {(formState.target_values || []).map((username) => {
                          const u = users.find(x => x.username === username)
                          return (
                            <div key={username} className="flex items-center gap-1.5 bg-card border border-border rounded px-1.5 py-0.5 flex-shrink-0">
                              <div className="w-5 h-5 rounded-sm bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {username.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-text-primary font-medium">
                                {username.charAt(0).toUpperCase() + username.slice(1)}
                              </span>
                              <button
                                type="button"
                                onMouseDown={e => {
                                  e.preventDefault()
                                  setFormState({
                                    ...formState,
                                    target_values: formState.target_values?.filter(v => v !== username) || [],
                                  })
                                }}
                                className="text-text-muted hover:text-[#f44747] transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}

                        {/* Inline search input */}
                        <input
                          type="text"
                          value={userSearch}
                          onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true) }}
                          onFocus={() => setShowUserDropdown(true)}
                          onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                          placeholder={(formState.target_values?.length || 0) === 0 ? 'Search users…' : 'Add more…'}
                          className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary placeholder-text-muted outline-none py-0.5 px-1"
                        />
                        <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mr-1" />
                      </div>

                      {/* Dropdown */}
                      {showUserDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-card border border-border rounded shadow-xl max-h-48 overflow-y-auto z-50 mt-1">
                          {filteredUsers
                            .filter(u => !formState.target_values?.includes(u.username))
                            .map((user) => (
                              <div
                                key={user.id}
                                onMouseDown={e => {
                                  e.preventDefault()
                                  setFormState({
                                    ...formState,
                                    target_values: [...(formState.target_values || []), user.username],
                                  })
                                  setUserSearch('')
                                }}
                                className="p-2.5 hover:bg-bg-hover cursor-pointer border-b border-border transition-colors"
                              >
                                <UserBadge
                                  username={user.username}
                                  fullName={user.full_name}
                                  role={user.role}
                                  avatarSize="sm"
                                  showRoleSubtext={true}
                                  roleSubtext={user.role}
                                  isClickable={false}
                                />
                              </div>
                            ))
                          }
                          {filteredUsers.filter(u => !formState.target_values?.includes(u.username)).length > 0 && <div className="border-t border-border" />}
                          <div
                            onMouseDown={e => {
                              e.preventDefault()
                              setShowCreateUserModal(true)
                              setUserSearch('')
                              setShowUserDropdown(false)
                            }}
                            className="p-2.5 hover:bg-bg-hover cursor-pointer flex items-center gap-2 text-primary text-sm transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="font-medium">Create new user</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : formState.target_type === 'team' ? (
                    <select
                      multiple
                      value={formState.target_values}
                      onChange={e => setFormState({ ...formState, target_values: Array.from(e.target.selectedOptions, o => o.value) })}
                      className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary h-24 transition-colors"
                    >
                      {teams.map(team => (
                        <option key={team.id} value={team.name}>{team.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      multiple
                      value={formState.target_values}
                      onChange={e => setFormState({ ...formState, target_values: Array.from(e.target.selectedOptions, o => o.value) })}
                      className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary h-24 transition-colors"
                    >
                      <option value="analyst">Analyst</option>
                      <option value="data_onboarder">Data Onboarder</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Dataset Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Dataset
                </label>
                <div className="relative">
                  {formState.dataset ? (
                    /* ── Selected dataset card ── */
                    (() => {
                      const selected = datasets.find(d => d.name === formState.dataset)
                      const colCount = datasetColumns.length
                      return (
                        <div className="flex items-center gap-3 w-full bg-input border border-primary/40 rounded px-3 py-2.5 group">
                          {/* Icon */}
                          <div className="w-8 h-8 rounded bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <Database className="w-4 h-4 text-primary" />
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-text-primary truncate">{formState.dataset}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {selected?.source_type && (
                                <span className="text-[10px] text-text-muted uppercase tracking-wide">{selected.source_type}</span>
                              )}
                              {colCount > 0 && (
                                <>
                                  <span className="text-text-muted text-[10px]">·</span>
                                  <span className="text-[10px] text-text-muted">{colCount} column{colCount !== 1 ? 's' : ''}</span>
                                </>
                              )}
                              {selected?.status && (
                                <>
                                  <span className="text-text-muted text-[10px]">·</span>
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    selected.status === 'active' ? 'bg-[#6a9955]/15 text-[#6a9955]' : 'bg-text-muted/15 text-text-muted'
                                  }`}>{selected.status}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Clear button */}
                          <button
                            type="button"
                            onClick={() => setFormState({ ...formState, dataset: '', column_access: [], row_filters: [], cell_masks: [] })}
                            className="p-1 rounded text-text-muted hover:text-[#f44747] hover:bg-[#f44747]/10 transition-colors flex-shrink-0"
                            title="Clear dataset"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })()
                  ) : (
                    /* ── Search input ── */
                    <>
                      <input
                        type="text"
                        value={datasetSearch}
                        onChange={e => { setDatasetSearch(e.target.value); setShowDatasetDropdown(true) }}
                        onFocus={() => setShowDatasetDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDatasetDropdown(false), 200)}
                        placeholder="Search datasets…"
                        className="w-full bg-input border border-border rounded px-3 py-2 pl-9 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                      />
                      <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    </>
                  )}

                  {/* Dropdown — always below regardless of state */}
                  {showDatasetDropdown && !formState.dataset && (
                    <div className="absolute top-full left-0 right-0 bg-card border border-border rounded shadow-xl max-h-48 overflow-y-auto z-50 mt-1">
                      {filteredDatasets.map(dataset => (
                        <div
                          key={dataset.name}
                          onMouseDown={e => {
                            e.preventDefault()
                            setFormState({ ...formState, dataset: dataset.name })
                            setDatasetSearch('')
                            setShowDatasetDropdown(false)
                          }}
                          className="p-2.5 hover:bg-bg-hover cursor-pointer border-b border-border transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Database className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm text-text-primary font-medium">{dataset.name}</div>
                              <div className="text-[10px] text-text-muted uppercase tracking-wide">{dataset.source_type}</div>
                            </div>
                            <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              dataset.status === 'active' ? 'bg-[#6a9955]/15 text-[#6a9955]' : 'bg-text-muted/15 text-text-muted'
                            }`}>{dataset.status}</span>
                          </div>
                        </div>
                      ))}
                      {filteredDatasets.length > 0 && <div className="border-t border-border" />}
                      <div
                        onMouseDown={e => {
                          e.preventDefault()
                          setShowCreateDatasetModal(true)
                          setDatasetSearch('')
                          setShowDatasetDropdown(false)
                        }}
                        className="p-2.5 hover:bg-bg-hover cursor-pointer flex items-center gap-2 text-primary text-sm transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="font-medium">Create new dataset</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Copy Settings From (Tiny Search Option) */}
              {formState.dataset && (
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Copy settings from existing policy..."
                    value={copyPolicySearch}
                    onChange={(e) => {
                      setCopyPolicySearch(e.target.value)
                      setShowCopyDropdown(true)
                    }}
                    onFocus={() => setShowCopyDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCopyDropdown(false), 200)}
                    className="w-full bg-input border border-border rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                  
                  {showCopyDropdown && (
                    <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-2xl max-h-48 overflow-y-auto z-50 mt-1">
                      {(() => {
                        const candidates = aclPolicies.filter(p => 
                          p.dataset === formState.dataset &&
                          (
                            !copyPolicySearch ||
                            p.name.toLowerCase().includes(copyPolicySearch.toLowerCase()) ||
                            p.target_values.some(v => v.toLowerCase().includes(copyPolicySearch.toLowerCase()))
                          )
                        )
                        
                        if (candidates.length === 0) {
                          return (
                            <div className="p-3 text-center text-text-muted text-xs italic">
                              No existing policies for this dataset.
                            </div>
                          )
                        }
                        
                        return candidates.map(p => (
                          <div
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setFormState(prev => ({
                                ...prev,
                                column_access: p.column_access ? [...p.column_access] : [],
                                row_filters: p.row_filters ? JSON.parse(JSON.stringify(p.row_filters)) : [],
                                cell_masks: p.cell_masks ? JSON.parse(JSON.stringify(p.cell_masks)) : [],
                              }))
                              setCopyPolicySearch('')
                              setShowCopyDropdown(false)
                              showAlert('success', 'Settings Copied', `Copied rules from "${p.name}"`)
                            }}
                            className="p-2 hover:bg-bg-hover cursor-pointer border-b border-border last:border-b-0 transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold text-text-primary truncate">{p.name}</div>
                              <div className="text-[9px] text-text-muted truncate">
                                Target: {p.target_values.join(', ')}
                              </div>
                            </div>
                            <span className="text-[10px] text-primary hover:text-primary-hover font-medium flex-shrink-0">
                              Apply
                            </span>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Column Access — 2-col grid */}
              {formState.dataset && datasetColumns.length > 0 && (
                (() => {
                  const totalCols = datasetColumns.length
                  const allowCount = datasetColumns.filter(col => {
                    const access = formState.column_access?.find(c => c.column_name === col.column_name)?.access || 'allow'
                    return access === 'allow'
                  }).length
                  const maskCount = datasetColumns.filter(col => {
                    const access = formState.column_access?.find(c => c.column_name === col.column_name)?.access || 'allow'
                    return access === 'mask'
                  }).length
                  const partialCount = datasetColumns.filter(col => {
                    const access = formState.column_access?.find(c => c.column_name === col.column_name)?.access || 'allow'
                    return access === 'partial'
                  }).length
                  const blockCount = datasetColumns.filter(col => {
                    const access = formState.column_access?.find(c => c.column_name === col.column_name)?.access || 'allow'
                    return access === 'block'
                  }).length

                  return (
                    <div>
                      {/* Header row: label + inline search + legend */}
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5 flex-shrink-0">
                          <Lock className="w-3 h-3" /> Column Access
                        </label>
                        {/* Inline search */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={columnSearch}
                            onChange={e => setColumnSearch(e.target.value)}
                            placeholder="Search columns…"
                            className="w-full bg-input border border-border rounded px-2 py-1 pl-6 text-[11px] text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                          />
                          <Search className="w-3 h-3 text-text-muted absolute left-2 top-1/2 -translate-y-1/2" />
                          {columnSearch && (
                            <button onClick={() => setColumnSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-2 text-[9px] text-text-muted flex-shrink-0 font-medium">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#6a9955] inline-block"/>Allow ({allowCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#ce9178] inline-block"/>Mask ({maskCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#569cd6] inline-block"/>Partial ({partialCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f44747] inline-block"/>Block ({blockCount})</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                        {datasetColumns
                          .filter(col => col.column_name.toLowerCase().includes(columnSearch.toLowerCase()))
                          .map((col) => {
                          const access = formState.column_access?.find(c => c.column_name === col.column_name)?.access || 'allow'
                          return (
                            <div key={col.column_name} className={`flex items-center justify-between px-2.5 py-2 rounded-md border transition-all ${
                              access === 'allow'   ? 'bg-[#6a9955]/5 border-[#6a9955]/20' :
                              access === 'mask'    ? 'bg-[#ce9178]/5 border-[#ce9178]/20' :
                              access === 'partial' ? 'bg-[#569cd6]/5 border-[#569cd6]/20' :
                                                     'bg-[#f44747]/5 border-[#f44747]/20'
                            }`}>
                              <div className="min-w-0 flex flex-col">
                                <span className={`text-xs font-semibold truncate flex items-center gap-1.5 ${
                                  access === 'block' ? 'text-[#f44747]' : access === 'mask' ? 'text-[#ce9178]' : 'text-text-primary'
                                }`}>
                                  {col.column_name}
                                  {approvingRequest?.requested_columns?.includes(col.column_name) && (
                                    <span className="px-1 py-0.5 bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40 rounded text-[7px] font-bold uppercase tracking-wider animate-pulse">
                                      Requested
                                    </span>
                                  )}
                                </span>
                                <span className="text-[8px] text-text-muted font-mono uppercase tracking-wider mt-0.5">{col.data_type}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button onClick={() => updateColumnAccess(col.column_name, 'allow')} title="Allow"
                                  className={`p-1 rounded transition-all ${access === 'allow' ? 'bg-[#6a9955]/25 text-[#6a9955]' : 'text-text-muted hover:text-[#6a9955] hover:bg-[#6a9955]/10'}`}>
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => updateColumnAccess(col.column_name, 'mask')} title="Mask"
                                  className={`p-1 rounded transition-all ${access === 'mask' ? 'bg-[#ce9178]/25 text-[#ce9178]' : 'text-text-muted hover:text-[#ce9178] hover:bg-[#ce9178]/10'}`}>
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => updateColumnAccess(col.column_name, 'partial')} title="Partially Mask"
                                  className={`p-1 rounded transition-all ${access === 'partial' ? 'bg-[#569cd6]/25 text-[#569cd6]' : 'text-text-muted hover:text-[#569cd6] hover:bg-[#569cd6]/10'}`}>
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => updateColumnAccess(col.column_name, 'block')} title="Block"
                                  className={`p-1 rounded transition-all ${access === 'block' ? 'bg-[#f44747]/25 text-[#f44747]' : 'text-text-muted hover:text-[#f44747] hover:bg-[#f44747]/10'}`}>
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()
              )}

              {/* Row Filters — 2-col condition layout */}
              {formState.dataset && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                      <Filter className="w-3 h-3" /> Row Level Filters
                    </label>
                    <button onClick={addRowFilterGroup}
                      className="text-[10px] px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-md transition-colors flex items-center gap-1 font-medium">
                      <Plus className="w-3 h-3" /> Add Filter Group
                    </button>
                  </div>
                  {formState.row_filters?.length === 0 || !formState.row_filters ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-dashed border-border text-text-muted text-xs">
                      <Filter className="w-3.5 h-3.5 opacity-40" />
                      No row filters — all rows will be visible
                    </div>
                  ) : (
                    formState.row_filters.map((group, groupIndex) => (
                      <div key={groupIndex} className="mb-2 rounded-lg border border-border overflow-hidden">
                        {/* Group header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-input border-b border-border">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Match</span>
                            <select value={group.logical_operator}
                              onChange={(e) => {
                                const f = [...(formState.row_filters || [])]
                                f[groupIndex].logical_operator = e.target.value as LogicalOperator
                                setFormState({ ...formState, row_filters: f })
                              }}
                              className="bg-card border border-border rounded px-2 py-0.5 text-xs font-bold text-primary focus:outline-none focus:border-primary transition-colors">
                              <option value="AND">ALL (AND)</option>
                              <option value="OR">ANY (OR)</option>
                            </select>
                            <span className="text-[10px] text-text-muted">of the conditions</span>
                          </div>
                          <button onClick={() => removeRowFilterGroup(groupIndex)}
                            className="p-1 rounded hover:bg-[#f44747]/10 text-text-muted hover:text-[#f44747] transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {/* Conditions */}
                        <div className="p-2 space-y-1.5 bg-card/50">
                          {group.conditions.map((condition, conditionIndex) => (
                            <div key={conditionIndex} className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 items-center">
                              <select value={condition.column}
                                onChange={(e) => updateRowFilterCondition(groupIndex, conditionIndex, 'column', e.target.value)}
                                className="bg-input border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors">
                                <option value="">Column…</option>
                                {datasetColumns.map((col) => (
                                  <option key={col.column_name} value={col.column_name}>{col.column_name}</option>
                                ))}
                              </select>
                              <select value={condition.operator}
                                onChange={(e) => updateRowFilterCondition(groupIndex, conditionIndex, 'operator', e.target.value as ComparisonOperator)}
                                className="bg-input border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors font-mono">
                                <option value="EQUALS">=</option>
                                <option value="NOT_EQUALS">≠</option>
                                <option value="GREATER_THAN">&gt;</option>
                                <option value="LESS_THAN">&lt;</option>
                                <option value="GREATER_EQUAL">≥</option>
                                <option value="LESS_EQUAL">≤</option>
                                <option value="IN">IN</option>
                                <option value="NOT_IN">NOT IN</option>
                              </select>
                              <input type="text" value={condition.value}
                                onChange={(e) => updateRowFilterCondition(groupIndex, conditionIndex, 'value', e.target.value)}
                                placeholder="Value…"
                                className="bg-input border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors" />
                              <button onClick={() => removeRowFilterCondition(groupIndex, conditionIndex)}
                                className="p-1 rounded hover:bg-[#f44747]/10 text-text-muted hover:text-[#f44747] transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addRowFilterCondition(groupIndex)}
                            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-primary px-1 py-0.5 transition-colors">
                            <Plus className="w-3 h-3" /> Add condition
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Cell Masks — 2-col layout */}
              {formState.dataset && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                      <EyeOff className="w-3 h-3" /> Cell Level Masks
                    </label>
                    <button onClick={addCellMask}
                      className="text-[10px] px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-md transition-colors flex items-center gap-1 font-medium">
                      <Plus className="w-3 h-3" /> Add Cell Mask
                    </button>
                  </div>
                  {!formState.cell_masks?.length ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-dashed border-border text-text-muted text-xs">
                      <EyeOff className="w-3.5 h-3.5 opacity-40" />
                      No cell masks defined
                    </div>
                  ) : (
                    formState.cell_masks.map((mask, idx) => (
                      <div key={idx} className="mb-2 rounded-lg border border-border p-2 bg-card/50 space-y-2">
                        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 items-center">
                          <select value={mask.column}
                            onChange={(e) => updateCellMask(idx, 'column', e.target.value)}
                            className="bg-input border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors">
                            <option value="">Column to mask…</option>
                            {datasetColumns.map((col) => (
                              <option key={col.column_name} value={col.column_name}>{col.column_name}</option>
                            ))}
                          </select>
                          
                          <select value={mask.operator}
                            onChange={(e) => updateCellMask(idx, 'operator', e.target.value as any)}
                            className="bg-input border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors font-mono">
                            <option value="EQUALS">=</option>
                            <option value="NOT_EQUALS">≠</option>
                            <option value="GREATER_THAN">&gt;</option>
                            <option value="LESS_THAN">&lt;</option>
                            <option value="GREATER_EQUAL">≥</option>
                            <option value="LESS_EQUAL">≤</option>
                            <option value="IN">IN</option>
                            <option value="NOT_IN">NOT IN</option>
                          </select>

                          <input type="text" value={mask.value}
                            onChange={(e) => updateCellMask(idx, 'value', e.target.value)}
                            placeholder="Condition value…"
                            className="bg-input border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors" />

                          <button onClick={() => removeCellMask(idx)}
                            className="p-1 rounded hover:bg-[#f44747]/10 text-text-muted hover:text-[#f44747] transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-muted">Mask Type:</span>
                          <select value={mask.mask_type}
                            onChange={(e) => updateCellMask(idx, 'mask_type', e.target.value as any)}
                            className="bg-input border border-border rounded px-2 py-0.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors">
                            <option value="full">Full (***)</option>
                            <option value="partial">Partial (ab***)</option>
                            <option value="hash">Hash (••••)</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Dataset Preview */}
              {formState.dataset && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                      Dataset Preview
                      {datasetPreview && (
                        <span className="ml-2 text-[10px] font-normal text-text-muted normal-case">
                          {datasetPreview.row_count.toLocaleString()} total rows
                        </span>
                      )}
                    </label>
                    {datasetPreview && (
                      <div className="flex items-center bg-input border border-border rounded-full p-0.5 gap-0.5">
                        <button
                          onClick={() => setPreviewMode('head')}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                            previewMode === 'head'
                              ? 'bg-[#6a9955] text-white shadow-sm'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          Head
                        </button>
                        <button
                          onClick={() => setPreviewMode('tail')}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                            previewMode === 'tail'
                              ? 'bg-[#569cd6] text-white shadow-sm'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          Tail
                        </button>
                      </div>
                    )}
                  </div>

                  {previewLoading ? (
                    <div className="flex items-center gap-2 p-4 bg-input rounded border border-border text-text-muted text-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Loading preview...
                    </div>
                  ) : datasetPreview && (datasetPreview.head.length > 0 || datasetPreview.tail.length > 0) ? (
                    (() => {
                      const allRows = previewMode === 'head' ? datasetPreview.head : datasetPreview.tail
                      const filteredRows = allRows.filter(applyRowFilters)
                      const matchingRatio = allRows.length > 0 ? filteredRows.length / allRows.length : 1
                      const displayRowCount = Math.round(datasetPreview.row_count * matchingRatio)

                      return (
                        <div>
                          <div className="overflow-x-auto border border-border rounded max-w-full">
                            <table className="min-w-full text-[10px] table-auto">
                              <thead>
                                <tr className="bg-input border-b border-border">
                                  {datasetPreview.columns.map((col) => {
                                    const access = formState.column_access?.find(c => c.column_name === col)?.access || 'allow'
                                    return (
                                      <th key={col} className={`text-left p-1.5 font-semibold whitespace-nowrap ${
                                        access === 'block' ? 'text-[#f44747]' : access === 'mask' ? 'text-[#ce9178]' : 'text-[#569cd6]'
                                      }`}>
                                        {col}
                                      </th>
                                    )
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRows.length === 0 ? (
                                  <tr>
                                    <td colSpan={datasetPreview.columns.length} className="p-4 text-center text-text-muted italic">
                                      All rows hidden by row-level filters.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredRows.map((row, idx) => (
                                    <tr key={idx} className="border-b border-border last:border-b-0 hover:bg-bg-hover transition-colors">
                                      {datasetPreview.columns.map((col) => (
                                        <td key={col} className="p-1.5 text-text-secondary whitespace-nowrap max-w-[180px] truncate">
                                          {getPreviewValue(row[col], col, row)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[9px] text-text-muted">
                            <div className="flex items-center gap-1">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${previewMode === 'head' ? 'bg-[#6a9955]' : 'bg-[#569cd6]'}`} />
                              Showing {previewMode === 'head' ? 'first' : 'last'} {filteredRows.length} of {allRows.length} rows {rowFiltersActive ? '(filtered by row-level rules)' : '(filters disabled)'}
                            </div>
                            <span className="font-semibold text-text-secondary">
                              Estimated total rows: {displayRowCount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="p-4 bg-input rounded border border-border text-text-muted text-xs text-center">
                      No preview available for this dataset
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border p-4 flex items-center justify-between flex-shrink-0">
              <button
                onClick={copyYamlToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-input text-text-primary rounded text-xs hover:bg-bg-hover transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy YAML
              </button>
              <div className="flex gap-2">
                {approvingRequestId && (
                  <button
                    onClick={async () => {
                      await handleRejectRequest(approvingRequestId);
                      closeCreateModal();
                    }}
                    className="px-3 py-1.5 bg-[#f44747] text-white rounded text-xs font-semibold hover:bg-[#d83737] transition-colors"
                  >
                    Reject Request
                  </button>
                )}
                <button
                  onClick={closeCreateModal}
                  className="px-3 py-1.5 bg-input text-text-primary rounded text-xs font-medium hover:bg-bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deployAcl()}
                  disabled={deploying || !formState.name || !formState.dataset || !formState.target_values?.length}
                  className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {deploying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Deploying...
                    </>
                  ) : approvingRequestId ? (
                    'Approve & Deploy'
                  ) : (
                    'Deploy ACL'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create User Modal */}
      {showCreateUserModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg max-w-md w-full flex flex-col shadow-2xl">
              <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-bold text-text-primary">Create New User</h2>
                <button
                  onClick={() => {
                    setShowCreateUserModal(false)
                    setUserForm({ username: '', full_name: '', email: '', role: 'analyst' })
                  }}
                  className="p-2 rounded hover:bg-bg-hover text-text-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Username *
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="e.g., john_doe"
                  className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="e.g., John Doe"
                  className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Email *
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="e.g., john@example.com"
                  className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="analyst">Analyst</option>
                  <option value="data_onboarder">Data Onboarder</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowCreateUserModal(false)
                  setUserForm({ username: '', full_name: '', email: '', role: 'analyst' })
                }}
                className="px-4 py-2 bg-input text-text-primary rounded text-sm font-medium hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiFetch('/users', {
                      method: 'POST',
                      body: JSON.stringify(userForm),
                    })
                    showAlert('success', 'User Created', 'User has been successfully created')
                    setShowCreateUserModal(false)
                    setUserForm({ username: '', full_name: '', email: '', role: 'analyst' })
                    fetchData()
                  } catch (error) {
                    showAlert('error', 'Creation Failed', error instanceof Error ? error.message : 'Failed to create user')
                  }
                }}
                disabled={!userForm.username || !userForm.email}
                className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create User
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Dataset Modal */}
      {showCreateDatasetModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg max-w-md w-full flex flex-col shadow-2xl">
              <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-bold text-text-primary">Create New Dataset</h2>
                <button
                  onClick={() => {
                    setShowCreateDatasetModal(false)
                    setDatasetForm({ name: '', source_type: 'csv' })
                  }}
                  className="p-2 rounded hover:bg-bg-hover text-text-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Dataset Name *
                </label>
                <input
                  type="text"
                  value={datasetForm.name}
                  onChange={(e) => setDatasetForm({ ...datasetForm, name: e.target.value })}
                  placeholder="e.g., sales_data_2024"
                  className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Source Type
                </label>
                <select
                  value={datasetForm.source_type}
                  onChange={(e) => setDatasetForm({ ...datasetForm, source_type: e.target.value })}
                  className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="csv">CSV File</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                </select>
              </div>
              <p className="text-xs text-text-muted">
                For detailed dataset creation with file upload or database connection, please use the Resource Catalog Builder.
              </p>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowCreateDatasetModal(false)
                  setDatasetForm({ name: '', source_type: 'csv' })
                }}
                className="px-4 py-2 bg-input text-text-primary rounded text-sm font-medium hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiFetch('/datasets', {
                      method: 'POST',
                      body: JSON.stringify(datasetForm),
                    })
                    showAlert('success', 'Dataset Created', 'Dataset placeholder has been created. Please complete the setup in Resource Catalog Builder.')
                    setShowCreateDatasetModal(false)
                    setDatasetForm({ name: '', source_type: 'csv' })
                    fetchData()
                  } catch (error) {
                    showAlert('error', 'Creation Failed', error instanceof Error ? error.message : 'Failed to create dataset')
                  }
                }}
                disabled={!datasetForm.name}
                className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Dataset
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Conflict Review Modal */}
      {showConflictModal && conflicts.length > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-border flex items-center gap-3 bg-destructive/10 text-destructive">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <div>
                  <h2 className="text-lg font-bold text-destructive">Policy & ACL Conflict Check</h2>
                  <p className="text-xs opacity-80">We detected conflicting rules in the simulated post-deployment state.</p>
                </div>
              </div>

              {/* Conflict items */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {conflicts.map((conflict, idx) => {
                  const isError = conflict.severity === 'error'
                  return (
                    <div key={idx} className={`p-4 border rounded-lg space-y-2.5 ${
                      isError ? 'bg-destructive/5 border-destructive/20' : 'bg-warning/5 border-warning/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isError ? 'bg-destructive/10 text-destructive' : 'bg-[#ce9178]/25 text-[#ce9178]'
                        }`}>
                          {conflict.severity}
                        </span>
                        <span className="text-xs font-semibold text-text-secondary">{(conflict.conflict_type || conflict.type || 'conflict').replace('_', ' ').toUpperCase()}</span>
                      </div>
                      
                      {conflict.title && <h4 className="text-xs font-bold text-text-primary mt-1">{conflict.title}</h4>}
                      <p className="text-sm font-semibold text-text-primary">{conflict.description || conflict.message || ''}</p>
                      
                      <div className="text-xs text-text-muted bg-input/50 p-2.5 rounded border border-border/40">
                        <span className="font-bold text-text-secondary block mb-1">Recommended steps:</span>
                        {conflict.recommendation}
                      </div>

                      {/* Auto resolution button if available */}
                      {conflict.auto_fix && (
                        <div className="pt-1.5 flex justify-end">
                          <button
                            onClick={() => handleAutoResolve(conflict.auto_fix)}
                            className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all rounded text-xs font-semibold"
                          >
                            <Check className="w-3.5 h-3.5" /> Auto-Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Actions footer */}
              <div className="p-6 border-t border-border flex justify-between items-center bg-input/30">
                <button
                  onClick={() => {
                    setShowConflictModal(false)
                    setConflicts([])
                  }}
                  className="px-4 py-2 bg-border hover:bg-bg-hover text-text-primary rounded text-sm font-semibold transition-colors"
                >
                  Cancel & Edit Rules
                </button>

                <div className="flex gap-3">
                  {conflicts.some(c => c.severity === 'error') ? (
                    <button
                      disabled={true}
                      title="Errors must be resolved before deploying"
                      className="px-4 py-2 bg-destructive/40 text-white rounded text-sm font-semibold cursor-not-allowed opacity-50 flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Blocked by Errors
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowConflictModal(false)
                        setConflicts([])
                        deployAcl(true)
                      }}
                      className="px-4 py-2 bg-[#ce9178] text-white hover:bg-[#ce9178]/90 rounded text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Shield className="w-4 h-4" /> Override & Deploy anyway
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
