'use client'

import { useState, useEffect } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import AnnouncementManagementPage from './AnnouncementManagementPage'
import AnnouncementReviewPage from './AnnouncementReviewPage'
import HRNotificationPage from './HRNotificationPage'
import { getPendingBulletins } from '@/lib/bulletinApi'
import { getHRProfiles, getHREvents, getUpcomingExpirations, updateHRProfile, createHREvent, type HRProfile, type HREvent, type ExpirationAlert } from '@/lib/hrApi'

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
