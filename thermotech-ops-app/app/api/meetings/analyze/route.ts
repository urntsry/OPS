import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || ''

const STRUCTURED_PROMPT = `你是一個專業的會議紀錄分析助手。請分析以下會議紀錄，回傳 **純 JSON**（不要 markdown 格式，不要 \`\`\`json 標記）：

{
  "meeting_info": {
    "doc_number": "表單編號（如 115041401，若無則 null）",
    "company": "公司名稱（若無則 null）",
    "subject": "會議主題",
    "chairperson": "主席姓名（若無則 null）",
    "recorder": "記錄人姓名（若無則 null）",
    "location": "地點（若無則 null）",
    "date": "會議日期 YYYY/MM/DD 格式（若無則 null）",
    "attendees": ["出席人員1", "出席人員2"]
  },
  "summary": "50字以內的會議摘要",
  "suggested_category": "建議分類（如：產線會議、管理會議、客戶會議、專案會議、品質會議、採購會議等）",
  "content_sections": [
    {
      "title": "段落標題（如：核心問題與現狀、固定方式評估與比較、待辦項目等）",
      "items": ["內容要點1", "內容要點2", "內容要點3"]
    }
  ],
  "action_items": [
    { "assignee": "負責人姓名", "description": "具體任務內容", "due_date": "YYYY-MM-DD 或 null" }
  ],
  "deadlines": [
    { "description": "時程描述", "date": "YYYY-MM-DD 或 null", "is_urgent": false }
  ],
  "key_decisions": ["重要決議1", "重要決議2"]
}

注意：
- content_sections 要盡量還原會議紀錄的段落結構，每個段落有標題和多個要點
- action_items 只列出明確指派給特定人員的任務
- attendees 列出所有提到的出席人員
- 如果是圖片，請仔細辨識所有文字內容
- 所有欄位若無法辨識就填 null 或空陣列 []`

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    ai_available: !!GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
  })
}

export async function POST(request: NextRequest) {
  let meetingId = ''
  try {
    const { meeting_id, raw_content, file_type, file_url } = await request.json()
    meetingId = meeting_id

    if (!meeting_id) {
      return NextResponse.json({ error: 'meeting_id required' }, { status: 400 })
    }

    // Mark as analyzing
    await supabase.from('meetings').update({ status: 'analyzing' }).eq('id', meeting_id)

    if (!GEMINI_API_KEY) {
      await supabase
        .from('meetings')
        .update({ status: 'analyzed', summary: (raw_content || '').slice(0, 100) + '...' })
        .eq('id', meeting_id)
      return NextResponse.json({ success: true, ai_available: false })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    let result
    let extractedText = raw_content || ''

    if (file_type === 'image' && file_url) {
      // Gemini Vision: download image and send as multimodal
      try {
        const imageResponse = await fetch(file_url)
        const imageBuffer = await imageResponse.arrayBuffer()
        const base64 = Buffer.from(imageBuffer).toString('base64')
        const mimeType = file_url.endsWith('.png') ? 'image/png' : 'image/jpeg'

        result = await model.generateContent([
          STRUCTURED_PROMPT + '\n\n請分析這張會議紀錄圖片中的所有文字內容：',
          { inlineData: { data: base64, mimeType } },
        ])

        // Also extract the raw text from the AI response for storage
        const responseText = result.response.text()
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            // Build readable raw_content from the parsed structure
            const sections = parsed.content_sections || []
            extractedText = sections.map((s: any) =>
              `【${s.title}】\n${(s.items || []).map((i: string) => `  • ${i}`).join('\n')}`
            ).join('\n\n')
            if (parsed.meeting_info?.subject) {
              extractedText = `主題：${parsed.meeting_info.subject}\n\n${extractedText}`
            }
          } catch { /* keep original */ }
        }
      } catch (e: any) {
        console.error('[analyze] Image fetch failed:', e)
        result = await model.generateContent(
          STRUCTURED_PROMPT + '\n\n會議紀錄內容：\n[圖片載入失敗]'
        )
      }
    } else {
      // Text-based analysis
      result = await model.generateContent(
        STRUCTURED_PROMPT + '\n\n會議紀錄內容：\n' + (raw_content || '').slice(0, 8000)
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
        meeting_info: { subject: null, chairperson: null, recorder: null, location: null, date: null, attendees: [], doc_number: null, company: null },
        summary: (raw_content || '').slice(0, 100),
        suggested_category: '未分類',
        content_sections: [],
        action_items: [],
        deadlines: [],
        key_decisions: [],
      }
    }

    // Ensure meeting_info exists
    if (!analysis.meeting_info) {
      analysis.meeting_info = { subject: null, chairperson: null, recorder: null, location: null, date: null, attendees: [], doc_number: null, company: null }
    }

    // Update meeting record
    await supabase
      .from('meetings')
      .update({
        raw_content: extractedText || raw_content,
        summary: analysis.summary || (raw_content || '').slice(0, 100),
        ai_analysis: analysis,
        status: 'analyzed',
      })
      .eq('id', meeting_id)

    // Insert deadlines
    const allDeadlines = [...(analysis.deadlines || [])]
    if (allDeadlines.length > 0) {
      const rows = allDeadlines.map((d: any) => ({
        meeting_id,
        description: d.description,
        deadline_date: d.date || null,
        is_urgent: d.is_urgent || false,
        status: 'pending',
      }))
      await supabase.from('meeting_deadlines').insert(rows)
    }

    // Insert tasks from action_items
    const allTasks = [...(analysis.action_items || []), ...(analysis.tasks || [])]
    const uniqueTasks = allTasks.filter((t: any, i: number, arr: any[]) =>
      arr.findIndex((x: any) => x.assignee === t.assignee && x.description === t.description) === i
    )
    if (uniqueTasks.length > 0) {
      const rows = uniqueTasks.map((t: any) => ({
        meeting_id,
        assignee_name: t.assignee,
        task_description: t.description,
        due_date: t.due_date || null,
        status: 'pending',
      }))
      await supabase.from('meeting_tasks').insert(rows)
    }

    // Auto-create category
    if (analysis.suggested_category) {
      const { data: existing } = await supabase
        .from('meeting_categories')
        .select('id')
        .eq('name', analysis.suggested_category)
        .single()

      if (!existing) {
        const colors = ['#000080', '#008080', '#800000', '#008000', '#800080', '#FF8C00']
        const color = colors[Math.floor(Math.random() * colors.length)]
        const { data: newCat } = await supabase
          .from('meeting_categories')
          .insert({ name: analysis.suggested_category, color, is_ai_suggested: true })
          .select('id')
          .single()

        if (newCat) {
          await supabase.from('meetings').update({ category_id: newCat.id }).eq('id', meeting_id)
        }
      } else {
        await supabase.from('meetings').update({ category_id: existing.id }).eq('id', meeting_id)
      }
    }

    return NextResponse.json({ success: true, ai_available: true, analysis })
  } catch (error: any) {
    console.error('[analyze] Error:', error)
    if (meetingId) {
      try { await supabase.from('meetings').update({ status: 'analyzed' }).eq('id', meetingId) } catch { /* ignore */ }
    }
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
  }
}
