'use client'

import Button from './Button'
import { useTheme } from '@/lib/useTheme'

interface SidebarProps {
  currentTab: string
  onTabChange: (tab: string) => void
  userProfile: {
    full_name: string
    employee_id: string
    department: string
    role: string
    points_balance: number
  } | null
  onLogout: () => void
}

export default function Sidebar({ currentTab, onTabChange, userProfile, onLogout }: SidebarProps) {
  const { theme, toggleTheme, isDark, mounted } = useTheme()

  const menuItems = [
    { id: 'home', label: 'HOME' },
    { id: 'hr', label: 'HR' },
    { id: 'operations', label: 'OPS' },
    { id: 'sales', label: 'SALES' },
    { id: 'reports', label: 'REPORT' },
    { id: 'settings', label: 'CONFIG' },
  ]

  return (
    <div className="sidebar" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      borderRight: '2px solid var(--border-dark)',
      fontFamily: 'monospace',
      fontSize: '11px',
    }}>
      {/* Logo */}
      <div style={{
        background: 'var(--titlebar-start)',
        color: '#FFF',
        padding: '4px',
        fontWeight: 'bold',
        fontSize: '10px',
        textAlign: 'center',
        borderBottom: '1px solid var(--border-dark)',
        letterSpacing: '0.5px'
      }}>
        THERMOTECH-OPS
        <div style={{ fontSize: '8px', color: '#8899BB', fontWeight: 'normal', marginTop: '1px' }}>v3.0</div>
      </div>

      {/* Theme Toggle */}
      <div style={{ padding: '2px' }}>
        <button
          onClick={toggleTheme}
          style={{
            width: '100%',
            padding: '2px 4px',
            fontSize: '9px',
            fontFamily: 'monospace',
            cursor: 'pointer',
            background: isDark ? '#003355' : 'var(--bg-secondary)',
            color: isDark ? '#44CCFF' : 'var(--text-secondary)',
            border: '1px solid var(--border-mid-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            lineHeight: 1
          }}
          title={isDark ? '切換到日間模式' : '切換到夜間模式'}
        >
          {mounted ? (isDark ? '☀ LIGHT' : '☾ DARK') : '...'}
        </button>
      </div>

      {/* User */}
      <div className="inset" style={{ 
        margin: '2px',
        padding: '3px'
      }}>
        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userProfile?.full_name || '---'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '1px' }}>
          {userProfile?.employee_id || '---'} | {userProfile?.department || '---'}
        </div>
        {/* 可點擊的積分區塊 */}
        <div 
          onClick={() => onTabChange('points')}
          style={{ 
            marginTop: '2px',
            padding: '1px 3px',
            background: currentTab === 'points' ? 'var(--accent-teal)' : 'var(--titlebar-start)',
            color: '#00DD00',
            fontSize: '9px',
            cursor: 'pointer',
            border: '1px solid var(--border-dark)',
            transition: 'background 0.1s',
            fontFamily: 'monospace'
          }}
          title="點擊查看積分詳情"
        >
          PT: {userProfile?.points_balance || 0}
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: '1px', background: 'var(--border-mid-dark)', margin: '0 2px' }} />

      {/* Menu */}
      <div style={{ 
        flex: 1, 
        padding: '2px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1px'
      }}>
        {menuItems.map((item) => {
          const isActive = currentTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'left',
                lineHeight: '1.2',
                outline: 'none',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                backgroundColor: isActive ? 'var(--active-bg)' : 'var(--bg-window)',
                color: isActive ? 'var(--active-text)' : 'var(--text-primary)',
                borderTop: isActive ? '1px solid var(--border-dark)' : '1px solid var(--border-light)',
                borderLeft: isActive ? '1px solid var(--border-dark)' : '1px solid var(--border-light)',
                borderRight: isActive ? '1px solid var(--border-light)' : '1px solid var(--border-dark)',
                borderBottom: isActive ? '1px solid var(--border-light)' : '1px solid var(--border-dark)',
              }}
            >
              {isActive ? '▶' : ' '} {item.label}
            </button>
          )
        })}
      </div>

      {/* Separator */}
      <div style={{ height: '1px', background: 'var(--border-mid-dark)', margin: '0 2px' }} />

      {/* Logout */}
      <div style={{ padding: '2px' }}>
        <Button 
          onClick={onLogout}
          style={{ 
            width: '100%', 
            fontSize: '9px',
            padding: '2px',
            fontFamily: 'monospace'
          }}
        >
          LOGOUT
        </Button>
      </div>

      {/* Footer */}
      <div style={{
        padding: '1px 4px',
        fontSize: '8px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        background: 'var(--bg-window)'
      }}>
        (C)2025
      </div>
    </div>
  )
}









