'use client'

import DepartmentShell, { type DepartmentTab } from './DepartmentShell'

interface ReportPageProps {
  isAdmin?: boolean
}

function ReportDashboard() {
  return (
    <div>
      <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>REPORT CENTER</div>
        <div style={{ padding: '8px', background: 'var(--bg-inset)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {[
              { name: 'Daily Summary', desc: 'Auto-generated daily task completion report' },
              { name: 'Monthly Stats', desc: 'Monthly performance and attendance overview' },
              { name: 'Department KPI', desc: 'KPI tracking by department' },
              { name: 'Custom Report', desc: 'Build custom reports with filters' },
            ].map((r, i) => (
              <div key={i} className="outset" style={{ padding: '6px', cursor: 'pointer' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '2px' }}>{r.name}</div>
                <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportHistory() {
  return (
    <div className="window" style={{ padding: 0 }}>
      <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>REPORT HISTORY</div>
      <div style={{ padding: '12px', background: 'var(--bg-inset)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
        Generated report archive — coming soon.
      </div>
    </div>
  )
}

export default function ReportPage({ isAdmin = false }: ReportPageProps) {
  const tabs: DepartmentTab[] = [
    { id: 'dashboard', label: 'DASHBOARD', show: true, component: <ReportDashboard /> },
    { id: 'history',   label: 'HISTORY',   show: true, component: <ReportHistory /> },
  ]

  return (
    <DepartmentShell
      departmentId="report"
      departmentName="REPORT - ANALYTICS"
      tabs={tabs}
      defaultTab="dashboard"
      statusInfo="MODULE: Reporting"
    />
  )
}
