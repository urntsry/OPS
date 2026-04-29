'use client'

import { useState, useEffect } from 'react'
import Button from './Button'
import { 
  getAllTaskDefinitions,
  updateTaskDefinitionFull,
  deleteTaskDefinition,
  type TaskDefinition
} from '@/lib/api'

type TabType = 'all' | 'capability' | 'actual_task' | 'templates'

export default function TaskClassificationPage() {
  const [tasks, setTasks] = useState<TaskDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await getAllTaskDefinitions()
      setTasks(data)
    } catch (error) {
      console.error('[TaskClassification] 載入失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 直接切換類型（不需要打開編輯對話框）
  const handleQuickTypeChange = async (task: TaskDefinition, newType: 'capability' | 'actual_task') => {
    if (task.item_type === newType) return
    
    setSavingId(task.id)
    try {
      const updates: Partial<TaskDefinition> = {
        item_type: newType
      }
      
      if (newType === 'capability') {
        updates.default_assignee_id = undefined
        updates.backup_assignee_id = undefined
        updates.is_active = false
        updates.is_template = false
      }
      
      await updateTaskDefinitionFull(task.id, updates)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t))
      showToast('OK')
    } catch (error) {
      console.error('更新失敗:', error)
    } finally {
      setSavingId(null)
    }
  }

  // 直接切換事件分類
  const handleQuickCategoryChange = async (task: TaskDefinition, category: string) => {
    setSavingId(task.id)
    try {
      await updateTaskDefinitionFull(task.id, { event_category: category || undefined })
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, event_category: category || undefined } : t))
      showToast('OK')
    } catch (error) {
      console.error('更新失敗:', error)
    } finally {
      setSavingId(null)
    }
  }

  // 直接切換模板
  const handleQuickTemplateToggle = async (task: TaskDefinition) => {
    setSavingId(task.id)
    try {
      const newValue = !task.is_template
      await updateTaskDefinitionFull(task.id, { is_template: newValue })
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_template: newValue } : t))
      showToast('OK')
    } catch (error) {
      console.error('更新失敗:', error)
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveTask = async (task: TaskDefinition) => {
    try {
      const updates: Partial<TaskDefinition> = {
        title: task.title,
        item_type: task.item_type,
        event_category: task.event_category,
        is_template: task.is_template
      }
      
      if (task.item_type === 'capability') {
        updates.default_assignee_id = undefined
        updates.backup_assignee_id = undefined
        updates.is_active = false
      }
      
      await updateTaskDefinitionFull(task.id, updates)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t))
      setEditingTask(null)
      showToast('OK')
    } catch (error) {
      console.error('儲存失敗:', error)
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 1000)
  }

  // 刪除任務
  const handleDeleteTask = async (task: TaskDefinition) => {
    if (!confirm(`確定要刪除「${task.title}」嗎？\n\n此操作無法復原！`)) return
    
    setDeletingId(task.id)
    try {
      await deleteTaskDefinition(task.id)
      setTasks(prev => prev.filter(t => t.id !== task.id))
      showToast('DELETED')
    } catch (error) {
      console.error('刪除失敗:', error)
      showToast('ERROR')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (activeTab === 'capability') return task.item_type === 'capability'
    if (activeTab === 'actual_task') return task.item_type === 'actual_task'
    if (activeTab === 'templates') return task.is_template === true
    return true
  })

  const stats = {
    total: tasks.length,
    capability: tasks.filter(t => t.item_type === 'capability').length,
    actual_task: tasks.filter(t => t.item_type === 'actual_task').length,
    templates: tasks.filter(t => t.is_template).length
  }

  if (loading) {
    return (
      <div className="window">
        <div className="titlebar">TASK_CLASSIFICATION</div>
        <div className="p-2 text-mono">Loading...</div>
      </div>
    )
  }

  return (
    <div className="window">
      <div className="titlebar">TASK_CLASSIFICATION v2.0</div>
      
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
      
      <div className="p-2">
        {/* Stats */}
        <div className="text-mono" style={{ fontSize: '11px', marginBottom: '4px', color: 'var(--text-primary)' }}>
          TOTAL:{stats.total} | CAP:{stats.capability} | TASK:{stats.actual_task} | TPL:{stats.templates}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
          {[
            { key: 'all', label: `ALL(${stats.total})` },
            { key: 'capability', label: `CAP(${stats.capability})` },
            { key: 'actual_task', label: `TASK(${stats.actual_task})` },
            { key: 'templates', label: `TPL(${stats.templates})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={activeTab === tab.key ? 'inset' : 'outset'}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                cursor: 'pointer',
                background: activeTab === tab.key ? '#000080' : '#C0C0C0',
                color: activeTab === tab.key ? '#FFF' : 'var(--text-primary)',
                border: 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input"
          style={{ width: '200px', fontSize: '11px', marginBottom: '4px' }}
        />

        {/* Table */}
        <div className="inset" style={{ background: '#FFF', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#C0C0C0' }}>
              <tr>
                <th style={{width: '35px', padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid #808080'}}>#</th>
                <th style={{padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid #808080'}}>NAME</th>
                <th style={{width: '100px', padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid #808080'}}>TYPE</th>
                <th style={{width: '80px', padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid #808080'}}>CATEGORY</th>
                <th style={{width: '40px', padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid #808080'}}>TPL</th>
                <th style={{width: '80px', padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid #808080'}}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, index) => (
                <tr 
                  key={task.id}
                  onMouseEnter={() => setHoveredId(task.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ 
                    borderBottom: '1px solid #E0E0E0',
                    background: deletingId === task.id ? '#FFCCCC' 
                      : savingId === task.id ? '#FFFFCC' 
                      : hoveredId === task.id ? '#E0E8FF'
                      : (index % 2 === 0 ? '#FFF' : '#F8F8F8'),
                    transition: 'background 0.1s'
                  }}
                >
                  <td style={{padding: '2px 4px', color: '#808080'}}>{index + 1}</td>
                  <td style={{padding: '2px 4px'}}>{task.title}</td>
                  <td style={{padding: '2px 4px'}}>
                    {/* 直接點選切換類型 */}
                    <select
                      value={task.item_type || 'actual_task'}
                      onChange={(e) => handleQuickTypeChange(task, e.target.value as 'capability' | 'actual_task')}
                      disabled={savingId === task.id}
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        padding: '1px 2px',
                        background: task.item_type === 'capability' ? '#FF0' : '#0A0',
                        color: task.item_type === 'capability' ? '#000' : '#FFF',
                        border: '1px solid #808080',
                        cursor: 'pointer',
                        width: '90px'
                      }}
                    >
                      <option value="capability">CAP</option>
                      <option value="actual_task">TASK</option>
                    </select>
                  </td>
                  <td style={{padding: '2px 4px'}}>
                    {/* 直接點選切換事件分類 */}
                    <select
                      value={task.event_category || ''}
                      onChange={(e) => handleQuickCategoryChange(task, e.target.value)}
                      disabled={savingId === task.id || task.item_type === 'capability'}
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        padding: '1px 2px',
                        background: task.item_type === 'capability' ? '#E0E0E0' : '#FFF',
                        border: '1px solid #808080',
                        cursor: task.item_type === 'capability' ? 'not-allowed' : 'pointer',
                        width: '70px'
                      }}
                    >
                      <option value="">-</option>
                      <option value="報修">報修</option>
                      <option value="活動">活動</option>
                      <option value="清潔">清潔</option>
                      <option value="會計">會計</option>
                      <option value="人事">人事</option>
                      <option value="職訓">職訓</option>
                      <option value="會議">會議</option>
                      <option value="出差">出差</option>
                    </select>
                  </td>
                  <td style={{padding: '2px 4px', textAlign: 'center'}}>
                    {/* 直接點選切換模板 */}
                    <input
                      type="checkbox"
                      checked={task.is_template || false}
                      onChange={() => handleQuickTemplateToggle(task)}
                      disabled={savingId === task.id || task.item_type === 'capability'}
                      style={{ cursor: task.item_type === 'capability' ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                  <td style={{padding: '2px 4px', textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                      <button
                        onClick={() => setEditingTask(task)}
                        title="編輯"
                        style={{
                          fontSize: '10px',
                          fontFamily: 'monospace',
                          padding: '1px 4px',
                          background: '#C0C0C0',
                          border: '1px solid #808080',
                          cursor: 'pointer'
                        }}
                      >
                        [E]
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task)}
                        disabled={deletingId === task.id}
                        title="刪除"
                        style={{
                          fontSize: '10px',
                          fontFamily: 'monospace',
                          padding: '1px 4px',
                          background: deletingId === task.id ? '#CCC' : '#C0C0C0',
                          color: '#800000',
                          border: '1px solid #808080',
                          cursor: deletingId === task.id ? 'wait' : 'pointer'
                        }}
                      >
                        [X]
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      {editingTask && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setEditingTask(null)}
        >
          <div 
            className="window"
            style={{ width: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="titlebar">EDIT: {editingTask.id}</div>
            
            <div style={{ padding: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>NAME:</label>
                <input
                  type="text"
                  className="input"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  style={{ width: '100%', fontSize: '11px' }}
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>TYPE:</label>
                <select
                  className="input"
                  value={editingTask.item_type || 'actual_task'}
                  onChange={(e) => setEditingTask({ ...editingTask, item_type: e.target.value as 'capability' | 'actual_task' })}
                  style={{ width: '100%', fontSize: '11px' }}
                >
                  <option value="capability">CAP (職能清單)</option>
                  <option value="actual_task">TASK (實際任務)</option>
                </select>
              </div>

              {editingTask.item_type === 'actual_task' && (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '2px' }}>CATEGORY:</label>
                    <select
                      className="input"
                      value={editingTask.event_category || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, event_category: e.target.value })}
                      style={{ width: '100%', fontSize: '11px' }}
                    >
                      <option value="">--</option>
                      <option value="報修">報修</option>
                      <option value="活動">活動</option>
                      <option value="清潔">清潔</option>
                      <option value="會計">會計</option>
                      <option value="人事">人事</option>
                      <option value="職訓">職訓</option>
                      <option value="會議">會議</option>
                      <option value="出差">出差</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editingTask.is_template || false}
                        onChange={(e) => setEditingTask({ ...editingTask, is_template: e.target.checked })}
                      />
                      {' '}TEMPLATE
                    </label>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
                <Button onClick={() => handleSaveTask(editingTask)} style={{ flex: 1, fontSize: '11px' }}>
                  SAVE
                </Button>
                <Button onClick={() => setEditingTask(null)} style={{ flex: 1, fontSize: '11px' }}>
                  CANCEL
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
