'use client'

import { useState } from 'react'
import { getEventColor } from '@/lib/eventTypes'

interface CalendarEvent {
  date: number
  title: string
  type: string
}

interface CalendarProps {
  year: number
  month: number
  events?: CalendarEvent[]
  onDateClick?: (date: number, event: React.MouseEvent) => void
  onDateDoubleClick?: (date: number, event: React.MouseEvent) => void
  hideWeekend?: boolean
  compact?: boolean
  onMonthChange?: (year: number, month: number) => void
}

export default function Calendar({
  year, month, events = [], onDateClick, onDateDoubleClick,
  hideWeekend = false, compact = false, onMonthChange
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

  const handlePrevMonth = () => {
    if (!onMonthChange) return
    const newMonth = month === 0 ? 11 : month - 1
    const newYear = month === 0 ? year - 1 : year
    onMonthChange(newYear, newMonth)
    setExpandedDay(null)
  }

  const handleNextMonth = () => {
    if (!onMonthChange) return
    const newMonth = month === 11 ? 0 : month + 1
    const newYear = month === 11 ? year + 1 : year
    onMonthChange(newYear, newMonth)
    setExpandedDay(null)
  }

  const handleCellClick = (day: number, e: React.MouseEvent) => {
    // Single click: toggle expanded day panel
    if (expandedDay === day) {
      setExpandedDay(null)
    } else {
      setExpandedDay(day)
    }
    if (onDateClick) onDateClick(day, e)
  }

  const handleCellDoubleClick = (day: number, e: React.MouseEvent) => {
    if (onDateDoubleClick) onDateDoubleClick(day, e)
  }

  const fontSize = compact ? '10px' : '11px'
  const eventFontSize = compact ? '8px' : '9px'
  const cellMinHeight = compact ? '48px' : '60px'

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
                  return (
                    <td
                      key={dayIdx}
                      className={day ? 'cal-cell' : ''}
                      style={{
                        border: isToday ? '2px solid var(--accent-teal)' : '1px solid var(--border-mid-dark)',
                        backgroundColor: isToday ? 'var(--hover-bg)' : 'var(--bg-inset)',
                        verticalAlign: 'top',
                        cursor: day ? 'pointer' : 'default',
                        minHeight: cellMinHeight,
                        padding: compact ? '2px' : '3px',
                        fontSize,
                        color: isWeekend ? 'var(--text-muted)' : 'var(--text-primary)',
                        position: 'relative',
                      }}
                      onClick={(e) => day && handleCellClick(day, e)}
                      onDoubleClick={(e) => day && handleCellDoubleClick(day, e)}
                    >
                      {day && (
                        <>
                          {/* Day number */}
                          <div style={{ fontWeight: 'bold', marginBottom: '1px', fontSize, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{day}</span>
                            {isToday && <span style={{ fontSize: '7px', color: 'var(--accent-teal)', fontWeight: 'bold' }}>TODAY</span>}
                          </div>
                          {/* Events — show all, no truncation */}
                          {dayEvents.map((event, idx) => (
                            <div
                              key={idx}
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
                              }}
                              title={event.title}
                            >
                              <span style={{ width: '3px', height: '10px', backgroundColor: getEventColor(event.type), flexShrink: 0, display: 'inline-block' }} />
                              <span style={{ color: getEventColor(event.type), overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
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

      {/* Expanded Day Panel — floating popup */}
      {expandedDay && (
        <DayPanel
          day={expandedDay}
          year={year}
          month={month}
          events={getEventsForDay(expandedDay)}
          onClose={() => setExpandedDay(null)}
          onAddNew={(e) => { if (onDateDoubleClick) onDateDoubleClick(expandedDay, e as any) }}
        />
      )}
    </div>
  )
}

// ============================================
// Day Panel — shows all events for a given day
// ============================================
function DayPanel({ day, year, month, events, onClose, onAddNew }: {
  day: number
  year: number
  month: number
  events: CalendarEvent[]
  onClose: () => void
  onAddNew: (e: React.MouseEvent) => void
}) {
  const dateStr = `${year}/${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        minWidth: '240px',
        maxWidth: '350px',
        fontFamily: 'monospace',
        fontSize: '10px',
        backgroundColor: 'var(--bg-window)',
        borderTop: '2px solid var(--border-light)',
        borderLeft: '2px solid var(--border-light)',
        borderRight: '2px solid var(--border-dark)',
        borderBottom: '2px solid var(--border-dark)',
        boxShadow: '3px 3px 6px rgba(0,0,0,0.3)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Title bar */}
      <div style={{
        background: 'linear-gradient(90deg, var(--titlebar-start) 0%, var(--titlebar-end) 100%)',
        color: '#FFF',
        padding: '2px 6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
      }}>
        <span>{dateStr} ({events.length} 筆)</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          <button onClick={onAddNew} style={{ background: 'var(--bg-window)', border: '1px solid var(--border-dark)', color: 'var(--text-primary)', fontSize: '9px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, outline: 'none', fontWeight: 'bold' }}>+</button>
          <button onClick={onClose} style={{ background: 'var(--bg-window)', border: '1px solid var(--border-dark)', color: 'var(--accent-red)', fontSize: '9px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, outline: 'none', fontWeight: 'bold' }}>×</button>
        </div>
      </div>

      {/* Event list */}
      <div style={{ padding: '2px', background: 'var(--bg-inset)', maxHeight: '200px', overflow: 'hidden auto' }}>
        {events.length === 0 ? (
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>- NO EVENTS -</div>
        ) : events.map((event, idx) => (
          <div
            key={idx}
            className="eventlist-row"
            style={{
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: '1px solid var(--table-border)',
              cursor: 'default',
            }}
          >
            <span style={{ width: '4px', height: '12px', backgroundColor: getEventColor(event.type), flexShrink: 0 }} />
            <span style={{ color: getEventColor(event.type), fontWeight: 'bold', fontSize: '9px', minWidth: '35px' }}>
              {event.type.toUpperCase().slice(0, 4)}
            </span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
