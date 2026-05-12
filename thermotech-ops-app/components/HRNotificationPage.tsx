'use client'

import { useState } from 'react'

export default function HRNotificationPage() {
  const [selectedMode, setSelectedMode] = useState<'all' | 'site' | 'dept' | 'manual'>('all')
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [template, setTemplate] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const sites = ['316', '310', '高獅']
  const depts = ['廠務部', '管理部', '業務部']
  const users = [
    '張庭憲', '潘育昌', '黎文祥', '王啟典', '李家榮',
    '白思恩', '林珠華', '林怡彣', '張麗卿', '阮慧喬'
  ]

  const templates = [
    { id: 'salary', label: '薪資通知', content: '本月薪資已入帳，請查收。' },
    { id: 'holiday', label: '假日公告', content: '【重要】本週六(XX/XX)為補班日，請準時到班。' },
    { id: 'health', label: '體檢通知', content: '年度員工健康檢查將於XX月XX日舉行，請準時參加。' },
    { id: 'custom', label: '自訂訊息', content: '' },
  ]

  const handleTemplateChange = (templateId: string) => {
    setTemplate(templateId)
    const t = templates.find(t => t.id === templateId)
    if (t) setMessage(t.content)
  }

  const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]

  const handleSend = () => {
    if (!message.trim()) { alert('請輸入訊息內容'); return }
    setSending(true)
    console.log('Sending notification:', { mode: selectedMode, sites: selectedSites, depts: selectedDepts, users: selectedUsers, message })
    setTimeout(() => { setSending(false); alert('通知已發送！（Demo）') }, 500)
  }

  const recipientCount = selectedMode === 'all' ? '全公司'
    : selectedMode === 'site' ? `${selectedSites.length} 廠區`
    : selectedMode === 'dept' ? `${selectedDepts.length} 部門`
    : `${selectedUsers.length} 人`

  const inputStyle: React.CSSProperties = { fontSize: '9px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '6px', fontSize: '8px', color: 'var(--text-muted)' }}>
        <span>對象: <b style={{ color: 'var(--text-primary)' }}>{recipientCount}</b></span>
        <span>範本: <b style={{ color: 'var(--text-primary)' }}>{template ? templates.find(t => t.id === template)?.label || '--' : '--'}</b></span>
        <span>訊息: <b style={{ color: message.trim() ? 'var(--text-primary)' : 'var(--text-muted)' }}>{message.trim() ? `${message.length} 字` : '未填寫'}</b></span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {/* Left: Target selection */}
        <div>
          <label style={labelStyle}>推播對象</label>
          <div className="inset" style={{ background: 'var(--bg-inset)', padding: '6px', maxHeight: '320px', overflowY: 'auto' }}>
            {/* Mode selection */}
            {[
              { key: 'all' as const, label: '全公司' },
              { key: 'site' as const, label: '依廠區' },
              { key: 'dept' as const, label: '依部門' },
              { key: 'manual' as const, label: '手動選擇' },
            ].map(mode => (
              <div key={mode.key} style={{ marginBottom: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '9px', fontFamily: 'monospace' }}>
                  <input type="radio" checked={selectedMode === mode.key} onChange={() => setSelectedMode(mode.key)} style={{ width: '10px', height: '10px' }} />
                  <span style={{ fontWeight: selectedMode === mode.key ? 'bold' : 'normal' }}>{mode.label}</span>
                </label>

                {/* Sub-options */}
                {selectedMode === 'site' && mode.key === 'site' && (
                  <div style={{ marginLeft: '18px', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {sites.map(site => (
                      <label key={site} style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '9px', fontFamily: 'monospace' }}>
                        <input type="checkbox" checked={selectedSites.includes(site)} onChange={() => setSelectedSites(toggle(selectedSites, site))} style={{ width: '10px', height: '10px' }} />
                        {site}
                      </label>
                    ))}
                  </div>
                )}
                {selectedMode === 'dept' && mode.key === 'dept' && (
                  <div style={{ marginLeft: '18px', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {depts.map(dept => (
                      <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '9px', fontFamily: 'monospace' }}>
                        <input type="checkbox" checked={selectedDepts.includes(dept)} onChange={() => setSelectedDepts(toggle(selectedDepts, dept))} style={{ width: '10px', height: '10px' }} />
                        {dept}
                      </label>
                    ))}
                  </div>
                )}
                {selectedMode === 'manual' && mode.key === 'manual' && (
                  <div style={{ marginLeft: '18px', marginTop: '3px', maxHeight: '120px', overflowY: 'auto', background: 'var(--bg-input)', padding: '4px', border: '1px solid var(--border-light)' }}>
                    {users.map(user => (
                      <label key={user} style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '9px', fontFamily: 'monospace', marginBottom: '2px' }}>
                        <input type="checkbox" checked={selectedUsers.includes(user)} onChange={() => setSelectedUsers(toggle(selectedUsers, user))} style={{ width: '10px', height: '10px' }} />
                        {user}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Template + Message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>
            <label style={labelStyle}>訊息範本</label>
            <select value={template} onChange={e => handleTemplateChange(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="">-- 請選擇範本 --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>訊息內容</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="請輸入訊息內容..."
              rows={8}
              style={{ ...inputStyle, width: '100%', flex: 1, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button className="btn" style={{ fontSize: '8px', padding: '2px 8px' }}>預覽</button>
            <button className="btn" onClick={handleSend} disabled={sending} style={{ fontSize: '8px', padding: '2px 8px', fontWeight: 'bold' }}>
              {sending ? 'SENDING...' : '立即發送'}
            </button>
            <button className="btn" style={{ fontSize: '8px', padding: '2px 8px' }}>排程發送</button>
          </div>
        </div>
      </div>
    </div>
  )
}
