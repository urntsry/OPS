'use client'

import { useEffect, useRef } from 'react'
import { WINDOW_CONFIGS } from '@/lib/useWindowManager'

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

  // Build menu sections from WINDOW_CONFIGS (filter out hidden)
  const internalApps = WINDOW_CONFIGS.filter(c =>
    c.type === 'internal' && !c.hidden && !['points', 'devtracker'].includes(c.id)
  )
  const externalApps = WINDOW_CONFIGS.filter(c => c.type === 'external' && !c.hidden)
  const utilItems = [
    ...WINDOW_CONFIGS.filter(c => c.id === 'points' && !c.hidden),
    ...(isAdmin ? WINDOW_CONFIGS.filter(c => c.id === 'devtracker' && !c.hidden) : []),
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

  const renderItem = (item: { id: string; title: string; type?: string }) => (
    <button
      key={item.id}
      className="startmenu-item"
      onClick={() => onOpenWindow(item.id)}
      style={itemStyle}
    >
      <span style={{ fontSize: '11px' }}>{item.type === 'external' ? '◆' : '■'}</span>
      {item.title}
    </button>
  )

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: 28,
        left: 0,
        zIndex: 10000,
        minWidth: '210px',
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
          THERMOTECH-OPS v3.0
        </span>
      </div>

      {/* Menu Items */}
      <div style={{ flex: 1, padding: '2px 0' }}>
        {/* Internal Apps */}
        {internalApps.map(renderItem)}

        {/* External Apps section */}
        {externalApps.length > 0 && (
          <>
            <div style={{ height: '1px', background: 'var(--border-mid-dark)', margin: '3px 4px' }} />
            <div style={{ padding: '1px 8px', fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>APPS</div>
            {externalApps.map(renderItem)}
          </>
        )}

        {/* Separator */}
        <div style={{ height: '1px', background: 'var(--border-mid-dark)', margin: '3px 4px' }} />

        {/* Utility items */}
        {utilItems.map(renderItem)}

        {/* Separator */}
        <div style={{ height: '1px', background: 'var(--border-mid-dark)', margin: '3px 4px' }} />

        {/* User Info */}
        <div style={{ padding: '3px 8px', fontSize: '9px', color: 'var(--text-muted)' }}>
          USER: {userProfile?.full_name || '---'} | {userProfile?.department || '---'}
        </div>

        {/* Logout */}
        <button
          className="startmenu-item"
          onClick={onLogout}
          style={itemStyle}
        >
          <span style={{ fontSize: '11px' }}>⏻</span>
          LOGOUT
        </button>
      </div>
    </div>
  )
}
