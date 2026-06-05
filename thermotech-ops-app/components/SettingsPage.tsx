'use client'

import { useState, useEffect, useCallback } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import DevTrackerPage from './DevTrackerPage'
import LineSettingsTab from './LineSettingsTab'
import {
  getAllProfiles, getAllTaskDefinitions, updateTaskDefinitionAssignee,
  type Profile, type TaskDefinition
} from '@/lib/api'
import {
  getDepartments, addDepartment as apiAddDepartment, removeDepartment as apiRemoveDepartment,
  type Department
} from '@/lib/departmentApi'
import { getIssuerOverrides, setIssuerOverrides } from '@/lib/delegationsApi'
import {
  getDepartmentModuleMap, setDepartmentModule, getAllUserOverrides, setUserOverride,
  updateUserRole, adminResetPassword,
} from '@/lib/userAccessApi'
import { DEPARTMENT_GATED_MODULES } from '@/lib/modules'

interface SettingsPageProps {
  isAdmin?: boolean
  userId?: string
  userRole?: string
  userDepartment?: string
  employeeId?: string
}

// ============================================
// PERMISSIONS TAB — Event type permission management
// ============================================
function PermissionsTab() {
  const [users, setUsers] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<{ name: string; id?: string; source: 'profiles' | 'custom' }[]>([])
  const [viewMode, setViewMode] = useState<'department' | 'person'>('department')
  const [deptPermissions, setDeptPermissions] = useState<Record<string, string[]>>({})
  const [personOverrides, setPersonOverrides] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [newDeptName, setNewDeptName] = useState('')
  const [showAddDept, setShowAddDept] = useState(false)
  const [saving, setSaving] = useState(false)

  const eventTypes = [
    { id: 'event', label: '事件' },
    { id: 'meeting', label: '會議' },
    { id: 'assignment', label: '交辦事項' },
    { id: 'public', label: '公共事項' },
    { id: 'visit', label: '客戶拜訪' },
    { id: 'routine', label: '例行公事' },
    { id: 'training', label: '課程進修' },
  ]

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [profiles, dbDepts] = await Promise.all([getAllProfiles(), getDepartments()])
        setUsers(profiles)

        const profileDeptNames = [...new Set(profiles.map(p => p.department).filter(Boolean))] as string[]
        const dbDeptNames = dbDepts.map(d => d.name)

        const merged: { name: string; id?: string; source: 'profiles' | 'custom' }[] = []
        const seen = new Set<string>()

        for (const d of dbDepts) {
          merged.push({ name: d.name, id: d.id, source: 'custom' })
          seen.add(d.name)
        }
        for (const name of profileDeptNames) {
          if (!seen.has(name)) {
            merged.push({ name, source: 'profiles' })
            seen.add(name)
          }
        }
        setDepartments(merged)

        const savedDept = localStorage.getItem('ops_dept_permissions')
        const savedPerson = localStorage.getItem('ops_person_permissions')
        if (savedDept) setDeptPermissions(JSON.parse(savedDept))
        if (savedPerson) setPersonOverrides(JSON.parse(savedPerson))
      } catch (e) {
        console.error('Failed to load:', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  const savePermissions = () => {
    localStorage.setItem('ops_dept_permissions', JSON.stringify(deptPermissions))
    localStorage.setItem('ops_person_permissions', JSON.stringify(personOverrides))
    setToast('Permissions saved')
    setTimeout(() => setToast(null), 2000)
  }

  const handleAddDepartment = async () => {
    const name = newDeptName.trim()
    if (!name) return
    if (departments.some(d => d.name === name)) {
      setToast('Department already exists')
      setTimeout(() => setToast(null), 2000)
      return
    }
    setSaving(true)
    try {
      const created = await apiAddDepartment(name)
      setDepartments(prev => [...prev, { name: created.name, id: created.id, source: 'custom' }])
      setNewDeptName('')
      setShowAddDept(false)
      setToast(`Added: ${name}`)
    } catch (e: any) {
      setToast(`Failed: ${e.message || 'Unknown error'}`)
    }
    setSaving(false)
    setTimeout(() => setToast(null), 2000)
  }

  const handleRemoveDepartment = async (dept: { name: string; id?: string; source: 'profiles' | 'custom' }) => {
    if (dept.source === 'profiles') {
      setToast('Cannot remove — exists in profiles DB')
      setTimeout(() => setToast(null), 2000)
      return
    }
    if (!dept.id) return
    setSaving(true)
    try {
      await apiRemoveDepartment(dept.id)
      setDepartments(prev => prev.filter(d => d.id !== dept.id))
      const updatedPerms = { ...deptPermissions }
      delete updatedPerms[dept.name]
      setDeptPermissions(updatedPerms)
      setToast(`Removed: ${dept.name}`)
    } catch (e: any) {
      setToast(`Failed: ${e.message || 'Unknown error'}`)
    }
    setSaving(false)
    setTimeout(() => setToast(null), 2000)
  }

  const isCustomDept = (dept: { source: string }) => dept.source === 'custom'

  const toggleDeptPermission = (dept: string, eventTypeId: string) => {
    const current = deptPermissions[dept] || eventTypes.map(e => e.id)
    const updated = current.includes(eventTypeId)
      ? current.filter(id => id !== eventTypeId)
      : [...current, eventTypeId]
    setDeptPermissions({ ...deptPermissions, [dept]: updated })
  }

  const togglePersonPermission = (userId: string, eventTypeId: string) => {
    const current = personOverrides[userId] || []
    const updated = current.includes(eventTypeId)
      ? current.filter(id => id !== eventTypeId)
      : [...current, eventTypeId]
    setPersonOverrides({ ...personOverrides, [userId]: updated })
  }

  const clearPersonOverride = (userId: string) => {
    const updated = { ...personOverrides }
    delete updated[userId]
    setPersonOverrides(updated)
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>

  return (
    <div>
      {toast && (
        <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{toast}</span>
          <span onClick={() => setToast(null)} style={{ cursor: 'pointer' }}>×</span>
        </div>
      )}

      {/* View mode toggle + Save */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center' }}>
        <button onClick={() => setViewMode('department')} className="btn" style={{ fontSize: '9px', padding: '2px 8px', fontWeight: viewMode === 'department' ? 'bold' : 'normal', backgroundColor: viewMode === 'department' ? 'var(--active-bg)' : 'var(--bg-window)', color: viewMode === 'department' ? '#FFF' : 'var(--text-primary)' }}>BY DEPARTMENT</button>
        <button onClick={() => setViewMode('person')} className="btn" style={{ fontSize: '9px', padding: '2px 8px', fontWeight: viewMode === 'person' ? 'bold' : 'normal', backgroundColor: viewMode === 'person' ? 'var(--active-bg)' : 'var(--bg-window)', color: viewMode === 'person' ? '#FFF' : 'var(--text-primary)' }}>BY PERSON</button>
        <div style={{ flex: 1 }} />
        <button onClick={savePermissions} className="btn" style={{ fontSize: '9px', padding: '2px 10px', fontWeight: 'bold' }}>SAVE</button>
      </div>

      {/* Department view */}
      {viewMode === 'department' && (
        <>
          <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '360px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'var(--bg-window)' }}>
                  <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '100px' }}>DEPT</th>
                  {eventTypes.map(et => (
                    <th key={et.id} style={{ padding: '3px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px' }}>{et.label}</th>
                  ))}
                  <th style={{ padding: '3px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '24px', fontSize: '8px' }}>DEL</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => {
                  const perms = deptPermissions[dept.name] || eventTypes.map(e => e.id)
                  const custom = isCustomDept(dept)
                  return (
                    <tr key={dept.id || dept.name} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                      <td style={{ padding: '3px 4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {dept.name}
                        {custom && <span style={{ fontSize: '7px', color: 'var(--accent-teal)', fontWeight: 'normal' }}>DB</span>}
                      </td>
                      {eventTypes.map(et => (
                        <td key={et.id} style={{ padding: '2px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={perms.includes(et.id)}
                            onChange={() => toggleDeptPermission(dept.name, et.id)}
                            style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '2px', textAlign: 'center' }}>
                        {custom && (
                          <button
                            onClick={() => handleRemoveDepartment(dept)}
                            disabled={saving}
                            style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 3px', outline: 'none', lineHeight: '14px' }}
                            title={`Remove ${dept.name}`}
                          >×</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Add department */}
          <div style={{ marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
            {showAddDept ? (
              <>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddDepartment(); if (e.key === 'Escape') { setShowAddDept(false); setNewDeptName('') } }}
                  placeholder="部門名稱..."
                  autoFocus
                  disabled={saving}
                  className="inset"
                  style={{ fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', width: '120px' }}
                />
                <button onClick={handleAddDepartment} className="btn" disabled={saving} style={{ fontSize: '9px', padding: '2px 6px' }}>{saving ? '...' : 'ADD'}</button>
                <button onClick={() => { setShowAddDept(false); setNewDeptName('') }} className="btn" style={{ fontSize: '9px', padding: '2px 6px' }}>ESC</button>
              </>
            ) : (
              <button onClick={() => setShowAddDept(true)} className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>+ ADD DEPT</button>
            )}
            <span style={{ fontSize: '7px', color: 'var(--text-muted)', marginLeft: '4px' }}>DB = Supabase (synced)</span>
          </div>
        </>
      )}

      {/* Person view */}
      {viewMode === 'person' && (
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '400px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '50px' }}>ID</th>
                <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '60px' }}>NAME</th>
                <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '50px' }}>DEPT</th>
                {eventTypes.map(et => (
                  <th key={et.id} style={{ padding: '3px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px' }}>{et.label}</th>
                ))}
                <th style={{ padding: '3px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '30px', fontSize: '8px' }}>RST</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const hasOverride = !!personOverrides[user.id]
                const deptPerms = deptPermissions[user.department] || eventTypes.map(e => e.id)
                const effectivePerms = hasOverride ? personOverrides[user.id] : deptPerms
                return (
                  <tr key={user.id} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)', backgroundColor: hasOverride ? 'rgba(0,128,128,0.05)' : undefined }}>
                    <td style={{ padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)' }}>{user.employee_id}</td>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</td>
                    <td style={{ padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)' }}>{user.department}</td>
                    {eventTypes.map(et => (
                      <td key={et.id} style={{ padding: '2px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={effectivePerms.includes(et.id)}
                          onChange={() => togglePersonPermission(user.id, et.id)}
                          style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '2px', textAlign: 'center' }}>
                      {hasOverride && (
                        <button onClick={() => clearPersonOverride(user.id)} style={{ fontSize: '7px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 2px', outline: 'none' }}>×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '4px', fontSize: '8px', color: 'var(--text-muted)' }}>
            Highlighted rows have individual overrides. Click [×] RST to reset to department default.
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// ASSIGNMENT TAB — Task assignment management
// ============================================
function AssignmentTab() {
  const [users, setUsers] = useState<Profile[]>([])
  const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [profiles, tasks] = await Promise.all([getAllProfiles(), getAllTaskDefinitions()])
        setUsers(profiles)
        setTaskDefs(tasks.filter(t => t.item_type !== 'capability'))
        if (profiles.length > 0) setSelectedUserId(profiles[0].id)
      } catch (e) {
        console.error('Load failed:', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  const selectedUser = users.find(u => u.id === selectedUserId)
  const isAssigned = (task: TaskDefinition) => task.default_assignee_id === selectedUserId || task.backup_assignee_id === selectedUserId

  const toggleAssignment = (task: TaskDefinition) => {
    setTaskDefs(prev => prev.map(t => {
      if (t.id !== task.id) return t
      if (t.default_assignee_id === selectedUserId) return { ...t, default_assignee_id: undefined, backup_assignee_id: selectedUserId }
      if (t.backup_assignee_id === selectedUserId) return { ...t, backup_assignee_id: undefined }
      return { ...t, default_assignee_id: selectedUserId }
    }))
  }

  const getRole = (task: TaskDefinition) => {
    if (task.default_assignee_id === selectedUserId) return '主辦'
    if (task.backup_assignee_id === selectedUserId) return '協辦'
    return ''
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const userTasks = taskDefs.filter(t => t.default_assignee_id === selectedUserId || t.backup_assignee_id === selectedUserId)
      for (const task of userTasks) {
        await updateTaskDefinitionAssignee(task.id, task.default_assignee_id || null, task.backup_assignee_id || null)
      }
      setToast('Saved')
      setTimeout(() => setToast(null), 2000)
    } catch { setToast('Save failed') }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>

  return (
    <div>
      {toast && <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px' }}>{toast}</div>}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
        <select className="inset" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ fontSize: '10px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.employee_id})</option>)}
        </select>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{selectedUser?.department}</span>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={handleSave} disabled={saving} style={{ fontSize: '9px', padding: '2px 10px' }}>{saving ? 'SAVING...' : 'SAVE'}</button>
      </div>

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '400px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)' }}>
              <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '30px' }}>SEL</th>
              <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>TASK</th>
              <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '40px' }}>ROLE</th>
              <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '50px' }}>FREQ</th>
            </tr>
          </thead>
          <tbody>
            {taskDefs.map(task => (
              <tr key={task.id} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)', cursor: 'pointer' }} onClick={() => toggleAssignment(task)}>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  <input type="checkbox" checked={isAssigned(task)} readOnly style={{ width: '12px', height: '12px', pointerEvents: 'none' }} />
                </td>
                <td style={{ padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', color: getRole(task) === '主辦' ? 'var(--accent-blue)' : 'var(--accent-teal)' }}>{getRole(task)}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px', color: 'var(--text-muted)' }}>{task.frequency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// DELEGATION TAB — 交辦權限管理（誰可以發出正式交辦事項）
// ============================================
function DelegationTab() {
  const [users, setUsers] = useState<Profile[]>([])
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const profiles = await getAllProfiles()
        setUsers(profiles)
        setOverrides(getIssuerOverrides())
      } catch (e) {
        console.error('Failed to load:', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  const isIssuer = (u: Profile): boolean => {
    if (u.id in overrides) return overrides[u.id]
    return u.role === 'admin'
  }

  const toggleIssuer = (u: Profile) => {
    const cur = isIssuer(u)
    const next = { ...overrides, [u.id]: !cur }
    setOverrides(next)
  }

  const resetUser = (u: Profile) => {
    const next = { ...overrides }
    delete next[u.id]
    setOverrides(next)
  }

  const handleSave = () => {
    setIssuerOverrides(overrides)
    setToast('交辦權限已儲存')
    setTimeout(() => setToast(null), 2000)
  }

  const issuerCount = users.filter(u => isIssuer(u)).length

  if (loading) {
    return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>
  }

  return (
    <div>
      {/* Info + summary */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)' }}>
        <span>具交辦權限: <b style={{ color: 'var(--accent-blue)' }}>{issuerCount}</b> 人</span>
        <span>預設: admin 角色</span>
        <span>可個別覆寫</span>
        <div style={{ flex: 1 }} />
        {toast && <span style={{ color: 'var(--status-success)' }}>{toast}</span>}
        <button onClick={handleSave} className="btn" style={{ fontSize: '8px', padding: '1px 8px', fontWeight: 'bold' }}>SAVE</button>
      </div>

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)' }}>
              <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold', width: '60px' }}>姓名</th>
              <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold', width: '50px' }}>員編</th>
              <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold', width: '55px' }}>部門</th>
              <th style={{ padding: '3px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold', width: '40px' }}>角色</th>
              <th style={{ padding: '3px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold', width: '40px' }}>權限</th>
              <th style={{ padding: '3px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold', width: '50px' }}>狀態</th>
            </tr>
          </thead>
          <tbody>
            {users.sort((a, b) => a.employee_id.localeCompare(b.employee_id)).map(u => {
              const allowed = isIssuer(u)
              const overridden = u.id in overrides
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{u.full_name}</td>
                  <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{u.employee_id}</td>
                  <td style={{ padding: '2px 4px' }}>{u.department}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px', color: u.role === 'admin' ? 'var(--status-error)' : u.role === 'supervisor' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                    {u.role === 'admin' ? '管理' : u.role === 'supervisor' ? '行政' : '作業員'}
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                    <input type="checkbox" checked={allowed} onChange={() => toggleIssuer(u)} style={{ width: '12px', height: '12px', cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px' }}>
                    {overridden ? (
                      <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--status-warning)' }}>覆寫</span>
                        <button onClick={() => resetUser(u)} style={{ fontSize: '7px', padding: '0 2px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', cursor: 'pointer' }} title="還原">↶</button>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>預設</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// ACCOUNT TAB — 自助修改密碼
// ============================================
function AccountTab({ employeeId }: { employeeId?: string }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const empId = employeeId || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}').employeeId : '')

  const submit = async () => {
    setMsg(null)
    if (newPw.length < 6) { setMsg({ text: '新密碼長度至少 6 碼', ok: false }); return }
    if (newPw !== confirmPw) { setMsg({ text: '兩次新密碼不一致', ok: false }); return }
    if (newPw === oldPw) { setMsg({ text: '新密碼不可與舊密碼相同', ok: false }); return }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: empId, old_password: oldPw, new_password: newPw }),
      })
      const json = await res.json()
      if (!res.ok) { setMsg({ text: json.error || '修改失敗', ok: false }); setBusy(false); return }
      setMsg({ text: '密碼已更新', ok: true })
      setOldPw(''); setNewPw(''); setConfirmPw('')
    } catch {
      setMsg({ text: '系統錯誤', ok: false })
    }
    setBusy(false)
  }

  const inputStyle: React.CSSProperties = { width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '4px 6px', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '2px' }

  return (
    <div style={{ maxWidth: '320px', fontFamily: 'monospace' }}>
      <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>修改我的密碼（員工編號：{empId || '—'}）</div>
      {msg && <div style={{ padding: '4px 8px', marginBottom: '6px', fontSize: '9px', background: msg.ok ? 'var(--accent-teal)' : '#FFCCCC', color: msg.ok ? '#FFF' : '#CC0000' }}>{msg.text}</div>}
      <div style={{ marginBottom: '6px' }}>
        <label style={labelStyle}>目前密碼</label>
        <input type="password" className="inset" value={oldPw} onChange={e => setOldPw(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '6px' }}>
        <label style={labelStyle}>新密碼（至少 6 碼）</label>
        <input type="password" className="inset" value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>確認新密碼</label>
        <input type="password" className="inset" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={inputStyle} />
      </div>
      <button className="btn" onClick={submit} disabled={busy} style={{ fontSize: '10px', padding: '4px 12px', fontWeight: 'bold' }}>{busy ? '處理中...' : '更新密碼'}</button>
    </div>
  )
}

// ============================================
// ACCESS TAB — 人員角色 / 模組存取 / 密碼重設
// ============================================
function AccessTab({ isAdmin, userDepartment, employeeId }: { isAdmin: boolean; userRole: string; userDepartment: string; employeeId: string }) {
  const [users, setUsers] = useState<Profile[]>([])
  const [deptMap, setDeptMap] = useState<Record<string, string[]>>({})
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({}) // profileId -> moduleId -> allowed
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ name: string; pw: string } | null>(null)
  const [section, setSection] = useState<'people' | 'dept'>('people')

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [profiles, dm, ov] = await Promise.all([getAllProfiles(), getDepartmentModuleMap(), getAllUserOverrides()])
      setUsers(profiles)
      setDeptMap(dm)
      const ovMap: Record<string, Record<string, boolean>> = {}
      for (const o of ov) {
        if (!ovMap[o.profile_id]) ovMap[o.profile_id] = {}
        ovMap[o.profile_id][o.module_id] = o.allowed
      }
      setOverrides(ovMap)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // 主管只看自己部門；admin 看全部
  const visibleUsers = isAdmin ? users : users.filter(u => u.department === userDepartment)
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))] as string[]

  const handleRole = async (u: Profile, role: 'admin' | 'manager' | 'user') => {
    try { await updateUserRole(u.id, role); setUsers(prev => prev.map(p => p.id === u.id ? { ...p, role } : p)); flash(`${u.full_name} → ${role}`) }
    catch (e: any) { flash('失敗：' + (e.message || '')) }
  }

  // 計算某人某模組「目前是否有效」（部門預設 + override）
  const effective = (u: Profile, moduleId: string): boolean => {
    const ov = overrides[u.id]?.[moduleId]
    if (ov === true) return true
    if (ov === false) return false
    return (deptMap[u.department || ''] || []).includes(moduleId)
  }
  const overrideState = (u: Profile, moduleId: string): 'default' | 'on' | 'off' => {
    const ov = overrides[u.id]?.[moduleId]
    if (ov === true) return 'on'
    if (ov === false) return 'off'
    return 'default'
  }

  // 點擊循環：default → on → off → default
  const cycleOverride = async (u: Profile, moduleId: string) => {
    const cur = overrideState(u, moduleId)
    const next: boolean | null = cur === 'default' ? true : cur === 'on' ? false : null
    try {
      await setUserOverride(u.id, moduleId, next)
      setOverrides(prev => {
        const copy = { ...prev, [u.id]: { ...(prev[u.id] || {}) } }
        if (next === null) delete copy[u.id][moduleId]
        else copy[u.id][moduleId] = next
        return copy
      })
    } catch (e: any) { flash('失敗：' + (e.message || '')) }
  }

  const toggleDeptModule = async (dept: string, moduleId: string) => {
    const enabled = !(deptMap[dept] || []).includes(moduleId)
    try {
      await setDepartmentModule(dept, moduleId, enabled)
      setDeptMap(prev => {
        const list = new Set(prev[dept] || [])
        if (enabled) list.add(moduleId); else list.delete(moduleId)
        return { ...prev, [dept]: Array.from(list) }
      })
    } catch (e: any) { flash('失敗：' + (e.message || '')) }
  }

  const handleReset = async (u: Profile) => {
    if (!confirm(`確定重設 ${u.full_name}(${u.employee_id}) 的密碼？\n系統會產生新密碼並顯示一次。`)) return
    try {
      const r = await adminResetPassword(employeeId, u.employee_id)
      setResetResult({ name: `${r.full_name}(${u.employee_id})`, pw: r.password })
    } catch (e: any) { flash('重設失敗：' + (e.message || '')) }
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>

  const ovColor = (s: 'default' | 'on' | 'off') => s === 'on' ? 'var(--accent-teal)' : s === 'off' ? 'var(--accent-red)' : 'var(--text-muted)'
  const ovLabel = (u: Profile, m: string) => {
    const s = overrideState(u, m)
    const eff = effective(u, m)
    if (s === 'on') return '＋'
    if (s === 'off') return '－'
    return eff ? '✓' : '·'
  }

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {toast && <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px' }}>{toast}</div>}

      {/* 重設密碼結果（顯示一次）*/}
      {resetResult && (
        <div style={{ padding: '8px', marginBottom: '6px', background: 'var(--bg-inset)', border: '2px solid var(--accent-teal)' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>已重設 {resetResult.name} 的密碼</div>
          <div style={{ fontSize: '9px', marginBottom: '4px' }}>請複製並交給該員工，此密碼只顯示這一次：</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', padding: '4px 8px', background: 'var(--bg-window)', display: 'inline-block', userSelect: 'all' }}>{resetResult.pw}</div>
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px' }}>該員工下次登入時會被要求改成自己的密碼。</div>
          <button className="btn" onClick={() => setResetResult(null)} style={{ fontSize: '9px', padding: '2px 8px', marginTop: '6px' }}>關閉</button>
        </div>
      )}

      {/* Section toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        <button className="btn" onClick={() => setSection('people')} style={{ fontSize: '9px', padding: '2px 8px', fontWeight: section === 'people' ? 'bold' : 'normal' }}>人員 & 模組</button>
        {isAdmin && <button className="btn" onClick={() => setSection('dept')} style={{ fontSize: '9px', padding: '2px 8px', fontWeight: section === 'dept' ? 'bold' : 'normal' }}>部門模組對應</button>}
      </div>

      {section === 'dept' && isAdmin && (
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'auto', maxHeight: '420px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', position: 'sticky', left: 0 }}>部門</th>
                {DEPARTMENT_GATED_MODULES.map(m => (
                  <th key={m.id} style={{ padding: '3px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px' }}>{m.id}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept} style={{ borderBottom: '1px solid var(--table-border)' }}>
                  <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{dept}</td>
                  {DEPARTMENT_GATED_MODULES.map(m => (
                    <td key={m.id} style={{ padding: '2px', textAlign: 'center' }}>
                      <input type="checkbox" checked={(deptMap[dept] || []).includes(m.id)} onChange={() => toggleDeptModule(dept, m.id)} style={{ width: '12px', height: '12px', cursor: 'pointer' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '4px', fontSize: '8px', color: 'var(--text-muted)' }}>勾選 = 該部門可見此模組（個人可再用 override 微調）。</div>
        </div>
      )}

      {section === 'people' && (
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'auto', maxHeight: '420px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>ID</th>
                <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>姓名</th>
                <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>部門</th>
                <th style={{ padding: '3px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)' }}>角色</th>
                {DEPARTMENT_GATED_MODULES.map(m => (
                  <th key={m.id} style={{ padding: '3px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px' }}>{m.id}</th>
                ))}
                <th style={{ padding: '3px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)' }}>密碼</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--table-border)' }}>
                  <td style={{ padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)' }}>{u.employee_id}</td>
                  <td style={{ padding: '2px 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{u.full_name}</td>
                  <td style={{ padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)' }}>{u.department}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                    {isAdmin ? (
                      <select value={u.role} onChange={e => handleRole(u, e.target.value as any)} className="inset" style={{ fontSize: '8px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                        <option value="user">user</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{u.role}</span>
                    )}
                  </td>
                  {DEPARTMENT_GATED_MODULES.map(m => {
                    const s = overrideState(u, m.id)
                    return (
                      <td key={m.id} style={{ padding: '2px', textAlign: 'center' }}>
                        <button onClick={() => cycleOverride(u, m.id)} title={s === 'default' ? '部門預設' : s === 'on' ? '個人額外開放' : '個人額外關閉'}
                          style={{ width: '16px', height: '16px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: ovColor(s), outline: 'none' }}>
                          {ovLabel(u, m.id)}
                        </button>
                      </td>
                    )
                  })}
                  <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                    <button className="btn" onClick={() => handleReset(u)} style={{ fontSize: '8px', padding: '1px 4px' }}>重設</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '4px', fontSize: '8px', color: 'var(--text-muted)' }}>
            模組欄：✓ 部門預設可見 · 點一下 ＋ 個人額外開放 · 再點 － 個人關閉 · 再點回預設。
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// SETTINGS PAGE — Main component using DepartmentShell
// ============================================
export default function SettingsPage({ isAdmin = false, userId, userRole = 'user', userDepartment = '', employeeId = '' }: SettingsPageProps) {
  const isManager = userRole === 'manager'
  const tabs: DepartmentTab[] = [
    { id: 'account',     label: '我的帳號',    show: true,                 component: <AccountTab employeeId={employeeId} /> },
    { id: 'access',      label: 'ACCESS 存取', show: isAdmin || isManager, component: <AccessTab isAdmin={isAdmin} userRole={userRole} userDepartment={userDepartment} employeeId={employeeId} /> },
    { id: 'permissions', label: 'PERMISSIONS', show: isAdmin, component: <PermissionsTab /> },
    { id: 'delegation',  label: 'DELEGATION',  show: isAdmin, component: <DelegationTab /> },
    { id: 'assignment',  label: 'ASSIGNMENT',  show: true,    component: <AssignmentTab /> },
    { id: 'line',        label: 'LINE 通知',   show: true,    component: <LineSettingsTab userId={userId} /> },
    { id: 'devtracker',  label: 'DEV TRACKER', show: isAdmin, component: <DevTrackerPage /> },
  ]

  return (
    <DepartmentShell
      departmentId="config"
      departmentName="CONFIG - SETTINGS"
      tabs={tabs}
      defaultTab="account"
      statusInfo="MODULE: System Configuration"
    />
  )
}
