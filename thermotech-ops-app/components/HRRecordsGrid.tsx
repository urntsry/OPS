'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  getHRProfiles, updateHRProfile, importRosterByEmployeeId, unbindLineUser, deleteProfile,
  type HRProfile,
} from '@/lib/hrApi'

// ============================================================
// 欄位定義（固定 schema；顯示順序與寬度可由使用者調整並存 localStorage）
// ============================================================
type ColType = 'text' | 'number' | 'date' | 'derived'

interface RosterCol {
  key: string
  label: string
  type: ColType
  width: number
  editable: boolean
  sensitive?: boolean
  derive?: (p: HRProfile) => string
}

const COLS: RosterCol[] = [
  { key: 'employee_id',       label: '編號',         type: 'text',    width: 56,  editable: false },
  { key: 'full_name',         label: '姓名',         type: 'text',    width: 70,  editable: true },
  { key: 'department',        label: '部門',         type: 'text',    width: 80,  editable: true },
  { key: 'spouse_count',      label: '配偶人數',     type: 'number',  width: 56,  editable: true },
  { key: 'children_count',    label: '子女人數',     type: 'number',  width: 56,  editable: true },
  { key: 'birthday',          label: '生日',         type: 'date',    width: 100, editable: true, sensitive: true },
  { key: '__age',             label: '年齡',         type: 'derived', width: 42,  editable: false, derive: p => computeAge(p.birthday) },
  { key: '__birth_month',     label: '生日月份',     type: 'derived', width: 56,  editable: false, derive: p => birthMonth(p.birthday) },
  { key: 'hire_date',         label: '到職日',       type: 'date',    width: 100, editable: true },
  { key: '__tenure',          label: '年資',         type: 'derived', width: 42,  editable: false, derive: p => computeTenure(p.hire_date) },
  { key: 'id_number',         label: '身分證資料',   type: 'text',    width: 96,  editable: true, sensitive: true },
  { key: 'blood_type',        label: '血型',         type: 'text',    width: 44,  editable: true },
  { key: 'phone',             label: '聯絡電話',     type: 'text',    width: 90,  editable: true },
  { key: 'email',             label: 'Email',        type: 'text',    width: 150, editable: true },
  { key: 'education_level',   label: '最高學歷',     type: 'text',    width: 60,  editable: true },
  { key: 'education_school',  label: '學校',         type: 'text',    width: 110, editable: true },
  { key: 'education_major',   label: '科系',         type: 'text',    width: 100, editable: true },
  { key: 'address',           label: '通訊地址',     type: 'text',    width: 200, editable: true, sensitive: true },
  { key: 'emergency_contact', label: '緊急聯絡人',   type: 'text',    width: 70,  editable: true },
  { key: 'emergency_relation',label: '關係',         type: 'text',    width: 44,  editable: true },
  { key: 'emergency_phone',   label: '緊急聯絡電話', type: 'text',    width: 90,  editable: true },
  { key: 'line_status',       label: 'LINE',         type: 'derived', width: 40,  editable: false, derive: p => p.line_user_id ? '已綁' : '—' },
]

const COL_MAP = new Map(COLS.map(c => [c.key, c]))
const ORDER_KEY = 'hr_roster_col_order_v1'
const WIDTH_KEY = 'hr_roster_col_widths_v1'

// ============================================================
// 衍生值與民國/西元轉換
// ============================================================
function computeAge(birthday: string | null): string {
  if (!birthday) return ''
  const d = new Date(birthday)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 130 ? String(age) : ''
}

function birthMonth(birthday: string | null): string {
  if (!birthday) return ''
  const d = new Date(birthday)
  if (isNaN(d.getTime())) return ''
  return String(d.getMonth() + 1).padStart(2, '0')
}

function computeTenure(hireDate: string | null): string {
  if (!hireDate) return ''
  const d = new Date(hireDate)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  let y = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--
  return y >= 0 ? String(y) : ''
}

// 民國日期字串 → 西元 ISO（YYYY-MM-DD）。支援 "54.03.14" / "91.5.20" / "107.4.18"
// 若已是西元（>1911 或含 4 位年），直接正規化
function rocToISO(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
  }
  const s = String(raw).trim()
  const parts = s.split(/[./-]/).map(x => x.trim()).filter(Boolean)
  if (parts.length !== 3) return null
  let [y, m, d] = parts.map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  if (y < 1911) y += 1911 // 民國轉西元
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ============================================================
// 主元件
// ============================================================
export default function HRRecordsGrid() {
  const [profiles, setProfiles] = useState<HRProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [sortKey, setSortKey] = useState<string>('employee_id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null)
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [importing, setImporting] = useState(false)
  const excelRef = useRef<HTMLInputElement>(null)
  const dragCol = useRef<number | null>(null)
  const resizing = useRef<{ key: string; startX: number; startW: number } | null>(null)

  // 欄位順序 + 寬度（localStorage 持久化）
  const [order, setOrder] = useState<string[]>(COLS.map(c => c.key))
  const [widths, setWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLS.map(c => [c.key, c.width]))
  )

  useEffect(() => {
    try {
      const savedOrder = JSON.parse(localStorage.getItem(ORDER_KEY) || 'null')
      if (Array.isArray(savedOrder)) {
        // 合併：保留已存順序，補上新欄位
        const merged = savedOrder.filter((k: string) => COL_MAP.has(k))
        for (const c of COLS) if (!merged.includes(c.key)) merged.push(c.key)
        setOrder(merged)
      }
      const savedW = JSON.parse(localStorage.getItem(WIDTH_KEY) || 'null')
      if (savedW && typeof savedW === 'object') {
        setWidths(prev => ({ ...prev, ...savedW }))
      }
    } catch { /* ignore */ }
  }, [])

  const persistOrder = (next: string[]) => { setOrder(next); localStorage.setItem(ORDER_KEY, JSON.stringify(next)) }
  const persistWidths = (next: Record<string, number>) => { setWidths(next); localStorage.setItem(WIDTH_KEY, JSON.stringify(next)) }

  const orderedCols = useMemo(
    () => order.map(k => COL_MAP.get(k)).filter(Boolean) as RosterCol[],
    [order]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getHRProfiles(!showAll)
      setProfiles(data)
    } catch (e) {
      setMsg('載入失敗：' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [showAll])

  useEffect(() => { load() }, [load])

  const departments = useMemo(
    () => Array.from(new Set(profiles.map(p => p.department).filter(Boolean))) as string[],
    [profiles]
  )

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    return profiles.filter(p => {
      if (deptFilter !== 'all' && p.department !== deptFilter) return false
      if (q) return p.full_name.toLowerCase().includes(q) || p.employee_id.toLowerCase().includes(q)
      return true
    })
  }, [profiles, filter, deptFilter])

  const sorted = useMemo(() => {
    const col = COL_MAP.get(sortKey)
    return [...filtered].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (col?.derive) { va = col.derive(a); vb = col.derive(b) }
      else { va = (a as any)[sortKey] ?? ''; vb = (b as any)[sortKey] ?? '' }
      let cmp: number
      if (col?.type === 'number' || col?.key === '__age' || col?.key === '__tenure') {
        cmp = (Number(va) || 0) - (Number(vb) || 0)
      } else {
        cmp = String(va).localeCompare(String(vb))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // 拖曳調整欄位順序
  function onDrop(idx: number) {
    const from = dragCol.current
    dragCol.current = null
    if (from === null || from === idx) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(idx, 0, moved)
    persistOrder(next)
  }

  // 拖曳調整欄寬
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizing.current) return
      const { key, startX, startW } = resizing.current
      const w = Math.max(36, startW + (e.clientX - startX))
      setWidths(prev => ({ ...prev, [key]: w }))
    }
    function onUp() {
      if (resizing.current) {
        localStorage.setItem(WIDTH_KEY, JSON.stringify(widths))
        resizing.current = null
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [widths])

  function startResize(e: React.MouseEvent, key: string) {
    e.preventDefault(); e.stopPropagation()
    resizing.current = { key, startX: e.clientX, startW: widths[key] || 100 }
    document.body.style.cursor = 'col-resize'
  }

  // 儲存單一格（直接寫回 profiles）
  async function commitCell(p: HRProfile, key: string, raw: string) {
    const col = COL_MAP.get(key)
    if (!col || !col.editable) { setEditing(null); return }
    let value: string | number | null = raw.trim()
    if (col.type === 'number') value = value === '' ? null : Number(value)
    if (value === '') value = null

    const prevVal = (p as any)[key] ?? ''
    if (String(prevVal) === String(value ?? '')) { setEditing(null); return }

    // 樂觀更新
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, [key]: value } as HRProfile : x))
    setEditing(null)
    setSavingCell(p.id + key)
    try {
      await updateHRProfile(p.id, { [key]: value } as Partial<HRProfile>)
    } catch (e) {
      // 回滾
      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, [key]: prevVal } as HRProfile : x))
      setMsg('儲存失敗：' + (e as Error).message)
      setTimeout(() => setMsg(''), 4000)
    } finally {
      setSavingCell(null)
    }
  }

  async function handleUnbind(p: HRProfile) {
    if (!confirm(`確定解除 ${p.full_name}（${p.employee_id}）的 LINE 綁定？`)) return
    try { await unbindLineUser(p.id); flash(`已解除 ${p.full_name} 的 LINE 綁定`); load() }
    catch { flash('解除綁定失敗') }
  }

  async function handleDelete(p: HRProfile) {
    if (!confirm(`確定刪除人員「${p.full_name}」（${p.employee_id}）？\n\n此操作無法復原！`)) return
    if (!confirm(`再次確認：永久刪除 ${p.full_name}？`)) return
    try { await deleteProfile(p.id); flash(`已刪除 ${p.full_name}`); load() }
    catch (e) { flash('刪除失敗：' + (e instanceof Error ? e.message : '未知錯誤')) }
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // ---- Excel 匯入（員工個人資料清單格式）----
  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('將依「員工編號」比對並更新人員資料（不會覆蓋已填的有效值為空）。確定匯入？')) {
      if (excelRef.current) excelRef.current.value = ''
      return
    }
    setImporting(true)
    setMsg('解析 Excel 中…')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, blankrows: false })

      // 找表頭列（含「員工編號」或「姓名」）
      let headerIdx = 0
      for (let i = 0; i < Math.min(6, aoa.length); i++) {
        const joined = (aoa[i] || []).map(x => String(x ?? '')).join('')
        if (joined.includes('員工編號') || joined.includes('員工姓名')) { headerIdx = i; break }
      }
      const header = (aoa[headerIdx] || []).map(x => String(x ?? '').replace(/\s/g, ''))

      // 依表頭文字定位欄位索引（容錯不同位置）
      const findCol = (...names: string[]) => {
        for (const n of names) {
          const idx = header.findIndex(h => h.includes(n))
          if (idx >= 0) return idx
        }
        return -1
      }
      const cEmp = findCol('員工編號', '編號')
      const cName = findCol('員工姓名', '姓名')
      const cDept = findCol('部門名稱', '部門')
      const cSpouse = findCol('配偶人數', '配偶')
      const cChild = findCol('子女人數', '子女')
      const cBirth = findCol('生日')
      const cHire = findCol('到職日')
      const cId = findCol('身分證資料', '身分證')
      const cBlood = findCol('血型')
      const cPhone = findCol('聯絡電話', '電話')
      const cEmail = findCol('Email', 'email', 'E-mail')
      const cEduLv = findCol('最高學歷')
      const cEduSch = findCol('最高學歷學校', '學校')
      const cMajor = findCol('科系')
      const cAddr = findCol('通訊地址', '地址')
      const cEmName = findCol('緊急聯絡人')
      const cRel = findCol('關係')
      const cEmPhone = findCol('緊急聯絡人電話', '緊急聯絡電話')

      if (cEmp < 0) { setMsg('匯入失敗：找不到「員工編號」欄'); setImporting(false); return }

      const get = (row: unknown[], idx: number): string => idx >= 0 && row[idx] != null ? String(row[idx]).trim() : ''
      const num = (row: unknown[], idx: number): number | undefined => {
        const v = get(row, idx); if (v === '') return undefined
        const n = Number(v); return isNaN(n) ? undefined : n
      }

      const rows: Array<{ employee_id: string } & Partial<HRProfile>> = []
      for (let i = headerIdx + 1; i < aoa.length; i++) {
        const r = aoa[i] || []
        const empRaw = get(r, cEmp)
        const empId = empRaw.replace(/\D/g, '')
        if (!/^\d{4,6}$/.test(empId)) continue
        rows.push({
          employee_id: empId,
          full_name: get(r, cName) || undefined,
          department: get(r, cDept) || undefined,
          spouse_count: num(r, cSpouse),
          children_count: num(r, cChild),
          birthday: rocToISO(r[cBirth]) || undefined,
          hire_date: rocToISO(r[cHire]) || undefined,
          id_number: get(r, cId) || undefined,
          blood_type: get(r, cBlood) || undefined,
          phone: get(r, cPhone) || undefined,
          email: get(r, cEmail) || undefined,
          education_level: get(r, cEduLv) || undefined,
          education_school: get(r, cEduSch) || undefined,
          education_major: get(r, cMajor) || undefined,
          address: get(r, cAddr) || undefined,
          emergency_contact: get(r, cEmName) || undefined,
          emergency_relation: get(r, cRel) || undefined,
          emergency_phone: get(r, cEmPhone) || undefined,
        })
      }

      setMsg(`寫入資料庫中…（解析 ${rows.length} 筆）`)
      const res = await importRosterByEmployeeId(rows)
      await load()
      let m = `匯入完成 ✓ 更新 ${res.updated} 筆`
      if (res.skipped.length) m += `；查無員編 ${res.skipped.length} 筆（${res.skipped.slice(0, 8).join(',')}${res.skipped.length > 8 ? '…' : ''}）`
      if (res.failed.length) m += `；失敗 ${res.failed.length} 筆`
      setMsg(m)
    } catch (err) {
      setMsg('匯入失敗：' + (err as Error).message)
    } finally {
      setImporting(false)
      if (excelRef.current) excelRef.current.value = ''
    }
  }

  function handleExport() {
    const aoa: (string | number | null)[][] = []
    aoa.push(orderedCols.map(c => c.label))
    sorted.forEach(p => aoa.push(orderedCols.map(c => {
      if (c.derive) return c.derive(p)
      return (p as any)[c.key] ?? ''
    })))
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = orderedCols.map(c => ({ wpx: widths[c.key] || c.width }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '人員清冊')
    XLSX.writeFile(wb, `人員清冊_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function resetLayout() {
    persistOrder(COLS.map(c => c.key))
    persistWidths(Object.fromEntries(COLS.map(c => [c.key, c.width])))
    flash('欄位版面已重設')
  }

  const totalWidth = useMemo(
    () => INDEX_W + orderedCols.reduce((s, c) => s + (widths[c.key] || c.width), 0),
    [orderedCols, widths]
  )

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  const boundCount = profiles.filter(p => p.line_user_id).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`.hr-del{visibility:hidden}.hr-row-idx:hover .hr-del{visibility:visible}`}</style>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="搜尋姓名/編號…" value={filter} onChange={e => setFilter(e.target.value)}
          style={inputStyle}
        />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={inputStyle}>
          <option value="all">全部部門</option>
          {departments.sort().map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} style={{ width: '10px', height: '10px' }} />
          含離職
        </label>
        <span style={{ color: 'var(--text-muted)' }}>人員 <b style={{ color: 'var(--text-primary)' }}>{profiles.length}</b></span>
        <span style={{ color: 'var(--text-muted)' }}>LINE <b style={{ color: 'var(--status-success)' }}>{boundCount}</b></span>
        <input ref={excelRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportExcel} />
        <button onClick={() => excelRef.current?.click()} style={btnStyle} disabled={importing}>{importing ? '匯入中…' : '匯入 Excel'}</button>
        <button onClick={handleExport} style={btnStyle}>匯出 Excel</button>
        <button onClick={resetLayout} style={btnStyle} title="重設欄位順序與寬度">重設版面</button>
        {msg && <span style={{ color: 'var(--accent-blue)', fontSize: '8px' }}>{msg}</span>}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>篩選 <b style={{ color: 'var(--text-primary)' }}>{sorted.length}</b></span>
      </div>

      {/* Grid — 單一捲動容器 + sticky 表頭 */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, border: '1px solid var(--border-mid-dark)', fontFamily: 'monospace', fontSize: '8px' }}>
        <div style={{ width: totalWidth }}>
          {/* Header */}
          <div style={{ display: 'flex', height: HEADER_H, position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-inset)' }}>
            <div style={{ ...cellBase, width: INDEX_W, flexShrink: 0, fontWeight: 'bold', justifyContent: 'center', background: 'var(--bg-inset)' }}>#</div>
            {orderedCols.map((c, idx) => (
              <div key={c.key}
                draggable
                onDragStart={() => { dragCol.current = idx }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(idx)}
                style={{ ...cellBase, width: widths[c.key] || c.width, flexShrink: 0, fontWeight: 'bold', cursor: 'grab', background: 'var(--bg-inset)', position: 'relative', gap: '2px' }}
                title="拖曳調整順序"
              >
                <span onClick={() => toggleSort(c.key)} style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.label}</span>
                {/* resize handle */}
                <span
                  onMouseDown={e => startResize(e, c.key)}
                  onClick={e => e.stopPropagation()}
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', cursor: 'col-resize' }}
                />
              </div>
            ))}
          </div>

          {/* Rows */}
          {sorted.length === 0 ? (
            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>無資料</div>
          ) : sorted.map((p, ri) => (
            <div key={p.id} style={{ display: 'flex', height: ROW_H, background: ri % 2 ? 'var(--bg-window)' : 'transparent', opacity: p.is_active ? 1 : 0.5 }}>
              {/* index + 刪除 */}
              <div className="hr-row-idx" style={{ ...cellBase, width: INDEX_W, flexShrink: 0, background: 'var(--bg-inset)', justifyContent: 'center', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '7px' }}>{ri + 1}</span>
                <span onClick={() => handleDelete(p)} title="刪除人員"
                  style={{ color: 'var(--status-error)', cursor: 'pointer', fontWeight: 'bold', fontSize: '8px' }}
                  className="hr-del">×</span>
              </div>
              {orderedCols.map(c => {
                const isEditing = editing?.id === p.id && editing?.key === c.key
                const w = widths[c.key] || c.width
                const display = c.derive ? c.derive(p) : ((p as any)[c.key] ?? '')
                const isSaving = savingCell === p.id + c.key

                if (c.key === 'line_status') {
                  return (
                    <div key={c.key} style={{ ...cellBase, width: w, flexShrink: 0, justifyContent: 'center' }}>
                      {p.line_user_id
                        ? <span onClick={() => handleUnbind(p)} title="點擊解除綁定" style={{ color: 'var(--status-success)', cursor: 'pointer', fontWeight: 'bold' }}>●</span>
                        : <span style={{ color: 'var(--status-error)' }}>○</span>}
                    </div>
                  )
                }

                return (
                  <div key={c.key}
                    onClick={() => { if (c.editable && !isEditing) setEditing({ id: p.id, key: c.key }) }}
                    style={{ ...cellBase, width: w, flexShrink: 0, cursor: c.editable ? 'text' : 'default',
                      justifyContent: c.type === 'number' || c.type === 'derived' ? 'flex-end' : 'flex-start',
                      color: c.derive ? 'var(--text-muted)' : 'var(--text-primary)',
                      background: isSaving ? 'rgba(0,95,175,0.12)' : undefined }}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={String(display)}
                        type={c.type === 'date' ? 'date' : 'text'}
                        inputMode={c.type === 'number' ? 'decimal' : undefined}
                        onBlur={e => commitCell(p, c.key, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() }
                          if (e.key === 'Escape') { e.preventDefault(); setEditing(null) }
                        }}
                        style={{ width: '100%', minWidth: 0, fontSize: '8px', fontFamily: 'monospace', border: '1px solid var(--accent-blue)', background: '#fff', padding: '1px 2px', outline: 'none', boxSizing: 'border-box', textAlign: c.type === 'number' ? 'right' : 'left' }}
                      />
                    ) : (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(display)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: '7px', color: 'var(--text-muted)', marginTop: '2px' }}>
        提示：點格子直接編輯（Enter 儲存 / Esc 取消）；拖曳表頭調整順序；拖曳表頭右緣調整寬度；點 ⇅ 排序。
      </div>
    </div>
  )
}

const INDEX_W = 34
const ROW_H = 20
const HEADER_H = 24

const cellBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '0 3px',
  borderRight: '1px solid var(--border-light, #eee)', borderBottom: '1px solid var(--border-light, #eee)',
  overflow: 'hidden',
}

const inputStyle: React.CSSProperties = {
  fontSize: '8px', fontFamily: 'monospace', padding: '1px 4px',
  background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)',
}

const btnStyle: React.CSSProperties = {
  fontSize: '8px', padding: '2px 8px', cursor: 'pointer',
  background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)', fontFamily: 'monospace', whiteSpace: 'nowrap',
}
