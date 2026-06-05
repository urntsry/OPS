'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as XLSX from 'xlsx'
import {
  listDeliverySheets,
  saveDeliverySheet,
  createDeliverySheet,
  importDeliverySheets,
  parseOrderPdf,
  DEFAULT_COLUMNS,
  type DeliverySchedule,
  type DeliveryColumn,
  type DeliveryRow,
  type ColumnType,
  type ImportSheet,
} from '@/lib/salesApi'

// Map an Excel header label to a known column key/type (交期表 standard layout)
const KNOWN_HEADERS: Record<string, { key: string; type: ColumnType }> = {
  '発注日': { key: 'order_date', type: 'date' },
  '伝票コード': { key: 'slip_code', type: 'text' },
  '品名': { key: 'name', type: 'text' },
  '名稱': { key: 'name', type: 'text' },
  '名称': { key: 'name', type: 'text' },
  '数量': { key: 'qty', type: 'number' },
  '單價': { key: 'unit_price', type: 'number' },
  '単価': { key: 'unit_price', type: 'number' },
  '金額': { key: 'amount', type: 'number' },
  '希望納期': { key: 'delivery_date', type: 'date' },
  '納期': { key: 'delivery_date', type: 'date' },
  '備考': { key: 'remark', type: 'text' },
  '備註': { key: 'remark', type: 'text' },
  '工場': { key: 'factory', type: 'text' },
  '工廠': { key: 'factory', type: 'text' },
  'Invoice': { key: 'invoice', type: 'text' },
  'invoice': { key: 'invoice', type: 'text' },
  '工單號碼': { key: 'work_order', type: 'text' },
  '工单号码': { key: 'work_order', type: 'text' },
}

function fmtDate(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return v === null || v === undefined ? '' : String(v).trim()
}

function convertValue(v: unknown, type: ColumnType): string | number {
  if (v === null || v === undefined) return ''
  if (type === 'date') return fmtDate(v)
  if (type === 'number') {
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''))
    return isNaN(n) ? '' : n
  }
  return typeof v === 'number' ? v : String(v).trim()
}

const DEFAULT_WIDTHS: Record<string, number> = Object.fromEntries(
  DEFAULT_COLUMNS.map(c => [c.key, c.width || 100])
)

type Row = DeliveryRow & { __id: string }

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyRow(columns: DeliveryColumn[]): Row {
  const r: Row = { __id: uid() }
  columns.forEach(c => { r[c.key] = '' })
  return r
}

export default function SalesDeliveryTab() {
  const [sheets, setSheets] = useState<DeliverySchedule[]>([])
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [columns, setColumns] = useState<DeliveryColumn[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState('')
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null)
  const dragCol = useRef<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const excelRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const ROW_H = 22
  const HEADER_H = 26
  const INDEX_W = 40

  const loadSheets = useCallback(async (preferred?: string) => {
    setLoading(true)
    try {
      const data = await listDeliverySheets()
      setSheets(data)
      if (data.length > 0) {
        const target = data.find(s => s.sheet_name === preferred) || data[0]
        setActiveSheet(target.sheet_name)
        setColumns(target.columns?.length ? target.columns : DEFAULT_COLUMNS)
        setRows((target.rows || []).map(r => ({ ...r, __id: uid() })))
        setDirty(false)
      }
    } catch (e) {
      setMsg('載入失敗：' + (e as Error).message + '（請先在 Supabase 執行 migration_sales_delivery.sql）')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSheets() }, [loadSheets])

  function switchSheet(name: string) {
    if (dirty && !confirm('有未儲存的變更，確定切換分頁？變更將遺失。')) return
    const s = sheets.find(x => x.sheet_name === name)
    if (!s) return
    setActiveSheet(name)
    setColumns(s.columns?.length ? s.columns : DEFAULT_COLUMNS)
    setRows((s.rows || []).map(r => ({ ...r, __id: uid() })))
    setDirty(false)
    setSortKey('')
  }

  function markDirty() { setDirty(true) }

  function updateCell(rowId: string, key: string, value: string) {
    setRows(prev => prev.map(r => {
      if (r.__id !== rowId) return r
      const next: Row = { ...r, [key]: value }
      // Auto-compute amount = qty × unit_price
      if (key === 'qty' || key === 'unit_price') {
        const q = Number(next.qty)
        const p = Number(next.unit_price)
        if (!isNaN(q) && !isNaN(p) && next.qty !== '' && next.unit_price !== '') {
          next.amount = q * p
        }
      }
      return next
    }))
    markDirty()
  }

  function updateHeader(idx: number, label: string) {
    setColumns(prev => prev.map((c, i) => i === idx ? { ...c, label } : c))
    markDirty()
  }

  function addRow() {
    setRows(prev => [...prev, emptyRow(columns)])
    markDirty()
  }

  function deleteRow(rowId: string) {
    setRows(prev => prev.filter(r => r.__id !== rowId))
    markDirty()
  }

  function addColumn() {
    const key = 'col_' + uid()
    setColumns(prev => [...prev, { key, label: '新欄位', type: 'text', width: 100 }])
    setRows(prev => prev.map(r => ({ ...r, [key]: '' })))
    markDirty()
  }

  function deleteColumn(idx: number) {
    const col = columns[idx]
    if (!confirm(`刪除欄位「${col.label || col.key}」？`)) return
    setColumns(prev => prev.filter((_, i) => i !== idx))
    setRows(prev => prev.map(r => {
      const n = { ...r }
      delete n[col.key]
      return n
    }))
    markDirty()
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Drag-reorder columns
  function onDragStart(idx: number) { dragCol.current = idx }
  function onDrop(idx: number) {
    const from = dragCol.current
    dragCol.current = null
    if (from === null || from === idx) return
    setColumns(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      return next
    })
    markDirty()
  }

  const displayRows = useMemo(() => {
    if (!sortKey) return rows
    const col = columns.find(c => c.key === sortKey)
    const isNum = col?.type === 'number'
    return [...rows].sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = isNum
        ? (Number(va) || 0) - (Number(vb) || 0)
        : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, columns, sortKey, sortDir])

  const totalWidth = useMemo(
    () => INDEX_W + columns.reduce((s, c) => s + (c.width || 100), 0),
    [columns]
  )

  const rowVirtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => ROW_H,
    overscan: 15,
  })

  async function handleSave() {
    setSaving(true)
    setMsg('')
    try {
      const cleanRows: DeliveryRow[] = rows.map(r => {
        const rest: DeliveryRow = { ...r }
        delete (rest as Record<string, unknown>).__id
        return rest
      })
      await saveDeliverySheet(activeSheet, columns, cleanRows)
      setDirty(false)
      setMsg('已儲存 ✓')
      setTimeout(() => setMsg(''), 2000)
    } catch (e) {
      setMsg('儲存失敗：' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setMsg('AI 解析發注書中…')
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const order = await parseOrderPdf(base64, file.name)
      const newRow = emptyRow(columns)
      const setIf = (key: string, val: string | number | null) => {
        if (val !== null && val !== undefined && columns.some(c => c.key === key)) newRow[key] = val
      }
      setIf('order_date', order.order_date)
      setIf('slip_code', order.slip_code)
      setIf('name', order.name)
      setIf('qty', order.qty)
      setIf('unit_price', order.unit_price)
      setIf('amount', order.amount)
      setIf('delivery_date', order.delivery_date)
      setRows(prev => [...prev, newRow])
      markDirty()
      setMsg(`已帶入：${order.slip_code || ''} ${order.name || ''}（記得按儲存）`)
    } catch (err) {
      setMsg('解析失敗：' + (err as Error).message)
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('匯入會以 Excel 內容覆蓋同名分頁，確定匯入？')) {
      if (excelRef.current) excelRef.current.value = ''
      return
    }
    setImporting(true)
    setMsg('解析 Excel 中…')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const sheetsToImport: ImportSheet[] = []

      wb.SheetNames.forEach((sn, si) => {
        const ws = wb.Sheets[sn]
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, blankrows: false })
        if (!aoa.length) return

        // Locate header row (scan first 5 rows for 発注/伝票/納期)
        let headerIdx = 0
        for (let i = 0; i < Math.min(5, aoa.length); i++) {
          const joined = (aoa[i] || []).map(x => String(x ?? '')).join('')
          if (joined.includes('発注') || joined.includes('伝票') || joined.includes('納期')) { headerIdx = i; break }
        }
        const headerRow = (aoa[headerIdx] || []) as unknown[]

        // Determine true column count (sheet_to_json returns SPARSE arrays for blank
        // cells; forEach would skip holes and shift columns, so iterate by index)
        let colCount = headerRow.length
        for (let r = headerIdx + 1; r < aoa.length; r++) {
          const L = (aoa[r] as unknown[] | undefined)?.length || 0
          if (L > colCount) colCount = L
        }

        const cols: DeliveryColumn[] = []
        const usedKeys = new Set<string>()
        let prevKey: string | null = null
        for (let i = 0; i < colCount; i++) {
          const label = String(headerRow[i] ?? '').trim()
          let key: string, type: ColumnType, finalLabel = label
          const known = KNOWN_HEADERS[label]
          if (known) {
            key = known.key; type = known.type
          } else if (!label && prevKey === 'slip_code') {
            key = 'name'; type = 'text'; finalLabel = '名稱'
          } else if (!label && prevKey === 'delivery_date') {
            key = 'col_h'; type = 'text'
          } else {
            key = 'col_' + i; type = 'text'
          }
          if (usedKeys.has(key)) key = key + '_' + i
          usedKeys.add(key)
          cols.push({ key, label: finalLabel, type, width: DEFAULT_WIDTHS[key] || 100 })
          prevKey = key
        }

        const dataRows: DeliveryRow[] = []
        for (let r = headerIdx + 1; r < aoa.length; r++) {
          const arr = (aoa[r] || []) as unknown[]
          if (!arr.length || arr.every(c => c === null || c === undefined || String(c).trim() === '')) continue
          const obj: DeliveryRow = {}
          cols.forEach((c, i) => { obj[c.key] = convertValue(arr[i], c.type) })
          dataRows.push(obj)
        }

        // Drop noise columns: blank label + generated key + entirely empty in all rows
        const keptCols = cols.filter(c => {
          const isNoise = !c.label && c.key.startsWith('col_') &&
            dataRows.every(r => r[c.key] === '' || r[c.key] === null || r[c.key] === undefined)
          return !isNoise
        })
        if (keptCols.length !== cols.length) {
          const keptKeys = new Set(keptCols.map(c => c.key))
          dataRows.forEach(r => {
            Object.keys(r).forEach(k => { if (!keptKeys.has(k)) delete r[k] })
          })
        }

        sheetsToImport.push({ sheet_name: sn, sheet_order: si + 1, columns: keptCols, rows: dataRows })
      })

      const totalRows = sheetsToImport.reduce((s, x) => s + x.rows.length, 0)
      setMsg(`寫入資料庫中…（${sheetsToImport.length} 分頁 / ${totalRows} 列）`)
      await importDeliverySheets(sheetsToImport)
      await loadSheets(activeSheet)
      setMsg(`匯入完成 ✓ 共 ${sheetsToImport.length} 分頁、${totalRows} 列`)
    } catch (err) {
      setMsg('匯入失敗：' + (err as Error).message)
    } finally {
      setImporting(false)
      if (excelRef.current) excelRef.current.value = ''
    }
  }

  function handleExport() {
    const aoa: (string | number | null)[][] = []
    aoa.push(columns.map(c => c.label || c.key))
    displayRows.forEach(r => aoa.push(columns.map(c => r[c.key] ?? '')))
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = columns.map(c => ({ wpx: c.width || 100 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, activeSheet.slice(0, 31) || 'Sheet1')
    XLSX.writeFile(wb, `交期表_${activeSheet}.xlsx`)
  }

  async function handleNewSheet() {
    const name = prompt('新分頁名稱（例如 2027.01~）：')
    if (!name) return
    try {
      await createDeliverySheet(name.trim(), sheets.length + 1)
      await loadSheets(name.trim())
    } catch (e) {
      setMsg('建立失敗：' + (e as Error).message)
    }
  }

  const btn: React.CSSProperties = {
    fontSize: '8px', padding: '3px 8px', cursor: 'pointer',
    background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)',
    fontFamily: 'monospace', whiteSpace: 'nowrap',
  }

  if (loading) return <div style={{ fontSize: '9px', padding: '12px' }}>載入中…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Sheet tabs */}
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: '4px' }}>
        {sheets.map(s => (
          <button key={s.sheet_name} onClick={() => switchSheet(s.sheet_name)}
            style={{ ...btn, fontWeight: s.sheet_name === activeSheet ? 'bold' : 'normal',
              background: s.sheet_name === activeSheet ? 'var(--bg-inset)' : 'var(--bg-window)' }}>
            {s.sheet_name}
          </button>
        ))}
        <button onClick={handleNewSheet} style={btn}>＋分頁</button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
        <button onClick={() => fileRef.current?.click()} style={{ ...btn, fontWeight: 'bold' }} disabled={parsing}>
          {parsing ? '解析中…' : '上傳發注書 PDF'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleUpload} />
        <button onClick={() => excelRef.current?.click()} style={btn} disabled={importing}>
          {importing ? '匯入中…' : '匯入 Excel'}
        </button>
        <input ref={excelRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportExcel} />
        <button onClick={addRow} style={btn}>＋新增列</button>
        <button onClick={addColumn} style={btn}>＋新增欄</button>
        <button onClick={handleExport} style={btn}>匯出 Excel</button>
        <button onClick={handleSave} style={{ ...btn, fontWeight: 'bold', background: dirty ? 'var(--accent-blue)' : 'var(--bg-window)', color: dirty ? '#fff' : 'var(--text-primary)' }} disabled={saving || !dirty}>
          {saving ? '儲存中…' : dirty ? '● 儲存變更' : '已儲存'}
        </button>
        {msg && <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{msg}</span>}
        <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'var(--text-muted)' }}>共 {rows.length} 列</span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-mid-dark)', minHeight: 0, fontFamily: 'monospace', fontSize: '8px' }}>
        {/* Header (horizontal-scroll synced with body) */}
        <div ref={headerRef} style={{ overflow: 'hidden', flexShrink: 0, background: 'var(--bg-inset)' }}>
          <div style={{ width: totalWidth, display: 'flex', height: HEADER_H }}>
            <div style={{ width: INDEX_W, flexShrink: 0, borderRight: '1px solid var(--border-mid-dark)', borderBottom: '1px solid var(--border-mid-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>#</div>
            {columns.map((c, idx) => (
              <div key={c.key}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(idx)}
                style={{ width: c.width || 100, flexShrink: 0, borderRight: '1px solid var(--border-mid-dark)', borderBottom: '1px solid var(--border-mid-dark)', display: 'flex', alignItems: 'center', gap: '1px', padding: '0 2px', cursor: 'grab' }}>
                <span onClick={() => toggleSort(c.key)} title="排序" style={{ cursor: 'pointer', fontSize: '8px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                </span>
                <input value={c.label} onChange={e => updateHeader(idx, e.target.value)}
                  placeholder="(無標題)"
                  style={{ width: '100%', minWidth: 0, fontSize: '8px', fontWeight: 'bold', fontFamily: 'monospace', border: 'none', background: 'transparent', textAlign: 'center', padding: 0, outline: 'none' }} />
                <span onClick={() => deleteColumn(idx)} title="刪除欄" style={{ cursor: 'pointer', fontSize: '9px', color: 'var(--status-danger, #c00)', flexShrink: 0 }}>×</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body (the only scroller) */}
        <div
          ref={bodyRef}
          onScroll={e => { if (headerRef.current) headerRef.current.scrollLeft = e.currentTarget.scrollLeft }}
          style={{ flex: 1, overflow: 'auto', minHeight: 0, position: 'relative' }}
        >
          {displayRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
              尚無資料 — 上傳發注書 PDF、匯入 Excel，或按「＋新增列」開始
            </div>
          ) : (
            <div style={{ width: totalWidth, height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map(vi => {
                const r = displayRows[vi.index]
                return (
                  <div key={r.__id}
                    style={{ position: 'absolute', top: 0, left: 0, width: totalWidth, height: ROW_H, transform: `translateY(${vi.start}px)`, display: 'flex', background: vi.index % 2 ? 'var(--bg-window)' : 'transparent' }}>
                    <div style={{ width: INDEX_W, flexShrink: 0, borderRight: '1px solid var(--border-mid-dark)', borderBottom: '1px solid var(--border-light, #eee)', background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}>{vi.index + 1}</span>
                      <span onClick={() => deleteRow(r.__id)} title="刪除列" style={{ cursor: 'pointer', color: 'var(--status-danger, #c00)', fontSize: '9px' }}>×</span>
                    </div>
                    {columns.map(c => {
                      const isEditing = editing?.id === r.__id && editing?.key === c.key
                      const val = r[c.key] ?? ''
                      return (
                        <div key={c.key}
                          onClick={() => { if (!isEditing) setEditing({ id: r.__id, key: c.key }) }}
                          style={{ width: c.width || 100, flexShrink: 0, borderRight: '1px solid var(--border-light, #eee)', borderBottom: '1px solid var(--border-light, #eee)', display: 'flex', alignItems: 'center', overflow: 'hidden', cursor: 'text', justifyContent: c.type === 'number' ? 'flex-end' : 'flex-start', padding: '0 3px' }}>
                          {isEditing ? (
                            <input
                              autoFocus
                              value={val as string | number}
                              onChange={e => updateCell(r.__id, c.key, e.target.value)}
                              onBlur={() => setEditing(null)}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setEditing(null) } }}
                              type={c.type === 'date' ? 'date' : 'text'}
                              inputMode={c.type === 'number' ? 'decimal' : undefined}
                              style={{ width: '100%', minWidth: 0, fontSize: '8px', fontFamily: 'monospace', border: '1px solid var(--accent-blue)', background: '#fff', padding: '1px 2px', outline: 'none', textAlign: c.type === 'number' ? 'right' : 'left', boxSizing: 'border-box' }}
                            />
                          ) : (
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.type === 'number' && val !== '' ? Number(val).toLocaleString() : String(val)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
