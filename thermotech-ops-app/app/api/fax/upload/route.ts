import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const FAX_API_KEY = process.env.FAX_API_KEY || ''
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'tif', 'tiff', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])

export async function POST(request: NextRequest) {
  try {
    // SECURITY: API Key is REQUIRED — reject if not configured or mismatched
    if (!FAX_API_KEY) {
      return NextResponse.json({ error: 'Server misconfigured: FAX_API_KEY not set' }, { status: 503 })
    }

    const authHeader = request.headers.get('x-api-key') || ''
    if (authHeader !== FAX_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const receivedAt = formData.get('received_at') as string || new Date().toISOString()

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // SECURITY: File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 413 })
    }

    // SECURITY: Extension whitelist
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `File type not allowed: .${ext}` }, { status: 400 })
    }

    // SECURITY: Sanitize filename — remove path traversal characters
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, '_')

    // Upload to Supabase Storage
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `faxes/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('fax-files')
      .upload(filePath, buffer, { contentType: file.type })

    let fileUrl = ''
    if (!uploadError) {
      const { data } = supabase.storage.from('fax-files').getPublicUrl(filePath)
      fileUrl = data.publicUrl
    } else {
      console.error('[fax/upload] Storage error:', uploadError)
    }

    // Create fax record
    const { data: fax, error: dbError } = await supabase
      .from('faxes')
      .insert({
        file_name: safeName,
        file_url: fileUrl,
        file_size: file.size,
        received_at: receivedAt,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Trigger AI analysis asynchronously — internal call with same API key
    const analyzeUrl = new URL('/api/fax/analyze', request.url)
    fetch(analyzeUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': FAX_API_KEY,
      },
      body: JSON.stringify({
        fax_id: fax.id,
        file_url: fileUrl,
        file_name: safeName,
      }),
    }).catch(e => console.error('[fax/upload] Analyze trigger failed:', e))

    return NextResponse.json({ success: true, fax: { id: fax.id, status: fax.status } })
  } catch (error: any) {
    console.error('[fax/upload] Error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'fax/upload' })
}
