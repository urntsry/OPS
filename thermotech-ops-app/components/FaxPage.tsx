'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import { getFaxes, getFaxById, updateFax, deleteFax, searchFaxes, getFaxStats, subscribeFaxUpdates, type Fax, type OrderItem } from '@/lib/faxApi'

interface FaxPageProps {
  isAdmin: boolean
  userProfile: any
}

export default function FaxPage({ isAdmin, userProfile }: FaxPageProps) {
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'no_key' | 'error'>('checking')
  const [totalPending, setTotalPending] = useState(0)

  useEffect(() => {
    const checkAi = async () => {
      try {
        const res = await fetch('/api/fax/analyze')
        const d = await res.json()
        setAiStatus(d.ai_available ? 'connected' : 'no_key')
      } catch { setAiStatus('error') }
    }
    checkAi()
  }, [])

  const tabs: DepartmentTab[] = [
    { id: 'inbox', label: 'INBOX', show: true, badge: totalPending > 0 ? totalPending : undefined, component: <InboxTab onPendingChange={setTotalPending} userProfile={userProfile} /> },
    { id: 'upload', label: 'UPLOAD', show: isAdmin, component: <UploadTab /> },
    { id: 'search', label: 'SEARCH', show: true, component: <SearchTab /> },
    { id: 'stats', label: 'STATS', show: true, component: <StatsTab /> },
  ]

  const statusText = aiStatus === 'connected' ? 'AI: ONLINE' : aiStatus === 'no_key' ? 'AI: NO KEY' : aiStatus === 'error' ? 'AI: ERROR' : 'AI: CHECKING...'

  return (
    <DepartmentShell
      departmentId="fax"
      departmentName="FAX - 傳真中心"
      tabs={tabs}
      defaultTab="inbox"
      statusInfo={statusText}
    />
  )
}

// ============================================
// STATUS BADGE
// ============================================
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

// ============================================
// INBOX TAB
// ============================================
function InboxTab({ onPendingChange, userProfile }: { onPendingChange: (n: number) => void; userProfile: any }) {
  const [faxes, setFaxes] = useState<Fax[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFax, setSelectedFax] = useState<Fax | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadFaxes = useCallback(async () => {
    try {
      const data = await getFaxes(100)
      setFaxes(data)
      const pending = data.filter(f => f.status === 'pending' || f.status === 'analyzing').length
      onPendingChange(pending)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [onPendingChange])

  useEffect(() => {
    loadFaxes()
    const unsub = subscribeFaxUpdates(() => loadFaxes())
    return unsub
  }, [loadFaxes])

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此傳真記錄？')) return
    try {
      await deleteFax(id)
      setFaxes(prev => prev.filter(f => f.id !== id))
      if (selectedFax?.id === id) setSelectedFax(null)
      setToast('Deleted')
      setTimeout(() => setToast(null), 2000)
    } catch { setToast('Delete failed') }
  }

  const handleReanalyze = async (fax: Fax) => {
    try {
      await updateFax(fax.id, { status: 'pending' } as any)
      const res = await fetch('/api/fax/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fax_id: fax.id, file_url: fax.file_url, file_name: fax.file_name }),
      })
      if (res.ok) {
        setToast('Re-analysis triggered')
        loadFaxes()
      }
    } catch { setToast('Failed') }
    setTimeout(() => setToast(null), 2000)
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>

  if (selectedFax) {
    return <FaxDetail fax={selectedFax} onBack={() => { setSelectedFax(null); loadFaxes() }} onReanalyze={handleReanalyze} userProfile={userProfile} />
  }

  return (
    <div>
      {toast && <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px' }}>{toast}</div>}

      <div style={{ marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)' }}>
        Total: {faxes.length} | Pending: {faxes.filter(f => f.status === 'pending' || f.status === 'analyzing').length} | Analyzed: {faxes.filter(f => f.status === 'analyzed').length}
      </div>

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto', maxHeight: '420px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)' }}>
              <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '110px' }}>TIME</th>
              <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>FILE</th>
              <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '90px' }}>CUSTOMER</th>
              <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '70px' }}>ORDER#</th>
              <th style={{ padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '60px' }}>CONTACT</th>
              <th style={{ padding: '3px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '55px' }}>STATUS</th>
              <th style={{ padding: '3px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '30px' }}>DEL</th>
            </tr>
          </thead>
          <tbody>
            {faxes.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No faxes received yet</td></tr>
            ) : faxes.map(fax => (
              <tr
                key={fax.id}
                className="eventlist-row"
                style={{ borderBottom: '1px solid var(--table-border)', cursor: 'pointer' }}
                onClick={() => setSelectedFax(fax)}
              >
                <td style={{ padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)' }}>
                  {new Date(fax.received_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fax.file_name}
                </td>
                <td style={{ padding: '2px 4px', fontWeight: fax.customer_name ? 'bold' : 'normal', color: fax.customer_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {fax.customer_name || '—'}
                </td>
                <td style={{ padding: '2px 4px', fontSize: '8px' }}>
                  {fax.order_number || '—'}
                </td>
                <td style={{ padding: '2px 4px', fontSize: '8px', color: fax.our_contact_user_id ? 'var(--status-success)' : 'var(--text-muted)' }}>
                  {fax.our_contact_person || '—'}
                </td>
                <td style={{ padding: '2px', textAlign: 'center' }}>
                  <StatusBadge status={fax.status} />
                </td>
                <td style={{ padding: '2px', textAlign: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(fax.id) }}
                    style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 3px', outline: 'none' }}
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// FAX DETAIL VIEW
// ============================================
function FaxDetail({ fax: initialFax, onBack, onReanalyze, userProfile }: { fax: Fax; onBack: () => void; onReanalyze: (f: Fax) => void; userProfile: any }) {
  const [fax, setFax] = useState(initialFax)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    customer_name: fax.customer_name || '',
    customer_address: fax.customer_address || '',
    customer_contact: fax.customer_contact || '',
    order_number: fax.order_number || '',
    our_contact_person: fax.our_contact_person || '',
    notes: fax.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateFax(fax.id, {
        customer_name: editData.customer_name || null,
        customer_address: editData.customer_address || null,
        customer_contact: editData.customer_contact || null,
        order_number: editData.order_number || null,
        our_contact_person: editData.our_contact_person || null,
        notes: editData.notes || null,
        reviewed_by: userProfile?.id || null,
        reviewed_at: new Date().toISOString(),
      } as any)
      setFax(updated)
      setEditing(false)
      setToast('Saved')
    } catch { setToast('Save failed') }
    setSaving(false)
    setTimeout(() => setToast(null), 2000)
  }

  const rawAnalysis = fax.ai_raw_response

  return (
    <div>
      {toast && <div style={{ padding: '3px 8px', marginBottom: '4px', background: 'var(--accent-teal)', color: '#FFF', fontSize: '9px' }}>{toast}</div>}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center' }}>
        <button onClick={onBack} className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>BACK</button>
        <button onClick={() => setEditing(!editing)} className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>{editing ? 'CANCEL' : 'EDIT'}</button>
        {editing && <button onClick={handleSave} className="btn" disabled={saving} style={{ fontSize: '9px', padding: '2px 8px', fontWeight: 'bold' }}>{saving ? '...' : 'SAVE'}</button>}
        <button onClick={() => onReanalyze(fax)} className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>RE-ANALYZE</button>
        {fax.file_url && <a href={fax.file_url} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: '9px', padding: '2px 8px', textDecoration: 'none', color: 'var(--text-primary)' }}>VIEW FILE</a>}
        <div style={{ flex: 1 }} />
        <StatusBadge status={fax.status} />
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {/* Left: File preview */}
        <div className="inset" style={{ width: '45%', minHeight: '300px', background: 'var(--bg-inset)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {fax.file_url ? (
            isImageFile(fax.file_name) ? (
              <img src={fax.file_url} alt={fax.file_name} style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>PDF</div>
                <div>{fax.file_name}</div>
                <a href={fax.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', fontSize: '8px' }}>Open in new tab</a>
              </div>
            )
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>No file</div>
          )}
        </div>

        {/* Right: Analysis data */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px', marginBottom: '4px' }}>
            <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>AI ANALYSIS RESULT</div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px' }}>
                <FieldRow label="Customer" value={editData.customer_name} onChange={v => setEditData(p => ({ ...p, customer_name: v }))} />
                <FieldRow label="Address" value={editData.customer_address} onChange={v => setEditData(p => ({ ...p, customer_address: v }))} />
                <FieldRow label="Contact" value={editData.customer_contact} onChange={v => setEditData(p => ({ ...p, customer_contact: v }))} />
                <FieldRow label="Order#" value={editData.order_number} onChange={v => setEditData(p => ({ ...p, order_number: v }))} />
                <FieldRow label="Our Staff" value={editData.our_contact_person} onChange={v => setEditData(p => ({ ...p, our_contact_person: v }))} />
                <FieldRow label="Notes" value={editData.notes} onChange={v => setEditData(p => ({ ...p, notes: v }))} multiline />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px' }}>
                <InfoRow label="Customer" value={fax.customer_name} />
                <InfoRow label="Address" value={fax.customer_address} />
                <InfoRow label="Contact" value={fax.customer_contact} />
                <InfoRow label="Order#" value={fax.order_number} bold />
                <InfoRow label="Our Staff" value={fax.our_contact_person} highlight={!!fax.our_contact_user_id} />
                <InfoRow label="Doc Type" value={rawAnalysis?.document_type} />
                <InfoRow label="Summary" value={rawAnalysis?.summary} />
                {rawAnalysis?.total_amount && <InfoRow label="Amount" value={`${rawAnalysis.currency || ''} ${rawAnalysis.total_amount}`} />}
                {rawAnalysis?.delivery_date && <InfoRow label="Delivery" value={rawAnalysis.delivery_date} />}
                {rawAnalysis?.special_notes && <InfoRow label="Special" value={rawAnalysis.special_notes} />}
                {fax.ai_confidence != null && (
                  <InfoRow label="Confidence" value={`${Math.round(fax.ai_confidence * 100)}%`} />
                )}
                {fax.notes && <InfoRow label="Notes" value={fax.notes} />}
                {fax.reviewed_at && <InfoRow label="Reviewed" value={new Date(fax.reviewed_at).toLocaleString('zh-TW')} />}
              </div>
            )}
          </div>

          {/* Order items */}
          {fax.order_items && fax.order_items.length > 0 && (
            <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px' }}>
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>ORDER ITEMS ({fax.order_items.length})</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-window)' }}>
                    <th style={{ padding: '2px 3px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>Item</th>
                    <th style={{ padding: '2px 3px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '40px' }}>QTY</th>
                    <th style={{ padding: '2px 3px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '40px' }}>Unit</th>
                    <th style={{ padding: '2px 3px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>Spec</th>
                  </tr>
                </thead>
                <tbody>
                  {fax.order_items.map((item: OrderItem, i: number) => (
                    <tr key={i} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                      <td style={{ padding: '2px 3px' }}>{item.name}</td>
                      <td style={{ padding: '2px 3px', textAlign: 'center' }}>{item.quantity || '—'}</td>
                      <td style={{ padding: '2px 3px' }}>{item.unit || '—'}</td>
                      <td style={{ padding: '2px 3px', fontSize: '7px', color: 'var(--text-muted)' }}>{item.spec || item.note || '—'}</td>
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
        Upload fax files manually (for testing or manual import). The Watcher Agent handles automatic uploads.
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
              <span style={{ color: r.status === 'ok' ? 'var(--status-success)' : 'var(--accent-red)', fontWeight: 'bold' }}>{r.status === 'ok' ? '✓' : '✗'}</span>
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
function SearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Fax[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

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

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search by customer, order#, contact..."
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
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>No results found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: 'var(--bg-window)' }}>
                  <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>Time</th>
                  <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>Customer</th>
                  <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>Order#</th>
                  <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>Contact</th>
                  <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>File</th>
                </tr>
              </thead>
              <tbody>
                {results.map(fax => (
                  <tr key={fax.id} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                    <td style={{ padding: '2px 4px', fontSize: '8px' }}>{new Date(fax.received_at).toLocaleDateString('zh-TW')}</td>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{fax.customer_name || '—'}</td>
                    <td style={{ padding: '2px 4px' }}>{fax.order_number || '—'}</td>
                    <td style={{ padding: '2px 4px' }}>{fax.our_contact_person || '—'}</td>
                    <td style={{ padding: '2px 4px', fontSize: '8px', color: 'var(--text-muted)' }}>{fax.file_name}</td>
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
// STATS TAB
// ============================================
function StatsTab() {
  const [stats, setStats] = useState<{ total: number; pending: number; analyzed: number; error: number; todayCount: number } | null>(null)
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

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
        <StatCard label="TOTAL" value={stats.total} color="var(--text-primary)" />
        <StatCard label="TODAY" value={stats.todayCount} color="var(--accent-blue)" />
        <StatCard label="PENDING" value={stats.pending} color="#FF8C00" />
        <StatCard label="ERROR" value={stats.error} color="var(--accent-red)" />
      </div>

      {/* Top customers */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px' }}>
        <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>TOP CUSTOMERS</div>
        {recentCustomers.length === 0 ? (
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>No data yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
            <tbody>
              {recentCustomers.map((c, i) => (
                <tr key={c.name} className="eventlist-row" style={{ borderBottom: '1px solid var(--table-border)' }}>
                  <td style={{ padding: '2px 4px', width: '20px', color: 'var(--text-muted)', fontSize: '8px' }}>#{i + 1}</td>
                  <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{c.name}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'right', width: '40px' }}>{c.count}</td>
                  <td style={{ padding: '2px 4px', width: '80px' }}>
                    <div style={{ height: '8px', background: 'var(--accent-teal)', width: `${Math.min(100, (c.count / (recentCustomers[0]?.count || 1)) * 100)}%`, opacity: 0.7 }} />
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

// ============================================
// HELPER COMPONENTS
// ============================================
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: '7px', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

function InfoRow({ label, value, bold, highlight }: { label: string; value?: string | null; bold?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '6px', padding: '1px 0', borderBottom: '1px solid var(--table-border)' }}>
      <span style={{ width: '65px', flexShrink: 0, color: 'var(--text-muted)', fontSize: '8px', fontWeight: 'bold' }}>{label}</span>
      <span style={{ fontWeight: bold ? 'bold' : 'normal', color: highlight ? 'var(--status-success)' : value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function FieldRow({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: multiline ? 'flex-start' : 'center' }}>
      <span style={{ width: '65px', flexShrink: 0, color: 'var(--text-muted)', fontSize: '8px', fontWeight: 'bold', paddingTop: multiline ? '2px' : 0 }}>{label}</span>
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
