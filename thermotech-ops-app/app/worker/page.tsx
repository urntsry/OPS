'use client'

import { useState } from 'react'
import Button from '@/components/Button'
import Card from '@/components/Card'

export default function WorkerPage() {
  const [tasks] = useState([
    { id: 1, title: '出勤核對加班費', time: '08:00', points: 10, done: false, photo: false },
    { id: 2, title: '支援主管交辦事項', time: '09:00', points: 10, done: false, photo: false },
    { id: 3, title: '外出施工人員簽到', time: '10:00', points: 10, done: false, photo: false },
    { id: 4, title: '品質異常處理', time: '11:00', points: 50, done: false, photo: true },
    { id: 5, title: '316機台例行保養', time: '14:00', points: 20, done: false, photo: true },
  ])

  const doneCount = tasks.filter(t => t.done).length
  const totalPoints = 1250

  return (
    <div className="min-h-screen bg-grey-200 p-2">
      <div className="container">
        {/* Header */}
        <div className="window mb-2">
          <div className="titlebar">
            THERMOTECH-OPS - 作業員模式
          </div>
          <div className="p-2 flex justify-between items-center bg-grey-200">
            <div className="text-mono">
              USER: 張庭憲 (10003)
            </div>
            <div className="text-mono text-bold">
              POINTS: {totalPoints}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-3 mb-2">
          <div className="outset p-2 text-center">
            <div className="text-bold">{doneCount}</div>
            <div className="text-mono">已完成</div>
          </div>
          <div className="outset p-2 text-center">
            <div className="text-bold">{tasks.length - doneCount}</div>
            <div className="text-mono">待辦</div>
          </div>
          <div className="outset p-2 text-center">
            <div className="text-bold">0</div>
            <div className="text-mono">逾期</div>
          </div>
        </div>

        {/* Task List */}
        <Card title="今日任務">
          <table className="table">
            <thead>
              <tr>
                <th style={{width: '40px'}}>狀態</th>
                <th>工作內容</th>
                <th style={{width: '50px'}}>時間</th>
                <th style={{width: '50px'}}>積分</th>
                <th style={{width: '60px'}}>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="text-center text-mono">
                    {task.done ? '[V]' : '[ ]'}
                  </td>
                  <td>
                    {task.title}
                    {task.photo && <span className="text-mono"> [PHOTO]</span>}
                  </td>
                  <td className="text-mono text-center">{task.time}</td>
                  <td className="text-mono text-center">+{task.points}</td>
                  <td>
                    {!task.done && (
                      <Button className="text-xs p-1">完成</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Actions */}
        <div className="grid-2 mt-2">
          <Button className="p-4">緊急回報</Button>
          <Button className="p-4">查看記錄</Button>
        </div>

        {/* Status Bar */}
        <div className="statusbar mt-2">
          <span className="text-mono">DATE: 2025/11/25</span>
          <span className="text-mono">TIME: {new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-mono status-ok">ONLINE</span>
        </div>
      </div>
    </div>
  )
}
