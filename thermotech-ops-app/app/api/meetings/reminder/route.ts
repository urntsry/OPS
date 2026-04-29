import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Daily cron — for each meeting that:
 *   - meeting_date < today
 *   - record_uploaded = false
 *   - record_reminder_sent = false
 * send a reminder notification to attendees + creator, then mark
 * record_reminder_sent = true.
 */
async function runReminder() {
  const today = new Date().toISOString().slice(0, 10)

  const { data: meetings, error } = await supabase
    .from('scheduled_meetings')
    .select('*')
    .lt('meeting_date', today)
    .eq('record_uploaded', false)
    .eq('record_reminder_sent', false)
    .limit(50)

  if (error) {
    console.error('[meetings/reminder] query failed:', error)
    return { error: error.message }
  }

  const results: any[] = []

  for (const m of meetings || []) {
    // Find attendees + creator
    const { data: participants } = await supabase
      .from('meeting_participants')
      .select('user_id, role')
      .eq('meeting_id', m.id)

    const recipientIds = new Set<string>()
    for (const p of participants || []) {
      if (p.role === 'attendee') recipientIds.add(p.user_id)
    }
    if (m.created_by) recipientIds.add(m.created_by)

    if (recipientIds.size === 0) {
      results.push({ id: m.id, skipped: 'no recipients' })
      continue
    }

    // Insert notification rows
    const rows = Array.from(recipientIds).map(uid => ({
      user_id: uid,
      type: 'meeting_reminder',
      title: `📝 會議記錄提醒: ${m.title}`,
      body: `會議「${m.title}」(${m.meeting_date}) 已結束\n請上傳會議記錄至系統。`,
      link: `/home?tab=meeting&meeting_id=${m.id}`,
      channels: ['in_app'],
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      metadata: { meeting_id: m.id, kind: 'record_upload' },
    }))

    const { error: notifErr } = await supabase.from('notifications').insert(rows)
    if (notifErr) {
      results.push({ id: m.id, error: notifErr.message })
      continue
    }

    // Mark reminder sent
    await supabase
      .from('scheduled_meetings')
      .update({ record_reminder_sent: true, updated_at: new Date().toISOString() })
      .eq('id', m.id)

    results.push({ id: m.id, recipients: recipientIds.size, sent: true })
  }

  return { processed: results.length, results }
}

export async function GET(request: NextRequest) {
  const isCron = (request.headers.get('authorization') || '').replace('Bearer ', '') === CRON_SECRET
  if (!isCron && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: true, info: 'cron-only endpoint' })
  }
  const result = await runReminder()
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const isCron = (request.headers.get('authorization') || '').replace('Bearer ', '') === CRON_SECRET
  if (!isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runReminder()
  return NextResponse.json(result)
}
