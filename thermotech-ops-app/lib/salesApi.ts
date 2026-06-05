import { supabase } from './api'

export type ColumnType = 'text' | 'number' | 'date'

export interface DeliveryColumn {
  key: string
  label: string
  type: ColumnType
  width?: number
}

export type DeliveryRow = Record<string, string | number | null>

export interface DeliverySchedule {
  id: string
  sheet_name: string
  sheet_order: number
  columns: DeliveryColumn[]
  rows: DeliveryRow[]
  updated_at: string
}

export const DEFAULT_COLUMNS: DeliveryColumn[] = [
  { key: 'order_date', label: '発注日', type: 'date', width: 100 },
  { key: 'slip_code', label: '伝票コード', type: 'text', width: 110 },
  { key: 'name', label: '名稱', type: 'text', width: 200 },
  { key: 'qty', label: '数量', type: 'number', width: 70 },
  { key: 'unit_price', label: '単価', type: 'number', width: 90 },
  { key: 'amount', label: '金額', type: 'number', width: 100 },
  { key: 'delivery_date', label: '希望納期', type: 'date', width: 100 },
  { key: 'col_h', label: '', type: 'text', width: 70 },
  { key: 'remark', label: '備考', type: 'text', width: 140 },
  { key: 'factory', label: '工場', type: 'text', width: 80 },
  { key: 'invoice', label: 'Invoice', type: 'text', width: 130 },
  { key: 'work_order', label: '工單號碼', type: 'text', width: 110 },
]

export async function listDeliverySheets(): Promise<DeliverySchedule[]> {
  const { data, error } = await supabase
    .from('delivery_schedules')
    .select('*')
    .order('sheet_order', { ascending: true })
  if (error) throw error
  return (data || []) as DeliverySchedule[]
}

export async function getDeliverySheet(sheetName: string): Promise<DeliverySchedule | null> {
  const { data, error } = await supabase
    .from('delivery_schedules')
    .select('*')
    .eq('sheet_name', sheetName)
    .maybeSingle()
  if (error) throw error
  return data as DeliverySchedule | null
}

export async function saveDeliverySheet(
  sheetName: string,
  columns: DeliveryColumn[],
  rows: DeliveryRow[],
  updatedBy?: string
): Promise<void> {
  const { error } = await supabase
    .from('delivery_schedules')
    .update({
      columns,
      rows,
      updated_by: updatedBy || null,
      updated_at: new Date().toISOString(),
    })
    .eq('sheet_name', sheetName)
  if (error) throw error
}

export async function createDeliverySheet(
  sheetName: string,
  sheetOrder: number,
  columns: DeliveryColumn[] = DEFAULT_COLUMNS
): Promise<DeliverySchedule> {
  const { data, error } = await supabase
    .from('delivery_schedules')
    .insert({ sheet_name: sheetName, sheet_order: sheetOrder, columns, rows: [] })
    .select('*')
    .single()
  if (error) throw error
  return data as DeliverySchedule
}

export interface ImportSheet {
  sheet_name: string
  sheet_order: number
  columns: DeliveryColumn[]
  rows: DeliveryRow[]
}

// Batch import: upsert each sheet by sheet_name (overwrites existing same-name sheet)
export async function importDeliverySheets(sheetsToImport: ImportSheet[]): Promise<void> {
  for (const s of sheetsToImport) {
    const { error } = await supabase
      .from('delivery_schedules')
      .upsert(
        {
          sheet_name: s.sheet_name,
          sheet_order: s.sheet_order,
          columns: s.columns,
          rows: s.rows,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'sheet_name' }
      )
    if (error) throw error
  }
}

export interface ParsedOrder {
  order_date: string | null
  slip_code: string | null
  name: string | null
  qty: number | null
  unit_price: number | null
  amount: number | null
  delivery_date: string | null
  raw?: unknown
}

// Send a 発注書 PDF (base64) to the server for Gemini parsing
export async function parseOrderPdf(fileBase64: string, fileName: string): Promise<ParsedOrder> {
  const res = await fetch('/api/sales/parse-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_base64: fileBase64, file_name: fileName }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'PDF 解析失敗')
  return json.order as ParsedOrder
}
