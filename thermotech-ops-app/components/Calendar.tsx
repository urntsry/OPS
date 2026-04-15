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
  hideWeekend?: boolean  // 隱藏週末選項
  compact?: boolean      // 緊湊模式 (手機用)
  onMonthChange?: (year: number, month: number) => void
}

export default function Calendar({ 
  year, 
  month, 
  events = [], 
  onDateClick, 
  hideWeekend = false,
  compact = false,
  onMonthChange
}: CalendarProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  
  // 調整星期順序：六一二三四五日 (六在最左, 日在最右)
  // firstDayOfWeek: 0=日, 1=一, 2=二, 3=三, 4=四, 5=五, 6=六
  // 新順序位置: 六=0, 一=1, 二=2, 三=3, 四=4, 五=5, 日=6
  const getAdjustedDay = (day: number) => {
    if (day === 0) return 6  // 日 -> 最右
    if (day === 6) return 0  // 六 -> 最左
    return day               // 一~五 保持位置 1~5
  }
  const adjustedFirstDay = getAdjustedDay(firstDayOfWeek)

  // 根據 hideWeekend 決定顯示哪些天
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
      case 'routine': return '#000080'      // 深藍 - 例行任務
      case 'assignment': return '#008080'   // 青綠 - 交辦事項
      case 'public': return '#800000'       // 深紅 - 公共事項 (更明顯)
      default: return '#000000'
    }
  }

  // 星期順序：六一二三四五日
  const allWeekDays = ['六', '一', '二', '三', '四', '五', '日']
  // 隱藏週末時只顯示一~五 (索引 1-5)
  const weekDays = hideWeekend ? allWeekDays.slice(1, 6) : allWeekDays
  const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

  const handlePrevMonth = () => {
    if (onMonthChange) {
      const newMonth = month === 0 ? 11 : month - 1
      const newYear = month === 0 ? year - 1 : year
      onMonthChange(newYear, newMonth)
    }
  }

  const handleNextMonth = () => {
    if (onMonthChange) {
      const newMonth = month === 11 ? 0 : month + 1
      const newYear = month === 11 ? year + 1 : year
      onMonthChange(newYear, newMonth)
    }
  }

  const cellHeight = compact ? '48px' : '76px'
  const fontSize = compact ? '10px' : '11px'
  const eventFontSize = compact ? '8px' : '9px'

  return (
    <div className="window" style={{ padding: 0, width: '100%' }}>
      {/* Header */}
      <div 
        className="titlebar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: compact ? '3px 6px' : '3px 8px'
        }}
      >
        <button 
          onClick={handlePrevMonth}
          style={{ 
            background: 'none', 
            border: '1px solid rgba(255,255,255,0.5)', 
            color: '#FFF', 
            padding: '1px 6px',
            fontSize: '11px',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >◀</button>
        <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: compact ? '11px' : '11px', letterSpacing: '0.5px' }}>
          {year}年{monthNames[month]}月
        </div>
        <button 
          onClick={handleNextMonth}
          style={{ 
            background: 'none', 
            border: '1px solid rgba(255,255,255,0.5)', 
            color: '#FFF', 
            padding: '1px 6px',
            fontSize: '11px',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >▶</button>
      </div>

      {/* Calendar Grid */}
      <div className="inset" style={{ background: 'var(--bg-inset)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize }}>
          <thead>
            <tr>
            {weekDays.map((day, idx) => {
              const isWeekendHeader = !hideWeekend && (idx === 0 || idx === 6)
              return (
                <th 
                  key={day} 
                  style={{ 
                    textAlign: 'center',
                    padding: compact ? '1px' : '2px',
                    background: 'var(--bg-window)',
                    border: '1px solid var(--border-mid-dark)',
                    width: `${100 / daysToShow}%`,
                    fontSize,
                    color: isWeekendHeader ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontWeight: 'bold'
                  }}
                >
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
                return (
                  <td
                    key={dayIdx}
                    className={day ? 'cal-cell' : ''}
                    style={{ 
                      border: '1px solid var(--border-mid-dark)',
                      backgroundColor: 'var(--bg-inset)',
                      verticalAlign: 'top',
                      cursor: day ? 'pointer' : 'default',
                      height: cellHeight,
                      padding: compact ? '2px' : '3px',
                      fontSize,
                      color: isWeekend ? 'var(--text-muted)' : 'var(--text-primary)',
                    }}
                    onClick={(e) => day && onDateClick && onDateClick(day, e)}
                  >
                    {day && (
                      <>
                        <div style={{ fontWeight: 'bold', marginBottom: '1px', fontSize }}>{day}</div>
                        {dayEvents.slice(0, compact ? 2 : 4).map((event, idx) => (
                          <div 
                            key={idx}
                            style={{ 
                              fontFamily: 'monospace',
                              fontSize: eventFontSize,
                              color: getEventColor(event.type),
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginBottom: '1px',
                              lineHeight: 1.1
                            }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > (compact ? 2 : 4) && (
                          <div style={{ fontSize: eventFontSize, color: 'var(--text-muted)' }}>
                            +{dayEvents.length - (compact ? 2 : 4)}
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

