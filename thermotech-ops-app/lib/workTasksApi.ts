import { supabase as sb } from './supabase'
import { notify } from './notifications'

/**
 * Work Tasks API — 業務任務交辦
 *
 * 設計重點：
 * - 交辦人(issuer) 建立任務 → 承辦人(assignee) 「不能拒絕」，只能回報預估工時 → 主管確認後進行
 * - 每個任務含待辦清單 (checklist) 與細節描述
 *
 * 狀態機：
 *   estimating(待評估) → confirming(待確認) → in_progress(進行中) → done(已完成)
 *   confirming 可由 issuer 退回 estimating（來回協商）
 */

export type WorkTaskStatus = 'estimating' | 'confirming' | 'in_progress' | 'done' | 'cancelled'
export type WorkTaskPriority = 'normal' | 'high' | 'urgent'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface WorkTask {
  id: string
  title: string
  description: string | null
  issuer_id: string | null
  issuer_name: string | null
  assignee_id: string
  assignee_name: string | null
  status: WorkTaskStatus
  estimated_hours: number | null
  estimated_due: string | null
  estimate_note: string | null
  priority: WorkTaskPriority
  hard_due: string | null
  issuer_note: string | null
  checklist: ChecklistItem[]
  accepted_at: string | null
  completed_at: string | null
  completed_note: string | null
  created_at: string
  updated_at: string
}

export interface CreateWorkTaskInput {
  title: string
  description?: string
  issuer_id: string
  issuer_name?: string
  assignee_id: string
  assignee_name?: string
  priority?: WorkTaskPriority
  hard_due?: string
  issuer_note?: string
  checklist?: ChecklistItem[]
  pushLine?: boolean
}

export const STATUS_LABEL: Record<WorkTaskStatus, string> = {
  estimating: '待評估',
  confirming: '待確認',
  in_progress: '進行中',
  done: '已完成',
  cancelled: '已取消',
}

/** 誰能交辦任務：admin / manager / supervisor */
export function canIssueTask(role?: string): boolean {
  return role === 'admin' || role === 'manager' || role === 'supervisor'
}

export function newChecklistItem(text: string): ChecklistItem {
  return { id: Math.random().toString(36).slice(2, 10), text, done: false }
}

function normalize(row: any): WorkTask {
  return { ...row, checklist: Array.isArray(row.checklist) ? row.checklist : [] } as WorkTask
}

// =========================================================================
// CRUD + 狀態轉換
// =========================================================================

export async function createWorkTask(input: CreateWorkTaskInput): Promise<WorkTask> {
  const { pushLine = true, ...row } = input
  const { data, error } = await sb
    .from('work_tasks')
    .insert({
      title: row.title,
      description: row.description || null,
      issuer_id: row.issuer_id,
      issuer_name: row.issuer_name || null,
      assignee_id: row.assignee_id,
      assignee_name: row.assignee_name || null,
      priority: row.priority || 'normal',
      hard_due: row.hard_due || null,
      issuer_note: row.issuer_note || null,
      checklist: row.checklist || [],
      status: 'estimating',
    })
    .select()
    .single()
  if (error) throw error
  const created = normalize(data)

  if (created.assignee_id !== created.issuer_id) {
    try {
      await notify({
        user_ids: [created.assignee_id],
        type: 'task_assigned',
        title: `🗂 新任務待評估：${created.title}`,
        body: `來自 ${created.issuer_name || '主管'}｜請回報預估工時與完成日${created.hard_due ? `（期望 ${created.hard_due} 前）` : ''}`,
        channels: pushLine ? ['in_app', 'line'] : ['in_app'],
        metadata: { work_task_id: created.id, issuer_id: created.issuer_id, priority: created.priority },
      })
    } catch (e) { console.warn('[createWorkTask] notify failed:', e) }
  }
  return created
}

/** 承辦人回報預估工時 → 進入待確認 */
export async function submitEstimate(
  id: string,
  est: { estimated_hours?: number; estimated_due?: string; estimate_note?: string },
): Promise<WorkTask> {
  const { data, error } = await sb
    .from('work_tasks')
    .update({
      estimated_hours: est.estimated_hours ?? null,
      estimated_due: est.estimated_due || null,
      estimate_note: est.estimate_note || null,
      status: 'confirming',
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  const t = normalize(data)
  if (t.issuer_id && t.issuer_id !== t.assignee_id) {
    try {
      await notify({
        user_ids: [t.issuer_id],
        type: 'task_assigned',
        title: `⏱ 已回報預估：${t.title}`,
        body: `${t.assignee_name || '承辦人'} 預估 ${t.estimated_hours ?? '?'} 小時${t.estimated_due ? `，預計 ${t.estimated_due} 完成` : ''}，請確認`,
        channels: ['in_app', 'line'],
        metadata: { work_task_id: t.id },
      })
    } catch (e) { console.warn('[submitEstimate] notify failed:', e) }
  }
  return t
}

/** 主管確認 → 進行中 */
export async function confirmWorkTask(id: string, opts: { hard_due?: string } = {}): Promise<WorkTask> {
  const patch: any = { status: 'in_progress', accepted_at: new Date().toISOString() }
  if (opts.hard_due !== undefined) patch.hard_due = opts.hard_due || null
  const { data, error } = await sb.from('work_tasks').update(patch).eq('id', id).select().single()
  if (error) throw error
  const t = normalize(data)
  if (t.assignee_id !== t.issuer_id) {
    try {
      await notify({
        user_ids: [t.assignee_id],
        type: 'task_assigned',
        title: `✅ 任務已確認，請開始：${t.title}`,
        body: `預計 ${t.estimated_due || t.hard_due || '—'} 完成`,
        channels: ['in_app', 'line'],
        metadata: { work_task_id: t.id },
      })
    } catch (e) { console.warn('[confirmWorkTask] notify failed:', e) }
  }
  return t
}

/** 主管退回重新評估（來回協商） */
export async function requestReestimate(id: string, note?: string): Promise<WorkTask> {
  const { data, error } = await sb
    .from('work_tasks')
    .update({ status: 'estimating', issuer_note: note || null })
    .eq('id', id).select().single()
  if (error) throw error
  const t = normalize(data)
  if (t.assignee_id !== t.issuer_id) {
    try {
      await notify({
        user_ids: [t.assignee_id],
        type: 'task_assigned',
        title: `🔁 請重新評估：${t.title}`,
        body: note || '主管希望你重新評估工時/完成日',
        channels: ['in_app', 'line'],
        metadata: { work_task_id: t.id },
      })
    } catch (e) { console.warn('[requestReestimate] notify failed:', e) }
  }
  return t
}

export async function updateChecklist(id: string, checklist: ChecklistItem[]): Promise<void> {
  const { error } = await sb.from('work_tasks').update({ checklist }).eq('id', id)
  if (error) throw error
}

/** 承辦人完成任務 */
export async function completeWorkTask(id: string, note?: string): Promise<WorkTask> {
  const { data, error } = await sb
    .from('work_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString(), completed_note: note || null })
    .eq('id', id).select().single()
  if (error) throw error
  const t = normalize(data)
  if (t.issuer_id && t.issuer_id !== t.assignee_id) {
    try {
      await notify({
        user_ids: [t.issuer_id],
        type: 'task_assigned',
        title: `🎉 任務已完成：${t.title}`,
        body: `${t.assignee_name || '承辦人'} 已完成${note ? `｜${note}` : ''}`,
        channels: ['in_app', 'line'],
        metadata: { work_task_id: t.id },
      })
    } catch (e) { console.warn('[completeWorkTask] notify failed:', e) }
  }
  return t
}

export async function reopenWorkTask(id: string): Promise<void> {
  const { error } = await sb.from('work_tasks').update({ status: 'in_progress', completed_at: null }).eq('id', id)
  if (error) throw error
}

export async function deleteWorkTask(id: string): Promise<void> {
  const { error } = await sb.from('work_tasks').delete().eq('id', id)
  if (error) throw error
}

// =========================================================================
// 查詢
// =========================================================================

export async function getTasksAssignedToMe(userId: string, includeDone = false): Promise<WorkTask[]> {
  let q = sb.from('work_tasks').select('*').eq('assignee_id', userId).order('created_at', { ascending: false })
  if (!includeDone) q = q.neq('status', 'done').neq('status', 'cancelled')
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(normalize)
}

export async function getTasksIssuedByMe(userId: string, includeDone = false): Promise<WorkTask[]> {
  let q = sb.from('work_tasks').select('*').eq('issuer_id', userId).order('created_at', { ascending: false })
  if (!includeDone) q = q.neq('status', 'done').neq('status', 'cancelled')
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(normalize)
}

export async function getAllWorkTasks(includeDone = true): Promise<WorkTask[]> {
  let q = sb.from('work_tasks').select('*').order('created_at', { ascending: false })
  if (!includeDone) q = q.neq('status', 'done').neq('status', 'cancelled')
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(normalize)
}

export function subscribeWorkTasks(callback: () => void) {
  const channel = sb
    .channel('work-tasks-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'work_tasks' }, () => callback())
    .subscribe()
  return () => { sb.removeChannel(channel) }
}
