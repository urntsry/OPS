'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Calendar from '@/components/Calendar'
import EventList from '@/components/EventList'
import Button from '@/components/Button'
import AddEventModal from '@/components/AddEventModal'
import Toast from '@/components/Toast'
// Sidebar/MobileNav: kept for legacy dead-code branches only (never reached at runtime)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Sidebar from '@/components/Sidebar'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import MobileNav from '@/components/MobileNav'
import HRPage from '@/components/HRPage'
import SettingsPage from '@/components/SettingsPage'
import PointsPage from '@/components/PointsPage'
import AnnouncementDetailModal from '@/components/AnnouncementDetailModal'
import Win95Window from '@/components/win95/Win95Window'
import Taskbar from '@/components/Taskbar'
import DevTrackerPage from '@/components/DevTrackerPage'
import MeetingPage from '@/components/MeetingPage'
import MeetingCreateModal from '@/components/MeetingCreateModal'
import FaxPage from '@/components/FaxPage'
import OPSPage from '@/components/OPSPage'
import SalesPage from '@/components/SalesPage'
import ReportPage from '@/components/ReportPage'
import ExternalAppFrame from '@/components/ExternalAppFrame'
import { useWindowManager, WINDOW_CONFIGS, TASKBAR_HEIGHT } from '@/lib/useWindowManager'
import { getBulletins, getBulletinCalendarEvents, deleteBulletin, updateBulletin, getBulletinById, type Bulletin } from '@/lib/bulletinApi'
import { getMeetingsForMonth as fetchMeetingsForMonth } from '@/lib/meetingsApi'
import { 
  getTaskDefinitionsByAssignee, 
  getPendingAssignments,
  updateAssignmentStatus,
  createTaskDefinition,
  createDailyAssignment,
  deleteTaskDefinition,
  deleteDailyAssignment,
  getAllProfiles,
  getProfileByEmployeeId,
  type TaskDefinition,
  type DailyAssignment,
  type Profile
} from '@/lib/api'

function BulletinEditModal({ bulletin, onSave, onClose }: { bulletin: Bulletin; onSave: (u: { title: string; content: string }) => void; onClose: () => void }) {
  const [title, setTitle] = useState(bulletin.title)
  const [content, setContent] = useState(bulletin.content || '')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="window" style={{ width: '360px', fontFamily: 'monospace' }} onClick={e => e.stopPropagation()}>
        <div className="titlebar" style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>EDIT BULLETIN</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', outline: 'none' }}>×</button>
        </div>
        <div style={{ padding: '8px' }}>
          <div style={{ marginBottom: '4px' }}>
            <label style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>TITLE</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="inset" style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '3px 6px', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '6px' }}>
            <label style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>CONTENT</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} className="inset" rows={4} style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '3px 6px', background: 'var(--bg-input)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn" style={{ fontSize: '9px', padding: '3px 10px' }}>CANCEL</button>
            <button onClick={() => onSave({ title, content })} className="btn" style={{ fontSize: '9px', padding: '3px 10px', fontWeight: 'bold' }}>SAVE</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ background: '#C0C0C0', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>LOADING...</div>}>
      <HomePageInner />
    </Suspense>
  )
}

function HomePageInner() {
  // NOTE: Win95 desktop layout is now the only layout (works at all widths).
  // The old mobile/tablet branches have been retired — at small viewports the
  // taskbar / windows simply scale down. This avoids the jarring "sidebar with
  // OPS/SALES/REPORT" layout that appeared below 1024px.
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openWindow } = useWindowManager()
  
  // 從 URL 參數讀取當前分頁，預設為 'home'
  const tabFromUrl = searchParams.get('tab') || 'home'
  const [currentTab, setCurrentTabState] = useState(tabFromUrl)
  
  // 自訂 setCurrentTab 來同時更新 URL
  const setCurrentTab = (tab: string) => {
    setCurrentTabState(tab)
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'home') {
      params.delete('tab') // home 是預設值，不需要顯示在 URL
    } else {
      params.set('tab', tab)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/home'
    router.replace(newUrl, { scroll: false })
  }
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  // Advanced meeting create modal
  const [meetingModalOpen, setMeetingModalOpen] = useState(false)
  const [meetingModalDefaults, setMeetingModalDefaults] = useState<{ title: string; date: string }>({ title: '', date: '' })
  const [calendarRefreshTick, setCalendarRefreshTick] = useState(0)
  // Meetings for calendar (merged with assignment events)
  const [meetingsForMonth, setMeetingsForMonth] = useState<Array<{ id: string; title: string; meeting_date: string; summary: string | null; location: string | null; start_time: string | null }>>([])
  const [hideWeekend, setHideWeekend] = useState(false) // 隱藏週末
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  // 真實資料狀態
  const [routineTasks, setRoutineTasks] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // 從 localStorage 讀取登入資訊
  const [userId, setUserId] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('user')
  
  // 佈告系統
  const [publicBulletins, setPublicBulletins] = useState<Bulletin[]>([])
  const [noticeBulletins, setNoticeBulletins] = useState<Bulletin[]>([])
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null)

  // 管理者視圖功能
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [viewingUserId, setViewingUserId] = useState<string>('')
  const [viewingUserProfile, setViewingUserProfile] = useState<Profile | null>(null)
  const [searchEmployeeId, setSearchEmployeeId] = useState('')
  
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
      const profile: Profile = {
        id: user.id,
        employee_id: user.employeeId,
        full_name: user.fullName,
        department: user.department,
        job_title: user.jobTitle || '',
        role: user.role,
        site_code: user.siteCode || 'ALL',
        points_balance: 0, // 之後從 API 載入
        avatar_url: undefined,
        created_at: new Date().toISOString()
      }
      setUserProfile(profile)
      setViewingUserId(user.id) // 預設查看自己
      setViewingUserProfile(profile) // 預設查看自己
    } catch (error) {
      console.error('[HomePage] 解析使用者資訊失敗:', error)
      window.location.href = '/'
    }
  }, [])
  
  // 載入所有用戶（僅 Admin）
  useEffect(() => {
    if (userRole === 'admin' && userId) {
      loadAllUsers()
    }
  }, [userRole, userId])
  
  // 載入佈告資料 — 初始載入 + Supabase Realtime 即時訂閱
  useEffect(() => {
    loadBulletins()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (!supabaseUrl || !supabaseKey) return

    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const channel = supabase
      .channel('bulletins-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bulletins' }, () => {
        loadBulletins()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadBulletins = async () => {
    try {
      const [pub, notice] = await Promise.all([
        getBulletins('public'),
        getBulletins('notice'),
      ])
      setPublicBulletins(pub)
      setNoticeBulletins(notice)
    } catch (e) {
      console.error('[HomePage] 載入佈告失敗:', e)
    }
  }

  const handleDeleteBulletin = async (id: number | string) => {
    if (!confirm('確定要刪除此公告？')) return
    try {
      await deleteBulletin(String(id))
      loadBulletins()
    } catch (e) {
      console.error('[HomePage] 刪除佈告失敗:', e)
    }
  }

  const handleEditBulletin = async (id: number | string) => {
    try {
      const b = await getBulletinById(String(id))
      if (b) setEditingBulletin(b)
    } catch (e) {
      console.error('[HomePage] 載入佈告失敗:', e)
    }
  }

  const handleSaveBulletin = async (updates: { title: string; content: string }) => {
    if (!editingBulletin) return
    try {
      await updateBulletin(editingBulletin.id, updates)
      setEditingBulletin(null)
      loadBulletins()
      setToast({ message: 'Bulletin updated', type: 'success' })
      setTimeout(() => setToast(null), 2000)
    } catch (e) {
      console.error('[HomePage] 更新佈告失敗:', e)
      setToast({ message: 'Update failed', type: 'error' })
      setTimeout(() => setToast(null), 2000)
    }
  }

  const canEditBulletins = userRole === 'admin' || userRole === 'supervisor'

  const loadAllUsers = async () => {
    try {
      console.log('[HomePage] 載入所有用戶...')
      const users = await getAllProfiles()
      setAllUsers(users)
      console.log('[HomePage] 載入用戶數:', users.length)
    } catch (error) {
      console.error('[HomePage] 載入用戶失敗:', error)
    }
  }
  
  // 切換查看的用戶
  const handleSwitchView = async (targetUserId: string) => {
    console.log('[HomePage] 切換視圖到用戶:', targetUserId)
    
    if (!targetUserId) {
      console.log('[HomePage] 切換回自己')
      setViewingUserId(userId)
      setViewingUserProfile(userProfile)
      return
    }
    
    try {
      setViewingUserId(targetUserId)
      
      // 從 allUsers 中找到該用戶
      const targetUser = allUsers.find(u => u.id === targetUserId)
      if (targetUser) {
        setViewingUserProfile(targetUser)
        console.log('[HomePage] 切換到:', targetUser.full_name)
      }
    } catch (error) {
      console.error('[HomePage] 切換視圖失敗:', error)
    }
  }
  
  // 通過員工編號搜尋
  const handleSearchByEmployeeId = async () => {
    if (!searchEmployeeId.trim()) return
    
    console.log('[HomePage] 搜尋員工編號:', searchEmployeeId)
    
    try {
      const user = await getProfileByEmployeeId(searchEmployeeId)
      if (user) {
        handleSwitchView(user.id)
        setSearchEmployeeId('')
      } else {
        setToast({ message: '找不到該員工編號', type: 'error' })
      }
    } catch (error) {
      console.error('[HomePage] 搜尋失敗:', error)
      setToast({ message: '搜尋失敗', type: 'error' })
    }
  }
  
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
    
    // 決定要載入哪個用戶的任務
    const targetUserId = viewingUserId || userId
    
    async function loadUserTasks() {
      console.log('[HomePage] 開始載入使用者任務，目標用戶:', targetUserId)
      setLoading(true)
      
      try {
        // 1. 取得使用者的任務定義（例行公事）
        console.log('[HomePage] 取得任務定義...')
        const taskDefs = await getTaskDefinitionsByAssignee(targetUserId)
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
        
        // 轉換為顯示格式 — 解析事件類型
        const assignmentsData = pendingTasks.map((assignment: any) => {
          const taskDef = assignment.task_def
          let eventType = 'assignment'
          if (taskDef?.task_category) {
            eventType = taskDef.task_category
          } else if (taskDef?.description?.startsWith('type:')) {
            eventType = taskDef.description.replace('type:', '')
          } else if (taskDef?.is_active) {
            eventType = 'routine'
          }
          return {
            id: assignment.id,
            title: taskDef?.title || '未命名任務',
            date: formatDate(assignment.assigned_date),
            done: assignment.status === 'completed',
            rawDate: assignment.assigned_date,
            type: eventType,
          }
        })
        
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
  }, [userId, viewingUserId, calendarRefreshTick]) // 依賴 userId 和 viewingUserId, 以及刷新計數器

  // 載入當月會議（用於日曆顯示）
  useEffect(() => {
    let cancelled = false
    fetchMeetingsForMonth(currentYear, currentMonth)
      .then(data => { if (!cancelled) setMeetingsForMonth(data) })
      .catch(err => console.warn('[HomePage] load meetings failed:', err))
    return () => { cancelled = true }
  }, [currentYear, currentMonth, calendarRefreshTick])
  
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
  
  // PUBLIC 面板資料（從 DB 載入）
  const publicEvents = publicBulletins.map(b => ({
    id: b.id as any,
    title: b.title,
    date: b.event_date ? formatDate(b.event_date) : (b.is_recurring && b.recurring_days ? `每月${b.recurring_days.join(',')}日` : ''),
  }))

  // NOTICE 面板資料（從 DB 載入）
  const announcements = noticeBulletins.map(b => ({
    id: b.id as any,
    title: b.priority === 'urgent' ? `[!] ${b.title}` : b.priority === 'important' ? `[*] ${b.title}` : b.title,
    content: b.content || '',
    postedBy: b.department || '',
    postedAt: b.created_at?.slice(0, 10) || '',
    attachments: b.attachments || [],
  }))

  // 從 assignments 生成日曆事件
  const assignmentEvents = assignments
    .filter(a => a.rawDate)
    .map(a => {
      const date = new Date(a.rawDate)
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        return {
          id: a.id,
          date: date.getDate(),
          title: a.title,
          type: a.type || 'assignment',
          done: a.done || false,
        }
      }
      return null
    })
    .filter(e => e !== null) as Array<{id: number, date: number, title: string, type: string, done: boolean}>

  // 從佈告系統生成日曆事件
  const bulletinCalendarEvents = getBulletinCalendarEvents(
    [...publicBulletins, ...noticeBulletins],
    currentYear,
    currentMonth
  ).map(e => ({ date: e.date, title: e.title, type: e.type }))

  // 將會議轉為日曆事件（type='meeting'）
  const meetingCalendarEvents = meetingsForMonth
    .filter(m => {
      const d = new Date(m.meeting_date)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })
    .map(m => ({
      id: undefined as number | undefined, // meetings 沒有 numeric id, 不可被 toggle/delete via assignment API
      date: new Date(m.meeting_date).getDate(),
      title: m.title,
      type: 'meeting',
      done: false,
      content: [
        m.start_time ? `時間: ${m.start_time.slice(0, 5)}` : null,
        m.location ? `地點: ${m.location}` : null,
        m.summary ? `\n${m.summary}` : null,
      ].filter(Boolean).join('\n'),
      detailLink: `/home?tab=meeting&id=${m.id}`,
    }))

  // 合併所有日曆事件
  const calendarEvents = [...assignmentEvents, ...bulletinCalendarEvents, ...meetingCalendarEvents]

  const handleToggleTask = async (id: number | string) => {
    console.log('[HomePage] handleToggleTask 被調用:', { id })
    
    try {
      // 更新資料庫
      await updateAssignmentStatus(Number(id), 'completed')
      
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
  const handleDeleteRoutineTask = async (id: number | string) => {
    console.log('[HomePage] handleDeleteRoutineTask 被調用:', { id })
    
    try {
      await deleteTaskDefinition(Number(id))
      
      // 更新本地狀態
      setRoutineTasks(prev => prev.filter(task => task.id !== id))
      
      console.log('[HomePage] 例行公事刪除成功')
    } catch (error) {
      console.error('[HomePage] 刪除例行公事失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }

  // 刪除交辦事項（測試用）
  const handleDeleteAssignment = async (id: number | string) => {
    console.log('[HomePage] handleDeleteAssignment 被調用:', { id })
    
    try {
      await deleteDailyAssignment(Number(id))
      
      // 更新本地狀態
      setAssignments(prev => prev.filter(task => task.id !== id))
      
      console.log('[HomePage] 交辦事項刪除成功')
    } catch (error) {
      console.error('[HomePage] 刪除交辦事項失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }

  const handleAddEvent = () => {
    setIsAddModalOpen(true)
  }

  const handleAnnouncementClick = (id: number | string) => {
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
    type: string
    dates: string[]
  }) => {
    console.log('[HomePage] handleSubmitEvent 被調用:', data)
    console.log('[HomePage] 事項標題:', data.title)
    console.log('[HomePage] 事項類型:', data.type)
    console.log('[HomePage] 選擇日期:', data.dates)
    
    setIsAddModalOpen(false)
    
    try {
      if (data.type === 'routine') {
        const newTask = await createTaskDefinition({
          title: data.title,
          frequency: 'daily',
          base_points: 10,
          default_assignee_id: userId,
          site_location: 'ALL',
          is_active: true
        })

        setRoutineTasks(prev => [...prev, {
          id: newTask.id,
          title: newTask.title,
          date: '每日',
          done: false
        }])

        // Also create daily_assignments for each selected date so it shows on calendar
        const newAssignments: any[] = []
        for (const dateStr of data.dates) {
          const assignment = await createDailyAssignment({
            task_def_id: newTask.id,
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
            rawDate: dateStr,
            type: 'routine',
          })
        }
        if (newAssignments.length > 0) {
          setAssignments(prev => [...prev, ...newAssignments].sort((a, b) => a.rawDate.localeCompare(b.rawDate)))
        }

        setToast({ message: `✓ 例行公事「${data.title}」新增成功 (${data.dates.length} 日)`, type: 'success' })
        
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
            rawDate: dateStr,
            type: 'assignment',
          })
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
        // All other types (public, event, meeting, visit, training)
        const taskDef = await createTaskDefinition({
          title: data.title,
          frequency: 'event_triggered',
          base_points: 5,
          default_assignee_id: userId,
          site_location: 'ALL',
          is_active: false,
          description: `type:${data.type}`,
        })

        const newAssignments: any[] = []
        for (const dateStr of data.dates) {
          const assignment = await createDailyAssignment({
            task_def_id: taskDef.id,
            user_id: userId,
            status: 'pending',
            assigned_date: dateStr,
            earned_points: 5
          })

          newAssignments.push({
            id: assignment.id,
            title: data.title,
            date: formatDate(dateStr),
            done: false,
            rawDate: dateStr,
            type: data.type,
          })
        }

        setAssignments(prev => [...prev, ...newAssignments].sort((a, b) =>
          a.rawDate.localeCompare(b.rawDate)
        ))

        setToast({ message: `✓「${data.title}」新增成功 (${data.dates.length} 個日期)`, type: 'success' })
      }
      
    } catch (error) {
      console.error('[HomePage] 新增任務失敗:', error)
      setToast({ message: '新增失敗，請稍後再試', type: 'error' })
    } finally {
      // cleanup done
    }
  }

  const handleLogout = () => {
    if (confirm('確定要登出？')) {
      localStorage.removeItem('currentUser')
      window.location.href = '/'
    }
  }

  // ============================================
  // MOBILE LAYOUT — RETIRED (kept as dead code for reference, never reached)
  // We now use the same Win95 desktop OS layout at every viewport.
  // ============================================
  const _mobileLegacy = false as boolean
  if (_mobileLegacy) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#C0C0C0',
        fontFamily: 'monospace',
        fontSize: '10px',
        paddingBottom: '46px'
      }}>
        {/* Mobile Header - 更緊湊 */}
        <div style={{
          background: '#000080',
          color: '#FFF',
          padding: '4px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>OPS</div>
            <div style={{ fontSize: '9px', color: '#AAA' }}>{userProfile?.full_name || '---'}</div>
          </div>
          <div style={{ fontSize: '9px', textAlign: 'right' }}>
            <span style={{ marginRight: '8px' }}>PT:{userProfile?.points_balance || 0}</span>
            <button 
              onClick={handleLogout}
              style={{ 
                background: 'none', 
                border: '1px solid #FFF', 
                color: '#FFF', 
                fontSize: '8px',
                padding: '1px 4px',
                cursor: 'pointer'
              }}
            >
              OUT
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Mobile Content */}
        <div style={{ padding: '4px', overflowY: 'auto', flex: 1 }}>
          {currentTab === 'home' && (
            <>
              {loading ? (
                <div className="window p-2 text-center"><div style={{ fontSize: '10px' }}>LOADING...</div></div>
              ) : (
                <>
                  {/* 行事曆 + 隱藏週末開關 */}
                  <div style={{ marginBottom: '4px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'flex-end', 
                      alignItems: 'center',
                      marginBottom: '2px',
                      fontSize: '9px',
                      fontFamily: 'monospace'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={hideWeekend} 
                          onChange={(e) => setHideWeekend(e.target.checked)}
                          style={{ width: '12px', height: '12px' }}
                        />
                        隱藏週末
                      </label>
                    </div>
                    <Calendar 
                      year={currentYear} 
                      month={currentMonth} 
                      events={calendarEvents} 
                      hideWeekend={hideWeekend}
                      compact={true}
                      onMonthChange={(y, m) => { setCurrentYear(y); setCurrentMonth(m) }}
                      onToggleEvent={handleToggleTask}
                      onDeleteEvent={handleDeleteAssignment}
                      onAddEvent={handleSubmitEvent}
                      userRole={userRole}
                      userId={userId}
                      userDepartment={userProfile?.department || ''}
                    />
                  </div>

                  {/* 任務區 - 兩欄 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                    {/* 任務列表 */}
                    <div className="window">
                      <div className="titlebar" style={{ padding: '2px 4px', fontSize: '9px' }}>
                        TASKS ({assignments.length})
                      </div>
                      <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                        {assignments.length === 0 ? (
                          <div style={{ padding: '6px', textAlign: 'center', color: '#808080', fontSize: '8px' }}>NO TASKS</div>
                        ) : (
                          assignments.map((task) => (
                            <div 
                              key={task.id}
                              onClick={() => handleToggleTask(task.id)}
                              style={{
                                padding: '4px',
                                borderBottom: '1px solid #E0E0E0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '9px',
                                cursor: 'pointer',
                                background: task.done ? '#E0E0E0' : '#FFF'
                              }}
                            >
                              <span style={{ fontSize: '10px' }}>{task.done ? '[V]' : '[ ]'}</span>
                              <span style={{ flex: 1, textDecoration: task.done ? 'line-through' : 'none', color: task.done ? '#808080' : '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {task.title}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 例行公事 */}
                    <div className="window">
                      <div className="titlebar" style={{ padding: '2px 4px', fontSize: '9px' }}>
                        ROUTINE ({routineTasks.length})
                      </div>
                      <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                        {routineTasks.length === 0 ? (
                          <div style={{ padding: '6px', textAlign: 'center', color: '#808080', fontSize: '8px' }}>NO DATA</div>
                        ) : (
                          routineTasks.map((task) => (
                            <div key={task.id} style={{ padding: '4px', borderBottom: '1px solid #E0E0E0', fontSize: '9px', background: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.title}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 公告 */}
                  <div className="window">
                    <div className="titlebar" style={{ padding: '2px 4px', fontSize: '9px' }}>NOTICE</div>
                    <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                      {announcements.map((ann) => (
                        <div 
                          key={ann.id}
                          onClick={() => handleAnnouncementClick(ann.id)}
                          style={{ padding: '4px', borderBottom: '1px solid #E0E0E0', fontSize: '9px', background: '#FFF', cursor: 'pointer' }}
                        >
                          {ann.title}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {currentTab === 'hr' && <HRPage isAdmin={userRole === 'admin'} />}
          {currentTab === 'operations' && <div className="window p-2"><div style={{ textAlign: 'center', fontSize: '10px' }}>OPS (建構中)</div></div>}
          {currentTab === 'settings' && <SettingsPage isAdmin={userRole === 'admin'} />}
          {currentTab === 'points' && <PointsPage userProfile={userProfile} />}
        </div>

        {/* Mobile Bottom Navigation - 更緊湊 */}
        <MobileNav currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* Modals */}
        <AddEventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleSubmitEvent} zIndex={addModalZIndex} position={getModalPosition(0)} userRole={userRole} />
        <AnnouncementDetailModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} zIndex={announcementModalZIndex} position={getModalPosition(1)} />
      </div>
    )
  }

  // ============================================
  // TABLET LAYOUT — RETIRED (kept as dead code for reference, never reached)
  // ============================================
  const _tabletLegacy = false as boolean
  if (_tabletLegacy) {
    return (
      <div style={{ 
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'monospace'
      }}>
        {/* 使用標準側邊欄組件 */}
        <Sidebar 
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          userProfile={userProfile}
          onLogout={handleLogout}
        />

        {/* Main Content - 全寬延伸到右側 */}
        <div style={{ 
          flex: 1, 
          padding: '8px', 
          background: '#C0C0C0', 
          overflowY: 'auto',
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Top Header Bar */}
          <div className="window" style={{ marginBottom: '6px' }}>
            <div className="titlebar" style={{ padding: '2px 6px', fontSize: '10px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                {currentTab === 'home' && 'HOME > CALENDAR & TASKS'}
                {currentTab === 'hr' && 'HOME > HR > PERSONNEL'}
                {currentTab === 'operations' && 'HOME > OPS > FACTORY'}
                {currentTab === 'settings' && 'HOME > CONFIG > SETTINGS'}
                {currentTab === 'points' && 'HOME > POINTS > 積分中心'}
              </span>
              <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>
                {new Date().toLocaleDateString('zh-TW')} {new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

          {currentTab === 'home' && (
            <div style={{ flex: 1 }}>
              {loading ? (
                <div className="window p-4 text-center" style={{ marginBottom: '8px' }}>LOADING...</div>
              ) : (
                <>
                  {/* Calendar - 全寬 */}
                  <div style={{ position: 'relative', marginBottom: '6px', width: '100%' }}>
                    <Calendar 
                      year={currentYear} 
                      month={currentMonth} 
                      events={calendarEvents} 
                      onMonthChange={(y, m) => { setCurrentYear(y); setCurrentMonth(m) }}
                      onToggleEvent={handleToggleTask}
                      onDeleteEvent={handleDeleteAssignment}
                      onAddEvent={handleSubmitEvent}
                      userRole={userRole}
                      userId={userId}
                      userDepartment={userProfile?.department || ''}
                    />
                  </div>

                  {/* 下方四欄：任務區 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', width: '100%' }}>
                    <EventList title="ROUTINE" events={routineTasks} onToggle={handleToggleTask} onDelete={handleDeleteRoutineTask} showAddButton={false} showDeleteButton={true} />
                    <EventList title="TASKS" events={assignments} onToggle={handleToggleTask} onDelete={handleDeleteAssignment} showAddButton={false} showDeleteButton={true} />
                    <EventList title="PUBLIC" events={publicEvents} onDelete={handleDeleteBulletin} onEdit={canEditBulletins ? handleEditBulletin : undefined} showAddButton={false} showDeleteButton={true} showEditButton={canEditBulletins} />
                    <EventList title="NOTICE" events={announcements} onItemClick={handleAnnouncementClick} onDelete={handleDeleteBulletin} onEdit={canEditBulletins ? handleEditBulletin : undefined} showAddButton={false} showDeleteButton={true} showEditButton={canEditBulletins} />
                  </div>
                </>
              )}
            </div>
          )}
          {currentTab === 'hr' && <HRPage isAdmin={userRole === 'admin'} />}
          {currentTab === 'operations' && <div className="window p-4"><div className="text-center">OPS (建構中)</div></div>}
          {currentTab === 'settings' && <SettingsPage isAdmin={userRole === 'admin'} />}
          {currentTab === 'points' && <PointsPage userProfile={userProfile} />}
        </div>

        {/* Modals */}
        <AddEventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleSubmitEvent} zIndex={addModalZIndex} position={getModalPosition(0)} userRole={userRole} />
        <AnnouncementDetailModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} zIndex={announcementModalZIndex} position={getModalPosition(1)} />
      </div>
    )
  }

  // ============================================
  // DESKTOP LAYOUT (>= 1024px)
  // 設計理念：Windows 95 桌面作業系統體驗
  // 日曆 = 桌面背景，各部門 = 獨立視窗
  // ============================================
  const isAdmin = userRole === 'admin'

  const handleOpenPoints = () => {
    openWindow('points')
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: 'monospace',
      backgroundColor: 'var(--bg-primary)',
      position: 'relative',
    }}>
      {/* Desktop Area — Calendar as background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: TASKBAR_HEIGHT,
        overflow: 'auto',
        padding: '6px',
        zIndex: 1,
      }}>
        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Admin View Switcher */}
        {isAdmin && (
          <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
            <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
              <span>VIEW: {viewingUserProfile ? viewingUserProfile.full_name : 'SELF'}</span>
            </div>
            <div className="inset" style={{ padding: '3px 4px', background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontFamily: 'monospace', flexWrap: 'wrap' }}>
              {viewingUserId && viewingUserId !== userId && (
                <Button onClick={() => handleSwitchView(userId)} style={{ fontSize: '9px', padding: '1px 5px', fontFamily: 'monospace' }}>RESET</Button>
              )}
              <select value={viewingUserId || userId} onChange={(e) => handleSwitchView(e.target.value)} className="inset" style={{ fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '1px 3px' }}>
                <option value={userId}>{userProfile?.full_name} [SELF]</option>
                {allUsers.filter(u => u.id !== userId).sort((a, b) => a.employee_id.localeCompare(b.employee_id)).map(user => (
                  <option key={user.id} value={user.id}>{user.full_name} ({user.employee_id})</option>
                ))}
              </select>
              <input type="text" placeholder="EMP ID" value={searchEmployeeId} onChange={(e) => setSearchEmployeeId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearchByEmployeeId() }} className="inset" style={{ fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '1px 3px', width: '55px' }} />
              <Button onClick={handleSearchByEmployeeId} style={{ fontSize: '9px', padding: '1px 4px', fontFamily: 'monospace' }}>GO</Button>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '9px' }}>N={allUsers.length}</span>
            </div>
          </div>
        )}

        {/* Calendar — Desktop Background */}
        {loading ? (
          <div className="window p-4 text-center"><div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>LOADING...</div></div>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: '6px' }}>
              <Calendar
                year={currentYear}
                month={currentMonth}
                events={calendarEvents}
                onMonthChange={(y, m) => { setCurrentYear(y); setCurrentMonth(m) }}
                onToggleEvent={handleToggleTask}
                onDeleteEvent={handleDeleteAssignment}
                onAddEvent={handleSubmitEvent}
                onAdvancedMeeting={(data) => {
                  setMeetingModalDefaults(data)
                  setMeetingModalOpen(true)
                }}
                userRole={userRole}
                userId={userId}
                userDepartment={userProfile?.department || ''}
              />
            </div>

            {/* Bottom panels — responsive: 4 cols wide / 2 cols medium / 1 col narrow */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
              <EventList title="ROUTINE" events={routineTasks} onToggle={handleToggleTask} onDelete={handleDeleteRoutineTask} showAddButton={false} showDeleteButton={true} />
              <EventList title="TASKS" events={assignments} onToggle={handleToggleTask} onDelete={handleDeleteAssignment} showAddButton={false} showDeleteButton={true} />
              <EventList title="PUBLIC" events={publicEvents} onDelete={handleDeleteBulletin} onEdit={canEditBulletins ? handleEditBulletin : undefined} showAddButton={false} showDeleteButton={true} showEditButton={canEditBulletins} />
              <EventList title="NOTICE" events={announcements} onItemClick={handleAnnouncementClick} onDelete={handleDeleteBulletin} onEdit={canEditBulletins ? handleEditBulletin : undefined} showAddButton={false} showDeleteButton={true} showEditButton={canEditBulletins} />
            </div>
          </>
        )}
      </div>

      {/* Application Windows Layer — Internal modules */}
      <Win95Window windowId="hr">
        <HRPage isAdmin={isAdmin} />
      </Win95Window>

      <Win95Window windowId="meeting">
        <MeetingPage isAdmin={isAdmin} userProfile={userProfile} />
      </Win95Window>

      <Win95Window windowId="fax">
        <FaxPage isAdmin={isAdmin} userProfile={userProfile} />
      </Win95Window>

      <Win95Window windowId="operations">
        <OPSPage isAdmin={isAdmin} />
      </Win95Window>

      <Win95Window windowId="sales">
        <SalesPage isAdmin={isAdmin} />
      </Win95Window>

      <Win95Window windowId="reports">
        <ReportPage isAdmin={isAdmin} />
      </Win95Window>

      <Win95Window windowId="settings">
        <SettingsPage isAdmin={isAdmin} />
      </Win95Window>

      <Win95Window windowId="points">
        <PointsPage userProfile={userProfile} />
      </Win95Window>

      <Win95Window windowId="devtracker">
        <DevTrackerPage />
      </Win95Window>

      {/* External App Windows — dynamically rendered from WINDOW_CONFIGS */}
      {WINDOW_CONFIGS.filter(c => c.type === 'external' && c.externalUrl).map(config => (
        <React.Fragment key={config.id}>
          <Win95Window windowId={config.id}>
            <ExternalAppFrame windowId={config.id} url={config.externalUrl!} title={config.title} />
          </Win95Window>
          <ExternalAppFrame windowId={config.id} url={config.externalUrl!} title={config.title} />
        </React.Fragment>
      ))}

      {/* Modals */}
      <AddEventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleSubmitEvent} zIndex={addModalZIndex} position={getModalPosition(0)} userRole={userRole} />
      <AnnouncementDetailModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} zIndex={announcementModalZIndex} position={getModalPosition(1)} />

      {/* Bulletin Edit Modal */}
      {editingBulletin && (
        <BulletinEditModal
          bulletin={editingBulletin}
          onSave={handleSaveBulletin}
          onClose={() => setEditingBulletin(null)}
        />
      )}

      {/* Advanced Meeting Create Modal */}
      <MeetingCreateModal
        open={meetingModalOpen}
        defaultDate={meetingModalDefaults.date}
        defaultTitle={meetingModalDefaults.title}
        currentUserId={userId}
        onClose={() => setMeetingModalOpen(false)}
        onCreated={() => {
          // Bump tick to reload meetings + calendar
          setCalendarRefreshTick(t => t + 1)
        }}
      />

      {/* Taskbar */}
      <Taskbar
        userProfile={userProfile}
        onLogout={handleLogout}
        onOpenPoints={handleOpenPoints}
        isAdmin={isAdmin}
      />
    </div>
  )
}

