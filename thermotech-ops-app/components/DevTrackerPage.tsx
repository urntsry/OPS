'use client'

import { useState } from 'react'
import KanbanBoard, { KanbanCard, KanbanColumn } from './KanbanBoard'
import Button from './Button'

// 欄位定義
const columns: KanbanColumn[] = [
  { id: 'backlog', title: 'BACKLOG', color: '#808080' },
  { id: 'todo', title: 'TODO', color: '#000080' },
  { id: 'in_progress', title: 'IN PROGRESS', color: '#FF8C00' },
  { id: 'done', title: 'DONE', color: '#008000' }
]

// 初始任務資料
const initialTasks: KanbanCard[] = [
  // DONE
  {
    id: 1,
    title: '任務分類管理頁面',
    description: 'CRUD 任務定義，支援 CAP/TASK/TPL 分類',
    status: 'done',
    priority: 'high',
    tags: [{ label: 'CONFIG', color: '#808000' }],
    assignee: 'Dev'
  },
  {
    id: 2,
    title: '行事曆組件',
    description: '月曆顯示，支援事件、週末隱藏',
    status: 'done',
    priority: 'high',
    tags: [{ label: 'UI', color: '#008080' }],
    assignee: 'Dev'
  },
  {
    id: 3,
    title: '響應式設計',
    description: 'Mobile / Tablet / Desktop 三種版面',
    status: 'done',
    priority: 'high',
    tags: [{ label: 'UI', color: '#008080' }],
    assignee: 'Dev'
  },
  {
    id: 4,
    title: '積分頁面 UI',
    description: '積分中心、歷史紀錄、排行榜',
    status: 'done',
    priority: 'medium',
    tags: [{ label: 'HR', color: '#000080' }],
    assignee: 'Dev'
  },
  // IN PROGRESS
  {
    id: 5,
    title: '公告審核流程',
    description: 'HR建立 → Admin審核 → 發布',
    status: 'in_progress',
    priority: 'high',
    tags: [{ label: 'HR', color: '#000080' }],
    assignee: 'Dev',
    metadata: [
      { label: 'UI', value: '✅ 完成' },
      { label: 'API', value: '❌ 待開發' },
      { label: 'DB', value: '❌ 待建立' }
    ]
  },
  // TODO
  {
    id: 6,
    title: '公告系統串接資料庫',
    description: '建立 announcements 資料表和 CRUD API',
    status: 'todo',
    priority: 'high',
    tags: [{ label: 'DATABASE', color: '#800080' }, { label: 'API', color: '#FF8C00' }],
    metadata: [
      { label: '需建立', value: 'announcements table' },
      { label: '需建立', value: 'announcement_reviews table' },
      { label: '需建立', value: '/api/announcements route' }
    ]
  },
  {
    id: 7,
    title: '積分系統串接資料庫',
    description: '建立 points_history 資料表和 API',
    status: 'todo',
    priority: 'medium',
    tags: [{ label: 'DATABASE', color: '#800080' }, { label: 'API', color: '#FF8C00' }],
  },
  {
    id: 8,
    title: 'LINE 推播 API',
    description: '串接 LINE Messaging API',
    status: 'todo',
    priority: 'medium',
    tags: [{ label: 'API', color: '#FF8C00' }, { label: 'HR', color: '#000080' }],
  },
  // BACKLOG
  {
    id: 9,
    title: '外籍人員合約管理',
    description: '外勞合約追蹤、到期提醒',
    status: 'backlog',
    priority: 'low',
    tags: [{ label: 'HR', color: '#000080' }],
  },
  {
    id: 10,
    title: 'AI 智能助手',
    description: '自然語言查詢、權限控制、協助建立公告',
    status: 'backlog',
    priority: 'low',
    tags: [{ label: 'AI', color: '#800000' }],
  },
  {
    id: 11,
    title: 'OPS 廠務功能',
    description: '設備管理、維修報修、巡檢記錄',
    status: 'backlog',
    priority: 'medium',
    tags: [{ label: 'OPS', color: '#008000' }],
  },
  {
    id: 12,
    title: 'SALES 業務功能',
    description: '客戶管理、訂單追蹤',
    status: 'backlog',
    priority: 'low',
    tags: [{ label: 'SALES', color: '#008080' }],
  },
  {
    id: 13,
    title: 'REPORT 報表功能',
    description: '統計報表、資料匯出',
    status: 'backlog',
    priority: 'low',
    tags: [{ label: 'REPORT', color: '#808000' }],
  }
]

export default function DevTrackerPage() {
  const [tasks, setTasks] = useState<KanbanCard[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<KanbanCard | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1500)
  }

  const handleCardClick = (card: KanbanCard) => {
    setSelectedTask(card)
    setIsEditing(false)
  }

  const handleMoveCard = (cardId: string | number, newStatus: string) => {
    setTasks(prev => prev.map(t => 
      t.id === cardId ? { ...t, status: newStatus } : t
    ))
    showToast('MOVED')
  }

  const handleAddCard = (columnId: string) => {
    const newTask: KanbanCard = {
      id: Date.now(),
      title: '新任務',
      description: '',
      status: columnId,
      priority: 'medium',
      tags: [],
      assignee: 'Dev'
    }
    setTasks(prev => [...prev, newTask])
    setSelectedTask(newTask)
    setIsEditing(true)
    showToast('CREATED')
  }

  const handleSaveTask = () => {
    if (!selectedTask) return
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t))
    setIsEditing(false)
    showToast('SAVED')
  }

  const handleDeleteTask = () => {
    if (!selectedTask) return
    if (!confirm(`確定要刪除「${selectedTask.title}」嗎？`)) return
    setTasks(prev => prev.filter(t => t.id !== selectedTask.id))
    setSelectedTask(null)
    showToast('DELETED')
  }

  const tagOptions = [
    { label: 'HR', color: '#000080' },
    { label: 'OPS', color: '#008000' },
    { label: 'CONFIG', color: '#808000' },
    { label: 'DATABASE', color: '#800080' },
    { label: 'API', color: '#FF8C00' },
    { label: 'UI', color: '#008080' },
    { label: 'AI', color: '#800000' },
    { label: 'SALES', color: '#008080' },
    { label: 'REPORT', color: '#808000' }
  ]

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#000',
          color: '#0F0',
          padding: '4px 12px',
          border: '1px solid #0F0',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 9999
        }}>
          {toast}
        </div>
      )}

      {/* Kanban Board */}
      <KanbanBoard
        title="DEV TRACKER - 開發任務追蹤 (Admin Only)"
        columns={columns}
        cards={tasks}
        onCardClick={handleCardClick}
        onAddCard={handleAddCard}
        onMoveCard={handleMoveCard}
        showAddButton={true}
      />

      {/* Legend */}
      <div className="window" style={{ marginTop: '8px' }}>
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '9px' }}>TAGS</div>
        <div className="inset" style={{ padding: '6px', background: '#FFF', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tagOptions.map(tag => (
            <span key={tag.label} style={{ 
              background: tag.color, 
              color: '#FFF', 
              padding: '1px 6px', 
              fontSize: '9px' 
            }}>
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setSelectedTask(null)}
        >
          <div 
            className="window"
            style={{ width: '500px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="titlebar" style={{ fontSize: '11px' }}>
              TASK: #{selectedTask.id}
            </div>
            
            <div style={{ padding: '12px', fontSize: '11px', fontFamily: 'monospace' }}>
              {/* Title */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>TITLE:</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="input"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                    style={{ width: '100%', fontSize: '11px' }}
                  />
                ) : (
                  <div style={{ padding: '4px', background: '#F0F0F0', fontWeight: 'bold' }}>
                    {selectedTask.title}
                  </div>
                )}
              </div>

              {/* Status & Priority */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '2px' }}>STATUS:</label>
                  <select
                    className="input"
                    value={selectedTask.status}
                    onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value })}
                    disabled={!isEditing}
                    style={{ width: '100%', fontSize: '11px' }}
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '2px' }}>PRIORITY:</label>
                  <select
                    className="input"
                    value={selectedTask.priority || 'medium'}
                    onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value as any })}
                    disabled={!isEditing}
                    style={{ width: '100%', fontSize: '11px' }}
                  >
                    <option value="urgent">🔴 URGENT</option>
                    <option value="high">🟠 HIGH</option>
                    <option value="medium">🟡 MEDIUM</option>
                    <option value="low">⚪ LOW</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>DESCRIPTION:</label>
                {isEditing ? (
                  <textarea
                    className="input"
                    value={selectedTask.description || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                    style={{ width: '100%', fontSize: '11px', minHeight: '80px' }}
                  />
                ) : (
                  <div style={{ padding: '4px', background: '#F0F0F0', minHeight: '40px', whiteSpace: 'pre-wrap' }}>
                    {selectedTask.description || '(no description)'}
                  </div>
                )}
              </div>

              {/* Tags Display */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>TAGS:</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {selectedTask.tags?.map((tag, idx) => (
                    <span key={idx} style={{
                      background: tag.color,
                      color: '#FFF',
                      padding: '1px 6px',
                      fontSize: '9px'
                    }}>
                      {tag.label}
                    </span>
                  ))}
                  {(!selectedTask.tags || selectedTask.tags.length === 0) && (
                    <span style={{ color: '#808080' }}>(no tags)</span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {selectedTask.metadata && selectedTask.metadata.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '2px' }}>DETAILS:</label>
                  <div className="inset" style={{ padding: '6px', background: '#FFF', fontSize: '10px' }}>
                    {selectedTask.metadata.map((meta, idx) => (
                      <div key={idx} style={{ marginBottom: '2px' }}>
                        <span style={{ color: '#808080' }}>{meta.label}:</span> {meta.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveTask} style={{ flex: 1, fontSize: '10px' }}>
                      SAVE
                    </Button>
                    <Button onClick={() => setIsEditing(false)} style={{ flex: 1, fontSize: '10px' }}>
                      CANCEL
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setIsEditing(true)} style={{ flex: 1, fontSize: '10px' }}>
                      EDIT
                    </Button>
                    <Button 
                      onClick={handleDeleteTask} 
                      style={{ flex: 1, fontSize: '10px', background: '#800000', color: '#FFF' }}
                    >
                      DELETE
                    </Button>
                    <Button onClick={() => setSelectedTask(null)} style={{ flex: 1, fontSize: '10px' }}>
                      CLOSE
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}









