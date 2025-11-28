'use client'

import { useState, useEffect } from 'react'
import Button from './Button'
import Card from './Card'
import { 
  getAllTaskDefinitions,
  updateTaskDefinitionFull,
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

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await getAllTaskDefinitions()
      console.log('[TaskClassification] 載入任務:', data.length)
      setTasks(data)
    } catch (error) {
      console.error('[TaskClassification] 載入失敗:', error)
      alert('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTask = async (task: TaskDefinition) => {
    try {
      console.log('[TaskClassification] 儲存任務:', task.id)
      
      // 如果設定為職能清單，自動清除分配
      const updates: Partial<TaskDefinition> = {
        title: task.title,
        item_type: task.item_type,
        event_category: task.event_category,
        is_template: task.is_template
      }
      
      if (task.item_type === 'capability') {
        console.log('[TaskClassification] 設定為職能清單，清除任務分配')
        updates.default_assignee_id = undefined
        updates.backup_assignee_id = undefined
        updates.is_active = false // 職能清單不需要啟用
      }
      
      await updateTaskDefinitionFull(task.id, updates)
      
      // 更新本地狀態
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t))
      setEditingTask(null)
      
      if (task.item_type === 'capability') {
        showToast('✓ 已設定為職能清單並清除分配')
      } else {
        showToast('✓ 儲存成功')
      }
      console.log('[TaskClassification] 儲存成功')
    } catch (error) {
      console.error('[TaskClassification] 儲存失敗:', error)
      alert('儲存失敗')
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  // 過濾任務
  const filteredTasks = tasks.filter(task => {
    // 搜尋過濾
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    // 分頁過濾
    if (activeTab === 'capability') return task.item_type === 'capability'
    if (activeTab === 'actual_task') return task.item_type === 'actual_task'
    if (activeTab === 'templates') return task.is_template === true
    return true // 'all'
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
        <div className="titlebar">任務分類管理</div>
        <div className="p-4 text-center text-mono">載入中...</div>
      </div>
    )
  }

  return (
    <div className="window">
      <div className="titlebar">任務分類管理 v2.0</div>
      
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          background: '#008000',
          color: 'white',
          padding: '12px 20px',
          border: '2px solid #000',
          boxShadow: '4px 4px 0 #000',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 9999
        }}>
          {toast}
        </div>
      )}
      
      <div className="p-4 bg-grey-200">
        {/* 統計資訊 */}
        <div style={{ marginBottom: '8px', display: 'flex', gap: '16px', fontSize: '11px' }}>
          <div>總數: <strong>{stats.total}</strong></div>
          <div>職能清單: <strong>{stats.capability}</strong></div>
          <div>實際任務: <strong>{stats.actual_task}</strong></div>
          <div>模板事件: <strong>{stats.templates}</strong></div>
        </div>

        {/* 分頁標籤 */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '8px',
          borderBottom: '2px solid #808080'
        }}>
          {[
            { key: 'all', label: `全部 (${stats.total})` },
            { key: 'capability', label: `職能清單 (${stats.capability})` },
            { key: 'actual_task', label: `實際任務 (${stats.actual_task})` },
            { key: 'templates', label: `模板事件 (${stats.templates})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                background: activeTab === tab.key ? '#C0C0C0' : '#808080',
                color: activeTab === tab.key ? '#000' : '#C0C0C0',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 搜尋框 */}
        <div style={{ marginBottom: '8px' }}>
          <input
            type="text"
            placeholder="搜尋任務名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ width: '300px', fontSize: '11px' }}
          />
        </div>

        {/* 任務列表 */}
        <Card title={`任務列表 (${filteredTasks.length} 項)`}>
          <div className="inset bg-white" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <table className="w-full text-11" style={{ borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#C0C0C0' }}>
                <tr className="border-b-2 border-grey-600">
                  <th style={{width: '40px', padding: '4px', textAlign: 'left'}}>序號</th>
                  <th style={{width: '200px', padding: '4px', textAlign: 'left'}}>任務名稱</th>
                  <th style={{width: '100px', padding: '4px', textAlign: 'left'}}>類型</th>
                  <th style={{width: '100px', padding: '4px', textAlign: 'left'}}>事件分類</th>
                  <th style={{width: '60px', padding: '4px', textAlign: 'center'}}>模板</th>
                  <th style={{width: '80px', padding: '4px', textAlign: 'center'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, index) => (
                  <tr key={task.id} className="border-b border-grey-300 hover:bg-grey-100">
                    <td className="text-mono" style={{padding: '4px'}}>{index + 1}</td>
                    <td style={{padding: '4px'}}>{task.title}</td>
                    <td style={{padding: '4px'}}>
                      <span style={{
                        padding: '2px 6px',
                        background: task.item_type === 'capability' ? '#FFEB3B' : '#4CAF50',
                        color: '#000',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {task.item_type === 'capability' ? '職能清單' : '實際任務'}
                      </span>
                    </td>
                    <td style={{padding: '4px'}}>
                      {task.event_category || '-'}
                    </td>
                    <td style={{padding: '4px', textAlign: 'center'}}>
                      {task.is_template ? '✓' : '-'}
                    </td>
                    <td style={{padding: '4px', textAlign: 'center'}}>
                      <button
                        onClick={() => setEditingTask(task)}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: '#C0C0C0',
                          border: '1px solid #808080',
                          cursor: 'pointer'
                        }}
                      >
                        編輯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 編輯對話框 */}
      {editingTask && (
        <>
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
              style={{
                background: '#C0C0C0',
                border: '2px solid',
                borderColor: '#FFFFFF #000000 #000000 #FFFFFF',
                width: '500px',
                padding: 0
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="titlebar">編輯任務 - {editingTask.title}</div>
              
              <div style={{ padding: '16px', fontSize: '11px' }}>
                {/* 任務名稱 */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    任務名稱
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    style={{ width: '100%', fontSize: '11px' }}
                  />
                </div>

                {/* 類型選擇 */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    任務類型
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="item_type"
                        checked={editingTask.item_type === 'capability'}
                        onChange={() => setEditingTask({ ...editingTask, item_type: 'capability' })}
                      />
                      {' '}職能清單（不顯示行事曆）
                    </label>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="item_type"
                        checked={editingTask.item_type === 'actual_task'}
                        onChange={() => setEditingTask({ ...editingTask, item_type: 'actual_task' })}
                      />
                      {' '}實際任務（顯示行事曆）
                    </label>
                  </div>
                </div>

                {/* 事件分類（只在實際任務時顯示） */}
                {editingTask.item_type === 'actual_task' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                      事件分類
                    </label>
                    <select
                      className="input"
                      value={editingTask.event_category || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, event_category: e.target.value })}
                      style={{ width: '100%', fontSize: '11px' }}
                    >
                      <option value="">-- 未分類 --</option>
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
                )}

                {/* 模板標記（只在實際任務時顯示） */}
                {editingTask.item_type === 'actual_task' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editingTask.is_template || false}
                        onChange={(e) => setEditingTask({ ...editingTask, is_template: e.target.checked })}
                      />
                      {' '}標記為模板（可在首頁快速建立）
                    </label>
                  </div>
                )}

                {/* 說明文字 */}
                <div className="inset" style={{ padding: '8px', background: '#FFFFCC', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                    <strong>職能清單：</strong>記錄員工的工作能力，不會顯示在行事曆<br/>
                    <strong>實際任務：</strong>需要執行、追蹤的任務，會顯示在行事曆<br/>
                    <strong>模板事件：</strong>可在首頁快速建立的常用事件
                  </div>
                </div>

                {/* 按鈕 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button 
                    onClick={() => handleSaveTask(editingTask)}
                    style={{ flex: 1 }}
                  >
                    儲存
                  </Button>
                  <Button 
                    onClick={() => setEditingTask(null)}
                    style={{ flex: 1 }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

