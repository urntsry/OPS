import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

/** GET /api/fax/contacts — list all internal contacts */
export async function GET() {
  const { data, error } = await supabase
    .from('fax_internal_contacts')
    .select('*')
    .order('active', { ascending: false })
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ contacts: data || [] })
}

/** POST /api/fax/contacts — create a new contact */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, aliases, department, title, email, phone, line_user_id, notes } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const insert = {
      name: name.trim(),
      aliases: Array.isArray(aliases) ? aliases.filter((a: any) => typeof a === 'string' && a.trim()).map((a: string) => a.trim()) : [],
      department: department || null,
      title: title || null,
      email: email || null,
      phone: phone || null,
      line_user_id: line_user_id || null,
      notes: notes || null,
      active: true,
    }

    const { data, error } = await supabase
      .from('fax_internal_contacts')
      .insert([insert])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ contact: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** PATCH /api/fax/contacts?id=... — update */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    const update: any = { updated_at: new Date().toISOString() }
    const allowedFields = ['name', 'aliases', 'department', 'title', 'email', 'phone', 'line_user_id', 'notes', 'active']
    for (const key of allowedFields) {
      if (key in body) update[key] = body[key]
    }
    if ('aliases' in update && !Array.isArray(update.aliases)) update.aliases = []

    const { data, error } = await supabase
      .from('fax_internal_contacts')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contact: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** DELETE /api/fax/contacts?id=... */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('fax_internal_contacts')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
