'use client'

import { useState } from 'react'

// 通用卡片類型
export interface KanbanCard {
  id: string | number
  title: string
  description?: string
  status: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  tags?: { label: string; color: string }[]
  assignee?: string
  dueDate?: string
  metadata?: { label: string; value: string }[]
  createdAt?: string
}

// 欄位定義
export interface KanbanColumn {
  id: string
  title: string
  color?: string
}

interface KanbanBoardProps {
  title?: string
  columns: KanbanColumn[]
  cards: KanbanCard[]
  onCardClick?: (card: KanbanCard) => void
  onAddCard?: (columnId: string) => void
  onMoveCard?: (cardId: string | number, newStatus: string) => void
  showAddButton?: boolean
  compact?: boolean
}

export default function KanbanBoard({
  title,
  columns,
  cards,
  onCardClick,
  onAddCard,
  onMoveCard,
  showAddButton = true,
  compact = false
}: KanbanBoardProps) {
  const [hoveredCardId, setHoveredCardId] = useState<string | number | null>(null)
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const getCardsByColumn = (columnId: string) => {
    return cards.filter(card => card.status === columnId)
  }

  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'urgent': return { bg: '#800000', color: '#FFF', label: '🔴' }
      case 'high': return { bg: '#FF8C00', color: '#FFF', label: '🟠' }
      case 'medium': return { bg: '#FFD700', color: '#000', label: '🟡' }
      case 'low': return { bg: '#808080', color: '#FFF', label: '⚪' }
      default: return { bg: '#C0C0C0', color: '#000', label: '' }
    }
  }

  const handleDragStart = (e: React.DragEvent, card: KanbanCard) => {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedCard && draggedCard.status !== columnId && onMoveCard) {
      onMoveCard(draggedCard.id, columnId)
    }
    setDraggedCard(null)
    setDragOverColumn(null)
  }

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Header */}
      {title && (
        <div className="window" style={{ marginBottom: '8px' }}>
          <div className="titlebar" style={{ padding: '2px 8px', fontSize: '10px' }}>
            {title}
          </div>
          <div style={{ padding: '6px', fontSize: '10px' }}>
            <span>TOTAL: {cards.length}</span>
            {columns.map(col => (
              <span key={col.id} style={{ marginLeft: '12px' }}>
                {col.title}: {getCardsByColumn(col.id).length}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: '8px'
      }}>
        {columns.map(column => (
          <div
            key={column.id}
            className="window"
            style={{ padding: 0 }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div 
              className="titlebar"
              style={{ 
                padding: '4px 8px', 
                fontSize: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: column.color || '#000080'
              }}
            >
              <span>{column.title} ({getCardsByColumn(column.id).length})</span>
              {showAddButton && onAddCard && (
                <button
                  onClick={() => onAddCard(column.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#FFF',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '0 4px'
                  }}
                  title="新增"
                >
                  +
                </button>
              )}
            </div>

            {/* Column Content */}
            <div 
              className="inset"
              style={{ 
                background: dragOverColumn === column.id ? '#E8F4E8' : '#F0F0F0',
                minHeight: compact ? '150px' : '250px',
                maxHeight: compact ? '300px' : '500px',
                overflowY: 'auto',
                padding: '4px',
                transition: 'background 0.2s'
              }}
            >
              {getCardsByColumn(column.id).map(card => {
                const priorityStyle = getPriorityStyle(card.priority)
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card)}
                    onMouseEnter={() => setHoveredCardId(card.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    onClick={() => onCardClick?.(card)}
                    style={{
                      background: hoveredCardId === card.id ? '#FFF8E0' : '#FFF',
                      border: '1px solid #808080',
                      padding: compact ? '4px' : '6px',
                      marginBottom: '4px',
                      cursor: onCardClick ? 'pointer' : 'grab',
                      fontSize: compact ? '9px' : '10px',
                      transition: 'background 0.1s',
                      opacity: draggedCard?.id === card.id ? 0.5 : 1
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      {/* Priority */}
                      {card.priority && (
                        <span title={card.priority}>{priorityStyle.label}</span>
                      )}
                      {/* Tags */}
                      {card.tags?.map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: tag.color,
                            color: '#FFF',
                            padding: '0 4px',
                            fontSize: '8px'
                          }}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>

                    {/* Card Title */}
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                      {card.title}
                    </div>

                    {/* Card Description */}
                    {card.description && !compact && (
                      <div style={{ color: '#666', fontSize: '9px', marginBottom: '4px' }}>
                        {card.description.length > 60 
                          ? card.description.substring(0, 60) + '...' 
                          : card.description
                        }
                      </div>
                    )}

                    {/* Card Footer */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '8px',
                      color: '#808080',
                      marginTop: '4px'
                    }}>
                      {card.assignee && <span>@{card.assignee}</span>}
                      {card.dueDate && <span>📅 {card.dueDate}</span>}
                    </div>
                  </div>
                )
              })}

              {getCardsByColumn(column.id).length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#808080', 
                  padding: '20px',
                  fontSize: '9px'
                }}>
                  (empty)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}









