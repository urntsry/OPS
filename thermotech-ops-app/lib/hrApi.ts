import { supabase } from './api'

export interface HRProfile {
  id: string
  employee_id: string
  full_name: string
  department: string | null
  job_title: string | null
  role: string
  phone: string | null
  hire_date: string | null
  birthday: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  address: string | null
  labor_insurance_date: string | null
  health_insurance_date: string | null
  contract_expiry: string | null
  nationality: string | null
  is_active: boolean
  notes: string | null
  points_balance: number
  line_user_id: string | null
  line_bound_at: string | null
  created_at: string
}

export interface HREvent {
  id: string
  profile_id: string
  event_type: string
  event_date: string
  description: string | null
  created_by: string | null
  created_at: string
  profile?: { full_name: string; employee_id: string }
}

export interface AttendanceRecord {
  id: string
  profile_id: string
  record_date: string
  clock_in: string | null
  clock_out: string | null
  overtime_hours: number
  leave_type: string | null
  notes: string | null
}

// ---- Profiles (HR extended) ----

export async function getHRProfiles(activeOnly = true): Promise<HRProfile[]> {
  let query = supabase
    .from('profiles')
    .select('id, employee_id, full_name, department, job_title, role, phone, hire_date, birthday, emergency_contact, emergency_phone, address, labor_insurance_date, health_insurance_date, contract_expiry, nationality, is_active, notes, points_balance, line_user_id, line_bound_at, created_at')
    .order('department')
    .order('employee_id')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as HRProfile[]
}

export async function updateHRProfile(id: string, updates: Partial<HRProfile>): Promise<HRProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as HRProfile
}

// ---- HR Events ----

export async function getHREvents(profileId?: string): Promise<HREvent[]> {
  let query = supabase
    .from('hr_events')
    .select('*, profile:profiles!profile_id(full_name, employee_id)')
    .order('event_date', { ascending: false })
    .limit(100)

  if (profileId) {
    query = query.eq('profile_id', profileId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as HREvent[]
}

export async function createHREvent(event: {
  profile_id: string
  event_type: string
  event_date: string
  description?: string
  created_by?: string
}): Promise<HREvent> {
  const { data, error } = await supabase
    .from('hr_events')
    .insert(event)
    .select()
    .single()
  if (error) throw error
  return data as HREvent
}

// ---- Attendance ----

export async function getAttendanceRecords(profileId: string, month: string): Promise<AttendanceRecord[]> {
  const startDate = `${month}-01`
  const endDate = `${month}-31`

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('profile_id', profileId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date')

  if (error) throw error
  return (data || []) as AttendanceRecord[]
}

export async function importAttendanceRecords(records: Omit<AttendanceRecord, 'id'>[]): Promise<number> {
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(records, { onConflict: 'profile_id,record_date' })
    .select()

  if (error) throw error
  return data?.length || 0
}

// ---- LINE Binding Status ----

export interface LineBindingEntry {
  id: string
  employee_id: string
  full_name: string
  department: string | null
  line_user_id: string | null
  line_bound_at: string | null
  is_active: boolean
}

export async function getLineBindingStatus(activeOnly = true): Promise<LineBindingEntry[]> {
  let query = supabase
    .from('profiles')
    .select('id, employee_id, full_name, department, line_user_id, line_bound_at, is_active')
    .order('department')
    .order('employee_id')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as LineBindingEntry[]
}

export async function unbindLineUser(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ line_user_id: null, line_bound_at: null })
    .eq('id', profileId)
  if (error) throw error
}

export async function deleteProfile(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)
  if (error) throw error
}

// ---- Upcoming Expirations ----

export interface ExpirationAlert {
  id: string
  employee_id: string
  full_name: string
  department: string | null
  expiry_type: string
  expiry_date: string
}

export async function getUpcomingExpirations(): Promise<ExpirationAlert[]> {
  const { data, error } = await supabase
    .from('hr_upcoming_expirations')
    .select('*')
    .order('expiry_date')

  if (error) throw error
  return (data || []) as ExpirationAlert[]
}
