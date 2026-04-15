import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// Types
// ============================================

export interface MeetingCategory {
  id: string
  name: string
  color: string
  created_by?: string
  is_ai_suggested: boolean
  created_at: string
}

export interface Meeting {
  id: string
  title: string
  meeting_date: string
  category_id?: string
  category?: MeetingCategory
  summary?: string
  raw_content?: string
  file_url?: string
  file_name?: string
  file_type?: string
  uploaded_by?: string
  ai_analysis?: any
  status: 'pending' | 'analyzing' | 'analyzed' | 'archived'
  created_at: string
}

export interface MeetingDeadline {
  id: string
  meeting_id: string
  description: string
  deadline_date?: string
  is_urgent: boolean
  status: 'pending' | 'completed'
}

export interface MeetingTask {
  id: string
  meeting_id: string
  assignee_name: string
  assignee_id?: string
  task_description: string
  due_date?: string
  status: 'pending' | 'completed'
}

// ============================================
// Categories
// ============================================

export async function getMeetingCategories(): Promise<MeetingCategory[]> {
  const { data, error } = await supabase
    .from('meeting_categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function createMeetingCategory(category: { name: string; color: string; is_ai_suggested?: boolean; created_by?: string }): Promise<MeetingCategory> {
  const { data, error } = await supabase
    .from('meeting_categories')
    .insert(category)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMeetingCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('meeting_categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Meetings CRUD
// ============================================

export async function getMeetings(filters?: { category_id?: string; status?: string; search?: string }): Promise<Meeting[]> {
  let query = supabase
    .from('meetings')
    .select('*, category:meeting_categories(*)')
    .order('meeting_date', { ascending: false })

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,raw_content.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, category:meeting_categories(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createMeeting(meeting: Partial<Meeting>): Promise<Meeting> {
  const { data, error } = await supabase
    .from('meetings')
    .insert(meeting)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
  const { data, error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Deadlines & Tasks
// ============================================

export async function getMeetingDeadlines(meetingId: string): Promise<MeetingDeadline[]> {
  const { data, error } = await supabase
    .from('meeting_deadlines')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('deadline_date')
  if (error) throw error
  return data || []
}

export async function getMeetingTasks(meetingId: string): Promise<MeetingTask[]> {
  const { data, error } = await supabase
    .from('meeting_tasks')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function updateMeetingTaskStatus(id: string, status: 'pending' | 'completed'): Promise<void> {
  const { error } = await supabase
    .from('meeting_tasks')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function updateMeetingDeadlineStatus(id: string, status: 'pending' | 'completed'): Promise<void> {
  const { error } = await supabase
    .from('meeting_deadlines')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// File Upload
// ============================================

export async function uploadMeetingFile(file: File): Promise<{ url: string; path: string }> {
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `meetings/${fileName}`

  const { error } = await supabase.storage
    .from('meeting-files')
    .upload(filePath, file)
  if (error) throw error

  const { data } = supabase.storage
    .from('meeting-files')
    .getPublicUrl(filePath)

  return { url: data.publicUrl, path: filePath }
}

// ============================================
// Search
// ============================================

export async function searchMeetings(query: string): Promise<Meeting[]> {
  if (!query.trim()) return []
  return getMeetings({ search: query })
}

// ============================================
// All deadlines/tasks (cross-meeting)
// ============================================

export async function getAllPendingDeadlines(): Promise<(MeetingDeadline & { meeting?: Meeting })[]> {
  const { data, error } = await supabase
    .from('meeting_deadlines')
    .select('*, meeting:meetings(id, title, meeting_date)')
    .eq('status', 'pending')
    .order('deadline_date')
  if (error) throw error
  return data || []
}

export async function getAllPendingTasks(): Promise<(MeetingTask & { meeting?: Meeting })[]> {
  const { data, error } = await supabase
    .from('meeting_tasks')
    .select('*, meeting:meetings(id, title, meeting_date)')
    .eq('status', 'pending')
    .order('due_date')
  if (error) throw error
  return data || []
}
