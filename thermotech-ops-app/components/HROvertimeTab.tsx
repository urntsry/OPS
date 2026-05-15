'use client'

import { useState, useEffect } from 'react'
import { getOvertimeRecords, upsertOvertimeRecord, deleteOvertimeRecord, getHRProfiles, type OvertimeRecord, type HRProfile } from '@/lib/hrApi'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const OVERTIME_THRESHOLD = 46

function getWeekday(dateStr: string): string {
  const d = new Date(dateStr)
  return WEEKDAYS[d.getDay()]
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface SummaryRow {
  profile_id: string
  employee_id: string
  full_name: string
  department: string | null
  total_type1: number
  total_type2: number
  total_hours: number
  is_overtime: boolean
  records: OvertimeRecord[]
}

export default function HROvertimeTab() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [records, setRecords] = useState<OvertimeRecord[]>([])
  const [profiles, setProfiles] = useState<HRProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ record_date: '', overtime_type1_hours: '', overtime_type2_hours: '', note: '' })
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => { loadData() }, [month])

  async function loadData() {
    setLoading(true)
    try {
      const [recs, profs] = await Promise.all([
        getOvertimeRecords(month),
        getHRProfiles(true),
      ])
      setRecords(recs)
      setProfiles(profs)
    } catch (err) {
      console.error('[Overtime] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]))

  const summaryMap = new Map<string, SummaryRow>()
  for (const p of profiles) {
    summaryMap.set(p.id, {
      profile_id: p.id,
      employee_id: p.employee_id,
      full_name: p.full_name,
      department: p.department,
      total_type1: 0,
      total_type2: 0,
      total_hours: 0,
      is_overtime: false,
      records: [],
    })
  }
  for (const r of records) {
    const s = summaryMap.get(r.profile_id)
    if (s) {
      s.total_type1 += Number(r.overtime_type1_hours) || 0
      s.total_type2 += Number(r.overtime_type2_hours) || 0
      s.total_hours += (Number(r.overtime_type1_hours) || 0) + (Number(r.overtime_type2_hours) || 0)
      s.records.push(r)
    }
  }
  for (const s of summaryMap.values()) {
    s.is_overtime = s.total_hours > OVERTIME_THRESHOLD
  }

  const summaries = Array.from(summaryMap.values())
    .filter(s => {
      if (!filter) return s.total_hours > 0
      const q = filter.toLowerCase()
      return s.full_name.toLowerCase().includes(q) || s.employee_id.toLowerCase().includes(q)
    })
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id))

  const totalEmployeesWithOT = summaries.filter(s => s.total_hours > 0).length
  const totalOvertime = summaries.filter(s => s.is_overtime).length

  function startAdd(profileId: string) {
    setAddingFor(profileId)
    setEditingId(null)
    setForm({ record_date: '', overtime_type1_hours: '', overtime_type2_hours: '', note: '' })
  }

  function startEdit(r: OvertimeRecord) {
    setEditingId(r.id)
    setAddingFor(r.profile_id)
    setForm({
      record_date: r.record_date,
      overtime_type1_hours: String(r.overtime_type1_hours || ''),
      overtime_type2_hours: String(r.overtime_type2_hours || ''),
      note: r.note || '',
    })
  }

  async function handleSave() {
    if (!addingFor || !form.record_date) return
    try {
      await upsertOvertimeRecord({
        profile_id: addingFor,
        record_date: form.record_date,
        weekday: getWeekday(form.record_date),
        overtime_type1_hours: Number(form.overtime_type1_hours) || 0,
        overtime_type2_hours: Number(form.overtime_type2_hours) || 0,
        note: form.note || null,
        month_period: month,
        updated_at: new Date().toISOString(),
      } as any)
      setAddingFor(null)
      setEditingId(null)
      showToast('已儲存')
      loadData()
    } catch (err) {
      showToast('儲存失敗')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定刪除此筆加班紀錄？')) return
    try {
      await deleteOvertimeRecord(id)
      showToast('已刪除')
      loadData()
    } catch (err) {
      showToast('刪除失敗')
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  const thStyle: React.CSSProperties = { padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center' }}>
        <label>月份:</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}
        />
        <input
          type="text"
          placeholder="搜尋姓名/編號..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', width: '100px' }}
        />
        <span>有加班: <b style={{ color: 'var(--text-primary)' }}>{totalEmployeesWithOT}</b></span>
        <span>超時({OVERTIME_THRESHOLD}hr): <b style={{ color: 'var(--status-error)' }}>{totalOvertime}</b></span>
        {toast && <span style={{ marginLeft: 'auto', color: 'var(--status-success)' }}>{toast}</span>}
      </div>

      {/* Table */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
              <th style={{ ...thStyle, width: '50px' }}>編號</th>
              <th style={{ ...thStyle, width: '60px' }}>姓名</th>
              <th style={{ ...thStyle, width: '55px', textAlign: 'right' }}>加班I</th>
              <th style={{ ...thStyle, width: '55px', textAlign: 'right' }}>加班II</th>
              <th style={{ ...thStyle, width: '55px', textAlign: 'right' }}>加總</th>
              <th style={{ ...thStyle, width: '35px', textAlign: 'center' }}>超時</th>
              <th style={{ ...thStyle, width: '30px', textAlign: 'center' }}>OP</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s, idx) => (
              <tr key={s.profile_id} style={{ borderBottom: '1px solid var(--border-light)', height: '20px', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === s.profile_id ? null : s.profile_id)}>
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                <td style={{ padding: '3px 4px', lineHeight: '14px' }}>{s.employee_id}</td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', fontWeight: 'bold' }}>{s.full_name}</td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{s.total_type1 || '--'}</td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{s.total_type2 || '--'}</td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right', fontWeight: 'bold', color: s.is_overtime ? 'var(--status-error)' : 'inherit' }}>{s.total_hours || '--'}</td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'center', color: 'var(--status-error)', fontWeight: 'bold' }}>{s.is_overtime ? 'Y' : ''}</td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'center' }}>
                  <button onClick={e => { e.stopPropagation(); startAdd(s.profile_id) }} className="btn" style={{ fontSize: '7px', padding: '0px 3px', lineHeight: '14px' }}>+</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Expanded detail */}
        {expandedId && (() => {
          const s = summaryMap.get(expandedId)
          if (!s || s.records.length === 0) return null
          return (
            <div style={{ margin: '2px 4px 6px', padding: '4px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)' }}>
              <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '3px', color: 'var(--accent-blue)' }}>
                《{s.full_name}（{s.employee_id}）加班明細》
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-mid-dark)' }}>
                    <th style={{ padding: '2px 4px', textAlign: 'left', width: '70px' }}>日期</th>
                    <th style={{ padding: '2px 4px', textAlign: 'center', width: '30px' }}>星期</th>
                    <th style={{ padding: '2px 4px', textAlign: 'right', width: '50px' }}>加班I</th>
                    <th style={{ padding: '2px 4px', textAlign: 'right', width: '50px' }}>加班II</th>
                    <th style={{ padding: '2px 4px', textAlign: 'left' }}>備註</th>
                    <th style={{ padding: '2px 4px', textAlign: 'center', width: '40px' }}>OP</th>
                  </tr>
                </thead>
                <tbody>
                  {s.records.sort((a, b) => a.record_date.localeCompare(b.record_date)).map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '2px 4px' }}>{r.record_date.slice(5)}</td>
                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>{r.weekday}</td>
                      <td style={{ padding: '2px 4px', textAlign: 'right' }}>{r.overtime_type1_hours || ''}</td>
                      <td style={{ padding: '2px 4px', textAlign: 'right' }}>{r.overtime_type2_hours || ''}</td>
                      <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{r.note || ''}</td>
                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                        <button onClick={() => startEdit(r)} className="btn" style={{ fontSize: '7px', padding: '0 2px', marginRight: '2px' }}>ED</button>
                        <button onClick={() => handleDelete(r.id)} className="btn" style={{ fontSize: '7px', padding: '0 2px', color: 'var(--status-error)' }}>×</button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', borderTop: '1px solid var(--border-mid-dark)' }}>
                    <td colSpan={2} style={{ padding: '2px 4px' }}>合計</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right' }}>{s.total_type1}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right' }}>{s.total_type2}</td>
                    <td colSpan={2} style={{ padding: '2px 4px', color: s.is_overtime ? 'var(--status-error)' : 'inherit' }}>
                      總計: {s.total_hours} hr {s.is_overtime ? '(超時)' : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>

      {/* Add/Edit Modal */}
      {addingFor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99990, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }} onClick={() => { setAddingFor(null); setEditingId(null) }}>
          <div className="window" style={{ width: '300px', fontFamily: 'monospace' }} onClick={e => e.stopPropagation()}>
            <div className="titlebar" style={{ padding: '2px 6px', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>{editingId ? 'EDIT' : 'ADD'} OVERTIME — {profileMap.get(addingFor)?.full_name}</span>
              <button onClick={() => { setAddingFor(null); setEditingId(null) }} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>
            <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>日期</label>
                <input type="date" value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>加班I (hr)</label>
                <input type="number" step="0.5" value={form.overtime_type1_hours} onChange={e => setForm(f => ({ ...f, overtime_type1_hours: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>加班II (hr)</label>
                <input type="number" step="0.5" value={form.overtime_type2_hours} onChange={e => setForm(f => ({ ...f, overtime_type2_hours: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>備註</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => { setAddingFor(null); setEditingId(null) }} className="btn" style={{ fontSize: '8px', padding: '2px 8px' }}>CANCEL</button>
                <button onClick={handleSave} className="btn" style={{ fontSize: '8px', padding: '2px 8px', fontWeight: 'bold' }}>SAVE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
