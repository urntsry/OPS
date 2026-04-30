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

type TabKey = 'received' | 'issued'

export default function DelegatedPanel({ userId, userRole, userName, onCreateRequest }: Props) {
  const [received, setReceived] = useState<Delegation[]>([])
  const [issued, setIssued] = useState<Delegation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('received')

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

  useEffect(() => {
    refresh()
  }, [refresh])

  // Realtime
  useEffect(() => {
    if (!userId) return
    const unsub = subscribeDelegations(() => { refresh() })
    return unsub
  }, [userId, refresh])

  // Auto-tab switch: 如果有承接但沒交辦過 → 預設我承接的；反之亦然
  useEffect(() => {
    if (received.length > 0 && issued.length === 0) setActiveTab('received')
    else if (received.length === 0 && issued.length > 0 && isIssuer) setActiveTab('issued')
  }, [received.length, issued.length, isIssuer])

  const list = activeTab === 'received' ? received : issued
  const title = userName ? `${userName} 的交辦看板` : '交辦看板'

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
        <span>📋 DELEGATED · 交辦事項</span>
        {isIssuer && onCreateRequest && (
          <button
            onClick={onCreateRequest}
            title={title}
            style={{ padding: '0 6px', fontSize: '10px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', height: '16px' }}
          >
            + 新增
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-mid-dark)', background: 'var(--bg-inset)' }}>
        <TabButton
          active={activeTab === 'received'}
          onClick={() => setActiveTab('received')}
          label={`我承接的 (${received.length})`}
        />
        {isIssuer && (
          <TabButton
            active={activeTab === 'issued'}
            onClick={() => setActiveTab('issued')}
            label={`我交辦的 (${issued.length})`}
          />
        )}
      </div>

      {/* Table — 清單視圖 */}
      <div style={{ maxHeight: '220px', overflowY: 'auto', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)' }}>載入中...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)' }}>
            {activeTab === 'received' ? '目前沒有承接的交辦事項' : '尚未交辦任何事項'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '9px', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--bg-inset)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={th}>交辦人</th>
                <th style={th}>承接人</th>
                <th style={{ ...th, textAlign: 'left' }}>項目</th>
                <th style={th}>起</th>
                <th style={th}>訖</th>
                <th style={th}>狀態</th>
                <th style={th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map(d => (
                <DelegationRow
                  key={d.id}
                  delegation={d}
                  onMarkDone={activeTab === 'received' ? () => handleMarkDone(d.id) : undefined}
                  onDelete={activeTab === 'issued' ? () => handleDelete(d.id) : undefined}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// =============================================================
const th: React.CSSProperties = {
  padding: '3px 4px',
  fontSize: '9px',
  fontWeight: 'bold',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-mid-dark)',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  background: 'var(--bg-inset)',
}

const td: React.CSSProperties = {
  padding: '3px 4px',
  fontSize: '10px',
  borderBottom: '1px solid var(--table-border)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: 'var(--text-primary)',
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '4px 6px',
        fontSize: '10px',
        fontFamily: 'monospace',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
        background: active ? 'var(--bg-window)' : 'transparent',
        color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
        fontWeight: active ? 'bold' : 'normal',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

// =============================================================
function DelegationRow({
  delegation: d, onMarkDone, onDelete,
}: {
  delegation: Delegation
  onMarkDone?: () => void
  onDelete?: () => void
}) {
  const overdue = isOverdue(d)
  const daysLeft = daysUntilDue(d)

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

  return (
    <tr
      className="eventlist-row"
      style={{
        background: overdue ? 'rgba(178,34,34,0.06)' : 'transparent',
      }}
      title={d.description || d.title}
    >
      <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>{d.issuer_name || '—'}</td>
      <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>{d.assignee_name || '—'}</td>
      <td style={{ ...td, fontWeight: 'bold' }}>
        {priorityBadge && (
          <span style={{ display: 'inline-block', fontSize: '8px', padding: '0 3px', marginRight: '3px', background: priorityBadge.color, color: '#FFF', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {priorityBadge.text}
          </span>
        )}
        {d.title}
      </td>
      <td style={{ ...td, textAlign: 'center' }}>{fmtDate(d.start_date)}</td>
      <td style={{ ...td, textAlign: 'center', color: overdue ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: overdue ? 'bold' : 'normal' }}>{fmtDate(d.due_date)}</td>
      <td style={{ ...td, textAlign: 'center', color: statusInfo.color, fontWeight: 'bold' }}>{statusInfo.text}</td>
      <td style={{ ...td, textAlign: 'center' }}>
        {onMarkDone && (
          <button
            onClick={onMarkDone}
            style={{ fontSize: '9px', padding: '1px 4px', border: '1px solid var(--accent-green)', background: 'var(--bg-window)', color: 'var(--accent-green)', cursor: 'pointer', fontFamily: 'monospace' }}
            title="標記完成（會通知交辦人）"
          >
            ✓
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            style={{ fontSize: '9px', padding: '1px 4px', border: '1px solid var(--accent-red)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', fontFamily: 'monospace' }}
            title="刪除"
          >
            ×
          </button>
        )}
      </td>
    </tr>
  )
}
