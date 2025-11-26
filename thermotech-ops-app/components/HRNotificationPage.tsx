'use client'

import { useState } from 'react'
import Button from '@/components/Button'
import Card from '@/components/Card'

export default function HRNotificationPage() {
  const [selectedMode, setSelectedMode] = useState<'all' | 'site' | 'dept' | 'manual'>('all')
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [template, setTemplate] = useState('')
  const [message, setMessage] = useState('')

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

  const handleToggleSite = (site: string) => {
    setSelectedSites(prev => 
      prev.includes(site) ? prev.filter(s => s !== site) : [...prev, site]
    )
  }

  const handleToggleDept = (dept: string) => {
    setSelectedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    )
  }

  const handleToggleUser = (user: string) => {
    setSelectedUsers(prev => 
      prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]
    )
  }

  const handleSend = () => {
    console.log('Sending notification:', {
      mode: selectedMode,
      sites: selectedSites,
      depts: selectedDepts,
      users: selectedUsers,
      message
    })
    alert('通知已發送！（Demo）')
  }

  return (
    <div className="window">
      <div className="titlebar">人事管理 - Line 通知推播</div>
      
      <div className="p-4 bg-grey-200">
        {/* 選擇對象 */}
        <Card title="選擇對象">
          <div className="mb-2">
            <label className="flex items-center gap-2 mb-1">
              <input
                type="radio"
                checked={selectedMode === 'all'}
                onChange={() => setSelectedMode('all')}
              />
              <span className="text-11 text-bold">全公司</span>
            </label>
          </div>

          <div className="mb-2">
            <label className="flex items-center gap-2 mb-1">
              <input
                type="radio"
                checked={selectedMode === 'site'}
                onChange={() => setSelectedMode('site')}
              />
              <span className="text-11 text-bold">依廠區選擇</span>
            </label>
            {selectedMode === 'site' && (
              <div className="ml-6 flex gap-2">
                {sites.map(site => (
                  <label key={site} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(site)}
                      onChange={() => handleToggleSite(site)}
                    />
                    <span className="text-11">{site}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mb-2">
            <label className="flex items-center gap-2 mb-1">
              <input
                type="radio"
                checked={selectedMode === 'dept'}
                onChange={() => setSelectedMode('dept')}
              />
              <span className="text-11 text-bold">依部門選擇</span>
            </label>
            {selectedMode === 'dept' && (
              <div className="ml-6 flex gap-2">
                {depts.map(dept => (
                  <label key={dept} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedDepts.includes(dept)}
                      onChange={() => handleToggleDept(dept)}
                    />
                    <span className="text-11">{dept}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mb-2">
            <label className="flex items-center gap-2 mb-1">
              <input
                type="radio"
                checked={selectedMode === 'manual'}
                onChange={() => setSelectedMode('manual')}
              />
              <span className="text-11 text-bold">手動選擇</span>
            </label>
            {selectedMode === 'manual' && (
              <div className="ml-6 inset p-2 bg-white" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                {users.map(user => (
                  <label key={user} className="flex items-center gap-1 mb-1">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user)}
                      onChange={() => handleToggleUser(user)}
                    />
                    <span className="text-11">{user}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 訊息範本 */}
        <Card title="訊息範本" className="mt-2">
          <select 
            className="input w-full mb-2"
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="">請選擇範本</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </Card>

        {/* 訊息內容 */}
        <Card title="訊息內容" className="mt-2">
          <textarea
            className="input w-full text-mono"
            rows={6}
            placeholder="請輸入訊息內容..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Card>

        {/* 操作按鈕 */}
        <div className="flex gap-2 mt-4">
          <Button className="flex-1">預覽</Button>
          <Button onClick={handleSend} className="flex-1">立即發送</Button>
          <Button className="flex-1">排程發送</Button>
        </div>
      </div>
    </div>
  )
}


