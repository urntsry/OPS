'use client'

interface MobileNavProps {
  currentTab: string
  onTabChange: (tab: string) => void
}

export default function MobileNav({ currentTab, onTabChange }: MobileNavProps) {
  const menuItems = [
    { id: 'home', label: 'HOME' },
    { id: 'hr', label: 'HR' },
    { id: 'operations', label: 'OPS' },
    { id: 'settings', label: 'CFG' },
  ]

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40px',
      background: '#C0C0C0',
      borderTop: '2px solid #FFF',
      display: 'flex',
      zIndex: 1000,
      fontFamily: 'monospace'
    }}>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentTab === item.id ? '#000080' : '#C0C0C0',
            color: currentTab === item.id ? '#FFF' : '#000',
            border: 'none',
            borderRight: '1px solid #808080',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: 'pointer',
            padding: '2px'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}










