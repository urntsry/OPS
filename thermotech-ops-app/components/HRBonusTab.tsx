'use client'

import { useState, useEffect, useRef } from 'react'
import { getBonusMonthly, upsertBonusMonthly, getBonusPenalties, createBonusPenalty, deleteBonusPenalty, getHRProfiles, type BonusMonthly, type BonusPenalty, type HRProfile } from '@/lib/hrApi'
import { parseExcelFile, findHeaderRow } from '@/lib/excelImport'

function getCurrentQuarter(): { year: number; quarter: number } {
  const now = new Date()
  return { year: now.getFullYear(), quarter: Math.ceil((now.getMonth() + 1) / 3) }
}

function getQuarterMonths(year: number, quarter: number): string[] {
  const start = (quarter - 1) * 3 + 1
  return [
    `${year}-${String(start).padStart(2, '0')}`,
    `${year}-${String(start + 1).padStart(2, '0')}`,
    `${year}-${String(start + 2).padStart(2, '0')}`,
  ]
}

interface BonusSummaryRow {
  profile_id: string
  employee_id: string
  full_name: string
  monthly: BonusMonthly[]
  penalties: BonusPenalty[]
  total_amount: number
  penalty_deduction: number
  final_amount: number
}

export default function HRBonusTab() {
  const [yearQ, setYearQ] = useState(getCurrentQuarter())
  const [monthlyData, setMonthlyData] = useState<BonusMonthly[]>([])
  const [penaltiesData, setPenaltiesData] = useState<BonusPenalty[]>([])
  const [profiles, setProfiles] = useState<HRProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [addingPenalty, setAddingPenalty] = useState(false)
  const [editingMonthly, setEditingMonthly] = useState<{ profile_id: string; year_month: string } | null>(null)
  const [monthlyForm, setMonthlyForm] = useState({ hourly_rate: '', half_hour_count: '', meal_allowance: '' })
  const [penaltyForm, setPenaltyForm] = useState({ profile_id: '', year_month: '', reason: '', penalty_type: '申誡', amount: '', note: '' })
  const [toast, setToast] = useState<string | null>(null)

  const months = getQuarterMonths(yearQ.year, yearQ.quarter)

  useEffect(() => { loadData() }, [yearQ.year, yearQ.quarter])

  async function loadData() {
    setLoading(true)
    try {
      const [md, pd, profs] = await Promise.all([
        getBonusMonthly(months),
        getBonusPenalties(months),
        getHRProfiles(true),
      ])
      setMonthlyData(md)
      setPenaltiesData(pd)
      setProfiles(profs)
    } catch (err) {
      console.error('[Bonus] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]))

  const summaryMap = new Map<string, BonusSummaryRow>()
  for (const p of profiles) {
    summaryMap.set(p.id, {
      profile_id: p.id,
      employee_id: p.employee_id,
      full_name: p.full_name,
      monthly: [],
      penalties: [],
      total_amount: 0,
      penalty_deduction: 0,
      final_amount: 0,
    })
  }
  for (const m of monthlyData) {
    const s = summaryMap.get(m.profile_id)
    if (s) {
      s.monthly.push(m)
      s.total_amount += Number(m.monthly_total) || 0
    }
  }
  for (const p of penaltiesData) {
    const s = summaryMap.get(p.profile_id)
    if (s) {
      s.penalties.push(p)
      s.penalty_deduction += Number(p.amount) || 0
    }
  }
  for (const s of summaryMap.values()) {
    s.final_amount = s.total_amount - s.penalty_deduction
  }

  const summaries = Array.from(summaryMap.values())
    .filter(s => {
      if (!filter) return s.total_amount > 0 || s.penalty_deduction > 0
      const q = filter.toLowerCase()
      return s.full_name.toLowerCase().includes(q) || s.employee_id.toLowerCase().includes(q)
    })
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id))

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

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
        // Match monthly sheets like "115.01", "115.02", "115.03"
        const monthMatch = sn.match(/(\d{3})\.(\d{2})/)
        if (!monthMatch) continue
        if (sn.includes('出勤') || sn.includes('伙食')) continue

        const rocYear = parseInt(monthMatch[1])
        const monthNum = parseInt(monthMatch[2])
        const westYear = rocYear + 1911
        const yearMonth = `${westYear}-${String(monthNum).padStart(2, '0')}`

        const raw = rawSheets[sn]
        if (!raw || raw.length < 2) continue

        // Headers: [None, 部門名稱, 員工編號, 員工姓名, XX月時薪, XX月0.5h次數, XX月伙食費, XX月小計]
        const headerIdx = findHeaderRow(raw, '員工編號')

        for (let i = headerIdx + 1; i < raw.length; i++) {
          const row = raw[i]
          if (!row) continue

          const empId = String(row[2] ?? '').trim()
          if (!/^\d{5}$/.test(empId)) continue

          const profileId = profileByEmpId.get(empId)
          if (!profileId) continue

          const hourly = Number(row[4]) || 0
          const count = Number(row[5]) || 0
          const meal = Number(row[6]) || 0
          const total = Number(row[7]) || (hourly * count * 0.5 + meal)

          if (hourly === 0 && count === 0 && total === 0) continue

          await upsertBonusMonthly({
            profile_id: profileId,
            year_month: yearMonth,
            hourly_rate: hourly,
            half_hour_count: count,
            meal_allowance: meal,
            monthly_total: total,
          })
          imported++
        }
      }
      showToast(`匯入完成：${imported} 筆`)
      loadData()
    } catch (err) {
      console.error('[Bonus Import]', err)
      showToast('匯入失敗：' + (err instanceof Error ? err.message : '未知錯誤'))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function startEditMonthly(profileId: string, ym: string) {
    const existing = monthlyData.find(m => m.profile_id === profileId && m.year_month === ym)
    setEditingMonthly({ profile_id: profileId, year_month: ym })
    setMonthlyForm({
      hourly_rate: existing ? String(existing.hourly_rate) : '',
      half_hour_count: existing ? String(existing.half_hour_count) : '',
      meal_allowance: existing ? String(existing.meal_allowance) : '',
    })
  }

  async function handleSaveMonthly() {
    if (!editingMonthly) return
    const hr = Number(monthlyForm.hourly_rate) || 0
    const cnt = Number(monthlyForm.half_hour_count) || 0
    const meal = Number(monthlyForm.meal_allowance) || 0
    const total = hr * cnt * 0.5 + meal
    try {
      await upsertBonusMonthly({
        profile_id: editingMonthly.profile_id,
        year_month: editingMonthly.year_month,
        hourly_rate: hr,
        half_hour_count: cnt,
        meal_allowance: meal,
        monthly_total: total,
      })
      setEditingMonthly(null)
      showToast('已儲存')
      loadData()
    } catch { showToast('儲存失敗') }
  }

  async function handleAddPenalty() {
    if (!penaltyForm.profile_id || !penaltyForm.year_month || !penaltyForm.reason) return
    try {
      await createBonusPenalty({
        profile_id: penaltyForm.profile_id,
        year_month: penaltyForm.year_month,
        reason: penaltyForm.reason,
        penalty_type: penaltyForm.penalty_type,
        amount: Number(penaltyForm.amount) || 0,
        note: penaltyForm.note || null,
      })
      setAddingPenalty(false)
      setPenaltyForm({ profile_id: '', year_month: '', reason: '', penalty_type: '申誡', amount: '', note: '' })
      showToast('已新增')
      loadData()
    } catch { showToast('新增失敗') }
  }

  async function handleDeletePenalty(id: string) {
    if (!confirm('確定刪除此筆獎懲紀錄？')) return
    try {
      await deleteBonusPenalty(id)
      showToast('已刪除')
      loadData()
    } catch { showToast('刪除失敗') }
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  const thStyle: React.CSSProperties = { padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center' }}>
        <label>年度:</label>
        <input type="number" value={yearQ.year} min={2020} max={2030}
          onChange={e => setYearQ(q => ({ ...q, year: Number(e.target.value) }))}
          style={{ width: '50px', fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }} />
        <label>季度:</label>
        <select value={yearQ.quarter}
          onChange={e => setYearQ(q => ({ ...q, quarter: Number(e.target.value) }))}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}>
          <option value={1}>Q1 (1-3月)</option>
          <option value={2}>Q2 (4-6月)</option>
          <option value={3}>Q3 (7-9月)</option>
          <option value={4}>Q4 (10-12月)</option>
        </select>
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
        <button onClick={() => setAddingPenalty(true)} className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>+ 獎懲</button>
        {toast && <span style={{ color: 'var(--status-success)' }}>{toast}</span>}
      </div>

      <div style={{ fontSize: '7px', color: 'var(--text-muted)', marginBottom: '3px' }}>
        月份: {months.join(' / ')}
      </div>

      {/* Table */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ ...thStyle, width: '50px' }}>編號</th>
              <th style={{ ...thStyle, width: '55px' }}>姓名</th>
              {months.map(m => <th key={m} style={{ ...thStyle, width: '55px', textAlign: 'right' }}>{m.slice(5)}月</th>)}
              <th style={{ ...thStyle, width: '55px', textAlign: 'right' }}>小計</th>
              <th style={{ ...thStyle, width: '55px', textAlign: 'right' }}>獎懲</th>
              <th style={{ ...thStyle, width: '60px', textAlign: 'right' }}>Final</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map(s => (
              <tr key={s.profile_id} style={{ borderBottom: '1px solid var(--border-light)', height: '20px', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === s.profile_id ? null : s.profile_id)}>
                <td style={{ padding: '3px 4px', lineHeight: '14px' }}>{s.employee_id}</td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', fontWeight: 'bold' }}>{s.full_name}</td>
                {months.map(m => {
                  const md = s.monthly.find(x => x.year_month === m)
                  return <td key={m} style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right' }}>{md ? `$${md.monthly_total}` : '--'}</td>
                })}
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right', fontWeight: 'bold' }}>
                  {s.total_amount > 0 ? `$${s.total_amount}` : '--'}
                </td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right', color: s.penalty_deduction > 0 ? 'var(--status-error)' : 'inherit' }}>
                  {s.penalty_deduction > 0 ? `-$${s.penalty_deduction}` : '--'}
                </td>
                <td style={{ padding: '3px 4px', lineHeight: '14px', textAlign: 'right', fontWeight: 'bold', color: s.final_amount < 0 ? 'var(--status-error)' : 'var(--status-success)' }}>
                  {s.final_amount !== 0 ? `$${s.final_amount}` : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Expanded detail */}
        {expandedId && (() => {
          const s = summaryMap.get(expandedId)
          const p = profileMap.get(expandedId)
          if (!s || !p) return null
          return (
            <div style={{ margin: '2px 4px 6px', padding: '4px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)' }}>
              <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '3px', color: 'var(--accent-blue)' }}>
                《{p.full_name}（{p.employee_id}）紅利明細》
              </div>
              {/* Monthly detail */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', fontFamily: 'monospace', marginBottom: '4px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-mid-dark)' }}>
                    <th style={{ padding: '2px 4px', textAlign: 'left', width: '50px' }}>月份</th>
                    <th style={{ padding: '2px 4px', textAlign: 'right', width: '50px' }}>時薪</th>
                    <th style={{ padding: '2px 4px', textAlign: 'right', width: '55px' }}>0.5h次數</th>
                    <th style={{ padding: '2px 4px', textAlign: 'right', width: '55px' }}>伙食費</th>
                    <th style={{ padding: '2px 4px', textAlign: 'right', width: '60px' }}>月小計</th>
                    <th style={{ padding: '2px 4px', textAlign: 'center', width: '30px' }}>OP</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(m => {
                    const md = s.monthly.find(x => x.year_month === m)
                    return (
                      <tr key={m} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '2px 4px' }}>{m}</td>
                        <td style={{ padding: '2px 4px', textAlign: 'right' }}>{md?.hourly_rate ?? '--'}</td>
                        <td style={{ padding: '2px 4px', textAlign: 'right' }}>{md?.half_hour_count ?? '--'}</td>
                        <td style={{ padding: '2px 4px', textAlign: 'right' }}>{md?.meal_allowance ?? '--'}</td>
                        <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{md ? `$${md.monthly_total}` : '--'}</td>
                        <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                          <button onClick={(e) => { e.stopPropagation(); startEditMonthly(s.profile_id, m) }} className="btn" style={{ fontSize: '7px', padding: '0 2px' }}>ED</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {/* Penalties */}
              {s.penalties.length > 0 && (
                <>
                  <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '2px', color: 'var(--status-error)' }}>獎懲紀錄</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-mid-dark)' }}>
                        <th style={{ padding: '2px 4px', textAlign: 'left', width: '50px' }}>月份</th>
                        <th style={{ padding: '2px 4px', textAlign: 'left', width: '40px' }}>類型</th>
                        <th style={{ padding: '2px 4px', textAlign: 'left' }}>事由</th>
                        <th style={{ padding: '2px 4px', textAlign: 'right', width: '60px' }}>金額</th>
                        <th style={{ padding: '2px 4px', textAlign: 'center', width: '30px' }}>OP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.penalties.map(pen => (
                        <tr key={pen.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '2px 4px' }}>{pen.year_month}</td>
                          <td style={{ padding: '2px 4px' }}>{pen.penalty_type}</td>
                          <td style={{ padding: '2px 4px' }}>{pen.reason}</td>
                          <td style={{ padding: '2px 4px', textAlign: 'right', color: 'var(--status-error)' }}>-${pen.amount}</td>
                          <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleDeletePenalty(pen.id) }} className="btn" style={{ fontSize: '7px', padding: '0 2px', color: 'var(--status-error)' }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )
        })()}
      </div>

      {/* Edit Monthly Modal */}
      {editingMonthly && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99990, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }} onClick={() => setEditingMonthly(null)}>
          <div className="window" style={{ width: '280px', fontFamily: 'monospace' }} onClick={e => e.stopPropagation()}>
            <div className="titlebar" style={{ padding: '2px 6px', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>EDIT BONUS — {profileMap.get(editingMonthly.profile_id)?.full_name} / {editingMonthly.year_month}</span>
              <button onClick={() => setEditingMonthly(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>
            <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9px' }}>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>時薪</label>
                <input type="number" value={monthlyForm.hourly_rate} onChange={e => setMonthlyForm(f => ({ ...f, hourly_rate: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>0.5h次數</label>
                <input type="number" value={monthlyForm.half_hour_count} onChange={e => setMonthlyForm(f => ({ ...f, half_hour_count: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>伙食費</label>
                <input type="number" value={monthlyForm.meal_allowance} onChange={e => setMonthlyForm(f => ({ ...f, meal_allowance: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1', fontSize: '8px', color: 'var(--text-muted)', textAlign: 'right' }}>
                預估月小計: ${((Number(monthlyForm.hourly_rate) || 0) * (Number(monthlyForm.half_hour_count) || 0) * 0.5 + (Number(monthlyForm.meal_allowance) || 0)).toFixed(0)}
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setEditingMonthly(null)} className="btn" style={{ fontSize: '8px', padding: '2px 8px' }}>CANCEL</button>
                <button onClick={handleSaveMonthly} className="btn" style={{ fontSize: '8px', padding: '2px 8px', fontWeight: 'bold' }}>SAVE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Penalty Modal */}
      {addingPenalty && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99990, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }} onClick={() => setAddingPenalty(false)}>
          <div className="window" style={{ width: '300px', fontFamily: 'monospace' }} onClick={e => e.stopPropagation()}>
            <div className="titlebar" style={{ padding: '2px 6px', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>ADD PENALTY</span>
              <button onClick={() => setAddingPenalty(false)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>
            <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>員工</label>
                <select value={penaltyForm.profile_id} onChange={e => setPenaltyForm(f => ({ ...f, profile_id: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }}>
                  <option value="">-- 選擇員工 --</option>
                  {profiles.sort((a, b) => a.employee_id.localeCompare(b.employee_id)).map(p => (
                    <option key={p.id} value={p.id}>{p.employee_id} {p.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>月份</label>
                <select value={penaltyForm.year_month} onChange={e => setPenaltyForm(f => ({ ...f, year_month: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }}>
                  <option value="">--</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>類型</label>
                <select value={penaltyForm.penalty_type} onChange={e => setPenaltyForm(f => ({ ...f, penalty_type: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }}>
                  <option value="申誡">申誡</option>
                  <option value="記過">記過</option>
                  <option value="大過">大過</option>
                  <option value="嘉獎">嘉獎</option>
                  <option value="記功">記功</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>事由</label>
                <input type="text" value={penaltyForm.reason} onChange={e => setPenaltyForm(f => ({ ...f, reason: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>金額</label>
                <input type="number" value={penaltyForm.amount} onChange={e => setPenaltyForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>備註</label>
                <input type="text" value={penaltyForm.note} onChange={e => setPenaltyForm(f => ({ ...f, note: e.target.value }))}
                  style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setAddingPenalty(false)} className="btn" style={{ fontSize: '8px', padding: '2px 8px' }}>CANCEL</button>
                <button onClick={handleAddPenalty} className="btn" style={{ fontSize: '8px', padding: '2px 8px', fontWeight: 'bold' }}>SAVE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
