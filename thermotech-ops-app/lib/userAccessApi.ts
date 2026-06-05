import { supabase } from './supabase'
import { computeEffectiveModules } from './modules'

export interface DepartmentModuleRow {
  id: string
  department: string
  module_id: string
}

export interface UserOverrideRow {
  id: string
  profile_id: string
  module_id: string
  allowed: boolean
}

// ---------- 部門 → 模組 對應 ----------
export async function getDepartmentModuleMap(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('department_module_access')
    .select('department, module_id')
  if (error) throw error
  const map: Record<string, string[]> = {}
  for (const row of data || []) {
    if (!map[row.department]) map[row.department] = []
    map[row.department].push(row.module_id)
  }
  return map
}

export async function setDepartmentModule(department: string, moduleId: string, enabled: boolean): Promise<void> {
  if (enabled) {
    const { error } = await supabase
      .from('department_module_access')
      .upsert({ department, module_id: moduleId }, { onConflict: 'department,module_id' })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('department_module_access')
      .delete()
      .eq('department', department)
      .eq('module_id', moduleId)
    if (error) throw error
  }
}

// ---------- 個人 override ----------
export async function getUserOverrides(profileId: string): Promise<UserOverrideRow[]> {
  const { data, error } = await supabase
    .from('user_module_overrides')
    .select('id, profile_id, module_id, allowed')
    .eq('profile_id', profileId)
  if (error) throw error
  return data || []
}

export async function getAllUserOverrides(): Promise<UserOverrideRow[]> {
  const { data, error } = await supabase
    .from('user_module_overrides')
    .select('id, profile_id, module_id, allowed')
  if (error) throw error
  return data || []
}

/** allowed=null 表示清除 override（回到部門預設） */
export async function setUserOverride(profileId: string, moduleId: string, allowed: boolean | null): Promise<void> {
  if (allowed === null) {
    const { error } = await supabase
      .from('user_module_overrides')
      .delete()
      .eq('profile_id', profileId)
      .eq('module_id', moduleId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('user_module_overrides')
      .upsert({ profile_id: profileId, module_id: moduleId, allowed }, { onConflict: 'profile_id,module_id' })
    if (error) throw error
  }
}

// ---------- 角色 / 部門 維護（admin 用）----------
export async function updateUserRole(profileId: string, role: 'admin' | 'manager' | 'user'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
  if (error) throw error
}

export async function updateUserDepartment(profileId: string, department: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ department }).eq('id', profileId)
  if (error) throw error
}

// 透過 API route 重設密碼（產生新密碼並回傳一次）
export async function adminResetPassword(actorEmployeeId: string, targetEmployeeId: string): Promise<{ password: string; full_name: string }> {
  const res = await fetch('/api/auth/admin-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_employee_id: actorEmployeeId, target_employee_id: targetEmployeeId }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || '重設失敗')
  return { password: json.password, full_name: json.full_name }
}

// ---------- 計算單一使用者有效模組 ----------
export async function getEffectiveModules(profile: {
  id: string
  role: string
  department: string | null
}): Promise<Set<string>> {
  if (profile.role === 'admin') {
    return computeEffectiveModules({ role: 'admin', department: profile.department, departmentModules: [], overrides: [] })
  }
  const [deptMap, overrides] = await Promise.all([
    getDepartmentModuleMap(),
    getUserOverrides(profile.id),
  ])
  const departmentModules = profile.department ? (deptMap[profile.department] || []) : []
  return computeEffectiveModules({
    role: profile.role,
    department: profile.department,
    departmentModules,
    overrides: overrides.map(o => ({ module_id: o.module_id, allowed: o.allowed })),
  })
}
