'use client'

import { useEffect, useRef } from 'react'

interface StartMenuProps {
  userProfile: {
    full_name: string
    employee_id: string
    department: string
    role: string
    points_balance: number
  } | null
  isAdmin: boolean
  onClose: () => void
  onLogout: () => void
  onOpenWindow: (id: string) => void
}

export default function StartMenu({ userProfile, isAdmin, onClose, onLogout, onOpenWindow }: StartMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const startBtn = (e.target as HTMLElement)?.closest?.('[data-start-btn]')
        if (!startBtn) onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const mainItems = [
    { id: 'hr', label: 'HR - Personnel' },
    { id: 'meeting', label: 'MEETING - 會議紀錄' },
    { id: 'operations', label: 'OPS - Factory' },
    { id: 'sales', label: 'SALES - Business' },
    { id: 'reports', label: 'REPORT - Analytics' },
    { id: 'settings', label: 'CONFIG - Settings' },
  ]

  const extraItems = [
    { id: 'points', label: 'POINTS - 積分中心' },
    ...(isAdmin ? [{ id: 'devtracker', label: 'DEV TRACKER' }] : []),
  ]

  const itemStyle: React.CSSProperties = {
    padding: '4px 12px 4px 8px',
    cursor: 'pointer',
    fontSize: '10px',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    outline: 'none',
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: 28,
        left: 0,
        zIndex: 10000,
        minWidth: '200px',
        display: 'flex',
        fontFamily: 'monospace',
        backgroundColor: 'var(--bg-window)',
        borderTop: '2px solid var(--border-light)',
        borderLeft: '2px solid var(--border-light)',
        borderRight: '2px solid var(--border-dark)',
        borderBottom: '2px solid var(--border-dark)',
        boxShadow: '2px 0px 4px rgba(0,0,0,0.3)',
      }}
    >
      {/* Left Blue Banner */}
      <div style={{
        width: '22px',
        background: 'linear-gradient(180deg, var(--titlebar-start) 0%, var(--accent-teal) 100%)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: '6px',
        flexShrink: 0,
      }}>
        <span style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          color: '#FFF',
          fontSize: '10px',
          fontWeight: 'bold',
          letterSpacing: '1px',
        }}>
          THERMOTECH-OPS
        </span>
      </div>

      {/* Menu Items */}
      <div style={{ flex: 1, padding: '2px 0' }}>
        {/* Main apps */}
        {mainItems.map(item => (
          <button
            key={item.id}
            onClick={() => onOpenWindow(item.id)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--active-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--active-text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            style={itemStyle}
          >
            <span style={{ fontSize: '11px' }}>■</span>
            {item.label}
          </button>
        ))}

        {/* Separator */}
        <div style={{ height: '1px', background: 'var(--border-mid-dark)', margin: '3px 4px' }} />

        {/* Extra items */}
        {extraItems.map(item => (
          <button
            key={item.id}
            onClick={() => onOpenWindow(item.id)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--active-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--active-text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            style={itemStyle}
          >
            <span style={{ fontSize: '11px' }}>■</span>
            {item.label}
          </button>
        ))}

        {/* Separator */}
        <div style={{ height: '1px', background: 'var(--border-mid-dark)', margin: '3px 4px' }} />

        {/* User Info */}
        <div style={{ padding: '3px 8px', fontSize: '9px', color: 'var(--text-muted)' }}>
          USER: {userProfile?.full_name || '---'} | {userProfile?.department || '---'}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--active-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--active-text)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          style={itemStyle}
        >
          <span style={{ fontSize: '11px' }}>⏻</span>
          LOGOUT
        </button>
      </div>
    </div>
  )
}
