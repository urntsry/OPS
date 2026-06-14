'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getTasksAssignedToMe, getTasksIssuedByMe, getAllWorkTasks,
  submitEstimate, confirmWorkTask, requestReestimate, completeWorkTask, reopenWorkTask,
  updateChecklist, deleteWorkTask, subscribeWorkTasks, canIssueTask,
  STATUS_LABEL, type WorkTask, type WorkTaskStatus, type ChecklistItem,
} from '@/lib/workTasksApi'
import WorkTaskCreateModal from './WorkTaskCreateModal'

interface Props {
  userProfile?: { id?: string; full_name?: string; role?: string } | null
}

type ViewMode = 'assigned' | 'issued' | 'all'

const statusColor = (s: WorkTaskStatus): string => ({
  estimating: 'var(--status-warning, #B8860B)',
  confirming: 'var(--accent-teal, #008080)',
  in_progress: 'var(--accent-blue, #005FAF)',
  done: 'var(--status-success, #2E7D32)',
  cancelled: 'var(--text-muted)',
}[s] || 'var(--text-primary)')

const prioTag = (p: string) => p === 'urgent' ? '🔴' : p === 'high' ? '🟠' : ''

export default function WorkTasksTab({ userProfile }: Props) {
  const userId = userProfile?.id || ''
  const userName = userProfile?.full_name || ''
  const canIssue = canIssueTask(userProfile?.role)

  const [view, setView] = useState<ViewMode>(canIssue ? 'issued' : 'assigned')
  const [includeDone, setIncludeDone] = useState(false)
  const [tasks, setTasks] = useState<WorkTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<WorkTask | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = view === 'assigned' ? await getTasksAssignedToMe(userId, includeDone)
        : view === 'issued' ? await getTasksIssuedByMe(userId, includeDone)
        : await getAllWorkTasks(includeDone)
      setTasks(data)
      // 同步更新已開啟的詳情
      setSelected(prev => prev ? data.find(t => t.id === prev.id) || null : null)
    } catch (e) { console.error('[WorkTasksTab] load failed:', e) }
    setLoading(false)
  }, [userId, view, includeDone])

  useEffect(() => { load() }, [load])
  useEffect(() => subscribeWorkTasks(() => load()), [load])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500) }

  // ---------- 詳情視圖 ----------
  if (selected) {
    return <TaskDetail
      task={selected}
      userId={userId}
      onBack={() => setSelected(null)}
      onChanged={(msg) => { if (msg) flash(msg); load() }}
    />
  }

  // ---------- 列表視圖 ----------
  return (
    <div>
      {toast && (
        <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px' }}>{toast}</div>
      )}

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
        {([['assigned', '我承接的'], ['issued', '我交辦的'], ...(canIssue ? [['all', '全部']] : [])] as [ViewMode, string][]).map(([v, lbl]) => (
          <button key={v} onClick={() => { setView(v); setSelected(null) }} style={{
            padding: '2px 10px', fontSize: '9px', fontFamily: 'monospace', cursor: 'pointer', outline: 'none',
            fontWeight: view === v ? 'bold' : 'normal',
            background: view === v ? 'var(--active-bg, #005FAF)' : 'var(--bg-window)', color: view === v ? '#FFF' : 'var(--text-primary)',
            border: '1px solid var(--border-mid-dark)',
          }}>{lbl}</button>
        ))}
        <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', marginLeft: '4px' }}>
          <input type="checkbox" checked={includeDone} onChange={e => setIncludeDone(e.target.checked)} /> 含已完成
        </label>
        <div style={{ flex: 1 }} />
        {canIssue && <button className="btn" onClick={() => setShowCreate(true)} style={{ fontSize: '9px', padding: '2px 10px', fontWeight: 'bold' }}>+ 建立任務</button>}
      </div>

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '440px' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>- 無任務 -</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '52px' }}>狀態</th>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>任務</th>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '70px' }}>{view === 'assigned' ? '交辦人' : '承辦人'}</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '60px' }}>預計</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => {
                const done = t.checklist.filter(c => c.done).length
                return (
                  <tr key={t.id} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)', cursor: 'pointer' }} onClick={() => setSelected(t)}>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                      <span style={{ color: statusColor(t.status), fontWeight: 'bold', fontSize: '8px' }}>{STATUS_LABEL[t.status]}</span>
                    </td>
                    <td style={{ padding: '3px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prioTag(t.priority)} {t.title}
                      {t.checklist.length > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '8px' }}> [{done}/{t.checklist.length}]</span>}
                    </td>
                    <td style={{ padding: '3px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {view === 'assigned' ? (t.issuer_name || '-') : (t.assignee_name || '-')}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'center', fontSize: '8px', color: 'var(--text-muted)' }}>{t.estimated_due || t.hard_due || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <WorkTaskCreateModal
        open={showCreate}
        currentUserId={userId}
        currentUserName={userName}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); flash('任務已交辦並通知'); load() }}
      />
    </div>
  )
}

// =============================================================
// 任務詳情 + 狀態動作
// =============================================================
function TaskDetail({ task, userId, onBack, onChanged }: {
  task: WorkTask
  userId: string
  onBack: () => void
  onChanged: (msg?: string) => void
}) {
  const isAssignee = task.assignee_id === userId
  const isIssuer = task.issuer_id === userId

  // 評估表單
  const [estHours, setEstHours] = useState<string>(task.estimated_hours?.toString() || '')
  const [estDue, setEstDue] = useState<string>(task.estimated_due || '')
  const [estNote, setEstNote] = useState<string>(task.estimate_note || '')
  // 完成備註
  const [completeNote, setCompleteNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [checklist, setLocalChecklist] = useState<ChecklistItem[]>(task.checklist)

  useEffect(() => { setLocalChecklist(task.checklist) }, [task.checklist])

  const run = async (fn: () => Promise<any>, msg?: string) => {
    setBusy(true)
    try { await fn(); onChanged(msg) } catch (e) { alert('操作失敗：' + (e instanceof Error ? e.message : String(e))) }
    setBusy(false)
  }

  const toggleItem = async (id: string) => {
    const next = checklist.map(c => c.id === id ? { ...c, done: !c.done } : c)
    setLocalChecklist(next)
    try { await updateChecklist(task.id, next) } catch { /* keep optimistic */ }
  }

  const checklistDone = checklist.filter(c => c.done).length
  const allDone = checklist.length > 0 && checklistDone === checklist.length

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', fontSize: '10px', marginBottom: '3px' }}>
      <span style={{ width: '64px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1 }}>{value}</span>
    </div>
  )

  return (
    <div style={{ fontSize: '11px' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
        <button className="btn" onClick={onBack} style={{ fontSize: '9px', padding: '1px 6px' }}>← 返回</button>
        <span style={{ fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prioTag(task.priority)} {task.title}</span>
        <span style={{ color: statusColor(task.status), fontWeight: 'bold', fontSize: '10px' }}>{STATUS_LABEL[task.status]}</span>
      </div>

      <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>任務資訊</div>
        <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
          {row('交辦人', task.issuer_name || '-')}
          {row('承辦人', task.assignee_name || '-')}
          {row('期望期限', task.hard_due || '—')}
          {row('預估工時', task.estimated_hours != null ? `${task.estimated_hours} 小時` : '— 待回報')}
          {row('預計完成', task.estimated_due || '—')}
          {task.description && (
            <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap', lineHeight: 1.5, borderTop: '1px solid var(--table-border)', paddingTop: '6px' }}>{task.description}</div>
          )}
          {task.issuer_note && <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--accent-orange, #B8860B)' }}>主管備註：{task.issuer_note}</div>}
        </div>
      </div>

      {/* 待辦清單 */}
      {checklist.length > 0 && (
        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>待辦清單 {checklistDone}/{checklist.length}</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
            {checklist.map(it => (
              <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', padding: '2px 0', cursor: (isAssignee && task.status === 'in_progress') ? 'pointer' : 'default', opacity: it.done ? 0.6 : 1 }}>
                <input type="checkbox" checked={it.done} disabled={!(isAssignee && task.status === 'in_progress')} onChange={() => toggleItem(it.id)} />
                <span style={{ textDecoration: it.done ? 'line-through' : 'none' }}>{it.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* === 狀態動作 === */}

      {/* 承辦人：待評估 → 回報預估 */}
      {isAssignee && task.status === 'estimating' && (
        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>回報預估（不可拒絕，請評估所需時間）</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block' }}>預估工時（小時）</label>
                <input type="number" min="0" step="0.5" value={estHours} onChange={e => setEstHours(e.target.value)} style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '3px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block' }}>預計完成日</label>
                <input type="date" value={estDue} onChange={e => setEstDue(e.target.value)} style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '3px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
              </div>
            </div>
            <textarea value={estNote} onChange={e => setEstNote(e.target.value)} rows={2} placeholder="補充說明（例：需先取得 X 資料、會與其他案撞期...）" style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '3px', resize: 'vertical', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box', marginBottom: '4px' }} />
            <button className="btn" disabled={busy} onClick={() => run(() => submitEstimate(task.id, { estimated_hours: estHours ? parseFloat(estHours) : undefined, estimated_due: estDue || undefined, estimate_note: estNote || undefined }), '已回報預估，等待主管確認')} style={{ fontSize: '10px', padding: '4px 14px', fontWeight: 'bold', background: '#005FAF', color: '#FFF', border: '1px solid #003F7F' }}>送出預估</button>
          </div>
        </div>
      )}

      {/* 交辦人：待確認 → 確認 / 退回 */}
      {isIssuer && task.status === 'confirming' && (
        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>承辦人已回報，請確認</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
            <div style={{ fontSize: '10px', marginBottom: '6px' }}>
              預估 <b>{task.estimated_hours ?? '?'}</b> 小時，預計 <b>{task.estimated_due || '—'}</b> 完成
              {task.estimate_note && <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>說明：{task.estimate_note}</div>}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn" disabled={busy} onClick={() => run(() => confirmWorkTask(task.id), '已確認，任務進行中')} style={{ fontSize: '10px', padding: '4px 14px', fontWeight: 'bold', background: '#2E7D32', color: '#FFF', border: '1px solid #1B5E20' }}>確認，開始進行</button>
              <button className="btn" disabled={busy} onClick={() => { const note = prompt('退回原因 / 希望調整方向：'); if (note !== null) run(() => requestReestimate(task.id, note || undefined), '已退回重新評估') }} style={{ fontSize: '10px', padding: '4px 10px', color: 'var(--accent-red)' }}>退回重評</button>
            </div>
          </div>
        </div>
      )}

      {/* 承辦人：進行中 → 完成 */}
      {isAssignee && task.status === 'in_progress' && (
        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>完成任務</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
            {checklist.length > 0 && !allDone && <div style={{ fontSize: '9px', color: 'var(--accent-orange, #B8860B)', marginBottom: '4px' }}>提醒：還有待辦項目未勾選（仍可標記完成）</div>}
            <textarea value={completeNote} onChange={e => setCompleteNote(e.target.value)} rows={2} placeholder="完成備註（產出物、結果...）" style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '3px', resize: 'vertical', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box', marginBottom: '4px' }} />
            <button className="btn" disabled={busy} onClick={() => run(() => completeWorkTask(task.id, completeNote || undefined), '任務已完成')} style={{ fontSize: '10px', padding: '4px 14px', fontWeight: 'bold', background: '#2E7D32', color: '#FFF', border: '1px solid #1B5E20' }}>標記完成</button>
          </div>
        </div>
      )}

      {/* 已完成 */}
      {task.status === 'done' && (
        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>已完成</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)', fontSize: '10px' }}>
            <div>完成時間：{task.completed_at?.slice(0, 16).replace('T', ' ') || '-'}</div>
            {task.completed_note && <div style={{ marginTop: '2px' }}>備註：{task.completed_note}</div>}
            {isIssuer && <button className="btn" disabled={busy} onClick={() => run(() => reopenWorkTask(task.id), '已重新開啟')} style={{ fontSize: '9px', padding: '2px 10px', marginTop: '6px' }}>重新開啟</button>}
          </div>
        </div>
      )}

      {/* 交辦人/承辦人皆可等待對方時的提示 */}
      {isIssuer && task.status === 'estimating' && (
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '4px 2px' }}>等待 {task.assignee_name || '承辦人'} 回報預估工時...</div>
      )}
      {isAssignee && task.status === 'confirming' && (
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '4px 2px' }}>已送出預估，等待主管確認...</div>
      )}

      {isIssuer && (
        <button className="btn" disabled={busy} onClick={() => { if (confirm('確定刪除此任務？')) run(() => deleteWorkTask(task.id).then(onBack), '已刪除') }} style={{ fontSize: '9px', padding: '2px 10px', color: 'var(--accent-red)', marginTop: '4px' }}>刪除任務</button>
      )}
    </div>
  )
}
