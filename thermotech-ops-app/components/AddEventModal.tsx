'use client'

import { useState, useEffect } from 'react'
import Button from './Button'
import { getTypesForRole, type EventType } from '@/lib/eventTypes'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    type: string
    dates: string[]
  }) => void
  preselectedDate?: string | null
  zIndex?: number
  position?: { x: number; y: number }
  userRole?: string
}

export default function AddEventModal({
  isOpen, onClose, onSubmit, preselectedDate,
  zIndex = 1000, position = { x: 100, y: 100 },
  userRole = 'user'
}: AddEventModalProps) {
  const availableTypes = getTypesForRole(userRole)
  const [title, setTitle] = useState('')
  const [type, setType] = useState(availableTypes[0]?.id || 'routine')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [customDate, setCustomDate] = useState('')

  useEffect(() => {
    if (preselectedDate && isOpen) {
      setSelectedDates([preselectedDate])
    }
  }, [preselectedDate, isOpen])

  if (!isOpen) return null

  const handleAddDate = () => {
    if (customDate && !selectedDates.includes(customDate)) {
      setSelectedDates([...selectedDates, customDate])
      setCustomDate('')
    }
  }

  const handleRemoveDate = (date: string) => {
    setSelectedDates(selectedDates.filter(d => d !== date))
  }

  const handleSubmit = () => {
    if (!title || selectedDates.length === 0) {
      alert(!title ? '請填寫標題' : '請選擇日期')
      return
    }
    onSubmit({ title, type, dates: selectedDates })
    setTitle('')
    setSelectedDates([])
    setCustomDate('')
    onClose()
  }

  const handleClose = () => {
    setTitle('')
    setSelectedDates([])
    setCustomDate('')
    onClose()
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1400 }} onClick={handleClose} />

      <div className="window" style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '420px', zIndex: 1500 }}>
        <div className="titlebar" style={{ padding: '2px 6px', fontSize: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>新增事項</span>
          <button onClick={handleClose} style={{ background: 'var(--bg-window)', border: '1px solid var(--border-dark)', color: 'var(--accent-red)', fontSize: '10px', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold', outline: 'none' }}>×</button>
        </div>

        <div style={{ padding: '8px', background: 'var(--bg-window)', fontSize: '10px', fontFamily: 'monospace' }}>
          {/* Title */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', fontSize: '9px' }}>TITLE</label>
            <input className="inset" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="輸入事項標題" autoFocus style={{ width: '100%', padding: '3px 4px', fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
          </div>

          {/* Type — dynamic from registry */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', fontSize: '9px' }}>TYPE</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
              {availableTypes.map((t: EventType) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    backgroundColor: type === t.id ? t.color : 'var(--bg-window)',
                    color: type === t.id ? '#FFF' : 'var(--text-primary)',
                    borderTop: type === t.id ? '1px solid var(--border-dark)' : '1px solid var(--border-light)',
                    borderLeft: type === t.id ? '1px solid var(--border-dark)' : '1px solid var(--border-light)',
                    borderRight: type === t.id ? '1px solid var(--border-light)' : '1px solid var(--border-dark)',
                    borderBottom: type === t.id ? '1px solid var(--border-light)' : '1px solid var(--border-dark)',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', backgroundColor: t.color, display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date selection */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', fontSize: '9px' }}>DATES ({selectedDates.length})</label>
            {selectedDates.length > 0 && (
              <div className="inset" style={{ padding: '3px', marginBottom: '4px', background: 'var(--bg-inset)', maxHeight: '80px', overflow: 'hidden auto' }}>
                {selectedDates.map(date => (
                  <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 4px', fontSize: '10px' }}>
                    <span>{date}</span>
                    <button onClick={() => handleRemoveDate(date)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px', outline: 'none' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '4px' }}>
              <input className="inset" type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={{ flex: 1, padding: '2px 4px', fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              <Button onClick={handleAddDate} style={{ padding: '2px 8px', fontSize: '9px' }}>+</Button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose} style={{ padding: '3px 12px', fontSize: '9px' }}>取消</Button>
            <Button onClick={handleSubmit} style={{ padding: '3px 12px', fontSize: '9px' }}>確定</Button>
          </div>
        </div>
      </div>
    </>
  )
}
