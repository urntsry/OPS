// 模組目錄與存取規則
// - department-gated：由「部門 → 模組對應」+ 個人 override 決定是否可見
// - role-only：固定由角色決定（admin / manager），不受部門對應影響

export type ModuleGate = 'always' | 'department' | 'role-admin' | 'role-manager'

export interface ModuleDef {
  id: string
  label: string
  gate: ModuleGate
}

// 與 WINDOW_CONFIGS 的 id 對應（hidden 視窗不列入授權管理）
export const MODULES: ModuleDef[] = [
  { id: 'hr', label: 'HR - 人事', gate: 'department' },
  { id: 'meeting', label: 'MEETING - 會議', gate: 'department' },
  { id: 'fax', label: 'FAX - 傳真中心', gate: 'department' },
  { id: 'sales', label: 'SALES - 業務', gate: 'department' },
  { id: 'points', label: 'POINTS - 積分中心', gate: 'department' },
  { id: 'appcenter', label: 'APP CENTER - 軟體中心', gate: 'department' },
  { id: 'capacity', label: 'CAPACITY - 產能系統', gate: 'department' },
  // 系統設定：所有人都可見（內部敏感分頁另由角色把關，一般員工僅能改自己密碼）
  { id: 'settings', label: 'CONFIG - 系統設定', gate: 'always' },
  // 角色限定
  { id: 'manager', label: 'MANAGER - 管理監控', gate: 'role-manager' },
]

// 部門可指派的模組（供設定頁勾選用）
export const DEPARTMENT_GATED_MODULES = MODULES.filter(m => m.gate === 'department')

export interface AccessContext {
  role: string
  department: string | null
  departmentModules: string[] // 該部門被指派的模組 id
  overrides: { module_id: string; allowed: boolean }[] // 個人 override
}

/**
 * 計算使用者「有效可見模組」id 集合。
 * - admin：全部模組
 * - role-manager 模組：role 為 admin / manager 才可見
 * - department 模組：部門對應 ∪ override(allowed=true)，再扣除 override(allowed=false)
 */
export function computeEffectiveModules(ctx: AccessContext): Set<string> {
  const result = new Set<string>()

  if (ctx.role === 'admin') {
    MODULES.forEach(m => result.add(m.id))
    return result
  }

  const overrideMap = new Map<string, boolean>()
  ctx.overrides.forEach(o => overrideMap.set(o.module_id, o.allowed))

  for (const m of MODULES) {
    if (m.gate === 'always') { result.add(m.id); continue }
    if (m.gate === 'role-admin') {
      if (ctx.role === 'admin') result.add(m.id)
      continue
    }
    if (m.gate === 'role-manager') {
      if (ctx.role === 'admin' || ctx.role === 'manager') result.add(m.id)
      continue
    }
    // department-gated
    const ov = overrideMap.get(m.id)
    if (ov === false) continue // 個人關閉，優先
    if (ov === true) { result.add(m.id); continue } // 個人開放
    if (ctx.departmentModules.includes(m.id)) result.add(m.id)
  }

  return result
}
