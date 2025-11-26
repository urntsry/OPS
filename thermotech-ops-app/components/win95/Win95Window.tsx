'use client'

import React, { useState } from 'react'
import { X, Minus, Square } from 'lucide-react'

interface Win95WindowProps {
  title: string
  children: React.ReactNode
  onClose?: () => void
  width?: number
  height?: number
  className?: string
}

export default function Win95Window({ 
  title, 
  children, 
  onClose,
  width = 400,
  height = 300,
  className = ''
}: Win95WindowProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  if (isMinimized) {
    return (
      <div className="win95-button cursor-pointer p-2" onClick={() => setIsMinimized(false)}>
        {title}
      </div>
    )
  }

  return (
    <div 
      className={`win95-window ${className}`}
      style={{ width, height }}
    >
      {/* Title Bar */}
      <div className="win95-titlebar">
        <span>{title}</span>
        <div className="flex gap-0.5">
          {/* Minimize */}
          <button 
            className="win95-control-btn"
            onClick={() => setIsMinimized(true)}
          >
            <Minus size={8} />
          </button>
          {/* Maximize (Placeholder) */}
          <button className="win95-control-btn">
            <Square size={8} />
          </button>
          {/* Close */}
          <button 
            className="win95-control-btn"
            onClick={onClose}
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white p-2 overflow-auto">
        {children}
      </div>
    </div>
  )
}


