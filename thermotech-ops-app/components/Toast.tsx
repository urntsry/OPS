'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    
    return () => clearTimeout(timer)
  }, [duration, onClose])
  
  const bgColor = {
    success: '#008000',
    error: '#800000',
    info: '#000080'
  }[type]
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        background: bgColor,
        color: 'white',
        padding: '12px 20px',
        border: '2px solid #000',
        boxShadow: '4px 4px 0 #000',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9999,
        minWidth: '300px',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{message}</span>
        <button
          onClick={onClose}
          style={{
            marginLeft: '12px',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

