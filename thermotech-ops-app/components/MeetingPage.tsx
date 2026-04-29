'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getMeetings, getMeetingCategories, createMeetingCategory, deleteMeetingCategory,
  searchMeetings, getMeetingDeadlines, getMeetingTasks, updateMeetingTaskStatus,
  updateMeetingDeadlineStatus, deleteMeeting, updateMeeting,
  type Meeting, type MeetingCategory, type MeetingDeadline, type MeetingTask
} from '@/lib/meetingApi'
import {
  listScheduledMeetings, getMeetingParticipants, deleteMeeting as deleteScheduledMeeting,
  type Meeting as ScheduledMeeting, type ParticipantWithProfile,
} from '@/lib/meetingsApi'

type TabType = 'schedule' | 'records' | 'upload' | 'categories' | 'search' | 'create'

interface MeetingPageProps {
  isAdmin: boolean
  userProfile: any
  /** Deep-link target — when set, auto-switches to schedule tab and selects the meeting */
  selectedScheduledMeetingId?: string | null
  /** Allows deep-link to be cleared after consumption */
  onClearSelectedMeeting?: () => void
}

export default function MeetingPage({ isAdmin, userProfile, selectedScheduledMeetingId, onClearSelectedMeeting }: MeetingPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('schedule')

  // Auto-switch to schedule tab when a scheduled meeting deep-link arrives
  useEffect(() => {
    if (selectedScheduledMeetingId) setActiveTab('schedule')
  }, [selectedScheduledMeetingId])
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'no_key' | 'error'>('checking')
  const [analyzingCount, setAnalyzingCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  // Check AI API status + poll for analyzing meetings
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>

    const checkStatus = async () => {
      try {
        // Check how many meetings are pending/analyzing
        const meetings = await getMeetings()
        const analyzing = meetings.filter(m => m.status === 'analyzing').length
        const pending = meetings.filter(m => m.status === 'pending').length
        setAnalyzingCount(analyzing)
        setPendingCount(pending)

        // API health check
        const res = await fetch('/api/meetings/analyze')
        const data = await res.json()
        if (data.status === 'ok') {
          setAiStatus(data.ai_available ? 'connected' : 'no_key')
        } else {
          setAiStatus('error')
        }
      } catch {
        setAiStatus('error')
      }
    }

    checkStatus()
    interval = setInterval(checkStatus, 8000)
    return () => clearInterval(interval)
  }, [])

  const tabs: { id: TabType; label: string; show: boolean }[] = [
    { id: 'schedule', label: 'SCHEDULE', show: true },
    { id: 'records', label: 'RECORDS', show: true },
    { id: 'upload', label: 'UPLOAD', show: true },
    { id: 'categories', label: 'CATEGORIES', show: true },
    { id: 'search', label: 'SEARCH', show: true },
    { id: 'create', label: 'CREATE', show: true },
  ]

  const aiStatusLabel = () => {
    switch (aiStatus) {
      case 'checking': return { text: 'AI: CHECKING...', color: 'var(--text-muted)' }
      case 'connected': return { text: 'AI: CONNECTED', color: 'var(--status-success)' }
      case 'no_key': return { text: 'AI: NO API KEY', color: 'var(--status-warning)' }
      case 'error': return { text: 'AI: OFFLINE', color: 'var(--status-error)' }
    }
  }

  const statusInfo = aiStatusLabel()

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '1px', padding: '2px 4px 0', background: 'var(--bg-window)', borderBottom: '1px solid var(--border-mid-dark)', flexShrink: 0 }}>
        {tabs.filter(t => t.show).map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '3px 10px',
                fontSize: '9px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none',
                backgroundColor: isActive ? 'var(--active-bg)' : 'var(--bg-window)',
                color: isActive ? 'var(--active-text)' : 'var(--text-primary)',
                borderTop: '1px solid var(--border-light)',
                borderLeft: '1px solid var(--border-light)',
                borderRight: '1px solid var(--border-dark)',
                borderBottom: isActive ? '1px solid var(--active-bg)' : '1px solid var(--border-dark)',
                marginBottom: isActive ? '-1px' : '0',
                position: 'relative',
                zIndex: isActive ? 1 : 0,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px', background: 'var(--bg-window)' }}>
        {activeTab === 'schedule' && (
          <ScheduleTab
            selectedId={selectedScheduledMeetingId || null}
            onClearSelected={onClearSelectedMeeting}
            currentUserId={userProfile?.id}
          />
        )}
        {activeTab === 'records' && <RecordsTab />}
        {activeTab === 'upload' && <UploadTab userProfile={userProfile} />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'create' && <CreateTab />}
      </div>

      {/* AI Status Bar */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '2px 6px',
        fontSize: '9px',
        fontFamily: 'monospace',
        background: 'var(--bg-window)',
        borderTop: '1px solid var(--border-mid-dark)',
        color: 'var(--text-muted)',
      }}>
        {/* AI Connection Status */}
        <span style={{ color: statusInfo.color, fontWeight: 'bold' }}>
          {statusInfo.text}
        </span>

        {/* Separator */}
        <span style={{ color: 'var(--border-mid-dark)' }}>|</span>

        {/* Active analysis indicator */}
        {analyzingCount > 0 ? (
          <span style={{ color: 'var(--status-warning)' }}>
            ANALYZING: {analyzingCount} file{analyzingCount > 1 ? 's' : ''}...
          </span>
        ) : pendingCount > 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>
            PENDING: {pendingCount} in queue
          </span>
        ) : (
          <span>IDLE</span>
        )}

        {/* Gemini model */}
        <span style={{ marginLeft: 'auto' }}>MODEL: gemini-2.0-flash</span>
      </div>
    </div>
  )
}

// ============================================
// SCHEDULE TAB — 會議排程清單（從日曆雙擊建立的會議）
// 與 RECORDS（會議記錄）不同：這裡是「將召開或已召開但記錄未上傳」的會議
// ============================================
function ScheduleTab({ selectedId, onClearSelected, currentUserId }: {
  selectedId: string | null
  onClearSelected?: () => void
  currentUserId?: string
}) {
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ScheduledMeeting | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listScheduledMeetings(filter)
      setMeetings(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  // Auto-select on deep-link
  useEffect(() => {
    if (!selectedId || meetings.length === 0) return
    const m = meetings.find(x => x.id === selectedId)
    if (m) setSelected(m)
    // If not found in current filter (e.g. linked is past but filter=upcoming), switch filter to all
    else if (filter !== 'all') setFilter('all')
    onClearSelected?.()
  }, [selectedId, meetings, filter, onClearSelected])

  // Load participants when selecting a meeting
  useEffect(() => {
    if (!selected) { setParticipants([]); return }
    setLoadingParticipants(true)
    getMeetingParticipants(selected.id)
      .then(setParticipants)
      .catch(e => console.error(e))
      .finally(() => setLoadingParticipants(false))
  }, [selected])

  const handleDelete = async (m: ScheduledMeeting) => {
    if (!confirm(`刪除「${m.title}」？\n（同時會清除所有參與者通知關聯）`)) return
    try {
      await deleteScheduledMeeting(m.id)
      setMeetings(prev => prev.filter(x => x.id !== m.id))
      if (selected?.id === m.id) setSelected(null)
    } catch (e: any) {
      alert('刪除失敗: ' + (e.message || ''))
    }
  }

  const fmtDate = (d: string) => {
    const date = new Date(d)
    const today = new Date(); today.setHours(0,0,0,0)
    const target = new Date(d); target.setHours(0,0,0,0)
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
    const dateStr = `${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')}`
    if (diff === 0) return `${dateStr} 今天`
    if (diff === 1) return `${dateStr} 明天`
    if (diff > 0 && diff < 7) return `${dateStr} (${diff}天後)`
    if (diff < 0 && diff > -7) return `${dateStr} (${-diff}天前)`
    return dateStr
  }

  const fmtTime = (t: string | null) => t ? t.slice(0, 5) : ''

  const attendees = participants.filter(p => p.role === 'attendee')
  const helpers = participants.filter(p => p.role === 'helper')

  return (
    <div style={{ display: 'flex', gap: '6px', height: '100%', minHeight: 0 }}>
      {/* Left: list */}
      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
          <span style={{ color: 'var(--text-muted)' }}>FILTER:</span>
          {([
            { key: 'upcoming', label: '即將召開' },
            { key: 'past', label: '已過去' },
            { key: 'all', label: '全部' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                padding: '2px 8px',
                border: '1px solid var(--border-mid-dark)',
                background: filter === f.key ? 'var(--accent-blue)' : 'var(--bg-window)',
                color: filter === f.key ? '#FFF' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: filter === f.key ? 'bold' : 'normal',
                outline: 'none',
              }}
            >{f.label}</button>
          ))}
          <button
            onClick={load}
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              padding: '2px 8px',
              border: '1px solid var(--border-mid-dark)',
              background: 'var(--bg-window)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
              marginLeft: 'auto',
            }}
          >RELOAD</button>
        </div>

        {/* Hint */}
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '2px 0' }}>
          ※ 從日曆雙擊日期 → 選「meeting」→「進階建立會議」即可新增
        </div>

        {/* List */}
        <div className="inset" style={{ flex: 1, overflow: 'auto', background: 'var(--bg-inset)' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>載入中...</div>
          ) : meetings.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.4 }}>◎</div>
              <div>{filter === 'upcoming' ? '尚無即將召開的會議' : filter === 'past' ? '尚無歷史會議' : '尚無會議排程'}</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-mid-dark)' }}>
                  <th style={{ padding: '3px 5px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)' }}>DATE</th>
                  <th style={{ padding: '3px 5px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)' }}>TITLE</th>
                  <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', width: '60px' }}>RECORD</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map(m => {
                  const isSelected = selected?.id === m.id
                  return (
                    <tr
                      key={m.id}
                      className="eventlist-row"
                      onClick={() => setSelected(m)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--table-border)',
                        background: isSelected ? 'var(--accent-blue)' : 'transparent',
                        color: isSelected ? '#FFF' : 'var(--text-primary)',
                      }}
                    >
                      <td style={{ padding: '3px 5px', whiteSpace: 'nowrap', fontSize: '9px', color: isSelected ? '#FFF' : 'var(--text-muted)' }}>
                        {fmtDate(m.meeting_date)}
                        {m.start_time && <span style={{ marginLeft: '4px' }}>{fmtTime(m.start_time)}</span>}
                      </td>
                      <td style={{ padding: '3px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.title}
                        {m.location && <span style={{ marginLeft: '4px', fontSize: '8px', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>@ {m.location}</span>}
                      </td>
                      <td style={{ padding: '3px 5px', textAlign: 'center', fontSize: '9px' }}>
                        {m.record_uploaded ? (
                          <span style={{ color: isSelected ? '#80FF80' : 'var(--status-success)', fontWeight: 'bold' }}>已上傳</span>
                        ) : (
                          <span style={{ color: isSelected ? '#FFFF80' : 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div className="inset" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '20px', textAlign: 'center' }}>
            ← 點選左側會議查看詳情
          </div>
        ) : (
          <div className="inset" style={{ flex: 1, overflow: 'auto', padding: '10px', background: 'var(--bg-inset)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 'bold' }}>
                  {selected.meeting_date} {selected.start_time && `${fmtTime(selected.start_time)}${selected.end_time ? `-${fmtTime(selected.end_time)}` : ''}`}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                  {selected.title}
                </div>
                {selected.location && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    地點: {selected.location}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(selected)}
                style={{ fontSize: '9px', padding: '3px 8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', fontFamily: 'monospace' }}
                title="刪除會議"
              >
                刪除
              </button>
            </div>

            {/* Summary */}
            {selected.summary && (
              <div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>會議簡介</div>
                <div style={{ fontSize: '10px', color: 'var(--text-primary)', padding: '6px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid-dark)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                  {selected.summary}
                </div>
              </div>
            )}

            {/* Record status banner */}
            <div style={{
              padding: '4px 8px',
              fontSize: '10px',
              background: selected.record_uploaded ? 'rgba(0,160,0,0.15)' : 'rgba(255,140,0,0.15)',
              border: `1px solid ${selected.record_uploaded ? 'var(--status-success)' : 'var(--status-warning)'}`,
              color: selected.record_uploaded ? 'var(--status-success)' : 'var(--status-warning)',
            }}>
              {selected.record_uploaded
                ? '✓ 會議記錄已上傳'
                : new Date(selected.meeting_date) < new Date()
                  ? '⚠ 會議已結束，尚未上傳會議記錄'
                  : '◎ 等待會議召開'
              }
            </div>

            {/* Participants */}
            <div>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>
                出席人員 ({attendees.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                {loadingParticipants ? (
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>載入中...</span>
                ) : attendees.length === 0 ? (
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontStyle: 'italic' }}>無</span>
                ) : (
                  attendees.map(p => (
                    <span key={p.id} style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      background: 'var(--bg-window)',
                      border: '1px solid var(--border-mid-dark)',
                    }}>
                      <strong>{p.profile?.full_name || '未知'}</strong>
                      {p.profile?.department && <span style={{ color: 'var(--text-muted)', marginLeft: '3px' }}>({p.profile.department})</span>}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Helpers */}
            <div>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>
                協助準備人員 ({helpers.length})
              </div>
              {loadingParticipants ? (
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>載入中...</span>
              ) : helpers.length === 0 ? (
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontStyle: 'italic' }}>無</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {helpers.map(p => (
                    <div key={p.id} style={{
                      fontSize: '10px',
                      padding: '4px 6px',
                      background: 'var(--bg-window)',
                      border: '1px solid var(--border-mid-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <strong>{p.profile?.full_name || '未知'}</strong>
                      {p.profile?.department && <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>({p.profile.department})</span>}
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold' }}>
                        {p.helper_task || '（未指定任務）'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {currentUserId && (
              <div style={{ marginTop: 'auto', paddingTop: '6px', fontSize: '8px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-mid-dark)' }}>
                建立者: {selected.created_by === currentUserId ? '你' : '—'}
                <span style={{ marginLeft: '8px' }}>建立於: {new Date(selected.created_at).toLocaleString('zh-TW')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// RECORDS TAB
// ============================================
function RecordsTab() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [categories, setCategories] = useState<MeetingCategory[]>([])
  const [filterCat, setFilterCat] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [deadlines, setDeadlines] = useState<MeetingDeadline[]>([])
  const [tasks, setTasks] = useState<MeetingTask[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [m, c] = await Promise.all([
        getMeetings(filterCat ? { category_id: filterCat } : undefined),
        getMeetingCategories()
      ])
      setMeetings(m)
      setCategories(c)
    } catch (e) {
      console.error('Failed to load meetings:', e)
    }
    setLoading(false)
  }, [filterCat])

  useEffect(() => { loadData() }, [loadData])

  const openDetail = async (m: Meeting) => {
    setSelectedMeeting(m)
    try {
      const [d, t] = await Promise.all([getMeetingDeadlines(m.id), getMeetingTasks(m.id)])
      setDeadlines(d)
      setTasks(t)
    } catch { /* */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此會議紀錄？')) return
    await deleteMeeting(id)
    setSelectedMeeting(null)
    loadData()
  }

  if (selectedMeeting) {
    return (
      <MeetingDetail
        meeting={selectedMeeting}
        deadlines={deadlines}
        tasks={tasks}
        onBack={() => setSelectedMeeting(null)}
        onDelete={handleDelete}
        onTaskToggle={async (id, status) => {
          await updateMeetingTaskStatus(id, status === 'pending' ? 'completed' : 'pending')
          const t = await getMeetingTasks(selectedMeeting.id)
          setTasks(t)
        }}
        onDeadlineToggle={async (id, status) => {
          await updateMeetingDeadlineStatus(id, status === 'pending' ? 'completed' : 'pending')
          const d = await getMeetingDeadlines(selectedMeeting.id)
          setDeadlines(d)
        }}
      />
    )
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>FILTER:</span>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="inset"
          style={{ fontSize: '10px', fontFamily: 'monospace', padding: '1px 3px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        >
          <option value="">ALL</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn" onClick={loadData} style={{ fontSize: '9px', padding: '1px 6px' }}>RELOAD</button>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '9px' }}>
          TOTAL: {meetings.length}
        </span>
      </div>

      {/* Table */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', overflow: 'hidden auto' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>
        ) : meetings.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>- NO RECORDS -</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '70px' }}>DATE</th>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>TITLE</th>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '80px' }}>CATEGORY</th>
                <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '55px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map(m => (
                <tr
                  key={m.id}
                  className="eventlist-row"
                  onClick={() => openDetail(m)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--table-border)' }}
                >
                  <td style={{ padding: '2px 4px', color: 'var(--text-muted)', fontSize: '9px' }}>{m.meeting_date}</td>
                  <td style={{ padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</td>
                  <td style={{ padding: '1px 2px', fontSize: '9px' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={m.category_id || ''}
                      onChange={async (e) => {
                        const newCatId = e.target.value || null
                        await updateMeeting(m.id, { category_id: newCatId } as any)
                        loadData()
                      }}
                      className="inset"
                      style={{ fontSize: '9px', fontFamily: 'monospace', padding: '0 2px', background: 'var(--bg-input)', color: 'var(--text-primary)', width: '100%', cursor: 'pointer' }}
                    >
                      <option value="">-</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '9px' }}>
                    <span style={{ color: m.status === 'analyzed' ? 'var(--status-success)' : m.status === 'analyzing' ? 'var(--status-warning)' : 'var(--text-muted)' }}>
                      {m.status === 'analyzed' ? 'OK' : m.status === 'analyzing' ? 'AI...' : 'PEND'}
                    </span>
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
// MEETING DETAIL VIEW — Formal Meeting Record Format
// ============================================
function MeetingDetail({ meeting, deadlines, tasks, onBack, onDelete, onTaskToggle, onDeadlineToggle }: {
  meeting: Meeting
  deadlines: MeetingDeadline[]
  tasks: MeetingTask[]
  onBack: () => void
  onDelete: (id: string) => void
  onTaskToggle: (id: string, status: string) => void
  onDeadlineToggle: (id: string, status: string) => void
}) {
  const [showRaw, setShowRaw] = useState(false)
  const analysis = meeting.ai_analysis
  const info = analysis?.meeting_info || {}
  const sections = analysis?.content_sections || []

  const cellStyle: React.CSSProperties = { padding: '3px 6px', fontSize: '10px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', verticalAlign: 'top' }
  const labelStyle: React.CSSProperties = { ...cellStyle, fontWeight: 'bold', background: 'var(--bg-window)', width: '70px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }

  return (
    <div>
      {/* Nav bar */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
        <button className="btn" onClick={onBack} style={{ fontSize: '9px', padding: '1px 6px' }}>← BACK</button>
        <div style={{ flex: 1 }} />
        {meeting.file_url && (
          <a href={meeting.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '9px', color: 'var(--accent-blue)' }}>OPEN FILE</a>
        )}
        <button className="btn" onClick={() => onDelete(meeting.id)} style={{ fontSize: '9px', padding: '1px 6px', color: 'var(--accent-red)' }}>DEL</button>
      </div>

      {/* ====== Formal Meeting Record Document ====== */}
      <div className="window" style={{ padding: 0, marginBottom: '6px' }}>

        {/* Document Header */}
        <div style={{ background: 'var(--bg-inset)', padding: '8px 12px', borderBottom: '1px solid var(--border-mid-dark)', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{info.doc_number ? `表單編號 ${info.doc_number}` : ''}</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', margin: '4px 0', letterSpacing: '2px' }}>
            {info.company || '工德股份有限公司/振禹企業有限公司'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '6px' }}>會 議 記 錄</div>
        </div>

        {/* Meeting Info Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'monospace' }}>
          <tbody>
            <tr>
              <td style={labelStyle}>主　題</td>
              <td colSpan={3} style={cellStyle}>{info.subject || meeting.title}</td>
            </tr>
            <tr>
              <td style={labelStyle}>主　席</td>
              <td style={{ ...cellStyle, width: '35%' }}>{info.chairperson || '-'}</td>
              <td style={labelStyle}>記　錄</td>
              <td style={cellStyle}>{info.recorder || '-'}</td>
            </tr>
            <tr>
              <td style={labelStyle}>地　點</td>
              <td style={cellStyle}>{info.location || '-'}</td>
              <td style={labelStyle}>時　間</td>
              <td style={cellStyle}>{info.date || meeting.meeting_date}</td>
            </tr>
            <tr>
              <td style={labelStyle}>出席人員</td>
              <td colSpan={3} style={cellStyle}>
                {(info.attendees && info.attendees.length > 0) ? info.attendees.join('、') : '-'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Separator */}
        <div style={{ height: '2px', background: 'var(--border-mid-dark)' }} />

        {/* Meeting Content Sections */}
        <div style={{ padding: '8px 12px', background: 'var(--bg-inset)', minHeight: '80px' }}>
          {/* AI Summary */}
          {meeting.summary && (
            <div style={{ marginBottom: '8px', padding: '4px 6px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)', fontSize: '10px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-teal)', fontSize: '9px' }}>AI SUMMARY: </span>
              {meeting.summary}
            </div>
          )}

          {/* Structured Content Sections */}
          {sections.length > 0 ? (
            sections.map((section: any, idx: number) => (
              <div key={idx} style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '3px', borderBottom: '1px solid var(--border-mid-dark)', paddingBottom: '2px' }}>
                  {idx + 1}. {section.title}
                </div>
                {(section.items || []).map((item: string, iIdx: number) => (
                  <div key={iIdx} style={{ fontSize: '10px', paddingLeft: '12px', marginBottom: '2px', lineHeight: '1.4' }}>
                    • {item}
                  </div>
                ))}
              </div>
            ))
          ) : meeting.raw_content && !meeting.raw_content.startsWith('[IMAGE') ? (
            <div style={{ fontSize: '10px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
              {meeting.raw_content}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px', fontSize: '10px' }}>
              (尚無結構化內容)
            </div>
          )}

          {/* Key Decisions */}
          {analysis?.key_decisions?.length > 0 && (
            <div style={{ marginTop: '8px', padding: '4px 6px', border: '1px solid var(--accent-blue)', background: 'var(--bg-window)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9px', color: 'var(--accent-blue)', marginBottom: '2px' }}>重要決議</div>
              {analysis.key_decisions.map((d: string, i: number) => (
                <div key={i} style={{ fontSize: '10px', marginBottom: '1px' }}>• {d}</div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ height: '2px', background: 'var(--border-mid-dark)' }} />

        {/* Action Items / 待辦事項 */}
        <div style={{ padding: '6px 12px', background: 'var(--bg-inset)' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', letterSpacing: '2px' }}>待辦事項</div>
          {tasks.length === 0 && deadlines.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '10px', padding: '4px 0' }}>- 無 -</div>
          ) : (
            <>
              {tasks.map((t, idx) => (
                <div
                  key={t.id}
                  className="eventlist-row"
                  onClick={() => onTaskToggle(t.id, t.status)}
                  style={{ padding: '2px 0', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'flex-start', borderBottom: '1px solid var(--table-border)', fontSize: '10px' }}
                >
                  <span style={{ fontFamily: 'Courier New', flexShrink: 0 }}>{t.status === 'completed' ? '[V]' : '[ ]'}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)', minWidth: '50px', flexShrink: 0 }}>{t.assignee_name}</span>
                  <span style={{ flex: 1, textDecoration: t.status === 'completed' ? 'line-through' : 'none', color: t.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: '1.4' }}>
                    {t.task_description}
                  </span>
                  {t.due_date && <span style={{ color: 'var(--text-muted)', fontSize: '9px', flexShrink: 0 }}>{t.due_date}</span>}
                </div>
              ))}
              {deadlines.map(d => (
                <div
                  key={d.id}
                  className="eventlist-row"
                  onClick={() => onDeadlineToggle(d.id, d.status)}
                  style={{ padding: '2px 0', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', borderBottom: '1px solid var(--table-border)', fontSize: '10px' }}
                >
                  <span style={{ fontFamily: 'Courier New', flexShrink: 0 }}>{d.status === 'completed' ? '[V]' : '[ ]'}</span>
                  {d.is_urgent && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '9px', flexShrink: 0 }}>URGENT</span>}
                  <span style={{ flex: 1, textDecoration: d.status === 'completed' ? 'line-through' : 'none', color: d.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {d.description}
                  </span>
                  {d.deadline_date && <span style={{ color: 'var(--text-muted)', fontSize: '9px', flexShrink: 0 }}>{d.deadline_date}</span>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Collapsible raw content / original image */}
      <div className="window" style={{ padding: 0 }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px', cursor: 'pointer' }} onClick={() => setShowRaw(!showRaw)}>
          <span>{showRaw ? '▼' : '▶'} 原始內容 / 原始檔案</span>
          {meeting.file_name && <span style={{ fontWeight: 'normal', fontSize: '8px' }}>{meeting.file_name}</span>}
        </div>
        {showRaw && (
          <div style={{ padding: '4px 6px', background: 'var(--bg-inset)', maxHeight: '300px', overflow: 'auto' }}>
            {meeting.file_type === 'image' && meeting.file_url && (
              <div style={{ marginBottom: '6px', textAlign: 'center' }}>
                <img src={meeting.file_url} alt={meeting.file_name || ''} style={{ maxWidth: '100%', maxHeight: '250px', border: '1px solid var(--border-mid-dark)' }} />
              </div>
            )}
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '9px', color: 'var(--text-secondary)' }}>
              {meeting.raw_content || '(no content)'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// UPLOAD TAB — Batch Upload with Sequential AI Analysis
// ============================================
interface BatchFile {
  id: string
  file: File
  title: string
  date: string
  status: 'queued' | 'uploading' | 'analyzing' | 'done' | 'error'
  meetingId?: string
  error?: string
}

function UploadTab({ userProfile }: { userProfile: any }) {
  const [dragOver, setDragOver] = useState(false)
  const [queue, setQueue] = useState<BatchFile[]>([])
  const [processing, setProcessing] = useState(false)
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingRef = useRef(false)

  const addFiles = (files: FileList | File[]) => {
    const newItems: BatchFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      title: file.name.replace(/\.[^.]+$/, ''),
      date: defaultDate,
      status: 'queued' as const,
    }))
    setQueue(prev => [...prev, ...newItems])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(f => f.id !== id))
  }

  const updateQueueItem = (id: string, updates: Partial<BatchFile>) => {
    setQueue(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const processQueue = async () => {
    if (processingRef.current) return
    processingRef.current = true
    setProcessing(true)

    const items = queue.filter(f => f.status === 'queued')
    for (const item of items) {
      updateQueueItem(item.id, { status: 'uploading' })

      try {
        const formData = new FormData()
        formData.append('file', item.file)
        formData.append('title', item.title)
        formData.append('meeting_date', item.date)
        formData.append('uploaded_by', userProfile?.id || '')

        const res = await fetch('/api/meetings/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (data.success) {
          updateQueueItem(item.id, { status: 'analyzing', meetingId: data.meeting?.id })
          // AI analysis runs async on the server; mark as done after upload
          await new Promise(r => setTimeout(r, 500))
          updateQueueItem(item.id, { status: 'done', meetingId: data.meeting?.id })
        } else {
          updateQueueItem(item.id, { status: 'error', error: data.error })
        }
      } catch (e: any) {
        updateQueueItem(item.id, { status: 'error', error: e.message })
      }
    }

    processingRef.current = false
    setProcessing(false)
  }

  const queuedCount = queue.filter(f => f.status === 'queued').length
  const doneCount = queue.filter(f => f.status === 'done').length
  const errorCount = queue.filter(f => f.status === 'error').length

  const statusLabel = (s: BatchFile['status']) => {
    switch (s) {
      case 'queued': return { text: 'QUEUED', color: 'var(--text-muted)' }
      case 'uploading': return { text: 'UPLOADING...', color: 'var(--status-warning)' }
      case 'analyzing': return { text: 'AI ANALYZING...', color: 'var(--accent-teal)' }
      case 'done': return { text: 'DONE', color: 'var(--status-success)' }
      case 'error': return { text: 'ERROR', color: 'var(--status-error)' }
    }
  }

  return (
    <div>
      {/* Default date + controls */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>DEFAULT DATE:</span>
        <input
          className="inset"
          type="date"
          value={defaultDate}
          onChange={e => setDefaultDate(e.target.value)}
          style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <div style={{ flex: 1 }} />
        {queue.length > 0 && (
          <>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              Q:{queuedCount} OK:{doneCount} {errorCount > 0 && `ERR:${errorCount}`}
            </span>
            <button
              className="btn"
              onClick={processQueue}
              disabled={processing || queuedCount === 0}
              style={{ fontSize: '9px', padding: '2px 10px', fontWeight: 'bold' }}
            >
              {processing ? 'PROCESSING...' : `START (${queuedCount})`}
            </button>
          </>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="inset"
        style={{
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--hover-bg)' : 'var(--bg-inset)',
          marginBottom: '6px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              addFiles(e.target.files)
              e.target.value = ''
            }
          }}
        />
        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>DROP FILES HERE (BATCH)</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>or click to browse — select multiple files — PDF / DOCX / TXT / IMAGE</div>
      </div>

      {/* Queue List */}
      {queue.length > 0 && (
        <div className="window" style={{ padding: 0 }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
            <span>UPLOAD QUEUE ({queue.length})</span>
            {!processing && doneCount === queue.length && queue.length > 0 && (
              <button
                onClick={() => setQueue([])}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '9px', cursor: 'pointer', fontFamily: 'monospace' }}
              >CLEAR</button>
            )}
          </div>
          <div style={{ background: 'var(--bg-inset)', maxHeight: '300px', overflow: 'hidden auto', padding: '1px' }}>
            {queue.map((item, idx) => {
              const st = statusLabel(item.status)
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 6px',
                    borderBottom: '1px solid var(--table-border)',
                    fontSize: '10px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '9px', width: '16px', textAlign: 'right' }}>{idx + 1}</span>

                  {/* Editable title (only when queued) */}
                  {item.status === 'queued' ? (
                    <input
                      className="inset"
                      value={item.title}
                      onChange={e => updateQueueItem(item.id, { title: e.target.value })}
                      style={{ flex: 1, fontSize: '10px', fontFamily: 'monospace', padding: '1px 3px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    />
                  ) : (
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  )}

                  {/* Editable date (only when queued) */}
                  {item.status === 'queued' ? (
                    <input
                      className="inset"
                      type="date"
                      value={item.date}
                      onChange={e => updateQueueItem(item.id, { date: e.target.value })}
                      style={{ fontSize: '9px', fontFamily: 'monospace', padding: '1px 2px', background: 'var(--bg-input)', color: 'var(--text-primary)', width: '100px' }}
                    />
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px', width: '70px' }}>{item.date}</span>
                  )}

                  {/* File type badge */}
                  <span style={{ color: 'var(--text-muted)', fontSize: '8px', width: '30px', textAlign: 'center' }}>
                    {item.file.name.split('.').pop()?.toUpperCase()}
                  </span>

                  {/* Status */}
                  <span style={{ color: st.color, fontSize: '9px', fontWeight: 'bold', width: '75px', textAlign: 'right' }}>
                    {st.text}
                  </span>

                  {/* Remove button (only when queued) */}
                  {item.status === 'queued' && (
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      style={{ fontSize: '9px', width: '16px', height: '14px', padding: 0, border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Error details */}
          {queue.filter(f => f.error).map(f => (
            <div key={f.id} style={{ padding: '2px 6px', fontSize: '9px', color: 'var(--status-error)', background: 'var(--bg-inset)' }}>
              {f.title}: {f.error}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// CATEGORIES TAB
// ============================================
function CategoriesTab() {
  const [categories, setCategories] = useState<MeetingCategory[]>([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#000080')
  const [loading, setLoading] = useState(true)

  const loadCategories = async () => {
    setLoading(true)
    try {
      const c = await getMeetingCategories()
      setCategories(c)
    } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { loadCategories() }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await createMeetingCategory({ name: newName.trim(), color: newColor })
      setNewName('')
      loadCategories()
    } catch (e) {
      alert('Failed to create category')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return
    try {
      await deleteMeetingCategory(id)
      loadCategories()
    } catch { /* */ }
  }

  return (
    <div>
      {/* Add new */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
        <input
          className="inset"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="New category name"
          style={{ flex: 1, fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: '24px', height: '18px', border: '1px solid var(--border-mid-dark)', cursor: 'pointer' }} />
        <button className="btn" onClick={handleAdd} style={{ fontSize: '9px', padding: '1px 8px' }}>ADD</button>
      </div>

      {/* List */}
      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px' }}>
        {loading ? (
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>- NO CATEGORIES -</div>
        ) : categories.map(c => (
          <div key={c.id} className="eventlist-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', borderBottom: '1px solid var(--table-border)' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: c.color, display: 'inline-block', flexShrink: 0, border: '1px solid var(--border-mid-dark)' }} />
            <span style={{ flex: 1, fontWeight: 'bold' }}>{c.name}</span>
            {c.is_ai_suggested && <span style={{ color: 'var(--accent-teal)', fontSize: '8px' }}>AI</span>}
            <button
              onClick={() => handleDelete(c.id)}
              style={{ fontSize: '9px', width: '16px', height: '14px', padding: 0, border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', lineHeight: 1 }}
            >×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// SEARCH TAB
// ============================================
function SearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Meeting[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const r = await searchMeetings(query)
      setResults(r)
    } catch { setResults([]) }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <input
          className="inset"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search meetings..."
          style={{ flex: 1, fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <button className="btn" onClick={handleSearch} style={{ fontSize: '9px', padding: '1px 8px' }}>SEARCH</button>
      </div>

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', minHeight: '100px' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>SEARCHING...</div>
        ) : !searched ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>Enter keywords to search meeting records</div>
        ) : results.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>- NO RESULTS -</div>
        ) : (
          results.map(m => (
            <div key={m.id} className="eventlist-row" style={{ padding: '4px 6px', borderBottom: '1px solid var(--table-border)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 'bold' }}>{m.title}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{m.meeting_date}</span>
                {m.category && <span style={{ color: m.category.color, fontSize: '9px' }}>[{m.category.name}]</span>}
              </div>
              {m.summary && <div style={{ color: 'var(--text-secondary)', fontSize: '9px', marginTop: '2px' }}>{m.summary}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================
// CREATE TAB
// ============================================
function CreateTab() {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!title.trim()) { alert('Please enter a title'); return }
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch('/api/meetings/upload', {
        method: 'POST',
        body: (() => {
          const fd = new FormData()
          const blob = new Blob([content], { type: 'text/plain' })
          fd.append('file', blob, `${title}.txt`)
          fd.append('title', title)
          fd.append('meeting_date', date)
          return fd
        })(),
      })
      const data = await res.json()
      if (data.success) {
        setResult('Meeting created successfully. AI analysis in progress...')
        setTitle('')
        setContent('')
      } else {
        setResult('Error: ' + data.error)
      }
    } catch (e: any) {
      setResult('Error: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>TITLE:</span>
        <input className="inset" value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1, fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>DATE:</span>
        <input className="inset" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
      </div>

      <div style={{ marginBottom: '6px' }}>
        <textarea
          className="inset"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste meeting notes here..."
          style={{ width: '100%', minHeight: '180px', fontSize: '10px', fontFamily: 'monospace', padding: '4px', resize: 'vertical', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button className="btn" onClick={handleCreate} disabled={saving} style={{ fontSize: '9px', padding: '2px 12px' }}>
          {saving ? 'SAVING...' : 'CREATE & ANALYZE'}
        </button>
        {result && <span style={{ fontSize: '9px', color: result.startsWith('Error') ? 'var(--status-error)' : 'var(--status-success)' }}>{result}</span>}
      </div>
    </div>
  )
}
