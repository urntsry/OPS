import { supabase } from './api'

export interface ExternalApp {
  id: string
  name: string
  description: string | null
  url: string
  icon: string
  departments: string[]
  is_active: boolean
  fullscreen_default: boolean
  sort_order: number
}

export interface SoftwareDownload {
  id: string
  name: string
  description: string | null
  version: string
  department: string
  file_path: string
  file_size_bytes: number | null
  platform: string
  changelog: string | null
  is_active: boolean
  download_count: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

// ---- External Apps ----

export async function getExternalApps(department?: string): Promise<ExternalApp[]> {
  let query = supabase
    .from('external_apps')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data, error } = await query
  if (error) throw error

  let apps = (data || []) as ExternalApp[]
  if (department) {
    apps = apps.filter(a => a.departments.includes('all') || a.departments.includes(department))
  }
  return apps
}

export async function createExternalApp(app: Omit<ExternalApp, 'id'>): Promise<ExternalApp> {
  const { data, error } = await supabase
    .from('external_apps')
    .insert(app)
    .select()
    .single()
  if (error) throw error
  return data as ExternalApp
}

export async function updateExternalApp(id: string, updates: Partial<ExternalApp>): Promise<void> {
  const { error } = await supabase
    .from('external_apps')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteExternalApp(id: string): Promise<void> {
  const { error } = await supabase
    .from('external_apps')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ---- Software Downloads ----

export async function getSoftwareDownloads(department?: string): Promise<SoftwareDownload[]> {
  let query = supabase
    .from('software_downloads')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const { data, error } = await query
  if (error) throw error

  let downloads = (data || []) as SoftwareDownload[]
  if (department) {
    downloads = downloads.filter(d => d.department === 'all' || d.department === department)
  }
  return downloads
}

export async function createSoftwareDownload(download: Partial<SoftwareDownload>): Promise<SoftwareDownload> {
  const { data, error } = await supabase
    .from('software_downloads')
    .insert(download)
    .select()
    .single()
  if (error) throw error
  return data as SoftwareDownload
}

export async function incrementDownloadCount(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_download_count', { p_id: id })
  if (error) {
    // Fallback if RPC doesn't exist yet
    const { data } = await supabase
      .from('software_downloads')
      .select('download_count')
      .eq('id', id)
      .single()
    if (data) {
      await supabase
        .from('software_downloads')
        .update({ download_count: (data.download_count || 0) + 1 })
        .eq('id', id)
    }
  }
}
