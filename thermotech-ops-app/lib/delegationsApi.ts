import { supabase as sb } from './supabase'
import { notify } from './notifications'

/**
 * Delegations API — 交辦事項
 *
 * 概念：
 * - issuer (交辦人) 必須是「具交辦權限」的人員（admin role 預設可，CONFIG 可微調）
 * - assignee (承辦人) 為任意 profile
 * - 一筆交辦 = 一個跨日區間 (start_date → due_date) 的工作單
 * - 狀態：pending / done ；overdue 為動態計算 (due_date < today AND !done)
 */

export type DelegationStatus = 'pending' | 'done'
export type DelegationPriority = 'normal' | 'high' | 'urgent'

export interface Delegation {
  id: string
  title: string
  description: string | null
  issuer_id: string
  issuer_name: string | null
  assignee_id: string
  assignee_name: string | null
  start_date: string  // YYYY-MM-DD
  due_date: string
  status: DelegationStatus
  priority: DelegationPriority
  notes: string | null
  completed_at: string | null
  completed_note: string | null
  reminder_due_sent: boolean
  reminder_overdue_sent: boolean
  created_at: string
  updated_at: string
}

export interface CreateDelegationInput {
  title: string
  description?: string
  issuer_id: string
  issuer_name?: string
  assignee_id: string
  assignee_name?: string
  start_date: string
  due_date: string
  priority?: DelegationPriority
  notes?: string
  /** 是否要發送即時通知給承辦人（預設 true） */
  notifyAssignee?: boolean
  /** 是否同時推 LINE（預設 true，未綁 LINE 者僅站內收到） */
  pushLine?: boolean
}

// =========================================================================
// CRUD
// =========================================================================

export async function createDelegation(input: CreateDelegationInput): Promise<Delegation> {
  const { notifyAssignee = true, pushLine = true, ...row } = input

  const { data, error } = await sb
    .from('delegations')
    .insert({
      title: row.title,
      description: row.description || null,
      issuer_id: row.issuer_id,
      issuer_name: row.issuer_name || null,
      assignee_id: row.assignee_id,
      assignee_name: row.assignee_name || null,
      start_date: row.start_date,
      due_date: row.due_date,
      priority: row.priority || 'normal',
      notes: row.notes || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  const created = data as Delegation

  // 發送通知給承辦人
  if (notifyAssignee && created.assignee_id !== created.issuer_id) {
    try {
      await notify({
        user_ids: [created.assignee_id],
        type: 'delegation_assigned',
        title: `📋 新交辦事項：${created.title}`,
        body: `來自 ${created.issuer_name || '主管'}｜期限 ${created.start_date} → ${created.due_date}`,
        link: `/home?tab=home&delegation=${created.id}`,
        channels: pushLine ? ['in_app', 'line'] : ['in_app'],
        metadata: {
          delegation_id: created.id,
          issuer_id: created.issuer_id,
          due_date: created.due_date,
          priority: created.priority,
        },
      })
    } catch (e) {
      console.warn('[createDelegation] notify failed:', e)
    }
  }

  return created
}

export async function getDelegationById(id: string): Promise<Delegation | null> {
  const { data, error } = await sb
    .from('delegations')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Delegation) || null
}

/** 我承接的（assignee = me） */
export async function getDelegationsAssignedToMe(userId: string, includeDone = false): Promise<Delegation[]> {
  let q = sb.from('delegations').select('*').eq('assignee_id', userId)
  if (!includeDone) q = q.eq('status', 'pending')
  const { data, error } = await q.order('due_date', { ascending: true })
  if (error) throw error
  return (data as Delegation[]) || []
}

/** 我交辦的（issuer = me） */
export async function getDelegationsIssuedByMe(userId: string, includeDone = false): Promise<Delegation[]> {
  let q = sb.from('delegations').select('*').eq('issuer_id', userId)
  if (!includeDone) q = q.eq('status', 'pending')
  const { data, error } = await q.order('due_date', { ascending: true })
  if (error) throw error
  return (data as Delegation[]) || []
}

/** 用於行事曆：取某月份內所有「與我相關」的交辦（跨日橫條會穿越月份） */
export async function getDelegationsForMonth(
  year: number,
  month: number,
  userId: string
): Promise<Delegation[]> {
  // 月份起訖
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // 區間有重疊：start_date <= monthEnd AND due_date >= monthStart
  // 且使用者必須是 issuer 或 assignee
  const { data, error } = await sb
    .from('delegations')
    .select('*')
    .or(`assignee_id.eq.${userId},issuer_id.eq.${userId}`)
    .lte('start_date', monthEnd)
    .gte('due_date', monthStart)
    .order('start_date', { ascending: true })

  if (error) throw error
  return (data as Delegation[]) || []
}

export async function markDelegationDone(id: string, note?: string): Promise<Delegation> {
  const { data, error } = await sb
    .from('delegations')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      completed_note: note || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  const done = data as Delegation

  // 通知交辦人：承辦人已完成（閉環）
  if (done.issuer_id !== done.assignee_id) {
    try {
      await notify({
        user_ids: [done.issuer_id],
        type: 'delegation_completed',
        title: `✓ 交辦事項已完成：${done.title}`,
        body: `${done.assignee_name || '承辦人'} 已完成此交辦${note ? `｜備註：${note}` : ''}`,
        link: `/home?tab=home&delegation=${done.id}`,
        channels: ['in_app'],
        metadata: { delegation_id: done.id },
      })
    } catch (e) {
      console.warn('[markDelegationDone] notify failed:', e)
    }
  }

  return done
}

export async function reopenDelegation(id: string): Promise<Delegation> {
  const { data, error } = await sb
    .from('delegations')
    .update({
      status: 'pending',
      completed_at: null,
      completed_note: null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Delegation
}

export async function deleteDelegation(id: string): Promise<void> {
  const { error } = await sb.from('delegations').delete().eq('id', id)
  if (error) throw error
}

// =========================================================================
// REALTIME
// =========================================================================

export function subscribeDelegations(callback: () => void) {
  const channel = sb
    .channel('delegations-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'delegations' },
      () => callback()
    )
    .subscribe()
  return () => { sb.removeChannel(channel) }
}

// =========================================================================
// HELPERS
// =========================================================================

/** 是否已逾期（pending 且 due_date < today） */
export function isOverdue(d: Delegation): boolean {
  if (d.status === 'done') return false
  const today = new Date().toISOString().slice(0, 10)
  return d.due_date < today
}

/** 距離到期還有幾天（負數 = 已逾期） */
export function daysUntilDue(d: Delegation): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(d.due_date)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

// =========================================================================
// PERMISSION — 交辦權限 (CONFIG 控制)
// =========================================================================

const ISSUER_OVERRIDE_KEY = 'ops_delegation_issuers'

/**
 * 是否具交辦權限：
 * - admin role 預設 true
 * - CONFIG 中個別開關（localStorage 或未來 DB）優先
 */
export function canIssueDelegation(userId: string, role: string): boolean {
  if (typeof window === 'undefined') return role === 'admin'
  try {
    const raw = localStorage.getItem(ISSUER_OVERRIDE_KEY)
    if (raw) {
      const config = JSON.parse(raw) as Record<string, boolean>
      // 個人覆寫優先
      if (userId in config) return config[userId] === true
    }
  } catch { /* ignore */ }
  return role === 'admin'
}

export function getIssuerOverrides(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(ISSUER_OVERRIDE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function setIssuerOverrides(map: Record<string, boolean>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ISSUER_OVERRIDE_KEY, JSON.stringify(map))
}
