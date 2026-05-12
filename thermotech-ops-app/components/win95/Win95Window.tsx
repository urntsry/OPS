'use client'

import React, { useRef, useState } from 'react'
import { useWindowManager, TASKBAR_HEIGHT } from '@/lib/useWindowManager'

interface Win95WindowProps {
  windowId: string
  children: React.ReactNode
}

export default function Win95Window({ windowId, children }: Win95WindowProps) {
  const {
    windows, activeWindowId,
    focusWindow, closeWindow, minimizeWindow,
    toggleMaximize, moveWindow, resizeWindow,
  } = useWindowManager()

  const win = windows[windowId]
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number; origX: number; origY: number; edge: string } | null>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  if (!win || !win.isOpen || win.isMinimized) return null

  const isActive = activeWindowId === windowId
  const isMax = win.isMaximized

  const style: React.CSSProperties = isMax
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: TASKBAR_HEIGHT,
        width: 'auto',
        height: 'auto',
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }

  const titlebarBg = isActive
    ? 'linear-gradient(90deg, var(--titlebar-start) 0%, var(--titlebar-end) 100%)'
    : 'linear-gradient(90deg, var(--titlebar-inactive-start) 0%, var(--titlebar-inactive-end) 100%)'

  const handleMouseDownTitlebar = (e: React.MouseEvent) => {
    if (isMax) return
    e.preventDefault()
    focusWindow(windowId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
    }
    setIsDragging(true)

    let rafId = 0
    let lastX = win.x
    let lastY = win.y

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      lastX = dragRef.current.origX + dx
      lastY = Math.max(0, dragRef.current.origY + dy)

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (windowRef.current) {
            windowRef.current.style.left = `${lastX}px`
            windowRef.current.style.top = `${lastY}px`
          }
          rafId = 0
        })
      }
    }

    const onMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId)
      dragRef.current = null
      setIsDragging(false)
      moveWindow(windowId, lastX, lastY)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const handleResizeStart = (e: React.MouseEvent, edge: string) => {
    if (isMax) return
    e.preventDefault()
    e.stopPropagation()
    focusWindow(windowId)
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: win.width,
      origH: win.height,
      origX: win.x,
      origY: win.y,
      edge,
    }
    setIsDragging(true)

    let rafId = 0
    let finalW = win.width
    let finalH = win.height
    let finalX = win.x
    let finalY = win.y

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const r = resizeRef.current
      const dx = ev.clientX - r.startX
      const dy = ev.clientY - r.startY

      let newW = r.origW
      let newH = r.origH
      let newX = r.origX
      let newY = r.origY

      if (r.edge.includes('e')) newW = r.origW + dx
      if (r.edge.includes('s')) newH = r.origH + dy
      if (r.edge.includes('w')) { newW = r.origW - dx; newX = r.origX + dx }
      if (r.edge.includes('n')) { newH = r.origH - dy; newY = r.origY + dy }

      if (newW >= 280 && newH >= 200) {
        finalW = newW; finalH = newH; finalX = newX; finalY = newY
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            if (windowRef.current) {
              windowRef.current.style.width = `${finalW}px`
              windowRef.current.style.height = `${finalH}px`
              if (r.edge.includes('w') || r.edge.includes('n')) {
                windowRef.current.style.left = `${finalX}px`
                windowRef.current.style.top = `${finalY}px`
              }
            }
            rafId = 0
          })
        }
      }
    }

    const onMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId)
      resizeRef.current = null
      setIsDragging(false)
      resizeWindow(windowId, finalW, finalH)
      if (edge.includes('w') || edge.includes('n')) {
        moveWindow(windowId, finalX, finalY)
      }
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const edgeSize = 4

  const resizeEdges = isMax ? null : (
    <>
      {/* Top */}
      <div style={{ position: 'absolute', top: -edgeSize, left: edgeSize, right: edgeSize, height: edgeSize, cursor: 'n-resize' }}
        onMouseDown={e => handleResizeStart(e, 'n')} />
      {/* Bottom */}
      <div style={{ position: 'absolute', bottom: -edgeSize, left: edgeSize, right: edgeSize, height: edgeSize, cursor: 's-resize' }}
        onMouseDown={e => handleResizeStart(e, 's')} />
      {/* Left */}
      <div style={{ position: 'absolute', top: edgeSize, bottom: edgeSize, left: -edgeSize, width: edgeSize, cursor: 'w-resize' }}
        onMouseDown={e => handleResizeStart(e, 'w')} />
      {/* Right */}
      <div style={{ position: 'absolute', top: edgeSize, bottom: edgeSize, right: -edgeSize, width: edgeSize, cursor: 'e-resize' }}
        onMouseDown={e => handleResizeStart(e, 'e')} />
      {/* Corners */}
      <div style={{ position: 'absolute', top: -edgeSize, left: -edgeSize, width: edgeSize * 2, height: edgeSize * 2, cursor: 'nw-resize' }}
        onMouseDown={e => handleResizeStart(e, 'nw')} />
      <div style={{ position: 'absolute', top: -edgeSize, right: -edgeSize, width: edgeSize * 2, height: edgeSize * 2, cursor: 'ne-resize' }}
        onMouseDown={e => handleResizeStart(e, 'ne')} />
      <div style={{ position: 'absolute', bottom: -edgeSize, left: -edgeSize, width: edgeSize * 2, height: edgeSize * 2, cursor: 'sw-resize' }}
        onMouseDown={e => handleResizeStart(e, 'sw')} />
      <div style={{ position: 'absolute', bottom: -edgeSize, right: -edgeSize, width: edgeSize * 2, height: edgeSize * 2, cursor: 'se-resize' }}
        onMouseDown={e => handleResizeStart(e, 'se')} />
    </>
  )

  const ctrlBtnStyle: React.CSSProperties = {
    width: '16px',
    height: '14px',
    fontSize: '9px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    backgroundColor: 'var(--bg-window)',
    color: 'var(--text-primary)',
    borderTop: '1px solid var(--border-light)',
    borderLeft: '1px solid var(--border-light)',
    borderRight: '1px solid var(--border-dark)',
    borderBottom: '1px solid var(--border-dark)',
    lineHeight: 1,
    outline: 'none',
  }

  return (
    <div
      ref={windowRef}
      className="window"
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
      onMouseDown={() => { if (!isActive) focusWindow(windowId) }}
    >
      {resizeEdges}

      {/* Title Bar */}
      <div
        style={{
          background: titlebarBg,
          color: '#FFF',
          padding: '2px 3px',
          fontSize: '10px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isMax ? 'default' : 'move',
          flexShrink: 0,
          gap: '4px',
          letterSpacing: '0.3px',
        }}
        onMouseDown={handleMouseDownTitlebar}
        onDoubleClick={() => toggleMaximize(windowId)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {win.title}
        </span>
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <button style={ctrlBtnStyle} onClick={(e) => { e.stopPropagation(); minimizeWindow(windowId) }} title="最小化">_</button>
          <button style={ctrlBtnStyle} onClick={(e) => { e.stopPropagation(); toggleMaximize(windowId) }} title={isMax ? '還原' : '最大化'}>{isMax ? '❐' : '□'}</button>
          <button style={{...ctrlBtnStyle, color: 'var(--accent-red)'}} onClick={(e) => { e.stopPropagation(); closeWindow(windowId) }} title="關閉">×</button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: 'var(--bg-window)',
        userSelect: isDragging ? 'none' : 'text',
        pointerEvents: isDragging ? 'none' : 'auto',
      }}>
        {children}
      </div>

      {/* Bottom resize grip indicator (visual only, actual resize handled by edge divs) */}
      {!isMax && (
        <div style={{
          position: 'absolute',
          bottom: 1,
          right: 1,
          width: '12px',
          height: '12px',
          cursor: 'se-resize',
          opacity: 0.4,
          fontSize: '10px',
          lineHeight: '10px',
          textAlign: 'right',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}>
          ◢
        </div>
      )}
    </div>
  )
}
