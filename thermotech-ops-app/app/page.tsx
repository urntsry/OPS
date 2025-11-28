'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import { supabase } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!employeeId) {
      setError('請輸入員工編號')
      return
    }
    
    if (!password) {
      setError('請輸入密碼')
      return
    }

    setLoading(true)
    setError('')
    console.log('[Login] 嘗試登入:', employeeId)

    try {
      // 查詢員工資料（暫時不檢查密碼）
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('employee_id', employeeId)
        .single()

      if (dbError || !data) {
        console.error('[Login] 登入失敗:', dbError)
        setError('找不到此員工編號')
        setLoading(false)
        return
      }
      
      // 檢查密碼（如果有 password 欄位）
      if (data.password && data.password !== password) {
        console.error('[Login] 密碼錯誤')
        setError('密碼錯誤')
        setLoading(false)
        return
      }

      console.log('[Login] 登入成功:', data.full_name)

      // 儲存登入資訊到 localStorage
      localStorage.setItem('currentUser', JSON.stringify({
        id: data.id,
        employeeId: data.employee_id,
        fullName: data.full_name,
        role: data.role,
        department: data.department,
        jobTitle: data.job_title,
        siteCode: data.site_code
      }))

      // 導向首頁
      router.push('/home')
    } catch (err) {
      console.error('[Login] 錯誤:', err)
      setError('系統錯誤，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-700">
      <div className="window" style={{ width: '450px' }}>
        <div className="titlebar">
          THERMOTECH-OPS v2.8
        </div>
        
        <div className="p-8 bg-grey-200">
          <div className="mb-8 text-center">
            <div className="text-bold mb-2" style={{ fontSize: '14px' }}>振禹企業有限公司</div>
            <div className="text-mono" style={{ fontSize: '12px' }}>工廠作業系統</div>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div 
              className="mb-4 p-2 text-center text-bold"
              style={{ 
                background: '#FFCCCC', 
                border: '2px solid #CC0000',
                color: '#CC0000',
                fontSize: '11px'
              }}
            >
              {error}
            </div>
          )}

          {/* 員工編號 */}
          <div className="mb-4">
            <label className="block mb-2 text-bold" style={{ fontSize: '11px' }}>
              員工編號
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="請輸入編號"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value)
                setError('')
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              autoFocus
              disabled={loading}
              style={{ fontSize: '11px' }}
            />
          </div>

          {/* 密碼 */}
          <div className="mb-6">
            <label className="block mb-2 text-bold" style={{ fontSize: '11px' }}>
              密碼
            </label>
            <input
              type="password"
              className="input w-full"
              placeholder="請輸入密碼"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              disabled={loading}
              style={{ fontSize: '11px' }}
            />
          </div>

          <Button 
            onClick={handleLogin} 
            className="w-full"
            disabled={loading}
            style={{ fontSize: '11px', padding: '8px' }}
          >
            {loading ? '登入中...' : '登入系統'}
          </Button>

          <div className="mt-6 text-mono text-center" style={{ fontSize: '10px', color: '#808080' }}>
            <div>振禹企業 © 2025</div>
          </div>
        </div>
      </div>
    </div>
  )
}
