import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || ''
const FAX_API_KEY = process.env.FAX_API_KEY || ''

const FAX_ANALYSIS_PROMPT = `你是一個專業的傳真訂單分析助手。請分析以下傳真文件，回傳 **純 JSON**（不要 markdown 格式，不要 \`\`\`json 標記）：

{
  "customer_name": "客戶公司名稱（若無法辨識則 null）",
  "customer_address": "客戶地址（若無則 null）",
  "customer_contact": "客戶聯絡人姓名（若無則 null）",
  "customer_phone": "客戶電話/傳真號碼（若無則 null）",
  "order_number": "訂單編號/PO Number（若無則 null）",
  "order_date": "訂單日期 YYYY-MM-DD（若無則 null）",
  "delivery_date": "交期/希望交貨日 YYYY-MM-DD（若無則 null）",
  "order_items": [
    {
      "name": "品項名稱/品號",
      "quantity": "數量",
      "unit": "單位（個/件/pcs等）",
      "spec": "規格描述",
      "note": "備註"
    }
  ],
  "our_contact_person": "我方對應窗口/業務人員姓名（若文件中有提到則填寫，否則 null）",
  "total_amount": "總金額（若有則填寫，否則 null）",
  "currency": "幣別（TWD/USD/JPY等，若有則填寫，否則 null）",
  "payment_terms": "付款條件（若有則填寫，否則 null）",
  "special_notes": "特殊備註或要求（若有則填寫，否則 null）",
  "document_type": "文件類型判斷（如：採購訂單/報價請求/出貨通知/一般傳真/其他）",
  "confidence": 0.85,
  "summary": "50字以內的文件摘要"
}

注意：
- 仔細辨識所有文字，包含手寫部分
- order_items 要盡量列出所有品項
- confidence 為 0-1 的信心度分數，根據文件清晰度和內容完整性判斷
- 如果是圖片，請盡力辨識所有可見文字
- 對應窗口人員通常會在傳真頭部的「收件人/TO/敬啟」等欄位出現
- 若整份文件無法辨識或非訂單文件，仍需回傳 JSON 結構但欄位填 null，document_type 填「其他」`

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
    // SECURITY: Only accept internal calls (from upload route) with matching key
    const internalKey = request.headers.get('x-internal-key') || ''
    if (!FAX_API_KEY || internalKey !== FAX_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fax_id, file_url, file_name } = await request.json()
    faxId = fax_id

    if (!fax_id) {
      return NextResponse.json({ error: 'fax_id required' }, { status: 400 })
    }

    // Mark as analyzing
    await supabase.from('faxes').update({ status: 'analyzing' }).eq('id', fax_id)

    if (!GEMINI_API_KEY) {
      await supabase
        .from('faxes')
        .update({ status: 'analyzed', notes: 'AI key not configured — manual review required' })
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
      // Multimodal analysis — download and send as image
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
        // Fallback: try text-only prompt
        result = await model.generateContent(
          FAX_ANALYSIS_PROMPT + `\n\n文件名稱：${file_name}\n[檔案載入失敗，請根據檔名判斷]`
        )
      }
    } else {
      // Text-based (shouldn't normally happen for faxes)
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
        customer_name: null,
        customer_address: null,
        customer_contact: null,
        order_number: null,
        order_items: [],
        our_contact_person: null,
        confidence: 0,
        summary: 'AI analysis failed — manual review required',
        document_type: '其他',
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

    // Update fax record
    await supabase
      .from('faxes')
      .update({
        status: 'analyzed',
        customer_name: analysis.customer_name || null,
        customer_address: analysis.customer_address || null,
        customer_contact: analysis.customer_contact || null,
        order_number: analysis.order_number || null,
        order_items: analysis.order_items || [],
        our_contact_person: analysis.our_contact_person || null,
        our_contact_user_id: contactUserId,
        ai_confidence: analysis.confidence || null,
        ai_raw_response: analysis,
      })
      .eq('id', fax_id)

    // Create in-app notification: auto-assign a calendar task to the contact person
    if (contactUserId && analysis.customer_name) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const taskTitle = `[FAX] ${analysis.customer_name} — ${analysis.order_number || '訂單'}`

        // Check if a matching task_definition exists; create one if not
        const { data: existingDef } = await supabase
          .from('task_definitions')
          .select('id')
          .eq('title', taskTitle)
          .limit(1)

        let taskDefId: number
        if (existingDef && existingDef.length > 0) {
          taskDefId = existingDef[0].id
        } else {
          const { data: newDef } = await supabase
            .from('task_definitions')
            .insert({
              title: taskTitle,
              description: `type:assignment`,
              frequency: 'event_triggered',
              difficulty_level: 1,
              base_points: 2,
              requires_photo: false,
              requires_approval: false,
              default_assignee_id: contactUserId,
              is_active: true,
            })
            .select('id')
            .single()
          taskDefId = newDef?.id
        }

        if (taskDefId) {
          await supabase.from('daily_assignments').insert({
            task_def_id: taskDefId,
            user_id: contactUserId,
            assigned_date: today,
            status: 'pending',
            comment: `FAX from ${analysis.customer_name}. Order#: ${analysis.order_number || 'N/A'}. File: ${file_name}`,
          })
        }
      } catch (notifyErr) {
        console.error('[fax/analyze] Notification creation failed:', notifyErr)
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
