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
  hr_access: boolean
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
    .select('id, employee_id, full_name, department, job_title, role, phone, hire_date, birthday, emergency_contact, emergency_phone, address, labor_insurance_date, health_insurance_date, contract_expiry, nationality, is_active, notes, points_balance, line_user_id, line_bound_at, hr_access, created_at')
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

// ============================================================
// OVERTIME RECORDS (加班管理)
// ============================================================

export interface OvertimeRecord {
  id: string
  profile_id: string
  record_date: string
  weekday: string | null
  overtime_type1_hours: number
  overtime_type2_hours: number
  note: string | null
  month_period: string
  created_at: string
}

export interface OvertimeSummary {
  profile_id: string
  employee_id: string
  full_name: string
  department: string | null
  total_type1: number
  total_type2: number
  total_hours: number
  is_overtime: boolean
  records: OvertimeRecord[]
}

export async function getOvertimeRecords(monthPeriod: string): Promise<OvertimeRecord[]> {
  const { data, error } = await supabase
    .from('overtime_records')
    .select('*')
    .eq('month_period', monthPeriod)
    .order('record_date')
  if (error) throw error
  return (data || []) as OvertimeRecord[]
}

export async function upsertOvertimeRecord(record: Omit<OvertimeRecord, 'id' | 'created_at'>): Promise<OvertimeRecord> {
  const { data, error } = await supabase
    .from('overtime_records')
    .upsert(record, { onConflict: 'profile_id,record_date' })
    .select()
    .single()
  if (error) throw error
  return data as OvertimeRecord
}

export async function deleteOvertimeRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('overtime_records')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================
// LEAVE RECORDS (請假紀錄)
// ============================================================

export interface LeaveRecord {
  id: string
  profile_id: string
  leave_type: string
  start_time: string
  end_time: string
  days: number
  hours: number
  reason: string | null
  year: number
  created_at: string
}

export async function getLeaveRecords(year: number): Promise<LeaveRecord[]> {
  const { data, error } = await supabase
    .from('leave_records')
    .select('*')
    .eq('year', year)
    .order('start_time', { ascending: false })
  if (error) throw error
  return (data || []) as LeaveRecord[]
}

export async function createLeaveRecord(record: Omit<LeaveRecord, 'id' | 'created_at'>): Promise<LeaveRecord> {
  const { data, error } = await supabase
    .from('leave_records')
    .insert(record)
    .select()
    .single()
  if (error) throw error
  return data as LeaveRecord
}

export async function updateLeaveRecord(id: string, updates: Partial<LeaveRecord>): Promise<void> {
  const { error } = await supabase.from('leave_records').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteLeaveRecord(id: string): Promise<void> {
  const { error } = await supabase.from('leave_records').delete().eq('id', id)
  if (error) throw error
}

// ---- Annual Leave Balance ----

export interface AnnualLeaveBalance {
  id: string
  profile_id: string
  year: number
  entitled_days: number
  used_days: number
  converted_to_pay: number
  carried_over: number
  remaining: number
  note: string | null
}

export async function getAnnualLeaveBalances(year: number): Promise<AnnualLeaveBalance[]> {
  const { data, error } = await supabase
    .from('annual_leave_balance')
    .select('*')
    .eq('year', year)
  if (error) throw error
  return (data || []) as AnnualLeaveBalance[]
}

export async function upsertAnnualLeaveBalance(record: Omit<AnnualLeaveBalance, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('annual_leave_balance')
    .upsert(record, { onConflict: 'profile_id,year' })
  if (error) throw error
}

// ============================================================
// BONUS (紅利分配)
// ============================================================

export interface BonusMonthly {
  id: string
  profile_id: string
  year_month: string
  hourly_rate: number
  half_hour_count: number
  meal_allowance: number
  monthly_total: number
}

export interface BonusPenalty {
  id: string
  profile_id: string
  year_month: string
  reason: string
  penalty_type: string
  amount: number
  note: string | null
}

export async function getBonusMonthly(yearMonths: string[]): Promise<BonusMonthly[]> {
  const { data, error } = await supabase
    .from('bonus_monthly')
    .select('*')
    .in('year_month', yearMonths)
    .order('year_month')
  if (error) throw error
  return (data || []) as BonusMonthly[]
}

export async function upsertBonusMonthly(record: Omit<BonusMonthly, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('bonus_monthly')
    .upsert(record, { onConflict: 'profile_id,year_month' })
  if (error) throw error
}

export async function getBonusPenalties(yearMonths: string[]): Promise<BonusPenalty[]> {
  const { data, error } = await supabase
    .from('bonus_penalties')
    .select('*')
    .in('year_month', yearMonths)
    .order('year_month')
  if (error) throw error
  return (data || []) as BonusPenalty[]
}

export async function createBonusPenalty(record: Omit<BonusPenalty, 'id'>): Promise<void> {
  const { error } = await supabase.from('bonus_penalties').insert(record)
  if (error) throw error
}

export async function deleteBonusPenalty(id: string): Promise<void> {
  const { error } = await supabase.from('bonus_penalties').delete().eq('id', id)
  if (error) throw error
}
