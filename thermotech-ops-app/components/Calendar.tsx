'use client'

import { useState } from 'react'

interface CalendarProps {
  year: number
  month: number
  events?: Array<{
    date: number
    title: string
    type: 'routine' | 'assignment' | 'public'
  }>
  onDateClick?: (date: number, event: React.MouseEvent) => void
}

export default function Calendar({ year, month, events = [], onDateClick }: CalendarProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

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
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  const getEventsForDay = (day: number) => {
    return events.filter(e => e.date === day)
  }

  const getEventColor = (type: 'routine' | 'assignment' | 'public') => {
    switch (type) {
      case 'routine': return '#000080'      // 深藍色
      case 'assignment': return '#008080'   // 青綠色
      case 'public': return '#808080'       // 灰色
      default: return '#000000'
    }
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']
  const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

  return (
    <div className="outset p-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 p-2 bg-blue-900 text-white">
        <button className="btn text-xs p-1">◀</button>
        <div className="text-mono text-bold">
          {year}年{monthNames[month]}月
        </div>
        <button className="btn text-xs p-1">▶</button>
      </div>

      {/* Calendar Grid */}
      <table className="w-full text-11" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {weekDays.map(day => (
              <th 
                key={day} 
                className="text-center p-1 bg-grey-200 border border-grey-400"
                style={{ width: '14.28%', fontSize: '11px' }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIdx) => (
            <tr key={weekIdx}>
              {week.map((day, dayIdx) => {
                const dayEvents = day ? getEventsForDay(day) : []
                return (
                  <td
                    key={dayIdx}
                    className="border border-grey-400 bg-white align-top cursor-pointer hover:bg-grey-100"
                    style={{ 
                      height: '85px',
                      padding: '2px',
                      fontSize: '11px'
                    }}
                    onClick={(e) => day && onDateClick && onDateClick(day, e)}
                  >
                    {day && (
                      <>
                        <div className="text-bold mb-1">{day}</div>
                        {dayEvents.map((event, idx) => (
                          <div 
                            key={idx}
                            className="text-mono mb-1"
                            style={{ 
                              fontSize: '9px',
                              color: getEventColor(event.type),
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={event.title}
                          >
                            {event.title}
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
  )
}

