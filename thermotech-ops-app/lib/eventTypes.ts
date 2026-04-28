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

export type EventTypeId = typeof EVENT_TYPES[number]['id']
