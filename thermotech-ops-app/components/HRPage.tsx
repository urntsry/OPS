'use client'

import { useState, useEffect } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import AnnouncementManagementPage from './AnnouncementManagementPage'
import AnnouncementReviewPage from './AnnouncementReviewPage'
import HRNotificationPage from './HRNotificationPage'
import { getPendingBulletins } from '@/lib/bulletinApi'
import { getHRProfiles, getHREvents, getUpcomingExpirations, updateHRProfile, createHREvent, getLineBindingStatus, unbindLineUser, type HRProfile, type HREvent, type ExpirationAlert, type LineBindingEntry } from '@/lib/hrApi'

interface HRPageProps {
  isAdmin?: boolean
  userProfile?: any
}

const hrThStyle: React.CSSProperties = {
  padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold',
}

// ============================================
// HR Dashboard — overview / quick stats
// ============================================
function HRDashboard() {
  const [stats, setStats] = useState({ employees: 0, expiring: 0, events: 0 })
  const [expirations, setExpirations] = useState<ExpirationAlert[]>([])
  const [recentEvents, setRecentEvents] = useState<HREvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [profiles, expData, events] = await Promise.all([
        getHRProfiles(true),
        getUpcomingExpirations(),
        getHREvents(),
      ])
      setStats({ employees: profiles.length, expiring: expData.length, events: events.length })
      setExpirations(expData.slice(0, 5))
      setRecentEvents(events.slice(0, 5))
    } catch (err) {
      console.error('[HR Dashboard] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function getExpiryLabel(type: string): string {
    switch (type) {
      case 'labor_insurance': return '勞保'
      case 'health_insurance': return '健保'
      case 'contract': return '合約'
      default: return type
    }
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  return (
    <div>
      {/* Summary row — inline text */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '6px', fontSize: '8px', color: 'var(--text-muted)' }}>
        <span>Employees: <b style={{ color: 'var(--accent-blue)' }}>{stats.employees}</b></span>
        <span>Expiring(30d): <b style={{ color: 'var(--status-warning)' }}>{stats.expiring}</b></span>
        <span>Events(30d): <b style={{ color: 'var(--text-primary)' }}>{stats.events}</b></span>
      </div>

      {/* Expiration Alerts */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '2px' }}>EXPIRATION ALERTS - 到期提醒（30天內）</div>
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '180px', overflow: 'hidden auto' }}>
          {expirations.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>30天內無到期項目</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: 'var(--bg-window)' }}>
                  <th style={hrThStyle}>姓名</th>
                  <th style={{ ...hrThStyle, width: '60px' }}>部門</th>
                  <th style={{ ...hrThStyle, width: '50px', textAlign: 'center' }}>類型</th>
                  <th style={{ ...hrThStyle, width: '80px', textAlign: 'center' }}>到期日</th>
                </tr>
              </thead>
              <tbody>
                {expirations.map((exp, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{exp.full_name}</td>
                    <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{exp.department || '--'}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--status-warning)', fontSize: '8px' }}>{getExpiryLabel(exp.expiry_type)}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--status-error)' }}>{exp.expiry_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Events */}
      <div>
        <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '2px' }}>RECENT EVENTS - 近期人事異動</div>
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '200px', overflow: 'hidden auto' }}>
          {recentEvents.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>尚無人事記錄</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: 'var(--bg-window)' }}>
                  <th style={{ ...hrThStyle, width: '80px' }}>日期</th>
                  <th style={hrThStyle}>姓名</th>
                  <th style={{ ...hrThStyle, width: '60px', textAlign: 'center' }}>類型</th>
                  <th style={hrThStyle}>說明</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map(ev => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{ev.event_date}</td>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{(ev.profile as any)?.full_name || '--'}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--accent-blue)', fontSize: '8px' }}>{ev.event_type}</td>
                    <td style={{ padding: '2px 4px' }}>{ev.description || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// HR Records — employee data management
// ============================================
function HRRecords() {
  const [profiles, setProfiles] = useState<HRProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<HRProfile>>({})

  useEffect(() => { loadProfiles() }, [showAll])

  async function loadProfiles() {
    setLoading(true)
    try {
      const data = await getHRProfiles(!showAll)
      setProfiles(data)
    } catch (err) {
      console.error('[HR Records]', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = profiles.filter(p => {
    if (!filter) return true
    return p.full_name.includes(filter) || p.employee_id.includes(filter) || (p.department && p.department.includes(filter))
  })

  function startEdit(profile: HRProfile) {
    setEditingId(profile.id)
    setEditForm({
      hire_date: profile.hire_date,
      birthday: profile.birthday,
      phone: profile.phone,
      emergency_contact: profile.emergency_contact,
      emergency_phone: profile.emergency_phone,
      labor_insurance_date: profile.labor_insurance_date,
      health_insurance_date: profile.health_insurance_date,
      contract_expiry: profile.contract_expiry,
      nationality: profile.nationality,
      notes: profile.notes,
    })
  }

  async function saveEdit() {
    if (!editingId) return
    try {
      await updateHRProfile(editingId, editForm)
      setEditingId(null)
      loadProfiles()
    } catch (err) {
      console.error('[HR Records] Save error:', err)
    }
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="搜尋..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', width: '100px' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} style={{ width: '10px', height: '10px' }} />
          含離職
        </label>
        <span style={{ marginLeft: 'auto' }}>顯示 <b style={{ color: 'var(--text-primary)' }}>{filtered.length}</b> 筆</span>
      </div>

      {/* Table */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)' }}>
              <th style={{ ...hrThStyle, width: '50px' }}>編號</th>
              <th style={{ ...hrThStyle, width: '60px' }}>姓名</th>
              <th style={{ ...hrThStyle, width: '55px' }}>部門</th>
              <th style={{ ...hrThStyle, width: '70px' }}>到職日</th>
              <th style={{ ...hrThStyle, width: '70px' }}>勞保到期</th>
              <th style={{ ...hrThStyle, width: '70px' }}>健保到期</th>
              <th style={{ ...hrThStyle, width: '70px' }}>合約到期</th>
              <th style={{ ...hrThStyle, width: '35px', textAlign: 'center' }}>OP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)', opacity: p.is_active ? 1 : 0.5 }}>
                <td style={{ padding: '2px 4px' }}>{p.employee_id}</td>
                <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{p.full_name}</td>
                <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{p.department || '--'}</td>
                <td style={{ padding: '2px 4px' }}>{p.hire_date || '--'}</td>
                <td style={{ padding: '2px 4px', color: p.labor_insurance_date ? 'inherit' : 'var(--text-muted)' }}>{p.labor_insurance_date || '--'}</td>
                <td style={{ padding: '2px 4px', color: p.health_insurance_date ? 'inherit' : 'var(--text-muted)' }}>{p.health_insurance_date || '--'}</td>
                <td style={{ padding: '2px 4px', color: p.contract_expiry ? 'inherit' : 'var(--text-muted)' }}>{p.contract_expiry || '--'}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  <button onClick={() => startEdit(p)} className="btn" style={{ fontSize: '7px', padding: '1px 4px' }}>EDIT</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99990, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }} onClick={() => setEditingId(null)}>
          <div className="window" style={{ width: '360px', fontFamily: 'monospace' }} onClick={e => e.stopPropagation()}>
            <div className="titlebar" style={{ padding: '2px 6px', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>EDIT EMPLOYEE</span>
              <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>×</button>
            </div>
            <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9px' }}>
              <FieldInput label="到職日" type="date" value={editForm.hire_date || ''} onChange={v => setEditForm(f => ({ ...f, hire_date: v }))} />
              <FieldInput label="生日" type="date" value={editForm.birthday || ''} onChange={v => setEditForm(f => ({ ...f, birthday: v }))} />
              <FieldInput label="電話" value={editForm.phone || ''} onChange={v => setEditForm(f => ({ ...f, phone: v }))} />
              <FieldInput label="國籍" value={editForm.nationality || ''} onChange={v => setEditForm(f => ({ ...f, nationality: v }))} />
              <FieldInput label="緊急聯絡人" value={editForm.emergency_contact || ''} onChange={v => setEditForm(f => ({ ...f, emergency_contact: v }))} />
              <FieldInput label="緊急電話" value={editForm.emergency_phone || ''} onChange={v => setEditForm(f => ({ ...f, emergency_phone: v }))} />
              <FieldInput label="勞保到期" type="date" value={editForm.labor_insurance_date || ''} onChange={v => setEditForm(f => ({ ...f, labor_insurance_date: v }))} />
              <FieldInput label="健保到期" type="date" value={editForm.health_insurance_date || ''} onChange={v => setEditForm(f => ({ ...f, health_insurance_date: v }))} />
              <FieldInput label="合約到期" type="date" value={editForm.contract_expiry || ''} onChange={v => setEditForm(f => ({ ...f, contract_expiry: v }))} />
              <div />
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block', marginBottom: '1px' }}>備註</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setEditingId(null)} className="btn" style={{ fontSize: '8px', padding: '2px 8px' }}>CANCEL</button>
                <button onClick={saveEdit} className="btn" style={{ fontSize: '8px', padding: '2px 8px', fontWeight: 'bold' }}>SAVE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block', marginBottom: '1px' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }}
      />
    </div>
  )
}

// ============================================
// LINE Binding Status — 全公司 LINE 綁定狀態管理
// ============================================
function LineBindingTab() {
  const [entries, setEntries] = useState<LineBindingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'bound' | 'unbound'>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { loadData() }, [showInactive])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getLineBindingStatus(!showInactive)
      setEntries(data)
    } catch (err) {
      console.error('[LineBinding] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUnbind(entry: LineBindingEntry) {
    if (!confirm(`確定解除 ${entry.full_name}（${entry.employee_id}）的 LINE 綁定？`)) return
    try {
      await unbindLineUser(entry.id)
      setToast(`已解除 ${entry.full_name} 的 LINE 綁定`)
      setTimeout(() => setToast(null), 3000)
      loadData()
    } catch (err) {
      setToast('解除綁定失敗')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const departments = Array.from(new Set(entries.map(e => e.department).filter(Boolean))) as string[]

  const filtered = entries.filter(e => {
    if (statusFilter === 'bound' && !e.line_user_id) return false
    if (statusFilter === 'unbound' && e.line_user_id) return false
    if (deptFilter !== 'all' && e.department !== deptFilter) return false
    if (filter) {
      const q = filter.toLowerCase()
      return e.full_name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q)
    }
    return true
  })

  const boundCount = entries.filter(e => e.line_user_id).length
  const unboundCount = entries.filter(e => !e.line_user_id).length

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>總計: <b style={{ color: 'var(--text-primary)' }}>{entries.length}</b></span>
        <span>已綁定: <b style={{ color: 'var(--status-success)' }}>{boundCount}</b></span>
        <span>未綁定: <b style={{ color: 'var(--status-error)' }}>{unboundCount}</b></span>
        <span>綁定率: <b style={{ color: 'var(--accent-blue)' }}>{entries.length ? Math.round(boundCount / entries.length * 100) : 0}%</b></span>
        {toast && <span style={{ color: 'var(--status-success)', marginLeft: 'auto' }}>{toast}</span>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="搜尋姓名/編號..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', width: '110px' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'bound' | 'unbound')}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}
        >
          <option value="all">全部狀態</option>
          <option value="bound">已綁定</option>
          <option value="unbound">未綁定</option>
        </select>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}
        >
          <option value="all">全部部門</option>
          {departments.sort().map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ width: '10px', height: '10px' }} />
          含離職
        </label>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>篩選: <b style={{ color: 'var(--text-primary)' }}>{filtered.length}</b> 筆</span>
      </div>

      {/* Table */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)' }}>
              <th style={{ ...hrThStyle, width: '50px' }}>編號</th>
              <th style={{ ...hrThStyle, width: '60px' }}>姓名</th>
              <th style={{ ...hrThStyle, width: '55px' }}>部門</th>
              <th style={{ ...hrThStyle, width: '45px', textAlign: 'center' }}>狀態</th>
              <th style={{ ...hrThStyle, width: '90px' }}>綁定時間</th>
              <th style={{ ...hrThStyle, width: '40px', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid var(--border-light)', opacity: e.is_active ? 1 : 0.5 }}>
                <td style={{ padding: '2px 4px' }}>{e.employee_id}</td>
                <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{e.full_name}</td>
                <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{e.department || '--'}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  {e.line_user_id
                    ? <span style={{ color: 'var(--status-success)', fontWeight: 'bold' }}>已綁定</span>
                    : <span style={{ color: 'var(--status-error)' }}>未綁定</span>
                  }
                </td>
                <td style={{ padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)' }}>
                  {e.line_bound_at ? new Date(e.line_bound_at).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}
                </td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  {e.line_user_id && (
                    <button onClick={() => handleUnbind(e)} className="btn" style={{ fontSize: '7px', padding: '1px 4px', color: 'var(--status-error)' }}>解綁</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// HR Tools — file utilities
// ============================================
function HRTools() {
  return (
    <div>
      <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '4px' }}>HR TOOLS - 人事工具</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {[
          { name: 'Payroll Generator', desc: '產生月薪資報表' },
          { name: 'Contract Template', desc: '產生僱用合約' },
          { name: 'Attendance Import', desc: '匯入出勤 CSV 資料' },
          { name: 'Insurance Calculator', desc: '計算勞/健保費用' },
        ].map((tool, idx) => (
          <div key={idx} className="inset" style={{ padding: '6px', cursor: 'pointer', background: 'var(--bg-inset)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '9px', fontFamily: 'monospace', marginBottom: '2px' }}>{tool.name}</div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{tool.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// HR Page — main component using DepartmentShell
// ============================================
export default function HRPage({ isAdmin = false, userProfile }: HRPageProps) {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (isAdmin) {
      getPendingBulletins().then(data => setPendingCount(data.length)).catch(() => {})
    }
  }, [isAdmin])

  const tabs: DepartmentTab[] = [
    { id: 'dashboard', label: 'DASHBOARD', show: true,    component: <HRDashboard /> },
    { id: 'records',   label: 'RECORDS',   show: isAdmin, component: <HRRecords /> },
    { id: 'linebind',  label: 'LINE BIND', show: isAdmin, component: <LineBindingTab /> },
    { id: 'bulletin',  label: 'BULLETIN',  show: true,    component: <AnnouncementManagementPage isAdmin={isAdmin} /> },
    { id: 'line',      label: 'LINE PUSH', show: isAdmin, component: <HRNotificationPage /> },
    { id: 'tools',     label: 'TOOLS',     show: isAdmin, component: <HRTools /> },
    { id: 'review',    label: 'REVIEW',    show: isAdmin, badge: pendingCount, component: <AnnouncementReviewPage /> },
  ]

  return (
    <DepartmentShell
      departmentId="hr"
      departmentName="HR - PERSONNEL"
      tabs={tabs}
      defaultTab="dashboard"
      statusInfo="MODULE: Human Resources"
    />
  )
}
