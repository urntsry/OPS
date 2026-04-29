import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Fax {
  id: string
  file_name: string
  file_url: string | null
  file_size: number | null
  received_at: string
  status: 'pending' | 'analyzing' | 'analyzed' | 'error'
  document_type: string | null
  customer_name: string | null
  customer_address: string | null
  customer_contact: string | null
  customer_phone: string | null
  order_number: string | null
  order_items: OrderItem[]
  our_contact_person: string | null
  our_contact_user_id: string | null
  our_contact_matched_id: string | null
  our_contact_raw: string | null
  our_contact_uncertain: boolean
  ai_confidence: number | null
  ai_raw_response: any
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  is_handled: boolean
  handled_by: string | null
  handled_at: string | null
  delivery_date: string | null
  total_amount: string | null
  currency: string | null
  special_notes: string | null
  notify_sent: boolean
  created_at: string
}

export interface OrderItem {
  name: string
  quantity?: string
  unit?: string
  spec?: string
  note?: string
}

export const DOCUMENT_TYPES = [
  { value: '採購訂單', label: '採購訂單', color: '#C00000', bg: '#FFE0E0' },
  { value: '報價請求', label: '報價請求', color: '#B06000', bg: '#FFF0D0' },
  { value: '出貨通知', label: '出貨通知', color: '#006080', bg: '#D0F0FF' },
  { value: '漲價通知', label: '漲價通知', color: '#800080', bg: '#F0D0F0' },
  { value: '轉帳通知', label: '轉帳通知', color: '#006000', bg: '#D0FFD0' },
  { value: '地址變更', label: '地址變更', color: '#404080', bg: '#E0E0FF' },
  { value: '品質通知', label: '品質通知', color: '#A00000', bg: '#FFD0D0' },
  { value: '合約文件', label: '合約文件', color: '#404040', bg: '#E0E0E0' },
  { value: '一般通知', label: '一般通知', color: '#606060', bg: '#F0F0F0' },
  { value: '其他', label: '其他', color: '#808080', bg: '#F0F0F0' },
  { value: 'unknown', label: '未分類', color: '#999', bg: '#F8F8F8' },
] as const

export function getDocTypeStyle(docType: string | null) {
  const found = DOCUMENT_TYPES.find(d => d.value === docType)
  return found || { value: docType || 'unknown', label: docType || '未分類', color: '#808080', bg: '#F0F0F0' }
}

export async function getFaxes(limit = 50, offset = 0): Promise<Fax[]> {
  const { data, error } = await supabase
    .from('faxes')
    .select('*')
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return (data || []) as Fax[]
}

export async function getFaxById(id: string): Promise<Fax | null> {
  const { data, error } = await supabase
    .from('faxes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Fax
}

export async function updateFax(id: string, updates: Partial<Fax>): Promise<Fax> {
  const { data, error } = await supabase
    .from('faxes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Fax
}

export async function markFaxHandled(id: string, userId: string, handled: boolean): Promise<Fax> {
  const updates: any = {
    is_handled: handled,
    handled_by: handled ? userId : null,
    handled_at: handled ? new Date().toISOString() : null,
  }
  return updateFax(id, updates)
}

export async function deleteFax(id: string): Promise<void> {
  const { error } = await supabase
    .from('faxes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function searchFaxes(query: string): Promise<Fax[]> {
  const sanitized = query.replace(/[%_]/g, '').slice(0, 100)
  if (!sanitized) return []

  const { data, error } = await supabase
    .from('faxes')
    .select('*')
    .or(`customer_name.ilike.%${sanitized}%,order_number.ilike.%${sanitized}%,our_contact_person.ilike.%${sanitized}%,file_name.ilike.%${sanitized}%,notes.ilike.%${sanitized}%,document_type.ilike.%${sanitized}%,special_notes.ilike.%${sanitized}%`)
    .order('received_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data || []) as Fax[]
}

export async function getFaxStats(): Promise<{
  total: number
  pending: number
  analyzed: number
  error: number
  todayCount: number
  unhandled: number
  handled: number
  byType: Record<string, number>
}> {
  const { data, error } = await supabase.from('faxes').select('status, received_at, is_handled, document_type')
  if (error) throw error

  const all = data || []
  const today = new Date().toISOString().split('T')[0]

  const byType: Record<string, number> = {}
  for (const f of all) {
    const t = (f as any).document_type || 'unknown'
    byType[t] = (byType[t] || 0) + 1
  }

  return {
    total: all.length,
    pending: all.filter(f => f.status === 'pending' || f.status === 'analyzing').length,
    analyzed: all.filter(f => f.status === 'analyzed').length,
    error: all.filter(f => f.status === 'error').length,
    todayCount: all.filter(f => f.received_at?.startsWith(today)).length,
    unhandled: all.filter(f => !(f as any).is_handled && f.status === 'analyzed').length,
    handled: all.filter(f => (f as any).is_handled).length,
    byType,
  }
}

export function subscribeFaxUpdates(callback: () => void) {
  const channel = supabase
    .channel('faxes-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'faxes' }, () => {
      callback()
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export async function getFaxFileSignedUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null

  // Handle multiple possible URL formats:
  // 1. Full public URL: https://xxx.supabase.co/storage/v1/object/public/fax-files/faxes/abc.pdf
  // 2. Full signed URL: https://xxx.supabase.co/storage/v1/object/sign/fax-files/...
  // 3. Bare path: faxes/abc.pdf
  let pathPart = filePath
  if (filePath.includes('/storage/v1/object/public/fax-files/')) {
    pathPart = filePath.split('/storage/v1/object/public/fax-files/')[1]
  } else if (filePath.includes('/storage/v1/object/sign/fax-files/')) {
    pathPart = filePath.split('/storage/v1/object/sign/fax-files/')[1].split('?')[0]
  } else if (filePath.startsWith('http')) {
    // Unknown URL format — try last segment after bucket name
    const idx = filePath.indexOf('fax-files/')
    if (idx >= 0) pathPart = filePath.substring(idx + 'fax-files/'.length).split('?')[0]
  }

  if (!pathPart) return null

  try {
    const { data, error } = await supabase.storage
      .from('fax-files')
      .createSignedUrl(pathPart, 3600)
    if (error) {
      console.warn('[getFaxFileSignedUrl] error:', error.message, 'pathPart:', pathPart)
      return null
    }
    return data.signedUrl
  } catch (e) {
    console.warn('[getFaxFileSignedUrl] exception:', e)
    return null
  }
}
