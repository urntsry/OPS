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
import DelegationCreateModal from '@/components/DelegationCreateModal'
import DelegatedPanel from '@/components/DelegatedPanel'
import FaxPage from '@/components/FaxPage'
import OPSPage from '@/components/OPSPage'
import SalesPage from '@/components/SalesPage'
import ReportPage from '@/components/ReportPage'
import ExternalAppFrame from '@/components/ExternalAppFrame'
import ManagerDashboard from '@/components/ManagerDashboard'
import AppCenterPage from '@/components/AppCenterPage'
import { useWindowManager, WINDOW_CONFIGS, TASKBAR_HEIGHT } from '@/lib/useWindowManager'
import { getEffectiveModules } from '@/lib/userAccessApi'
import { getBulletins, getBulletinCalendarEvents, deleteBulletin, updateBulletin, getBulletinById, markBulletinRead, ackBulletin, getMyReadMap, getLoginAlertBulletins, isBulletinVisibleTo, type Bulletin } from '@/lib/bulletinApi'
import { getMeetingsForMonth as fetchMeetingsForMonth, subscribeScheduledMeetings } from '@/lib/meetingsApi'
import { getDelegationsForMonth, subscribeDelegations, type Delegation } from '@/lib/delegationsApi'
import { 
  getTaskDefinitionsByAssignee, 
  getPendingAssignments,
  updateAssignmentStatus,
  createTaskDefinition,
  createDailyAssignment,
  deleteTaskDefinition,
  deleteDailyAssignment,
  updateTaskDefinitionDescription,
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
  // Delegations for calendar (cross-day bars)
  const [delegationsForMonth, setDelegationsForMonth] = useState<Delegation[]>([])
  // Delegation create modal
  const [delegationModalOpen, setDelegationModalOpen] = useState(false)
  // Deep-link target — when user clicks "完整詳情" on a meeting event
  const [selectedScheduledMeetingId, setSelectedScheduledMeetingId] = useState<string | null>(null)
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
  // 有效可見模組（依部門對應 + 個人 override 計算）
  const [allowedModules, setAllowedModules] = useState<string[] | null>(null)
  
  // 佈告系統
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null)
  // 公佈欄已讀狀態 + 登入未讀重要公告彈窗
  const [bulletinReadMap, setBulletinReadMap] = useState<Record<string, { read: boolean; acked: boolean }>>({})
  const [loginAlerts, setLoginAlerts] = useState<Bulletin[]>([])

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
      const profile: any = {
        id: user.id,
        employee_id: user.employeeId,
        full_name: user.fullName,
        department: user.department,
        job_title: user.jobTitle || '',
        role: user.role,
        site_code: user.siteCode || 'ALL',
        points_balance: 0,
        hr_access: user.hr_access || false,
        avatar_url: null,
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

  // 計算有效可見模組
  useEffect(() => {
    if (!userProfile?.id) return
    let cancelled = false
    getEffectiveModules({ id: userProfile.id, role: userProfile.role, department: userProfile.department })
      .then(set => { if (!cancelled) setAllowedModules(Array.from(set)) })
      .catch(err => {
        console.warn('[HomePage] 計算模組權限失敗，套用基本模組:', err)
        if (!cancelled) setAllowedModules(['meeting', 'points', 'appcenter'])
      })
    return () => { cancelled = true }
  }, [userProfile?.id, userProfile?.role, userProfile?.department])
  
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
      const all = await getBulletins()
      setBulletins(all)
    } catch (e) {
      console.error('[HomePage] 載入佈告失敗:', e)
    }
  }

  // 載入個人已讀狀態 + 登入未讀重要公告
  const refreshBulletinReads = async () => {
    if (!userId) return
    try {
      const ctx = { userId, department: userProfile?.department, role: userRole }
      const [map, alerts] = await Promise.all([
        getMyReadMap(userId),
        getLoginAlertBulletins(ctx),
      ])
      setBulletinReadMap(map)
      setLoginAlerts(alerts)
    } catch (e) {
      console.warn('[HomePage] 載入公告已讀狀態失敗:', e)
    }
  }

  useEffect(() => {
    if (userId) refreshBulletinReads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userProfile?.department, userRole])

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

  const canEditBulletins = userRole === 'admin' || userRole === 'supervisor' || userProfile?.hr_access === true

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
          const desc: string = taskDef?.description || ''
          let eventType = 'assignment'
          let content: string | undefined
          if (taskDef?.task_category) {
            eventType = taskDef.task_category
            content = desc || undefined
          } else if (desc.startsWith('type:')) {
            // 編碼格式：第一行 type:<類型>，其後（若有）為內容
            const nl = desc.indexOf('\n')
            eventType = (nl === -1 ? desc.slice(5) : desc.slice(5, nl)).trim()
            content = nl === -1 ? undefined : desc.slice(nl + 1)
          } else if (taskDef?.is_active) {
            eventType = 'routine'
            content = desc || undefined
          } else {
            content = desc || undefined
          }
          return {
            id: assignment.id,
            title: taskDef?.title || '未命名任務',
            date: formatDate(assignment.assigned_date),
            done: assignment.status === 'completed',
            rawDate: assignment.assigned_date,
            type: eventType,
            content,
            taskDefId: assignment.task_def_id,
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

  // Realtime: 任何 scheduled_meetings 異動 (新增/刪除/更新) 都立即重新撈，
  // 解決 SCHEDULE tab 刪除後日曆延遲移除的問題
  useEffect(() => {
    const unsub = subscribeScheduledMeetings(() => {
      setCalendarRefreshTick(t => t + 1)
    })
    return unsub
  }, [])

  // 載入當月交辦事項（用於日曆跨日橫條）
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getDelegationsForMonth(currentYear, currentMonth, userId)
      .then(data => { if (!cancelled) setDelegationsForMonth(data) })
      .catch(err => console.warn('[HomePage] load delegations failed:', err))
    return () => { cancelled = true }
  }, [currentYear, currentMonth, userId, calendarRefreshTick])

  // Realtime: 交辦事項異動 → 即時重撈
  useEffect(() => {
    if (!userId) return
    const unsub = subscribeDelegations(() => {
      setCalendarRefreshTick(t => t + 1)
    })
    return unsub
  }, [userId])
  
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
  
  // 依發布對象過濾 + 置頂優先排序
  const bulletinCtx = { userId, department: userProfile?.department, role: userRole }
  const sortPinned = (a: Bulletin, b: Bulletin) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1)
  const visibleBulletins = bulletins.filter(b => isBulletinVisibleTo(b, bulletinCtx)).slice().sort(sortPinned)

  // 統一公告面板資料
  const announcements = visibleBulletins.map(b => ({
    id: b.id as any,
    title: `${b.pinned ? '📌 ' : ''}${b.priority === 'urgent' ? '[緊急] ' : b.priority === 'important' ? '[重要] ' : ''}${b.title}`,
    content: b.content || '',
    postedBy: b.department || '',
    postedAt: (b.published_at || b.created_at)?.slice(0, 10) || '',
    attachments: b.attachments || [],
    requireAck: !!b.require_ack,
    acked: !!bulletinReadMap[b.id]?.acked,
    date: b.event_date ? formatDate(b.event_date) : (b.is_recurring && b.recurring_days ? `每月${b.recurring_days.join(',')}日` : ''),
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
          content: a.content,
          taskDefId: a.taskDefId,
        }
      }
      return null
    })
    .filter(e => e !== null) as Array<{id: number, date: number, title: string, type: string, done: boolean, content?: string, taskDefId?: number}>

  // 從佈告系統生成日曆事件
  const bulletinCalendarEvents = getBulletinCalendarEvents(
    visibleBulletins,
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
      scheduledMeetingId: m.id,
    }))

  // 將交辦事項展開成跨日事件 (start_date → due_date 之間每一天都顯示)
  const delegationCalendarEvents = (() => {
    const events: Array<{ id: undefined; date: number; title: string; type: string; done: boolean; content: string; detailLink?: string }> = []
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    for (const d of delegationsForMonth) {
      const start = new Date(d.start_date)
      const end = new Date(d.due_date)
      // 限定在當月顯示範圍
      const from = start < monthStart ? monthStart : start
      const to = end > monthEnd ? monthEnd : end
      const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      for (let cur = new Date(from); cur <= to; cur.setDate(cur.getDate() + 1)) {
        const dayNum = cur.getDate()
        const dayIdx = Math.round((cur.getTime() - start.getTime()) / 86400000) + 1
        const isStart = cur.toISOString().slice(0, 10) === d.start_date
        const isEnd = cur.toISOString().slice(0, 10) === d.due_date
        const marker = isStart ? '▶' : isEnd ? '◀' : '─'
        const dayLabel = totalDays > 1 ? ` (${dayIdx}/${totalDays})` : ''
        events.push({
          id: undefined,
          date: dayNum,
          title: `${marker} ${d.title}${dayLabel}`,
          type: 'delegation',
          done: d.status === 'done',
          content: [
            `交辦人：${d.issuer_name || '—'}`,
            `承辦人：${d.assignee_name || '—'}`,
            `期間：${d.start_date} → ${d.due_date}`,
            d.priority !== 'normal' ? `優先度：${d.priority === 'urgent' ? '緊急' : '重要'}` : null,
            d.description ? `\n${d.description}` : null,
          ].filter(Boolean).join('\n'),
        })
      }
    }
    return events
  })()

  // 合併所有日曆事件
  const calendarEvents = [...assignmentEvents, ...bulletinCalendarEvents, ...meetingCalendarEvents, ...delegationCalendarEvents]

  const handleToggleTask = async (id: number | string) => {
    console.log('[HomePage] handleToggleTask 被調用:', { id })

    // 尚未寫入後端的樂觀項目（暫時負數 id）先擋下，避免無效的資料庫操作
    if (typeof id === 'number' && id < 0) {
      setToast({ message: '建立中，請稍候…', type: 'info' })
      return
    }

    // 依目前狀態決定要切到完成或取消完成（雙向切換）
    const current = assignments.find(t => t.id === id)
    const nextStatus = current?.done ? 'pending' : 'completed'

    // 先樂觀更新畫面
    setAssignments(prev => prev.map(task =>
      task.id === id ? { ...task, done: nextStatus === 'completed' } : task
    ))

    try {
      await updateAssignmentStatus(Number(id), nextStatus)
      console.log('[HomePage] 任務狀態更新成功')
    } catch (error) {
      console.error('[HomePage] 更新任務狀態失敗:', error)
      // 失敗回滾
      setAssignments(prev => prev.map(task =>
        task.id === id ? { ...task, done: current?.done ?? false } : task
      ))
      setToast({ message: '更新失敗，請稍後再試', type: 'error' })
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

    // 尚未寫入後端的樂觀項目：直接從前端移除即可
    if (typeof id === 'number' && id < 0) {
      setAssignments(prev => prev.filter(task => task.id !== id))
      return
    }

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
    const announcement = announcements.find(a => a.id === id)
    if (announcement) {
      setSelectedAnnouncement(announcement)
      // 記錄已讀（背景，不阻塞）
      if (userId && typeof id === 'string') {
        markBulletinRead(id, userId)
          .then(() => setBulletinReadMap(prev => ({ ...prev, [id]: { read: true, acked: prev[id]?.acked || false } })))
          .catch(() => {})
      }
    } else {
      console.warn('[HomePage] 找不到公告 ID:', id)
    }
  }

  // 按下「我已詳閱」
  const handleAckBulletin = async (id: string) => {
    if (!userId) return
    try {
      await ackBulletin(id, userId)
      setBulletinReadMap(prev => ({ ...prev, [id]: { read: true, acked: true } }))
      setSelectedAnnouncement((prev: any) => prev && prev.id === id ? { ...prev, acked: true } : prev)
      setLoginAlerts(prev => prev.filter(b => b.id !== id))
      setToast({ message: '已確認詳閱', type: 'success' })
    } catch {
      setToast({ message: '確認失敗，請重試', type: 'error' })
    }
  }

  // 登入彈窗：知道了（非強制確認的重要/置頂公告）
  const handleDismissAlert = (id: string) => {
    if (userId) {
      markBulletinRead(id, userId).catch(() => {})
      setBulletinReadMap(prev => ({ ...prev, [id]: { read: true, acked: prev[id]?.acked || false } }))
    }
    setLoginAlerts(prev => prev.filter(b => b.id !== id))
  }

  // 登入時未讀重要/置頂/需確認公告的強制彈窗
  const renderBulletinAlert = () => {
    const b = loginAlerts[0]
    if (!b) return null
    const tag = b.priority === 'urgent' ? { t: '緊急公告', c: 'var(--status-error, #C0392B)' }
      : b.priority === 'important' ? { t: '重要公告', c: 'var(--status-warning, #B8860B)' }
      : { t: '公告', c: 'var(--accent-blue, #005FAF)' }
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div className="window" style={{ width: 'min(460px, 92vw)', maxHeight: '82vh', overflow: 'auto', fontSize: '11px' }}>
          <div className="titlebar" style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 'bold', background: tag.c, color: '#FFF' }}>
            {tag.t}{loginAlerts.length > 1 ? `（還有 ${loginAlerts.length - 1} 則）` : ''}
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-window)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>{b.title}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {b.department || ''} {(b.published_at || b.created_at)?.slice(0, 10)}
            </div>
            <div className="inset" style={{ padding: '8px', marginBottom: '8px', background: 'var(--bg-inset)', whiteSpace: 'pre-wrap', minHeight: '60px', lineHeight: 1.5 }}>
              {b.content || '（無內文）'}
            </div>
            {(b.attachments?.length || 0) > 0 && (
              <div style={{ marginBottom: '8px' }}>
                {b.attachments.map((att, i) => (
                  <div key={i} style={{ fontSize: '10px', marginBottom: '2px' }}>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>{att.name}</a>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
              {b.require_ack ? (
                <button onClick={() => handleAckBulletin(b.id)} className="btn" style={{ fontSize: '10px', padding: '3px 14px', fontWeight: 'bold', background: '#005FAF', color: '#FFF', border: '1px solid #003F7F', cursor: 'pointer' }}>
                  確認已閱
                </button>
              ) : (
                <button onClick={() => handleDismissAlert(b.id)} className="btn" style={{ fontSize: '10px', padding: '3px 14px' }}>
                  知道了
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmitEvent = (data: {
    title: string
    type: string
    dates: string[]
    content?: string
  }) => {
    // 關閉視窗、即時呈現（樂觀更新），後端在背景處理
    setIsAddModalOpen(false)

    // 各類型參數
    const cfg = data.type === 'routine'
      ? { frequency: 'daily' as const, base: 10, active: true, earned: 10, desc: data.content || undefined, displayType: 'routine', isRoutine: true }
      : data.type === 'assignment'
      ? { frequency: 'event_triggered' as const, base: 10, active: false, earned: 10, desc: data.content || undefined, displayType: 'assignment', isRoutine: false }
      : { frequency: 'event_triggered' as const, base: 5, active: false, earned: 5, desc: `type:${data.type}${data.content ? `\n${data.content}` : ''}`, displayType: data.type, isRoutine: false }

    // 產生暫時 id（負數，避免與真實 id 衝突），先樂觀塞進畫面
    const tempBase = -Date.now()
    const tempEntries = data.dates.map((dateStr, i) => ({
      __tempId: tempBase - i,
      id: tempBase - i,
      title: data.title,
      date: formatDate(dateStr),
      done: false,
      rawDate: dateStr,
      type: cfg.displayType,
      content: data.content,
      taskDefId: undefined as number | undefined,
      pending: true, // 標記尚未寫入後端
    }))
    const tempIdSet = new Set(tempEntries.map(e => e.__tempId))
    const routineTempId = tempBase

    setAssignments(prev => [...prev, ...tempEntries].sort((a, b) => a.rawDate.localeCompare(b.rawDate)))
    if (cfg.isRoutine) {
      setRoutineTasks(prev => [...prev, { __tempId: routineTempId, id: routineTempId, title: data.title, date: '每日', done: false }])
    }

    const label = cfg.isRoutine ? '例行公事' : data.type === 'assignment' ? '交辦事項' : '事件'
    setToast({ message: `✓ ${label}「${data.title}」已建立 (${data.dates.length} 日)`, type: 'success' })

    // 背景寫入資料庫，完成後把暫時 id 換成真實 id；失敗則撤回
    ;(async () => {
      try {
        const taskDef = await createTaskDefinition({
          title: data.title,
          frequency: cfg.frequency,
          base_points: cfg.base,
          default_assignee_id: userId,
          site_location: 'ALL',
          is_active: cfg.active,
          description: cfg.desc,
        })

        const realIdByTemp: Record<number, number> = {}
        for (const e of tempEntries) {
          const assignment = await createDailyAssignment({
            task_def_id: taskDef.id,
            user_id: userId,
            status: 'pending',
            assigned_date: e.rawDate,
            earned_points: cfg.earned,
          })
          realIdByTemp[e.__tempId] = assignment.id
        }

        // 對帳：暫時 id → 真實 id + taskDefId，移除 pending 標記
        setAssignments(prev => prev.map(it =>
          it.__tempId && realIdByTemp[it.__tempId] != null
            ? { ...it, id: realIdByTemp[it.__tempId], taskDefId: taskDef.id, __tempId: undefined, pending: false }
            : it
        ))
        if (cfg.isRoutine) {
          setRoutineTasks(prev => prev.map(rt => rt.__tempId === routineTempId ? { ...rt, id: taskDef.id, __tempId: undefined } : rt))
        }
      } catch (error) {
        console.error('[HomePage] 背景建立任務失敗，撤回樂觀更新:', error)
        setAssignments(prev => prev.filter(it => !tempIdSet.has(it.__tempId)))
        if (cfg.isRoutine) {
          setRoutineTasks(prev => prev.filter(rt => rt.__tempId !== routineTempId))
        }
        setToast({ message: `「${data.title}」建立失敗，已撤回，請重試`, type: 'error' })
      }
    })()
  }

  // 編輯行事曆事件「內容」— 寫回 task_definitions.description（保留 type: 標記）
  const handleUpdateEventContent = async (
    event: { id?: number; type: string; taskDefId?: number },
    content: string
  ) => {
    if (!event.taskDefId) return
    const pureTypes = new Set(['public', 'event', 'meeting', 'visit', 'training', 'delegation'])
    const desc = pureTypes.has(event.type)
      ? `type:${event.type}${content ? `\n${content}` : ''}`
      : content
    await updateTaskDefinitionDescription(event.taskDefId, desc)
    // 同步更新本地狀態，重開彈窗即可看到新內容
    setAssignments(prev => prev.map(a => (a.id === event.id ? { ...a, content } : a)))
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
                    <div className="titlebar" style={{ padding: '2px 4px', fontSize: '9px' }}>公告</div>
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

          {currentTab === 'hr' && <HRPage isAdmin={userRole === 'admin'} userProfile={userProfile} />}
          {currentTab === 'operations' && <div className="window p-2"><div style={{ textAlign: 'center', fontSize: '10px' }}>OPS (建構中)</div></div>}
          {currentTab === 'settings' && <SettingsPage isAdmin={userRole === 'admin'} />}
          {currentTab === 'points' && <PointsPage userProfile={userProfile} />}
        </div>

        {/* Mobile Bottom Navigation - 更緊湊 */}
        <MobileNav currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* Modals */}
        <AddEventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleSubmitEvent} zIndex={addModalZIndex} position={getModalPosition(0)} userRole={userRole} />
        <AnnouncementDetailModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} zIndex={announcementModalZIndex} position={getModalPosition(1)} onAck={handleAckBulletin} />
        {renderBulletinAlert()}
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

                  {/* 下方三欄：任務區 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', width: '100%' }}>
                    <EventList title="ROUTINE" events={routineTasks} onToggle={handleToggleTask} onDelete={handleDeleteRoutineTask} showAddButton={false} showDeleteButton={true} />
                    <EventList title="TASKS" events={assignments} onToggle={handleToggleTask} onDelete={handleDeleteAssignment} showAddButton={false} showDeleteButton={true} />
                    <EventList title="公告" events={announcements} onItemClick={handleAnnouncementClick} onDelete={handleDeleteBulletin} onEdit={canEditBulletins ? handleEditBulletin : undefined} showAddButton={false} showDeleteButton={true} showEditButton={canEditBulletins} />
                  </div>
                </>
              )}
            </div>
          )}
          {currentTab === 'hr' && <HRPage isAdmin={userRole === 'admin'} userProfile={userProfile} />}
          {currentTab === 'operations' && <div className="window p-4"><div className="text-center">OPS (建構中)</div></div>}
          {currentTab === 'settings' && <SettingsPage isAdmin={userRole === 'admin'} />}
          {currentTab === 'points' && <PointsPage userProfile={userProfile} />}
        </div>

        {/* Modals */}
        <AddEventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleSubmitEvent} zIndex={addModalZIndex} position={getModalPosition(0)} userRole={userRole} />
        <AnnouncementDetailModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} zIndex={announcementModalZIndex} position={getModalPosition(1)} onAck={handleAckBulletin} />
        {renderBulletinAlert()}
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
                onOpenDetail={(event) => {
                  if (event.scheduledMeetingId) {
                    setSelectedScheduledMeetingId(event.scheduledMeetingId)
                    openWindow('meeting')
                  }
                }}
                onUpdateEventContent={handleUpdateEventContent}
                userRole={userRole}
                userId={userId}
                userDepartment={userProfile?.department || ''}
              />
            </div>

            {/* Bottom panels — responsive: auto-fit, narrow → 1 col, wide → 5 cols */}
            {/* Bottom panels — 5 columns: DELEGATED + ROUTINE + TASKS + PUBLIC + NOTICE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
              <DelegatedPanel
                userId={userId}
                userRole={userRole}
                userName={userProfile?.full_name || ''}
                onCreateRequest={() => setDelegationModalOpen(true)}
              />
              <EventList title="ROUTINE" events={routineTasks} onToggle={handleToggleTask} onDelete={handleDeleteRoutineTask} showAddButton={false} showDeleteButton={true} />
              <EventList title="TASKS" events={assignments} onToggle={handleToggleTask} onDelete={handleDeleteAssignment} showAddButton={false} showDeleteButton={true} />
              <EventList title="公告" events={announcements} onItemClick={handleAnnouncementClick} onDelete={handleDeleteBulletin} onEdit={canEditBulletins ? handleEditBulletin : undefined} showAddButton={false} showDeleteButton={true} showEditButton={canEditBulletins} />
            </div>
          </>
        )}
      </div>

      {/* Application Windows Layer — Internal modules */}
      <Win95Window windowId="hr">
        <HRPage isAdmin={isAdmin} userProfile={userProfile} />
      </Win95Window>

      <Win95Window windowId="meeting">
        <MeetingPage
          isAdmin={isAdmin}
          userProfile={userProfile}
          selectedScheduledMeetingId={selectedScheduledMeetingId}
          onClearSelectedMeeting={() => setSelectedScheduledMeetingId(null)}
        />
      </Win95Window>

      <Win95Window windowId="fax">
        <FaxPage isAdmin={isAdmin} userProfile={userProfile} />
      </Win95Window>

      <Win95Window windowId="operations">
        <OPSPage isAdmin={isAdmin} />
      </Win95Window>

      <Win95Window windowId="sales">
        <SalesPage isAdmin={isAdmin} userProfile={userProfile} />
      </Win95Window>

      <Win95Window windowId="reports">
        <ReportPage isAdmin={isAdmin} />
      </Win95Window>

      <Win95Window windowId="settings">
        <SettingsPage isAdmin={isAdmin} userId={userId} userRole={userRole} userDepartment={userProfile?.department || ''} employeeId={userProfile?.employee_id || ''} />
      </Win95Window>

      <Win95Window windowId="points">
        <PointsPage userProfile={userProfile} />
      </Win95Window>

      <Win95Window windowId="devtracker">
        <DevTrackerPage />
      </Win95Window>

      <Win95Window windowId="manager">
        <ManagerDashboard userProfile={userProfile} />
      </Win95Window>

      <Win95Window windowId="appcenter">
        <AppCenterPage isAdmin={isAdmin} userDepartment={userProfile?.department} />
      </Win95Window>

      {/* External App Windows — dynamically rendered from WINDOW_CONFIGS */}
      {WINDOW_CONFIGS.filter(c => c.type === 'external' && c.externalUrl).map(config => (
        <Win95Window key={config.id} windowId={config.id}>
          <ExternalAppFrame windowId={config.id} url={config.externalUrl!} title={config.title} />
        </Win95Window>
      ))}

      {/* Modals */}
      <AddEventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleSubmitEvent} zIndex={addModalZIndex} position={getModalPosition(0)} userRole={userRole} />
      <AnnouncementDetailModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} zIndex={announcementModalZIndex} position={getModalPosition(1)} onAck={handleAckBulletin} />
      {renderBulletinAlert()}

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

      <DelegationCreateModal
        open={delegationModalOpen}
        currentUserId={userId}
        currentUserName={userProfile?.full_name || ''}
        onClose={() => setDelegationModalOpen(false)}
        onCreated={() => {
          setCalendarRefreshTick(t => t + 1)
          setToast({ message: '已建立交辦事項，承辦人會收到通知', type: 'success' })
        }}
      />

      {/* Taskbar */}
      <Taskbar
        userProfile={userProfile}
        onLogout={handleLogout}
        onOpenPoints={handleOpenPoints}
        isAdmin={isAdmin}
        allowedModules={allowedModules}
      />
    </div>
  )
}

