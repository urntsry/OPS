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
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

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

  const getEventsForDay = (day: number) => events.filter(e => e.date === day)

  const allWeekDays = ['六', '一', '二', '三', '四', '五', '日']
  const weekDays = hideWeekend ? allWeekDays.slice(1, 6) : allWeekDays
  const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']

  const handlePrevMonth = () => {
    if (!onMonthChange) return
    onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)
    setExpandedDay(null)
  }

  const handleNextMonth = () => {
    if (!onMonthChange) return
    onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1)
    setExpandedDay(null)
  }

  const fontSize = compact ? '10px' : '11px'
  const eventFontSize = compact ? '8px' : '9px'
  const cellMinHeight = compact ? '48px' : '74px'

  return (
    <div className="window" style={{ padding: 0, width: '100%', position: 'relative' }}>
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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize }}>
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
                  const isExpanded = day === expandedDay
                  return (
                    <td
                      key={dayIdx}
                      className={day ? 'cal-cell' : ''}
                      style={{
                        border: isToday ? '2px solid var(--accent-teal)' : '1px solid var(--border-mid-dark)',
                        backgroundColor: isExpanded ? 'var(--hover-bg)' : isToday ? 'var(--hover-bg)' : 'var(--bg-inset)',
                        verticalAlign: 'top',
                        cursor: day ? 'pointer' : 'default',
                        minHeight: cellMinHeight,
                        padding: compact ? '2px' : '3px',
                        fontSize,
                        color: isWeekend ? 'var(--text-muted)' : 'var(--text-primary)',
                        position: 'relative',
                      }}
                      onClick={() => day && setExpandedDay(isExpanded ? null : day)}
                    >
                      {day && (
                        <>
                          <div style={{ fontWeight: 'bold', marginBottom: '1px', fontSize, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{day}</span>
                            {isToday && <span style={{ fontSize: '7px', color: 'var(--accent-teal)', fontWeight: 'bold' }}>TODAY</span>}
                          </div>
                          {dayEvents.map((event, idx) => (
                            <div key={idx} style={{ fontFamily: 'monospace', fontSize: eventFontSize, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '1px', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '2px' }} title={event.title}>
                              <span style={{ width: '3px', height: '10px', backgroundColor: getEventColor(event.type), flexShrink: 0, display: 'inline-block' }} />
                              <span style={{ color: getEventColor(event.type), overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: event.done ? 'line-through' : 'none', opacity: event.done ? 0.5 : 1 }}>{event.title}</span>
                            </div>
                          ))}
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

      {/* Merged Day Panel */}
      {expandedDay && (
        <DayPanel
          day={expandedDay}
          year={year}
          month={month}
          dayOfWeek={dayNames[new Date(year, month, expandedDay).getDay()]}
          events={getEventsForDay(expandedDay)}
          onClose={() => setExpandedDay(null)}
          onToggle={onToggleEvent}
          onDelete={onDeleteEvent}
          onAdd={onAddEvent}
          userRole={userRole}
        />
      )}
    </div>
  )
}

// ============================================
// Merged Day Panel — view events + add new
// ============================================
function DayPanel({ day, year, month, dayOfWeek, events, onClose, onToggle, onDelete, onAdd, userRole }: {
  day: number; year: number; month: number; dayOfWeek: string
  events: CalendarEvent[]
  onClose: () => void
  onToggle?: (id: number) => void
  onDelete?: (id: number) => void
  onAdd?: (data: { title: string; type: string; dates: string[] }) => void
  userRole: string
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const availableTypes = getTypesForRole(userRole)
  const [newType, setNewType] = useState(availableTypes[0]?.id || 'routine')

  const dateStr = `${year}/${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`
  const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const handleSubmitAdd = () => {
    if (!newTitle.trim()) return
    if (onAdd) onAdd({ title: newTitle.trim(), type: newType, dates: [isoDate] })
    setNewTitle('')
    setShowAddForm(false)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        width: '320px',
        fontFamily: 'monospace',
        fontSize: '10px',
        backgroundColor: 'var(--bg-window)',
        borderTop: '2px solid var(--border-light)',
        borderLeft: '2px solid var(--border-light)',
        borderRight: '2px solid var(--border-dark)',
        borderBottom: '2px solid var(--border-dark)',
        boxShadow: '3px 3px 8px rgba(0,0,0,0.35)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Title bar */}
      <div style={{
        background: 'linear-gradient(90deg, var(--titlebar-start) 0%, var(--titlebar-end) 100%)',
        color: '#FFF', padding: '2px 6px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '10px', fontWeight: 'bold',
      }}>
        <span>{dateStr} ({dayOfWeek})</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ background: showAddForm ? 'var(--accent-teal)' : 'var(--bg-window)', border: '1px solid var(--border-dark)', color: showAddForm ? '#FFF' : 'var(--text-primary)', fontSize: '10px', cursor: 'pointer', padding: '0 5px', lineHeight: 1, outline: 'none', fontWeight: 'bold' }}
            title="新增事項"
          >+</button>
          <button onClick={onClose} style={{ background: 'var(--bg-window)', border: '1px solid var(--border-dark)', color: 'var(--accent-red)', fontSize: '10px', cursor: 'pointer', padding: '0 5px', lineHeight: 1, outline: 'none', fontWeight: 'bold' }}>×</button>
        </div>
      </div>

      {/* Event list */}
      <div style={{ background: 'var(--bg-inset)', maxHeight: '220px', overflow: 'hidden auto' }}>
        {events.length === 0 ? (
          <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>- NO EVENTS -</div>
        ) : events.map((event, idx) => (
          <div
            key={event.id || idx}
            className="eventlist-row"
            style={{ padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid var(--table-border)' }}
          >
            {/* Color bar */}
            <span style={{ width: '4px', height: '14px', backgroundColor: getEventColor(event.type), flexShrink: 0 }} />

            {/* Toggle checkbox */}
            {onToggle && event.id ? (
              <span
                onClick={() => onToggle(event.id!)}
                style={{ fontFamily: 'Courier New', cursor: 'pointer', fontSize: '10px', flexShrink: 0, userSelect: 'none' }}
              >
                {event.done ? '[V]' : '[ ]'}
              </span>
            ) : (
              <span style={{ width: '20px', flexShrink: 0 }} />
            )}

            {/* Type label */}
            <span style={{ color: getEventColor(event.type), fontWeight: 'bold', fontSize: '8px', minWidth: '32px', flexShrink: 0 }}>
              {getEventLabel(event.type).slice(0, 4)}
            </span>

            {/* Title */}
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textDecoration: event.done ? 'line-through' : 'none',
              color: event.done ? 'var(--text-muted)' : 'var(--text-primary)',
            }}>
              {event.title}
            </span>

            {/* Delete */}
            {onDelete && event.id && (
              <button
                onClick={() => { if (confirm(`刪除「${event.title}」？`)) onDelete(event.id!) }}
                style={{ fontSize: '9px', width: '16px', height: '14px', padding: 0, border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', lineHeight: 1, outline: 'none', flexShrink: 0 }}
              >×</button>
            )}
          </div>
        ))}
      </div>

      {/* Inline Add Form (toggled by + button) */}
      {showAddForm && (
        <div style={{ padding: '6px', borderTop: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)' }}>
          <div style={{ marginBottom: '4px' }}>
            <input
              className="inset"
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitAdd()}
              placeholder="事項標題"
              autoFocus
              style={{ width: '100%', padding: '3px 4px', fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <select
              className="inset"
              value={newType}
              onChange={e => setNewType(e.target.value)}
              style={{ flex: 1, fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              {availableTypes.map((t: EventType) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button
              className="btn"
              onClick={handleSubmitAdd}
              style={{ fontSize: '9px', padding: '2px 10px' }}
            >確定</button>
          </div>
        </div>
      )}
    </div>
  )
}
