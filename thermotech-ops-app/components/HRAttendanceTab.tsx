'use client'

import { useState, useEffect, useRef } from 'react'
import { getLeaveRecords, createLeaveRecord, updateLeaveRecord, deleteLeaveRecord, getAnnualLeaveBalances, upsertAnnualLeaveBalance, getHRProfiles, type LeaveRecord, type AnnualLeaveBalance, type HRProfile } from '@/lib/hrApi'
import { parseExcelFile, findHeaderRow } from '@/lib/excelImport'

const LEAVE_TYPES = ['事假', '病假', '生理假', '婚假', '喪假', '公假', '產假', '陪產假', '家庭照顧假', '特休', '其他']

function getCurrentYear(): number {
  return new Date().getFullYear()
}

export default function HRAttendanceTab() {
  const [year, setYear] = useState(getCurrentYear())
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [balances, setBalances] = useState<AnnualLeaveBalance[]>([])
  const [profiles, setProfiles] = useState<HRProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'leave' | 'annual'>('leave')
  const [filter, setFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingLeave, setAddingLeave] = useState(false)
  const [form, setForm] = useState({ profile_id: '', leave_type: '事假', start_time: '', end_time: '', days: '', hours: '', reason: '' })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { loadData() }, [year])

  async function loadData() {
    setLoading(true)
    try {
      const [lv, bal, profs] = await Promise.all([
        getLeaveRecords(year),
        getAnnualLeaveBalances(year),
        getHRProfiles(true),
      ])
      setLeaves(lv)
      setBalances(bal)
      setProfiles(profs)
    } catch (err) {
      console.error('[Attendance] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]))

  const leaveSummary = new Map<string, { total_days: number, total_hours: number, records: LeaveRecord[], byType: Map<string, number> }>()
  for (const p of profiles) {
    leaveSummary.set(p.id, { total_days: 0, total_hours: 0, records: [], byType: new Map() })
  }
  for (const r of leaves) {
    const s = leaveSummary.get(r.profile_id)
    if (s) {
      s.total_days += Number(r.days) || 0
      s.total_hours += Number(r.hours) || 0
      s.records.push(r)
      s.byType.set(r.leave_type, (s.byType.get(r.leave_type) || 0) + (Number(r.hours) || 0))
    }
  }

  const filteredProfiles = profiles.filter(p => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return p.full_name.toLowerCase().includes(q) || p.employee_id.toLowerCase().includes(q)
  }).sort((a, b) => a.employee_id.localeCompare(b.employee_id))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const { rawSheets, sheetNames } = await parseExcelFile(file)
      let imported = 0
      const profileByEmpId = new Map(profiles.map(p => [p.employee_id, p.id]))

      for (const sn of sheetNames) {
        if (!sn.includes('差假') && !sn.includes('明細')) continue

        const raw = rawSheets[sn]
        if (!raw || raw.length < 2) continue

        // Headers: 部門名稱(0), 員工編號(1), 員工姓名(2), 假別(3), 起迄時間(4), 日數(5), 日數換算(6), 時數(7), total(8), 事由(9)
        const headerIdx = findHeaderRow(raw, '員工編號')
        
        for (let i = headerIdx + 1; i < raw.length; i++) {
          const row = raw[i]
          if (!row) continue

          const empId = String(row[1] ?? '').trim()
          if (!/^\d{5}$/.test(empId)) continue

          const profileId = profileByEmpId.get(empId)
          if (!profileId) continue

          const leaveType = String(row[3] ?? '其他').trim()
          const timeRange = String(row[4] ?? '').trim()
          const days = Number(row[5]) || 0
          const hours = Number(row[8] ?? row[7]) || 0
          const reason = row[9] ? String(row[9]) : null

          let startTime = '', endTime = ''
          const separator = timeRange.includes('~') ? '~' : timeRange.includes('～') ? '～' : null
          if (separator) {
            const parts = timeRange.split(separator)
            startTime = parts[0].trim()
            endTime = parts[1].trim()
          }
          if (!startTime || !endTime) continue

          await createLeaveRecord({
            profile_id: profileId,
            leave_type: leaveType,
            start_time: startTime,
            end_time: endTime,
            days, hours, reason, year,
          })
          imported++
        }
      }
      showToast(`匯入完成：${imported} 筆`)
      loadData()
    } catch (err) {
      console.error('[Attendance Import]', err)
      showToast('匯入失敗：' + (err instanceof Error ? err.message : '未知錯誤'))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAddLeave() {
    if (!form.profile_id || !form.start_time || !form.end_time) return
    try {
      await createLeaveRecord({
        profile_id: form.profile_id,
        leave_type: form.leave_type,
        start_time: form.start_time,
        end_time: form.end_time,
        days: Number(form.days) || 0,
        hours: Number(form.hours) || 0,
        reason: form.reason || null,
        year,
      })
      setAddingLeave(false)
      setForm({ profile_id: '', leave_type: '事假', start_time: '', end_time: '', days: '', hours: '', reason: '' })
      showToast('已新增')
      loadData()
    } catch { showToast('新增失敗') }
  }

  async function handleDeleteLeave(id: string) {
    if (!confirm('確定刪除此筆請假紀錄？')) return
    try {
      await deleteLeaveRecord(id)
      showToast('已刪除')
      loadData()
    } catch { showToast('刪除失敗') }
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  const thStyle: React.CSSProperties = { padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold' }
  const subTabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '8px', padding: '2px 8px', cursor: 'pointer', background: active ? 'var(--bg-window)' : 'transparent',
    border: active ? '1px solid var(--border-mid-dark)' : '1px solid transparent', borderBottom: active ? 'none' : '1px solid var(--border-mid-dark)',
    fontWeight: active ? 'bold' : 'normal', color: 'var(--text-primary)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center' }}>
        <label>年度:</label>
        <input
          type="number"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          min={2020} max={2030}
          style={{ width: '55px', fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}
        />
        <input
          type="text"
          placeholder="搜尋姓名/編號..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', width: '100px' }}
        />
        <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleImportExcel} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} className="btn" style={{ fontSize: '8px', padding: '1px 6px', marginLeft: 'auto' }} disabled={importing}>
          {importing ? '匯入中...' : '匯入 Excel'}
        </button>
        <button onClick={() => setAddingLeave(true)} className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>+ 新增請假</button>
        {toast && <span style={{ color: 'var(--status-success)' }}>{toast}</span>}
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-mid-dark)', marginBottom: '2px' }}>
        <button style={subTabStyle(tab === 'leave')} onClick={() => setTab('leave')}>差假明細</button>
        <button style={subTabStyle(tab === 'annual')} onClick={() => setTab('annual')}>年度休假</button>
      </div>

      {/* Leave Tab */}
      {tab === 'leave' && (
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', flex: 1, minHeight: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ ...thStyle, width: '50px' }}>編號</th>
                <th style={{ ...thStyle, width: '60px' }}>姓名</th>
                <th style={{ ...thStyle, width: '55px', textAlign: 'right' }}>請假日數</th>
                <th style={{ ...thStyle, width: '55px', textAlign: 'right' }}>請假時數</th>
                <th style={{ ...thStyle }}>假別分布</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.filter(p => {
                const s = leaveSummary.get(p.id)
                return s && s.records.length > 0
              }).map(p => {
                const s = leaveSummary.get(p.id)!
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', height: '20px' }}
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <td style={{ padding: '3px 4px', lineHeight: '14px' }}>{p.employee_id}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', fontWeight: 'bold' }}>{p.full_name}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{s.total_days}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{s.total_hours}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', color: 'var(--text-muted)' }}>
                      {Array.from(s.byType.entries()).map(([t, h]) => `${t}:${h}h`).join(' ')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {expandedId && (() => {
            const s = leaveSummary.get(expandedId)
            const p = profileMap.get(expandedId)
            if (!s || !p) return null
            return (
              <div style={{ margin: '2px 4px 6px', padding: '4px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)' }}>
                <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '3px', color: 'var(--accent-blue)' }}>
                  《{p.full_name}（{p.employee_id}）差假明細》
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', fontFamily: 'monospace' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-mid-dark)' }}>
                      <th style={{ padding: '2px 4px', textAlign: 'left', width: '50px' }}>假別</th>
                      <th style={{ padding: '2px 4px', textAlign: 'left', width: '120px' }}>起迄時間</th>
                      <th style={{ padding: '2px 4px', textAlign: 'right', width: '35px' }}>日數</th>
                      <th style={{ padding: '2px 4px', textAlign: 'right', width: '35px' }}>時數</th>
                      <th style={{ padding: '2px 4px', textAlign: 'left' }}>事由</th>
                      <th style={{ padding: '2px 4px', textAlign: 'center', width: '30px' }}>OP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.records.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '2px 4px' }}>{r.leave_type}</td>
                        <td style={{ padding: '2px 4px' }}>{r.start_time.slice(0, 10)} ~ {r.end_time.slice(0, 10)}</td>
                        <td style={{ padding: '2px 4px', textAlign: 'right' }}>{r.days}</td>
                        <td style={{ padding: '2px 4px', textAlign: 'right' }}>{r.hours}</td>
                        <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{r.reason || ''}</td>
                        <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteLeave(r.id) }} className="btn" style={{ fontSize: '7px', padding: '0 2px', color: 'var(--status-error)' }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}

      {/* Annual Leave Tab */}
      {tab === 'annual' && (
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', flex: 1, minHeight: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ ...thStyle, width: '50px' }}>編號</th>
                <th style={{ ...thStyle, width: '60px' }}>姓名</th>
                <th style={{ ...thStyle, width: '40px', textAlign: 'right' }}>可休</th>
                <th style={{ ...thStyle, width: '40px', textAlign: 'right' }}>已休</th>
                <th style={{ ...thStyle, width: '45px', textAlign: 'right' }}>轉代金</th>
                <th style={{ ...thStyle, width: '40px', textAlign: 'right' }}>保留</th>
                <th style={{ ...thStyle, width: '40px', textAlign: 'right' }}>剩餘</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map(p => {
                const b = balances.find(x => x.profile_id === p.id)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)', height: '20px' }}>
                    <td style={{ padding: '3px 4px', lineHeight: '14px' }}>{p.employee_id}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', fontWeight: 'bold' }}>{p.full_name}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{b?.entitled_days ?? '--'}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{b?.used_days ?? '--'}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{b?.converted_to_pay ?? '--'}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{b?.carried_over ?? '--'}</td>
                    <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right', fontWeight: 'bold' }}>{b?.remaining ?? '--'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Leave Modal */}
      {addingLeave && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99990, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }} onClick={() => setAddingLeave(false)}>
          <div className="window" style={{ width: '320px', fontFamily: 'monospace' }} onClick={e => e.stopPropagation()}>
            <div className="titlebar" style={{ padding: '2px 6px', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>ADD LEAVE RECORD</span>
              <button onClick={() => setAddingLeave(false)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>
            <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>員工</label>
                <select value={form.profile_id} onChange={e => setForm(f => ({ ...f, profile_id: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }}>
                  <option value="">-- 選擇員工 --</option>
                  {profiles.sort((a, b) => a.employee_id.localeCompare(b.employee_id)).map(p => (
                    <option key={p.id} value={p.id}>{p.employee_id} {p.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>假別</label>
                <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>日數</label>
                <input type="number" step="0.5" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>起始時間</label>
                <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>結束時間</label>
                <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>時數</label>
                <input type="number" step="0.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>事由</label>
                <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setAddingLeave(false)} className="btn" style={{ fontSize: '8px', padding: '2px 8px' }}>CANCEL</button>
                <button onClick={handleAddLeave} className="btn" style={{ fontSize: '8px', padding: '2px 8px', fontWeight: 'bold' }}>SAVE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
