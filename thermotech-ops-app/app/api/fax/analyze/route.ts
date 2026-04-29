import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || ''
const FAX_API_KEY = process.env.FAX_API_KEY || ''

const FAX_ANALYSIS_PROMPT = `你是一個專業的商業傳真文件分析助手。請仔細分析以下傳真文件，回傳 **純 JSON**（不要 markdown 格式，不要 \`\`\`json 標記）：

{
  "document_type": "文件分類（必須是以下其中一種）",
  "customer_name": "客戶/發送方公司名稱",
  "customer_address": "客戶地址",
  "customer_contact": "客戶聯絡人姓名",
  "customer_phone": "客戶電話/傳真號碼",
  "our_contact_person": "我方對應窗口/收件人姓名",
  "order_number": "訂單編號/PO Number",
  "order_date": "訂單/文件日期 YYYY-MM-DD",
  "delivery_date": "交期/希望交貨日 YYYY-MM-DD",
  "order_items": [
    { "name": "品項名稱/品號", "quantity": "數量", "unit": "單位", "spec": "規格", "note": "備註" }
  ],
  "total_amount": "總金額",
  "currency": "幣別（TWD/USD/JPY等）",
  "payment_terms": "付款條件",
  "special_notes": "特殊備註、要求、或文件中其他重要內容",
  "confidence": 0.85,
  "summary": "60字以內的文件摘要（中文）",
  "action_required": "建議的處理行動（中文，如：需確認交期、需回覆報價、僅供存檔等）",
  "urgency": "急迫程度（high/medium/low）"
}

【document_type 分類標準】必須選擇最匹配的一種：
- "採購訂單" — 客戶下訂單、PO、Purchase Order
- "報價請求" — 客戶詢價、RFQ、Request for Quotation
- "出貨通知" — 出貨相關、Shipping Notice、Delivery Note
- "漲價通知" — 原料漲價、價格調整、Price Change Notice
- "轉帳通知" — 匯款通知、Payment Advice、銀行轉帳
- "地址變更" — 客戶地址/聯絡方式變更
- "品質通知" — 品質異常、客訴、Complaint
- "合約文件" — 合約、協議書、Contract
- "一般通知" — 其他通知類、公告
- "其他" — 無法歸類的文件

注意：
- 仔細辨識所有文字，包含手寫部分和印章
- order_items 要盡量列出所有品項，若非訂單則留空陣列 []
- confidence 為 0-1 的信心度分數
- 對應窗口人員通常在「收件人/TO/敬啟/ATTN」欄位
- 即使不是訂單，仍要盡量抽取客戶名稱、聯絡人等資訊
- action_required 要根據文件類型給出具體建議
- urgency: 訂單/品質問題=high, 漲價/報價=medium, 其他=low
- special_notes 放入所有未被其他欄位涵蓋的重要資訊`

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    ai_available: !!GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
  })
}

export async function POST(request: NextRequest) {
  let faxId = ''
  try {
    const internalKey = request.headers.get('x-internal-key') || ''
    if (!FAX_API_KEY || internalKey !== FAX_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fax_id, file_url, file_name } = await request.json()
    faxId = fax_id

    if (!fax_id) {
      return NextResponse.json({ error: 'fax_id required' }, { status: 400 })
    }

    await supabase.from('faxes').update({ status: 'analyzing' }).eq('id', fax_id)

    if (!GEMINI_API_KEY) {
      await supabase
        .from('faxes')
        .update({ status: 'analyzed', document_type: 'unknown', notes: 'AI key not configured' })
        .eq('id', fax_id)
      return NextResponse.json({ success: true, ai_available: false })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const ext = (file_name || file_url || '').split('.').pop()?.toLowerCase() || ''
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tif', 'tiff', 'bmp'].includes(ext)
    const isPdf = ext === 'pdf'

    let result

    if ((isImage || isPdf) && file_url) {
      try {
        const fileResponse = await fetch(file_url)
        const fileBuffer = await fileResponse.arrayBuffer()
        const base64 = Buffer.from(fileBuffer).toString('base64')

        let mimeType = 'image/jpeg'
        if (ext === 'png') mimeType = 'image/png'
        else if (ext === 'gif') mimeType = 'image/gif'
        else if (ext === 'webp') mimeType = 'image/webp'
        else if (ext === 'pdf') mimeType = 'application/pdf'
        else if (ext === 'tif' || ext === 'tiff') mimeType = 'image/tiff'

        result = await model.generateContent([
          FAX_ANALYSIS_PROMPT + '\n\n請分析這份傳真文件中的所有內容：',
          { inlineData: { data: base64, mimeType } },
        ])
      } catch (e: any) {
        console.error('[fax/analyze] File fetch/analysis failed:', e)
        result = await model.generateContent(
          FAX_ANALYSIS_PROMPT + `\n\n文件名稱：${file_name}\n[檔案載入失敗]`
        )
      }
    } else {
      result = await model.generateContent(
        FAX_ANALYSIS_PROMPT + `\n\n文件名稱：${file_name}\n[無法直接分析此格式]`
      )
    }

    const responseText = result.response.text()

    let analysis
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      analysis = null
    }

    if (!analysis) {
      analysis = {
        customer_name: null, customer_address: null, customer_contact: null,
        order_number: null, order_items: [], our_contact_person: null,
        confidence: 0, summary: 'AI analysis failed', document_type: '其他',
        action_required: '需人工檢視', urgency: 'low',
      }
    }

    // Match our_contact_person to profiles
    let contactUserId: string | null = null
    if (analysis.our_contact_person) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${analysis.our_contact_person}%`)
        .limit(1)
      if (profiles && profiles.length > 0) {
        contactUserId = profiles[0].id
      }
    }

    // Write all extracted fields to DB
    await supabase
      .from('faxes')
      .update({
        status: 'analyzed',
        document_type: analysis.document_type || '其他',
        customer_name: analysis.customer_name || null,
        customer_address: analysis.customer_address || null,
        customer_contact: analysis.customer_contact || null,
        customer_phone: analysis.customer_phone || null,
        order_number: analysis.order_number || null,
        order_items: analysis.order_items || [],
        our_contact_person: analysis.our_contact_person || null,
        our_contact_user_id: contactUserId,
        ai_confidence: analysis.confidence || null,
        ai_raw_response: analysis,
        delivery_date: analysis.delivery_date || null,
        total_amount: analysis.total_amount || null,
        currency: analysis.currency || null,
        special_notes: analysis.special_notes || null,
      })
      .eq('id', fax_id)

    // Create in-app calendar task for the contact person
    if (contactUserId) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const docType = analysis.document_type || '傳真'
        const custName = analysis.customer_name || '未知客戶'
        const taskTitle = `[FAX-${docType}] ${custName}${analysis.order_number ? ` #${analysis.order_number}` : ''}`

        const { data: existingDef } = await supabase
          .from('task_definitions')
          .select('id').eq('title', taskTitle).limit(1)

        let taskDefId: number | undefined
        if (existingDef && existingDef.length > 0) {
          taskDefId = existingDef[0].id
        } else {
          const { data: newDef } = await supabase
            .from('task_definitions')
            .insert({
              title: taskTitle,
              description: 'type:assignment',
              frequency: 'event_triggered',
              difficulty_level: 1,
              base_points: 2,
              requires_photo: false,
              requires_approval: false,
              default_assignee_id: contactUserId,
              is_active: true,
            })
            .select('id').single()
          taskDefId = newDef?.id
        }

        if (taskDefId) {
          const comment = [
            `${docType} from ${custName}`,
            analysis.order_number ? `Order#: ${analysis.order_number}` : null,
            analysis.action_required ? `Action: ${analysis.action_required}` : null,
            analysis.urgency === 'high' ? '⚠ URGENT' : null,
          ].filter(Boolean).join(' | ')

          await supabase.from('daily_assignments').insert({
            task_def_id: taskDefId,
            user_id: contactUserId,
            assigned_date: today,
            status: 'pending',
            comment,
          })
        }
      } catch (notifyErr) {
        console.error('[fax/analyze] Notification failed:', notifyErr)
      }
    }

    return NextResponse.json({ success: true, ai_available: true, analysis, contactUserId })
  } catch (error: any) {
    console.error('[fax/analyze] Error:', error)
    if (faxId) {
      try {
        await supabase.from('faxes').update({ status: 'error', notes: error.message }).eq('id', faxId)
      } catch { /* ignore */ }
    }
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
  }
}
