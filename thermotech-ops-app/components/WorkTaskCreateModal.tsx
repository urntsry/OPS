'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAllProfiles, type Profile } from '@/lib/api'
import { createWorkTask, newChecklistItem, type WorkTaskPriority, type ChecklistItem } from '@/lib/workTasksApi'

interface Props {
  open: boolean
  currentUserId: string
  currentUserName: string
  onClose: () => void
  onCreated?: (id: string) => void
}

const PRIORITY_OPTIONS: { id: WorkTaskPriority; label: string; color: string }[] = [
  { id: 'normal', label: '普通', color: 'var(--text-primary)' },
  { id: 'high', label: '重要', color: 'var(--accent-orange)' },
  { id: 'urgent', label: '緊急', color: 'var(--accent-red)' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '5px 7px', fontSize: '11px', fontFamily: 'monospace',
  border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box',
}

export default function WorkTaskCreateModal({ open, currentUserId, currentUserName, onClose, onCreated }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<WorkTaskPriority>('normal')
  const [hardDue, setHardDue] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [pushLine, setPushLine] = useState(true)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(''); setDescription(''); setAssigneeId(''); setPriority('normal')
    setHardDue(''); setChecklist([]); setNewItem(''); setPushLine(true); setSearch(''); setError('')
  }, [open])

  useEffect(() => {
    if (!open || profiles.length > 0) return
    getAllProfiles().then(setProfiles).catch(e => console.warn(e))
  }, [open, profiles.length])

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return profiles
      .filter(p => p.id !== currentUserId)
      .filter(p => !q || p.full_name.toLowerCase().includes(q) || p.employee_id.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q))
      .sort((a, b) => a.employee_id.localeCompare(b.employee_id))
  }, [profiles, search, currentUserId])

  const selectedAssignee = profiles.find(p => p.id === assigneeId)

  if (!open) return null

  const addItem = () => {
    const t = newItem.trim()
    if (!t) return
    setChecklist(prev => [...prev, newChecklistItem(t)])
    setNewItem('')
  }

  const handleSubmit = async () => {
    setError('')
    if (!title.trim()) { setError('請輸入任務標題'); return }
    if (!assigneeId) { setError('請選擇承辦人員'); return }
    setSubmitting(true)
    try {
      const created = await createWorkTask({
        title: title.trim(),
        description: description.trim() || undefined,
        issuer_id: currentUserId,
        issuer_name: currentUserName,
        assignee_id: assigneeId,
        assignee_name: selectedAssignee?.full_name || undefined,
        priority,
        hard_due: hardDue || undefined,
        checklist,
        pushLine,
      })
      onCreated?.(created.id)
      onClose()
    } catch (e) {
      setError(`建立失敗：${e instanceof Error ? e.message : String(e)}`)
    }
    setSubmitting(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '580px', maxWidth: '95vw', maxHeight: '90vh', background: 'var(--bg-window)', border: '2px solid var(--border-dark)', boxShadow: '4px 4px 0 rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
        <div className="titlebar" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
          <span>🗂 建立任務（交辦）</span>
          <button onClick={onClose} style={{ width: '20px', height: '18px', fontSize: '11px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'monospace' }}>×</button>
        </div>

        <div style={{ padding: '12px', overflowY: 'auto', flex: 1, fontSize: '11px' }}>
          {error && <div style={{ padding: '6px 8px', background: 'var(--accent-red)', color: '#FFF', marginBottom: '8px', fontSize: '10px' }}>⚠ {error}</div>}

          <div style={{ marginBottom: '8px', padding: '6px', background: 'var(--bg-inset)', fontSize: '10px' }}>
            <span style={{ color: 'var(--text-muted)' }}>交辦人：</span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{currentUserName || '我'}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '10px' }}>承辦人收到後需回報預估工時（不可拒絕）</span>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>任務標題 <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：下月提供 A 客戶用料分析" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>任務細節</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="背景、要求、產出物、參考資料..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* 待辦清單 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>待辦清單（to-do）</label>
            {checklist.map((it, idx) => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', fontSize: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{idx + 1}.</span>
                <span style={{ flex: 1 }}>{it.text}</span>
                <button onClick={() => setChecklist(prev => prev.filter(x => x.id !== it.id))} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
              <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} placeholder="新增一個待辦項目，按 Enter" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addItem} className="btn" style={{ fontSize: '10px', padding: '0 10px' }}>＋</button>
            </div>
          </div>

          {/* 承辦人 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>
              承辦人員 <span style={{ color: 'var(--accent-red)' }}>*</span>
              {selectedAssignee && <span style={{ marginLeft: '8px', fontWeight: 'normal', color: 'var(--accent-blue)' }}>✓ {selectedAssignee.full_name} ({selectedAssignee.department})</span>}
            </label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋姓名 / 員編 / 部門..." style={{ ...inputStyle, marginBottom: '4px' }} />
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)' }}>
              {filteredProfiles.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px' }}>無符合人員</div>
              ) : filteredProfiles.map(p => (
                <div key={p.id} onClick={() => setAssigneeId(p.id)} style={{ padding: '4px 8px', borderBottom: '1px solid var(--table-border)', cursor: 'pointer', background: assigneeId === p.id ? 'var(--accent-blue)' : 'transparent', color: assigneeId === p.id ? '#FFF' : 'var(--text-primary)', fontSize: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="radio" checked={assigneeId === p.id} readOnly style={{ pointerEvents: 'none' }} />
                  <span style={{ flex: 1 }}>{p.full_name}</span>
                  <span style={{ fontSize: '9px', opacity: 0.7 }}>{p.employee_id}</span>
                  <span style={{ fontSize: '9px', opacity: 0.7 }}>{p.department}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 優先度 + 期望期限 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>優先度</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {PRIORITY_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setPriority(opt.id)} style={{ flex: 1, padding: '5px', fontSize: '10px', fontFamily: 'monospace', border: priority === opt.id ? `2px solid ${opt.color}` : '1px solid var(--border-mid-dark)', background: priority === opt.id ? opt.color : 'var(--bg-window)', color: priority === opt.id ? '#FFF' : opt.color, fontWeight: priority === opt.id ? 'bold' : 'normal', cursor: 'pointer' }}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>期望期限（選填）</label>
              <input type="date" value={hardDue} onChange={e => setHardDue(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ padding: '6px', background: 'var(--bg-inset)', fontSize: '10px' }}>
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={pushLine} onChange={e => setPushLine(e.target.checked)} />
              <span>同時推送 LINE 通知（未綁定者僅站內通知）</span>
            </label>
          </div>
        </div>

        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-mid-dark)', background: 'var(--bg-inset)', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          <button onClick={onClose} disabled={submitting} style={{ padding: '5px 14px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: submitting ? 'wait' : 'pointer' }}>取消</button>
          <button onClick={handleSubmit} disabled={submitting || !title.trim() || !assigneeId} style={{ padding: '5px 18px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', border: '1px solid var(--accent-blue)', background: (!title.trim() || !assigneeId) ? 'var(--text-muted)' : 'var(--accent-blue)', color: '#FFF', cursor: (submitting || !title.trim() || !assigneeId) ? 'not-allowed' : 'pointer' }}>{submitting ? '建立中...' : '✓ 交辦並通知'}</button>
        </div>
      </div>
    </div>
  )
}
