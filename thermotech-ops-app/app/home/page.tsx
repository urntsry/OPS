'use client'

import { useState, useEffect } from 'react'
import Calendar from '@/components/Calendar'
import EventList from '@/components/EventList'
import Button from '@/components/Button'
import AddEventModal from '@/components/AddEventModal'
import CalendarInlineForm from '@/components/CalendarInlineForm'
import Toast from '@/components/Toast'
import AdminTabs from '@/components/AdminTabs'
import HRNotificationPage from '@/components/HRNotificationPage'
import SettingsPage from '@/components/SettingsPage'
import AnnouncementDetailModal from '@/components/AnnouncementDetailModal'
import { 
  getTaskDefinitionsByAssignee, 
  getPendingAssignments,
  updateAssignmentStatus,
  createTaskDefinition,
  createDailyAssignment,
  deleteTaskDefinition,
  deleteDailyAssignment,
  type TaskDefinition,
  type DailyAssignment
} from '@/lib/api'

export default function HomePage() {
  const [currentYear] = useState(2025)
  const [currentMonth] = useState(10) // 11月 (0-indexed)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCalendarFormOpen, setIsCalendarFormOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  const [preselectedDateString, setPreselectedDateString] = useState<string | null>(null)
  const [calendarFormPosition, setCalendarFormPosition] = useState({ x: 0, y: 0 })
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)
  const [currentTab, setCurrentTab] = useState('home')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  // 真實資料狀態
  const [routineTasks, setRoutineTasks] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // 從 localStorage 讀取登入資訊
  const [userId, setUserId] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('user')
  
  // 載入登入使用者資訊
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    
    if (!currentUser) {
      console.log('[HomePage] 未登入，導向登入頁')
      window.location.href = '/'
      return
    }
    
    try {
      const user = JSON.parse(currentUser)
      console.log('[HomePage] 載入使用者:', user)
      setUserId(user.id)
      setUserRole(user.role)
      setUserProfile({
        id: user.id,
        employee_id: user.employeeId,
        full_name: user.fullName,
        department: user.department,
        role: user.role,
        points_balance: 0 // 之後從 API 載入
      })
    } catch (error) {
      console.error('[HomePage] 解析使用者資訊失敗:', error)
      window.location.href = '/'
    }
  }, [])
  
  // 計算視窗位置（不重疊）
  const getModalPosition = (index: number) => {
    const baseX = 100
    const baseY = 80
    const offset = 40
    return {
      x: baseX + (index * offset),
      y: baseY + (index * offset)
    }
  }
  
  // 計算 z-index（後開的視窗在上面）
  const addModalZIndex = 1000
  const announcementModalZIndex = 1001
  
  // 載入使用者任務資料
  useEffect(() => {
    // 等待 userId 載入完成
    if (!userId) {
      console.log('[HomePage] 等待 userId 載入...')
      return
    }
    
    async function loadUserTasks() {
      console.log('[HomePage] 開始載入使用者任務')
      setLoading(true)
      
      try {
        // 1. 取得使用者的任務定義（例行公事）
        console.log('[HomePage] 取得任務定義...')
        const taskDefs = await getTaskDefinitionsByAssignee(userId)
        console.log('[HomePage] 任務定義:', taskDefs.length)
        
        // 轉換為顯示格式
        const routineTasksData = taskDefs.map((task: TaskDefinition) => ({
          id: task.id,
          title: task.title,
          date: getFrequencyLabel(task.frequency),
          done: false // 預設未完成
        }))
        
        setRoutineTasks(routineTasksData)
        
        // 2. 取得使用者的待辦任務（交辦事項）
        console.log('[HomePage] 取得待辦任務...')
        const pendingTasks = await getPendingAssignments(userId)
        console.log('[HomePage] 待辦任務:', pendingTasks.length)
        
        // 轉換為顯示格式
        const assignmentsData = pendingTasks.map((assignment: any) => ({
          id: assignment.id,
          title: assignment.task_def?.title || '未命名任務',
          date: formatDate(assignment.assigned_date),
          done: assignment.status === 'completed',
          rawDate: assignment.assigned_date // 保留原始日期用於日曆顯示
        }))
        
        setAssignments(assignmentsData)
        
        console.log('[HomePage] 資料載入完成')
      } catch (error) {
        console.error('[HomePage] 載入資料失敗:', error)
        alert('載入資料失敗，請檢查資料庫連線')
      } finally {
        setLoading(false)
      }
    }
    
    loadUserTasks()
  }, [userId]) // 依賴 userId
  
  // 轉換頻率為中文標籤
  function getFrequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      'daily': '每日',
      'weekly': '每週',
      'monthly': '每月',
      'event_triggered': '事件觸發'
    }
    return labels[frequency] || frequency
  }
  
  // 格式化日期
  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  }
  
  // 從 assignments 生成日曆事件
  const calendarEvents = assignments
    .filter(a => a.rawDate) // 只處理有日期的任務
    .map(a => {
      const date = new Date(a.rawDate)
      // 檢查是否在當前月份
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        return {
          date: date.getDate(),
          title: a.title,
          type: 'assignment' as const
        }
      }
      return null
    })
    .filter(e => e !== null) as Array<{date: number, title: string, type: 'routine' | 'assignment' | 'public'}>
  
  console.log('[HomePage] 日曆事件:', calendarEvents)

  const publicEvents = [
    { id: 1, title: '垃圾車收運', date: '11/22' },
    { id: 2, title: '公司尾牙', date: '11/28' },
    { id: 3, title: '員工體檢', date: '12/07' },
    { id: 4, title: '國定假日', date: '12/25' },
  ]

  const announcements = [
    { 
      id: 1, 
      title: '[NEW] 本週五消防演練通知',
      content: '各位同仁您好，\n\n本週五（11/29）下午3點將進行全廠消防演練。\n\n請各位同仁配合演練流程，確保安全。',
      postedBy: '管理部',
      postedAt: '2025/11/25 14:30',
      links: ['https://example.com/fire-drill.pdf']
    },
    { 
      id: 2, 
      title: '上週完成率 85%',
      content: '上週任務完成統計：\n總任務數：200\n已完成：170\n完成率：85%',
      postedBy: '系統',
      postedAt: '2025/11/24'
    },
    { 
      id: 3, 
      title: '12月排班表已公告',
      content: '12月份排班表已經公告，請至人事系統查看。',
      postedBy: '人事部',
      postedAt: '2025/11/23'
    },
  ]

  const handleToggleTask = async (id: number) => {
    console.log('[HomePage] handleToggleTask 被調用:', { id })
    
    try {
      // 更新資料庫
      await updateAssignmentStatus(id, 'completed')
      
      // 更新本地狀態（樂觀 UI）
      setAssignments(prev => prev.map(task => 
        task.id === id ? { ...task, done: !task.done } : task
      ))
      
      console.log('[HomePage] 任務狀態更新成功')
    } catch (error) {
      console.error('[HomePage] 更新任務狀態失敗:', error)
      alert('更新失敗，請稍後再試')
    }
  }

  // 刪除例行公事（測試用）
  const handleDeleteRoutineTask = async (id: number) => {
    console.log('[HomePage] handleDeleteRoutineTask 被調用:', { id })
    
    try {
      await deleteTaskDefinition(id)
      
      // 更新本地狀態
      setRoutineTasks(prev => prev.filter(task => task.id !== id))
      
      console.log('[HomePage] 例行公事刪除成功')
    } catch (error) {
      console.error('[HomePage] 刪除例行公事失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }

  // 刪除交辦事項（測試用）
  const handleDeleteAssignment = async (id: number) => {
    console.log('[HomePage] handleDeleteAssignment 被調用:', { id })
    
    try {
      await deleteDailyAssignment(id)
      
      // 更新本地狀態
      setAssignments(prev => prev.filter(task => task.id !== id))
      
      console.log('[HomePage] 交辦事項刪除成功')
    } catch (error) {
      console.error('[HomePage] 刪除交辦事項失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }

  const handleAddEvent = () => {
    console.log('[HomePage] handleAddEvent 被調用 - 開啟新增視窗（中央）')
    setIsAddModalOpen(true)
    setIsCalendarFormOpen(false)
    console.log('[HomePage] isAddModalOpen 設為 true')
  }

  const handleDateClick = (date: number, event: React.MouseEvent) => {
    console.log('[HomePage] handleDateClick 被調用:', { date, currentYear, currentMonth })
    const year = currentYear
    const month = String(currentMonth + 1).padStart(2, '0')
    const day = String(date).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    // 計算點擊位置附近的表單位置
    const clickX = event.clientX
    const clickY = event.clientY
    
    console.log('[HomePage] 格式化日期:', dateString, '點擊位置:', { clickX, clickY })
    setSelectedDate(date)
    setPreselectedDateString(dateString)
    setCalendarFormPosition({ 
      x: Math.min(clickX - 100, window.innerWidth - 400), 
      y: Math.max(clickY - 50, 100) 
    })
    setIsCalendarFormOpen(true)
    setIsAddModalOpen(false)
    console.log('[HomePage] CalendarInlineForm 已開啟，預選日期:', dateString)
  }

  const handleAnnouncementClick = (id: number) => {
    console.log('[HomePage] handleAnnouncementClick 被調用:', { id })
    const announcement = announcements.find(a => a.id === id)
    if (announcement) {
      console.log('[HomePage] 找到公告:', announcement)
      setSelectedAnnouncement(announcement)
    } else {
      console.warn('[HomePage] 找不到公告 ID:', id)
    }
  }

  const handleSubmitEvent = async (data: {
    title: string
    type: 'routine' | 'assignment' | 'public'
    dates: string[]
  }) => {
    console.log('[HomePage] handleSubmitEvent 被調用:', data)
    console.log('[HomePage] 事項標題:', data.title)
    console.log('[HomePage] 事項類型:', data.type)
    console.log('[HomePage] 選擇日期:', data.dates)
    
    // 關閉所有表單
    setIsAddModalOpen(false)
    setIsCalendarFormOpen(false)
    
    try {
      if (data.type === 'routine') {
        // 【例行公事】→ 只新增到 task_definitions（工作定義）
        console.log('[HomePage] 新增例行公事定義')
        const newTask = await createTaskDefinition({
          title: data.title,
          frequency: 'daily', // 預設每日
          base_points: 10,
          default_assignee_id: userId,
          site_location: 'ALL',
          is_active: true
        })
        console.log('[HomePage] 例行公事新增成功:', newTask.id)
        
        // 樂觀更新前端
        setRoutineTasks(prev => [...prev, {
          id: newTask.id,
          title: newTask.title,
          date: '每日',
          done: false
        }])
        
        setToast({ message: `✓ 例行公事「${data.title}」新增成功`, type: 'success' })
        
      } else if (data.type === 'assignment') {
        // 【交辦事項】→ 建立任務定義 + 建立每日任務
        console.log('[HomePage] 新增交辦事項')
        
        // 先建立一個任務定義（作為模板）
        const taskDef = await createTaskDefinition({
          title: data.title,
          frequency: 'event_triggered',
          base_points: 10,
          default_assignee_id: userId,
          site_location: 'ALL',
          is_active: false // 設為 false，這樣不會出現在「例行公事」
        })
        
        // 為每個日期建立具體任務
        const newAssignments: any[] = []
        for (const dateStr of data.dates) {
          const assignment = await createDailyAssignment({
            task_def_id: taskDef.id,
            user_id: userId,
            status: 'pending',
            assigned_date: dateStr,
            earned_points: 10
          })
          
          newAssignments.push({
            id: assignment.id,
            title: data.title,
            date: formatDate(dateStr),
            done: false,
            rawDate: dateStr
          })
          
          console.log('[HomePage] 交辦事項新增成功:', dateStr)
        }
        
        // 樂觀更新前端
        setAssignments(prev => [...prev, ...newAssignments].sort((a, b) => 
          a.rawDate.localeCompare(b.rawDate)
        ))
        
        setToast({ 
          message: `✓ 交辦事項「${data.title}」新增成功 (${data.dates.length} 個日期)`, 
          type: 'success' 
        })
        
      } else {
        // 公共事項 → TODO: 需要另外的表格
        console.log('[HomePage] 公共事項功能待實作')
        setToast({ message: '公共事項功能開發中', type: 'info' })
        return
      }
      
    } catch (error) {
      console.error('[HomePage] 新增任務失敗:', error)
      setToast({ message: '新增失敗，請稍後再試', type: 'error' })
    } finally {
      setSelectedDate(null)
      setPreselectedDateString(null)
    }
  }

  return (
    <div className="min-h-screen bg-grey-200 p-2" style={{ overflowY: 'auto' }}>
      <div className="container" style={{ maxWidth: '1400px' }}>
        {/* Header */}
        <div className="window mb-2">
          <div className="titlebar">
            THERMOTECH-OPS v2.8
          </div>
          <div className="p-2 flex justify-between items-center bg-grey-200">
            <div className="text-mono">
              USER: {userProfile ? `${userProfile.full_name} (${userProfile.employee_id}) | ${userProfile.department}` : '載入中...'} {loading && <span className="text-xs">(載入中...)</span>}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-mono text-bold">
                POINTS: {userProfile?.points_balance || 0}
              </div>
              <Button onClick={() => {
                if (confirm('確定要登出？')) {
                  localStorage.removeItem('currentUser')
                  window.location.href = '/'
                }
              }}>
                登出
              </Button>
            </div>
          </div>
        </div>

        {/* Toast 通知 */}
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

        {/* Admin Tabs (only for admin) */}
        {userRole === 'admin' && (
          <AdminTabs currentTab={currentTab} onTabChange={setCurrentTab} />
        )}

        {/* Main Content */}
        {currentTab === 'home' && (
          <>
            {/* Loading State */}
            {loading && (
              <div className="window p-4 text-center mb-2">
                <div className="text-mono text-bold">正在載入資料...</div>
              </div>
            )}
            
            {!loading && (
              <>
                {/* Calendar - 緊湊版 */}
                <div style={{ position: 'relative' }}>
                  <Calendar 
                    year={currentYear} 
                    month={currentMonth}
                    events={calendarEvents}
                    onDateClick={handleDateClick}
                  />
                  
                  {/* 日曆內嵌表單 */}
                  {isCalendarFormOpen && preselectedDateString && (
                    <CalendarInlineForm
                      selectedDate={preselectedDateString}
                      onSubmit={handleSubmitEvent}
                      onClose={() => {
                        setIsCalendarFormOpen(false)
                        setPreselectedDateString(null)
                      }}
                      position={calendarFormPosition}
                    />
                  )}
                </div>

                {/* Four Blocks - 緊湊排列 */}
                <div className="grid-2" style={{ marginTop: '8px', marginBottom: '8px' }}>
              <EventList
                title="例行公事"
                events={routineTasks}
                onAdd={handleAddEvent}
                onDelete={handleDeleteRoutineTask}
                showAddButton={true}
                showDeleteButton={true}
              />
              <EventList
                title="交辦事項"
                events={assignments}
                onToggle={handleToggleTask}
                onAdd={handleAddEvent}
                onDelete={handleDeleteAssignment}
                showAddButton={true}
                showDeleteButton={true}
              />
            </div>

            <div className="grid-2" style={{ marginTop: '8px', marginBottom: '8px' }}>
              <EventList
                title="公共事項"
                events={publicEvents}
                showAddButton={false}
              />
              <EventList
                title="公告欄"
                events={announcements}
                onItemClick={handleAnnouncementClick}
                showAddButton={false}
              />
            </div>
          </>
            )}
          </>
        )}

        {currentTab === 'hr' && (
          <HRNotificationPage />
        )}

        {currentTab === 'operations' && (
          <div className="window p-4">
            <div className="text-bold text-center">廠務管理頁面（建構中）</div>
          </div>
        )}

        {currentTab === 'sales' && (
          <div className="window p-4">
            <div className="text-bold text-center">業務管理頁面（建構中）</div>
          </div>
        )}

        {currentTab === 'reports' && (
          <div className="window p-4">
            <div className="text-bold text-center">報表頁面（建構中）</div>
          </div>
        )}

        {currentTab === 'settings' && (
          <SettingsPage />
        )}

        {/* Status Bar */}
        <div className="statusbar">
          <span className="text-mono">DATE: 2025/11/25</span>
          <span className="text-mono">TIME: {new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-mono status-ok">ONLINE</span>
        </div>

        {/* Add Event Modal */}
        <AddEventModal
          isOpen={isAddModalOpen}
          onClose={() => {
            console.log('[HomePage] 關閉新增事項視窗')
            setIsAddModalOpen(false)
            setSelectedDate(null)
            setPreselectedDateString(null)
          }}
          onSubmit={handleSubmitEvent}
          preselectedDate={preselectedDateString}
          zIndex={addModalZIndex}
          position={getModalPosition(0)}
        />

        {/* Announcement Detail Modal */}
        <AnnouncementDetailModal
          isOpen={!!selectedAnnouncement}
          onClose={() => {
            console.log('[HomePage] 關閉公告詳情視窗')
            setSelectedAnnouncement(null)
          }}
          announcement={selectedAnnouncement}
          zIndex={announcementModalZIndex}
          position={getModalPosition(1)}
        />
      </div>
    </div>
  )
}

