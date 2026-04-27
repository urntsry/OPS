'use client'

import { useState } from 'react'
import { getEventColor, getTypesForRole, getEventLabel, type EventType } from '@/lib/eventTypes'

interface CalendarEvent {
  id?: number
  date: number
  title: string
  type: string
  done?: boolean
}

interface CalendarProps {
  year: number
  month: number
  events?: CalendarEvent[]
  onMonthChange?: (year: number, month: number) => void
  onToggleEvent?: (id: number) => void
  onDeleteEvent?: (id: number) => void
  onAddEvent?: (data: { title: string; type: string; dates: string[] }) => void
  hideWeekend?: boolean
  compact?: boolean
  userRole?: string
}

export default function Calendar({
  year, month, events = [], onMonthChange,
  onToggleEvent, onDeleteEvent, onAddEvent,
  hideWeekend = false, compact = false, userRole = 'user'
}: CalendarProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const availableTypes = getTypesForRole(userRole)
  const [newType, setNewType] = useState(availableTypes[0]?.id || 'routine')
  const [extraDates, setExtraDates] = useState<string[]>([])
  const [newExtraDate, setNewExtraDate] = useState('')

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
    <div className="window" style={{ padding: 0, width: '100%' }}>
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
                            {dayEvents.map((event, idx) => (
                              <div
                                key={event.id || idx}
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
                                }}
                                title={`${getEventLabel(event.type)}: ${event.title}`}
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
                                    >{event.done ? 'V' : ' '}</button>
                                    <button
                                      onClick={() => { if (onDeleteEvent && confirm(`刪除「${event.title}」？`)) onDeleteEvent(event.id!) }}
                                      title="刪除"
                                      style={{ width: '14px', height: '12px', fontSize: '8px', padding: 0, border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', outline: 'none', lineHeight: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >×</button>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Inline add — directly in the cell */}
                          {isEditing && (
                            <div onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} style={{ marginTop: '2px', borderTop: '1px solid var(--border-mid-dark)', paddingTop: '2px' }}>
                              <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                                <input
                                  type="text"
                                  value={newTitle}
                                  onChange={e => setNewTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddSubmit(day)
                                    if (e.key === 'Escape') setEditingDay(null)
                                  }}
                                  placeholder="+ new"
                                  autoFocus
                                  style={{ flex: 1, minWidth: 0, padding: '1px 3px', fontSize: '9px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                <select
                                  value={newType}
                                  onChange={e => setNewType(e.target.value)}
                                  style={{ flex: 1, minWidth: 0, padding: '0 2px', fontSize: '8px', fontFamily: 'monospace', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }}
                                >
                                  {availableTypes.map((t: EventType) => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                  ))}
                                </select>
                                <button onClick={() => handleAddSubmit(day)} style={{ fontSize: '8px', fontFamily: 'monospace', padding: '0 4px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}>OK</button>
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
    </div>
  )
}
