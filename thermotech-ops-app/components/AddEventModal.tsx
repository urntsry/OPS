'use client'

import { useState, useEffect } from 'react'
import Button from './Button'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    type: 'routine' | 'assignment' | 'public'
    dates: string[]
  }) => void
  preselectedDate?: string | null
  zIndex?: number
  position?: { x: number; y: number }
}

export default function AddEventModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  preselectedDate,
  zIndex = 1000,
  position = { x: 100, y: 100 }
}: AddEventModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'routine' | 'assignment' | 'public'>('routine')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [customDate, setCustomDate] = useState('')

  // 當有預選日期時，自動加入
  useEffect(() => {
    console.log('[AddEventModal] useEffect 觸發:', { preselectedDate, isOpen })
    if (preselectedDate && isOpen) {
      console.log('[AddEventModal] 自動加入預選日期:', preselectedDate)
      setSelectedDates([preselectedDate])
    }
  }, [preselectedDate, isOpen])

  if (!isOpen) return null

  const handleAddDate = () => {
    console.log('[AddEventModal] handleAddDate:', { customDate, selectedDates })
    if (customDate && !selectedDates.includes(customDate)) {
      const newDates = [...selectedDates, customDate]
      console.log('[AddEventModal] 新增日期，更新為:', newDates)
      setSelectedDates(newDates)
      setCustomDate('')
    } else if (!customDate) {
      console.warn('[AddEventModal] 未選擇日期')
    } else {
      console.warn('[AddEventModal] 日期已存在:', customDate)
    }
  }

  const handleRemoveDate = (date: string) => {
    console.log('[AddEventModal] handleRemoveDate:', date)
    const newDates = selectedDates.filter(d => d !== date)
    console.log('[AddEventModal] 移除後剩餘日期:', newDates)
    setSelectedDates(newDates)
  }

  const handleSubmit = () => {
    console.log('[AddEventModal] handleSubmit:', { title, type, selectedDates })
    if (!title || selectedDates.length === 0) {
      const msg = !title ? '請填寫標題' : '請選擇日期'
      console.error('[AddEventModal] 驗證失敗:', msg)
      alert(msg)
      return
    }
    console.log('[AddEventModal] 驗證通過，提交資料')
    onSubmit({ title, type, dates: selectedDates })
    console.log('[AddEventModal] 清空表單')
    setTitle('')
    setSelectedDates([])
    setCustomDate('')
    onClose()
  }

  const handleClose = () => {
    console.log('[AddEventModal] handleClose - 清空狀態並關閉')
    setTitle('')
    setSelectedDates([])
    setCustomDate('')
    onClose()
  }

  return (
    <>
      {/* 半透明背景 */}
      <div 
        className="fixed inset-0"
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 1400
        }}
        onClick={handleClose}
      />
      
      {/* 視窗 - 正中央 */}
      <div 
        className="window fixed"
        style={{ 
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          zIndex: 1500
        }}
      >
        <div className="titlebar">
          新增事項
        </div>

        <div className="p-4 bg-grey-200">
          {/* 標題 */}
          <div className="mb-4">
            <label className="block mb-2 text-bold">標題</label>
            <input
              type="text"
              className="input w-full"
              placeholder="請輸入事項標題"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 類型 */}
          <div className="mb-4">
            <label className="block mb-2 text-bold">類型</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="type"
                  checked={type === 'routine'}
                  onChange={() => setType('routine')}
                />
                <span className="text-11">例行公事</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="type"
                  checked={type === 'assignment'}
                  onChange={() => setType('assignment')}
                />
                <span className="text-11">交辦事項</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="type"
                  checked={type === 'public'}
                  onChange={() => setType('public')}
                />
                <span className="text-11">公共事項</span>
              </label>
            </div>
          </div>

          {/* 日期選擇 */}
          <div className="mb-4">
            <label className="block mb-2 text-bold">日期（可複選）</label>
            
            {/* 已選日期 */}
            {selectedDates.length > 0 && (
              <div className="inset p-2 bg-white mb-2">
                <div className="text-mono text-xs mb-1">已選擇的日期：</div>
                {selectedDates.map((date) => (
                  <div key={date} className="flex justify-between items-center mb-1">
                    <span className="text-mono text-11">{date}</span>
                    <button
                      onClick={() => handleRemoveDate(date)}
                      className="text-bold text-red-600 text-xs"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 新增日期 */}
            <div className="flex gap-2">
              <input
                type="date"
                className="input flex-1"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
              <Button onClick={handleAddDate} className="text-xs">
                新增
              </Button>
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">
              確定
            </Button>
            <Button onClick={handleClose} className="flex-1">
              取消
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

