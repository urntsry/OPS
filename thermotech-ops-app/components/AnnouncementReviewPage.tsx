'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPendingBulletins, updateBulletin, type Bulletin } from '@/lib/bulletinApi'

export default function AnnouncementReviewPage() {
  const [pending, setPending] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPendingBulletins()
      setPending(data)
    } catch (e) {
      console.error('Failed to load pending:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleApprove = async (bulletin: Bulletin, publishNow: boolean) => {
    try {
      await updateBulletin(bulletin.id, { status: publishNow ? 'published' : 'approved' } as any)
      setSelectedBulletin(null)
      setToast(publishNow ? `「${bulletin.title}」已核准並發布` : `「${bulletin.title}」已核准`)
      loadData()
    } catch { alert('操作失敗') }
  }

  const handleReject = async () => {
    if (!selectedBulletin || !rejectReason.trim()) { alert('請輸入駁回原因'); return }
    try {
      await updateBulletin(selectedBulletin.id, { status: 'rejected' } as any)
      setSelectedBulletin(null)
      setShowReject(false)
      setRejectReason('')
      setToast(`「${selectedBulletin.title}」已駁回`)
      loadData()
    } catch { alert('操作失敗') }
  }

  // Detail view
  if (selectedBulletin) {
    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
          <button className="btn" onClick={() => { setSelectedBulletin(null); setShowReject(false) }} style={{ fontSize: '9px', padding: '1px 6px' }}>← BACK</button>
          <span style={{ fontWeight: 'bold', flex: 1 }}>REVIEW: {selectedBulletin.title}</span>
        </div>

        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>BULLETIN DETAILS</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
            <table style={{ fontSize: '9px', fontFamily: 'monospace', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold', color: 'var(--text-muted)' }}>TYPE</td><td>{selectedBulletin.bulletin_type === 'public' ? 'PUBLIC' : 'NOTICE'}</td></tr>
                <tr><td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold', color: 'var(--text-muted)' }}>PRIORITY</td><td>{selectedBulletin.priority.toUpperCase()}</td></tr>
                <tr><td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold', color: 'var(--text-muted)' }}>DATE</td><td>{selectedBulletin.event_date || '-'}</td></tr>
                <tr><td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold', color: 'var(--text-muted)' }}>DEPT</td><td>{selectedBulletin.department || '-'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>CONTENT</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)', fontSize: '9px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', minHeight: '60px', lineHeight: 1.4 }}>
            {selectedBulletin.content || '(no content)'}
          </div>
        </div>

        {(selectedBulletin.attachments?.length || 0) > 0 && (
          <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
            <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>ATTACHMENTS ({selectedBulletin.attachments.length})</div>
            <div style={{ padding: '4px', background: 'var(--bg-inset)' }}>
              {selectedBulletin.attachments.map((att, idx) => (
                <div key={idx} style={{ fontSize: '9px', marginBottom: '2px' }}>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>{att.name}</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reject dialog */}
        {showReject ? (
          <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
            <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>REJECT REASON</div>
            <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="請輸入駁回原因..." style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', resize: 'vertical', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', marginBottom: '4px', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn" onClick={handleReject} style={{ fontSize: '9px', padding: '2px 10px', color: 'var(--accent-red)', fontWeight: 'bold' }}>CONFIRM REJECT</button>
                <button className="btn" onClick={() => { setShowReject(false); setRejectReason('') }} style={{ fontSize: '9px', padding: '2px 10px' }}>CANCEL</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn" onClick={() => handleApprove(selectedBulletin, false)} style={{ fontSize: '9px', padding: '2px 10px' }}>APPROVE</button>
            <button className="btn" onClick={() => handleApprove(selectedBulletin, true)} style={{ fontSize: '9px', padding: '2px 10px', fontWeight: 'bold', color: 'var(--status-success)' }}>APPROVE & PUBLISH</button>
            <button className="btn" onClick={() => setShowReject(true)} style={{ fontSize: '9px', padding: '2px 10px', color: 'var(--accent-red)' }}>REJECT</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {toast && (
        <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{toast}</span>
          <span onClick={() => setToast(null)} style={{ cursor: 'pointer' }}>×</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '9px' }}>PENDING REVIEW</span>
        <span style={{ background: 'var(--status-warning)', color: '#FFF', padding: '0 5px', fontSize: '9px', fontWeight: 'bold', borderRadius: '2px' }}>{pending.length}</span>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={loadData} style={{ fontSize: '9px', padding: '1px 6px' }}>RELOAD</button>
      </div>

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>
        ) : pending.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>- NO PENDING ITEMS -</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '40px' }}>TYPE</th>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>TITLE</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '60px' }}>PRIORITY</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '90px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(b => (
                <tr key={b.id} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)', cursor: 'pointer' }} onClick={() => setSelectedBulletin(b)}>
                  <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px' }}>{b.bulletin_type === 'public' ? 'PUB' : 'NTC'}</td>
                  <td style={{ padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px', color: b.priority === 'urgent' ? 'var(--status-error)' : b.priority === 'important' ? 'var(--status-warning)' : 'var(--text-muted)' }}>{b.priority.toUpperCase()}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleApprove(b, true)} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--status-success)', cursor: 'pointer', padding: '0 3px', marginRight: '2px', fontWeight: 'bold' }}>OK</button>
                    <button onClick={() => { setSelectedBulletin(b); setShowReject(true) }} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 3px' }}>NO</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
