'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import {
  getFaxes, getFaxById, updateFax, deleteFax, markFaxHandled,
  searchFaxes, getFaxStats, subscribeFaxUpdates, getFaxFileSignedUrl,
  getDocTypeStyle, DOCUMENT_TYPES,
  type Fax, type OrderItem,
} from '@/lib/faxApi'

interface FaxPageProps {
  isAdmin: boolean
  userProfile: any
}

interface AgentStatus {
  connected: boolean
  age_minutes?: number
  last_heartbeat?: string
  last_uploaded_at?: string
  last_uploaded_file?: string
  last_error?: string
  last_error_at?: string
  watch_folder?: string
  files_in_folder?: number
  files_processed_total?: number
  hostname?: string
  agent_version?: string
  scan_count?: number
  message?: string
}

export default function FaxPage({ isAdmin, userProfile }: FaxPageProps) {
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'no_key' | 'error'>('checking')
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [totalPending, setTotalPending] = useState(0)

  useEffect(() => {
    const checkAi = async () => {
      try {
        const res = await fetch('/api/fax/analyze')
        const d = await res.json()
        setAiStatus(d.ai_available ? 'connected' : 'no_key')
      } catch { setAiStatus('error') }
    }
    const checkAgent = async () => {
      try {
        const res = await fetch('/api/fax/heartbeat')
        const d = await res.json()
        setAgentStatus(d)
      } catch { setAgentStatus({ connected: false, message: 'Cannot reach OPS' }) }
    }
    checkAi()
    checkAgent()
    const interval = setInterval(checkAgent, 30000)
    return () => clearInterval(interval)
  }, [])

  const tabs: DepartmentTab[] = [
    { id: 'inbox', label: 'INBOX', show: true, badge: totalPending > 0 ? totalPending : undefined, component: <InboxTab onPendingChange={setTotalPending} userProfile={userProfile} isAdmin={isAdmin} agentStatus={agentStatus} /> },
    { id: 'upload', label: 'UPLOAD', show: isAdmin, component: <UploadTab /> },
    { id: 'search', label: 'SEARCH', show: true, component: <SearchTab userProfile={userProfile} /> },
    { id: 'stats', label: 'STATS', show: true, component: <StatsTab /> },
  ]

  const aiText = aiStatus === 'connected' ? 'AI:OK' : aiStatus === 'no_key' ? 'AI:NOKEY' : aiStatus === 'error' ? 'AI:ERR' : 'AI:...'
  const agentText = agentStatus === null ? 'AGENT:...' : agentStatus.connected ? `AGENT:OK (${agentStatus.age_minutes}m)` : 'AGENT:OFFLINE'

  return (
    <DepartmentShell
      departmentId="fax"
      departmentName="FAX - 傳真中心"
      tabs={tabs}
      defaultTab="inbox"
      statusInfo={`${agentText} | ${aiText}`}
    />
  )
}

// ============================================
// DOC TYPE BADGE
// ============================================
function DocTypeBadge({ type }: { type: string | null }) {
  const style = getDocTypeStyle(type)
  return (
    <span style={{
      fontSize: '7px', padding: '0 4px', lineHeight: '14px',
      backgroundColor: style.bg, color: style.color,
      fontWeight: 'bold', letterSpacing: '0.3px', whiteSpace: 'nowrap',
      border: `1px solid ${style.color}40`,
    }}>
      {style.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#FF8C00', text: '#FFF' },
    analyzing: { bg: '#000080', text: '#FFF' },
    analyzed: { bg: '#008000', text: '#FFF' },
    error: { bg: '#800000', text: '#FFF' },
  }
  const c = colors[status] || colors.pending
  return (
    <span style={{ fontSize: '7px', padding: '0 3px', backgroundColor: c.bg, color: c.text, fontWeight: 'bold', letterSpacing: '0.5px' }}>
      {status.toUpperCase()}
    </span>
  )
}

function UrgencyBadge({ level }: { level?: string }) {
  if (!level) return null
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: '#C00000', text: '#FFF', label: 'URGENT' },
    medium: { bg: '#B06000', text: '#FFF', label: 'MEDIUM' },
    low: { bg: '#606060', text: '#DDD', label: 'LOW' },
  }
  const s = styles[level] || styles.low
  return (
    <span style={{ fontSize: '7px', padding: '0 3px', backgroundColor: s.bg, color: s.text, fontWeight: 'bold', letterSpacing: '0.3px' }}>
      {s.label}
    </span>
  )
}

// ============================================
// INBOX TAB — Enhanced with handled status & doc type filter
// ============================================
function InboxTab({ onPendingChange, userProfile, isAdmin, agentStatus }: { onPendingChange: (n: number) => void; userProfile: any; isAdmin: boolean; agentStatus: AgentStatus | null }) {
  const [faxes, setFaxes] = useState<Fax[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFax, setSelectedFax] = useState<Fax | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterHandled, setFilterHandled] = useState<string>('unhandled')

  const loadFaxes = useCallback(async () => {
    try {
      const data = await getFaxes(200)
      setFaxes(data)
      const unhandled = data.filter(f => !f.is_handled && f.status === 'analyzed').length
      const pending = data.filter(f => f.status === 'pending' || f.status === 'analyzing').length
      onPendingChange(unhandled + pending)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [onPendingChange])

  useEffect(() => {
    loadFaxes()
    const unsub = subscribeFaxUpdates(() => loadFaxes())
    return unsub
  }, [loadFaxes])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此傳真記錄？')) return
    try {
      await deleteFax(id)
      setFaxes(prev => prev.filter(f => f.id !== id))
      if (selectedFax?.id === id) setSelectedFax(null)
      showToast('已刪除')
    } catch { showToast('刪除失敗') }
  }

  const handleToggleHandled = async (fax: Fax, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await markFaxHandled(fax.id, userProfile?.id || '', !fax.is_handled)
      setFaxes(prev => prev.map(f => f.id === fax.id ? updated : f))
      showToast(updated.is_handled ? '已標記處理' : '已取消處理')
    } catch { showToast('更新失敗') }
  }

  const handleReanalyze = async (fax: Fax) => {
    try {
      const res = await fetch('/api/fax/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fax_id: fax.id }),
      })
      if (res.ok) { showToast('重新分析中...'); loadFaxes() }
      else { showToast('分析失敗') }
    } catch { showToast('分析失敗') }
  }

  // Apply filters
  const filteredFaxes = faxes.filter(f => {
    if (filterType !== 'all' && (f.document_type || 'unknown') !== filterType) return false
    if (filterHandled === 'unhandled' && f.is_handled) return false
    if (filterHandled === 'handled' && !f.is_handled) return false
    return true
  })

  const typeOptions = ['all', ...DOCUMENT_TYPES.map(d => d.value)]

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>

  if (selectedFax) {
    return <FaxDetail fax={selectedFax} onBack={() => { setSelectedFax(null); loadFaxes() }} onReanalyze={handleReanalyze} userProfile={userProfile} />
  }

  const unhandledCount = faxes.filter(f => !f.is_handled && f.status === 'analyzed').length
  const analyzingCount = faxes.filter(f => f.status === 'pending' || f.status === 'analyzing').length

  return (
    <div>
      {toast && <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px' }}>{toast}</div>}

      {/* Agent connection status */}
      <AgentStatusBanner status={agentStatus} />

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Total: <b style={{ color: 'var(--text-primary)' }}>{faxes.length}</b></span>
        {unhandledCount > 0 && <span style={{ color: '#C00000', fontWeight: 'bold' }}>UNHANDLED: {unhandledCount}</span>}
        {analyzingCount > 0 && <span style={{ color: '#000080' }}>Analyzing: {analyzingCount}</span>}
        <span>Handled: {faxes.filter(f => f.is_handled).length}</span>
        <div style={{ flex: 1 }} />
        {/* Filters */}
        <select
          value={filterHandled}
          onChange={e => setFilterHandled(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 2px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}
        >
          <option value="all">ALL</option>
          <option value="unhandled">UNHANDLED</option>
          <option value="handled">HANDLED</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ fontSize: '8px', fontFamily: 'monospace', padding: '1px 2px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)' }}
        >
          {typeOptions.map(t => (
            <option key={t} value={t}>{t === 'all' ? 'ALL TYPES' : t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '420px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)' }}>
              <th style={{ ...thStyle, width: '24px', textAlign: 'center' }} title="處理狀態">OK</th>
              <th style={{ ...thStyle, width: '55px' }}>TYPE</th>
              <th style={{ ...thStyle, width: '85px' }}>TIME</th>
              <th style={{ ...thStyle, width: '95px' }}>CUSTOMER</th>
              <th style={thStyle}>SUMMARY</th>
              <th style={{ ...thStyle, width: '55px' }}>CONTACT</th>
              <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>STATUS</th>
              <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>X</th>
            </tr>
          </thead>
          <tbody>
            {filteredFaxes.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {faxes.length === 0 ? '尚無傳真記錄' : '目前篩選條件下無結果'}
              </td></tr>
            ) : filteredFaxes.map(fax => {
              const raw = fax.ai_raw_response
              const isUrgent = raw?.urgency === 'high' && !fax.is_handled
              return (
                <tr
                  key={fax.id}
                  className="eventlist-row"
                  style={{
                    borderBottom: '1px solid var(--table-border)',
                    cursor: 'pointer',
                    background: isUrgent ? '#FFE8E8' : fax.is_handled ? 'transparent' : undefined,
                    opacity: fax.is_handled ? 0.65 : 1,
                  }}
                  onClick={() => setSelectedFax(fax)}
                >
                  <td style={{ padding: '2px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={fax.is_handled}
                      onClick={e => handleToggleHandled(fax, e)}
                      readOnly
                      style={{ cursor: 'pointer', width: '12px', height: '12px' }}
                      title={fax.is_handled ? `已處理 ${fax.handled_at ? new Date(fax.handled_at).toLocaleString('zh-TW') : ''}` : '標記為已處理'}
                    />
                  </td>
                  <td style={{ padding: '2px 3px' }}>
                    <DocTypeBadge type={fax.document_type} />
                  </td>
                  <td style={{ padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)' }}>
                    {new Date(fax.received_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{
                    padding: '2px 4px', fontWeight: fax.customer_name ? 'bold' : 'normal',
                    color: fax.customer_name ? 'var(--text-primary)' : 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {fax.customer_name || '—'}
                  </td>
                  <td style={{
                    padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textDecoration: fax.is_handled ? 'line-through' : 'none',
                  }}>
                    {raw?.summary || fax.file_name}
                  </td>
                  <td style={{ padding: '2px 4px', fontSize: '8px', color: fax.our_contact_user_id ? 'var(--status-success)' : 'var(--text-muted)' }}>
                    {fax.our_contact_person || '—'}
                  </td>
                  <td style={{ padding: '2px', textAlign: 'center' }}>
                    <StatusBadge status={fax.status} />
                  </td>
                  <td style={{ padding: '2px', textAlign: 'center' }}>
                    {isAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(fax.id) }}
                        style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 3px', outline: 'none' }}
                      >×</button>
                    )}
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

const thStyle: React.CSSProperties = {
  padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold',
}

// ============================================
// FAX DETAIL VIEW — Full structured display
// ============================================
function FaxDetail({ fax: initialFax, onBack, onReanalyze, userProfile }: {
  fax: Fax; onBack: () => void; onReanalyze: (f: Fax) => void; userProfile: any
}) {
  const [fax, setFax] = useState(initialFax)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    customer_name: fax.customer_name || '',
    customer_address: fax.customer_address || '',
    customer_contact: fax.customer_contact || '',
    customer_phone: fax.customer_phone || '',
    order_number: fax.order_number || '',
    our_contact_person: fax.our_contact_person || '',
    delivery_date: fax.delivery_date || '',
    total_amount: fax.total_amount || '',
    currency: fax.currency || '',
    special_notes: fax.special_notes || '',
    notes: fax.notes || '',
    document_type: fax.document_type || 'unknown',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (fax.file_url) {
      getFaxFileSignedUrl(fax.file_url).then(url => {
        // Prefer signed URL; fallback to original file_url (in case bucket is still public)
        setSignedUrl(url || fax.file_url)
      }).catch(() => {
        setSignedUrl(fax.file_url)
      })
    } else {
      setSignedUrl(null)
    }
  }, [fax.file_url])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateFax(fax.id, {
        customer_name: editData.customer_name || null,
        customer_address: editData.customer_address || null,
        customer_contact: editData.customer_contact || null,
        customer_phone: editData.customer_phone || null,
        order_number: editData.order_number || null,
        our_contact_person: editData.our_contact_person || null,
        delivery_date: editData.delivery_date || null,
        total_amount: editData.total_amount || null,
        currency: editData.currency || null,
        special_notes: editData.special_notes || null,
        notes: editData.notes || null,
        document_type: editData.document_type || null,
        reviewed_by: userProfile?.id || null,
        reviewed_at: new Date().toISOString(),
      } as any)
      setFax(updated)
      setEditing(false)
      showToast('已儲存')
    } catch { showToast('儲存失敗') }
    setSaving(false)
  }

  const handleToggleHandled = async () => {
    try {
      const updated = await markFaxHandled(fax.id, userProfile?.id || '', !fax.is_handled)
      setFax(updated)
      showToast(updated.is_handled ? '已標記為處理完成' : '已取消處理狀態')
    } catch { showToast('更新失敗') }
  }

  const raw = fax.ai_raw_response
  const fileUrl = signedUrl || fax.file_url

  return (
    <div>
      {toast && <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px' }}>{toast}</div>}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onBack} className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>BACK</button>
        <button onClick={() => setEditing(!editing)} className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>{editing ? 'CANCEL' : 'EDIT'}</button>
        {editing && <button onClick={handleSave} className="btn" disabled={saving} style={{ fontSize: '9px', padding: '2px 8px', fontWeight: 'bold' }}>{saving ? '...' : 'SAVE'}</button>}
        <button onClick={() => onReanalyze(fax)} className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>RE-ANALYZE</button>
        {fileUrl && (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: '9px', padding: '2px 8px', textDecoration: 'none', color: 'var(--text-primary)' }}>
            VIEW FILE
          </a>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleToggleHandled}
          className="btn"
          style={{
            fontSize: '9px', padding: '2px 10px', fontWeight: 'bold',
            background: fax.is_handled ? 'var(--status-success)' : '#C00000',
            color: '#FFF', border: 'none',
          }}
        >
          {fax.is_handled ? 'HANDLED' : 'MARK HANDLED'}
        </button>
        <StatusBadge status={fax.status} />
      </div>

      {/* Handled banner */}
      {fax.is_handled && fax.handled_at && (
        <div style={{ padding: '3px 8px', marginBottom: '4px', background: '#D0FFD0', color: '#006000', fontSize: '8px', border: '1px solid #008000', fontWeight: 'bold' }}>
          HANDLED — {new Date(fax.handled_at).toLocaleString('zh-TW')}
        </div>
      )}

      {/* Error banner */}
      {fax.status === 'error' && fax.notes && (
        <div style={{ padding: '4px 8px', marginBottom: '4px', background: '#FFE0E0', color: '#800000', fontSize: '9px', border: '1px solid #C00000', fontWeight: 'bold' }}>
          ERROR: {fax.notes}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        {/* Left: File preview */}
        <div className="inset" style={{ width: '42%', minHeight: '300px', background: 'var(--bg-inset)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'column' }}>
          {fileUrl ? (
            isImageFile(fax.file_name) ? (
              <img src={fileUrl} alt={fax.file_name} style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>PDF</div>
                <div>{fax.file_name}</div>
                <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', fontSize: '8px' }}>Open in new tab</a>
              </div>
            )
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>No file</div>
          )}
          <div style={{ marginTop: '6px', fontSize: '7px', color: 'var(--text-muted)', textAlign: 'center' }}>
            {fax.file_name} ({fax.file_size ? `${(fax.file_size / 1024).toFixed(1)} KB` : '?'})
          </div>
        </div>

        {/* Right: Analysis data */}
        <div style={{ flex: 1, overflow: 'auto', maxHeight: '450px' }}>
          {/* Document classification */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
            <DocTypeBadge type={fax.document_type} />
            {raw?.urgency && <UrgencyBadge level={raw.urgency} />}
            {fax.ai_confidence != null && (
              <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
                AI Confidence: {Math.round(fax.ai_confidence * 100)}%
              </span>
            )}
          </div>

          {/* AI Summary card */}
          {raw?.summary && (
            <div style={{ padding: '4px 6px', marginBottom: '4px', background: '#FFFFF0', border: '1px solid #CCC060', fontSize: '9px', fontWeight: 'bold', color: '#333' }}>
              {raw.summary}
            </div>
          )}

          {/* Action Required */}
          {raw?.action_required && (
            <div style={{ padding: '3px 6px', marginBottom: '4px', background: '#FFF0F0', border: '1px solid #C00000', fontSize: '8px', color: '#800000' }}>
              Action: {raw.action_required}
            </div>
          )}

          {/* Main info card */}
          <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px', marginBottom: '4px' }}>
            <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>
              EXTRACTED DATA
            </div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ width: '60px', flexShrink: 0, color: 'var(--text-muted)', fontSize: '8px', fontWeight: 'bold' }}>分類</span>
                  <select
                    value={editData.document_type}
                    onChange={e => setEditData(p => ({ ...p, document_type: e.target.value }))}
                    className="inset"
                    style={{ flex: 1, fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  >
                    {DOCUMENT_TYPES.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <FieldRow label="客戶名稱" value={editData.customer_name} onChange={v => setEditData(p => ({ ...p, customer_name: v }))} />
                <FieldRow label="客戶地址" value={editData.customer_address} onChange={v => setEditData(p => ({ ...p, customer_address: v }))} />
                <FieldRow label="聯絡人" value={editData.customer_contact} onChange={v => setEditData(p => ({ ...p, customer_contact: v }))} />
                <FieldRow label="電話" value={editData.customer_phone} onChange={v => setEditData(p => ({ ...p, customer_phone: v }))} />
                <FieldRow label="訂單編號" value={editData.order_number} onChange={v => setEditData(p => ({ ...p, order_number: v }))} />
                <FieldRow label="交期" value={editData.delivery_date} onChange={v => setEditData(p => ({ ...p, delivery_date: v }))} />
                <FieldRow label="金額" value={editData.total_amount} onChange={v => setEditData(p => ({ ...p, total_amount: v }))} />
                <FieldRow label="幣別" value={editData.currency} onChange={v => setEditData(p => ({ ...p, currency: v }))} />
                <FieldRow label="我方窗口" value={editData.our_contact_person} onChange={v => setEditData(p => ({ ...p, our_contact_person: v }))} />
                <FieldRow label="特殊備註" value={editData.special_notes} onChange={v => setEditData(p => ({ ...p, special_notes: v }))} multiline />
                <FieldRow label="內部備註" value={editData.notes} onChange={v => setEditData(p => ({ ...p, notes: v }))} multiline />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px' }}>
                <InfoRow label="客戶名稱" value={fax.customer_name} bold />
                <InfoRow label="客戶地址" value={fax.customer_address} />
                <InfoRow label="聯絡人" value={fax.customer_contact} />
                <InfoRow label="電話" value={fax.customer_phone} />
                <InfoRow label="訂單編號" value={fax.order_number} bold />
                <InfoRow label="交期" value={fax.delivery_date} highlight={!!fax.delivery_date} />
                {(fax.total_amount || fax.currency) && (
                  <InfoRow label="金額" value={`${fax.currency || ''} ${fax.total_amount || ''}`} />
                )}
                <InfoRow label="我方窗口" value={fax.our_contact_person} highlight={!!fax.our_contact_user_id} />
                {fax.special_notes && <InfoRow label="特殊備註" value={fax.special_notes} />}
                {fax.notes && <InfoRow label="內部備註" value={fax.notes} />}
                {raw?.payment_terms && <InfoRow label="付款條件" value={raw.payment_terms} />}
                {fax.reviewed_at && (
                  <InfoRow label="已審閱" value={new Date(fax.reviewed_at).toLocaleString('zh-TW')} />
                )}
              </div>
            )}
          </div>

          {/* Order items */}
          {fax.order_items && fax.order_items.length > 0 && (
            <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>
                ORDER ITEMS ({fax.order_items.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-window)' }}>
                    <th style={{ padding: '2px 3px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '18px' }}>#</th>
                    <th style={{ padding: '2px 3px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>品項</th>
                    <th style={{ padding: '2px 3px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '40px' }}>數量</th>
                    <th style={{ padding: '2px 3px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '35px' }}>單位</th>
                    <th style={{ padding: '2px 3px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>規格/備註</th>
                  </tr>
                </thead>
                <tbody>
                  {fax.order_items.map((item: OrderItem, i: number) => (
                    <tr key={i} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                      <td style={{ padding: '2px 3px', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '2px 3px', fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ padding: '2px 3px', textAlign: 'center' }}>{item.quantity || '—'}</td>
                      <td style={{ padding: '2px 3px' }}>{item.unit || '—'}</td>
                      <td style={{ padding: '2px 3px', fontSize: '7px', color: 'var(--text-muted)' }}>
                        {[item.spec, item.note].filter(Boolean).join(' | ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// UPLOAD TAB
// ============================================
function UploadTab() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<{ name: string; status: 'ok' | 'err'; msg: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    const res: typeof results = []

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('received_at', new Date().toISOString())

        const response = await fetch('/api/fax/upload', { method: 'POST', body: formData })
        const data = await response.json()

        if (data.success) {
          res.push({ name: file.name, status: 'ok', msg: 'Uploaded — AI analyzing...' })
        } else {
          res.push({ name: file.name, status: 'err', msg: data.error || 'Failed' })
        }
      } catch (e: any) {
        res.push({ name: file.name, status: 'err', msg: e.message })
      }
    }

    setResults(res)
    setFiles([])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <div style={{ marginBottom: '6px', fontSize: '9px', color: 'var(--text-muted)' }}>
        手動上傳傳真（測試用或手動匯入）。Watcher Agent 會自動上傳新檔案。
      </div>

      <div className="inset" style={{ padding: '8px', background: 'var(--bg-inset)', marginBottom: '6px' }}>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.tif,.tiff,.jpg,.jpeg,.png,.gif,.webp,.bmp"
          onChange={e => setFiles(Array.from(e.target.files || []))}
          style={{ fontSize: '9px', fontFamily: 'monospace', marginBottom: '6px', display: 'block', width: '100%' }}
        />
        {files.length > 0 && (
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Selected: {files.length} file(s) — {files.map(f => f.name).join(', ')}
          </div>
        )}
        <button onClick={handleUpload} className="btn" disabled={files.length === 0 || uploading} style={{ fontSize: '9px', padding: '3px 12px', fontWeight: 'bold' }}>
          {uploading ? 'UPLOADING...' : `UPLOAD ${files.length > 0 ? `(${files.length})` : ''}`}
        </button>
      </div>

      {results.length > 0 && (
        <div className="inset" style={{ padding: '4px', background: 'var(--bg-inset)' }}>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '3px' }}>RESULTS</div>
          {results.map((r, i) => (
            <div key={i} style={{ fontSize: '8px', padding: '2px 0', borderBottom: '1px solid var(--table-border)', display: 'flex', gap: '6px' }}>
              <span style={{ color: r.status === 'ok' ? 'var(--status-success)' : 'var(--accent-red)', fontWeight: 'bold' }}>{r.status === 'ok' ? 'V' : 'X'}</span>
              <span>{r.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>{r.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// SEARCH TAB
// ============================================
function SearchTab({ userProfile }: { userProfile: any }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Fax[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFax, setSelectedFax] = useState<Fax | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchFaxes(query.trim())
      setResults(data)
    } catch (e) { console.error(e) }
    setSearched(true)
    setLoading(false)
  }

  if (selectedFax) {
    return <FaxDetail
      fax={selectedFax}
      onBack={() => setSelectedFax(null)}
      onReanalyze={() => {}}
      userProfile={userProfile}
    />
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="搜尋客戶、訂單、窗口、文件類型..."
          className="inset"
          style={{ flex: 1, fontSize: '9px', fontFamily: 'monospace', padding: '3px 6px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <button onClick={handleSearch} className="btn" disabled={loading} style={{ fontSize: '9px', padding: '2px 10px' }}>
          {loading ? '...' : 'SEARCH'}
        </button>
      </div>

      {searched && (
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '380px' }}>
          {results.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>查無結果</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: 'var(--bg-window)' }}>
                  <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>OK</th>
                  <th style={{ ...thStyle, width: '55px' }}>TYPE</th>
                  <th style={thStyle}>TIME</th>
                  <th style={thStyle}>CUSTOMER</th>
                  <th style={thStyle}>ORDER#</th>
                  <th style={thStyle}>CONTACT</th>
                </tr>
              </thead>
              <tbody>
                {results.map(fax => (
                  <tr key={fax.id} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)', cursor: 'pointer', opacity: fax.is_handled ? 0.6 : 1 }} onClick={() => setSelectedFax(fax)}>
                    <td style={{ padding: '2px', textAlign: 'center' }}>
                      {fax.is_handled ? <span style={{ color: 'var(--status-success)', fontWeight: 'bold' }}>V</span> : <span style={{ color: '#C00' }}>-</span>}
                    </td>
                    <td style={{ padding: '2px 3px' }}><DocTypeBadge type={fax.document_type} /></td>
                    <td style={{ padding: '2px 4px', fontSize: '8px' }}>{new Date(fax.received_at).toLocaleDateString('zh-TW')}</td>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{fax.customer_name || '—'}</td>
                    <td style={{ padding: '2px 4px' }}>{fax.order_number || '—'}</td>
                    <td style={{ padding: '2px 4px' }}>{fax.our_contact_person || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// STATS TAB — Enhanced with type breakdown + handled ratio
// ============================================
function StatsTab() {
  const [stats, setStats] = useState<{
    total: number; pending: number; analyzed: number; error: number;
    todayCount: number; unhandled: number; handled: number;
    byType: Record<string, number>
  } | null>(null)
  const [recentCustomers, setRecentCustomers] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, faxes] = await Promise.all([getFaxStats(), getFaxes(200)])
        setStats(s)

        const customerMap: Record<string, number> = {}
        for (const f of faxes) {
          if (f.customer_name) {
            customerMap[f.customer_name] = (customerMap[f.customer_name] || 0) + 1
          }
        }
        const sorted = Object.entries(customerMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        setRecentCustomers(sorted)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>
  if (!stats) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>Failed to load stats</div>

  const sortedTypes = Object.entries(stats.byType).sort((a, b) => b[1] - a[1])

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
        <StatCard label="TOTAL" value={stats.total} color="var(--text-primary)" />
        <StatCard label="TODAY" value={stats.todayCount} color="var(--accent-blue)" />
        <StatCard label="UNHANDLED" value={stats.unhandled} color="#C00000" />
        <StatCard label="HANDLED" value={stats.handled} color="var(--status-success)" />
        <StatCard label="ERROR" value={stats.error} color="var(--accent-red)" />
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {/* Document type breakdown */}
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px', flex: 1 }}>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>BY DOCUMENT TYPE</div>
          {sortedTypes.length === 0 ? (
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>No data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {sortedTypes.map(([type, count]) => {
                const style = getDocTypeStyle(type)
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}>
                    <DocTypeBadge type={type} />
                    <div style={{ flex: 1, height: '8px', background: 'var(--bg-window)', position: 'relative' }}>
                      <div style={{ height: '100%', background: style.color, width: `${(count / stats.total) * 100}%`, opacity: 0.5 }} />
                    </div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', minWidth: '20px', textAlign: 'right' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px', flex: 1 }}>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>TOP CUSTOMERS</div>
          {recentCustomers.length === 0 ? (
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>No data</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
              <tbody>
                {recentCustomers.map((c, i) => (
                  <tr key={c.name} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                    <td style={{ padding: '2px 4px', width: '18px', color: 'var(--text-muted)', fontSize: '8px' }}>#{i + 1}</td>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{c.name}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right', width: '30px' }}>{c.count}</td>
                    <td style={{ padding: '2px 4px', width: '60px' }}>
                      <div style={{ height: '8px', background: 'var(--accent-teal)', width: `${Math.min(100, (c.count / (recentCustomers[0]?.count || 1)) * 100)}%`, opacity: 0.7 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// AGENT STATUS BANNER
// ============================================
function AgentStatusBanner({ status }: { status: AgentStatus | null }) {
  const [expanded, setExpanded] = useState(false)

  if (!status) {
    return (
      <div style={{ padding: '3px 8px', marginBottom: '4px', background: '#E0E0E0', color: '#666', fontSize: '8px', border: '1px solid #999' }}>
        AGENT: 檢查中...
      </div>
    )
  }

  const isConnected = status.connected
  const hasError = !!status.last_error
  const ageText = status.age_minutes != null
    ? status.age_minutes < 1 ? '剛剛' : status.age_minutes < 60 ? `${status.age_minutes} 分鐘前` : `${Math.floor(status.age_minutes / 60)} 小時前`
    : '從未'

  // Banner colors based on status
  const bg = !isConnected || hasError ? '#FFE0E0' : '#D0FFD0'
  const border = !isConnected || hasError ? '#C00000' : '#008000'
  const color = !isConnected || hasError ? '#800000' : '#006000'
  const label = !isConnected ? 'AGENT 離線' : hasError ? 'AGENT 連線中（有錯誤）' : 'AGENT 連線正常'
  const icon = !isConnected ? '!' : hasError ? '!' : 'V'

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        padding: '4px 8px', marginBottom: '4px', background: bg, color,
        fontSize: '9px', border: `1px solid ${border}`, fontFamily: 'monospace',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>
          [{icon}] {label} - 最後上報：{ageText}
        </span>
        <span style={{ fontSize: '7px', opacity: 0.7 }}>{expanded ? '[收起]' : '[詳情]'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: `1px dashed ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', fontSize: '8px' }}>
          <div><b>主機：</b>{status.hostname || '—'}</div>
          <div><b>版本：</b>{status.agent_version || '—'}</div>
          <div style={{ gridColumn: '1 / -1' }}><b>監控資料夾：</b>{status.watch_folder || '—'}</div>
          <div><b>資料夾內檔案數：</b>{status.files_in_folder ?? '—'}</div>
          <div><b>累計掃描次數：</b>{status.scan_count ?? '—'}</div>
          <div><b>累計上傳：</b>{status.files_processed_total ?? 0} 份</div>
          <div><b>最後上傳檔案：</b>{status.last_uploaded_file || '—'}</div>
          {status.last_uploaded_at && (
            <div style={{ gridColumn: '1 / -1' }}>
              <b>最後上傳時間：</b>{new Date(status.last_uploaded_at).toLocaleString('zh-TW')}
            </div>
          )}
          {status.last_error && (
            <div style={{ gridColumn: '1 / -1', color: '#800000', wordBreak: 'break-all' }}>
              <b>最近錯誤：</b>{status.last_error}
              {status.last_error_at && ` (${new Date(status.last_error_at).toLocaleString('zh-TW')})`}
            </div>
          )}
          {!isConnected && status.message && (
            <div style={{ gridColumn: '1 / -1' }}>
              <b>狀況：</b>{status.message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px 4px', textAlign: 'center' }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: '7px', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.3px' }}>{label}</div>
    </div>
  )
}

function InfoRow({ label, value, bold, highlight }: { label: string; value?: string | null; bold?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '6px', padding: '1px 0', borderBottom: '1px solid var(--table-border)' }}>
      <span style={{ width: '60px', flexShrink: 0, color: 'var(--text-muted)', fontSize: '8px', fontWeight: 'bold' }}>{label}</span>
      <span style={{ fontWeight: bold ? 'bold' : 'normal', color: highlight ? 'var(--status-success)' : value ? 'var(--text-primary)' : 'var(--text-muted)', wordBreak: 'break-all' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function FieldRow({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: multiline ? 'flex-start' : 'center' }}>
      <span style={{ width: '60px', flexShrink: 0, color: 'var(--text-muted)', fontSize: '8px', fontWeight: 'bold', paddingTop: multiline ? '2px' : 0 }}>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className="inset" rows={2} style={{ flex: 1, fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', resize: 'vertical' }} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="inset" style={{ flex: 1, fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
      )}
    </div>
  )
}

function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)
}
