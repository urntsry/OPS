'use client'

import { useState, useEffect } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import { supabase } from '@/lib/api'
import type { Profile } from '@/lib/api'

interface ManagerDashboardProps {
  userProfile?: any
}

interface EmployeeRoutineStatus {
  profile: Profile
  daily: { total: number; completed: number }
  weekly: { total: number; completed: number }
  monthly: { total: number; completed: number }
  overdue: number
}

interface DelegationOverview {
  id: string
  title: string
  assignee_name: string
  assigner_name: string
  status: string
  due_date: string | null
  created_at: string
}

export default function ManagerDashboard({ userProfile }: ManagerDashboardProps) {
  const [employees, setEmployees] = useState<EmployeeRoutineStatus[]>([])
  const [delegations, setDelegations] = useState<DelegationOverview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      await Promise.all([loadRoutineStatus(), loadDelegations()])
    } catch (err) {
      console.error('[Manager] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadRoutineStatus() {
    const today = new Date().toISOString().split('T')[0]
    const weekStart = getWeekStart(today)
    const monthStart = today.substring(0, 8) + '01'

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('department')
      .order('full_name')

    if (!profiles) return

    const { data: assignments } = await supabase
      .from('daily_assignments')
      .select('user_id, status, assigned_date')
      .gte('assigned_date', monthStart)

    const statusMap: EmployeeRoutineStatus[] = profiles.map(p => {
      const userAssignments = (assignments || []).filter(a => a.user_id === p.id)
      const dailyAll = userAssignments.filter(a => a.assigned_date === today)
      const weeklyAll = userAssignments.filter(a => a.assigned_date >= weekStart)
      const monthlyAll = userAssignments
      const overdue = userAssignments.filter(a => a.status === 'pending' && a.assigned_date < today)

      return {
        profile: p as Profile,
        daily: { total: dailyAll.length, completed: dailyAll.filter(a => a.status === 'completed' || a.status === 'verified').length },
        weekly: { total: weeklyAll.length, completed: weeklyAll.filter(a => a.status === 'completed' || a.status === 'verified').length },
        monthly: { total: monthlyAll.length, completed: monthlyAll.filter(a => a.status === 'completed' || a.status === 'verified').length },
        overdue: overdue.length,
      }
    })
    setEmployees(statusMap)
  }

  async function loadDelegations() {
    const { data } = await supabase
      .from('delegations')
      .select('id, title, status, due_date, created_at, assignee:profiles!assignee_id(full_name), assigner:profiles!assigner_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setDelegations(data.map((d: any) => ({
        id: d.id,
        title: d.title,
        assignee_name: d.assignee?.full_name || '--',
        assigner_name: d.assigner?.full_name || '--',
        status: d.status,
        due_date: d.due_date,
        created_at: d.created_at,
      })))
    }
  }

  function getWeekStart(dateStr: string): string {
    const d = new Date(dateStr)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return d.toISOString().split('T')[0]
  }

  const totalOverdue = employees.reduce((sum, e) => sum + e.overdue, 0)
  const activeDelegations = delegations.filter(d => d.status !== 'completed' && d.status !== 'cancelled').length

  const tabs: DepartmentTab[] = [
    { id: 'routine', label: 'ROUTINE', show: true, badge: totalOverdue > 0 ? totalOverdue : undefined, component: <RoutineTab employees={employees} loading={loading} /> },
    { id: 'delegations', label: 'DELEGATIONS', show: true, badge: activeDelegations > 0 ? activeDelegations : undefined, component: <DelegationsTab delegations={delegations} loading={loading} /> },
    { id: 'timeline', label: 'TIMELINE', show: true, component: <TimelineTab delegations={delegations} loading={loading} /> },
  ]

  return (
    <DepartmentShell
      departmentId="manager"
      departmentName="MANAGER - 管理監控"
      tabs={tabs}
      defaultTab="routine"
      statusInfo={`Employees: ${employees.length} | Overdue: ${totalOverdue} | Active: ${activeDelegations}`}
    />
  )
}

// ---- Shared helpers ----
const thStyle: React.CSSProperties = {
  padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold',
}

function getCompletionRate(stat: { total: number; completed: number }): { rate: number; color: string } {
  if (stat.total === 0) return { rate: -1, color: 'var(--text-muted)' }
  const rate = Math.round((stat.completed / stat.total) * 100)
  if (rate >= 90) return { rate, color: '#008000' }
  if (rate >= 60) return { rate, color: 'var(--status-warning)' }
  return { rate, color: 'var(--status-error)' }
}

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: '#808080', in_progress: 'var(--accent-blue)', completed: '#008000', overdue: 'var(--status-error)', cancelled: '#808080',
  }
  return { color: colors[status] || '#808080', label: status.toUpperCase() }
}

// ---- ROUTINE TAB ----
function RoutineTab({ employees, loading }: { employees: EmployeeRoutineStatus[]; loading: boolean }) {
  const [filterDept, setFilterDept] = useState('')
  const departments = [...new Set(employees.map(e => e.profile.department).filter(Boolean))]
  const filtered = filterDept ? employees.filter(e => e.profile.department === filterDept) : employees

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center' }}>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 2px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}>
          <option value="">ALL DEPT</option>
          {departments.map(d => <option key={d} value={d!}>{d}</option>)}
        </select>
        <span>顯示 <b style={{ color: 'var(--text-primary)' }}>{filtered.length}</b> 人</span>
      </div>

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)' }}>
              <th style={thStyle}>姓名</th>
              <th style={{ ...thStyle, width: '55px' }}>部門</th>
              <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>今日</th>
              <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>本週</th>
              <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>本月</th>
              <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>逾期</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const daily = getCompletionRate(emp.daily)
              const weekly = getCompletionRate(emp.weekly)
              const monthly = getCompletionRate(emp.monthly)
              return (
                <tr key={emp.profile.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{emp.profile.full_name}</td>
                  <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{emp.profile.department || '--'}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', color: daily.color, fontWeight: 'bold' }}>
                    {daily.rate < 0 ? '--' : `${daily.rate}%`}
                    <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}> ({emp.daily.completed}/{emp.daily.total})</span>
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', color: weekly.color, fontWeight: 'bold' }}>
                    {weekly.rate < 0 ? '--' : `${weekly.rate}%`}
                    <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}> ({emp.weekly.completed}/{emp.weekly.total})</span>
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', color: monthly.color, fontWeight: 'bold' }}>
                    {monthly.rate < 0 ? '--' : `${monthly.rate}%`}
                    <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}> ({emp.monthly.completed}/{emp.monthly.total})</span>
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', color: emp.overdue > 0 ? 'var(--status-error)' : '#008000' }}>
                    {emp.overdue > 0 ? emp.overdue : '✓'}
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

// ---- DELEGATIONS TAB ----
function DelegationsTab({ delegations, loading }: { delegations: DelegationOverview[]; loading: boolean }) {
  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>
  if (delegations.length === 0) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>尚無交辦紀錄</div>

  return (
    <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: 'var(--bg-window)' }}>
            <th style={thStyle}>主題</th>
            <th style={{ ...thStyle, width: '55px' }}>發辦</th>
            <th style={{ ...thStyle, width: '55px' }}>承辦</th>
            <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>狀態</th>
            <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>截止日</th>
            <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>建立日</th>
          </tr>
        </thead>
        <tbody>
          {delegations.map(d => {
            const badge = getStatusBadge(d.status)
            const isOverdue = d.due_date && new Date(d.due_date) < new Date() && d.status !== 'completed'
            return (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light)', background: isOverdue ? 'rgba(200,0,0,0.05)' : 'transparent' }}>
                <td style={{ padding: '2px 4px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</td>
                <td style={{ padding: '2px 4px' }}>{d.assigner_name}</td>
                <td style={{ padding: '2px 4px' }}>{d.assignee_name}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', color: badge.color, fontWeight: 'bold', fontSize: '8px' }}>{badge.label}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', color: isOverdue ? 'var(--status-error)' : 'var(--text-muted)' }}>{d.due_date || '--'}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>{d.created_at?.substring(0, 10) || '--'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---- TIMELINE TAB ----
function TimelineTab({ delegations, loading }: { delegations: DelegationOverview[]; loading: boolean }) {
  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>
  if (delegations.length === 0) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>尚無資料</div>

  return (
    <div style={{ padding: '6px', maxHeight: '420px', overflowY: 'auto' }}>
      {delegations.slice(0, 20).map((d, idx) => (
        <div key={d.id} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start', fontSize: '9px', fontFamily: 'monospace' }}>
          <div style={{ width: '68px', flexShrink: 0, textAlign: 'right', color: 'var(--text-muted)', fontSize: '8px', paddingTop: '2px' }}>
            {d.created_at?.substring(0, 10)}
          </div>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusBadge(d.status).color, flexShrink: 0, marginTop: '3px' }} />
          <div style={{ flex: 1, borderLeft: idx < 19 ? '1px solid var(--border-light)' : 'none', paddingLeft: '8px', paddingBottom: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>{d.title}</div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
              {d.assigner_name} → {d.assignee_name}
              {d.due_date && <span> | 截止: {d.due_date}</span>}
              <span style={{ color: getStatusBadge(d.status).color, marginLeft: '6px' }}>[{d.status.toUpperCase()}]</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
