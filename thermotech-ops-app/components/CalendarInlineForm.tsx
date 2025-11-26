'use client'

import { useState, useEffect } from 'react'
import Button from './Button'

interface CalendarInlineFormProps {
  selectedDate: string
  onSubmit: (data: { title: string; type: 'routine' | 'assignment' | 'public'; dates: string[] }) => void
  onClose: () => void
  position: { x: number; y: number }
}

export default function CalendarInlineForm({ selectedDate, onSubmit, onClose, position }: CalendarInlineFormProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'routine' | 'assignment' | 'public'>('assignment')
  const [dates, setDates] = useState<string[]>([selectedDate])
  const [newDate, setNewDate] = useState('')
  
  console.log('[CalendarInlineForm] 渲染:', { selectedDate, position, dates })
  
  const handleAddDate = () => {
    if (newDate && !dates.includes(newDate)) {
      console.log('[CalendarInlineForm] 新增日期:', newDate)
      setDates([...dates, newDate])
      setNewDate('')
    }
  }
  
  const handleRemoveDate = (dateToRemove: string) => {
    console.log('[CalendarInlineForm] 移除日期:', dateToRemove)
    setDates(dates.filter(d => d !== dateToRemove))
  }
  
  const handleSubmit = () => {
    console.log('[CalendarInlineForm] 提交:', { title, type, dates })
    
    if (!title.trim()) {
      alert('請輸入標題')
      return
    }
    
    if (dates.length === 0) {
      alert('請至少選擇一個日期')
      return
    }
    
    onSubmit({ title, type, dates })
  }
  
  return (
    <div 
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '380px',
        background: '#C0C0C0',
        border: '3px solid',
        borderColor: '#FFFFFF #000000 #000000 #FFFFFF',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.3)',
        zIndex: 2000,
        fontSize: '11px'
      }}
    >
      {/* 標題列 */}
      <div 
        style={{
          background: 'linear-gradient(90deg, #000080 0%, #1084D0 100%)',
          color: 'white',
          padding: '4px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold'
        }}
      >
        <span>{selectedDate} 新增事項</span>
        <button
          onClick={onClose}
          style={{
            background: '#C0C0C0',
            border: '2px solid',
            borderColor: '#FFFFFF #000000 #000000 #FFFFFF',
            width: '20px',
            height: '18px',
            padding: '0',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
        >
          ✕
        </button>
      </div>
      
      {/* 表單內容 */}
      <div style={{ padding: '12px' }}>
        {/* 標題 */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            標題:
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '4px',
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
            placeholder="輸入事項標題"
            autoFocus
          />
        </div>
        
        {/* 類型 */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            類型:
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            style={{
              width: '100%',
              padding: '4px',
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
          >
            <option value="routine">例行公事</option>
            <option value="assignment">交辦事項</option>
            <option value="public">公共事項</option>
          </select>
        </div>
        
        {/* 日期列表 */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            日期: ({dates.length} 個)
          </label>
          <div 
            style={{
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              padding: '6px',
              background: '#FFFFFF',
              maxHeight: '120px',
              overflowY: 'auto',
              marginBottom: '6px'
            }}
          >
            {dates.map((date, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '2px 4px',
                  marginBottom: '2px',
                  background: idx === 0 ? '#E0E0E0' : 'transparent'
                }}
              >
                <span style={{ fontFamily: 'monospace' }}>{date}</span>
                {dates.length > 1 && (
                  <button
                    onClick={() => handleRemoveDate(date)}
                    style={{
                      background: '#C0C0C0',
                      border: '1px solid #808080',
                      padding: '0 4px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    刪
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* 新增日期 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{
                flex: 1,
                padding: '4px',
                border: '2px solid',
                borderColor: '#808080 #FFFFFF #FFFFFF #808080',
                fontSize: '11px'
              }}
            />
            <Button onClick={handleAddDate} style={{ padding: '4px 8px' }}>
              +
            </Button>
          </div>
        </div>
        
        {/* 按鈕 */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            確定
          </Button>
        </div>
      </div>
    </div>
  )
}

