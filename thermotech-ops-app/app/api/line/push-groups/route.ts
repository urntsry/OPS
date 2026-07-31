import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

/**
 * POST /api/line/push-groups
 * Body: { groupIds: string[], title: string, body?: string, flex?: unknown }
 *
 * 只允許推到 line_groups 內「已登記、啟用且允許推播」的群組，
 * 避免任意 groupId 被拿來濫發訊息。
 */
export async function POST(request: NextRequest) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 })
    }

    const { groupIds, title, body, flex } = await request.json()
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ error: 'groupIds required' }, { status: 400 })
    }

    // 白名單：只推已登記且啟用的群組
    const { data: groups } = await supabase
      .from('line_groups')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('is_active', true)
      .eq('push_enabled', true)
    const allowed = new Set((groups || []).map((g) => g.group_id))

    const cleanBody = (body || '').trim()
    const text = [title, cleanBody || null].filter(Boolean).join('\n')
    const textMessage = [{ type: 'text', text }]
    const primaryMessages = flex
      ? [{ type: 'flex', altText: (cleanBody || title || '公告').slice(0, 400), contents: flex }]
      : textMessage

    const push = async (to: string, messages: object[]) =>
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ to, messages }),
      })

    const results: Array<{ group_id: string; status: string; error?: string }> = []
    for (const gid of groupIds) {
      if (!allowed.has(gid)) {
        results.push({ group_id: gid, status: 'skipped', error: '群組未登記或未啟用' })
        continue
      }
      try {
        let res = await push(gid, primaryMessages)
        if (!res.ok && flex) {
          const flexErr = (await res.text()).slice(0, 200)
          console.warn('[push-groups] flex failed, fallback to text:', flexErr)
          res = await push(gid, textMessage)
        }
        if (!res.ok) {
          const detail = await res.text()
          results.push({ group_id: gid, status: 'failed', error: `LINE API ${res.status}: ${detail.slice(0, 200)}` })
        } else {
          results.push({ group_id: gid, status: 'sent' })
        }
      } catch (e: any) {
        results.push({ group_id: gid, status: 'failed', error: e.message })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (e: any) {
    console.error('[line/push-groups] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
