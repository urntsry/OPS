'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getMyNotifications, getUnreadCount, markRead, markAllRead, subscribeNotifications,
  type Notification,
} from '@/lib/notifications'

interface Props {
  userId: string
  open: boolean
  onClose: () => void
  onOpenLink?: (link: string) => void
}

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  meeting: { label: '會議', icon: '◎', color: '#005FAF' },
  meeting_helper: { label: '協助', icon: '◇', color: '#A06000' },
  meeting_reminder: { label: '提醒', icon: '!', color: '#A00000' },
  visit: { label: '客訪', icon: '◐', color: '#006080' },
  fax: { label: '傳真', icon: '✉', color: '#B06000' },
  birthday: { label: '生日', icon: '★', color: '#A00080' },
  system: { label: '系統', icon: '■', color: '#404040' },
}

function getTypeMeta(type: string) {
  return TYPE_META[type] || { label: type, icon: '●', color: '#606060' }
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diff = Math.floor((now - t) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`
  return new Date(iso).toLocaleDateString('zh-TW')
}

export default function NotificationCenter({ userId, open, onClose, onOpenLink }: Props) {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await getMyNotifications(userId, 50)
      setItems(data)
    } catch (e) {
      console.error('[NotificationCenter] load failed:', e)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (panelRef.current && !panelRef.current.contains(target) && !target.closest('[data-bell-btn]')) {
        onClose()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const handleClick = async (n: Notification) => {
    if (!n.read_at) {
      await markRead(n.id).catch(() => { /* ignore */ })
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    }
    if (n.link && onOpenLink) {
      onOpenLink(n.link)
      onClose()
    }
  }

  const handleMarkAllRead = async () => {
    await markAllRead(userId).catch(() => { /* ignore */ })
    setItems(prev => prev.map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
  }

  const unreadCount = items.filter(n => !n.read_at).length

  if (!open) return null

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        right: 6,
        bottom: 32,
        zIndex: 10001,
        width: '340px',
        maxHeight: '480px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        backgroundColor: 'var(--bg-window)',
        borderTop: '2px solid var(--border-light)',
        borderLeft: '2px solid var(--border-light)',
        borderRight: '2px solid var(--border-dark)',
        borderBottom: '2px solid var(--border-dark)',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="titlebar" style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>通知中心 {unreadCount > 0 && `(${unreadCount})`}</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{ fontSize: '9px', background: 'transparent', color: '#FFF', border: '1px solid rgba(255,255,255,0.3)', padding: '1px 5px', cursor: 'pointer', fontFamily: 'monospace' }}
            >全部已讀</button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>×</button>
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, background: 'var(--bg-secondary)' }}>
        {loading && items.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>載入中...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.4 }}>♪</div>
            <div>目前沒有通知</div>
          </div>
        ) : (
          items.map(n => {
            const meta = getTypeMeta(n.type)
            const isRead = !!n.read_at
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--border-mid-dark)',
                  cursor: n.link ? 'pointer' : 'default',
                  background: isRead ? 'transparent' : 'rgba(0, 95, 175, 0.08)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0, 95, 175, 0.18)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isRead ? 'transparent' : 'rgba(0, 95, 175, 0.08)' }}
              >
                {/* Type icon */}
                <span style={{
                  flexShrink: 0,
                  width: '22px', height: '22px',
                  background: meta.color, color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 'bold',
                  fontFamily: 'monospace',
                }}>
                  {meta.icon}
                </span>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '8px', color: meta.color, fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {meta.label}
                    </span>
                    {!isRead && <span style={{ width: '6px', height: '6px', background: '#C00000', borderRadius: '50%' }} />}
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {relativeTime(n.scheduled_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: isRead ? 'normal' : 'bold', color: 'var(--text-primary)', marginTop: '1px', wordBreak: 'break-word' }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px', wordBreak: 'break-word', lineHeight: 1.3 }}>
                      {n.body}
                    </div>
                  )}
                  {/* Channel status indicator */}
                  {n.channel_status && Object.keys(n.channel_status).length > 0 && (
                    <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                      {Object.entries(n.channel_status).map(([ch, st]) => (
                        <span
                          key={ch}
                          style={{
                            fontSize: '7px',
                            padding: '0 3px',
                            background: st === 'sent' ? '#D0FFD0' : st === 'failed' ? '#FFD0D0' : '#E8E8E8',
                            color: st === 'sent' ? '#006000' : st === 'failed' ? '#800000' : '#606060',
                            border: `1px solid ${st === 'sent' ? '#008000' : st === 'failed' ? '#C00000' : '#999'}`,
                            fontWeight: 'bold',
                          }}
                          title={`${ch}: ${st}`}
                        >
                          {ch.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '3px 8px', fontSize: '8px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-mid-dark)', textAlign: 'center' }}>
        最近 50 筆通知
      </div>
    </div>
  )
}
