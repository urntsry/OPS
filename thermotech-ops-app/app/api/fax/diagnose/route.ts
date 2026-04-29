import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

/**
 * GET /api/fax/diagnose
 * Returns full system status: env vars set, bucket existence, recent fax records.
 */
export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      GOOGLE_GEMINI_API_KEY: !!process.env.GOOGLE_GEMINI_API_KEY,
      FAX_API_KEY: !!process.env.FAX_API_KEY,
      using_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    bucket: {},
    recent_faxes: [],
    storage_test: {},
  }

  // 1. Check if fax-files bucket exists
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (error) {
      result.bucket.error = error.message
    } else {
      const faxBucket = buckets?.find(b => b.name === 'fax-files')
      result.bucket = {
        all_buckets: buckets?.map(b => ({ name: b.name, public: b.public })) || [],
        fax_files_exists: !!faxBucket,
        fax_files_public: faxBucket?.public || false,
      }
    }
  } catch (e: any) {
    result.bucket.exception = e.message
  }

  // 2. List files in fax-files bucket
  try {
    const { data: files, error } = await supabase.storage.from('fax-files').list('faxes', { limit: 10 })
    if (error) {
      result.storage_test.list_error = error.message
    } else {
      result.storage_test.files_in_faxes_folder = files?.length || 0
      result.storage_test.sample_files = files?.slice(0, 5).map(f => ({ name: f.name, size: f.metadata?.size })) || []
    }
  } catch (e: any) {
    result.storage_test.exception = e.message
  }

  // 3. Recent fax DB records
  try {
    const { data: faxes, error } = await supabase
      .from('faxes')
      .select('id, file_name, file_url, status, received_at, document_type')
      .order('received_at', { ascending: false })
      .limit(5)
    if (error) {
      result.recent_faxes = { error: error.message }
    } else {
      result.recent_faxes = (faxes || []).map(f => ({
        id: f.id,
        file_name: f.file_name,
        has_file_url: !!f.file_url,
        file_url_preview: f.file_url ? f.file_url.substring(0, 80) + '...' : null,
        status: f.status,
        document_type: f.document_type,
        received_at: f.received_at,
      }))
    }
  } catch (e: any) {
    result.recent_faxes = { exception: e.message }
  }

  return NextResponse.json(result, { status: 200 })
}
