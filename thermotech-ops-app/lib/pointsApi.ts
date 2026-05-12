import { supabase } from './api'

export interface PointsTransaction {
  id: string
  user_id: string
  points: number
  source_type: string
  source_id: string | null
  description: string
  created_by: string | null
  created_at: string
}

export interface PointsReward {
  id: string
  name: string
  description: string | null
  points_cost: number
  stock: number | null
  is_active: boolean
}

export interface LeaderboardEntry {
  id: string
  employee_id: string
  full_name: string
  department: string | null
  total_points: number
  month_points: number
}

// ---- Transactions ----

export async function getPointsHistory(userId: string, limit = 50): Promise<PointsTransaction[]> {
  const { data, error } = await supabase
    .from('points_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as PointsTransaction[]
}

export async function awardPoints(params: {
  userId: string
  points: number
  sourceType: string
  sourceId?: string
  description: string
  createdBy?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('award_points', {
    p_user_id: params.userId,
    p_points: params.points,
    p_source_type: params.sourceType,
    p_source_id: params.sourceId || null,
    p_description: params.description,
    p_created_by: params.createdBy || null,
  })

  if (error) throw error
  return data as string
}

export async function checkAlreadyAwarded(userId: string, sourceType: string, sourceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('points_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .limit(1)

  if (error) throw error
  return (data?.length || 0) > 0
}

// ---- Leaderboard ----

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('points_monthly_leaderboard')
    .select('*')
    .order('total_points', { ascending: false })

  if (error) throw error
  return (data || []) as LeaderboardEntry[]
}

// ---- Rewards ----

export async function getRewards(activeOnly = true): Promise<PointsReward[]> {
  let query = supabase
    .from('points_rewards')
    .select('*')
    .order('points_cost')

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as PointsReward[]
}

export async function createReward(reward: Omit<PointsReward, 'id'>): Promise<PointsReward> {
  const { data, error } = await supabase
    .from('points_rewards')
    .insert(reward)
    .select()
    .single()
  if (error) throw error
  return data as PointsReward
}

export async function updateReward(id: string, updates: Partial<PointsReward>): Promise<void> {
  const { error } = await supabase
    .from('points_rewards')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

// ---- Stats ----

export interface PointsStats {
  announcement: number
  task: number
  bonus: number
  redemption: number
  penalty: number
}

export async function getPointsStats(userId: string): Promise<PointsStats> {
  const { data, error } = await supabase
    .from('points_transactions')
    .select('source_type, points')
    .eq('user_id', userId)

  if (error) throw error

  const stats: PointsStats = { announcement: 0, task: 0, bonus: 0, redemption: 0, penalty: 0 }
  for (const tx of data || []) {
    switch (tx.source_type) {
      case 'announcement_read': stats.announcement += tx.points; break
      case 'task_complete': stats.task += tx.points; break
      case 'bonus': stats.bonus += tx.points; break
      case 'redemption': stats.redemption += tx.points; break
      case 'penalty': stats.penalty += tx.points; break
    }
  }
  return stats
}
