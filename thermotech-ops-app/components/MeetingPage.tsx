'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getMeetings, getMeetingCategories, createMeetingCategory, deleteMeetingCategory,
  searchMeetings, getMeetingDeadlines, getMeetingTasks, updateMeetingTaskStatus,
  updateMeetingDeadlineStatus, deleteMeeting,
  type Meeting, type MeetingCategory, type MeetingDeadline, type MeetingTask
} from '@/lib/meetingApi'

type TabType = 'records' | 'upload' | 'categories' | 'search' | 'create'

interface MeetingPageProps {
  isAdmin: boolean
  userProfile: any
}

export default function MeetingPage({ isAdmin, userProfile }: MeetingPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('records')

  const tabs: { id: TabType; label: string; show: boolean }[] = [
    { id: 'records', label: 'RECORDS', show: true },
    { id: 'upload', label: 'UPLOAD', show: true },
    { id: 'categories', label: 'CATEGORIES', show: true },
    { id: 'search', label: 'SEARCH', show: true },
    { id: 'create', label: 'CREATE', show: true },
  ]

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
        {activeTab === 'records' && <RecordsTab />}
        {activeTab === 'upload' && <UploadTab userProfile={userProfile} />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'create' && <CreateTab />}
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
                  <td style={{ padding: '2px 4px', fontSize: '9px' }}>
                    {m.category ? (
                      <span style={{ color: m.category.color, fontWeight: 'bold' }}>{m.category.name}</span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
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
// MEETING DETAIL VIEW
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
        <button className="btn" onClick={onBack} style={{ fontSize: '9px', padding: '1px 6px' }}>← BACK</button>
        <span style={{ fontWeight: 'bold', flex: 1 }}>{meeting.title}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{meeting.meeting_date}</span>
        <button className="btn" onClick={() => onDelete(meeting.id)} style={{ fontSize: '9px', padding: '1px 6px', color: 'var(--accent-red)' }}>DEL</button>
      </div>

      {/* Summary */}
      {meeting.summary && (
        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>AI SUMMARY</div>
          <div style={{ padding: '4px 6px', fontSize: '10px', background: 'var(--bg-inset)' }}>{meeting.summary}</div>
        </div>
      )}

      {/* Key Decisions */}
      {analysis?.key_decisions?.length > 0 && (
        <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>KEY DECISIONS</div>
          <div style={{ padding: '4px 6px', background: 'var(--bg-inset)' }}>
            {analysis.key_decisions.map((d: string, i: number) => (
              <div key={i} style={{ fontSize: '10px', marginBottom: '2px' }}>• {d}</div>
            ))}
          </div>
        </div>
      )}

      {/* Deadlines */}
      <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
          <span>DEADLINES ({deadlines.length})</span>
        </div>
        <div style={{ padding: '2px', background: 'var(--bg-inset)', minHeight: '30px' }}>
          {deadlines.length === 0 ? (
            <div style={{ padding: '4px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>- NONE -</div>
          ) : deadlines.map(d => (
            <div
              key={d.id}
              className="eventlist-row"
              onClick={() => onDeadlineToggle(d.id, d.status)}
              style={{ padding: '2px 4px', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', borderBottom: '1px solid var(--table-border)' }}
            >
              <span style={{ fontSize: '10px', fontFamily: 'Courier New' }}>{d.status === 'completed' ? '[V]' : '[ ]'}</span>
              <span style={{ flex: 1, textDecoration: d.status === 'completed' ? 'line-through' : 'none', color: d.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {d.description}
              </span>
              {d.is_urgent && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '9px' }}>URGENT</span>}
              {d.deadline_date && <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{d.deadline_date}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
          <span>TASKS ({tasks.length})</span>
        </div>
        <div style={{ padding: '2px', background: 'var(--bg-inset)', minHeight: '30px' }}>
          {tasks.length === 0 ? (
            <div style={{ padding: '4px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>- NONE -</div>
          ) : tasks.map(t => (
            <div
              key={t.id}
              className="eventlist-row"
              onClick={() => onTaskToggle(t.id, t.status)}
              style={{ padding: '2px 4px', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', borderBottom: '1px solid var(--table-border)' }}
            >
              <span style={{ fontSize: '10px', fontFamily: 'Courier New' }}>{t.status === 'completed' ? '[V]' : '[ ]'}</span>
              <span style={{ fontWeight: 'bold', fontSize: '9px', color: 'var(--accent-blue)', minWidth: '50px' }}>{t.assignee_name}</span>
              <span style={{ flex: 1, textDecoration: t.status === 'completed' ? 'line-through' : 'none', color: t.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {t.task_description}
              </span>
              {t.due_date && <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{t.due_date}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Raw Content Toggle */}
      <div className="window" style={{ padding: 0 }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px', cursor: 'pointer' }} onClick={() => setShowRaw(!showRaw)}>
          <span>{showRaw ? '▼' : '▶'} RAW CONTENT</span>
          {meeting.file_name && <span style={{ fontWeight: 'normal', fontSize: '8px' }}>{meeting.file_name}</span>}
        </div>
        {showRaw && (
          <div style={{ padding: '4px 6px', background: 'var(--bg-inset)', maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '9px', color: 'var(--text-secondary)' }}>
            {meeting.raw_content || '(no content)'}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// UPLOAD TAB
// ============================================
function UploadTab({ userProfile }: { userProfile: any }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title || file.name)
    formData.append('meeting_date', meetingDate)
    formData.append('uploaded_by', userProfile?.id || '')

    try {
      const res = await fetch('/api/meetings/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setUploadResult({ success: true, meeting: data.meeting })
        setTitle('')
      } else {
        setUploadResult({ success: false, error: data.error })
      }
    } catch (e: any) {
      setUploadResult({ success: false, error: e.message })
    }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      {/* Input fields */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>TITLE:</span>
        <input
          className="inset"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="會議標題（選填）"
          style={{ flex: 1, fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>DATE:</span>
        <input
          className="inset"
          type="date"
          value={meetingDate}
          onChange={e => setMeetingDate(e.target.value)}
          style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="inset"
        style={{
          padding: '30px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--hover-bg)' : 'var(--bg-inset)',
          borderStyle: dragOver ? 'dashed' : undefined,
          marginBottom: '6px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {uploading ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--status-warning)' }}>UPLOADING & ANALYZING...</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>AI is processing the document</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>DROP FILE HERE</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>or click to browse — PDF / DOCX / TXT / IMAGE</div>
          </div>
        )}
      </div>

      {/* Result */}
      {uploadResult && (
        <div className="window" style={{ padding: 0 }}>
          <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
            {uploadResult.success ? 'UPLOAD SUCCESS' : 'UPLOAD FAILED'}
          </div>
          <div style={{ padding: '6px', background: 'var(--bg-inset)', fontSize: '10px' }}>
            {uploadResult.success ? (
              <div>
                <div style={{ color: 'var(--status-success)', marginBottom: '4px' }}>File uploaded successfully. AI analysis in progress...</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>Meeting ID: {uploadResult.meeting?.id}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>Switch to RECORDS tab to view results.</div>
              </div>
            ) : (
              <div style={{ color: 'var(--status-error)' }}>Error: {uploadResult.error}</div>
            )}
          </div>
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
