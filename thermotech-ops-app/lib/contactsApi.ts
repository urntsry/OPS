import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface InternalContact {
  id: string
  name: string
  aliases: string[] | null
  department: string | null
  title: string | null
  email: string | null
  phone: string | null
  line_user_id: string | null
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getInternalContacts(activeOnly = false): Promise<InternalContact[]> {
  let query = supabase
    .from('fax_internal_contacts')
    .select('*')
    .order('active', { ascending: false })
    .order('name')
  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as InternalContact[]
}

export async function createInternalContact(
  payload: Partial<InternalContact> & { name: string }
): Promise<InternalContact> {
  const insert = {
    name: payload.name,
    aliases: payload.aliases || [],
    department: payload.department || null,
    title: payload.title || null,
    email: payload.email || null,
    phone: payload.phone || null,
    line_user_id: payload.line_user_id || null,
    notes: payload.notes || null,
    active: payload.active ?? true,
  }
  const { data, error } = await supabase
    .from('fax_internal_contacts')
    .insert([insert])
    .select()
    .single()
  if (error) throw error
  return data as InternalContact
}

export async function updateInternalContact(
  id: string,
  updates: Partial<InternalContact>
): Promise<InternalContact> {
  const { data, error } = await supabase
    .from('fax_internal_contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as InternalContact
}

export async function deleteInternalContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('fax_internal_contacts')
    .delete()
    .eq('id', id)
  if (error) throw error
}
