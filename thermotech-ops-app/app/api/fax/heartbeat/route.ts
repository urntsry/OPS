import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const FAX_API_KEY = process.env.FAX_API_KEY || ''

/**
 * POST /api/fax/heartbeat
 * Agent reports its scan status (every 5 min via Task Scheduler).
 * Body: {
 *   watch_folder: string,
 *   files_in_folder: number,
 *   last_uploaded_file?: string,
 *   last_error?: string,
 *   agent_version?: string,
 *   hostname?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!FAX_API_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }
    const authHeader = request.headers.get('x-api-key') || ''
    if (authHeader !== FAX_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const now = new Date().toISOString()

    const updates: any = {
      id: 1,
      last_heartbeat: now,
      last_scan_at: now,
      watch_folder: body.watch_folder || null,
      files_in_folder: body.files_in_folder ?? 0,
      hostname: body.hostname || null,
      agent_version: body.agent_version || null,
    }

    if (body.last_uploaded_file) {
      updates.last_uploaded_at = now
      updates.last_uploaded_file = body.last_uploaded_file
    }
    if (body.last_error) {
      updates.last_error = body.last_error
      updates.last_error_at = now
    } else if (body.clear_error) {
      updates.last_error = null
      updates.last_error_at = null
    }
    if (typeof body.files_processed_delta === 'number' && body.files_processed_delta > 0) {
      // Atomic increment via RPC would be ideal, but use a simple read-modify-write
      const { data: cur } = await supabase
        .from('fax_agent_status').select('files_processed_total, scan_count').eq('id', 1).single()
      updates.files_processed_total = (cur?.files_processed_total || 0) + body.files_processed_delta
      updates.scan_count = (cur?.scan_count || 0) + 1
    } else {
      const { data: cur } = await supabase
        .from('fax_agent_status').select('scan_count').eq('id', 1).single()
      updates.scan_count = (cur?.scan_count || 0) + 1
    }

    const { error } = await supabase
      .from('fax_agent_status')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      console.error('[fax/heartbeat] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, server_time: now })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Heartbeat failed' }, { status: 500 })
  }
}

/**
 * GET /api/fax/heartbeat
 * Returns the current agent status (for health check from OPS UI).
 * Public — no auth required (no sensitive info).
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('fax_agent_status')
      .select('*')
      .eq('id', 1)
      .single()

    if (error || !data) {
      return NextResponse.json({
        connected: false,
        message: 'Agent has never reported in',
      })
    }

    const lastBeat = new Date(data.last_heartbeat).getTime()
    const ageMinutes = Math.round((Date.now() - lastBeat) / 60000)
    const connected = ageMinutes < 15 // healthy if heartbeat within 15 minutes (agent runs every 5)

    return NextResponse.json({
      connected,
      age_minutes: ageMinutes,
      last_heartbeat: data.last_heartbeat,
      last_scan_at: data.last_scan_at,
      last_uploaded_at: data.last_uploaded_at,
      last_uploaded_file: data.last_uploaded_file,
      last_error: data.last_error,
      last_error_at: data.last_error_at,
      watch_folder: data.watch_folder,
      files_in_folder: data.files_in_folder,
      files_processed_total: data.files_processed_total,
      hostname: data.hostname,
      agent_version: data.agent_version,
      scan_count: data.scan_count,
    })
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message }, { status: 500 })
  }
}
