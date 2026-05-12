'use client'

import { useState, useEffect } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import { getPointsHistory, getLeaderboard, getPointsStats, getRewards, type PointsTransaction, type LeaderboardEntry, type PointsStats, type PointsReward } from '@/lib/pointsApi'

interface PointsPageProps {
  userProfile: {
    id: string
    full_name: string
    employee_id: string
    department: string
    points_balance: number
  } | null
}

export default function PointsPage({ userProfile }: PointsPageProps) {
  const [history, setHistory] = useState<PointsTransaction[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [rewards, setRewards] = useState<PointsReward[]>([])
  const [stats, setStats] = useState<PointsStats>({ announcement: 0, task: 0, bonus: 0, redemption: 0, penalty: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile?.id) loadData()
  }, [userProfile?.id])

  async function loadData() {
    setLoading(true)
    try {
      const [historyData, leaderData, statsData, rewardsData] = await Promise.all([
        getPointsHistory(userProfile!.id),
        getLeaderboard(),
        getPointsStats(userProfile!.id),
        getRewards(),
      ])
      setHistory(historyData)
      setLeaderboard(leaderData)
      setStats(statsData)
      setRewards(rewardsData)
    } catch (err) {
      console.error('[Points] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const myRank = leaderboard.findIndex(e => e.id === userProfile?.id) + 1

  const tabs: DepartmentTab[] = [
    { id: 'history', label: 'HISTORY', show: true, component: <HistoryTab history={history} stats={stats} loading={loading} /> },
    { id: 'leaderboard', label: 'LEADERBOARD', show: true, component: <LeaderboardTab leaderboard={leaderboard} userId={userProfile?.id} loading={loading} /> },
    { id: 'rewards', label: 'REWARDS', show: true, badge: rewards.length > 0 ? rewards.length : undefined, component: <RewardsTab rewards={rewards} balance={userProfile?.points_balance || 0} loading={loading} /> },
  ]

  return (
    <DepartmentShell
      departmentId="points"
      departmentName="POINTS - 積分中心"
      tabs={tabs}
      defaultTab="history"
      statusInfo={`BALANCE: ${userProfile?.points_balance || 0} PT | RANK: #${myRank || '--'} | 公告:+${stats.announcement} 任務:+${stats.task} 獎勵:+${stats.bonus}`}
    />
  )
}

const thStyle: React.CSSProperties = {
  padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold',
}

function getSourceLabel(type: string): { label: string; color: string } {
  switch (type) {
    case 'announcement_read': return { label: '公告', color: 'var(--accent-blue)' }
    case 'task_complete': return { label: '任務', color: '#008080' }
    case 'bonus': return { label: '獎勵', color: '#008000' }
    case 'redemption': return { label: '兌換', color: '#800000' }
    case 'penalty': return { label: '扣分', color: '#800000' }
    default: return { label: '--', color: 'var(--text-primary)' }
  }
}

// ---- HISTORY TAB ----
function HistoryTab({ history, stats, loading }: { history: PointsTransaction[]; stats: PointsStats; loading: boolean }) {
  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '4px', fontSize: '8px', color: 'var(--text-muted)' }}>
        <span>公告: <b style={{ color: 'var(--accent-blue)' }}>+{stats.announcement}</b></span>
        <span>任務: <b style={{ color: '#008080' }}>+{stats.task}</b></span>
        <span>獎勵: <b style={{ color: '#008000' }}>+{stats.bonus}</b></span>
        <span>兌換: <b style={{ color: '#800000' }}>{stats.redemption}</b></span>
      </div>

      {history.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>尚無積分紀錄</div>
      ) : (
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '400px', overflow: 'hidden auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-window)' }}>
                <th style={{ ...thStyle, width: '85px' }}>時間</th>
                <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>積分</th>
                <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>來源</th>
                <th style={thStyle}>說明</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => {
                const src = getSourceLabel(item.source_type)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', color: item.points > 0 ? '#008000' : '#800000' }}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: src.color, fontSize: '8px' }}>{src.label}</td>
                    <td style={{ padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- LEADERBOARD TAB ----
function LeaderboardTab({ leaderboard, userId, loading }: { leaderboard: LeaderboardEntry[]; userId?: string; loading: boolean }) {
  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  return (
    <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: 'var(--bg-window)' }}>
            <th style={{ ...thStyle, width: '35px', textAlign: 'center' }}>#</th>
            <th style={thStyle}>姓名</th>
            <th style={{ ...thStyle, width: '60px' }}>部門</th>
            <th style={{ ...thStyle, width: '55px', textAlign: 'right' }}>總積分</th>
            <th style={{ ...thStyle, width: '50px', textAlign: 'right' }}>本月</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, idx) => (
            <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-light)', background: entry.id === userId ? 'rgba(0,0,128,0.05)' : 'transparent' }}>
              <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', color: idx < 3 ? 'var(--status-error)' : 'var(--text-muted)' }}>{idx + 1}</td>
              <td style={{ padding: '2px 4px', fontWeight: entry.id === userId ? 'bold' : 'normal' }}>
                {entry.full_name}{entry.id === userId ? ' ◄' : ''}
              </td>
              <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{entry.department || '--'}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold', color: '#008000' }}>{entry.total_points}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', color: '#008080' }}>+{entry.month_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---- REWARDS TAB ----
function RewardsTab({ rewards, balance, loading }: { rewards: PointsReward[]; balance: number; loading: boolean }) {
  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>
  if (rewards.length === 0) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>尚無可兌換獎勵</div>

  return (
    <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: 'var(--bg-window)' }}>
            <th style={thStyle}>獎勵名稱</th>
            <th style={thStyle}>說明</th>
            <th style={{ ...thStyle, width: '55px', textAlign: 'center' }}>所需積分</th>
            <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>庫存</th>
            <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>兌換</th>
          </tr>
        </thead>
        <tbody>
          {rewards.map(r => {
            const canRedeem = balance >= r.points_cost && (r.stock === null || r.stock > 0)
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{r.name}</td>
                <td style={{ padding: '2px 4px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '--'}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', color: '#800000' }}>{r.points_cost}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>{r.stock ?? '∞'}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  <button className="btn" style={{ fontSize: '8px', padding: '1px 4px' }} disabled={!canRedeem}>兌換</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
