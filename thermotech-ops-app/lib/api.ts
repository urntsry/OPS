// THERMOTECH-OPS Supabase API 工具函數
// 所有資料庫操作的統一介面

import { createClient } from '@supabase/supabase-js'

// Supabase Client - 使用環境變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 檢查環境變數
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[API] 環境變數未設定:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl,
    envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  })
  throw new Error('Supabase 環境變數未設定。請檢查 .env.local 檔案。')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ===========================================
// 型別定義
// ===========================================

export interface Profile {
  id: string
  employee_id: string
  full_name: string
  department: string
  job_title: string
  role: 'admin' | 'supervisor' | 'user'
  points_balance: number
  site_code: string
  avatar_url?: string
  created_at: string
}

export interface TaskDefinition {
  id: number
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'event_triggered'
  difficulty_level: number
  base_points: number
  requires_photo: boolean
  requires_approval: boolean
  default_assignee_id?: string
  backup_assignee_id?: string
  site_location: string
  is_active: boolean
  source_file?: string
  // v3.0 新增欄位
  task_category?: 'routine' | 'assignment' | 'public' | 'announcement'
  display_type?: 'event' | 'collapsed' | 'periodic'
  schedule_type?: 'once' | 'range' | 'recurring'
  schedule_config?: any
  // v2.0 新增欄位
  item_type?: 'capability' | 'actual_task'
  event_category?: '報修' | '活動' | '清潔' | '會計' | '人事' | '職訓' | '會議' | '出差' | string
  is_template?: boolean
  default_notify_users?: string[]
}

export interface DailyAssignment {
  id: number
  task_def_id: number
  user_id: string
  status: 'pending' | 'completed' | 'verified' | 'abnormal'
  assigned_date: string
  completed_at?: string
  photo_url?: string
  comment?: string
  earned_points: number
  is_incident_report: boolean
}

// ===========================================
// 1. PROFILES (人員管理)
// ===========================================

/**
 * 取得所有人員
 */
export async function getAllProfiles() {
  console.log('[API] 取得所有人員')
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('department', { ascending: true })
    .order('employee_id', { ascending: true })
  
  if (error) {
    console.error('[API] 取得人員失敗:', error)
    throw error
  }
  
  console.log('[API] 成功取得人員:', data?.length)
  return data as Profile[]
}

/**
 * 根據員工編號取得人員
 */
export async function getProfileByEmployeeId(employeeId: string) {
  console.log('[API] 取得人員:', employeeId)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('employee_id', employeeId)
    .single()
  
  if (error) {
    console.error('[API] 取得人員失敗:', error)
    throw error
  }
  
  console.log('[API] 成功取得人員:', data?.full_name)
  return data as Profile
}

/**
 * 根據 UUID 取得人員
 */
export async function getProfileById(id: string) {
  console.log('[API] 取得人員 (UUID):', id)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('[API] 取得人員失敗:', error)
    throw error
  }
  
  return data as Profile
}

// ===========================================
// 2. TASK DEFINITIONS (任務定義)
// ===========================================

/**
 * 取得所有任務定義（包含未啟用的）
 */
export async function getAllTaskDefinitions() {
  console.log('[API] 取得所有任務定義')
  const { data, error } = await supabase
    .from('task_definitions')
    .select('*')
    .order('id', { ascending: true })
  
  if (error) {
    console.error('[API] 取得任務定義失敗:', error)
    throw error
  }
  
  console.log('[API] 成功取得任務定義:', data?.length)
  return data as TaskDefinition[]
}

/**
 * 根據負責人取得任務定義（只取實際任務，排除職能清單）
 */
export async function getTaskDefinitionsByAssignee(userId: string) {
  console.log('[API] 取得使用者任務定義:', userId)
  const { data, error } = await supabase
    .from('task_definitions')
    .select('*')
    .or(`default_assignee_id.eq.${userId},backup_assignee_id.eq.${userId}`)
    .eq('is_active', true)
    .neq('item_type', 'capability') // 排除職能清單
  
  if (error) {
    console.error('[API] 取得任務定義失敗:', error)
    throw error
  }
  
  console.log('[API] 成功取得實際任務:', data?.length)
  return data as TaskDefinition[]
}

/**
 * 新增任務定義
 */
export async function createTaskDefinition(task: Partial<TaskDefinition>) {
  console.log('[API] 新增任務定義:', task.title)
  const { data, error } = await supabase
    .from('task_definitions')
    .insert(task)
    .select()
    .single()
  
  if (error) {
    console.error('[API] 新增任務定義失敗:', error)
    throw error
  }
  
  console.log('[API] 成功新增任務定義:', data?.id)
  return data as TaskDefinition
}

/**
 * 刪除任務定義（測試用）
 * 注意：會同時刪除所有相關的 daily_assignments
 */
export async function deleteTaskDefinition(taskId: number) {
  console.log('[API] 刪除任務定義:', taskId)
  
  try {
    // 1. 先刪除所有相關的 daily_assignments（外鍵限制）
    console.log('[API] 步驟 1: 刪除相關的 daily_assignments...')
    const { error: assignmentsError } = await supabase
      .from('daily_assignments')
      .delete()
      .eq('task_def_id', taskId)
    
    if (assignmentsError) {
      console.error('[API] 刪除 daily_assignments 失敗:', assignmentsError)
      throw new Error(`刪除相關任務失敗: ${assignmentsError.message}`)
    }
    
    console.log('[API] daily_assignments 刪除成功')
    
    // 2. 再刪除 task_definition
    console.log('[API] 步驟 2: 刪除 task_definition...')
    const { error: taskError } = await supabase
      .from('task_definitions')
      .delete()
      .eq('id', taskId)
    
    if (taskError) {
      console.error('[API] 刪除 task_definition 失敗:', taskError)
      throw new Error(`刪除任務定義失敗: ${taskError.message}`)
    }
    
    console.log('[API] 任務定義刪除成功')
  } catch (error) {
    console.error('[API] deleteTaskDefinition 完整錯誤:', error)
    throw error
  }
}

/**
 * 更新任務定義的負責人（設定頁用）
 */
export async function updateTaskDefinitionAssignee(
  taskId: number,
  defaultAssigneeId: string | null,
  backupAssigneeId: string | null
) {
  console.log('[API] 更新任務負責人:', { taskId, defaultAssigneeId, backupAssigneeId })
  
  const { data, error } = await supabase
    .from('task_definitions')
    .update({
      default_assignee_id: defaultAssigneeId,
      backup_assignee_id: backupAssigneeId
    })
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) {
    console.error('[API] 更新任務負責人失敗:', error)
    throw error
  }
  
  console.log('[API] 任務負責人更新成功')
  return data as TaskDefinition
}

// ===========================================
// 3. DAILY ASSIGNMENTS (每日任務)
// ===========================================

/**
 * 取得使用者的今日任務
 */
export async function getTodayAssignments(userId: string) {
  console.log('[API] 取得今日任務:', userId)
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('daily_assignments')
    .select(`
      *,
      task_def:task_definitions(title, description, base_points, requires_photo)
    `)
    .eq('user_id', userId)
    .eq('assigned_date', today)
    .order('id', { ascending: true })
  
  if (error) {
    console.error('[API] 取得今日任務失敗:', error)
    throw error
  }
  
  console.log('[API] 成功取得今日任務:', data?.length)
  return data
}

/**
 * 取得使用者的所有待辦任務（包含過去未完成的）
 */
export async function getPendingAssignments(userId: string) {
  console.log('[API] 取得待辦任務:', userId)
  
  const { data, error } = await supabase
    .from('daily_assignments')
    .select(`
      *,
      task_def:task_definitions(title, description, base_points, requires_photo)
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('assigned_date', { ascending: true }) // 改為升序：最早的任務在前
  
  if (error) {
    console.error('[API] 取得待辦任務失敗:', error)
    throw error
  }
  
  console.log('[API] 成功取得待辦任務:', data?.length)
  console.log('[API] 待辦任務詳情:', data)
  return data
}

/**
 * 更新任務狀態
 */
export async function updateAssignmentStatus(
  assignmentId: number, 
  status: 'completed' | 'verified' | 'abnormal',
  photoUrl?: string,
  comment?: string
) {
  console.log('[API] 更新任務狀態:', { assignmentId, status })
  
  const updates: Partial<DailyAssignment> = {
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : undefined,
    photo_url: photoUrl,
    comment: comment
  }
  
  const { data, error } = await supabase
    .from('daily_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single()
  
  if (error) {
    console.error('[API] 更新任務狀態失敗:', error)
    throw error
  }
  
  console.log('[API] 成功更新任務狀態')
  return data as DailyAssignment
}

/**
 * 刪除每日任務指派（測試用）
 */
export async function deleteDailyAssignment(assignmentId: number) {
  console.log('[API] 刪除每日任務:', assignmentId)
  
  const { error } = await supabase
    .from('daily_assignments')
    .delete()
    .eq('id', assignmentId)
  
  if (error) {
    console.error('[API] 刪除每日任務失敗:', error)
    throw error
  }
  
  console.log('[API] 每日任務刪除成功')
}

/**
 * 新增每日任務（手動派發）
 */
export async function createDailyAssignment(assignment: Partial<DailyAssignment>) {
  console.log('[API] 新增每日任務:', assignment)
  
  const { data, error } = await supabase
    .from('daily_assignments')
    .insert(assignment)
    .select()
    .single()
  
  if (error) {
    console.error('[API] 新增每日任務失敗:', error)
    throw error
  }
  
  console.log('[API] 成功新增每日任務:', data?.id)
  return data as DailyAssignment
}

// ===========================================
// 4. 統計資訊
// ===========================================

/**
 * 取得使用者積分
 */
export async function getUserPoints(userId: string) {
  console.log('[API] 取得使用者積分:', userId)
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points_balance')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('[API] 取得積分失敗:', error)
    throw error
  }
  
  console.log('[API] 使用者積分:', data?.points_balance)
  return data.points_balance as number
}

/**
 * 取得積分排行榜
 */
export async function getPointsLeaderboard(limit: number = 10) {
  console.log('[API] 取得積分排行榜')
  
  const { data, error } = await supabase
    .from('profiles')
    .select('employee_id, full_name, department, points_balance')
    .order('points_balance', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('[API] 取得排行榜失敗:', error)
    throw error
  }
  
  console.log('[API] 成功取得排行榜')
  return data
}

// ===========================================
// 5. 管理者功能
// ===========================================

/**
 * 取得所有人的今日任務概況（管理者用）
 */
export async function getAllTodayAssignmentsSummary() {
  console.log('[API] 取得所有人今日任務概況')
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('daily_assignments')
    .select(`
      id,
      status,
      user:profiles(employee_id, full_name, department),
      task:task_definitions(title)
    `)
    .eq('assigned_date', today)
  
  if (error) {
    console.error('[API] 取得任務概況失敗:', error)
    throw error
  }
  
  console.log('[API] 成功取得任務概況:', data?.length)
  return data
}

// ===========================================
// v3.0 新增功能：任務排程管理
// ===========================================

/**
 * 更新任務完整資訊（包含排程設定）
 */
export async function updateTaskDefinitionFull(
  taskId: number,
  updates: Partial<TaskDefinition>
) {
  console.log('[API] ========== updateTaskDefinitionFull ==========')
  console.log('[API] 任務 ID:', taskId)
  console.log('[API] 更新內容:', updates)
  console.log('[API] 更新欄位:', Object.keys(updates))
  
  const { data, error } = await supabase
    .from('task_definitions')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) {
    console.error('[API] ========== 更新任務失敗 ==========')
    console.error('[API] 錯誤代碼:', error.code)
    console.error('[API] 錯誤訊息:', error.message)
    console.error('[API] 錯誤詳情:', error.details)
    console.error('[API] 錯誤提示:', error.hint)
    throw error
  }
  
  console.log('[API] 任務更新成功，回傳資料:', data)
  return data
}

/**
 * 取得任務在特定日期的顯示資訊（使用資料庫函數）
 */
export async function getTasksForDate(date: string, userId?: string) {
  console.log('[API] 取得日期任務:', date, userId)
  
  // 如果有指定 userId，只取該使用者的任務
  let query = supabase
    .from('task_definitions')
    .select('*')
  
  if (userId) {
    query = query.or(`default_assignee_id.eq.${userId},backup_assignee_id.eq.${userId}`)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('[API] 取得任務失敗:', error)
    throw error
  }
  
  console.log('[API] 取得任務成功:', data?.length)
  return data || []
}

/**
 * 創建新任務（v3.0 完整版）
 */
export async function createTaskDefinitionV3(taskData: {
  title: string
  description?: string
  task_category: 'routine' | 'assignment' | 'public' | 'announcement'
  display_type: 'event' | 'collapsed' | 'periodic'
  schedule_type: 'once' | 'range' | 'recurring'
  schedule_config: any
  base_points: number
  site_location: string
  default_assignee_id?: string
  backup_assignee_id?: string
}) {
  console.log('[API] 創建新任務 v3:', taskData)
  
  const { data, error } = await supabase
    .from('task_definitions')
    .insert({
      ...taskData,
      // 保持向下相容，根據 schedule_config 自動設定 frequency
      frequency: taskData.schedule_type === 'recurring' 
        ? (taskData.schedule_config.type || 'event_triggered')
        : 'event_triggered',
      is_active: true,
      requires_photo: false,
      requires_approval: false,
      difficulty_level: 1,
      source_file: '手動建立'
    })
    .select()
    .single()
  
  if (error) {
    console.error('[API] 創建任務失敗:', error)
    throw error
  }
  
  console.log('[API] 任務創建成功:', data)
  return data
}


