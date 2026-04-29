'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAllProfiles, type Profile } from '@/lib/api'
import { createDelegation, type DelegationPriority } from '@/lib/delegationsApi'

interface Props {
  open: boolean
  defaultDate?: string  // 'YYYY-MM-DD' (起始日預設)
  currentUserId: string
  currentUserName: string
  onClose: () => void
  onCreated?: (id: string) => void
}

const PRIORITY_OPTIONS: { id: DelegationPriority; label: string; color: string }[] = [
  { id: 'normal', label: '普通',   color: 'var(--text-primary)' },
  { id: 'high',   label: '重要',   color: 'var(--accent-orange)' },
  { id: 'urgent', label: '緊急',   color: 'var(--accent-red)' },
]

export default function DelegationCreateModal({
  open, defaultDate, currentUserId, currentUserName, onClose, onCreated
}: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<DelegationPriority>('normal')
  const [pushLine, setPushLine] = useState(true)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset on open
  useEffect(() => {
    if (!open) return
    const today = defaultDate || new Date().toISOString().slice(0, 10)
    const due = new Date(today)
    due.setDate(due.getDate() + 7)  // 預設一週
    setTitle('')
    setDescription('')
    setAssigneeId('')
    setStartDate(today)
    setDueDate(due.toISOString().slice(0, 10))
    setPriority('normal')
    setPushLine(true)
    setSearch('')
    setError('')
  }, [open, defaultDate])

  // Load profiles
  useEffect(() => {
    if (!open || profiles.length > 0) return
    getAllProfiles().then(setProfiles).catch(e => console.warn(e))
  }, [open, profiles.length])

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return profiles
      .filter(p => p.id !== currentUserId)  // 不能交辦給自己
      .filter(p => !q || p.full_name.toLowerCase().includes(q) || p.employee_id.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q))
      .sort((a, b) => a.employee_id.localeCompare(b.employee_id))
  }, [profiles, search, currentUserId])

  const selectedAssignee = profiles.find(p => p.id === assigneeId)

  const dateRangeDays = useMemo(() => {
    if (!startDate || !dueDate) return 0
    const s = new Date(startDate).getTime()
    const e = new Date(dueDate).getTime()
    return Math.round((e - s) / 86400000) + 1
  }, [startDate, dueDate])

  if (!open) return null

  const handleSubmit = async () => {
    setError('')
    if (!title.trim()) { setError('請輸入交辦標題'); return }
    if (!assigneeId) { setError('請選擇承辦人員'); return }
    if (!startDate || !dueDate) { setError('請填寫起訖日期'); return }
    if (dueDate < startDate) { setError('結束日不可早於起始日'); return }

    setSubmitting(true)
    try {
      const created = await createDelegation({
        title: title.trim(),
        description: description.trim() || undefined,
        issuer_id: currentUserId,
        issuer_name: currentUserName,
        assignee_id: assigneeId,
        assignee_name: selectedAssignee?.full_name || undefined,
        start_date: startDate,
        due_date: dueDate,
        priority,
        notifyAssignee: true,
        pushLine,
      })
      onCreated?.(created.id)
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`建立失敗：${msg}`)
    }
    setSubmitting(false)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '560px', maxWidth: '95vw', maxHeight: '90vh',
          background: 'var(--bg-window)', border: '2px solid var(--border-dark)',
          boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Titlebar */}
        <div className="titlebar" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
          <span>📋 建立交辦事項</span>
          <button onClick={onClose} style={{ width: '20px', height: '18px', fontSize: '11px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'monospace' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '12px', overflowY: 'auto', flex: 1, fontSize: '11px' }}>
          {error && (
            <div style={{ padding: '6px 8px', background: 'var(--accent-red)', color: '#FFF', marginBottom: '8px', fontSize: '10px' }}>
              ⚠ {error}
            </div>
          )}

          {/* 交辦人 */}
          <div style={{ marginBottom: '8px', padding: '6px', background: 'var(--bg-inset)', fontSize: '10px' }}>
            <span style={{ color: 'var(--text-muted)' }}>交辦人：</span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{currentUserName || '我'}</span>
          </div>

          {/* 標題 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>標題 <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例：撰寫年終報告"
              style={{ width: '100%', padding: '5px 7px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
            />
          </div>

          {/* 內容 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>內容說明</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="詳細交辦內容、要求、注意事項..."
              rows={3}
              style={{ width: '100%', padding: '5px 7px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* 承辦人 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>
              承辦人員 <span style={{ color: 'var(--accent-red)' }}>*</span>
              {selectedAssignee && <span style={{ marginLeft: '8px', fontWeight: 'normal', color: 'var(--accent-blue)' }}>✓ {selectedAssignee.full_name} ({selectedAssignee.department})</span>}
            </label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋姓名 / 員編 / 部門..."
              style={{ width: '100%', padding: '5px 7px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', marginBottom: '4px', boxSizing: 'border-box' }}
            />
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)' }}>
              {filteredProfiles.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px' }}>無符合人員</div>
              ) : (
                filteredProfiles.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setAssigneeId(p.id)}
                    style={{
                      padding: '4px 8px',
                      borderBottom: '1px solid var(--table-border)',
                      cursor: 'pointer',
                      background: assigneeId === p.id ? 'var(--accent-blue)' : 'transparent',
                      color: assigneeId === p.id ? '#FFF' : 'var(--text-primary)',
                      fontSize: '10px',
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <input type="radio" checked={assigneeId === p.id} readOnly style={{ pointerEvents: 'none' }} />
                    <span style={{ flex: 1 }}>{p.full_name}</span>
                    <span style={{ fontSize: '9px', opacity: 0.7 }}>{p.employee_id}</span>
                    <span style={{ fontSize: '9px', opacity: 0.7 }}>{p.department}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 起訖日期 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>起始日 <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '5px 7px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>結束日 <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '5px 7px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingBottom: '6px', whiteSpace: 'nowrap' }}>
              {dateRangeDays > 0 ? `共 ${dateRangeDays} 天` : ''}
            </div>
          </div>

          {/* 優先度 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>優先度</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setPriority(opt.id)}
                  style={{
                    flex: 1,
                    padding: '5px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    border: priority === opt.id ? `2px solid ${opt.color}` : '1px solid var(--border-mid-dark)',
                    background: priority === opt.id ? opt.color : 'var(--bg-window)',
                    color: priority === opt.id ? '#FFF' : opt.color,
                    fontWeight: priority === opt.id ? 'bold' : 'normal',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* LINE 推播 */}
          <div style={{ marginBottom: '8px', padding: '6px', background: 'var(--bg-inset)', fontSize: '10px' }}>
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={pushLine} onChange={e => setPushLine(e.target.checked)} />
              <span>同時推送 LINE 通知（未綁定者僅站內通知）</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-mid-dark)', background: 'var(--bg-inset)', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{ padding: '5px 14px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: submitting ? 'wait' : 'pointer' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !assigneeId}
            style={{
              padding: '5px 18px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold',
              border: '1px solid var(--accent-blue)',
              background: (!title.trim() || !assigneeId) ? 'var(--text-muted)' : 'var(--accent-blue)',
              color: '#FFF',
              cursor: (submitting || !title.trim() || !assigneeId) ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '建立中...' : '✓ 交辦並通知'}
          </button>
        </div>
      </div>
    </div>
  )
}
