'use client'

import { useState, useEffect } from 'react'

interface PointsPageProps {
  userProfile: {
    id: string
    full_name: string
    employee_id: string
    department: string
    points_balance: number
  } | null
}

// 模擬積分歷史資料（之後會從資料庫讀取）
const mockPointsHistory = [
  { id: 1, points: 1, source_type: 'announcement_read', description: '閱讀公告: 消防演練通知', created_at: '2025/12/18 10:15' },
  { id: 2, points: 10, source_type: 'task_complete', description: '完成任務: 環境清潔督導', created_at: '2025/12/17 16:30' },
  { id: 3, points: 1, source_type: 'announcement_read', description: '閱讀公告: 12月排班表', created_at: '2025/12/17 09:00' },
  { id: 4, points: 50, source_type: 'task_complete', description: '完成任務: 設備保養', created_at: '2025/12/16 14:20' },
  { id: 5, points: 1, source_type: 'announcement_read', description: '閱讀公告: 上週完成率', created_at: '2025/12/16 08:45' },
  { id: 6, points: 10, source_type: 'task_complete', description: '完成任務: 生產進度回報', created_at: '2025/12/15 17:00' },
  { id: 7, points: 100, source_type: 'bonus', description: '月度優秀員工獎勵', created_at: '2025/12/01 09:00' },
]

// 模擬排行榜資料
const mockLeaderboard = [
  { rank: 1, name: '温玲怡', department: '管理部', points: 230 },
  { rank: 2, name: '曾世聞', department: '管理部', points: 198 },
  { rank: 3, name: '張庭憲', department: '廠務部', points: 156 },
  { rank: 4, name: '范姜群皓', department: '廠務部', points: 145 },
  { rank: 5, name: '林珠華', department: '廠務部', points: 132 },
  { rank: 6, name: '吳春珠', department: '廠務部', points: 128 },
  { rank: 7, name: '阮慧喬', department: '廠務部', points: 115 },
  { rank: 8, name: '古志禹', department: '管理部', points: 0 },
]

export default function PointsPage({ userProfile }: PointsPageProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'leaderboard'>('history')

  // 計算統計資料
  const stats = {
    announcement: mockPointsHistory.filter(h => h.source_type === 'announcement_read').reduce((sum, h) => sum + h.points, 0),
    task: mockPointsHistory.filter(h => h.source_type === 'task_complete').reduce((sum, h) => sum + h.points, 0),
    bonus: mockPointsHistory.filter(h => h.source_type === 'bonus').reduce((sum, h) => sum + h.points, 0),
    redemption: mockPointsHistory.filter(h => h.source_type === 'redemption').reduce((sum, h) => sum + h.points, 0),
  }

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'announcement_read': return '[公告]'
      case 'task_complete': return '[任務]'
      case 'bonus': return '[獎勵]'
      case 'redemption': return '[兌換]'
      default: return '[--]'
    }
  }

  const getSourceColor = (type: string) => {
    switch (type) {
      case 'announcement_read': return '#000080'
      case 'task_complete': return '#008080'
      case 'bonus': return '#008000'
      case 'redemption': return '#800000'
      default: return '#000'
    }
  }

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* 用戶積分摘要 */}
      <div className="window" style={{ marginBottom: '8px' }}>
        <div className="titlebar" style={{ padding: '4px 8px', fontSize: '11px' }}>
          POINTS - 積分中心
        </div>
        <div className="inset" style={{ padding: '12px', background: '#FFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {userProfile?.full_name || '---'} ({userProfile?.employee_id || '---'})
              </div>
              <div style={{ fontSize: '10px', color: '#808080' }}>
                {userProfile?.department || '---'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#008000',
                fontFamily: 'monospace'
              }}>
                {userProfile?.points_balance || 0} PT
              </div>
              <div style={{ fontSize: '10px', color: '#808080' }}>
                目前積分
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 統計區塊 */}
      <div className="window" style={{ marginBottom: '8px' }}>
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '10px' }}>
          STATS - 積分來源統計
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', padding: '4px' }}>
          <div className="inset" style={{ padding: '8px', background: '#FFF', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: 'var(--accent-blue)' }}>[公告]</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>+{stats.announcement}</div>
          </div>
          <div className="inset" style={{ padding: '8px', background: '#FFF', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#008080' }}>[任務]</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#008080' }}>+{stats.task}</div>
          </div>
          <div className="inset" style={{ padding: '8px', background: '#FFF', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#008000' }}>[獎勵]</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#008000' }}>+{stats.bonus}</div>
          </div>
          <div className="inset" style={{ padding: '8px', background: '#FFF', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#800000' }}>[兌換]</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#800000' }}>{stats.redemption}</div>
          </div>
        </div>
      </div>

      {/* 分頁切換 */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '4px 12px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            background: activeTab === 'history' ? '#000080' : '#C0C0C0',
            color: activeTab === 'history' ? '#FFF' : 'var(--text-primary)',
            border: activeTab === 'history' ? '2px inset #808080' : '2px outset #FFF',
            cursor: 'pointer'
          }}
        >
          HISTORY 歷史紀錄
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          style={{
            padding: '4px 12px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            background: activeTab === 'leaderboard' ? '#000080' : '#C0C0C0',
            color: activeTab === 'leaderboard' ? '#FFF' : 'var(--text-primary)',
            border: activeTab === 'leaderboard' ? '2px inset #808080' : '2px outset #FFF',
            cursor: 'pointer'
          }}
        >
          LEADERBOARD 排行榜
        </button>
      </div>

      {/* 內容區 */}
      <div className="window">
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '10px' }}>
          {activeTab === 'history' ? 'HISTORY - 積分歷史' : 'LEADERBOARD - 積分排行榜'}
        </div>
        <div className="inset" style={{ background: '#FFF', maxHeight: '300px', overflowY: 'auto' }}>
          {activeTab === 'history' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ background: '#C0C0C0' }}>
                  <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #808080' }}>時間</th>
                  <th style={{ padding: '4px', textAlign: 'center', borderBottom: '1px solid #808080', width: '60px' }}>積分</th>
                  <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #808080' }}>來源</th>
                  <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #808080' }}>說明</th>
                </tr>
              </thead>
              <tbody>
                {mockPointsHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                    <td style={{ padding: '4px', color: '#808080' }}>{item.created_at}</td>
                    <td style={{ 
                      padding: '4px', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: item.points > 0 ? '#008000' : '#800000'
                    }}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </td>
                    <td style={{ padding: '4px', color: getSourceColor(item.source_type) }}>
                      {getSourceIcon(item.source_type)}
                    </td>
                    <td style={{ padding: '4px' }}>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ background: '#C0C0C0' }}>
                  <th style={{ padding: '4px', textAlign: 'center', borderBottom: '1px solid #808080', width: '40px' }}>排名</th>
                  <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #808080' }}>姓名</th>
                  <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #808080' }}>部門</th>
                  <th style={{ padding: '4px', textAlign: 'right', borderBottom: '1px solid #808080', width: '80px' }}>積分</th>
                </tr>
              </thead>
              <tbody>
                {mockLeaderboard.map((item) => (
                  <tr 
                    key={item.rank} 
                    style={{ 
                      borderBottom: '1px solid #E0E0E0',
                      background: item.name === userProfile?.full_name ? '#FFFFCC' : 'transparent'
                    }}
                  >
                    <td style={{ 
                      padding: '4px', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: item.rank <= 3 ? 'var(--accent-red)' : 'var(--text-primary)'
                    }}>
                      {item.rank <= 3 ? `★${item.rank}` : item.rank}
                    </td>
                    <td style={{ padding: '4px', fontWeight: item.name === userProfile?.full_name ? 'bold' : 'normal' }}>
                      {item.name}
                      {item.name === userProfile?.full_name && ' (YOU)'}
                    </td>
                    <td style={{ padding: '4px', color: '#808080' }}>{item.department}</td>
                    <td style={{ 
                      padding: '4px', 
                      textAlign: 'right',
                      fontWeight: 'bold',
                      color: '#008000'
                    }}>
                      {item.points} PT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 說明區塊 */}
      <div className="window" style={{ marginTop: '8px' }}>
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '10px' }}>
          INFO - 積分說明
        </div>
        <div className="inset" style={{ padding: '8px', background: '#FFF', fontSize: '10px' }}>
          <div style={{ marginBottom: '4px' }}><span style={{ color: 'var(--accent-blue)' }}>[公告]</span> 閱讀公告可獲得 1 PT（每則公告限一次）</div>
          <div style={{ marginBottom: '4px' }}><span style={{ color: '#008080' }}>[任務]</span> 完成任務依難度獲得 10-100 PT</div>
          <div style={{ marginBottom: '4px' }}><span style={{ color: '#008000' }}>[獎勵]</span> 特殊表現或活動獎勵</div>
          <div><span style={{ color: '#800000' }}>[兌換]</span> 使用積分兌換福利（開發中）</div>
        </div>
      </div>
    </div>
  )
}










