'use client'

import { useState, useEffect } from 'react'
import Button from './Button'
import Card from './Card'
import { 
  getAllProfiles, 
  getAllTaskDefinitions,
  updateTaskDefinitionAssignee,
  deleteTaskDefinition,
  type Profile,
  type TaskDefinition
} from '@/lib/api'

export default function SettingsPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<TaskDefinition | null>(null)

  // 載入資料
  useEffect(() => {
    async function loadData() {
      console.log('[SettingsPage] 載入資料...')
      setLoading(true)
      
      try {
        // 載入所有員工
        const profilesData = await getAllProfiles()
        console.log('[SettingsPage] 員工數量:', profilesData.length)
        setUsers(profilesData)
        
        // 載入所有任務定義（包含 is_active = false 的）
        const tasksData = await getAllTaskDefinitions()
        console.log('[SettingsPage] 任務數量:', tasksData.length)
        setTaskDefs(tasksData)
        
        // 預設選擇第一個員工
        if (profilesData.length > 0) {
          setSelectedUserId(profilesData[0].id)
        }
      } catch (error) {
        console.error('[SettingsPage] 載入失敗:', error)
        alert('載入資料失敗，請檢查連線')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  const selectedUser = users.find(u => u.id === selectedUserId)

  // 檢查任務是否已分配給選中的使用者
  const isAssigned = (task: TaskDefinition) => {
    return task.default_assignee_id === selectedUserId || 
           task.backup_assignee_id === selectedUserId
  }

  // 取得角色（主辦/協辦）
  const getRole = (task: TaskDefinition) => {
    if (task.default_assignee_id === selectedUserId) return '主辦'
    if (task.backup_assignee_id === selectedUserId) return '協辦'
    return ''
  }

  // 切換任務分配
  const toggleAssignment = async (task: TaskDefinition) => {
    console.log('[SettingsPage] 切換任務分配:', { taskId: task.id, userId: selectedUserId })
    
    // 樂觀更新 UI
    const updatedTasks = taskDefs.map(t => {
      if (t.id !== task.id) return t
      
      // 如果已經是主辦，改為協辦
      if (t.default_assignee_id === selectedUserId) {
        return { ...t, default_assignee_id: undefined, backup_assignee_id: selectedUserId }
      }
      // 如果是協辦，取消分配
      else if (t.backup_assignee_id === selectedUserId) {
        return { ...t, backup_assignee_id: undefined }
      }
      // 如果未分配，設為主辦
      else {
        return { ...t, default_assignee_id: selectedUserId }
      }
    })
    
    setTaskDefs(updatedTasks)
  }

  // 儲存所有變更
  const handleSave = async () => {
    console.log('[SettingsPage] 儲存變更...')
    setSaving(true)
    
    try {
      // 只更新與選中使用者相關的任務
      const userTasks = taskDefs.filter(t => 
        t.default_assignee_id === selectedUserId || 
        t.backup_assignee_id === selectedUserId
      )
      
      console.log('[SettingsPage] 需要更新的任務數:', userTasks.length)
      
      for (const task of userTasks) {
        await updateTaskDefinitionAssignee(
          task.id, 
          task.default_assignee_id || null, 
          task.backup_assignee_id || null
        )
      }
      
      setToast('✓ 儲存成功！')
      setTimeout(() => setToast(null), 3000)
      
      console.log('[SettingsPage] 儲存完成')
    } catch (error) {
      console.error('[SettingsPage] 儲存失敗:', error)
      alert('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  // 刪除任務（帶確認）
  const handleDeleteTask = (task: TaskDefinition) => {
    console.log('[SettingsPage] 準備刪除任務:', task.id, task.title)
    setTaskToDelete(task)
  }

  // 確認刪除
  const confirmDelete = async () => {
    if (!taskToDelete) return
    
    console.log('[SettingsPage] 執行刪除:', taskToDelete.id)
    
    try {
      await deleteTaskDefinition(taskToDelete.id)
      
      // 從列表中移除
      setTaskDefs(prev => prev.filter(t => t.id !== taskToDelete.id))
      
      setToast(`✓ 已刪除「${taskToDelete.title}」`)
      setTimeout(() => setToast(null), 3000)
      
      setTaskToDelete(null)
    } catch (error: any) {
      console.error('[SettingsPage] 刪除失敗:', error)
      
      // 顯示詳細錯誤訊息
      const errorMsg = error?.message || error?.error?.message || '刪除失敗，請稍後再試'
      alert(`刪除失敗：${errorMsg}`)
    }
  }

  // 取得使用者的任務統計
  const getUserStats = (userId: string) => {
    const userTasks = taskDefs.filter(t => 
      t.default_assignee_id === userId || t.backup_assignee_id === userId
    )
    
    return {
      total: userTasks.length,
      primary: userTasks.filter(t => t.default_assignee_id === userId).length,
      backup: userTasks.filter(t => t.backup_assignee_id === userId).length,
      routine: userTasks.filter(t => 
        (t.default_assignee_id === userId || t.backup_assignee_id === userId) && 
        t.frequency !== 'event_triggered'
      ).length
    }
  }

  const selectedStats = selectedUserId ? getUserStats(selectedUserId) : null

  if (loading) {
    return (
      <div className="window">
        <div className="titlebar">系統設定 - 任務分配管理</div>
        <div className="p-4 text-center text-mono">載入中...</div>
      </div>
    )
  }

  return (
    <div className="window">
      <div className="titlebar">系統設定 - 任務分配管理</div>
      
      {/* Toast 通知 */}
      {toast && (
        <div 
          style={{
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
          }}
        >
          {toast}
        </div>
      )}
      
      <div className="p-4 bg-grey-200">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          {/* 左側：人員列表 */}
          <Card title={`人員列表 (共 ${users.length} 人)`}>
            <div className="inset bg-white" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="w-full text-11" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#C0C0C0' }}>
                  <tr className="border-b-2 border-grey-600">
                    <th style={{width: '60px', padding: '4px', textAlign: 'left'}}>編號</th>
                    <th style={{padding: '4px', textAlign: 'left'}}>姓名</th>
                    <th style={{width: '80px', padding: '4px', textAlign: 'left'}}>部門</th>
                    <th style={{width: '40px', padding: '4px', textAlign: 'center'}}>主辦</th>
                    <th style={{width: '40px', padding: '4px', textAlign: 'center'}}>協辦</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const stats = getUserStats(user.id)
                    return (
                      <tr 
                        key={user.id}
                        className={`border-b border-grey-300 cursor-pointer ${
                          selectedUserId === user.id ? 'bg-blue-900 text-white' : 'hover:bg-grey-100'
                        }`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <td className="text-mono" style={{padding: '4px'}}>{user.employee_id}</td>
                        <td style={{padding: '4px'}}>{user.full_name}</td>
                        <td className="text-11" style={{padding: '4px'}}>{user.department}</td>
                        <td className="text-mono text-center" style={{padding: '4px'}}>{stats.primary}</td>
                        <td className="text-mono text-center" style={{padding: '4px'}}>{stats.backup}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 右側：任務定義列表 */}
          <Card title={`任務項目 (共 ${taskDefs.length} 項)`}>
            <div className="inset bg-white" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="w-full text-11" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#C0C0C0' }}>
                  <tr className="border-b-2 border-grey-600">
                    <th style={{width: '40px', padding: '4px', textAlign: 'left'}}>ID</th>
                    <th style={{padding: '4px', textAlign: 'left'}}>標題</th>
                    <th style={{width: '60px', padding: '4px', textAlign: 'left'}}>頻率</th>
                    <th style={{width: '50px', padding: '4px', textAlign: 'left'}}>廠區</th>
                    <th style={{width: '50px', padding: '4px', textAlign: 'center'}}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {taskDefs.map(task => {
                    // 計算有多少人被指派此任務
                    const assignedCount = users.filter(u => 
                      task.default_assignee_id === u.id || task.backup_assignee_id === u.id
                    ).length
                    
                    return (
                      <tr key={task.id} className="border-b border-grey-300 hover:bg-grey-100">
                        <td className="text-mono" style={{padding: '4px'}}>{task.id}</td>
                        <td style={{padding: '4px'}}>
                          {task.title}
                          {!task.is_active && <span className="text-grey-600"> (未啟用)</span>}
                        </td>
                        <td className="text-11" style={{padding: '4px'}}>
                          {task.frequency === 'daily' ? '每日' :
                           task.frequency === 'weekly' ? '每週' :
                           task.frequency === 'monthly' ? '每月' : '事件'}
                        </td>
                        <td className="text-mono text-11" style={{padding: '4px'}}>{task.site_location}</td>
                        <td style={{padding: '4px', textAlign: 'center'}}>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: '#C0C0C0',
                              border: '1px solid #808080',
                              cursor: 'pointer',
                              color: assignedCount > 0 ? '#800000' : '#000'
                            }}
                            title={assignedCount > 0 ? `${assignedCount} 人被指派` : '刪除'}
                          >
                            {assignedCount > 0 ? `[${assignedCount}]` : 'X'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 任務分配區域 */}
        <Card title={`任務分配 - ${selectedUser?.full_name || '未選擇'} (${selectedUser?.employee_id || '-'})`}>
          {selectedUser ? (
            <>
              <div className="mb-2 text-11 text-grey-600">
                點擊勾選框：[ ] → [主] → [協] → [ ]（循環）
              </div>

              <div className="inset bg-white" style={{ maxHeight: '300px', overflowY: 'auto', padding: '0' }}>
                <table className="w-full text-11" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    {taskDefs.map(task => {
                      const role = getRole(task)
                      const assigned = isAssigned(task)
                      
                      return (
                        <tr 
                          key={task.id} 
                          className="border-b border-grey-300 hover:bg-grey-100 cursor-pointer"
                          onClick={() => toggleAssignment(task)}
                        >
                          <td style={{ width: '40px', padding: '4px', textAlign: 'center' }}>
                            <span className="text-mono text-bold">
                              {role === '主辦' ? '[主]' : role === '協辦' ? '[協]' : '[ ]'}
                            </span>
                          </td>
                          <td style={{ padding: '4px' }}>
                            <span className={assigned ? 'text-bold' : 'text-grey-600'}>
                              {task.title}
                            </span>
                          </td>
                          <td className="text-11 text-grey-600" style={{ width: '60px', padding: '4px' }}>
                            {task.frequency === 'daily' ? '每日' :
                             task.frequency === 'weekly' ? '每週' :
                             task.frequency === 'monthly' ? '每月' : '事件'}
                          </td>
                          <td className="text-mono text-11 text-grey-600" style={{ width: '50px', padding: '4px' }}>
                            {task.site_location}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={handleSave}
                  style={{ flex: 1 }}
                  disabled={saving}
                >
                  {saving ? '儲存中...' : '儲存變更'}
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  style={{ flex: 1 }}
                >
                  重新載入
                </Button>
              </div>

              {/* 統計 */}
              {selectedStats && (
                <div className="mt-4 outset" style={{padding: '8px'}}>
                  <div className="text-11 text-mono">
                    <div className="text-bold mb-1">任務統計</div>
                    <div>總任務數: {selectedStats.total} 項</div>
                    <div className="text-grey-600">
                      主辦: {selectedStats.primary} | 協辦: {selectedStats.backup} | 例行: {selectedStats.routine}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-11 text-grey-600 p-4">
              請從左側選擇員工
            </div>
          )}
        </Card>
      </div>

      {/* 刪除確認對話框 */}
      {taskToDelete && (
        <>
          {/* 半透明背景 */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 9998
            }}
            onClick={() => setTaskToDelete(null)}
          />
          
          {/* 對話框 */}
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#C0C0C0',
              border: '2px solid',
              borderColor: '#FFFFFF #000000 #000000 #FFFFFF',
              boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
              zIndex: 9999,
              width: '500px',
              padding: '0'
            }}
          >
            {/* 標題列 */}
            <div 
              style={{
                background: 'linear-gradient(90deg, #800000 0%, #D01010 100%)',
                color: 'white',
                padding: '4px 8px',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
            >
              ⚠️ 確認刪除任務
            </div>
            
            {/* 內容 */}
            <div style={{ padding: '16px' }}>
              <div className="text-11 mb-4">
                <div className="text-bold mb-2">即將刪除任務：</div>
                <div className="outset p-2 bg-white">
                  <div>ID: {taskToDelete.id}</div>
                  <div>標題: {taskToDelete.title}</div>
                  <div>頻率: {taskToDelete.frequency === 'daily' ? '每日' :
                              taskToDelete.frequency === 'weekly' ? '每週' :
                              taskToDelete.frequency === 'monthly' ? '每月' : '事件'}</div>
                  <div>廠區: {taskToDelete.site_location}</div>
                </div>
              </div>
              
              {/* 顯示綁定的人員 */}
              {(() => {
                const assignedUsers = users.filter(u => 
                  taskToDelete.default_assignee_id === u.id || 
                  taskToDelete.backup_assignee_id === u.id
                )
                
                if (assignedUsers.length > 0) {
                  return (
                    <div className="text-11 mb-4">
                      <div className="text-bold text-red-700 mb-2">
                        ⚠️ 此任務已指派給 {assignedUsers.length} 位員工：
                      </div>
                      <div className="outset p-2 bg-white" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                        {assignedUsers.map(user => {
                          const role = taskToDelete.default_assignee_id === user.id ? '主辦' : '協辦'
                          return (
                            <div key={user.id} className="mb-1">
                              • {user.full_name} ({user.employee_id}) - {role}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
                return null
              })()}
              
              <div className="text-11 text-grey-600 mb-4">
                此操作無法復原，確定要刪除嗎？
              </div>
              
              {/* 按鈕 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  onClick={confirmDelete}
                  style={{ 
                    flex: 1, 
                    background: '#800000',
                    color: 'white'
                  }}
                >
                  確定刪除
                </Button>
                <Button 
                  onClick={() => setTaskToDelete(null)}
                  style={{ flex: 1 }}
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
