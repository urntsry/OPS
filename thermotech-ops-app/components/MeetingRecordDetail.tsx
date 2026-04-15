'use client'

import { useState, useEffect } from 'react'
import { getDeadlinesByMeeting, getTasksByMeeting, updateDeadlineStatus, updateTaskStatus, type Meeting, type MeetingDeadline, type MeetingTask } from '@/lib/meetingApi'

interface MeetingRecordDetailProps {
  meeting: Meeting
  onClose: () => void
}

export default function MeetingRecordDetail({ meeting, onClose }: MeetingRecordDetailProps) {
  const [deadlines, setDeadlines] = useState<MeetingDeadline[]>([])
  const [tasks, setTasks] = useState<MeetingTask[]>([])
  const [showRawContent, setShowRawContent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [d, t] = await Promise.all([
          getDeadlinesByMeeting(meeting.id),
          getTasksByMeeting(meeting.id),
        ])
        setDeadlines(d)
        setTasks(t)
      } catch (e) {
        console.error('[MeetingDetail] Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [meeting.id])

  const toggleDeadline = async (id: string, current: string) => {
    const next = current === 'completed' ? 'pending' : 'completed'
    try {
      await updateDeadlineStatus(id, next as 'pending' | 'completed')
      setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: next as 'pending' | 'completed' } : d))
    } catch (e) { console.error(e) }
  }

  const toggleTask = async (id: string, current: string) => {
    const next = current === 'completed' ? 'pending' : 'completed'
    try {
      await updateTaskStatus(id, next as 'pending' | 'completed')
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: next as 'pending' | 'completed' } : t))
    } catch (e) { console.error(e) }
  }

  const analysis = meeting.ai_analysis as any

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        className="window"
        style={{
          width: '600px', maxWidth: '90vw', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className="titlebar" style={{ padding: '2px 6px', fontSize: '10px', flexShrink: 0 }}>
          <span>{meeting.title}</span>
          <button
            onClick={onClose}
            style={{
              width: '16px', height: '14px', fontSize: '10px', fontWeight: 'bold',
              backgroundColor: 'var(--bg-window)', color: 'var(--accent-red)',
              borderTop: '1px solid var(--border-light)', borderLeft: '1px solid var(--border-light)',
              borderRight: '1px solid var(--border-dark)', borderBottom: '1px solid var(--border-dark)',
              cursor: 'pointer', padding: 0, lineHeight: 1, outline: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '6px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>LOADING...</div>
          ) : (
            <>
              {/* Meta info */}
              <div className="inset" style={{ padding: '4px', marginBottom: '6px', display: 'flex', gap: '12px', fontSize: '10px', background: 'var(--bg-inset)', flexWrap: 'wrap' }}>
                <span>DATE: <strong>{meeting.meeting_date}</strong></span>
                <span>STATUS: <strong>{meeting.status.toUpperCase()}</strong></span>
                {(meeting as any).category?.name && (
                  <span>CATEGORY: <strong>{(meeting as any).category.name}</strong></span>
                )}
                {meeting.file_name && (
                  <span>FILE: <strong>{meeting.file_name}</strong></span>
                )}
              </div>

              {/* AI Summary */}
              {meeting.summary && (
                <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
                  <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>AI SUMMARY</div>
                  <div style={{ padding: '4px', fontSize: '10px' }}>{meeting.summary}</div>
                </div>
              )}

              {/* Deadlines */}
              {deadlines.length > 0 && (
                <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
                  <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
                    DEADLINES ({deadlines.length})
                  </div>
                  <div style={{ padding: '2px' }}>
                    {deadlines.map(d => (
                      <div
                        key={d.id}
                        className="eventlist-row"
                        onClick={() => toggleDeadline(d.id, d.status)}
                        style={{
                          display: 'flex', gap: '6px', alignItems: 'center',
                          padding: '2px 4px', cursor: 'pointer', fontSize: '10px',
                          borderBottom: '1px solid var(--table-border)',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace' }}>
                          {d.status === 'completed' ? '[V]' : '[ ]'}
                        </span>
                        {d.is_urgent && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>URGENT</span>}
                        <span style={{
                          flex: 1,
                          textDecoration: d.status === 'completed' ? 'line-through' : 'none',
                          color: d.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}>{d.description}</span>
                        {d.deadline_date && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '9px', whiteSpace: 'nowrap' }}>
                            {d.deadline_date}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
                  <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
                    TASKS ({tasks.length})
                  </div>
                  <div style={{ padding: '2px' }}>
                    {tasks.map(t => (
                      <div
                        key={t.id}
                        className="eventlist-row"
                        onClick={() => toggleTask(t.id, t.status)}
                        style={{
                          display: 'flex', gap: '6px', alignItems: 'center',
                          padding: '2px 4px', cursor: 'pointer', fontSize: '10px',
                          borderBottom: '1px solid var(--table-border)',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace' }}>
                          {t.status === 'completed' ? '[V]' : '[ ]'}
                        </span>
                        <span style={{ fontWeight: 'bold', minWidth: '50px' }}>{t.assignee_name}</span>
                        <span style={{
                          flex: 1,
                          textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                          color: t.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}>{t.task_description}</span>
                        {t.due_date && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '9px', whiteSpace: 'nowrap' }}>
                            {t.due_date}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Decisions */}
              {analysis?.key_decisions?.length > 0 && (
                <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
                  <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>KEY DECISIONS</div>
                  <div style={{ padding: '4px' }}>
                    {analysis.key_decisions.map((d: string, i: number) => (
                      <div key={i} style={{ fontSize: '10px', padding: '1px 0' }}>- {d}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Content toggle */}
              {meeting.raw_content && (
                <div className="window" style={{ padding: 0 }}>
                  <div
                    className="titlebar"
                    style={{ padding: '1px 6px', fontSize: '9px', cursor: 'pointer' }}
                    onClick={() => setShowRawContent(!showRawContent)}
                  >
                    <span>RAW CONTENT {showRawContent ? '▼' : '▶'}</span>
                  </div>
                  {showRawContent && (
                    <div className="inset" style={{ padding: '4px', maxHeight: '200px', overflow: 'auto', fontSize: '9px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: 'var(--bg-inset)', color: 'var(--text-primary)' }}>
                      {meeting.raw_content}
                    </div>
                  )}
                </div>
              )}

              {/* File Download */}
              {meeting.file_url && (
                <div style={{ marginTop: '6px' }}>
                  <a
                    href={meeting.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '10px', color: 'var(--accent-blue)', fontFamily: 'monospace' }}
                  >
                    DOWNLOAD: {meeting.file_name}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
