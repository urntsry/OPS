'use client'

import { useState, useEffect, useRef } from 'react'
import { getEventColor, getTypesForUser, getTypesForRole, getEventLabel, type EventType } from '@/lib/eventTypes'

interface CalendarEvent {
  id?: number
  date: number
  title: string
  type: string
  done?: boolean
  /** Optional preview content shown in event popup */
  content?: string
  /** Optional link to open more details (e.g. meeting/bulletin module) */
  detailLink?: string
}

interface CalendarProps {
  year: number
  month: number
  events?: CalendarEvent[]
  onMonthChange?: (year: number, month: number) => void
  onToggleEvent?: (id: number) => void
  onDeleteEvent?: (id: number) => void
  onAddEvent?: (data: { title: string; type: string; dates: string[] }) => void
  /** Called when user clicks "進階" button while creating a meeting event.
   *  Parent should open MeetingCreateModal pre-filled with title + date. */
  onAdvancedMeeting?: (data: { title: string; date: string }) => void
  hideWeekend?: boolean
  compact?: boolean
  userRole?: string
  userId?: string
  userDepartment?: string
}

// Pure event types (not tasks) — clicking shows info popup instead of toggling done
const PURE_EVENT_TYPES = new Set(['public', 'event', 'meeting', 'visit', 'training'])

export default function Calendar({
  year, month, events = [], onMonthChange,
  onToggleEvent, onDeleteEvent, onAddEvent, onAdvancedMeeting,
  hideWeekend = false, compact = false, userRole = 'user',
  userId = '', userDepartment = ''
}: CalendarProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  // Event info popup state
  const [popupEvent, setPopupEvent] = useState<{ event: CalendarEvent; x: number; y: number } | null>(null)
  const availableTypes = userId ? getTypesForUser(userId, userDepartment, userRole) : getTypesForRole(userRole)
  const [newType, setNewType] = useState(availableTypes[0]?.id || 'routine')
  const [extraDates, setExtraDates] = useState<string[]>([])
  const [newExtraDate, setNewExtraDate] = useState('')
  const calendarRef = useRef<HTMLDivElement>(null)

  // Click outside calendar → close editing mode
  useEffect(() => {
    if (editingDay === null) return
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setEditingDay(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingDay])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDate = isCurrentMonth ? today.getDate() : -1

  const getAdjustedDay = (day: number) => {
    if (day === 0) return 6
    if (day === 6) return 0
    return day
  }
  const adjustedFirstDay = getAdjustedDay(firstDayOfWeek)
  const daysToShow = hideWeekend ? 5 : 7

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = Array(adjustedFirstDay).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const getEventsForDay = (day: number) => {
    const dayEvents = events.filter(e => e.date === day)
    // Sort: undone first, done last
    return dayEvents.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
  }

  const allWeekDays = ['六', '一', '二', '三', '四', '五', '日']
  const weekDays = hideWeekend ? allWeekDays.slice(1, 6) : allWeekDays
  const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

  const handlePrevMonth = () => {
    if (!onMonthChange) return
    onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)
    setEditingDay(null)
  }

  const handleNextMonth = () => {
    if (!onMonthChange) return
    onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1)
    setEditingDay(null)
  }

  const handleDoubleClick = (day: number) => {
    if (editingDay === day) {
      setEditingDay(null)
    } else {
      setEditingDay(day)
      setNewTitle('')
      setNewType(availableTypes[0]?.id || 'routine')
      setExtraDates([])
      setNewExtraDate('')
    }
  }

  const handleAddSubmit = (day: number) => {
    if (!newTitle.trim() || !onAddEvent) return
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const allDates = [isoDate, ...extraDates]
    onAddEvent({ title: newTitle.trim(), type: newType, dates: allDates })
    setNewTitle('')
    setExtraDates([])
    setNewExtraDate('')
  }

  const addExtraDate = () => {
    if (newExtraDate && !extraDates.includes(newExtraDate)) {
      setExtraDates([...extraDates, newExtraDate])
      setNewExtraDate('')
    }
  }

  const fontSize = compact ? '10px' : '11px'
  const eventFontSize = compact ? '8px' : '9px'
  const cellHeight = compact ? '60px' : '120px'
  const eventAreaHeight = compact ? '42px' : '100px'

  return (
    <div ref={calendarRef} className="window" style={{ padding: 0, width: '100%' }}>
      {/* Header */}
      <div className="titlebar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: compact ? '3px 6px' : '3px 8px' }}>
        <button onClick={handlePrevMonth} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.5)', color: '#FFF', padding: '1px 6px', fontSize: '11px', cursor: 'pointer', lineHeight: 1, outline: 'none' }}>◀</button>
        <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px' }}>
          {year}年{monthNames[month]}月
        </div>
        <button onClick={handleNextMonth} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.5)', color: '#FFF', padding: '1px 6px', fontSize: '11px', cursor: 'pointer', lineHeight: 1, outline: 'none' }}>▶</button>
      </div>

      {/* Calendar Grid */}
      <div className="inset" style={{ background: 'var(--bg-inset)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {weekDays.map((day, idx) => {
                const isWeekendHeader = !hideWeekend && (idx === 0 || idx === 6)
                return (
                  <th key={day} style={{ textAlign: 'center', padding: compact ? '1px' : '2px', background: 'var(--bg-window)', border: '1px solid var(--border-mid-dark)', width: `${100 / daysToShow}%`, fontSize, color: isWeekendHeader ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                    {day}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIdx) => (
              <tr key={weekIdx}>
                {(hideWeekend ? week.slice(1, 6) : week).map((day, dayIdx) => {
                  const dayEvents = day ? getEventsForDay(day) : []
                  const isWeekend = !hideWeekend && (dayIdx === 0 || dayIdx === 6)
                  const isToday = day === todayDate
                  const isEditing = day === editingDay
                  return (
                    <td
                      key={dayIdx}
                      className={day ? 'cal-cell' : ''}
                      style={{
                        border: isToday ? '2px solid var(--accent-teal)' : '1px solid var(--border-mid-dark)',
                        backgroundColor: isToday ? 'var(--hover-bg)' : 'var(--bg-inset)',
                        verticalAlign: 'top',
                        cursor: day ? 'default' : 'default',
                        height: cellHeight,
                        padding: compact ? '2px' : '3px',
                        fontSize,
                        color: isWeekend ? 'var(--text-muted)' : 'var(--text-primary)',
                        overflow: 'hidden',
                      }}
                      onDoubleClick={() => day && handleDoubleClick(day)}
                    >
                      {day && (
                        <>
                          {/* Day number row */}
                          <div style={{ fontWeight: 'bold', marginBottom: '1px', fontSize, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <span>{day}</span>
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                              {isToday && <span style={{ fontSize: '7px', color: 'var(--accent-teal)', fontWeight: 'bold' }}>TODAY</span>}
                              {dayEvents.length > 0 && <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}>{dayEvents.length}</span>}
                            </div>
                          </div>

                          {/* Events — scrollable */}
                          <div style={{ overflow: 'hidden auto', maxHeight: isEditing ? `calc(${eventAreaHeight} - 26px)` : eventAreaHeight }}>
                            {dayEvents.map((event, idx) => {
                              const isPureEvent = PURE_EVENT_TYPES.has(event.type)
                              const handleEventClick = (e: React.MouseEvent) => {
                                if (isEditing) return
                                e.stopPropagation()
                                if (isPureEvent) {
                                  // Open info popup near click position
                                  setPopupEvent({ event, x: e.clientX, y: e.clientY })
                                } else if (event.id && onToggleEvent) {
                                  // Task types: toggle completion
                                  onToggleEvent(event.id)
                                }
                              }
                              return (
                              <div
                                key={event.id || idx}
                                onClick={handleEventClick}
                                onMouseEnter={e => {
                                  const el = e.currentTarget as HTMLElement
                                  el.style.background = 'var(--bg-hover, rgba(0,95,175,0.12))'
                                  el.style.transform = 'translateX(1px)'
                                }}
                                onMouseLeave={e => {
                                  const el = e.currentTarget as HTMLElement
                                  el.style.background = 'transparent'
                                  el.style.transform = 'none'
                                }}
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: eventFontSize,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  marginBottom: '1px',
                                  lineHeight: 1.3,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  opacity: event.done ? 0.45 : 1,
                                  cursor: isEditing ? 'default' : (isPureEvent || event.id) ? 'pointer' : 'default',
                                  padding: '1px 2px',
                                  borderRadius: '1px',
                                  transition: 'background 0.08s, transform 0.08s',
                                }}
                                title={`${getEventLabel(event.type)}: ${event.title}${isPureEvent ? '（點擊查看詳情）' : event.id ? '（點擊切換完成）' : ''}`}
                              >
                                <span style={{ width: '3px', height: '10px', backgroundColor: getEventColor(event.type), flexShrink: 0, display: 'inline-block' }} />
                                <span style={{
                                  color: event.done ? 'var(--text-muted)' : getEventColor(event.type),
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  textDecoration: event.done ? 'line-through' : 'none',
                                  flex: 1,
                                }}>
                                  {event.title}
                                </span>
                                {/* Edit controls — only visible in edit mode */}
                                {isEditing && event.id && (
                                  <span style={{ display: 'flex', gap: '1px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => onToggleEvent && onToggleEvent(event.id!)}
                                      title={event.done ? '標記未完成' : '標記完成'}
                                      style={{ width: '14px', height: '12px', fontSize: '8px', fontFamily: 'Courier New', padding: 0, border: '1px solid var(--border-mid-dark)', background: event.done ? 'var(--status-success)' : 'var(--bg-window)', color: event.done ? '#FFF' : 'var(--text-primary)', cursor: 'pointer', outline: 'none', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >{event.done ? '✓' : '○'}</button>
                                    <button
                                      onClick={() => { if (onDeleteEvent && confirm(`刪除「${event.title}」？`)) onDeleteEvent(event.id!) }}
                                      title="刪除"
                                      style={{ width: '14px', height: '12px', fontSize: '8px', padding: 0, border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', outline: 'none', lineHeight: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >×</button>
                                  </span>
                                )}
                              </div>
                              )
                            })}
                          </div>

                          {/* Inline add — directly in the cell */}
                          {isEditing && (
                            <div onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} style={{ marginTop: '4px', borderTop: '1px solid var(--border-mid-dark)', paddingTop: '4px' }}>
                              <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                                <input
                                  type="text"
                                  value={newTitle}
                                  onChange={e => setNewTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddSubmit(day)
                                    if (e.key === 'Escape') setEditingDay(null)
                                  }}
                                  placeholder="+ 新增事件 / Enter 確認"
                                  autoFocus
                                  style={{ flex: 1, minWidth: 0, padding: '4px 6px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', height: '24px', boxSizing: 'border-box' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                                <select
                                  value={newType}
                                  onChange={e => setNewType(e.target.value)}
                                  style={{ flex: 1, minWidth: 0, padding: '3px 4px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', height: '24px', boxSizing: 'border-box' }}
                                >
                                  {availableTypes.map((t: EventType) => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                  ))}
                                </select>
                                <button onClick={() => handleAddSubmit(day)} style={{ fontSize: '10px', fontFamily: 'monospace', padding: '3px 10px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', fontWeight: 'bold', height: '24px', boxSizing: 'border-box' }}>OK</button>
                              </div>
                              {/* Advanced — only visible for meeting type */}
                              {newType === 'meeting' && onAdvancedMeeting && (
                                <button
                                  onClick={() => {
                                    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    onAdvancedMeeting({ title: newTitle, date: isoDate })
                                    setEditingDay(null)
                                  }}
                                  style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '3px 6px', marginBottom: '3px', border: '1px solid #003F7F', background: '#005FAF', color: '#FFF', cursor: 'pointer', outline: 'none', fontWeight: 'bold', height: '22px', boxSizing: 'border-box' }}
                                  title="開啟進階建立視窗：選擇出席/相關/協助人員、自動發送通知"
                                >
                                  ◎ 進階建立會議（含人員 / 通知）
                                </button>
                              )}
                              {/* Extra dates */}
                              {extraDates.length > 0 && (
                                <div style={{ marginBottom: '3px' }}>
                                  {extraDates.map(d => (
                                    <div key={d} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', padding: '1px 3px', alignItems: 'center' }}>
                                      <span>+{d}</span>
                                      <span onClick={() => setExtraDates(extraDates.filter(x => x !== d))} style={{ color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px' }}>×</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '3px' }}>
                                <input type="date" value={newExtraDate} onChange={e => setNewExtraDate(e.target.value)} style={{ flex: 1, minWidth: 0, fontSize: '10px', fontFamily: 'monospace', padding: '3px 4px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', height: '22px', boxSizing: 'border-box' }} />
                                <button onClick={addExtraDate} style={{ fontSize: '10px', fontFamily: 'monospace', padding: '3px 6px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', height: '22px', boxSizing: 'border-box' }}>+ 日</button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Event info popup */}
      {popupEvent && (
        <EventInfoPopup
          event={popupEvent.event}
          x={popupEvent.x}
          y={popupEvent.y}
          year={year}
          month={month}
          onClose={() => setPopupEvent(null)}
          onDelete={onDeleteEvent}
        />
      )}
    </div>
  )
}

// ============================================
// EVENT INFO POPUP
// 純事件 (event/meeting/visit/training/public) 點擊後顯示的小窗
// ============================================
function EventInfoPopup({ event, x, y, year, month, onClose, onDelete }: {
  event: CalendarEvent
  x: number
  y: number
  year: number
  month: number
  onClose: () => void
  onDelete?: (id: number) => void
}) {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose()
    }
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 50)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  // Clamp position so popup stays in viewport
  const POPUP_W = 280
  const POPUP_H = 200
  const left = Math.min(x, window.innerWidth - POPUP_W - 10)
  const top = Math.min(y, window.innerHeight - POPUP_H - 10)
  const color = getEventColor(event.type)
  const label = getEventLabel(event.type)
  const dateStr = `${year}/${String(month + 1).padStart(2, '0')}/${String(event.date).padStart(2, '0')}`

  return (
    <div
      ref={popupRef}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left,
        top,
        width: POPUP_W,
        zIndex: 10500,
        fontFamily: 'monospace',
        backgroundColor: 'var(--bg-window)',
        borderTop: '2px solid var(--border-light)',
        borderLeft: '2px solid var(--border-light)',
        borderRight: '2px solid var(--border-dark)',
        borderBottom: '2px solid var(--border-dark)',
        boxShadow: '3px 3px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Title bar */}
      <div className="titlebar" style={{
        padding: '3px 6px',
        fontSize: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: color,
      }}>
        <span style={{ fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label} 事件
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', padding: 0, lineHeight: 1 }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 'bold' }}>
          {dateStr}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '6px', wordBreak: 'break-word' }}>
          {event.title}
        </div>
        <div style={{
          fontSize: '10px',
          color: 'var(--text-primary)',
          padding: '6px 8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-mid-dark)',
          minHeight: '50px',
          maxHeight: '120px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.4,
        }}>
          {event.content || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>（此事件未填寫詳細內容）</span>}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '4px 8px',
        borderTop: '1px solid var(--border-mid-dark)',
        display: 'flex',
        gap: '4px',
        background: 'var(--bg-secondary)',
      }}>
        {event.detailLink && (
          <a
            href={event.detailLink}
            style={{ fontSize: '9px', padding: '3px 8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'none', fontFamily: 'monospace' }}
          >
            完整詳情 →
          </a>
        )}
        <div style={{ flex: 1 }} />
        {event.id && onDelete && (
          <button
            onClick={() => {
              if (confirm(`刪除「${event.title}」？`)) {
                onDelete(event.id!)
                onClose()
              }
            }}
            style={{ fontSize: '9px', padding: '3px 8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            刪除
          </button>
        )}
        <button
          onClick={onClose}
          style={{ fontSize: '9px', padding: '3px 8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}
        >
          關閉
        </button>
      </div>
    </div>
  )
}
