'use client'

import { useState } from 'react'

export interface DepartmentTab {
  id: string
  label: string
  show: boolean
  badge?: number
  component: React.ReactNode
}

interface DepartmentShellProps {
  departmentId: string
  departmentName: string
  tabs: DepartmentTab[]
  defaultTab?: string
  statusInfo?: string
}

export default function DepartmentShell({ departmentId, departmentName, tabs, defaultTab, statusInfo }: DepartmentShellProps) {
  const visibleTabs = tabs.filter(t => t.show)
  const [activeTab, setActiveTab] = useState(defaultTab || visibleTabs[0]?.id || '')

  const activeContent = tabs.find(t => t.id === activeTab)?.component

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '1px',
        padding: '2px 4px 0',
        background: 'var(--bg-window)',
        borderBottom: '1px solid var(--border-mid-dark)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '3px 10px',
                fontSize: '9px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: isActive ? 'var(--active-bg)' : 'var(--bg-window)',
                color: isActive ? 'var(--active-text)' : 'var(--text-primary)',
                borderTop: '1px solid var(--border-light)',
                borderLeft: '1px solid var(--border-light)',
                borderRight: '1px solid var(--border-dark)',
                borderBottom: isActive ? '1px solid var(--active-bg)' : '1px solid var(--border-dark)',
                marginBottom: isActive ? '-1px' : '0',
                position: 'relative',
                zIndex: isActive ? 1 : 0,
              }}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  backgroundColor: 'var(--status-warning)',
                  color: '#FFF',
                  fontSize: '7px',
                  fontWeight: 'bold',
                  padding: '0 3px',
                  borderRadius: '2px',
                  lineHeight: '1.3',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px', background: 'var(--bg-window)' }}>
        {activeContent}
      </div>

      {/* Status Bar */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '2px 6px',
        fontSize: '8px',
        fontFamily: 'monospace',
        background: 'var(--bg-window)',
        borderTop: '1px solid var(--border-mid-dark)',
        color: 'var(--text-muted)',
      }}>
        <span style={{ fontWeight: 'bold' }}>{departmentName}</span>
        <span style={{ color: 'var(--border-mid-dark)' }}>|</span>
        <span>{statusInfo || 'READY'}</span>
        <span style={{ marginLeft: 'auto' }}>{departmentId.toUpperCase()}</span>
      </div>
    </div>
  )
}
