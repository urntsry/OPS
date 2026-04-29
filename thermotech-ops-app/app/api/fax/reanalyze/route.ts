import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const FAX_API_KEY = process.env.FAX_API_KEY || ''

/**
 * POST /api/fax/reanalyze
 * Public endpoint (no x-api-key required) for the OPS UI to trigger re-analysis.
 * Looks up the fax record server-side, then internally calls /api/fax/analyze
 * with the proper internal key.
 *
 * Body: { fax_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { fax_id } = await request.json()
    if (!fax_id) {
      return NextResponse.json({ error: 'fax_id required' }, { status: 400 })
    }

    if (!FAX_API_KEY) {
      return NextResponse.json({ error: 'Server misconfigured: FAX_API_KEY not set' }, { status: 503 })
    }

    const { data: fax, error } = await supabase
      .from('faxes')
      .select('id, file_url, file_name')
      .eq('id', fax_id)
      .single()

    if (error || !fax) {
      return NextResponse.json({ error: 'Fax not found' }, { status: 404 })
    }

    await supabase.from('faxes').update({ status: 'pending' }).eq('id', fax_id)

    const analyzeUrl = new URL('/api/fax/analyze', request.url)
    fetch(analyzeUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': FAX_API_KEY,
      },
      body: JSON.stringify({
        fax_id: fax.id,
        file_url: fax.file_url,
        file_name: fax.file_name,
      }),
    }).catch(err => console.error('[fax/reanalyze] internal trigger failed:', err))

    return NextResponse.json({ success: true, fax_id })
  } catch (error: any) {
    console.error('[fax/reanalyze] Error:', error)
    return NextResponse.json({ error: error.message || 'Reanalyze failed' }, { status: 500 })
  }
}
