import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/line/bind
 * Body: { user_id: string }
 * Returns: { code: string } — 6-digit binding code to show user
 *
 * User sends this code to the LINE Bot to complete binding.
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('generate_line_binding_code', {
      p_user_id: user_id,
    })

    if (error) {
      console.error('[LINE Bind] Error:', error)
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
    }

    return NextResponse.json({ code: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/line/bind
 * Body: { user_id: string }
 * Unbinds LINE account from user profile.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ line_user_id: null, line_bound_at: null })
      .eq('id', user_id)

    if (error) {
      return NextResponse.json({ error: 'Unbind failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
