'use client'

import Button from './Button'

interface EventListProps {
  title: string
  events: Array<{
    id: number
    title: string
    date?: string
    done?: boolean
  }>
  onToggle?: (id: number) => void
  onAdd?: () => void
  onItemClick?: (id: number) => void
  onDelete?: (id: number) => void // 測試用刪除按鈕
  showAddButton?: boolean
  showDeleteButton?: boolean // 測試用
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
  // 詳細日誌
  console.log(`[EventList] 渲染組件:`, {
    title,
    eventsCount: events.length,
    showAddButton,
    showDeleteButton,
    hasOnToggle: !!onToggle,
    hasOnAdd: !!onAdd,
    hasOnItemClick: !!onItemClick,
    hasOnDelete: !!onDelete
  })

  return (
    <div className="outset" style={{ padding: '2px' }}>
      <div 
        style={{ 
          minHeight: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #000080 0%, #1084D0 100%)',
          color: 'white',
          padding: '2px 4px',
          marginBottom: '2px'
        }}
      >
        <div className="text-bold">{title}</div>
        {showAddButton && onAdd && (
          <button 
            onClick={() => {
              console.log(`[EventList] 點擊新增按鈕 - ${title}`)
              onAdd()
            }}
            style={{ 
              fontSize: '11px', 
              width: '20px', 
              height: '18px', 
              padding: '0',
              margin: '0',
              border: 'none', 
              background: 'none', 
              color: 'white', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            +
          </button>
        )}
      </div>

      <div className="inset bg-white" style={{ minHeight: '180px', maxHeight: '240px', overflowY: 'auto', padding: '0' }}>
        {events.length === 0 ? (
          <div className="text-mono text-grey-600 text-center p-4">無資料</div>
        ) : (
          <table className="w-full text-11" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {events.map((event) => (
                <tr 
                  key={event.id} 
                  className="border-b border-grey-300 hover:bg-grey-100"
                  onClick={() => onItemClick && onItemClick(event.id)}
                  style={{ cursor: onItemClick ? 'pointer' : 'default' }}
                >
                  {/* 只在有 onToggle 時顯示勾選框欄位 */}
                  {onToggle && (
                    <td style={{ width: '28px', padding: '2px 0 2px 4px', whiteSpace: 'nowrap' }}>
                      <span 
                        onClick={(e) => {
                          console.log(`[EventList] 點擊勾選框:`, { 
                            title, 
                            eventId: event.id, 
                            eventTitle: event.title,
                            currentDone: event.done 
                          })
                          e.stopPropagation()
                          if (onToggle) {
                            onToggle(event.id)
                          }
                        }}
                        style={{ 
                          fontFamily: 'Courier New, monospace',
                          cursor: 'pointer',
                          userSelect: 'none',
                          display: 'inline-block'
                        }}
                      >
                        {event.done ? '[V]' : '[ ]'}
                      </span>
                    </td>
                  )}
                  {/* 標題欄 */}
                  <td style={{ padding: onToggle ? '2px 4px' : '2px 4px 2px 4px' }}>
                    <span className={event.done ? 'line-through text-grey-600' : ''}>
                      {event.title}
                    </span>
                  </td>
                  {/* 日期欄 */}
                  {event.date && (
                    <td className="text-mono text-right text-grey-600" style={{ width: '60px', padding: '2px 4px 2px 0', fontSize: '10px' }}>
                      {event.date}
                    </td>
                  )}
                  {/* 刪除按鈕欄（測試用） */}
                  {showDeleteButton && onDelete && (
                    <td style={{ width: '24px', padding: '2px 4px 2px 0', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          console.log(`[EventList] 點擊刪除:`, { 
                            title, 
                            eventId: event.id, 
                            eventTitle: event.title 
                          })
                          e.stopPropagation()
                          if (confirm(`確定要刪除「${event.title}」嗎？`)) {
                            onDelete(event.id)
                          }
                        }}
                        style={{ 
                          fontSize: '11px',
                          width: '18px',
                          height: '18px',
                          padding: '0',
                          margin: '0',
                          border: '1px solid #808080',
                          background: '#C0C0C0',
                          color: '#000',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        X
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

