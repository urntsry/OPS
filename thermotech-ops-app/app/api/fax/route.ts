import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const FAX_API_KEY = process.env.FAX_API_KEY || ''

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require API key for external access
    const authHeader = request.headers.get('x-api-key') || ''
    if (!FAX_API_KEY || authHeader !== FAX_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabase
      .from('faxes')
      .select('id, file_name, received_at, status, customer_name, order_number, our_contact_person, ai_confidence')
      .order('received_at', { ascending: false })

    if (status && /^[a-z_]+$/.test(status)) {
      query = query.eq('status', status)
    }
    if (search) {
      const sanitized = search.replace(/[%_]/g, '').slice(0, 100)
      if (sanitized) {
        query = query.or(
          `customer_name.ilike.%${sanitized}%,order_number.ilike.%${sanitized}%,our_contact_person.ilike.%${sanitized}%,file_name.ilike.%${sanitized}%`
        )
      }
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [], count: data?.length || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch faxes' }, { status: 500 })
  }
}
