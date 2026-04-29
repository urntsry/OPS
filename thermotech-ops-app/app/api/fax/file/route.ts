import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

/**
 * GET /api/fax/file?id=<fax_id>
 * Returns a signed URL (1h) for the fax file via service role.
 * Works regardless of whether the bucket is public or private.
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
      .select('file_url, file_name, file_size')
      .eq('id', faxId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Fax record not found', detail: error.message }, { status: 404 })
    }
    if (!fax) {
      return NextResponse.json({ error: 'Fax record not found' }, { status: 404 })
    }
    if (!fax.file_url) {
      return NextResponse.json({
        error: 'File URL is empty in DB',
        diagnosis: 'The file was never successfully uploaded to Supabase Storage. Check that the "fax-files" bucket exists.',
        file_name: fax.file_name,
        file_size: fax.file_size,
      }, { status: 404 })
    }

    // Extract storage path from URL
    let storagePath = ''
    if (fax.file_url.includes('/storage/v1/object/public/fax-files/')) {
      storagePath = fax.file_url.split('/storage/v1/object/public/fax-files/')[1].split('?')[0]
    } else if (fax.file_url.includes('/storage/v1/object/sign/fax-files/')) {
      storagePath = fax.file_url.split('/storage/v1/object/sign/fax-files/')[1].split('?')[0]
    } else if (fax.file_url.includes('fax-files/')) {
      storagePath = fax.file_url.substring(fax.file_url.indexOf('fax-files/') + 'fax-files/'.length).split('?')[0]
    }

    if (!storagePath) {
      return NextResponse.json({ url: fax.file_url, file_name: fax.file_name, source: 'raw_url' })
    }

    // Verify the file actually exists in storage
    const folder = storagePath.includes('/') ? storagePath.substring(0, storagePath.lastIndexOf('/')) : ''
    const fileName = storagePath.includes('/') ? storagePath.substring(storagePath.lastIndexOf('/') + 1) : storagePath

    const { data: listing } = await supabase.storage
      .from('fax-files')
      .list(folder, { search: fileName, limit: 1 })

    if (!listing || listing.length === 0) {
      return NextResponse.json({
        error: 'File missing in storage',
        diagnosis: `DB has file_url, but the file does not exist in Supabase Storage at path: ${storagePath}. Bucket may have been emptied or upload silently failed.`,
        storage_path: storagePath,
        file_name: fax.file_name,
      }, { status: 404 })
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('fax-files')
      .createSignedUrl(storagePath, 3600)

    if (signErr || !signed) {
      return NextResponse.json({ url: fax.file_url, file_name: fax.file_name, source: 'fallback_public', sign_error: signErr?.message })
    }

    return NextResponse.json({ url: signed.signedUrl, file_name: fax.file_name, source: 'signed' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
