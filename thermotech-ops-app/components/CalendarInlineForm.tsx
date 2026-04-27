'use client'

import { useState } from 'react'
import Button from './Button'
import { getTypesForRole, type EventType } from '@/lib/eventTypes'

interface CalendarInlineFormProps {
  selectedDate: string
  onSubmit: (data: { title: string; type: string; dates: string[] }) => void
  onClose: () => void
  position: { x: number; y: number }
  userRole?: string
}

export default function CalendarInlineForm({ selectedDate, onSubmit, onClose, position, userRole = 'user' }: CalendarInlineFormProps) {
  const availableTypes = getTypesForRole(userRole)
  const [title, setTitle] = useState('')
  const [type, setType] = useState(availableTypes[0]?.id || 'assignment')
  const [dates, setDates] = useState<string[]>([selectedDate])
  const [newDate, setNewDate] = useState('')

  const handleAddDate = () => {
    if (newDate && !dates.includes(newDate)) {
      setDates([...dates, newDate])
      setNewDate('')
    }
  }

  const handleRemoveDate = (dateToRemove: string) => {
    setDates(dates.filter(d => d !== dateToRemove))
  }

  const handleSubmit = () => {
    if (!title.trim()) { alert('請輸入標題'); return }
    if (dates.length === 0) { alert('請至少選擇一個日期'); return }
    onSubmit({ title, type, dates })
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '340px',
        zIndex: 2000,
        fontSize: '10px',
        fontFamily: 'monospace',
        backgroundColor: 'var(--bg-window)',
        borderTop: '2px solid var(--border-light)',
        borderLeft: '2px solid var(--border-light)',
        borderRight: '2px solid var(--border-dark)',
        borderBottom: '2px solid var(--border-dark)',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      {/* Title bar */}
      <div style={{ background: 'linear-gradient(90deg, var(--titlebar-start) 0%, var(--titlebar-end) 100%)', color: '#FFF', padding: '2px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '10px' }}>
        <span>{selectedDate} 新增事項</span>
        <button onClick={onClose} style={{ background: 'var(--bg-window)', border: '1px solid var(--border-dark)', width: '16px', height: '14px', padding: 0, cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-red)', outline: 'none', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: '8px' }}>
        {/* Title */}
        <div style={{ marginBottom: '6px' }}>
          <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', fontSize: '9px' }}>TITLE</label>
          <input className="inset" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="輸入事項標題" autoFocus style={{ width: '100%', padding: '3px 4px', fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
        </div>

        {/* Type buttons */}
        <div style={{ marginBottom: '6px' }}>
          <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', fontSize: '9px' }}>TYPE</label>
          <select className="inset" value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '2px 4px', fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
            {availableTypes.map((t: EventType) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div style={{ marginBottom: '6px' }}>
          <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', fontSize: '9px' }}>DATES ({dates.length})</label>
          <div className="inset" style={{ padding: '3px', background: 'var(--bg-inset)', maxHeight: '80px', overflow: 'hidden auto', marginBottom: '4px' }}>
            {dates.map((date, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 4px' }}>
                <span>{date}</span>
                {dates.length > 1 && (
                  <button onClick={() => handleRemoveDate(date)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px', outline: 'none' }}>×</button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input className="inset" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: 1, padding: '2px 4px', fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
            <Button onClick={handleAddDate} style={{ padding: '2px 6px', fontSize: '9px' }}>+</Button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} style={{ padding: '3px 10px', fontSize: '9px' }}>取消</Button>
          <Button onClick={handleSubmit} style={{ padding: '3px 10px', fontSize: '9px' }}>確定</Button>
        </div>
      </div>
    </div>
  )
}
