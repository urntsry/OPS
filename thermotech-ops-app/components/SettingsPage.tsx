'use client'

import { useState, useEffect, useCallback } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import DevTrackerPage from './DevTrackerPage'
import {
  getAllProfiles, getAllTaskDefinitions, updateTaskDefinitionAssignee,
  type Profile, type TaskDefinition
} from '@/lib/api'

interface SettingsPageProps {
  isAdmin?: boolean
}

// ============================================
// PERMISSIONS TAB — Event type permission management
// ============================================
function PermissionsTab() {
  const [users, setUsers] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'department' | 'person'>('department')
  const [deptPermissions, setDeptPermissions] = useState<Record<string, string[]>>({})
  const [personOverrides, setPersonOverrides] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

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
        const profiles = await getAllProfiles()
        setUsers(profiles)
        const depts = [...new Set(profiles.map(p => p.department).filter(Boolean))] as string[]
        setDepartments(depts)

        // Load saved permissions from localStorage (will migrate to DB later)
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
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '400px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '80px' }}>DEPT</th>
                {eventTypes.map(et => (
                  <th key={et.id} style={{ padding: '3px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px' }}>{et.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => {
                const perms = deptPermissions[dept] || eventTypes.map(e => e.id)
                return (
                  <tr key={dept} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                    <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>{dept}</td>
                    {eventTypes.map(et => (
                      <td key={et.id} style={{ padding: '2px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={perms.includes(et.id)}
                          onChange={() => toggleDeptPermission(dept, et.id)}
                          style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
// SETTINGS PAGE — Main component using DepartmentShell
// ============================================
export default function SettingsPage({ isAdmin = false }: SettingsPageProps) {
  const tabs: DepartmentTab[] = [
    { id: 'permissions', label: 'PERMISSIONS', show: isAdmin, component: <PermissionsTab /> },
    { id: 'assignment',  label: 'ASSIGNMENT',  show: true,    component: <AssignmentTab /> },
    { id: 'devtracker',  label: 'DEV TRACKER', show: isAdmin, component: <DevTrackerPage /> },
  ]

  return (
    <DepartmentShell
      departmentId="config"
      departmentName="CONFIG - SETTINGS"
      tabs={tabs}
      defaultTab={isAdmin ? 'permissions' : 'assignment'}
      statusInfo="MODULE: System Configuration"
    />
  )
}
