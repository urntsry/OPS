import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || ''

const ORDER_PROMPT = `你是一個專業的日文「発注書（採購訂單）」解析助手。請仔細分析這份発注書 PDF，回傳**純 JSON**（不要 markdown、不要 \`\`\`json 標記）：

{
  "order_date": "發注日 YYYY-MM-DD（通常在右上角，例如 2026/6/4 -> 2026-06-04）",
  "slip_code": "伝票コード，必須是 S 開頭那組編號，例如 S-26-01938",
  "name": "品名/項目名稱，只取『品名描述』本身（例如 Heater製作、断熱材）。不要包含製番、品番等號碼",
  "qty": 數量（純數字，例如 6）,
  "unit_price": 単価（純數字，去除逗號與貨幣符號，例如 28200）,
  "amount": 金額（純數字，去除逗號與貨幣符號，例如 169200）,
  "delivery_date": "納期/希望交期 YYYY-MM-DD（左側『納期 希望』，例如 06/12，年份用發注日的年份補齊 -> 2026-06-12）"
}

【重要規則】
1. slip_code 一定要取「S-」開頭的伝票コード，不要取製番(例如 MFAC開頭)或品番(例如 26-開頭)。
2. name 只填品名文字描述，**絕對不要**包含製番或品番號碼。
3. unit_price、amount、qty 一律回傳純數字（number），不要字串、不要逗號、不要 ¥。
4. 日期一律轉成 YYYY-MM-DD。若納期只有月/日（例如 06/12），用發注日的年份補齊。
5. 若某欄位找不到，回傳 null。
6. amount 應等於 qty × unit_price，可用此關係驗證。`

export async function GET() {
  return NextResponse.json({ status: 'ok', ai_available: !!GEMINI_API_KEY, model: 'gemini-2.5-flash' })
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key 未設定' }, { status: 500 })
    }

    const { file_base64, file_name } = await request.json()
    if (!file_base64) {
      return NextResponse.json({ error: 'file_base64 required' }, { status: 400 })
    }

    // Strip data URL prefix if present
    const base64 = file_base64.includes(',') ? file_base64.split(',')[1] : file_base64
    const ext = (file_name || '').split('.').pop()?.toLowerCase() || 'pdf'
    const mimeType = ext === 'pdf' ? 'application/pdf'
      : ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg'

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const PRIMARY_MODEL = 'gemini-2.5-flash'
    const FALLBACK_MODEL = 'gemini-2.0-flash'

    async function callGemini(modelName: string) {
      const model = genAI.getGenerativeModel({ model: modelName })
      return await model.generateContent([
        ORDER_PROMPT + '\n\n請解析這份発注書：',
        { inlineData: { data: base64, mimeType } },
      ])
    }

    let result: Awaited<ReturnType<typeof callGemini>> | null = null
    let lastError: unknown = null
    const attempts: { model: string; delayMs: number }[] = [
      { model: PRIMARY_MODEL, delayMs: 0 },
      { model: PRIMARY_MODEL, delayMs: 3000 },
      { model: FALLBACK_MODEL, delayMs: 2000 },
    ]

    for (const attempt of attempts) {
      if (attempt.delayMs > 0) await new Promise(r => setTimeout(r, attempt.delayMs))
      try {
        result = await callGemini(attempt.model)
        break
      } catch (e) {
        lastError = e
        const msg = String((e as Error)?.message || '')
        const is429 = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')
        if (!is429) break
      }
    }

    if (!result) {
      const msg = String((lastError as Error)?.message || '')
      return NextResponse.json({ error: `AI 解析失敗：${msg.slice(0, 200)}` }, { status: 200 })
    }

    const responseText = result.response.text()
    let parsed: Record<string, unknown> | null = null
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      parsed = null
    }

    if (!parsed) {
      return NextResponse.json({ error: 'AI 回傳格式無法解析' }, { status: 200 })
    }

    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''))
      return isNaN(n) ? null : n
    }

    let amount = toNum(parsed.amount)
    const qty = toNum(parsed.qty)
    const unitPrice = toNum(parsed.unit_price)
    // Recompute amount if missing or mismatched
    if ((amount === null || (qty !== null && unitPrice !== null && amount !== qty * unitPrice)) && qty !== null && unitPrice !== null) {
      amount = qty * unitPrice
    }

    const order = {
      order_date: (parsed.order_date as string) || null,
      slip_code: (parsed.slip_code as string) || null,
      name: (parsed.name as string) || null,
      qty,
      unit_price: unitPrice,
      amount,
      delivery_date: (parsed.delivery_date as string) || null,
      raw: parsed,
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('[sales/parse-order] Error:', error)
    return NextResponse.json({ error: (error as Error).message || 'Parse failed' }, { status: 500 })
  }
}
