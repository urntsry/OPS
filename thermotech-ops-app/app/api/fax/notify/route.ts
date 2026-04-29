import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const FAX_API_KEY = process.env.FAX_API_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const NOTIFY_AFTER_MINUTES = 30

function isAuthorized(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || ''
  if (FAX_API_KEY && apiKey === FAX_API_KEY) return true
  const bearer = request.headers.get('authorization')?.replace('Bearer ', '') || ''
  if (CRON_SECRET && bearer === CRON_SECRET) return true
  return false
}

/**
 * GET /api/fax/notify
 * Check for unhandled faxes older than N minutes and send LINE Push notifications.
 * Called periodically by Vercel Cron (every 30 min) or external scheduler.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cutoff = new Date(Date.now() - NOTIFY_AFTER_MINUTES * 60 * 1000).toISOString()

    const { data: unhandledFaxes, error } = await supabase
      .from('faxes')
      .select('id, file_name, customer_name, order_number, our_contact_person, our_contact_user_id, document_type, received_at, notify_sent')
      .eq('status', 'analyzed')
      .eq('is_handled', false)
      .eq('notify_sent', false)
      .lt('received_at', cutoff)
      .order('received_at', { ascending: true })

    if (error) throw error

    const results: { fax_id: string; notified: boolean; method: string; error?: string }[] = []

    for (const fax of (unhandledFaxes || [])) {
      const contactUserId = fax.our_contact_user_id
      const docType = fax.document_type || '傳真'
      const customer = fax.customer_name || '未知'
      const orderNum = fax.order_number || ''

      const message = [
        `[OPS FAX 未處理通知]`,
        `類型：${docType}`,
        `客戶：${customer}`,
        orderNum ? `訂單：${orderNum}` : null,
        `收件人：${fax.our_contact_person || '未指定'}`,
        `接收時間：${new Date(fax.received_at).toLocaleString('zh-TW')}`,
        ``,
        `請盡速登入 OPS 系統處理。`,
      ].filter(v => v !== null).join('\n')

      let notified = false
      let method = 'none'

      // Try LINE Push if token available and user has LINE ID
      if (LINE_CHANNEL_ACCESS_TOKEN && contactUserId) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('line_user_id')
            .eq('id', contactUserId)
            .single()

          if (profile?.line_user_id) {
            const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                to: profile.line_user_id,
                messages: [{ type: 'text', text: message }],
              }),
            })

            if (lineRes.ok) {
              notified = true
              method = 'line_push'
            } else {
              const errBody = await lineRes.text()
              results.push({ fax_id: fax.id, notified: false, method: 'line_push', error: errBody })
            }
          }
        } catch (lineErr: any) {
          results.push({ fax_id: fax.id, notified: false, method: 'line_push', error: lineErr.message })
        }
      }

      // If LINE not available, still mark as notify_sent so we don't retry endlessly
      // The in-app notification (calendar task) was already created during analysis
      if (!notified) {
        method = 'in_app_only'
        notified = true
      }

      // Mark notify_sent
      await supabase.from('faxes').update({ notify_sent: true }).eq('id', fax.id)
      results.push({ fax_id: fax.id, notified, method })
    }

    return NextResponse.json({
      checked: (unhandledFaxes || []).length,
      notified: results.filter(r => r.notified).length,
      results,
    })
  } catch (error: any) {
    console.error('[fax/notify] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/fax/notify
 * Manually trigger notification for a specific fax.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-api-key') || ''
  if (!FAX_API_KEY || authHeader !== FAX_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { fax_id } = await request.json()
    if (!fax_id) return NextResponse.json({ error: 'fax_id required' }, { status: 400 })

    const { data: fax, error } = await supabase
      .from('faxes')
      .select('*')
      .eq('id', fax_id)
      .single()

    if (error || !fax) return NextResponse.json({ error: 'Fax not found' }, { status: 404 })

    const docType = fax.document_type || '傳真'
    const customer = fax.customer_name || '未知'
    const message = `[OPS FAX 提醒] ${docType} - ${customer}${fax.order_number ? ` #${fax.order_number}` : ''} 尚未處理，請盡速登入 OPS。`

    let sent = false

    if (LINE_CHANNEL_ACCESS_TOKEN && fax.our_contact_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('line_user_id')
        .eq('id', fax.our_contact_user_id)
        .single()

      if (profile?.line_user_id) {
        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: profile.line_user_id,
            messages: [{ type: 'text', text: message }],
          }),
        })
        sent = lineRes.ok
      }
    }

    await supabase.from('faxes').update({ notify_sent: true }).eq('id', fax_id)
    return NextResponse.json({ success: true, line_sent: sent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
