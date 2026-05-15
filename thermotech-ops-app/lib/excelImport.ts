import * as XLSX from 'xlsx'

export interface ParsedRow {
  [key: string]: string | number | null
}

export type RawSheet = (string | number | null)[][]

export function parseExcelFile(file: File): Promise<{ sheetNames: string[]; sheets: Record<string, ParsedRow[]>; rawSheets: Record<string, RawSheet> }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheets: Record<string, ParsedRow[]> = {}
        const rawSheets: Record<string, RawSheet> = {}
        for (const name of workbook.SheetNames) {
          const sheet = workbook.Sheets[name]
          sheets[name] = XLSX.utils.sheet_to_json(sheet, { defval: null }) as ParsedRow[]
          rawSheets[name] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as RawSheet
        }
        resolve({ sheetNames: workbook.SheetNames, sheets, rawSheets })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsArrayBuffer(file)
  })
}

export function extractEmployeeId(row: ParsedRow): string | null {
  for (const key of Object.keys(row)) {
    if (key.includes('編號') || key.includes('employee')) {
      const val = String(row[key] || '').trim()
      if (/^\d{5}$/.test(val)) return val
    }
  }
  for (const val of Object.values(row)) {
    const s = String(val || '').trim()
    if (/^\d{5}$/.test(s)) return s
  }
  return null
}

export function parseDate(val: any): string | null {
  if (!val) return null
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10)
  }
  const s = String(val).trim()
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  const m2 = s.match(/^(\d{1,2})[/-](\d{1,2})$/)
  if (m2) {
    const now = new Date()
    return `${now.getFullYear()}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`
  }
  return null
}

export function findHeaderRow(rawSheet: RawSheet, keyword: string): number {
  for (let i = 0; i < Math.min(10, rawSheet.length); i++) {
    const row = rawSheet[i]
    if (row && row.some(cell => cell && String(cell).includes(keyword))) {
      return i
    }
  }
  return 0
}
