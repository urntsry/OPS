import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (!q.trim()) {
      return NextResponse.json({ results: [] })
    }

    const { data, error } = await supabase
      .from('meetings')
      .select('id, title, meeting_date, summary, status, file_name, category:meeting_categories(name, color)')
      .or(`title.ilike.%${q}%,summary.ilike.%${q}%,raw_content.ilike.%${q}%`)
      .order('meeting_date', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ results: data || [] })
  } catch (error) {
    console.error('[Search] Error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
