'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWindowManager, TASKBAR_HEIGHT } from '@/lib/useWindowManager'
import { useTheme } from '@/lib/useTheme'
import { subscribeFaxUpdates, getFaxes } from '@/lib/faxApi'
import StartMenu from './StartMenu'

interface TaskbarProps {
  userProfile: {
    full_name: string
    employee_id: string
    department: string
    role: string
    points_balance: number
  } | null
  onLogout: () => void
  onOpenPoints: () => void
  isAdmin: boolean
}

export default function Taskbar({ userProfile, onLogout, onOpenPoints, isAdmin }: TaskbarProps) {
  const { windows, activeWindowId, toggleMinimizeRestore, openWindow } = useWindowManager()
  const { toggleTheme, isDark, mounted } = useTheme()
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const [clock, setClock] = useState('')
  const [faxPending, setFaxPending] = useState(0)
  const [faxFlash, setFaxFlash] = useState(false)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkFaxes = useCallback(async () => {
    try {
      const faxes = await getFaxes(50)
      const pending = faxes.filter(f => f.status === 'pending' || f.status === 'analyzing').length
      if (pending > faxPending && faxPending >= 0) {
        setFaxFlash(true)
        setTimeout(() => setFaxFlash(false), 5000)
      }
      setFaxPending(pending)
    } catch { /* ignore */ }
  }, [faxPending])

  useEffect(() => {
    checkFaxes()
    const unsub = subscribeFaxUpdates(() => checkFaxes())
    return unsub
  }, [checkFaxes])

  const openWindows = Object.values(windows).filter(w => w.isOpen)

  return (
    <>
      {/* Start Menu */}
      {startMenuOpen && (
        <StartMenu
          userProfile={userProfile}
          isAdmin={isAdmin}
          onClose={() => setStartMenuOpen(false)}
          onLogout={onLogout}
          onOpenWindow={(id) => {
            if (id === 'points') {
              onOpenPoints()
            } else {
              openWindow(id)
            }
            setStartMenuOpen(false)
          }}
        />
      )}

      {/* Taskbar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: TASKBAR_HEIGHT,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '2px 3px',
        fontFamily: 'monospace',
        fontSize: '10px',
        backgroundColor: 'var(--bg-window)',
        borderTop: '2px solid var(--border-light)',
        boxShadow: 'inset 0 1px 0 var(--border-mid-light)',
      }}>
        {/* Start Button — Thermotech Logo */}
        <button
          onClick={() => setStartMenuOpen(!startMenuOpen)}
          data-start-btn
          style={{
            padding: startMenuOpen ? '2px 4px 0px 4px' : '1px 4px 1px 4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            height: TASKBAR_HEIGHT - 4,
            outline: 'none',
            backgroundColor: startMenuOpen ? 'var(--bg-inset)' : 'var(--bg-window)',
            borderTop: startMenuOpen ? '2px solid var(--border-dark)' : '2px solid var(--border-light)',
            borderLeft: startMenuOpen ? '2px solid var(--border-dark)' : '2px solid var(--border-light)',
            borderRight: startMenuOpen ? '2px solid var(--border-light)' : '2px solid var(--border-dark)',
            borderBottom: startMenuOpen ? '2px solid var(--border-light)' : '2px solid var(--border-dark)',
            boxShadow: startMenuOpen
              ? 'inset 1px 1px 0 var(--border-mid-dark)'
              : 'inset -1px -1px 0 var(--border-mid-dark), inset 1px 1px 0 var(--border-mid-light)',
            flexShrink: 0,
          }}
        >
          <img
            src="/images/thermotech-logo.png"
            alt="Thermotech"
            style={{
              height: TASKBAR_HEIGHT - 10,
              width: 'auto',
              imageRendering: 'auto',
              display: 'block',
            }}
            draggable={false}
          />
        </button>

        {/* Separator */}
        <div style={{ width: '1px', height: TASKBAR_HEIGHT - 8, backgroundColor: 'var(--border-mid-dark)', marginLeft: '2px', marginRight: '2px', flexShrink: 0 }} />

        {/* Open Window Buttons */}
        <div style={{ flex: 1, display: 'flex', gap: '2px', overflow: 'hidden' }}>
          {openWindows.map(win => {
            const isActive = activeWindowId === win.id
            return (
              <button
                key={win.id}
                onClick={() => toggleMinimizeRestore(win.id)}
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  height: TASKBAR_HEIGHT - 6,
                  backgroundColor: isActive ? 'var(--bg-inset)' : 'var(--bg-window)',
                  color: 'var(--text-primary)',
                  borderTop: isActive ? '1px solid var(--border-dark)' : '1px solid var(--border-light)',
                  borderLeft: isActive ? '1px solid var(--border-dark)' : '1px solid var(--border-light)',
                  borderRight: isActive ? '1px solid var(--border-light)' : '1px solid var(--border-dark)',
                  borderBottom: isActive ? '1px solid var(--border-light)' : '1px solid var(--border-dark)',
                  flexShrink: 0,
                }}
              >
                {win.title}
              </button>
            )
          })}
        </div>

        {/* System Tray */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '1px 4px',
          height: TASKBAR_HEIGHT - 6,
          flexShrink: 0,
          borderTop: '1px solid var(--border-mid-dark)',
          borderLeft: '1px solid var(--border-mid-dark)',
          borderRight: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)',
          fontSize: '9px',
          fontFamily: 'monospace',
        }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              color: 'var(--text-primary)',
              padding: '0 2px',
              outline: 'none',
            }}
            title={isDark ? '日間模式' : '夜間模式'}
          >
            {mounted ? (isDark ? '☀' : '☾') : ''}
          </button>

          {/* Fax indicator */}
          {faxPending > 0 && (
            <span
              onClick={() => openWindow('fax')}
              style={{
                cursor: 'pointer',
                color: '#FFF',
                backgroundColor: faxFlash ? 'var(--accent-red)' : '#FF8C00',
                padding: '0 3px',
                fontSize: '8px',
                fontWeight: 'bold',
                animation: faxFlash ? 'fax-flash 0.5s ease-in-out infinite' : undefined,
              }}
              title={`${faxPending} fax(es) pending`}
            >
              FAX:{faxPending}
            </span>
          )}

          {/* Points */}
          <span
            onClick={onOpenPoints}
            style={{ cursor: 'pointer', color: 'var(--status-success)' }}
            title="積分"
          >
            PT:{userProfile?.points_balance || 0}
          </span>

          {/* Clock */}
          <span style={{ color: 'var(--text-primary)', minWidth: '36px', textAlign: 'center' }}>
            {clock}
          </span>
        </div>
      </div>
    </>
  )
}
