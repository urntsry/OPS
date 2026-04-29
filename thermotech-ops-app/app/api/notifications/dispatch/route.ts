import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

interface ChannelResult {
  channel: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
}

/** Push to LINE for a single user (returns null if user has no line_user_id) */
async function dispatchLine(userId: string, title: string, body: string | null, link: string | null): Promise<ChannelResult> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return { channel: 'line', status: 'skipped', error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }

  // Look up line_user_id for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', userId)
    .single()

  if (!profile?.line_user_id) {
    return { channel: 'line', status: 'skipped', error: 'user has no line_user_id (尚未綁定)' }
  }

  const text = link
    ? `【${title}】\n${body || ''}\n\n${link}`
    : `【${title}】\n${body || ''}`

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: profile.line_user_id,
        messages: [{ type: 'text', text }],
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return { channel: 'line', status: 'failed', error: `LINE API ${res.status}: ${detail.slice(0, 200)}` }
    }
    return { channel: 'line', status: 'sent' }
  } catch (e: any) {
    return { channel: 'line', status: 'failed', error: e.message }
  }
}

/** In-app channel — record is already in DB; nothing else to do */
function dispatchInApp(): ChannelResult {
  return { channel: 'in_app', status: 'sent' }
}

async function dispatchOne(notif: any): Promise<{ status: string; channel_status: Record<string, string>; error?: string }> {
  const channels: string[] = notif.channels || ['in_app']
  const channelStatus: Record<string, string> = { ...(notif.channel_status || {}) }
  const errors: string[] = []

  for (const ch of channels) {
    let result: ChannelResult
    if (ch === 'in_app') {
      result = dispatchInApp()
    } else if (ch === 'line') {
      result = await dispatchLine(notif.user_id, notif.title, notif.body, notif.link)
    } else {
      result = { channel: ch, status: 'skipped', error: `${ch} adapter not implemented` }
    }
    channelStatus[ch] = result.status
    if (result.error) errors.push(`[${ch}] ${result.error}`)
  }

  // Overall status: if any sent, mark sent; if all failed, mark failed; if all skipped, mark sent (in-app fallback)
  const anySent = Object.values(channelStatus).some(s => s === 'sent')
  const overallStatus = anySent ? 'sent' : 'failed'

  return {
    status: overallStatus,
    channel_status: channelStatus,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  }
}

/**
 * POST /api/notifications/dispatch
 * Body: { ids?: string[] }   ← when provided, only dispatch these
 *
 * Without body: dispatch all pending notifications whose scheduled_at <= now.
 * Auth: cron uses Authorization: Bearer CRON_SECRET; manual triggers from
 * the UI are allowed (anon) but only operate on the specific ids passed.
 */
export async function POST(request: NextRequest) {
  try {
    const isCron = (request.headers.get('authorization') || '').replace('Bearer ', '') === CRON_SECRET

    let body: { ids?: string[] } = {}
    try { body = await request.json() } catch { /* empty body */ }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(100)

    if (body.ids && body.ids.length > 0) {
      query = query.in('id', body.ids)
    } else if (!isCron) {
      // Without ids list AND without cron auth, refuse to do a bulk dispatch
      return NextResponse.json({ error: 'Unauthorized for bulk dispatch' }, { status: 401 })
    }

    const { data: pending, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const results: any[] = []
    for (const notif of pending || []) {
      const result = await dispatchOne(notif)
      await supabase
        .from('notifications')
        .update({
          status: result.status,
          channel_status: result.channel_status,
          sent_at: new Date().toISOString(),
          error: result.error || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notif.id)
      results.push({ id: notif.id, ...result })
    }

    return NextResponse.json({
      processed: results.length,
      results,
    })
  } catch (e: any) {
    console.error('[notifications/dispatch] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * GET — used by Vercel Cron (Authorization: Bearer CRON_SECRET).
 * Without auth, only returns health info.
 */
export async function GET(request: NextRequest) {
  const isCron = (request.headers.get('authorization') || '').replace('Bearer ', '') === CRON_SECRET

  if (!isCron) {
    return NextResponse.json({
      ok: true,
      line_configured: !!LINE_CHANNEL_ACCESS_TOKEN,
      cron_configured: !!CRON_SECRET,
    })
  }

  // Cron: dispatch all pending notifications
  const { data: pending, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: any[] = []
  for (const notif of pending || []) {
    const result = await dispatchOne(notif)
    await supabase
      .from('notifications')
      .update({
        status: result.status,
        channel_status: result.channel_status,
        sent_at: new Date().toISOString(),
        error: result.error || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notif.id)
    results.push({ id: notif.id, ...result })
  }

  return NextResponse.json({ processed: results.length, results })
}
