import React from 'react'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="titlebar mb-4">
          {title}
        </div>
      )}
      <div className="inset p-4 bg-white">
        {children}
      </div>
    </div>
  )
}


