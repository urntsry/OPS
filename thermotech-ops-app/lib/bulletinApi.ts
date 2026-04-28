import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Attachment {
  name: string
  url: string
  type: string
}

export interface Bulletin {
  id: string
  title: string
  content?: string
  bulletin_type: 'public' | 'notice'
  event_date?: string
  is_recurring: boolean
  recurring_days?: number[]
  priority: 'normal' | 'important' | 'urgent'
  department?: string
  created_by?: string
  attachments: Attachment[]
  is_active: boolean
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'published'
  created_at: string
}

export async function getBulletins(type?: 'public' | 'notice', statusFilter?: string): Promise<Bulletin[]> {
  let query = supabase
    .from('bulletins')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (type) query = query.eq('bulletin_type', type)
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  } else {
    query = query.eq('status', 'published')
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Bulletin[]
}

export async function getAllBulletins(): Promise<Bulletin[]> {
  const { data, error } = await supabase
    .from('bulletins')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Bulletin[]
}

export async function getPendingBulletins(): Promise<Bulletin[]> {
  const { data, error } = await supabase
    .from('bulletins')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Bulletin[]
}

export async function getBulletinById(id: string): Promise<Bulletin | null> {
  const { data, error } = await supabase
    .from('bulletins')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Bulletin
}

export async function createBulletin(bulletin: Partial<Bulletin>): Promise<Bulletin> {
  const { data, error } = await supabase
    .from('bulletins')
    .insert({
      ...bulletin,
      attachments: bulletin.attachments || [],
    })
    .select()
    .single()
  if (error) throw error
  return data as Bulletin
}

export async function updateBulletin(id: string, updates: Partial<Bulletin>): Promise<Bulletin> {
  const { data, error } = await supabase
    .from('bulletins')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Bulletin
}

export async function deleteBulletin(id: string): Promise<void> {
  const { error } = await supabase
    .from('bulletins')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function uploadBulletinFile(file: File): Promise<Attachment> {
  const ext = file.name.split('.').pop() || ''
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `bulletins/${fileName}`

  const { error } = await supabase.storage
    .from('bulletin-files')
    .upload(filePath, file)
  if (error) throw error

  const { data } = supabase.storage.from('bulletin-files').getPublicUrl(filePath)

  return {
    name: file.name,
    url: data.publicUrl,
    type: ext.toLowerCase(),
  }
}

export function getBulletinCalendarEvents(bulletins: Bulletin[], year: number, month: number) {
  const events: Array<{ date: number; title: string; type: string; bulletinId: string }> = []

  for (const b of bulletins) {
    if (b.event_date) {
      const d = new Date(b.event_date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        events.push({ date: d.getDate(), title: b.title, type: b.bulletin_type, bulletinId: b.id })
      }
    }
    if (b.is_recurring && b.recurring_days) {
      for (const day of b.recurring_days) {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        if (day <= daysInMonth) {
          events.push({ date: day, title: b.title, type: b.bulletin_type, bulletinId: b.id })
        }
      }
    }
  }

  return events
}
