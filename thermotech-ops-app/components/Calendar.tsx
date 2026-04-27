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

                          {/* Events — scrollable, click to toggle */}
                          <div style={{ overflow: 'hidden auto', maxHeight: isEditing ? `calc(${eventAreaHeight} - 26px)` : eventAreaHeight }}>
                            {dayEvents.map((event, idx) => (
                              <div
                                key={event.id || idx}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onToggleEvent && event.id) onToggleEvent(event.id)
                                }}
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: eventFontSize,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  marginBottom: '1px',
                                  lineHeight: 1.2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  cursor: onToggleEvent && event.id ? 'pointer' : 'default',
                                  opacity: event.done ? 0.45 : 1,
                                }}
                                title={`${event.done ? '✓ ' : ''}${getEventLabel(event.type)}: ${event.title} (click to toggle)`}
                              >
                                <span style={{ width: '3px', height: '10px', backgroundColor: getEventColor(event.type), flexShrink: 0, display: 'inline-block' }} />
                                <span style={{
                                  color: event.done ? 'var(--text-muted)' : getEventColor(event.type),
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  textDecoration: event.done ? 'line-through' : 'none',
                                }}>
                                  {event.title}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Inline add form — overlays from cell on double-click */}
                          {isEditing && (
                            <div
                              onClick={e => e.stopPropagation()}
                              onDoubleClick={e => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                zIndex: 50,
                                backgroundColor: 'var(--bg-window)',
                                borderTop: '2px solid var(--border-light)',
                                borderLeft: '2px solid var(--border-light)',
                                borderRight: '2px solid var(--border-dark)',
                                borderBottom: '2px solid var(--border-dark)',
                                boxShadow: '2px 2px 6px rgba(0,0,0,0.3)',
                                padding: '4px',
                                fontFamily: 'monospace',
                                fontSize: '9px',
                              }}
                            >
                              {/* Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '10px' }}>
                                  {day}日 新增事項
                                </span>
                                <button
                                  onClick={() => setEditingDay(null)}
                                  style={{ background: 'none', border: '1px solid var(--border-mid-dark)', color: 'var(--accent-red)', fontSize: '9px', cursor: 'pointer', padding: '0 3px', lineHeight: 1, outline: 'none', fontWeight: 'bold' }}
                                >×</button>
                              </div>

                              {/* Title */}
                              <input
                                type="text"
                                className="inset"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddSubmit(day)
                                  if (e.key === 'Escape') setEditingDay(null)
                                }}
                                placeholder="事項標題"
                                autoFocus
                                style={{ width: '100%', padding: '2px 3px', fontSize: '9px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)', marginBottom: '3px' }}
                              />

                              {/* Type selector */}
                              <select
                                className="inset"
                                value={newType}
                                onChange={e => setNewType(e.target.value)}
                                style={{ width: '100%', padding: '1px 3px', fontSize: '9px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)', marginBottom: '3px' }}
                              >
                                {availableTypes.map((t: EventType) => (
                                  <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                              </select>

                              {/* Extra dates */}
                              {extraDates.length > 0 && (
                                <div style={{ marginBottom: '3px', padding: '2px', background: 'var(--bg-inset)', border: '1px solid var(--border-mid-dark)' }}>
                                  {extraDates.map(d => (
                                    <div key={d} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '1px 2px' }}>
                                      <span>+ {d}</span>
                                      <span onClick={() => setExtraDates(extraDates.filter(x => x !== d))} style={{ color: 'var(--accent-red)', cursor: 'pointer' }}>×</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '2px', marginBottom: '3px' }}>
                                <input
                                  type="date"
                                  className="inset"
                                  value={newExtraDate}
                                  onChange={e => setNewExtraDate(e.target.value)}
                                  style={{ flex: 1, fontSize: '8px', fontFamily: 'monospace', padding: '1px 2px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                                />
                                <button className="btn" onClick={addExtraDate} style={{ fontSize: '8px', padding: '0 4px' }}>+日</button>
                              </div>

                              {/* Submit */}
                              <button className="btn" onClick={() => handleAddSubmit(day)} style={{ width: '100%', fontSize: '9px', padding: '2px' }}>
                                確定 ({1 + extraDates.length} 日)
                              </button>
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
