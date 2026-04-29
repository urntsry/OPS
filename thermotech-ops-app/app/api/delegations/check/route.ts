import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Daily cron — 交辦事項到期/逾期提醒
 *
 * 每天執行兩種掃描：
 * 1. 即將到期 (due_date = tomorrow, status='pending', !reminder_due_sent)
 *    → 通知承辦人
 * 2. 逾期 (due_date < today, status='pending', !reminder_overdue_sent)
 *    → 升級通知 = 通知承辦人 + 交辦人 (雙方都需知道)
 */
async function runCheck() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayStr = today.toISOString().slice(0, 10)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  const results: { type: string; id: string; recipients?: number; error?: string; skipped?: string }[] = []

  // ====== 1. 明日到期 ======
  const { data: dueSoon, error: dueErr } = await supabase
    .from('delegations')
    .select('*')
    .eq('status', 'pending')
    .eq('due_date', tomorrowStr)
    .eq('reminder_due_sent', false)
    .limit(100)

  if (dueErr) {
    console.error('[delegations/check] dueSoon query failed:', dueErr)
    return { error: dueErr.message }
  }

  for (const d of dueSoon || []) {
    const rows = [{
      user_id: d.assignee_id,
      type: 'delegation_due_soon',
      title: `⏰ 交辦明日到期：${d.title}`,
      body: `交辦人：${d.issuer_name || '—'}｜剩 1 天`,
      link: `/home?delegation=${d.id}`,
      channels: ['in_app', 'line'],
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      metadata: { delegation_id: d.id, kind: 'due_soon' },
    }]
    const { error } = await supabase.from('notifications').insert(rows)
    if (error) {
      results.push({ type: 'due_soon', id: d.id, error: error.message })
      continue
    }
    await supabase
      .from('delegations')
      .update({ reminder_due_sent: true })
      .eq('id', d.id)
    results.push({ type: 'due_soon', id: d.id, recipients: 1 })
  }

  // ====== 2. 已逾期 ======
  const { data: overdue, error: overdueErr } = await supabase
    .from('delegations')
    .select('*')
    .eq('status', 'pending')
    .lt('due_date', todayStr)
    .eq('reminder_overdue_sent', false)
    .limit(100)

  if (overdueErr) {
    console.error('[delegations/check] overdue query failed:', overdueErr)
    return { error: overdueErr.message }
  }

  for (const d of overdue || []) {
    const daysOverdue = Math.round((today.getTime() - new Date(d.due_date).getTime()) / 86400000)
    const recipients = new Set<string>([d.assignee_id, d.issuer_id])
    const rows = Array.from(recipients).map(uid => ({
      user_id: uid,
      type: 'delegation_overdue',
      title: `🚨 交辦逾期：${d.title}`,
      body: `已逾期 ${daysOverdue} 天｜${d.issuer_name || '—'} → ${d.assignee_name || '—'}`,
      link: `/home?delegation=${d.id}`,
      channels: ['in_app', 'line'],
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      metadata: { delegation_id: d.id, kind: 'overdue', days_overdue: daysOverdue },
    }))
    const { error } = await supabase.from('notifications').insert(rows)
    if (error) {
      results.push({ type: 'overdue', id: d.id, error: error.message })
      continue
    }
    await supabase
      .from('delegations')
      .update({ reminder_overdue_sent: true })
      .eq('id', d.id)
    results.push({ type: 'overdue', id: d.id, recipients: recipients.size })
  }

  return { processed: results.length, results }
}

export async function GET(request: NextRequest) {
  const isCron = (request.headers.get('authorization') || '').replace('Bearer ', '') === CRON_SECRET
  if (!isCron && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: true, info: 'cron-only endpoint' })
  }
  const result = await runCheck()
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const isCron = (request.headers.get('authorization') || '').replace('Bearer ', '') === CRON_SECRET
  if (!isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runCheck()
  return NextResponse.json(result)
}
