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
  customer_name: string | null
  customer_address: string | null
  customer_contact: string | null
  order_number: string | null
  order_items: OrderItem[]
  our_contact_person: string | null
  our_contact_user_id: string | null
  ai_confidence: number | null
  ai_raw_response: any
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string
}

export interface OrderItem {
  name: string
  quantity?: string
  unit?: string
  spec?: string
  note?: string
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
    .or(`customer_name.ilike.%${sanitized}%,order_number.ilike.%${sanitized}%,our_contact_person.ilike.%${sanitized}%,file_name.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`)
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
}> {
  const { data, error } = await supabase.from('faxes').select('status, received_at')
  if (error) throw error

  const all = data || []
  const today = new Date().toISOString().split('T')[0]

  return {
    total: all.length,
    pending: all.filter(f => f.status === 'pending' || f.status === 'analyzing').length,
    analyzed: all.filter(f => f.status === 'analyzed').length,
    error: all.filter(f => f.status === 'error').length,
    todayCount: all.filter(f => f.received_at?.startsWith(today)).length,
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

/**
 * Get a signed URL for private storage files.
 * Use this instead of public URLs for fax-files bucket.
 */
export async function getFaxFileSignedUrl(filePath: string): Promise<string | null> {
  const pathPart = filePath.includes('/storage/v1/object/public/')
    ? filePath.split('/storage/v1/object/public/fax-files/')[1]
    : filePath

  if (!pathPart) return null

  const { data, error } = await supabase.storage
    .from('fax-files')
    .createSignedUrl(pathPart, 3600) // 1 hour expiry

  if (error) return null
  return data.signedUrl
}
