import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || ''
const FAX_API_KEY = process.env.FAX_API_KEY || ''

function buildFaxPrompt(internalContacts: { name: string; aliases: string[] | null }[]): string {
  // Build "our staff" list section for AI prompt
  let staffSection = ''
  if (internalContacts.length > 0) {
    const lines = internalContacts.map(c => {
      const all = [c.name, ...(c.aliases || [])].filter(Boolean)
      return `  - ${c.name}${c.aliases && c.aliases.length > 0 ? ` (別名: ${c.aliases.join('、')})` : ''}`
    }).join('\n')
    staffSection = `

【★最重要★ 我方窗口人員清單】
以下是我方公司的所有窗口/業務人員，**只有在這份清單中的人才可能是 our_contact_person**：
${lines}

判讀規則：
1. 若文件中「收件人/ATTN/敬啟/TO/我方窗口/承辦人」欄位的姓名與清單中的某人相符（容許 OCR 錯字、缺字、字形類似），請填入清單中的「正確姓名」（不是原始辨識出的字）
2. 同時填入 our_contact_raw 為文件上實際看到的原始文字（含 OCR 錯誤）
3. 若文件中的姓名**不在清單中**或無法匹配（例如那是對方公司的簽核人員、廠商人員、或完全無法辨識），請：
   - our_contact_person 設為 null
   - our_contact_raw 仍填入原始辨識文字
   - our_contact_uncertain 設為 true
4. 簽名/印章可能是對方上級主管核準，**不要**自動當成我方窗口
5. 我方窗口通常出現在「收件人/TO/ATTN」位置，而非「核準/簽收/簽名」欄`
  } else {
    staffSection = `

【our_contact_person 判讀】
- 從文件「收件人/TO/ATTN/敬啟」欄位辨識我方窗口人員
- our_contact_raw 為原始辨識文字（含 OCR 錯誤）
- 若無法判定，our_contact_person 設 null、our_contact_uncertain 設 true`
  }

  return `你是一個專業的商業傳真文件分析助手。請仔細分析以下傳真文件，回傳 **純 JSON**（不要 markdown 格式，不要 \`\`\`json 標記）：

{
  "document_type": "文件分類（必須是以下其中一種）",
  "customer_name": "客戶/發送方公司名稱",
  "customer_address": "客戶地址",
  "customer_contact": "客戶聯絡人姓名",
  "customer_phone": "客戶電話/傳真號碼",
  "our_contact_person": "我方對應窗口姓名（必須是清單中的正確姓名，否則為 null）",
  "our_contact_raw": "文件上實際辨識到的原始文字（含 OCR 錯誤）",
  "our_contact_uncertain": false,
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
${staffSection}

注意：
- 仔細辨識所有文字，包含手寫部分和印章
- order_items 要盡量列出所有品項，若非訂單則留空陣列 []
- confidence 為 0-1 的信心度分數
- 即使不是訂單，仍要盡量抽取客戶名稱、聯絡人等資訊
- action_required 要根據文件類型給出具體建議
- urgency: 訂單/品質問題=high, 漲價/報價=medium, 其他=low
- special_notes 放入所有未被其他欄位涵蓋的重要資訊`
}

// Server-side fuzzy match — verify AI's choice against the actual contact list
function fuzzyMatchContact(
  candidate: string | null | undefined,
  contacts: { id: string; name: string; aliases: string[] | null }[]
): { id: string; name: string } | null {
  if (!candidate || typeof candidate !== 'string') return null
  const c = candidate.replace(/\s/g, '').toLowerCase()
  if (!c) return null

  // Exact / substring match first
  for (const contact of contacts) {
    const namesToCheck = [contact.name, ...(contact.aliases || [])].filter(Boolean)
    for (const n of namesToCheck) {
      const norm = n.replace(/\s/g, '').toLowerCase()
      if (norm === c || c.includes(norm) || norm.includes(c)) {
        return { id: contact.id, name: contact.name }
      }
    }
  }

  // Character overlap match (handles OCR typos in Chinese names)
  let best: { id: string; name: string; score: number } | null = null
  for (const contact of contacts) {
    const namesToCheck = [contact.name, ...(contact.aliases || [])].filter(Boolean)
    for (const n of namesToCheck) {
      const norm = n.replace(/\s/g, '').toLowerCase()
      if (norm.length < 2) continue
      // Count common characters
      const set1 = new Set(c.split(''))
      const set2 = new Set(norm.split(''))
      let common = 0
      set1.forEach(ch => { if (set2.has(ch)) common++ })
      const overlap = common / Math.max(set1.size, set2.size)
      // Threshold: >=60% character overlap and at least 2 common chars
      if (overlap >= 0.6 && common >= 2) {
        if (!best || overlap > best.score) {
          best = { id: contact.id, name: contact.name, score: overlap }
        }
      }
    }
  }
  return best ? { id: best.id, name: best.name } : null
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    ai_available: !!GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
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

    // Fetch internal contacts list for fuzzy matching
    const { data: contactsData } = await supabase
      .from('fax_internal_contacts')
      .select('id, name, aliases')
      .eq('active', true)
    const internalContacts: { id: string; name: string; aliases: string[] | null }[] = contactsData || []
    const FAX_ANALYSIS_PROMPT = buildFaxPrompt(internalContacts)

    if (!GEMINI_API_KEY) {
      await supabase
        .from('faxes')
        .update({ status: 'analyzed', document_type: 'unknown', notes: 'AI key not configured' })
        .eq('id', fax_id)
      return NextResponse.json({ success: true, ai_available: false })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    // Try gemini-2.5-flash first (newest, best accuracy), fall back to 2.0-flash on rate limit
    const PRIMARY_MODEL = 'gemini-2.5-flash'
    const FALLBACK_MODEL = 'gemini-2.0-flash'

    const ext = (file_name || file_url || '').split('.').pop()?.toLowerCase() || ''
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tif', 'tiff', 'bmp'].includes(ext)
    const isPdf = ext === 'pdf'

    let mimeType = 'image/jpeg'
    if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'gif') mimeType = 'image/gif'
    else if (ext === 'webp') mimeType = 'image/webp'
    else if (ext === 'pdf') mimeType = 'application/pdf'
    else if (ext === 'tif' || ext === 'tiff') mimeType = 'image/tiff'

    // Pre-fetch the file content (so we can retry without re-downloading)
    // Use Supabase service-role download instead of HTTP fetch — works for private buckets too
    let base64: string | null = null
    if ((isImage || isPdf) && file_url) {
      // Extract storage path from URL
      let storagePath = ''
      if (file_url.includes('/storage/v1/object/public/fax-files/')) {
        storagePath = file_url.split('/storage/v1/object/public/fax-files/')[1].split('?')[0]
      } else if (file_url.includes('/storage/v1/object/sign/fax-files/')) {
        storagePath = file_url.split('/storage/v1/object/sign/fax-files/')[1].split('?')[0]
      } else if (file_url.includes('fax-files/')) {
        storagePath = file_url.substring(file_url.indexOf('fax-files/') + 'fax-files/'.length).split('?')[0]
      }

      if (storagePath) {
        try {
          const { data: blob, error: dlErr } = await supabase.storage
            .from('fax-files')
            .download(storagePath)
          if (dlErr) throw dlErr
          if (blob) {
            const arr = await blob.arrayBuffer()
            base64 = Buffer.from(arr).toString('base64')
            console.log(`[fax/analyze] Downloaded ${storagePath} via service-role (${arr.byteLength} bytes)`)
          }
        } catch (e: any) {
          console.error('[fax/analyze] Storage download failed:', e?.message, 'path:', storagePath)
          // Fallback: try direct HTTP fetch (works if bucket still public)
          try {
            const fileResponse = await fetch(file_url)
            if (fileResponse.ok) {
              const arr = await fileResponse.arrayBuffer()
              base64 = Buffer.from(arr).toString('base64')
            }
          } catch { /* ignore */ }
        }
      } else {
        // No path could be extracted — try direct fetch
        try {
          const fileResponse = await fetch(file_url)
          if (fileResponse.ok) {
            const arr = await fileResponse.arrayBuffer()
            base64 = Buffer.from(arr).toString('base64')
          }
        } catch (e: any) {
          console.error('[fax/analyze] Direct fetch failed:', e?.message)
        }
      }
    }

    // Retry loop: try primary model, fallback model, with exponential backoff for 429
    async function callGemini(modelName: string): Promise<any> {
      const model = genAI.getGenerativeModel({ model: modelName })
      if (base64) {
        return await model.generateContent([
          FAX_ANALYSIS_PROMPT + '\n\n請分析這份傳真文件中的所有內容：',
          { inlineData: { data: base64, mimeType } },
        ])
      }
      return await model.generateContent(
        FAX_ANALYSIS_PROMPT + `\n\n文件名稱：${file_name}\n[檔案無法載入，請依檔名判斷]`
      )
    }

    let result: any = null
    let lastError: any = null
    // Aggressive retry to survive rate-limit bursts (paid accounts have RPM limits too)
    const attempts: { model: string; delayMs: number }[] = [
      { model: PRIMARY_MODEL, delayMs: 0 },
      { model: PRIMARY_MODEL, delayMs: 3000 },
      { model: PRIMARY_MODEL, delayMs: 8000 },
      { model: FALLBACK_MODEL, delayMs: 2000 },
      { model: FALLBACK_MODEL, delayMs: 10000 },
    ]

    for (const attempt of attempts) {
      if (attempt.delayMs > 0) await new Promise(r => setTimeout(r, attempt.delayMs))
      try {
        result = await callGemini(attempt.model)
        break
      } catch (e: any) {
        lastError = e
        const msg = String(e?.message || '')
        const is429 = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted') || msg.toLowerCase().includes('rate')
        console.warn(`[fax/analyze] Attempt failed (${attempt.model}): ${msg.slice(0, 150)}`)
        if (!is429) break
      }
    }

    if (!result) {
      const msg = String(lastError?.message || '')
      const is429 = msg.includes('429') || msg.toLowerCase().includes('quota')
      const errMsg = is429
        ? 'Gemini API 速率超過：可能是免費版每日 1500 次用完，或付費版瞬間呼叫過多。請點 RE-ANALYZE 重試，或檢查 Google AI Studio Plan 狀態。'
        : `AI 分析失敗：${msg.slice(0, 200)}`
      await supabase
        .from('faxes')
        .update({ status: 'error', notes: errMsg, document_type: 'unknown' })
        .eq('id', fax_id)
      return NextResponse.json({ error: errMsg, quota_exceeded: is429 }, { status: 200 })
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

    // ============================================
    // Verify our_contact_person against internal contacts
    // (server-side fuzzy match to defend against AI hallucination)
    // ============================================
    let matchedContactId: string | null = null
    let matchedContactName: string | null = null
    let isUncertain = !!analysis.our_contact_uncertain
    const rawText = analysis.our_contact_raw || analysis.our_contact_person || null

    if (internalContacts.length > 0) {
      // First check what AI claimed
      const aiPick = analysis.our_contact_person
      const matched = fuzzyMatchContact(aiPick, internalContacts)
        || fuzzyMatchContact(rawText, internalContacts)
      if (matched) {
        matchedContactId = matched.id
        matchedContactName = matched.name
        isUncertain = false
      } else {
        // AI's pick wasn't in the list — flag as uncertain
        matchedContactName = null
        isUncertain = true
      }
    } else {
      // No contact list yet — accept AI's answer as-is, no matching done
      matchedContactName = analysis.our_contact_person || null
      isUncertain = !!analysis.our_contact_uncertain
    }

    // Also try to match to profiles table for assignment / LINE notification (legacy)
    let contactUserId: string | null = null
    if (matchedContactName) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${matchedContactName}%`)
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
        our_contact_person: matchedContactName,
        our_contact_user_id: contactUserId,
        our_contact_matched_id: matchedContactId,
        our_contact_raw: rawText,
        our_contact_uncertain: isUncertain,
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
