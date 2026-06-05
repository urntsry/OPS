import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 產生易讀的初始密碼（避開易混淆字元）
function generatePassword(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function POST(request: NextRequest) {
  try {
    const { actor_employee_id, target_employee_id } = await request.json()
    if (!actor_employee_id || !target_employee_id) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 取得操作者與目標的角色/部門以做權限判斷
    const { data: actor } = await supabase
      .from('profiles').select('role, department').eq('employee_id', actor_employee_id).single()
    const { data: target } = await supabase
      .from('profiles').select('role, department, full_name').eq('employee_id', target_employee_id).single()

    if (!actor || !target) {
      return NextResponse.json({ error: '找不到使用者' }, { status: 404 })
    }

    const isAdmin = actor.role === 'admin'
    const isManagerOfDept = actor.role === 'manager' && actor.department === target.department
    if (!isAdmin && !isManagerOfDept) {
      return NextResponse.json({ error: '權限不足：僅 admin 或同部門主管可重設密碼' }, { status: 403 })
    }
    // 主管不可重設 admin / 其他主管的密碼
    if (!isAdmin && (target.role === 'admin' || target.role === 'manager')) {
      return NextResponse.json({ error: '權限不足：無法重設管理者密碼' }, { status: 403 })
    }

    const newPassword = generatePassword()
    const { data, error } = await supabase.rpc('set_user_password', {
      p_employee_id: target_employee_id,
      p_new_password: newPassword,
      p_must_change: true,
    })
    if (error) {
      console.error('[Auth] admin-reset RPC error:', error)
      return NextResponse.json({ error: '密碼重設失敗' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: '找不到該員工編號' }, { status: 404 })
    }

    return NextResponse.json({ success: true, password: newPassword, full_name: target.full_name })
  } catch (err) {
    console.error('[Auth] admin-reset error:', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
