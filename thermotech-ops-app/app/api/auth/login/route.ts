import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { employee_id, password } = await request.json()

    if (!employee_id || !password) {
      return NextResponse.json(
        { error: '請輸入員工編號和密碼' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase.rpc('verify_password', {
      p_employee_id: employee_id,
      p_password: password,
    })

    if (error) {
      console.error('[Auth] RPC error:', error)
      return NextResponse.json(
        { error: '系統錯誤，請稍後再試' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '員工編號或密碼錯誤' },
        { status: 401 }
      )
    }

    const profile = data[0]
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[Auth] Login error:', err)
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}
