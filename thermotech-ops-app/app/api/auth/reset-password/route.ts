import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { admin_employee_id, target_employee_id, new_password } = await request.json()

    if (!admin_employee_id || !target_employee_id || !new_password) {
      return NextResponse.json(
        { error: '缺少必要欄位' },
        { status: 400 }
      )
    }

    if (new_password.length < 4) {
      return NextResponse.json(
        { error: '密碼長度至少 4 碼' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify admin role
    const { data: admin, error: adminErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('employee_id', admin_employee_id)
      .single()

    if (adminErr || !admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: '權限不足：僅管理員可重設密碼' },
        { status: 403 }
      )
    }

    // Set new password via RPC
    const { data, error } = await supabase.rpc('set_user_password', {
      p_employee_id: target_employee_id,
      p_new_password: new_password,
    })

    if (error) {
      console.error('[Auth] Reset password RPC error:', error)
      return NextResponse.json(
        { error: '密碼重設失敗' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '找不到該員工編號' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, message: '密碼已重設' })
  } catch (err) {
    console.error('[Auth] Reset error:', err)
    return NextResponse.json(
      { error: '系統錯誤' },
      { status: 500 }
    )
  }
}
