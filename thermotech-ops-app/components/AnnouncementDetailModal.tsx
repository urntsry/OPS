'use client'

interface AnnouncementDetailModalProps {
  isOpen: boolean
  onClose: () => void
  announcement: {
    id?: string
    title: string
    content: string
    postedBy: string
    postedAt: string
    images?: string[]
    links?: string[]
    attachments?: Array<{ name: string; url: string; type: string }>
    requireAck?: boolean
    acked?: boolean
  } | null
  zIndex?: number
  position?: { x: number; y: number }
  /** 按下「我已詳閱」時呼叫 */
  onAck?: (id: string) => void
}

export default function AnnouncementDetailModal({
  isOpen, onClose, announcement, zIndex = 1001, position = { x: 140, y: 140 }, onAck
}: AnnouncementDetailModalProps) {
  if (!isOpen || !announcement) return null

  const needsAck = !!announcement.requireAck && !announcement.acked

  const attachments = announcement.attachments || []
  const hasAttachments = attachments.length > 0
  const hasLinks = announcement.links && announcement.links.length > 0

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: zIndex - 1 }} onClick={onClose} />

      <div className="window" style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '480px', maxHeight: '80vh', overflow: 'auto', zIndex, fontFamily: 'monospace', fontSize: '10px' }} onClick={e => e.stopPropagation()}>
        <div className="titlebar" style={{ padding: '2px 6px', fontSize: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>公告</span>
          <button onClick={onClose} style={{ background: 'var(--bg-window)', border: '1px solid var(--border-dark)', color: 'var(--accent-red)', fontSize: '10px', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold', outline: 'none' }}>×</button>
        </div>

        <div style={{ padding: '8px', background: 'var(--bg-window)' }}>
          {/* Title + meta */}
          <div className="outset" style={{ padding: '6px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>{announcement.title}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              {announcement.postedAt && <span>發布: {announcement.postedAt}</span>}
              {announcement.postedBy && <span> | {announcement.postedBy}</span>}
            </div>
          </div>

          {/* Content */}
          {announcement.content && (
            <div className="inset" style={{ padding: '8px', marginBottom: '6px', background: 'var(--bg-inset)', minHeight: '60px', whiteSpace: 'pre-wrap', fontSize: '10px', lineHeight: 1.4 }}>
              {announcement.content}
            </div>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
              <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
                附件 ({attachments.length})
              </div>
              <div style={{ padding: '4px', background: 'var(--bg-inset)' }}>
                {attachments.map((att, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 4px', borderBottom: idx < attachments.length - 1 ? '1px solid var(--table-border)' : 'none' }}>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 'bold', minWidth: '28px' }}>
                      {att.type?.toUpperCase() || 'FILE'}
                    </span>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }}>
                      {att.name}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy links */}
          {hasLinks && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '2px' }}>連結</div>
              {announcement.links!.map((link, idx) => (
                <div key={idx}>
                  <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', fontSize: '9px' }}>
                    {link}
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Ack confirmation */}
          {announcement.requireAck && (
            announcement.acked ? (
              <div style={{ padding: '3px 6px', marginBottom: '6px', fontSize: '9px', color: 'var(--accent-teal)', background: 'var(--bg-inset)', border: '1px solid var(--border-mid-dark)' }}>
                已確認詳閱
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '6px' }}>
                <button
                  className="btn"
                  onClick={() => { if (announcement.id) onAck?.(announcement.id) }}
                  style={{ fontSize: '9px', padding: '3px 12px', fontWeight: 'bold', background: '#005FAF', color: '#FFF', border: '1px solid #003F7F', cursor: 'pointer' }}
                >
                  確認已閱
                </button>
              </div>
            )
          )}

          {/* Close */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose} disabled={needsAck} title={needsAck ? '請先確認已詳閱' : ''} style={{ fontSize: '9px', padding: '3px 14px', opacity: needsAck ? 0.5 : 1, cursor: needsAck ? 'not-allowed' : 'pointer' }}>關閉</button>
          </div>
        </div>
      </div>
    </>
  )
}
