'use client'

import Button from './Button'

interface EventListProps {
  title: string
  events: Array<{
    id: number | string
    title: string
    date?: string
    done?: boolean
  }>
  onToggle?: (id: number | string) => void
  onAdd?: () => void
  onItemClick?: (id: number | string) => void
  onDelete?: (id: number | string) => void
  showAddButton?: boolean
  showDeleteButton?: boolean
}

export default function EventList({ 
  title, 
  events, 
  onToggle, 
  onAdd, 
  onItemClick, 
  onDelete,
  showAddButton = true,
  showDeleteButton = false 
}: EventListProps) {
  return (
    <div className="window" style={{ padding: 0 }}>
      <div 
        className="titlebar"
        style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2px 6px',
          height: '18px',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.3px' }}>{title}</div>
        {showAddButton && onAdd ? (
          <button 
            onClick={() => onAdd()}
            style={{ 
              fontSize: '12px', 
              width: '16px', 
              height: '14px', 
              padding: '0',
              margin: '0',
              border: 'none', 
              background: 'none', 
              color: 'white', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              flexShrink: 0,
              lineHeight: 1
            }}
          >
            +
          </button>
        ) : (
          <div style={{ width: '16px', height: '14px', flexShrink: 0 }} />
        )}
      </div>

      <div className="inset" style={{ minHeight: '160px', maxHeight: '220px', overflow: 'hidden auto', padding: '1px', background: 'var(--bg-inset)' }}>
        {events.length === 0 ? (
          <div style={{ padding: '8px', textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            - EMPTY -
          </div>
        ) : (
          <table className="eventlist-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <tbody>
              {events.map((event) => (
                <tr 
                  key={event.id}
                  className="eventlist-row"
                  onClick={() => onItemClick && onItemClick(event.id)}
                  style={{ 
                    cursor: onItemClick ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--table-border)',
                  }}
                >
                  {onToggle && (
                    <td style={{ width: '24px', padding: '1px 0 1px 3px', whiteSpace: 'nowrap' }}>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onToggle) onToggle(event.id)
                        }}
                        style={{ 
                          fontFamily: 'Courier New, monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          display: 'inline-block',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {event.done ? '[V]' : '[ ]'}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: '1px 4px', color: event.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: event.done ? 'line-through' : 'none' }}>
                    {event.title}
                  </td>
                  {event.date && (
                    <td style={{ width: '44px', padding: '1px 3px 1px 0', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {event.date}
                    </td>
                  )}
                  {showDeleteButton && onDelete && (
                    <td style={{ width: '20px', padding: '1px 3px 1px 0', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`確定要刪除「${event.title}」嗎？`)) {
                            onDelete(event.id)
                          }
                        }}
                        style={{ 
                          fontSize: '9px',
                          width: '16px',
                          height: '14px',
                          padding: '0',
                          margin: '0',
                          border: '1px solid var(--border-mid-dark)',
                          background: 'var(--bg-window)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

