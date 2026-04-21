'use client'

import { useWindowManager, TASKBAR_HEIGHT } from '@/lib/useWindowManager'

interface ExternalAppFrameProps {
  windowId: string
  url: string
  title: string
}

export default function ExternalAppFrame({ windowId, url, title }: ExternalAppFrameProps) {
  const { windows, toggleFullscreen, closeWindow, minimizeWindow } = useWindowManager()
  const win = windows[windowId]

  if (!win || !win.isOpen) return null

  // Fullscreen mode: fixed overlay covering entire desktop (above windows, below taskbar)
  if (win.isFullscreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: TASKBAR_HEIGHT,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
      }}>
        {/* Top return bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '2px 6px',
          height: '20px',
          flexShrink: 0,
          backgroundColor: 'var(--bg-window)',
          borderBottom: '1px solid var(--border-mid-dark)',
          fontFamily: 'monospace',
          fontSize: '9px',
        }}>
          <button
            onClick={() => toggleFullscreen(windowId)}
            style={{
              background: 'none',
              border: '1px solid var(--border-mid-dark)',
              color: 'var(--text-primary)',
              fontSize: '9px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              padding: '0 6px',
              outline: 'none',
            }}
          >
            ← DESKTOP
          </button>
          <span style={{ fontWeight: 'bold', flex: 1, color: 'var(--text-primary)' }}>{title}</span>
          <button
            onClick={() => toggleFullscreen(windowId)}
            title="切換為視窗模式"
            style={{
              background: 'none',
              border: '1px solid var(--border-mid-dark)',
              color: 'var(--text-primary)',
              fontSize: '9px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              padding: '0 4px',
              outline: 'none',
            }}
          >
            ❐
          </button>
          <button
            onClick={() => minimizeWindow(windowId)}
            title="最小化"
            style={{
              background: 'none',
              border: '1px solid var(--border-mid-dark)',
              color: 'var(--text-primary)',
              fontSize: '9px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              padding: '0 4px',
              outline: 'none',
            }}
          >
            _
          </button>
          <button
            onClick={() => closeWindow(windowId)}
            title="關閉"
            style={{
              background: 'none',
              border: '1px solid var(--border-mid-dark)',
              color: 'var(--accent-red)',
              fontSize: '9px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              padding: '0 4px',
              outline: 'none',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
        </div>

        {/* iframe */}
        <iframe
          src={url}
          style={{
            flex: 1,
            width: '100%',
            border: 'none',
            backgroundColor: '#FFF',
          }}
          allow="clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
        />
      </div>
    )
  }

  // Window mode: iframe fills the Win95Window content area (rendered by Win95Window parent)
  return (
    <iframe
      src={url}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        backgroundColor: '#FFF',
      }}
      allow="clipboard-read; clipboard-write"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
    />
  )
}
