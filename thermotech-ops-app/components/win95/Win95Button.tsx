import React from 'react'

interface Win95ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export default function Win95Button({ 
  children, 
  onClick, 
  disabled = false,
  className = '',
  type = 'button'
}: Win95ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`win95-button ${className}`}
    >
      {children}
    </button>
  )
}


