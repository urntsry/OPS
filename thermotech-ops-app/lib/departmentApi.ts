import { supabase } from './supabase'

export interface Department {
  id: string
  name: string
  source: 'custom' | 'system'
  created_at: string
}

export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function addDepartment(name: string): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .insert({ name, source: 'custom' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeDepartment(id: string): Promise<void> {
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id)
  if (error) throw error
}
