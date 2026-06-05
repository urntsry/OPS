'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'

interface PendingProfile {
  id: string
  employee_id: string
  full_name: string
  role: string
  department: string
  job_title: string
  site_code: string
  hr_access?: boolean
}

export default function LoginPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // First-login forced password change
  const [mustChange, setMustChange] = useState(false)
  const [pendingProfile, setPendingProfile] = useState<PendingProfile | null>(null)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  function finishLogin(profile: PendingProfile) {
    localStorage.setItem('currentUser', JSON.stringify({
      id: profile.id,
      employeeId: profile.employee_id,
      fullName: profile.full_name,
      role: profile.role,
      department: profile.department,
      jobTitle: profile.job_title,
      siteCode: profile.site_code,
      hr_access: profile.hr_access || false,
    }))
    router.push('/home')
  }

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

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, password }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || '登入失敗')
        setLoading(false)
        return
      }

      const profile = result.profile

      if (profile.must_change_password) {
        // Force a password change before entering the system
        setPendingProfile(profile)
        setMustChange(true)
        setLoading(false)
        return
      }

      finishLogin(profile)
    } catch (err) {
      console.error('[Login] 錯誤:', err)
      setError('系統錯誤，請稍後再試')
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPw.length < 6) { setError('新密碼長度至少 6 碼'); return }
    if (newPw !== confirmPw) { setError('兩次輸入的新密碼不一致'); return }
    if (newPw === password) { setError('新密碼不可與目前密碼相同'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, old_password: password, new_password: newPw }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || '密碼修改失敗')
        setLoading(false)
        return
      }
      if (pendingProfile) finishLogin(pendingProfile)
    } catch {
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

          {mustChange ? (
            <>
              <div className="mb-4 p-2 text-center" style={{ background: '#FFF3CD', border: '2px solid #C8A200', color: '#7A5C00', fontSize: '10px' }}>
                首次登入或密碼已被重設，請設定新密碼後繼續。
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-bold" style={{ fontSize: '11px' }}>新密碼（至少 6 碼）</label>
                <input
                  type="password"
                  className="input w-full"
                  placeholder="請輸入新密碼"
                  value={newPw}
                  onChange={(e) => { setNewPw(e.target.value); setError('') }}
                  autoFocus
                  disabled={loading}
                  style={{ fontSize: '11px' }}
                />
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-bold" style={{ fontSize: '11px' }}>確認新密碼</label>
                <input
                  type="password"
                  className="input w-full"
                  placeholder="再次輸入新密碼"
                  value={confirmPw}
                  onChange={(e) => { setConfirmPw(e.target.value); setError('') }}
                  onKeyPress={(e) => e.key === 'Enter' && handleChangePassword()}
                  disabled={loading}
                  style={{ fontSize: '11px' }}
                />
              </div>

              <Button
                onClick={handleChangePassword}
                className="w-full"
                disabled={loading}
                style={{ fontSize: '11px', padding: '8px' }}
              >
                {loading ? '設定中...' : '設定新密碼並登入'}
              </Button>
            </>
          ) : (
          <>
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
          </>
          )}

          <div className="mt-6 text-mono text-center" style={{ fontSize: '10px', color: '#808080' }}>
            <div>振禹企業 © 2025</div>
          </div>
        </div>
      </div>
    </div>
  )
}
