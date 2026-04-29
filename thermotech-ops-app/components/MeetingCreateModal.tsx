'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAllProfiles, type Profile } from '@/lib/api'
import { createMeeting, type CreateMeetingInput } from '@/lib/meetingsApi'

interface Props {
  open: boolean
  /** Default date pre-filled (e.g. clicked date on calendar) */
  defaultDate?: string  // 'YYYY-MM-DD'
  /** Default title (e.g. user typed in inline form before switching to advanced) */
  defaultTitle?: string
  currentUserId?: string
  onClose: () => void
  /** Called after successful creation; parent can refresh calendar */
  onCreated?: (meetingId: string) => void
}

interface HelperTask {
  user_id: string
  helper_task: string
}

export default function MeetingCreateModal({ open, defaultDate, defaultTitle, currentUserId, onClose, onCreated }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [attendees, setAttendees] = useState<string[]>([])
  const [related, setRelated] = useState<string[]>([])
  const [helpers, setHelpers] = useState<HelperTask[]>([])
  const [useLine, setUseLine] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'attendee' | 'related' | 'helper'>('attendee')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset form on open
  useEffect(() => {
    if (!open) return
    setTitle(defaultTitle || '')
    setSummary('')
    setLocation('')
    setDate(defaultDate || new Date().toISOString().slice(0, 10))
    setStartTime('09:00')
    setEndTime('10:00')
    setAttendees([])
    setRelated([])
    setHelpers([])
    setUseLine(false)
    setSearch('')
    setActiveTab('attendee')
    setError('')
  }, [open, defaultDate, defaultTitle])

  // Load profiles once on first open
  useEffect(() => {
    if (!open || profiles.length > 0) return
    setLoading(true)
    getAllProfiles()
      .then(data => setProfiles(data || []))
      .catch(e => console.error('[MeetingModal] load profiles failed:', e))
      .finally(() => setLoading(false))
  }, [open, profiles.length])

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles
    const q = search.toLowerCase()
    return profiles.filter(p =>
      p.full_name?.toLowerCase().includes(q) ||
      p.employee_id?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
    )
  }, [profiles, search])

  // Determine which set this profile is currently in
  const getRole = (uid: string): 'attendee' | 'related' | 'helper' | null => {
    if (attendees.includes(uid)) return 'attendee'
    if (related.includes(uid)) return 'related'
    if (helpers.some(h => h.user_id === uid)) return 'helper'
    return null
  }

  const togglePerson = (uid: string) => {
    const currentRole = getRole(uid)

    // Remove from all lists first
    setAttendees(prev => prev.filter(x => x !== uid))
    setRelated(prev => prev.filter(x => x !== uid))
    setHelpers(prev => prev.filter(h => h.user_id !== uid))

    // If they were already in the active tab → remove (toggle off)
    if (currentRole === activeTab) return

    // Otherwise add to active tab
    if (activeTab === 'attendee') setAttendees(prev => [...prev, uid])
    else if (activeTab === 'related') setRelated(prev => [...prev, uid])
    else if (activeTab === 'helper') setHelpers(prev => [...prev, { user_id: uid, helper_task: '' }])
  }

  const updateHelperTask = (uid: string, task: string) => {
    setHelpers(prev => prev.map(h => h.user_id === uid ? { ...h, helper_task: task } : h))
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('請輸入會議標題'); return }
    if (!date) { setError('請選擇會議日期'); return }
    if (attendees.length === 0 && related.length === 0 && helpers.length === 0) {
      if (!confirm('尚未選擇任何人員，確定要建立會議？')) return
    }
    setSubmitting(true)
    setError('')
    try {
      const input: CreateMeetingInput = {
        title: title.trim(),
        summary: summary.trim() || undefined,
        location: location.trim() || undefined,
        meeting_date: date,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        attendees,
        related,
        helpers: helpers.map(h => ({ user_id: h.user_id, helper_task: h.helper_task.trim() || undefined })),
        created_by: currentUserId,
        use_line: useLine,
      }
      const { meeting } = await createMeeting(input)
      onCreated?.(meeting.id)
      onClose()
    } catch (e: any) {
      setError(e.message || '建立失敗')
    }
    setSubmitting(false)
  }

  if (!open) return null

  // Helper to get profile by id (for chip display)
  const profileById = (uid: string) => profiles.find(p => p.id === uid)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 10100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(640px, 95vw)',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-window)',
          borderTop: '2px solid var(--border-light)',
          borderLeft: '2px solid var(--border-light)',
          borderRight: '2px solid var(--border-dark)',
          borderBottom: '2px solid var(--border-dark)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Title bar */}
        <div className="titlebar" style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>◎ 建立會議</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '10px 12px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Row: title */}
          <Field label="會議標題 *">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 4月部門會議"
              style={inputStyle} autoFocus />
          </Field>

          {/* Row: location */}
          <Field label="會議地點">
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="例: 1F 會議室 / 線上 (Zoom)"
              style={inputStyle} />
          </Field>

          {/* Row: date + time */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Field label="日期 *" style={{ flex: 1 }}>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="開始" style={{ width: '110px' }}>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="結束" style={{ width: '110px' }}>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          {/* Row: summary */}
          <Field label="會議簡介">
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="會議目的、議程、需要準備的資料..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
            />
          </Field>

          {/* Participant tabs */}
          <div style={{ marginTop: '4px' }}>
            <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-dark)' }}>
              {([
                { key: 'attendee', label: '出席人員', count: attendees.length, hint: '會出席會議' },
                { key: 'related', label: '相關通知', count: related.length, hint: '不出席但需知悉' },
                { key: 'helper', label: '協助準備', count: helpers.length, hint: '需協助準備事項' },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    border: 'none',
                    borderTop: '1px solid var(--border-dark)',
                    borderLeft: '1px solid var(--border-dark)',
                    borderRight: '1px solid var(--border-dark)',
                    background: activeTab === t.key ? 'var(--bg-window)' : 'var(--bg-secondary)',
                    color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  title={t.hint}
                >
                  {t.label} {t.count > 0 && `(${t.count})`}
                </button>
              ))}
            </div>

            {/* Active tab body */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dark)', borderTop: 'none', padding: '6px' }}>
              {/* Currently selected chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px', minHeight: '20px' }}>
                {(activeTab === 'attendee' ? attendees : activeTab === 'related' ? related : helpers.map(h => h.user_id))
                  .map(uid => {
                    const p = profileById(uid)
                    if (!p) return null
                    return (
                      <div key={uid} style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        padding: '2px 5px',
                        background: 'var(--bg-window)',
                        border: '1px solid var(--border-mid-dark)',
                        fontSize: '9px',
                      }}>
                        <span style={{ fontWeight: 'bold' }}>{p.full_name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({p.department})</span>
                        {activeTab === 'helper' && (
                          <input
                            value={helpers.find(h => h.user_id === uid)?.helper_task || ''}
                            onChange={e => updateHelperTask(uid, e.target.value)}
                            placeholder="例: 訂咖啡 6 杯"
                            style={{ ...inputStyle, padding: '0 3px', height: '18px', fontSize: '9px', width: '120px' }}
                          />
                        )}
                        <button
                          onClick={() => {
                            if (activeTab === 'attendee') setAttendees(prev => prev.filter(x => x !== uid))
                            else if (activeTab === 'related') setRelated(prev => prev.filter(x => x !== uid))
                            else setHelpers(prev => prev.filter(h => h.user_id !== uid))
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', padding: 0 }}
                        >×</button>
                      </div>
                    )
                  })}
                {(activeTab === 'attendee' ? attendees : activeTab === 'related' ? related : helpers).length === 0 && (
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    尚未選擇{activeTab === 'attendee' ? '出席人員' : activeTab === 'related' ? '相關人員' : '協助人員'}
                  </span>
                )}
              </div>

              {/* Search + list */}
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜尋姓名、員工編號或部門..."
                style={{ ...inputStyle, marginBottom: '4px' }}
              />
              <div style={{ maxHeight: '160px', overflow: 'auto', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)' }}>
                {loading ? (
                  <div style={{ padding: '10px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>載入中...</div>
                ) : filteredProfiles.length === 0 ? (
                  <div style={{ padding: '10px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>無符合的人員</div>
                ) : (
                  filteredProfiles.map(p => {
                    const role = getRole(p.id)
                    const inThisTab = role === activeTab
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePerson(p.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--border-mid-dark)',
                          background: inThisTab ? 'rgba(0, 95, 175, 0.18)' : 'transparent',
                          transition: 'background 0.08s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = inThisTab ? 'rgba(0, 95, 175, 0.28)' : 'rgba(0, 0, 0, 0.06)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = inThisTab ? 'rgba(0, 95, 175, 0.18)' : 'transparent' }}
                      >
                        <span>
                          <span style={{ fontWeight: 'bold' }}>{p.full_name}</span>
                          {' '}
                          <span style={{ color: 'var(--text-muted)' }}>{p.employee_id} · {p.department}</span>
                        </span>
                        {role && (
                          <span style={{
                            fontSize: '8px',
                            padding: '1px 4px',
                            background: role === activeTab ? '#005FAF' : 'var(--bg-secondary)',
                            color: role === activeTab ? '#FFF' : 'var(--text-muted)',
                            border: '1px solid var(--border-mid-dark)',
                            fontWeight: 'bold',
                          }}>
                            {role === 'attendee' ? '出席' : role === 'related' ? '相關' : '協助'}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              <div style={{ marginTop: '4px', fontSize: '8px', color: 'var(--text-muted)' }}>
                點擊人員加入「{activeTab === 'attendee' ? '出席人員' : activeTab === 'related' ? '相關通知' : '協助準備'}」 / 同類別再點即移除
              </div>
            </div>
          </div>

          {/* Notification options */}
          <div style={{ marginTop: '4px', padding: '6px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid-dark)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={useLine} onChange={e => setUseLine(e.target.checked)} />
              <span>同時推播 LINE 通知</span>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>（未綁定 LINE 的人員仍會收到 In-App 通知）</span>
            </label>
          </div>

          {error && (
            <div style={{ padding: '6px 8px', background: '#FFE0E0', border: '1px solid #C00000', color: '#800000', fontSize: '10px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border-mid-dark)', display: 'flex', justifyContent: 'flex-end', gap: '6px', background: 'var(--bg-secondary)' }}>
          <button onClick={onClose} disabled={submitting}
            style={{ ...btnStyle, padding: '4px 16px' }}>取消</button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ ...btnStyle, padding: '4px 16px', fontWeight: 'bold', background: '#005FAF', color: '#FFF', border: '1px solid #003F7F' }}>
            {submitting ? '建立中...' : '建立並通知'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  fontSize: '11px',
  fontFamily: 'monospace',
  border: '1px solid var(--border-mid-dark)',
  background: 'var(--bg-input, #FFFFFF)',
  color: 'var(--text-primary)',
  outline: 'none',
  height: '24px',
  boxSizing: 'border-box',
}

const btnStyle: React.CSSProperties = {
  fontSize: '11px',
  fontFamily: 'monospace',
  border: '1px solid var(--border-mid-dark)',
  background: 'var(--bg-window)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  outline: 'none',
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}
