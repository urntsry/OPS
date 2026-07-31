import { supabase } from './supabase'
import { notify } from './notifications'
import { richTextToPlainText } from './richText'
import { buildBulletinFlex } from './lineFlex'

export interface Attachment {
  name: string
  url: string
  type: string
}

export type BulletinAudience = 'all' | 'department' | 'custom'

export type BulletinCategory = 'admin' | 'routine' | 'urgent' | 'general'

export const BULLETIN_CATEGORIES: Record<BulletinCategory, string> = {
  admin: '行政公告',
  routine: '例行事項',
  urgent: '緊急通知',
  general: '一般通知',
}

export interface Bulletin {
  id: string
  title: string
  content?: string
  bulletin_type: 'public' | 'notice'
  category?: BulletinCategory
  event_date?: string
  is_recurring: boolean
  recurring_days?: number[]
  priority: 'normal' | 'important' | 'urgent'
  department?: string
  created_by?: string
  attachments: Attachment[]
  is_active: boolean
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'published'
  created_at: string
  pinned?: boolean
  require_ack?: boolean
  audience?: BulletinAudience
  audience_departments?: string[]
  audience_user_ids?: string[]
  published_at?: string | null
}

export interface BulletinRead {
  id: string
  bulletin_id: string
  user_id: string
  read_at: string
  acked_at: string | null
}

export async function getBulletins(type?: 'public' | 'notice', statusFilter?: string, category?: BulletinCategory): Promise<Bulletin[]> {
  let query = supabase
    .from('bulletins')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (type) query = query.eq('bulletin_type', type)
  if (category) query = query.eq('category', category)
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  } else {
    query = query.eq('status', 'published')
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Bulletin[]
}

export async function getAllBulletins(): Promise<Bulletin[]> {
  const { data, error } = await supabase
    .from('bulletins')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Bulletin[]
}

export async function getPendingBulletins(): Promise<Bulletin[]> {
  const { data, error } = await supabase
    .from('bulletins')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Bulletin[]
}

export async function getBulletinById(id: string): Promise<Bulletin | null> {
  const { data, error } = await supabase
    .from('bulletins')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Bulletin
}

export async function createBulletin(bulletin: Partial<Bulletin>): Promise<Bulletin> {
  const { data, error } = await supabase
    .from('bulletins')
    .insert({
      ...bulletin,
      attachments: bulletin.attachments || [],
    })
    .select()
    .single()
  if (error) throw error
  return data as Bulletin
}

export async function updateBulletin(id: string, updates: Partial<Bulletin>): Promise<Bulletin> {
  const { data, error } = await supabase
    .from('bulletins')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Bulletin
}

export async function deleteBulletin(id: string): Promise<void> {
  const { error } = await supabase
    .from('bulletins')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function uploadBulletinFile(file: File): Promise<Attachment> {
  const ext = file.name.split('.').pop() || ''
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `bulletins/${fileName}`

  const { error } = await supabase.storage
    .from('bulletin-files')
    .upload(filePath, file)
  if (error) throw error

  const { data } = supabase.storage.from('bulletin-files').getPublicUrl(filePath)

  return {
    name: file.name,
    url: data.publicUrl,
    type: ext.toLowerCase(),
  }
}

// =========================================================================
// 發布 + 通知
// =========================================================================

/** 依發布對象解析出目標 user id 清單（供通知用） */
async function resolveAudienceUserIds(b: Pick<Bulletin, 'audience' | 'audience_departments' | 'audience_user_ids'>): Promise<string[]> {
  const audience = b.audience || 'all'
  if (audience === 'custom') return b.audience_user_ids || []

  let query = supabase.from('profiles').select('id').eq('is_active', true)
  if (audience === 'department') {
    const depts = b.audience_departments || []
    if (depts.length === 0) return []
    query = query.in('department', depts)
  }
  const { data, error } = await query
  if (error) { console.error('[bulletin] resolveAudience failed:', error); return [] }
  return (data || []).map((r: { id: string }) => r.id)
}

export interface PublishOptions {
  /** 是否同時推播 LINE（預設 false，只發站內通知） */
  useLine?: boolean
  /** 發起者 id（會從通知對象中排除自己） */
  actorId?: string
}

/**
 * 發布公告：將狀態設為 published、補 published_at，並對目標對象發送通知。
 * createOrUpdate 已寫好的 bulletin 物件傳進來即可。
 */
export async function publishBulletinNotifications(bulletin: Bulletin, opts: PublishOptions = {}): Promise<number> {
  const targets = (await resolveAudienceUserIds(bulletin)).filter(id => !!id)
  if (targets.length === 0) return 0

  const channels = opts.useLine ? (['in_app', 'line'] as const) : (['in_app'] as const)
  const tag = bulletin.priority === 'urgent' ? '[緊急] 公告' : bulletin.priority === 'important' ? '[重要] 公告' : '公告'
  const ackHint = bulletin.require_ack ? '\n＊ 此公告需確認已閱' : ''
  const plainContent = richTextToPlainText(bulletin.content)
  // LINE 單則文字訊息上限約 5000 字，這裡保留餘裕；避免長公告被截斷（原本只取 200 字）
  const MAX_BODY = 4500
  const trimmedContent = plainContent.length > MAX_BODY ? `${plainContent.slice(0, MAX_BODY)}…（內容過長，完整內容請至系統查看）` : plainContent
  const title = `${tag}｜${bulletin.title}`

  // 若要推 LINE，額外建立 Flex（有顏色/粗體/字級/清單）；過長或無法解析則回傳 null，dispatch 會 fallback 純文字
  let flex: object | null = null
  if (opts.useLine) {
    flex = buildBulletinFlex(bulletin.content, {
      title,
      titleColor: bulletin.priority === 'urgent' ? '#D40000' : bulletin.priority === 'important' ? '#B8860B' : '#005FAF',
      requireAck: !!bulletin.require_ack,
      // 不帶連結：全文已顯示在 LINE 上，避免同仁誤以為要登入才能看
      url: null,
    })
  }

  await notify({
    user_ids: targets,
    type: 'new_announcement',
    title,
    body: `${trimmedContent}${ackHint}`,
    channels: [...channels],
    metadata: { bulletin_id: bulletin.id, priority: bulletin.priority, require_ack: !!bulletin.require_ack, ...(flex ? { flex } : {}) },
  })
  return targets.length
}

// =========================================================================
// LINE 群組推播
// =========================================================================

export interface LineGroup {
  group_id: string
  name: string | null
  source_type: string
  is_active: boolean
  push_enabled: boolean
}

/** 取得可推播的 LINE 群組（官方帳號目前在裡面且允許推播的） */
export async function getLineGroups(): Promise<LineGroup[]> {
  const { data, error } = await supabase
    .from('line_groups')
    .select('group_id, name, source_type, is_active, push_enabled')
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) { console.warn('[bulletin] getLineGroups failed:', error.message); return [] }
  return (data || []) as LineGroup[]
}

export interface GroupPushResult {
  processed: number
  results: Array<{ group_id: string; status: string; error?: string }>
}

/** 把公告推播到指定 LINE 群組（走伺服器端 API，Token 不外露） */
export async function pushBulletinToGroups(bulletin: Bulletin, groupIds: string[]): Promise<GroupPushResult> {
  if (!groupIds || groupIds.length === 0) return { processed: 0, results: [] }

  const tag = bulletin.priority === 'urgent' ? '[緊急] 公告' : bulletin.priority === 'important' ? '[重要] 公告' : '公告'
  const title = `${tag}｜${bulletin.title}`
  const ackHint = bulletin.require_ack ? '\n＊ 此公告需確認已閱' : ''
  const plain = richTextToPlainText(bulletin.content)
  const MAX_BODY = 4500
  const body = (plain.length > MAX_BODY ? `${plain.slice(0, MAX_BODY)}…（內容過長，完整內容請至系統查看）` : plain) + ackHint

  const flex = buildBulletinFlex(bulletin.content, {
    title,
    titleColor: bulletin.priority === 'urgent' ? '#D40000' : bulletin.priority === 'important' ? '#B8860B' : '#005FAF',
    requireAck: !!bulletin.require_ack,
    url: null,
  })

  const res = await fetch('/api/line/push-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupIds, title, body, flex }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`群組推播失敗：${res.status} ${t.slice(0, 200)}`)
  }
  return res.json()
}

// =========================================================================
// 已讀 / 已確認回條
// =========================================================================

/** 記錄已讀（開啟公告時呼叫；已存在則不覆寫 read_at） */
export async function markBulletinRead(bulletinId: string, userId: string): Promise<void> {
  if (!bulletinId || !userId) return
  const { error } = await supabase
    .from('bulletin_reads')
    .upsert({ bulletin_id: bulletinId, user_id: userId }, { onConflict: 'bulletin_id,user_id', ignoreDuplicates: true })
  if (error) console.warn('[bulletin] markRead failed:', error.message)
}

/** 按下「我已詳閱」確認 */
export async function ackBulletin(bulletinId: string, userId: string): Promise<void> {
  if (!bulletinId || !userId) return
  const { error } = await supabase
    .from('bulletin_reads')
    .upsert(
      { bulletin_id: bulletinId, user_id: userId, acked_at: new Date().toISOString() },
      { onConflict: 'bulletin_id,user_id' }
    )
  if (error) throw error
}

/** 取得單則公告的已讀/確認名單（發布者看統計用） */
export async function getBulletinReads(bulletinId: string): Promise<BulletinRead[]> {
  const { data, error } = await supabase
    .from('bulletin_reads')
    .select('*')
    .eq('bulletin_id', bulletinId)
  if (error) throw error
  return (data || []) as BulletinRead[]
}

/** 批次取得多則公告的所有已讀紀錄（管理頁統計用） */
export async function getReadsForBulletins(ids: string[]): Promise<BulletinRead[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('bulletin_reads')
    .select('*')
    .in('bulletin_id', ids)
  if (error) throw error
  return (data || []) as BulletinRead[]
}

export interface BulletinDelivery {
  user_id: string
  line: 'sent' | 'skipped' | 'failed' | 'none'
  in_app: 'sent' | 'skipped' | 'failed' | 'none'
  status: string
  error: string | null
  created_at: string
}

/**
 * 取得某則公告實際的發送/送達紀錄（依 notifications 表）。
 * 一位使用者可能因重複發布而有多筆，這裡只保留最新一筆。
 */
export async function getDeliveryForBulletin(bulletinId: string): Promise<BulletinDelivery[]> {
  if (!bulletinId) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('user_id, channels, channel_status, status, error, created_at')
    .eq('type', 'new_announcement')
    .eq('metadata->>bulletin_id', bulletinId)
    .order('created_at', { ascending: false })
  if (error) { console.warn('[bulletin] getDeliveryForBulletin failed:', error.message); return [] }

  const seen = new Set<string>()
  const out: BulletinDelivery[] = []
  for (const n of (data || []) as any[]) {
    if (seen.has(n.user_id)) continue // 已保留最新（依 created_at desc）
    seen.add(n.user_id)
    const cs = n.channel_status || {}
    const chans: string[] = n.channels || []
    const pick = (ch: string): BulletinDelivery['line'] =>
      !chans.includes(ch) ? 'none' : (cs[ch] === 'sent' || cs[ch] === 'failed' || cs[ch] === 'skipped' ? cs[ch] : 'none')
    out.push({
      user_id: n.user_id,
      line: pick('line'),
      in_app: pick('in_app'),
      status: n.status,
      error: n.error || null,
      created_at: n.created_at,
    })
  }
  return out
}

/** 取得某使用者已讀過的公告 id 集合（+ 是否已確認） */
export async function getMyReadMap(userId: string): Promise<Record<string, { read: boolean; acked: boolean }>> {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('bulletin_reads')
    .select('bulletin_id, acked_at')
    .eq('user_id', userId)
  if (error) { console.warn('[bulletin] getMyReadMap failed:', error.message); return {} }
  const map: Record<string, { read: boolean; acked: boolean }> = {}
  for (const r of data || []) map[r.bulletin_id] = { read: true, acked: !!r.acked_at }
  return map
}

// =========================================================================
// 可見性 / 未讀重要公告（登入彈窗用）
// =========================================================================

/** 判斷一則公告是否對該使用者可見（依 audience） */
export function isBulletinVisibleTo(
  b: Bulletin,
  ctx: { userId: string; department?: string | null; role?: string }
): boolean {
  if (ctx.role === 'admin') return true
  const audience = b.audience || 'all'
  if (audience === 'all') return true
  if (audience === 'department') return !!ctx.department && (b.audience_departments || []).includes(ctx.department)
  if (audience === 'custom') return (b.audience_user_ids || []).includes(ctx.userId)
  return true
}

/**
 * 取得「需要登入時彈窗提醒」的未讀公告：
 * 置頂 / important / urgent，且尚未確認（require_ack）或尚未讀過。
 */
export async function getLoginAlertBulletins(
  ctx: { userId: string; department?: string | null; role?: string }
): Promise<Bulletin[]> {
  const all = await getBulletins()
  const readMap = await getMyReadMap(ctx.userId)

  return all
    .filter(b => isBulletinVisibleTo(b, ctx))
    .filter(b => b.pinned || b.priority === 'urgent' || b.priority === 'important' || b.require_ack)
    .filter(b => {
      const r = readMap[b.id]
      if (b.require_ack) return !r?.acked
      return !r?.read
    })
    .sort((a, b) => {
      const rank = (x: Bulletin) => (x.priority === 'urgent' ? 0 : x.priority === 'important' ? 1 : 2)
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return rank(a) - rank(b)
    })
}

export function getBulletinCalendarEvents(bulletins: Bulletin[], year: number, month: number) {
  const events: Array<{ date: number; title: string; type: string; bulletinId: string }> = []

  for (const b of bulletins) {
    if (b.event_date) {
      const d = new Date(b.event_date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        events.push({ date: d.getDate(), title: b.title, type: b.bulletin_type, bulletinId: b.id })
      }
    }
    if (b.is_recurring && b.recurring_days) {
      for (const day of b.recurring_days) {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        if (day <= daysInMonth) {
          events.push({ date: day, title: b.title, type: b.bulletin_type, bulletinId: b.id })
        }
      }
    }
  }

  return events
}
