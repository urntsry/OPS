import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string || ''
    const meetingDate = formData.get('meeting_date') as string || new Date().toISOString().split('T')[0]
    const uploadedBy = formData.get('uploaded_by') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    let fileType = 'text'
    if (['pdf'].includes(ext)) fileType = 'pdf'
    else if (['doc', 'docx'].includes(ext)) fileType = 'docx'
    else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) fileType = 'image'

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `meetings/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('meeting-files')
      .upload(filePath, buffer, { contentType: file.type })

    let fileUrl = ''
    if (!uploadError) {
      const { data } = supabase.storage.from('meeting-files').getPublicUrl(filePath)
      fileUrl = data.publicUrl
    }

    // Extract text content
    let rawContent = ''

    if (fileType === 'pdf') {
      try {
        const pdfModule = await import('pdf-parse')
        const pdfParse = (pdfModule as any).default || pdfModule
        const pdfData = await pdfParse(buffer)
        rawContent = pdfData.text
      } catch (e: any) {
        rawContent = `[PDF text extraction failed: ${e.message}]`
      }
    } else if (fileType === 'docx') {
      try {
        const mammothModule = await import('mammoth')
        const mammoth = (mammothModule as any).default || mammothModule
        const result = await mammoth.extractRawText({ buffer })
        rawContent = result.value
      } catch (e: any) {
        rawContent = `[DOCX text extraction failed: ${e.message}]`
      }
    } else if (fileType === 'image') {
      rawContent = '[IMAGE - will be sent to AI Vision for analysis]'
    } else {
      rawContent = await file.text()
    }

    // Create meeting record
    const { data: meeting, error: dbError } = await supabase
      .from('meetings')
      .insert({
        title: title || file.name,
        meeting_date: meetingDate,
        raw_content: rawContent,
        file_url: fileUrl,
        file_name: file.name,
        file_type: fileType,
        uploaded_by: uploadedBy || null,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Trigger AI analysis asynchronously
    const analyzeUrl = new URL('/api/meetings/analyze', request.url)
    fetch(analyzeUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meeting_id: meeting.id,
        raw_content: rawContent,
        file_type: fileType,
        file_url: fileUrl,
      }),
    }).catch(e => console.error('[upload] Analyze trigger failed:', e))

    return NextResponse.json({ success: true, meeting })
  } catch (error: any) {
    console.error('[upload] Error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
