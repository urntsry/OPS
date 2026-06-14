'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAllBulletins, createBulletin, updateBulletin, deleteBulletin, uploadBulletinFile,
  publishBulletinNotifications, getReadsForBulletins,
  type Bulletin, type BulletinAudience, type BulletinRead,
} from '@/lib/bulletinApi'
import { getAllProfiles } from '@/lib/api'

interface ProfileLite { id: string; full_name: string; department: string | null; employee_id: string }

interface AnnouncementManagementPageProps {
  isAdmin?: boolean
  userProfile?: { id?: string; department?: string | null } | null
}

const inputBase: React.CSSProperties = {
  width: '100%', fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px',
  background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box',
}
const labelBase: React.CSSProperties = {
  fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px',
}

export default function AnnouncementManagementPage({ userProfile }: AnnouncementManagementPageProps) {
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingBulletin, setEditingBulletin] = useState<Partial<Bulletin> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [useLine, setUseLine] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [reads, setReads] = useState<BulletinRead[]>([])
  const [statsFor, setStatsFor] = useState<Bulletin | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllBulletins()
      setBulletins(data)
      const ids = data.filter(b => b.status === 'published').map(b => b.id)
      setReads(await getReadsForBulletins(ids))
    } catch (e) {
      console.error('Failed to load bulletins:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { getAllProfiles().then(p => setProfiles((p || []) as any)).catch(() => {}) }, [])

  const departments = useMemo(
    () => Array.from(new Set(profiles.map(p => p.department).filter(Boolean))) as string[],
    [profiles]
  )

  const filtered = filterStatus === 'all' ? bulletins : bulletins.filter(b => b.status === filterStatus)

  const stats = {
    total: bulletins.length,
    draft: bulletins.filter(b => b.status === 'draft').length,
    published: bulletins.filter(b => b.status === 'published').length,
  }

  // 每則公告已讀/已確認人數
  const readStats = useMemo(() => {
    const map: Record<string, { read: number; ack: number }> = {}
    for (const r of reads) {
      if (!map[r.bulletin_id]) map[r.bulletin_id] = { read: 0, ack: 0 }
      map[r.bulletin_id].read++
      if (r.acked_at) map[r.bulletin_id].ack++
    }
    return map
  }, [reads])

  const handleNew = () => {
    setEditingBulletin({
      title: '', content: '', bulletin_type: 'notice', priority: 'normal', status: 'draft',
      attachments: [], pinned: false, require_ack: false, audience: 'all',
      audience_departments: [], audience_user_ids: [],
    })
    setUseLine(false)
    setIsNew(true)
  }

  const handleSave = async (mode: 'draft' | 'publish') => {
    if (!editingBulletin?.title?.trim()) { alert('請輸入標題'); return }
    setPublishing(true)
    try {
      const base = {
        title: editingBulletin.title,
        content: editingBulletin.content,
        bulletin_type: editingBulletin.bulletin_type,
        priority: editingBulletin.priority,
        event_date: editingBulletin.event_date,
        attachments: editingBulletin.attachments || [],
        pinned: !!editingBulletin.pinned,
        require_ack: !!editingBulletin.require_ack,
        audience: editingBulletin.audience || 'all',
        audience_departments: editingBulletin.audience_departments || [],
        audience_user_ids: editingBulletin.audience_user_ids || [],
        department: userProfile?.department || null,
      }

      let saved: Bulletin
      if (isNew) {
        saved = await createBulletin({
          ...base,
          created_by: userProfile?.id,
          status: mode === 'draft' ? 'draft' : 'published',
          published_at: mode === 'publish' ? new Date().toISOString() : undefined,
        } as any)
      } else {
        saved = await updateBulletin(editingBulletin.id!, {
          ...base,
          status: mode === 'draft' ? 'draft' : 'published',
          ...(mode === 'publish' ? { published_at: new Date().toISOString() } : {}),
        } as any)
      }

      if (mode === 'publish') {
        const n = await publishBulletinNotifications(saved, { useLine, actorId: userProfile?.id })
        if (n === 0) {
          setToast('已發布（無通知對象）')
        } else {
          setToast(`已發布並通知 ${n} 人${useLine ? '（含 LINE）' : ''}`)
        }
      } else {
        setToast('草稿已儲存')
      }
      setEditingBulletin(null)
      setIsNew(false)
      loadData()
    } catch (e) {
      alert('儲存失敗')
      console.error(e)
    }
    setPublishing(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return
    try {
      await deleteBulletin(id)
      loadData()
      setToast('已刪除')
    } catch { alert('刪除失敗') }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingBulletin) return
    try {
      const att = await uploadBulletinFile(file)
      setEditingBulletin({ ...editingBulletin, attachments: [...(editingBulletin.attachments || []), att] })
    } catch { alert('上傳失敗') }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'draft': return 'var(--text-muted)'
      case 'published': return 'var(--status-success)'
      case 'pending': return 'var(--status-warning)'
      case 'rejected': return 'var(--status-error)'
      default: return 'var(--text-primary)'
    }
  }

  const toggleDept = (d: string) => {
    if (!editingBulletin) return
    const cur = editingBulletin.audience_departments || []
    setEditingBulletin({ ...editingBulletin, audience_departments: cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d] })
  }
  const toggleUser = (uid: string) => {
    if (!editingBulletin) return
    const cur = editingBulletin.audience_user_ids || []
    setEditingBulletin({ ...editingBulletin, audience_user_ids: cur.includes(uid) ? cur.filter(x => x !== uid) : [...cur, uid] })
  }

  // ---------- 已讀統計視圖 ----------
  if (statsFor) {
    const readSet = new Set(reads.filter(r => r.bulletin_id === statsFor.id).map(r => r.user_id))
    const ackSet = new Set(reads.filter(r => r.bulletin_id === statsFor.id && r.acked_at).map(r => r.user_id))
    // 目標對象
    const targets = (statsFor.audience === 'custom')
      ? profiles.filter(p => (statsFor.audience_user_ids || []).includes(p.id))
      : (statsFor.audience === 'department')
        ? profiles.filter(p => p.department && (statsFor.audience_departments || []).includes(p.department))
        : profiles
    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
          <button className="btn" onClick={() => setStatsFor(null)} style={{ fontSize: '9px', padding: '1px 6px' }}>← BACK</button>
          <span style={{ fontWeight: 'bold', flex: 1 }}>已讀統計: {statsFor.title}</span>
        </div>
        <div style={{ fontSize: '9px', marginBottom: '6px', display: 'flex', gap: '12px' }}>
          <span>目標 {targets.length} 人</span>
          <span style={{ color: 'var(--status-success)' }}>已讀 {readSet.size}</span>
          {statsFor.require_ack && <span style={{ color: 'var(--accent-teal)' }}>已確認 {ackSet.size}</span>}
          <span style={{ color: 'var(--text-muted)' }}>未讀 {targets.length - readSet.size}</span>
        </div>
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '360px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
            <tbody>
              {targets.map(p => {
                const r = readSet.has(p.id), a = ackSet.has(p.id)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--table-border)' }}>
                    <td style={{ padding: '2px 4px', width: '50px', color: 'var(--text-muted)' }}>{p.employee_id}</td>
                    <td style={{ padding: '2px 4px' }}>{p.full_name}</td>
                    <td style={{ padding: '2px 4px', width: '50px', color: 'var(--text-muted)' }}>{p.department || '-'}</td>
                    <td style={{ padding: '2px 4px', width: '70px', textAlign: 'right', color: a ? 'var(--accent-teal)' : r ? 'var(--status-success)' : 'var(--text-muted)' }}>
                      {statsFor.require_ack ? (a ? '✔已確認' : r ? '已讀' : '— 未讀') : (r ? '已讀' : '— 未讀')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ---------- 編輯 / 新增視圖 ----------
  if (editingBulletin) {
    const aud = editingBulletin.audience || 'all'
    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
          <button className="btn" onClick={() => { setEditingBulletin(null); setIsNew(false) }} style={{ fontSize: '9px', padding: '1px 6px' }}>← BACK</button>
          <span style={{ fontWeight: 'bold' }}>{isNew ? '新增公告' : '編輯公告'}</span>
        </div>

        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>DETAILS</div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
            <div style={{ marginBottom: '4px' }}>
              <label style={labelBase}>標題</label>
              <input value={editingBulletin.title || ''} onChange={e => setEditingBulletin({ ...editingBulletin, title: e.target.value })} style={inputBase} />
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelBase}>類型</label>
                <select value={editingBulletin.bulletin_type || 'notice'} onChange={e => setEditingBulletin({ ...editingBulletin, bulletin_type: e.target.value as any })} style={inputBase}>
                  <option value="notice">NOTICE (公告)</option>
                  <option value="public">PUBLIC (公共事項)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelBase}>重要性</label>
                <select value={editingBulletin.priority || 'normal'} onChange={e => setEditingBulletin({ ...editingBulletin, priority: e.target.value as any })} style={inputBase}>
                  <option value="normal">一般</option>
                  <option value="important">重要</option>
                  <option value="urgent">緊急</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelBase}>活動日期</label>
                <input type="date" value={editingBulletin.event_date || ''} onChange={e => setEditingBulletin({ ...editingBulletin, event_date: e.target.value || undefined })} style={inputBase} />
              </div>
            </div>

            {/* 置頂 + 已讀確認 */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '6px', fontSize: '9px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!editingBulletin.pinned} onChange={e => setEditingBulletin({ ...editingBulletin, pinned: e.target.checked })} />
                📌 置頂（登入時提醒）
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!editingBulletin.require_ack} onChange={e => setEditingBulletin({ ...editingBulletin, require_ack: e.target.checked })} />
                ✔ 需員工確認已詳閱
              </label>
            </div>

            {/* 發布對象 */}
            <div style={{ marginBottom: '4px' }}>
              <label style={labelBase}>發布對象</label>
              <select value={aud} onChange={e => setEditingBulletin({ ...editingBulletin, audience: e.target.value as BulletinAudience })} style={inputBase}>
                <option value="all">全員</option>
                <option value="department">指定部門</option>
                <option value="custom">指定人員</option>
              </select>
            </div>

            {aud === 'department' && (
              <div style={{ marginBottom: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', padding: '4px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)' }}>
                {departments.map(d => (
                  <label key={d} style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={(editingBulletin.audience_departments || []).includes(d)} onChange={() => toggleDept(d)} />
                    {d}
                  </label>
                ))}
              </div>
            )}

            {aud === 'custom' && (
              <div style={{ marginBottom: '4px', maxHeight: '120px', overflow: 'auto', padding: '4px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)' }}>
                {profiles.map(p => (
                  <label key={p.id} style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '1px 0' }}>
                    <input type="checkbox" checked={(editingBulletin.audience_user_ids || []).includes(p.id)} onChange={() => toggleUser(p.id)} />
                    <span style={{ color: 'var(--text-muted)', minWidth: '44px' }}>{p.employee_id}</span>
                    {p.full_name} <span style={{ color: 'var(--text-muted)' }}>{p.department}</span>
                  </label>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '4px' }}>
              <label style={labelBase}>內容</label>
              <textarea value={editingBulletin.content || ''} onChange={e => setEditingBulletin({ ...editingBulletin, content: e.target.value })} rows={6} style={{ ...inputBase, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '4px' }}>
              <label style={labelBase}>附件</label>
              {(editingBulletin.attachments || []).map((att, idx) => (
                <div key={idx} style={{ fontSize: '9px', display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '2px' }}>
                  <span>{att.name}</span>
                  <button onClick={() => setEditingBulletin({ ...editingBulletin, attachments: (editingBulletin.attachments || []).filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '9px' }}>×</button>
                </div>
              ))}
              <input type="file" onChange={handleFileUpload} style={{ fontSize: '9px' }} />
            </div>

            {/* 通知 LINE */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '9px', marginTop: '4px' }}>
              <input type="checkbox" checked={useLine} onChange={e => setUseLine(e.target.checked)} />
              發布時同時推播 LINE 通知 <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>（未綁定者仍收站內通知）</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn" disabled={publishing} onClick={() => handleSave('draft')} style={{ fontSize: '9px', padding: '2px 10px' }}>儲存草稿</button>
          <button className="btn" disabled={publishing} onClick={() => handleSave('publish')} style={{ fontSize: '9px', padding: '2px 14px', fontWeight: 'bold', background: '#005FAF', color: '#FFF', border: '1px solid #003F7F' }}>
            {publishing ? '發布中...' : '發布'}
          </button>
        </div>
      </div>
    )
  }

  // ---------- 列表視圖 ----------
  return (
    <div>
      {toast && (
        <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{toast}</span>
          <span onClick={() => setToast(null)} style={{ cursor: 'pointer' }}>×</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '9px', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>總計:{stats.total}</span>
        <span style={{ color: statusColor('draft') }}>草稿:{stats.draft}</span>
        <span style={{ color: statusColor('published') }}>已發布:{stats.published}</span>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={handleNew} style={{ fontSize: '9px', padding: '1px 8px', fontWeight: 'bold' }}>+ 新增公告</button>
      </div>

      <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
        {[['all', '全部'], ['draft', '草稿'], ['published', '已發布']].map(([s, lbl]) => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '2px 8px', fontSize: '8px', fontFamily: 'monospace', fontWeight: filterStatus === s ? 'bold' : 'normal', cursor: 'pointer', outline: 'none',
            backgroundColor: filterStatus === s ? 'var(--active-bg)' : 'var(--bg-window)', color: filterStatus === s ? '#FFF' : 'var(--text-primary)',
            border: '1px solid var(--border-mid-dark)',
          }}>{lbl}</button>
        ))}
      </div>

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '400px' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>- 無公告 -</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '50px' }}>狀態</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '38px' }}>類型</th>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>標題</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '70px' }}>已讀</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '88px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const rs = readStats[b.id]
                return (
                  <tr key={b.id} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                    <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                      <span style={{ color: statusColor(b.status), fontWeight: 'bold', fontSize: '8px' }}>{b.status === 'published' ? '已發布' : b.status === 'draft' ? '草稿' : b.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px' }}>{b.bulletin_type === 'public' ? 'PUB' : 'NTC'}</td>
                    <td style={{ padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.pinned ? '📌 ' : ''}{b.priority === 'urgent' ? '🔴 ' : b.priority === 'important' ? '⭐ ' : ''}{b.title}
                      {b.require_ack && <span style={{ color: 'var(--accent-teal)', fontSize: '8px' }}> [需確認]</span>}
                      {(b.attachments?.length || 0) > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '8px' }}> [{b.attachments.length}檔]</span>}
                    </td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '8px', color: 'var(--text-muted)' }}>
                      {b.status === 'published' ? (b.require_ack ? `${rs?.ack || 0}確認` : `${rs?.read || 0}讀`) : '-'}
                    </td>
                    <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                      {b.status === 'published' && (
                        <button onClick={() => setStatsFor(b)} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', cursor: 'pointer', padding: '0 3px', marginRight: '2px' }} title="已讀統計">📊</button>
                      )}
                      <button onClick={() => { setEditingBulletin(b); setUseLine(false); setIsNew(false) }} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', cursor: 'pointer', padding: '0 3px', marginRight: '2px' }} title="編輯">✎</button>
                      <button onClick={() => handleDelete(b.id)} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 3px' }} title="刪除">×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
