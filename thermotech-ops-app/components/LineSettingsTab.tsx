'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/api'

interface LineSettingsTabProps {
  userId?: string
}

const NOTIFICATION_TYPES = [
  { key: 'calendar_event', label: '行事曆事件', desc: '會議、截止日、活動提醒' },
  { key: 'new_announcement', label: '新公告', desc: '公佈欄有新公告時通知' },
  { key: 'task_assigned', label: '任務指派', desc: '被指派新任務時通知' },
  { key: 'delegation_due', label: '交辦到期', desc: '交辦事項即將到期提醒' },
  { key: 'fax_received', label: '傳真接收', desc: '新傳真到達時通知' },
  { key: 'meeting_reminder', label: '會議提醒', desc: '會議開始前提醒' },
  { key: 'points_earned', label: '積分獲得', desc: '獲得積分時通知' },
]

export default function LineSettingsTab({ userId }: LineSettingsTabProps) {
  const [lineStatus, setLineStatus] = useState<'unbound' | 'bound' | 'loading'>('loading')
  const [lineBoundAt, setLineBoundAt] = useState<string | null>(null)
  const [bindingCode, setBindingCode] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { if (userId) loadSettings() }, [userId])

  async function loadSettings() {
    setLineStatus('loading')
    try {
      const { data } = await supabase
        .from('profiles')
        .select('line_user_id, line_bound_at, notification_prefs')
        .eq('id', userId)
        .single()

      if (data) {
        setLineStatus(data.line_user_id ? 'bound' : 'unbound')
        setLineBoundAt(data.line_bound_at)
        setPrefs(data.notification_prefs || getDefaultPrefs())
      }
    } catch (err) {
      console.error('[LineSettings] Load error:', err)
      setLineStatus('unbound')
    }
  }

  function getDefaultPrefs(): Record<string, string[]> {
    const defaults: Record<string, string[]> = {}
    NOTIFICATION_TYPES.forEach(t => { defaults[t.key] = ['in_app', 'line'] })
    return defaults
  }

  async function generateCode() {
    try {
      const res = await fetch('/api/line/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (data.code) {
        setBindingCode(data.code)
        setToast('綁定碼已產生，請於 LINE 中傳送此碼')
      }
    } catch (err) {
      setToast('產生綁定碼失敗')
    }
  }

  async function unbindLine() {
    try {
      await fetch('/api/line/bind', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      setLineStatus('unbound')
      setLineBoundAt(null)
      setToast('LINE 已解除綁定')
    } catch (err) {
      setToast('解除綁定失敗')
    }
  }

  function toggleChannel(notifKey: string, channel: string) {
    setPrefs(prev => {
      const current = prev[notifKey] || ['in_app']
      const updated = current.includes(channel)
        ? current.filter(c => c !== channel)
        : [...current, channel]
      if (!updated.includes('in_app')) updated.push('in_app')
      return { ...prev, [notifKey]: updated }
    })
  }

  async function savePrefs() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_prefs: prefs })
        .eq('id', userId)
      if (error) throw error
      setToast('通知偏好已儲存')
    } catch (err) {
      setToast('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '10px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ padding: '4px 8px', marginBottom: '6px', background: '#FFFFCC', border: '1px solid #808080', fontSize: '9px' }}>
          {toast}
          <button onClick={() => setToast(null)} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {/* LINE Binding */}
      <div className="window" style={{ padding: 0, marginBottom: '8px' }}>
        <div className="titlebar" style={{ padding: '2px 6px', fontSize: '9px' }}>
          LINE 綁定狀態
        </div>
        <div style={{ padding: '8px', background: 'var(--bg-inset)' }}>
          {lineStatus === 'loading' ? (
            <div style={{ color: 'var(--text-muted)' }}>載入中...</div>
          ) : lineStatus === 'bound' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#008000', fontWeight: 'bold' }}>● 已綁定</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '8px' }}>
                  {lineBoundAt ? `綁定於 ${new Date(lineBoundAt).toLocaleString('zh-TW')}` : ''}
                </span>
              </div>
              <button onClick={unbindLine} className="btn" style={{ fontSize: '8px', padding: '2px 8px', color: 'var(--status-error)' }}>
                解除綁定
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '6px', color: 'var(--text-muted)' }}>
                尚未綁定 LINE。綁定後即可收到工作通知推播。
              </div>
              {bindingCode ? (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '2px' }}>請在 LINE 中傳送以下綁定碼：</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-blue)', letterSpacing: '4px', padding: '6px', background: '#FFF', border: '2px inset var(--border-dark)', textAlign: 'center' }}>
                    {bindingCode}
                  </div>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    步驟：加入公司 LINE Bot 好友 → 傳送上方 6 碼 → 完成綁定
                  </div>
                </div>
              ) : (
                <button onClick={generateCode} className="btn" style={{ fontSize: '9px', padding: '3px 10px' }}>
                  產生綁定碼
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="window" style={{ padding: 0 }}>
        <div className="titlebar" style={{ padding: '2px 6px', fontSize: '9px' }}>
          通知偏好設定
        </div>
        <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
          <div style={{ marginBottom: '6px', color: 'var(--text-muted)', fontSize: '8px' }}>
            勾選 LINE 表示該類通知會同時推播到 LINE（需先完成綁定）。In-App 通知一律開啟。
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ padding: '3px 6px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>通知類型</th>
                <th style={{ padding: '3px 6px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>說明</th>
                <th style={{ padding: '3px 6px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '50px' }}>In-App</th>
                <th style={{ padding: '3px 6px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '50px' }}>LINE</th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_TYPES.map(nt => {
                const channels = prefs[nt.key] || ['in_app']
                return (
                  <tr key={nt.key} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>{nt.label}</td>
                    <td style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>{nt.desc}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <input type="checkbox" checked={true} disabled style={{ opacity: 0.5 }} />
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={channels.includes('line')}
                        onChange={() => toggleChannel(nt.key, 'line')}
                        disabled={lineStatus !== 'bound'}
                        style={{ cursor: lineStatus === 'bound' ? 'pointer' : 'not-allowed' }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={savePrefs} disabled={saving} className="btn" style={{ fontSize: '9px', padding: '3px 12px', fontWeight: 'bold' }}>
              {saving ? 'SAVING...' : 'SAVE PREFERENCES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
