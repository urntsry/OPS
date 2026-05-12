'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllBulletins, createBulletin, updateBulletin, deleteBulletin, uploadBulletinFile, type Bulletin, type Attachment } from '@/lib/bulletinApi'

interface AnnouncementManagementPageProps {
  isAdmin?: boolean
}

export default function AnnouncementManagementPage({ isAdmin = false }: AnnouncementManagementPageProps) {
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingBulletin, setEditingBulletin] = useState<Partial<Bulletin> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllBulletins()
      setBulletins(data)
    } catch (e) {
      console.error('Failed to load bulletins:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = filterStatus === 'all' ? bulletins : bulletins.filter(b => b.status === filterStatus)

  const stats = {
    total: bulletins.length,
    draft: bulletins.filter(b => b.status === 'draft').length,
    pending: bulletins.filter(b => b.status === 'pending').length,
    published: bulletins.filter(b => b.status === 'published').length,
    rejected: bulletins.filter(b => b.status === 'rejected').length,
  }

  const handleNew = () => {
    setEditingBulletin({
      title: '',
      content: '',
      bulletin_type: 'notice',
      priority: 'normal',
      status: 'draft',
      attachments: [],
    })
    setIsNew(true)
  }

  const handleSave = async (asDraft: boolean) => {
    if (!editingBulletin?.title?.trim()) { alert('請輸入標題'); return }
    try {
      if (isNew) {
        await createBulletin({
          ...editingBulletin,
          status: asDraft ? 'draft' : 'pending',
        } as any)
      } else {
        await updateBulletin(editingBulletin.id!, {
          title: editingBulletin.title,
          content: editingBulletin.content,
          bulletin_type: editingBulletin.bulletin_type,
          priority: editingBulletin.priority,
          event_date: editingBulletin.event_date,
          attachments: editingBulletin.attachments,
          status: asDraft ? 'draft' : 'pending',
        } as any)
      }
      setEditingBulletin(null)
      setIsNew(false)
      setToast(asDraft ? 'Draft saved' : 'Submitted for review')
      loadData()
    } catch (e) {
      alert('儲存失敗')
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return
    try {
      await deleteBulletin(id)
      loadData()
      setToast('Deleted')
    } catch { alert('刪除失敗') }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingBulletin) return
    try {
      const att = await uploadBulletinFile(file)
      setEditingBulletin({
        ...editingBulletin,
        attachments: [...(editingBulletin.attachments || []), att],
      })
    } catch { alert('上傳失敗') }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'draft': return 'var(--text-muted)'
      case 'pending': return 'var(--status-warning)'
      case 'published': return 'var(--status-success)'
      case 'rejected': return 'var(--status-error)'
      case 'approved': return 'var(--accent-teal)'
      default: return 'var(--text-primary)'
    }
  }

  // Editing modal
  if (editingBulletin) {
    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
          <button className="btn" onClick={() => { setEditingBulletin(null); setIsNew(false) }} style={{ fontSize: '9px', padding: '1px 6px' }}>← BACK</button>
          <span style={{ fontWeight: 'bold' }}>{isNew ? 'NEW BULLETIN' : 'EDIT BULLETIN'}</span>
        </div>

        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>DETAILS</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
            <div style={{ marginBottom: '4px' }}>
              <label style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>TITLE</label>
              <input value={editingBulletin.title || ''} onChange={e => setEditingBulletin({ ...editingBulletin, title: e.target.value })} style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>TYPE</label>
                <select value={editingBulletin.bulletin_type || 'notice'} onChange={e => setEditingBulletin({ ...editingBulletin, bulletin_type: e.target.value as any })} style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}>
                  <option value="notice">NOTICE (公告)</option>
                  <option value="public">PUBLIC (公共事項)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PRIORITY</label>
                <select value={editingBulletin.priority || 'normal'} onChange={e => setEditingBulletin({ ...editingBulletin, priority: e.target.value as any })} style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}>
                  <option value="normal">NORMAL</option>
                  <option value="important">IMPORTANT</option>
                  <option value="urgent">URGENT</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>EVENT DATE</label>
                <input type="date" value={editingBulletin.event_date || ''} onChange={e => setEditingBulletin({ ...editingBulletin, event_date: e.target.value || undefined })} style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }} />
              </div>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <label style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>CONTENT</label>
              <textarea value={editingBulletin.content || ''} onChange={e => setEditingBulletin({ ...editingBulletin, content: e.target.value })} rows={6} style={{ width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', resize: 'vertical', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '4px' }}>
              <label style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>ATTACHMENTS</label>
              {(editingBulletin.attachments || []).map((att, idx) => (
                <div key={idx} style={{ fontSize: '9px', display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '2px' }}>
                  <span>{att.name}</span>
                  <button onClick={() => setEditingBulletin({ ...editingBulletin, attachments: (editingBulletin.attachments || []).filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '9px' }}>×</button>
                </div>
              ))}
              <input type="file" onChange={handleFileUpload} style={{ fontSize: '9px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn" onClick={() => handleSave(true)} style={{ fontSize: '9px', padding: '2px 10px' }}>SAVE DRAFT</button>
          <button className="btn" onClick={() => handleSave(false)} style={{ fontSize: '9px', padding: '2px 10px', fontWeight: 'bold' }}>SUBMIT FOR REVIEW</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{toast}</span>
          <span onClick={() => setToast(null)} style={{ cursor: 'pointer' }}>×</span>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '9px', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>TOTAL:{stats.total}</span>
        <span style={{ color: statusColor('draft') }}>DRAFT:{stats.draft}</span>
        <span style={{ color: statusColor('pending') }}>PENDING:{stats.pending}</span>
        <span style={{ color: statusColor('published') }}>PUBLISHED:{stats.published}</span>
        {stats.rejected > 0 && <span style={{ color: statusColor('rejected') }}>REJECTED:{stats.rejected}</span>}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={handleNew} style={{ fontSize: '9px', padding: '1px 8px', fontWeight: 'bold' }}>+ NEW</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
        {['all', 'draft', 'pending', 'published', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '2px 8px', fontSize: '8px', fontFamily: 'monospace', fontWeight: filterStatus === s ? 'bold' : 'normal', cursor: 'pointer', outline: 'none',
            backgroundColor: filterStatus === s ? 'var(--active-bg)' : 'var(--bg-window)', color: filterStatus === s ? '#FFF' : 'var(--text-primary)',
            border: '1px solid var(--border-mid-dark)',
          }}>{s.toUpperCase()}</button>
        ))}
      </div>

      {/* List */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '400px' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>- NO BULLETINS -</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '55px' }}>STATUS</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '45px' }}>TYPE</th>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>TITLE</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '65px' }}>DATE</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '70px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                  <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                    <span style={{ color: statusColor(b.status), fontWeight: 'bold', fontSize: '8px' }}>{b.status.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px' }}>{b.bulletin_type === 'public' ? 'PUB' : 'NTC'}</td>
                  <td style={{ padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.priority === 'urgent' ? '[!] ' : b.priority === 'important' ? '[*] ' : ''}{b.title}
                    {(b.attachments?.length || 0) > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '8px' }}> [{b.attachments.length}F]</span>}
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px', color: 'var(--text-muted)' }}>{b.event_date || '-'}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                    {(b.status === 'draft' || b.status === 'rejected') && (
                      <>
                        <button onClick={() => { setEditingBulletin(b); setIsNew(false) }} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', cursor: 'pointer', padding: '0 3px', marginRight: '2px' }}>E</button>
                        <button onClick={() => handleDelete(b.id)} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 3px' }}>×</button>
                      </>
                    )}
                    {b.status === 'published' && (
                      <button onClick={() => handleDelete(b.id)} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 3px' }}>×</button>
                    )}
                    {b.status === 'pending' && <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>WAIT</span>}
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
