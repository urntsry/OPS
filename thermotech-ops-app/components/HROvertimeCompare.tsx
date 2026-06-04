'use client'

import { useState, useRef } from 'react'
import { parseExcelFile, findHeaderRow } from '@/lib/excelImport'

interface AttendanceRow {
  department: string
  employee_id: string
  employee_name: string
  date: string
  weekday: string
  holiday_type: string
  shift_code: string
  clock_in: string | null
  clock_out: string | null
  anomaly: string
  work_hours: number
}

interface WorkHoursRow {
  employee_id: string
  employee_name: string
  department: string
  date: string
  weekday: string
  time_start: string
  time_end: string
  work_order: string
  customer: string
  product_category: string
  hours: number
  minutes: number
  ot_1_2: number
  ot_3_4: number
  ot_over4: number
  holiday_ot: number
  daily_total: number | null
}

interface CompareResult {
  employee_id: string
  employee_name: string
  department: string
  date: string
  weekday: string
  clock_in: string | null
  clock_out: string | null
  qr_start: string | null
  status: 'pass' | 'exclude' | 'review'
  ot_type: 'early' | 'evening' | 'both'
  early_ot: number
  evening_ot: number
  evening_ot_1_2: number
  evening_ot_3_4: number
  evening_ot_over4: number
  holiday_ot: number
  daily_total: number
  work_orders: string[]
  reason: string
}

type ViewTab = 'all' | 'pass' | 'exclude' | 'review'

export default function HROvertimeCompare() {
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([])
  const [workHoursData, setWorkHoursData] = useState<Map<string, WorkHoursRow[]>>(new Map())
  const [results, setResults] = useState<CompareResult[]>([])
  const [viewTab, setViewTab] = useState<ViewTab>('all')
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState<'upload' | 'results'>('upload')
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [reviewDecisions, setReviewDecisions] = useState<Map<string, 'pass' | 'exclude'>>(new Map())

  const attFileRef = useRef<HTMLInputElement>(null)
  const whFileRef = useRef<HTMLInputElement>(null)
  const [attFileName, setAttFileName] = useState('')
  const [whFileName, setWhFileName] = useState('')
  const [attLoaded, setAttLoaded] = useState(false)
  const [whLoaded, setWhLoaded] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function handleAttendanceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { rawSheets, sheetNames } = await parseExcelFile(file)
      const sheet = rawSheets[sheetNames[0]]
      if (!sheet) { showToast('無法讀取出勤明細'); return }

      const rows: AttendanceRow[] = []
      for (let i = 3; i < sheet.length; i++) {
        const r = sheet[i]
        if (!r || !r[1]) continue
        const empId = String(r[1]).trim()
        if (!/^\d{5}$/.test(empId)) continue

        rows.push({
          department: String(r[0] || ''),
          employee_id: empId,
          employee_name: String(r[2] || ''),
          date: String(r[3] || ''),
          weekday: String(r[4] || ''),
          holiday_type: String(r[5] || ''),
          shift_code: String(r[6] || ''),
          clock_in: r[9] ? String(r[9]) : null,
          clock_out: r[10] ? String(r[10]) : null,
          anomaly: String(r[14] || ''),
          work_hours: Number(r[17]) || 0,
        })
      }

      setAttendanceData(rows)
      setAttFileName(file.name)
      setAttLoaded(true)
      showToast(`出勤明細載入：${rows.length} 筆`)
    } catch (err) {
      showToast('讀取出勤明細失敗：' + (err instanceof Error ? err.message : ''))
    }
  }

  async function handleWorkHoursUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { rawSheets, sheetNames } = await parseExcelFile(file)
      const dataMap = new Map<string, WorkHoursRow[]>()

      for (const sn of sheetNames) {
        const raw = rawSheets[sn]
        if (!raw || raw.length < 5) continue

        let empId: string | null = null
        let empName = ''
        let dept = ''
        const titleMatch = sn.match(/\((\d{5})\)/)
        if (titleMatch) empId = titleMatch[1]

        for (let i = 0; i < Math.min(4, raw.length); i++) {
          const rowStr = raw[i]?.join(' ') || ''
          const m = rowStr.match(/[（(](\d{5})[）)]/)
          if (m && !empId) empId = m[1]
          const nameMatch = rowStr.match(/姓名[：:](.+?)\(/)
          if (nameMatch) empName = nameMatch[1].trim()
          const deptMatch = rowStr.match(/部門[：:](.+?)$/)
          if (deptMatch) dept = deptMatch[1].trim()
        }
        if (!empId) continue

        const nameFromSheet = sn.replace(/\(\d{5}\)/, '').trim()
        if (!empName) empName = nameFromSheet

        const headerIdx = findHeaderRow(raw, '日期')
        if (headerIdx < 0) continue

        const rows: WorkHoursRow[] = []
        for (let i = headerIdx + 2; i < raw.length; i++) {
          const r = raw[i]
          if (!r || !r[0]) continue
          if (String(r[0]).includes('合計')) continue

          rows.push({
            employee_id: empId,
            employee_name: empName,
            department: dept,
            date: String(r[0]).trim(),
            weekday: String(r[1] || '').trim(),
            time_start: String(r[2] || '').trim(),
            time_end: String(r[3] || '').trim(),
            work_order: String(r[4] || '').trim(),
            customer: String(r[5] || '').trim(),
            product_category: String(r[7] || '').trim(),
            hours: Number(r[8]) || 0,
            minutes: Number(r[9]) || 0,
            ot_1_2: Number(r[10]) || 0,
            ot_3_4: Number(r[11]) || 0,
            ot_over4: Number(r[12]) || 0,
            holiday_ot: Number(r[13]) || 0,
            daily_total: r[14] != null ? Number(r[14]) || 0 : null,
          })
        }
        if (rows.length > 0) {
          dataMap.set(empId, rows)
        }
      }

      setWorkHoursData(dataMap)
      setWhFileName(file.name)
      setWhLoaded(true)
      showToast(`工時統計單載入：${dataMap.size} 位員工`)
    } catch (err) {
      showToast('讀取工時統計單失敗：' + (err instanceof Error ? err.message : ''))
    }
  }

  function runCompare() {
    if (!attLoaded || !whLoaded) {
      showToast('請先上傳兩份檔案')
      return
    }
    setProcessing(true)

    const compareResults: CompareResult[] = []
    const employeeAttMap = new Map<string, AttendanceRow[]>()

    for (const row of attendanceData) {
      if (!employeeAttMap.has(row.employee_id)) {
        employeeAttMap.set(row.employee_id, [])
      }
      employeeAttMap.get(row.employee_id)!.push(row)
    }

    for (const [empId, attRows] of employeeAttMap) {
      const whRows = workHoursData.get(empId) || []

      for (const att of attRows) {
        if (!att.clock_in && !att.clock_out) continue
        if (att.holiday_type === '例假日' || att.holiday_type === '休息日') {
          if (!att.clock_in) continue
        }

        const dateShort = att.date.includes('-')
          ? `${att.date.slice(5, 7)}/${att.date.slice(8, 10)}`
          : att.date

        const dayWhRows = whRows.filter(w => w.date === dateShort)
        const qrStart = dayWhRows.length > 0
          ? dayWhRows.reduce((min, w) => w.time_start < min ? w.time_start : min, dayWhRows[0].time_start)
          : null

        let earlyOt = 0
        let earlyStatus: 'pass' | 'exclude' | 'review' = 'exclude'
        let earlyReason = ''

        if (att.clock_in && att.clock_in < '08:00') {
          if (qrStart && qrStart < '08:00') {
            earlyOt = 0.5
            earlyStatus = 'pass'
            earlyReason = 'QR < 08:00 確認早班加班'
          } else if (qrStart && qrStart >= '08:00' && qrStart < '08:30') {
            earlyOt = 0.5
            earlyStatus = 'review'
            earlyReason = `QR ${qrStart} 在緩衝區(08:00~08:30)，需確認是否有加班申請`
          } else if (qrStart && qrStart >= '08:30') {
            earlyOt = 0
            earlyStatus = 'exclude'
            earlyReason = `QR ${qrStart} >= 08:30，非加班`
          } else {
            earlyOt = 0
            earlyStatus = 'review'
            earlyReason = '無 QR 資料，需人工確認'
          }
        }

        let eveningOt = 0
        let eveningOt12 = 0, eveningOt34 = 0, eveningOver4 = 0
        if (att.clock_out && att.clock_out > '18:00') {
          const [h, m] = att.clock_out.split(':').map(Number)
          const totalMin = (h - 18) * 60 + m
          eveningOt = Math.round(totalMin / 30) * 0.5
          if (eveningOt > 0 && eveningOt <= 2) eveningOt12 = eveningOt
          else if (eveningOt > 2 && eveningOt <= 4) { eveningOt12 = 2; eveningOt34 = eveningOt - 2 }
          else if (eveningOt > 4) { eveningOt12 = 2; eveningOt34 = 2; eveningOver4 = eveningOt - 4 }
        }

        let holidayOt = 0
        if (att.holiday_type && att.clock_in) {
          const dailyTotal = dayWhRows.reduce((sum, w) => sum + w.hours + w.minutes / 60, 0)
          holidayOt = Math.round(dailyTotal * 2) / 2
        }

        const hasEarlyIssue = att.clock_in && att.clock_in < '08:00'
        const hasEveningOt = eveningOt > 0
        const hasHolidayOt = holidayOt > 0

        if (!hasEarlyIssue && !hasEveningOt && !hasHolidayOt) continue

        let finalStatus: 'pass' | 'exclude' | 'review' = 'pass'
        let otType: 'early' | 'evening' | 'both' = 'evening'
        let reason = ''

        if (hasEarlyIssue && hasEveningOt) {
          otType = 'both'
          finalStatus = earlyStatus
          reason = earlyReason + ` | 晚班加班 ${eveningOt}H`
        } else if (hasEarlyIssue) {
          otType = 'early'
          finalStatus = earlyStatus
          reason = earlyReason
        } else {
          otType = 'evening'
          finalStatus = 'pass'
          reason = `晚班加班：下班 ${att.clock_out} → ${eveningOt}H`
        }

        if (hasHolidayOt) {
          reason = `假日出勤 ${holidayOt}H`
          finalStatus = 'pass'
        }

        const workOrders = dayWhRows.map(w => w.work_order).filter(Boolean)
        const dailyTotal = (hasHolidayOt ? holidayOt : 8) + (earlyStatus !== 'exclude' ? earlyOt : 0) + eveningOt

        compareResults.push({
          employee_id: empId,
          employee_name: att.employee_name,
          department: att.department,
          date: att.date,
          weekday: att.weekday,
          clock_in: att.clock_in,
          clock_out: att.clock_out,
          qr_start: qrStart,
          status: finalStatus,
          ot_type: otType,
          early_ot: earlyStatus !== 'exclude' ? earlyOt : 0,
          evening_ot: eveningOt,
          evening_ot_1_2: eveningOt12,
          evening_ot_3_4: eveningOt34,
          evening_ot_over4: eveningOver4,
          holiday_ot: holidayOt,
          daily_total: dailyTotal,
          work_orders: workOrders,
          reason,
        })
      }
    }

    compareResults.sort((a, b) => a.employee_id.localeCompare(b.employee_id) || a.date.localeCompare(b.date))
    setResults(compareResults)
    setStep('results')
    setProcessing(false)
    setReviewDecisions(new Map())
  }

  function handleReviewDecision(key: string, decision: 'pass' | 'exclude') {
    setReviewDecisions(prev => {
      const next = new Map(prev)
      if (next.get(key) === decision) next.delete(key)
      else next.set(key, decision)
      return next
    })
  }

  function getFilteredResults(): CompareResult[] {
    let filtered = results
    if (viewTab !== 'all') {
      filtered = filtered.filter(r => {
        if (viewTab === 'review') return r.status === 'review'
        if (viewTab === 'pass') return r.status === 'pass'
        if (viewTab === 'exclude') return r.status === 'exclude'
        return true
      })
    }
    if (filter) {
      const q = filter.toLowerCase()
      filtered = filtered.filter(r =>
        r.employee_name.toLowerCase().includes(q) ||
        r.employee_id.includes(q)
      )
    }
    return filtered
  }

  function getSummary() {
    const passCount = results.filter(r => r.status === 'pass').length
    const excludeCount = results.filter(r => r.status === 'exclude').length
    const reviewCount = results.filter(r => r.status === 'review').length
    const uniqueEmployees = new Set(results.map(r => r.employee_id)).size
    return { passCount, excludeCount, reviewCount, uniqueEmployees, total: results.length }
  }

  function exportResults() {
    const finalResults = results.map(r => {
      const key = `${r.employee_id}_${r.date}`
      const decision = reviewDecisions.get(key)
      if (r.status === 'review' && decision) {
        return { ...r, status: decision, early_ot: decision === 'pass' ? r.early_ot : 0 }
      }
      return r
    }).filter(r => r.status === 'pass') as CompareResult[]

    const empMap = new Map<string, { name: string; dept: string; totalOt12: number; totalOt34: number; totalOver4: number; totalHoliday: number; total: number; records: CompareResult[] }>()
    for (const r of finalResults) {
      if (!empMap.has(r.employee_id)) {
        empMap.set(r.employee_id, { name: r.employee_name, dept: r.department, totalOt12: 0, totalOt34: 0, totalOver4: 0, totalHoliday: 0, total: 0, records: [] })
      }
      const emp = empMap.get(r.employee_id)!
      emp.totalOt12 += r.early_ot + r.evening_ot_1_2
      emp.totalOt34 += r.evening_ot_3_4
      emp.totalOver4 += r.evening_ot_over4
      emp.totalHoliday += r.holiday_ot
      emp.total += r.early_ot + r.evening_ot + r.holiday_ot
      emp.records.push(r)
    }

    let csv = '\uFEFF'
    csv += '編號,姓名,部門,加班I(1-2H),加班II(3-4H),加班III(>4H),假日加班,總計,超時\n'
    for (const [empId, emp] of [...empMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const isOvertime = emp.total > 46 ? 'Y' : ''
      csv += `${empId},${emp.name},${emp.dept},${emp.totalOt12},${emp.totalOt34},${emp.totalOver4},${emp.totalHoliday},${emp.total},${isOvertime}\n`
    }
    csv += '\n\n--- 明細 ---\n'
    csv += '編號,姓名,日期,星期,打卡上班,打卡下班,QR起始,早班OT,晚班OT,假日OT,日合計,工單\n'
    for (const r of finalResults) {
      csv += `${r.employee_id},${r.employee_name},${r.date},${r.weekday},${r.clock_in || ''},${r.clock_out || ''},${r.qr_start || ''},${r.early_ot},${r.evening_ot},${r.holiday_ot},${r.daily_total},${r.work_orders.join(';')}\n`
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `加班比對結果_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('已匯出比對結果')
  }

  const thStyle: React.CSSProperties = { padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold' }
  const tdStyle: React.CSSProperties = { padding: '2px 4px', lineHeight: '14px', fontSize: '8px' }

  if (step === 'upload') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '6px' }}>
        <div style={{ fontSize: '8px', color: 'var(--text-muted)', padding: '4px 0' }}>
          上傳兩份原始 Excel 檔案，系統自動比對產出加班報表。
        </div>

        {/* Upload Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* Attendance file */}
          <div className="inset" style={{ padding: '8px', background: 'var(--bg-inset)' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--accent-blue)' }}>
              FILE A：出勤明細
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              人資系統原始下載（加班紀錄欄為空）
            </div>
            <input type="file" ref={attFileRef} accept=".xlsx,.xls" onChange={handleAttendanceUpload} style={{ display: 'none' }} />
            <button onClick={() => attFileRef.current?.click()} className="btn" style={{ fontSize: '8px', padding: '3px 10px', width: '100%' }}>
              {attLoaded ? `✓ ${attFileName}` : '選擇檔案...'}
            </button>
            {attLoaded && <div style={{ fontSize: '7px', color: 'var(--status-success)', marginTop: '4px' }}>已載入 {attendanceData.length} 筆出勤紀錄</div>}
          </div>

          {/* Work hours file */}
          <div className="inset" style={{ padding: '8px', background: 'var(--bg-inset)' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--accent-blue)' }}>
              FILE B：工時統計單
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              生管系統 QR CODE 工時紀錄
            </div>
            <input type="file" ref={whFileRef} accept=".xlsx,.xls" onChange={handleWorkHoursUpload} style={{ display: 'none' }} />
            <button onClick={() => whFileRef.current?.click()} className="btn" style={{ fontSize: '8px', padding: '3px 10px', width: '100%' }}>
              {whLoaded ? `✓ ${whFileName}` : '選擇檔案...'}
            </button>
            {whLoaded && <div style={{ fontSize: '7px', color: 'var(--status-success)', marginTop: '4px' }}>已載入 {workHoursData.size} 位員工工時資料</div>}
          </div>
        </div>

        {/* Compare button */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <button
            onClick={runCompare}
            className="btn"
            disabled={!attLoaded || !whLoaded || processing}
            style={{ fontSize: '10px', padding: '6px 24px', fontWeight: 'bold', opacity: (!attLoaded || !whLoaded) ? 0.5 : 1 }}
          >
            {processing ? 'PROCESSING...' : 'START COMPARE ▸'}
          </button>
        </div>

        {/* Rules reminder */}
        <div className="inset" style={{ padding: '6px 8px', background: 'var(--bg-inset)', fontSize: '7px', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>比對規則：</div>
          <div>• 早班加班：出勤打卡 &lt; 08:00 且 QR CODE &lt; 08:30（30分鐘緩衝）= 0.5H</div>
          <div>• 晚班加班：出勤下班 &gt; 18:00，時數 = 下班 - 18:00</div>
          <div>• 自動排除：出勤早到但 QR &gt;= 08:30（習慣早到，非加班）</div>
        </div>

        {toast && <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)', padding: '4px 10px', fontSize: '8px', zIndex: 9999, boxShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>{toast}</div>}
      </div>
    )
  }

  // Results view
  const summary = getSummary()
  const filtered = getFilteredResults()

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '8px', padding: '2px 8px', cursor: 'pointer',
    background: active ? 'var(--bg-window)' : 'var(--bg-inset)',
    border: '1px solid var(--border-mid-dark)',
    borderBottom: active ? 'none' : '1px solid var(--border-mid-dark)',
    fontWeight: active ? 'bold' : 'normal',
    marginBottom: '-1px', position: 'relative', zIndex: active ? 1 : 0,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center' }}>
        <span>員工: <b style={{ color: 'var(--text-primary)' }}>{summary.uniqueEmployees}</b></span>
        <span>總筆數: <b>{summary.total}</b></span>
        <span style={{ color: 'var(--status-success)' }}>通過: <b>{summary.passCount}</b></span>
        <span style={{ color: 'var(--status-error)' }}>排除: <b>{summary.excludeCount}</b></span>
        <span style={{ color: '#d4a017' }}>待確認: <b>{summary.reviewCount}</b></span>
        <input type="text" placeholder="搜尋..." value={filter} onChange={e => setFilter(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', width: '80px', marginLeft: 'auto' }}
        />
        <button onClick={exportResults} className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>匯出 CSV</button>
        <button onClick={() => { setStep('upload'); setResults([]) }} className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>重新上傳</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border-mid-dark)' }}>
        <button style={tabStyle(viewTab === 'all')} onClick={() => setViewTab('all')}>ALL ({summary.total})</button>
        <button style={tabStyle(viewTab === 'pass')} onClick={() => setViewTab('pass')}>PASS ({summary.passCount})</button>
        <button style={tabStyle(viewTab === 'exclude')} onClick={() => setViewTab('exclude')}>EXCLUDE ({summary.excludeCount})</button>
        <button style={tabStyle(viewTab === 'review')} onClick={() => setViewTab('review')}>REVIEW ({summary.reviewCount})</button>
      </div>

      {/* Results table */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ ...thStyle, width: '18px', textAlign: 'center' }}>ST</th>
              <th style={{ ...thStyle, width: '40px' }}>編號</th>
              <th style={{ ...thStyle, width: '52px' }}>姓名</th>
              <th style={{ ...thStyle, width: '58px' }}>日期</th>
              <th style={{ ...thStyle, width: '24px' }}>星期</th>
              <th style={{ ...thStyle, width: '36px' }}>上班</th>
              <th style={{ ...thStyle, width: '36px' }}>下班</th>
              <th style={{ ...thStyle, width: '36px' }}>QR起</th>
              <th style={{ ...thStyle, width: '30px', textAlign: 'right' }}>早班</th>
              <th style={{ ...thStyle, width: '30px', textAlign: 'right' }}>晚班</th>
              <th style={{ ...thStyle, width: '30px', textAlign: 'right' }}>合計</th>
              <th style={{ ...thStyle }}>判定原因</th>
              {viewTab === 'review' && <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const key = `${r.employee_id}_${r.date}`
              const decision = reviewDecisions.get(key)
              const statusColor = r.status === 'pass' ? 'var(--status-success)' : r.status === 'exclude' ? 'var(--status-error)' : '#d4a017'
              const statusIcon = r.status === 'pass' ? 'V' : r.status === 'exclude' ? 'X' : '?'
              const bgColor = decision === 'pass' ? 'rgba(0,180,0,0.05)' : decision === 'exclude' ? 'rgba(180,0,0,0.05)' : undefined

              return (
                <tr key={`${key}_${idx}`} style={{ borderBottom: '1px solid var(--border-light)', height: '18px', background: bgColor }}>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: statusColor }}>{statusIcon}</td>
                  <td style={tdStyle}>{r.employee_id}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{r.employee_name}</td>
                  <td style={tdStyle}>{r.date.includes('-') ? r.date.slice(5) : r.date}</td>
                  <td style={tdStyle}>{r.weekday}</td>
                  <td style={{ ...tdStyle, color: r.clock_in && r.clock_in < '08:00' ? 'var(--status-error)' : 'inherit' }}>{r.clock_in || '--'}</td>
                  <td style={{ ...tdStyle, color: r.clock_out && r.clock_out > '18:00' ? 'var(--status-error)' : 'inherit' }}>{r.clock_out || '--'}</td>
                  <td style={{ ...tdStyle, color: r.qr_start && r.qr_start < '08:00' ? 'var(--status-success)' : r.qr_start && r.qr_start < '08:30' ? '#d4a017' : 'inherit' }}>{r.qr_start || '--'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{r.early_ot || ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{r.evening_ot || ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{r.daily_total > 8 ? r.daily_total : ''}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>{r.reason}</td>
                  {viewTab === 'review' && (
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => handleReviewDecision(key, 'pass')} className="btn"
                        style={{ fontSize: '7px', padding: '0 3px', marginRight: '2px', color: decision === 'pass' ? 'var(--status-success)' : undefined, fontWeight: decision === 'pass' ? 'bold' : 'normal' }}>V</button>
                      <button onClick={() => handleReviewDecision(key, 'exclude')} className="btn"
                        style={{ fontSize: '7px', padding: '0 3px', color: decision === 'exclude' ? 'var(--status-error)' : undefined, fontWeight: decision === 'exclude' ? 'bold' : 'normal' }}>X</button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {toast && <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)', padding: '4px 10px', fontSize: '8px', zIndex: 9999, boxShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>{toast}</div>}
    </div>
  )
}
