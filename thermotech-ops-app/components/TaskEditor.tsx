'use client'

import { useState, useEffect } from 'react'
import Button from './Button'
import type { TaskDefinition } from '@/lib/api'

interface TaskEditorProps {
  task?: TaskDefinition // 如果提供，則是編輯模式
  onSave: (updates: Partial<TaskDefinition>) => Promise<void>
  onCancel: () => void
}

export default function TaskEditor({ task, onSave, onCancel }: TaskEditorProps) {
  console.log('[TaskEditor] 組件初始化，編輯模式:', !!task, task)
  console.log('[TaskEditor] 準備渲染 UI')
  
  // 基本資訊
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [points, setPoints] = useState(task?.base_points || 10)
  const [siteLocation, setSiteLocation] = useState(task?.site_location || 'ALL')
  
  // 任務分類
  const [taskCategory, setTaskCategory] = useState<'routine' | 'assignment' | 'public' | 'announcement'>(
    task?.task_category || 'routine'
  )
  
  // 顯示類型 - 不再由用戶選擇，由系統自動決定
  // const [displayType, setDisplayType] = useState<'event' | 'collapsed' | 'periodic'>(
  //   task?.display_type || 'collapsed'
  // )
  
  // 排程設定
  const [scheduleType, setScheduleType] = useState<'once' | 'range' | 'recurring'>(
    task?.schedule_type || 'recurring'
  )
  
  // 從 task.schedule_config 載入初始值
  const [singleDate, setSingleDate] = useState(task?.schedule_config?.date || '')
  const [startDate, setStartDate] = useState(task?.schedule_config?.start_date || '')
  const [endDate, setEndDate] = useState(task?.schedule_config?.end_date || '')
  
  // 重複規則
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [workdaysOnly, setWorkdaysOnly] = useState(true)
  const [weekDays, setWeekDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [monthDates, setMonthDates] = useState<number[]>([1])
  
  // 當 task 載入時，初始化 recurring 規則
  useEffect(() => {
    if (task?.schedule_config) {
      const config = task.schedule_config
      console.log('[TaskEditor] 載入現有 schedule_config:', config)
      
      if (config.type === 'daily') {
        setRecurringType('daily')
        setWorkdaysOnly(config.workdays_only ?? true)
      } else if (config.type === 'weekly') {
        setRecurringType('weekly')
        setWeekDays(config.days || [1, 2, 3, 4, 5])
      } else if (config.type === 'monthly') {
        setRecurringType('monthly')
        setMonthDates(config.dates || [1])
      }
    }
  }, [task])
  
  const weekDayNames = ['一', '二', '三', '四', '五', '六', '日']
  
  const handleSave = async () => {
    console.log('[TaskEditor] 開始儲存，當前狀態:', {
      title,
      taskCategory,
      scheduleType,
      recurringType,
      workdaysOnly,
      weekDays,
      monthDates
    })
    
    // 構建 schedule_config
    let scheduleConfig: any = {}
    
    if (scheduleType === 'once') {
      scheduleConfig = { type: 'once', date: singleDate }
    } else if (scheduleType === 'range') {
      scheduleConfig = { 
        type: 'range', 
        start_date: startDate, 
        end_date: endDate 
      }
    } else if (scheduleType === 'recurring') {
      if (recurringType === 'daily') {
        scheduleConfig = { 
          type: 'daily', 
          workdays_only: workdaysOnly 
        }
      } else if (recurringType === 'weekly') {
        scheduleConfig = { 
          type: 'weekly', 
          days: weekDays 
        }
      } else if (recurringType === 'monthly') {
        scheduleConfig = { 
          type: 'monthly', 
          dates: monthDates 
        }
      }
    }
    
    // 🎯 自動決定 display_type
    let autoDisplayType: 'event' | 'collapsed' | 'periodic'
    
    if (scheduleType === 'once' || scheduleType === 'range') {
      // 單次/區間任務 = 特殊事件（直接顯示）
      autoDisplayType = 'event'
    } else if (scheduleType === 'recurring') {
      if (recurringType === 'daily') {
        // 每日任務 = 例行公事（摺疊顯示）
        autoDisplayType = 'collapsed'
      } else {
        // 每週/每月任務 = 週期任務（直接顯示）
        autoDisplayType = 'periodic'
      }
    } else {
      autoDisplayType = 'collapsed' // 預設值
    }
    
    console.log('[TaskEditor] 自動決定 display_type:', autoDisplayType)
    
    const taskData = {
      title,
      description,
      base_points: points,
      site_location: siteLocation,
      task_category: taskCategory,
      display_type: autoDisplayType, // 使用自動決定的值
      schedule_type: scheduleType,
      schedule_config: scheduleConfig
    }
    
    console.log('[TaskEditor] 準備儲存的資料:', taskData)
    
    try {
      await onSave(taskData)
      console.log('[TaskEditor] 儲存成功')
    } catch (error) {
      console.error('[TaskEditor] 儲存失敗:', error)
      alert('儲存失敗，請檢查 Console')
    }
  }
  
  const toggleWeekDay = (day: number) => {
    if (weekDays.includes(day)) {
      setWeekDays(weekDays.filter(d => d !== day))
    } else {
      setWeekDays([...weekDays, day].sort())
    }
  }
  
  const addMonthDate = () => {
    const newDate = prompt('請輸入日期 (1-31):')
    if (newDate) {
      const date = parseInt(newDate)
      if (date >= 1 && date <= 31 && !monthDates.includes(date)) {
        setMonthDates([...monthDates, date].sort((a, b) => a - b))
      }
    }
  }
  
  const removeMonthDate = (date: number) => {
    setMonthDates(monthDates.filter(d => d !== date))
  }

  console.log('[TaskEditor] 開始渲染 JSX，task:', task?.id, task?.title)

  return (
    <div 
      className="window" 
      style={{ 
        position: 'relative', // 改為 relative，讓外層的 fixed 定位生效
        width: '700px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#C0C0C0' // 確保背景色
      }}
    >
      <div className="titlebar">
        {task ? `編輯任務 - ${task.title}` : '新增任務'}
      </div>
      
      <div style={{ padding: '16px', fontSize: '11px' }}>
        {/* 基本資訊 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #808080', paddingBottom: '4px' }}>
            基本資訊
          </div>
          <div className="inset" style={{ padding: '12px' }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>任務名稱</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', fontSize: '11px' }}
              />
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>任務描述</label>
              <input
                type="text"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', fontSize: '11px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>積分</label>
                <input
                  type="number"
                  className="input"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value))}
                  style={{ width: '100%', fontSize: '11px' }}
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>廠區</label>
                <select
                  className="input"
                  value={siteLocation}
                  onChange={(e) => setSiteLocation(e.target.value)}
                  style={{ width: '100%', fontSize: '11px' }}
                >
                  <option value="ALL">全部</option>
                  <option value="KS">高獅</option>
                  <option value="316">316廠</option>
                  <option value="310">310廠</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* 任務分類 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #808080', paddingBottom: '4px' }}>
            任務分類
          </div>
          <div className="inset" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="taskCategory"
                  checked={taskCategory === 'routine'}
                  onChange={() => setTaskCategory('routine')}
                />
                {' '}例行公事
              </label>
              
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="taskCategory"
                  checked={taskCategory === 'assignment'}
                  onChange={() => setTaskCategory('assignment')}
                />
                {' '}交辦事項
              </label>
              
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="taskCategory"
                  checked={taskCategory === 'public'}
                  onChange={() => setTaskCategory('public')}
                />
                {' '}公共事項
              </label>
            </div>
          </div>
        </div>
        
        {/* 排程設定 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #808080', paddingBottom: '4px' }}>
            排程設定
          </div>
          <div className="inset" style={{ padding: '12px' }}>
            {/* 排程類型選擇 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scheduleType"
                  checked={scheduleType === 'once'}
                  onChange={() => setScheduleType('once')}
                />
                {' '}單次任務
              </label>
              
              {scheduleType === 'once' && (
                <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                  <input
                    type="date"
                    className="input"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    style={{ fontSize: '11px' }}
                  />
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scheduleType"
                  checked={scheduleType === 'range'}
                  onChange={() => setScheduleType('range')}
                />
                {' '}區間任務
              </label>
              
              {scheduleType === 'range' && (
                <div style={{ marginLeft: '24px', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>開始：</span>
                  <input
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ fontSize: '11px' }}
                  />
                  <span>結束：</span>
                  <input
                    type="date"
                    className="input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ fontSize: '11px' }}
                  />
                </div>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scheduleType"
                  checked={scheduleType === 'recurring'}
                  onChange={() => setScheduleType('recurring')}
                />
                {' '}重複任務
              </label>
              
              {scheduleType === 'recurring' && (
                <div className="inset" style={{ marginLeft: '24px', marginTop: '8px', padding: '8px' }}>
                  {/* 每日 */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="recurringType"
                        checked={recurringType === 'daily'}
                        onChange={() => setRecurringType('daily')}
                      />
                      {' '}每日
                    </label>
                    
                    {recurringType === 'daily' && (
                      <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                        <label style={{ cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={workdaysOnly}
                            onChange={(e) => setWorkdaysOnly(e.target.checked)}
                          />
                          {' '}僅工作日 (週一~週五)
                        </label>
                      </div>
                    )}
                  </div>
                  
                  {/* 每週 */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="recurringType"
                        checked={recurringType === 'weekly'}
                        onChange={() => setRecurringType('weekly')}
                      />
                      {' '}每週
                    </label>
                    
                    {recurringType === 'weekly' && (
                      <div style={{ marginLeft: '24px', marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5, 6, 0].map((day, idx) => (
                          <label 
                            key={day}
                            style={{ 
                              cursor: 'pointer',
                              padding: '4px 8px',
                              border: '1px solid #000',
                              background: weekDays.includes(day) ? '#000080' : '#C0C0C0',
                              color: weekDays.includes(day) ? '#fff' : '#000'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={weekDays.includes(day)}
                              onChange={() => toggleWeekDay(day)}
                              style={{ marginRight: '4px' }}
                            />
                            {weekDayNames[idx]}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 每月 */}
                  <div>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="recurringType"
                        checked={recurringType === 'monthly'}
                        onChange={() => setRecurringType('monthly')}
                      />
                      {' '}每月
                    </label>
                    
                    {recurringType === 'monthly' && (
                      <div style={{ marginLeft: '24px', marginTop: '8px' }}>
                        <div style={{ marginBottom: '4px' }}>選擇日期：</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {monthDates.map(date => (
                            <span 
                              key={date}
                              style={{
                                padding: '4px 8px',
                                background: '#000080',
                                color: '#fff',
                                cursor: 'pointer'
                              }}
                              onClick={() => removeMonthDate(date)}
                            >
                              {date} 號 [X]
                            </span>
                          ))}
                        </div>
                        <Button onClick={addMonthDate} style={{ fontSize: '11px' }}>
                          新增日期
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 自動顯示規則說明 */}
        <div style={{ marginBottom: '16px' }}>
          <div className="inset" style={{ padding: '12px', background: '#FFFFCC', border: '1px solid #808080' }}>
            <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>行事曆顯示規則（自動）：</div>
              <div>• 單次任務/區間任務 → 特殊事件（直接顯示）</div>
              <div>• 每日重複任務 → 例行公事（摺疊為 "[+] X 項"）</div>
              <div>• 每週/每月任務 → 週期任務（直接顯示）</div>
            </div>
          </div>
        </div>
        
        {/* 按鈕 */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>取消</Button>
          <Button onClick={handleSave}>儲存變更</Button>
        </div>
      </div>
    </div>
  )
}

