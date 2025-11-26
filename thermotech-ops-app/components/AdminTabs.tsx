'use client'

interface AdminTabsProps {
  currentTab: string
  onTabChange: (tab: string) => void
}

export default function AdminTabs({ currentTab, onTabChange }: AdminTabsProps) {
  const tabs = [
    { id: 'home', label: '首頁' },
    { id: 'hr', label: '人事' },
    { id: 'operations', label: '廠務' },
    { id: 'sales', label: '業務' },
    { id: 'reports', label: '報表' },
    { id: 'settings', label: '設定' },
  ]

  return (
    <div className="outset p-1 mb-2 flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`btn text-11 ${currentTab === tab.id ? 'inset' : ''}`}
          style={{ padding: '4px 12px' }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}


