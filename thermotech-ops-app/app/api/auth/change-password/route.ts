import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { employee_id, old_password, new_password } = await request.json()

    if (!employee_id || !old_password || !new_password) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }
    if (String(new_password).length < 6) {
      return NextResponse.json({ error: '新密碼長度至少 6 碼' }, { status: 400 })
    }
    if (new_password === old_password) {
      return NextResponse.json({ error: '新密碼不可與舊密碼相同' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase.rpc('change_own_password', {
      p_employee_id: employee_id,
      p_old_password: old_password,
      p_new_password: new_password,
    })

    if (error) {
      console.error('[Auth] change_own_password RPC error:', error)
      return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 })
    }
    if (data !== true) {
      return NextResponse.json({ error: '舊密碼不正確' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Auth] change-password error:', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
