export interface EventType {
  id: string
  label: string
  color: string
  allowedRoles: string[]
}

export const EVENT_TYPES: EventType[] = [
  { id: 'event',      label: '事件',     color: '#FF8C00', allowedRoles: ['admin', 'manager', 'user'] },
  { id: 'meeting',    label: '會議',     color: '#800080', allowedRoles: ['admin', 'manager'] },
  { id: 'assignment', label: '交辦事項', color: '#008080', allowedRoles: ['admin', 'manager'] },
  { id: 'delegation', label: '正式交辦', color: '#B22222', allowedRoles: ['admin', 'manager', 'user'] },
  { id: 'public',     label: '公共事項', color: '#800000', allowedRoles: ['admin'] },
  { id: 'visit',      label: '客戶拜訪', color: '#006400', allowedRoles: ['admin', 'manager', 'user'] },
  { id: 'routine',    label: '例行公事', color: '#000080', allowedRoles: ['admin', 'manager', 'user'] },
  { id: 'training',   label: '課程進修', color: '#4B0082', allowedRoles: ['admin', 'manager'] },
]

export function getEventColor(type: string): string {
  return EVENT_TYPES.find(t => t.id === type)?.color || '#000000'
}

export function getEventLabel(type: string): string {
  return EVENT_TYPES.find(t => t.id === type)?.label || type
}

export function getTypesForRole(role: string): EventType[] {
  return EVENT_TYPES.filter(t => t.allowedRoles.includes(role))
}

/**
 * Get allowed event types for a specific user, checking:
 * 1. Individual override (highest priority)
 * 2. Department permissions
 * 3. Role-based defaults (fallback)
 */
export function getTypesForUser(userId: string, department: string, role: string): EventType[] {
  if (role === 'admin') return EVENT_TYPES

  if (typeof window === 'undefined') return getTypesForRole(role)

  try {
    const personOverrides = JSON.parse(localStorage.getItem('ops_person_permissions') || '{}')
    if (personOverrides[userId]) {
      const allowed = personOverrides[userId] as string[]
      return EVENT_TYPES.filter(t => allowed.includes(t.id))
    }

    const deptPermissions = JSON.parse(localStorage.getItem('ops_dept_permissions') || '{}')
    if (deptPermissions[department]) {
      const allowed = deptPermissions[department] as string[]
      return EVENT_TYPES.filter(t => allowed.includes(t.id))
    }
  } catch { /* fallback */ }

  return getTypesForRole(role)
}

export type EventTypeId = typeof EVENT_TYPES[number]['id']
