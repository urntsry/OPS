import { supabase as clientSb } from './supabase'

/**
 * Notification Port — 通用通知抽象層
 *
 * 所有業務功能 (會議建立、客戶拜訪、傳真未處理、生日提醒…) 透過此 API 發送通知。
 * 呼叫端只說「通知這幾個人」，由 adapter 自行決定走哪個通道：
 *   - In-App: 一律寫入 notifications 表，使用者在 OPS 通知中心可見
 *   - LINE: 若該使用者 profiles.line_user_id 已綁定，再額外推 LINE Push
 *   - Email/SMS: 預留擴充
 *
 * 漸進式 rollout：尚未綁 LINE 的同事仍會收到 In-App 通知，等綁定後自動升級。
 */

export type NotificationChannel = 'in_app' | 'line' | 'email' | 'sms'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  channels: NotificationChannel[]
  channel_status: Record<string, string>
  status: NotificationStatus
  read_at: string | null
  scheduled_at: string
  sent_at: string | null
  metadata: Record<string, unknown> | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface NotifyPayload {
  /** 目標收件人 user IDs (profiles.id) */
  user_ids: string[]
  /** 通知類別代號（用於分流、過濾） */
  type: string
  /** 通知標題（會顯示在通知中心 + LINE 訊息標題） */
  title: string
  /** 內文（簡述） */
  body?: string
  /** 點擊跳轉連結 (e.g. '/home?tab=meeting&id=xxx') */
  link?: string
  /** 預設僅 in_app；若想 LINE Push，傳 ['in_app', 'line']  */
  channels?: NotificationChannel[]
  /** 排程時間（不傳=立即） */
  scheduled_at?: Date | string
  /** 額外結構化資料，存進 metadata jsonb */
  metadata?: Record<string, unknown>
}

// =========================================================================
// CLIENT API — 從前端發起通知
// 寫入 DB 後，後端 cron / API 會去處理 LINE 推播
// =========================================================================

export async function notify(payload: NotifyPayload): Promise<Notification[]> {
  if (!payload.user_ids || payload.user_ids.length === 0) return []

  const channels = payload.channels || ['in_app']
  const scheduled = payload.scheduled_at
    ? new Date(payload.scheduled_at).toISOString()
    : new Date().toISOString()

  const rows = payload.user_ids.map(uid => ({
    user_id: uid,
    type: payload.type,
    title: payload.title,
    body: payload.body || null,
    link: payload.link || null,
    channels,
    status: 'pending' as NotificationStatus,
    scheduled_at: scheduled,
    metadata: payload.metadata || null,
  }))

  const { data, error } = await clientSb
    .from('notifications')
    .insert(rows)
    .select()

  if (error) {
    console.error('[notify] insert failed:', error)
    throw error
  }

  // Trigger immediate dispatch (fire-and-forget) for non-scheduled notifications
  if (!payload.scheduled_at) {
    const ids = (data || []).map((n: { id: string }) => n.id)
    if (ids.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }).catch(err => console.warn('[notify] dispatch trigger failed:', err))
    }
  }

  return (data || []) as Notification[]
}

// =========================================================================
// CLIENT QUERIES — 通知中心
// =========================================================================

export async function getMyNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const { data, error } = await clientSb
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as Notification[]
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await clientSb
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) return 0
  return count || 0
}

export async function markRead(notificationId: string): Promise<void> {
  const { error } = await clientSb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await clientSb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw error
}

export function subscribeNotifications(userId: string, callback: () => void) {
  const channel = clientSb
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => callback()
    )
    .subscribe()
  return () => { clientSb.removeChannel(channel) }
}

// =========================================================================
// SERVER-SIDE DISPATCH — 由 /api/notifications/dispatch 呼叫
// =========================================================================

/**
 * Send a single notification across all its channels.
 * Returns updated channel_status map.
 *
 * Note: This is meant to run server-side (uses service role for line_user_id lookup).
 * The actual implementation lives in /api/notifications/dispatch — this is just a type spec.
 */
export interface ChannelDispatchResult {
  channel: NotificationChannel
  status: 'sent' | 'failed' | 'skipped'
  error?: string
}
