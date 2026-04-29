import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

/**
 * GET /api/fax/file?id=<fax_id>
 * Returns a signed URL (1h) for the fax file via service role.
 * This works regardless of whether the bucket is public or private.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const faxId = searchParams.get('id')
    if (!faxId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { data: fax, error } = await supabase
      .from('faxes')
      .select('file_url, file_name')
      .eq('id', faxId)
      .single()

    if (error || !fax || !fax.file_url) {
      return NextResponse.json({ error: 'Fax not found or no file' }, { status: 404 })
    }

    let storagePath = ''
    if (fax.file_url.includes('/storage/v1/object/public/fax-files/')) {
      storagePath = fax.file_url.split('/storage/v1/object/public/fax-files/')[1].split('?')[0]
    } else if (fax.file_url.includes('/storage/v1/object/sign/fax-files/')) {
      storagePath = fax.file_url.split('/storage/v1/object/sign/fax-files/')[1].split('?')[0]
    } else if (fax.file_url.includes('fax-files/')) {
      storagePath = fax.file_url.substring(fax.file_url.indexOf('fax-files/') + 'fax-files/'.length).split('?')[0]
    }

    if (!storagePath) {
      return NextResponse.json({ url: fax.file_url, file_name: fax.file_name })
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('fax-files')
      .createSignedUrl(storagePath, 3600)

    if (signErr || !signed) {
      // Fallback to public URL if signing fails
      return NextResponse.json({ url: fax.file_url, file_name: fax.file_name })
    }

    return NextResponse.json({ url: signed.signedUrl, file_name: fax.file_name })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
