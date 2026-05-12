import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getOpsSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function getCapacitySupabase() {
  return createClient(
    process.env.CAPACITY_SUPABASE_URL!,
    process.env.CAPACITY_SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * POST /api/line/sync-from-capacity
 * 
 * One-time (or repeatable) sync: pull all LINE bindings from Capacity's
 * company_personnel and write them into OPS profiles, matching by
 * employee_code (Capacity) = employee_id (OPS).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.CAPACITY_SUPABASE_URL || !process.env.CAPACITY_SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'CAPACITY_SUPABASE_URL / CAPACITY_SUPABASE_SERVICE_KEY not configured' }, { status: 500 })
  }

  const ops = getOpsSupabase()
  const capacity = getCapacitySupabase()

  const { data: bindings, error: capError } = await capacity
    .from('company_personnel')
    .select('employee_code, name, line_user_id')
    .not('line_user_id', 'is', null)
    .eq('is_active', true)

  if (capError) {
    return NextResponse.json({ error: `Capacity read error: ${capError.message}` }, { status: 500 })
  }

  if (!bindings || bindings.length === 0) {
    return NextResponse.json({ message: 'No bindings found in Capacity', synced: 0 })
  }

  let synced = 0
  let skipped = 0
  let notFound = 0
  const errors: string[] = []

  for (const binding of bindings) {
    const { data: profile } = await ops
      .from('profiles')
      .select('id, employee_id, line_user_id')
      .eq('employee_id', binding.employee_code)
      .eq('is_active', true)
      .maybeSingle()

    if (!profile) {
      notFound++
      continue
    }

    if (profile.line_user_id === binding.line_user_id) {
      skipped++
      continue
    }

    const { error: updateError } = await ops
      .from('profiles')
      .update({
        line_user_id: binding.line_user_id,
        line_bound_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (updateError) {
      errors.push(`${binding.employee_code}: ${updateError.message}`)
    } else {
      synced++
    }
  }

  return NextResponse.json({
    success: true,
    total_capacity_bindings: bindings.length,
    synced,
    skipped_already_same: skipped,
    not_found_in_ops: notFound,
    errors: errors.length > 0 ? errors : undefined
  })
}
