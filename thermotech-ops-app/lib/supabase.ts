import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for Database Tables
export interface Profile {
  id: string
  employee_id: string
  full_name: string
  department: string | null
  job_title: string | null
  role: 'admin' | 'supervisor' | 'user'
  points_balance: number
  site_code: string | null
  avatar_url: string | null
  created_at: string
}

export interface TaskDefinition {
  id: number
  title: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'event_triggered'
  difficulty_level: number
  base_points: number
  requires_photo: boolean
  requires_approval: boolean
  default_assignee_id: string | null
  backup_assignee_id: string | null
  site_location: string | null
  is_active: boolean
  source_file: string | null
}

export interface DailyAssignment {
  id: number
  task_def_id: number
  user_id: string
  status: 'pending' | 'completed' | 'verified' | 'abnormal'
  assigned_date: string
  completed_at: string | null
  photo_url: string | null
  comment: string | null
  earned_points: number
  is_incident_report: boolean
}


