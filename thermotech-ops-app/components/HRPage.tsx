'use client'

import { useState, useEffect } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import AnnouncementManagementPage from './AnnouncementManagementPage'
import HRNotificationPage from './HRNotificationPage'
import HROvertimeTab from './HROvertimeTab'
import HRAttendanceTab from './HRAttendanceTab'
import HRBonusTab from './HRBonusTab'
import HRRecordsGrid from './HRRecordsGrid'
import { getHRProfiles, getHREvents, getUpcomingExpirations, type HREvent, type ExpirationAlert } from '@/lib/hrApi'

interface HRPageProps {
  isAdmin?: boolean
  userProfile?: any
}

const hrThStyle: React.CSSProperties = {
  padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold',
}

// ============================================
// HR Dashboard — overview / quick stats
// ============================================
function HRDashboard() {
  const [stats, setStats] = useState({ employees: 0, expiring: 0, events: 0 })
  const [expirations, setExpirations] = useState<ExpirationAlert[]>([])
  const [recentEvents, setRecentEvents] = useState<HREvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [profiles, expData, events] = await Promise.all([
        getHRProfiles(true),
        getUpcomingExpirations(),
        getHREvents(),
      ])
      setStats({ employees: profiles.length, expiring: expData.length, events: events.length })
      setExpirations(expData.slice(0, 5))
      setRecentEvents(events.slice(0, 5))
    } catch (err) {
      console.error('[HR Dashboard] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function getExpiryLabel(type: string): string {
    switch (type) {
      case 'labor_insurance': return '勞保'
      case 'health_insurance': return '健保'
      case 'contract': return '合約'
      default: return type
    }
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>

  return (
    <div>
      {/* Summary row — inline text */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '6px', fontSize: '8px', color: 'var(--text-muted)' }}>
        <span>Employees: <b style={{ color: 'var(--accent-blue)' }}>{stats.employees}</b></span>
        <span>Expiring(30d): <b style={{ color: 'var(--status-warning)' }}>{stats.expiring}</b></span>
        <span>Events(30d): <b style={{ color: 'var(--text-primary)' }}>{stats.events}</b></span>
      </div>

      {/* Expiration Alerts */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '2px' }}>EXPIRATION ALERTS - 到期提醒（30天內）</div>
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '180px', overflow: 'hidden auto' }}>
          {expirations.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>30天內無到期項目</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: 'var(--bg-window)' }}>
                  <th style={hrThStyle}>姓名</th>
                  <th style={{ ...hrThStyle, width: '60px' }}>部門</th>
                  <th style={{ ...hrThStyle, width: '50px', textAlign: 'center' }}>類型</th>
                  <th style={{ ...hrThStyle, width: '80px', textAlign: 'center' }}>到期日</th>
                </tr>
              </thead>
              <tbody>
                {expirations.map((exp, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{exp.full_name}</td>
                    <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{exp.department || '--'}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--status-warning)', fontSize: '8px' }}>{getExpiryLabel(exp.expiry_type)}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--status-error)' }}>{exp.expiry_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Events */}
      <div>
        <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '2px' }}>RECENT EVENTS - 近期人事異動</div>
        <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '200px', overflow: 'hidden auto' }}>
          {recentEvents.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>尚無人事記錄</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: 'var(--bg-window)' }}>
                  <th style={{ ...hrThStyle, width: '80px' }}>日期</th>
                  <th style={hrThStyle}>姓名</th>
                  <th style={{ ...hrThStyle, width: '60px', textAlign: 'center' }}>類型</th>
                  <th style={hrThStyle}>說明</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map(ev => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{ev.event_date}</td>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{(ev.profile as any)?.full_name || '--'}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--accent-blue)', fontSize: '8px' }}>{ev.event_type}</td>
                    <td style={{ padding: '2px 4px' }}>{ev.description || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// HR Tools — file utilities
// ============================================
function HRTools() {
  return (
    <div>
      <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '4px' }}>HR TOOLS - 人事工具</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {[
          { name: 'Payroll Generator', desc: '產生月薪資報表' },
          { name: 'Contract Template', desc: '產生僱用合約' },
          { name: 'Attendance Import', desc: '匯入出勤 CSV 資料' },
          { name: 'Insurance Calculator', desc: '計算勞/健保費用' },
        ].map((tool, idx) => (
          <div key={idx} className="inset" style={{ padding: '6px', cursor: 'pointer', background: 'var(--bg-inset)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '9px', fontFamily: 'monospace', marginBottom: '2px' }}>{tool.name}</div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{tool.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// HR Page — main component using DepartmentShell
// ============================================
export default function HRPage({ isAdmin = false, userProfile }: HRPageProps) {
  const hasHRAccess = isAdmin || userProfile?.hr_access === true

  const tabs: DepartmentTab[] = [
    { id: 'dashboard', label: 'DASHBOARD', show: true,        component: <HRDashboard /> },
    { id: 'records',   label: 'RECORDS',   show: hasHRAccess, component: <HRRecordsGrid /> },
    { id: 'overtime',  label: 'OVERTIME',  show: hasHRAccess, component: <HROvertimeTab /> },
    { id: 'attendance',label: 'ATTENDANCE',show: hasHRAccess, component: <HRAttendanceTab /> },
    { id: 'bonus',     label: 'BONUS',     show: hasHRAccess, component: <HRBonusTab /> },
    { id: 'bulletin',  label: 'BULLETIN',  show: hasHRAccess, component: <AnnouncementManagementPage isAdmin={isAdmin} userProfile={userProfile} /> },
    // LINE PUSH 已停用：公告系統的「發布時推播 LINE」已取代此功能
    { id: 'line',      label: 'LINE PUSH', show: false,       component: <HRNotificationPage /> },
    { id: 'tools',     label: 'TOOLS',     show: isAdmin,     component: <HRTools /> },
  ]

  return (
    <DepartmentShell
      departmentId="hr"
      departmentName="HR - PERSONNEL"
      tabs={tabs}
      defaultTab="dashboard"
      statusInfo="MODULE: Human Resources"
    />
  )
}
