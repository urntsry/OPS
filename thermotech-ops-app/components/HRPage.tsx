'use client'

import { useState } from 'react'
import AnnouncementManagementPage from './AnnouncementManagementPage'
import AnnouncementReviewPage from './AnnouncementReviewPage'
import HRNotificationPage from './HRNotificationPage'

type HRTabType = 'bulletin' | 'review' | 'notification'

interface HRPageProps {
  isAdmin?: boolean
}

export default function HRPage({ isAdmin = false }: HRPageProps) {
  const [activeTab, setActiveTab] = useState<HRTabType>('bulletin')

  // 如果是 Admin，預設顯示 review 分頁
  // useState 只在初始化時設定，所以用 useEffect 或直接在 tabs 中處理

  const tabs = [
    { id: 'bulletin' as const, label: 'BULLETIN', show: true },
    { id: 'review' as const, label: 'REVIEW', show: isAdmin, badge: 3 }, // badge 顯示待審核數量
    { id: 'notification' as const, label: 'LINE PUSH', show: true },
  ].filter(tab => tab.show)

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1px', marginBottom: '4px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '2px 8px',
              fontSize: '10px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              background: activeTab === tab.id ? '#000080' : '#C0C0C0',
              color: activeTab === tab.id ? '#FFF' : '#000',
              border: '1px solid #808080',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span style={{
                background: '#FF8C00',
                color: '#FFF',
                padding: '0 4px',
                fontSize: '8px',
                borderRadius: '2px',
                fontWeight: 'bold'
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'bulletin' && <AnnouncementManagementPage isAdmin={isAdmin} />}
        {activeTab === 'review' && isAdmin && <AnnouncementReviewPage />}
        {activeTab === 'notification' && <HRNotificationPage />}
      </div>
    </div>
  )
}









