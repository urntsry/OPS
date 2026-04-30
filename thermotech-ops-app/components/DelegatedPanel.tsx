'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getDelegationsAssignedToMe, getDelegationsIssuedByMe,
  markDelegationDone, deleteDelegation, subscribeDelegations,
  daysUntilDue, isOverdue, canIssueDelegation,
  type Delegation,
} from '@/lib/delegationsApi'

interface Props {
  userId: string
  userRole: string
  userName: string
  /** 觸發開啟「建立交辦」彈窗 */
  onCreateRequest?: () => void
}

export default function DelegatedPanel({ userId, userRole, userName: _userName, onCreateRequest }: Props) {
  const [received, setReceived] = useState<Delegation[]>([])
  const [issued, setIssued] = useState<Delegation[]>([])
  const [loading, setLoading] = useState(true)
  // 點列展開的目標 id（一次只展開一列）
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const isIssuer = canIssueDelegation(userId, userRole)

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const [r, i] = await Promise.all([
        getDelegationsAssignedToMe(userId, false),
        isIssuer ? getDelegationsIssuedByMe(userId, false) : Promise.resolve([]),
      ])
      setReceived(r)
      setIssued(i)
    } catch (e) {
      console.warn('[DelegatedPanel] refresh failed:', e)
    } finally {
      setLoading(false)
    }
  }, [userId, isIssuer])

  useEffect(() => { refresh() }, [refresh])

  // Realtime
  useEffect(() => {
    if (!userId) return
    const unsub = subscribeDelegations(() => { refresh() })
    return unsub
  }, [userId, refresh])

  // 合併、去重、依到期日排序
  const list = useMemo(() => {
    const map = new Map<string, Delegation>()
    for (const d of received) map.set(d.id, d)
    for (const d of issued) map.set(d.id, d)
    return Array.from(map.values()).sort((a, b) => a.due_date.localeCompare(b.due_date))
  }, [received, issued])

  // Auto-hide: 沒承接、沒交辦、也不是 issuer → 不顯示
  const shouldHide = received.length === 0 && issued.length === 0 && !isIssuer
  if (shouldHide) return null

  const handleMarkDone = async (id: string) => {
    if (!confirm('確認標記為已完成？')) return
    try {
      await markDelegationDone(id)
      refresh()
    } catch (e) {
      alert(`標記失敗：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確認刪除此交辦事項？此操作無法復原。')) return
    try {
      await deleteDelegation(id)
      refresh()
    } catch (e) {
      alert(`刪除失敗：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="window" style={{ overflow: 'hidden' }}>
      {/* Titlebar */}
      <div className="titlebar" style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📋 DELEGATED ({list.length})</span>
        {isIssuer && onCreateRequest && (
          <button
            onClick={onCreateRequest}
            title="新增交辦事項"
            style={{ padding: '0 6px', fontSize: '10px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', height: '16px' }}
          >
            + 新增
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)' }}>載入中...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)' }}>
            目前無交辦事項
          </div>
        ) : (
          list.map(d => (
            <DelegationRow
              key={d.id}
              delegation={d}
              currentUserId={userId}
              expanded={expandedId === d.id}
              onToggleExpand={() => setExpandedId(prev => prev === d.id ? null : d.id)}
              onMarkDone={() => handleMarkDone(d.id)}
              onDelete={() => handleDelete(d.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// =============================================================
function DelegationRow({
  delegation: d, currentUserId, expanded, onToggleExpand, onMarkDone, onDelete,
}: {
  delegation: Delegation
  currentUserId: string
  expanded: boolean
  onToggleExpand: () => void
  onMarkDone: () => void
  onDelete: () => void
}) {
  const overdue = isOverdue(d)
  const daysLeft = daysUntilDue(d)
  const iAmAssignee = d.assignee_id === currentUserId
  const iAmIssuer = d.issuer_id === currentUserId

  const statusInfo = useMemo(() => {
    if (d.status === 'done') return { text: '✓ 完成', color: 'var(--text-muted)' }
    if (overdue) return { text: `逾期${Math.abs(daysLeft)}d`, color: 'var(--accent-red)' }
    if (daysLeft === 0) return { text: '今日', color: 'var(--accent-orange)' }
    if (daysLeft <= 2) return { text: `剩${daysLeft}d`, color: 'var(--accent-orange)' }
    return { text: `剩${daysLeft}d`, color: 'var(--text-muted)' }
  }, [d.status, overdue, daysLeft])

  const priorityBadge = useMemo(() => {
    if (d.priority === 'urgent') return { text: '緊', color: 'var(--accent-red)' }
    if (d.priority === 'high') return { text: '重', color: 'var(--accent-orange)' }
    return null
  }, [d.priority])

  const fmtDate = (s: string) => s.slice(5).replace('-', '/')  // MM/DD
  const fmtDateTime = (iso: string | null) => {
    if (!iso) return '—'
    const dt = new Date(iso)
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`
  }
  const totalDays = useMemo(() => {
    const s = new Date(d.start_date).getTime()
    const e = new Date(d.due_date).getTime()
    return Math.round((e - s) / 86400000) + 1
  }, [d.start_date, d.due_date])

  // 方向指示：來自 → 我 / 我 → 給誰
  // 這樣即使欄位窄也能一眼看出角色
  const dirLabel = iAmAssignee
    ? <><span style={{ color: 'var(--text-muted)' }}>{d.issuer_name || '?'}</span><span style={{ margin: '0 3px', color: 'var(--accent-blue)' }}>→</span><span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>我</span></>
    : <><span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>我</span><span style={{ margin: '0 3px', color: 'var(--accent-blue)' }}>→</span><span style={{ color: 'var(--text-muted)' }}>{d.assignee_name || '?'}</span></>

  const borderLeftColor = overdue ? 'var(--accent-red)' : (iAmAssignee ? 'var(--accent-blue)' : 'var(--accent-orange)')

  return (
    <>
      {/* Row — 兩行緊湊版面，適合窄欄位 */}
      <div
        onClick={onToggleExpand}
        className="eventlist-row"
        style={{
          padding: '4px 5px',
          borderBottom: '1px solid var(--table-border)',
          borderLeft: `3px solid ${borderLeftColor}`,
          background: expanded ? 'var(--bg-inset)' : (overdue ? 'rgba(178,34,34,0.06)' : 'var(--bg-window)'),
          cursor: 'pointer',
          fontSize: '10px',
          fontFamily: 'monospace',
        }}
        title={expanded ? '點擊收起' : '點擊展開詳情'}
      >
        {/* Line 1: 展開符號 + 優先度 + 標題 + 狀態 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--text-muted)', flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
          {priorityBadge && (
            <span style={{ fontSize: '8px', padding: '0 3px', background: priorityBadge.color, color: '#FFF', fontWeight: 'bold', flexShrink: 0 }}>
              {priorityBadge.text}
            </span>
          )}
          <span style={{ flex: 1, fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.title}
          </span>
          <span style={{ fontSize: '9px', color: statusInfo.color, fontWeight: 'bold', flexShrink: 0 }}>
            {statusInfo.text}
          </span>
        </div>

        {/* Line 2: 交辦人→承接人 + 期間 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'var(--text-muted)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dirLabel}
          </span>
          <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {fmtDate(d.start_date)}~{fmtDate(d.due_date)}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            padding: '8px 10px',
            background: 'var(--bg-inset)',
            borderLeft: '3px solid var(--accent-blue)',
            borderBottom: '2px solid var(--accent-blue)',
            fontSize: '10px',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', marginBottom: '6px' }}>
            <DLabel>交辦人</DLabel><DValue>{d.issuer_name || '—'}</DValue>
            <DLabel>承接人</DLabel><DValue>{d.assignee_name || '—'}</DValue>
            <DLabel>項目</DLabel><DValue style={{ fontWeight: 'bold' }}>{d.title}</DValue>
            <DLabel>起始</DLabel><DValue>{d.start_date}</DValue>
            <DLabel>結束</DLabel>
            <DValue style={{ color: overdue ? 'var(--accent-red)' : undefined, fontWeight: overdue ? 'bold' : 'normal' }}>
              {d.due_date} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(共 {totalDays} 天)</span>
            </DValue>
            <DLabel>優先度</DLabel>
            <DValue>
              <span style={{ color: priorityBadge?.color || 'var(--text-primary)', fontWeight: 'bold' }}>
                {d.priority === 'urgent' ? '🔴 緊急' : d.priority === 'high' ? '🟠 重要' : '⚪ 普通'}
              </span>
            </DValue>
            <DLabel>狀態</DLabel>
            <DValue><span style={{ color: statusInfo.color, fontWeight: 'bold' }}>{statusInfo.text}</span></DValue>
            <DLabel>建立</DLabel><DValue style={{ color: 'var(--text-muted)' }}>{fmtDateTime(d.created_at)}</DValue>
            {d.completed_at && (
              <>
                <DLabel>完成於</DLabel>
                <DValue style={{ color: 'var(--accent-green)' }}>{fmtDateTime(d.completed_at)}</DValue>
              </>
            )}
          </div>

          {d.description && (
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '2px' }}>內容說明</div>
              <div style={{ padding: '5px 7px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                {d.description}
              </div>
            </div>
          )}

          {d.completed_note && (
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '2px' }}>完成備註</div>
              <div style={{ padding: '5px 7px', background: 'var(--bg-window)', border: '1px solid var(--accent-green)', whiteSpace: 'pre-wrap', color: 'var(--accent-green)' }}>
                ✓ {d.completed_note}
              </div>
            </div>
          )}

          {/* Action buttons — 依角色顯示 */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            {iAmAssignee && d.status === 'pending' && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkDone() }}
                style={{ fontSize: '10px', padding: '3px 10px', border: '1px solid var(--accent-green)', background: 'var(--bg-window)', color: 'var(--accent-green)', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}
                title="標記完成（會通知交辦人）"
              >
                ✓ 標記完成
              </button>
            )}
            {iAmIssuer && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                style={{ fontSize: '10px', padding: '3px 10px', border: '1px solid var(--accent-red)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', fontFamily: 'monospace' }}
                title="刪除此交辦事項"
              >
                × 刪除
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function DLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{children}</div>
}
function DValue({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word', ...style }}>{children}</div>
}
