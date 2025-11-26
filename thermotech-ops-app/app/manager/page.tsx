'use client'

import Card from '@/components/Card'
import Button from '@/components/Button'

export default function ManagerPage() {
  const stats = {
    pending: 150,
    completed: 45,
    overdue: 3,
    incidents: 2
  }

  const employees = [
    { name: '張庭憲', today: 5, todayDone: 2, tomorrow: 3, week: 15, month: 60 },
    { name: '潘育昌', today: 3, todayDone: 3, tomorrow: 2, week: 12, month: 50 },
    { name: '林珠華', today: 4, todayDone: 1, tomorrow: 4, week: 18, month: 55 },
    { name: '阮慧喬', today: 2, todayDone: 2, tomorrow: 1, week: 10, month: 45 },
  ]

  const leaderboard = [
    { rank: 1, name: '張庭憲', points: 1250, trend: '↑' },
    { rank: 2, name: '潘育昌', points: 1180, trend: '↓' },
    { rank: 3, name: '林珠華', points: 980, trend: '→' },
    { rank: 4, name: '阮慧喬', points: 850, trend: '↑' },
  ]

  return (
    <div className="min-h-screen bg-grey-200 p-2">
      <div className="container">
        {/* Header */}
        <div className="window mb-2">
          <div className="titlebar">
            THERMOTECH-OPS - 管理者模式
          </div>
          <div className="p-2 bg-grey-200">
            <div className="text-mono">ADMIN DASHBOARD | DATE: 2025/11/25 (週一)</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4 mb-2">
          <div className="outset p-2 text-center">
            <div className="text-bold text-lg">{stats.pending}</div>
            <div className="text-mono">待完成</div>
          </div>
          <div className="outset p-2 text-center bg-green-100">
            <div className="text-bold text-lg status-ok">{stats.completed}</div>
            <div className="text-mono">已完成</div>
          </div>
          <div className="outset p-2 text-center bg-red-100">
            <div className="text-bold text-lg status-err">{stats.overdue}</div>
            <div className="text-mono">逾期</div>
          </div>
          <div className="outset p-2 text-center bg-yellow-100">
            <div className="text-bold text-lg status-warn">{stats.incidents}</div>
            <div className="text-mono">異常</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid-2 mb-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Calendar */}
          <Card title="主管行事曆">
            <table className="table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>今日</th>
                  <th>明日</th>
                  <th>本週</th>
                  <th>本月</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
                  <tr key={idx}>
                    <td className="text-bold">{emp.name}</td>
                    <td className="text-mono text-center">
                      {emp.today}({emp.todayDone}V)
                    </td>
                    <td className="text-mono text-center">{emp.tomorrow}</td>
                    <td className="text-mono text-center">{emp.week}</td>
                    <td className="text-mono text-center">{emp.month}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Leaderboard */}
          <Card title="積分排行">
            <table className="table">
              <thead>
                <tr>
                  <th style={{width: '30px'}}>#</th>
                  <th>姓名</th>
                  <th>積分</th>
                  <th style={{width: '30px'}}>趨勢</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.rank}>
                    <td className="text-center text-bold">{entry.rank}</td>
                    <td>{entry.name}</td>
                    <td className="text-mono text-right">{entry.points}</td>
                    <td className="text-center text-bold">{entry.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid-4 mb-2">
          <Button className="p-4">新增交辦</Button>
          <Button className="p-4">人員管理</Button>
          <Button className="p-4">報表匯出</Button>
          <Button className="p-4">系統設定</Button>
        </div>

        {/* Status Bar */}
        <div className="statusbar">
          <span className="text-mono">LOGGED: ADMIN</span>
          <span className="text-mono">USERS: 21</span>
          <span className="text-mono">TASKS: {stats.pending + stats.completed}</span>
          <span className="text-mono status-ok">SYSTEM OK</span>
        </div>
      </div>
    </div>
  )
}
