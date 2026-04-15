import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const { meeting_id, raw_content, file_type } = await request.json()

    if (!meeting_id || !raw_content) {
      return NextResponse.json({ error: 'meeting_id and raw_content required' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      // Fallback: no API key, store content without AI analysis
      await supabase
        .from('meetings')
        .update({ raw_content, status: 'analyzed', summary: raw_content.slice(0, 100) + '...' })
        .eq('id', meeting_id)

      return NextResponse.json({ success: true, ai_available: false })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `你是一個專業的會議紀錄分析助手。請分析以下會議紀錄內容，並回傳 **純 JSON**（不要 markdown 格式）：

{
  "summary": "50字以內的會議摘要",
  "suggested_category": "建議的分類名稱（如：產線會議、管理會議、客戶會議、專案會議、週會、月會等）",
  "deadlines": [
    { "description": "需完成事項的描述", "date": "YYYY-MM-DD 或 null（如果無法判斷具體日期）", "is_urgent": true或false }
  ],
  "tasks": [
    { "assignee": "負責人姓名", "description": "任務內容", "due_date": "YYYY-MM-DD 或 null" }
  ],
  "key_decisions": ["重要決議1", "重要決議2"]
}

注意：
- 如果紀錄中沒有明確的截止日期、任務或決議，對應陣列回傳空 []
- assignee 只填紀錄中明確提到的人名
- date 只在能確定具體日期時填寫，否則填 null
- is_urgent 在提到「緊急」「立即」「儘速」「deadline」等字眼時為 true

會議紀錄內容：
${raw_content.slice(0, 8000)}`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    let analysis
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      analysis = { summary: raw_content.slice(0, 100), suggested_category: '未分類', deadlines: [], tasks: [], key_decisions: [] }
    }

    if (!analysis) {
      analysis = { summary: raw_content.slice(0, 100), suggested_category: '未分類', deadlines: [], tasks: [], key_decisions: [] }
    }

    // Update meeting record
    await supabase
      .from('meetings')
      .update({
        raw_content,
        summary: analysis.summary || raw_content.slice(0, 100),
        ai_analysis: analysis,
        status: 'analyzed',
      })
      .eq('id', meeting_id)

    // Insert deadlines
    if (analysis.deadlines?.length > 0) {
      const deadlines = analysis.deadlines.map((d: any) => ({
        meeting_id,
        description: d.description,
        deadline_date: d.date || null,
        is_urgent: d.is_urgent || false,
        status: 'pending',
      }))
      await supabase.from('meeting_deadlines').insert(deadlines)
    }

    // Insert tasks
    if (analysis.tasks?.length > 0) {
      const tasks = analysis.tasks.map((t: any) => ({
        meeting_id,
        assignee_name: t.assignee,
        task_description: t.description,
        due_date: t.due_date || null,
        status: 'pending',
      }))
      await supabase.from('meeting_tasks').insert(tasks)
    }

    // Auto-create category if suggested and not exists
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
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
  }
}
