'use client'

import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import AnnouncementManagementPage from './AnnouncementManagementPage'
import AnnouncementReviewPage from './AnnouncementReviewPage'
import HRNotificationPage from './HRNotificationPage'

interface HRPageProps {
  isAdmin?: boolean
  userProfile?: any
}

// ============================================
// HR Dashboard — overview / quick stats
// ============================================
function HRDashboard() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
        <StatCard label="EMPLOYEES" value="--" color="var(--accent-blue)" />
        <StatCard label="PENDING REVIEW" value="--" color="var(--status-warning)" />
        <StatCard label="EXPIRING SOON" value="--" color="var(--status-error)" />
      </div>

      <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>RECENT ACTIVITY</div>
        <div style={{ padding: '8px', background: 'var(--bg-inset)', minHeight: '80px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
          Dashboard data will be populated as modules are connected.
        </div>
      </div>

      <div className="window" style={{ padding: 0 }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>QUICK ACTIONS</div>
        <div style={{ padding: '6px', background: 'var(--bg-inset)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>+ New Bulletin</button>
          <button className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>Send LINE Push</button>
          <button className="btn" style={{ fontSize: '9px', padding: '2px 8px' }}>Export Report</button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="window" style={{ padding: 0 }}>
      <div style={{ padding: '6px 8px', background: 'var(--bg-inset)', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color, fontFamily: 'monospace' }}>{value}</div>
        <div style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{label}</div>
      </div>
    </div>
  )
}

// ============================================
// HR Records — employee data management
// ============================================
function HRRecords() {
  return (
    <div>
      <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>
          <span>EMPLOYEE RECORDS</span>
        </div>
        <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <button className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>ALL</button>
            <button className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>LABOR INS.</button>
            <button className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>HEALTH INS.</button>
            <button className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>PENSION</button>
            <button className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>FOREIGN</button>
          </div>
          <div className="inset" style={{ padding: '1px', background: 'var(--bg-inset)', minHeight: '120px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'var(--bg-window)' }}>
                  <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '60px' }}>EMP ID</th>
                  <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)' }}>NAME</th>
                  <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', width: '60px' }}>DEPT</th>
                  <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '50px' }}>STATUS</th>
                  <th style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-mid-dark)', width: '70px' }}>EXPIRY</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>Connect employee database to display records.</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', justifyContent: 'flex-end' }}>
            <button className="btn" style={{ fontSize: '8px', padding: '1px 8px' }}>IMPORT</button>
            <button className="btn" style={{ fontSize: '8px', padding: '1px 8px' }}>EXPORT</button>
          </div>
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
      <div className="window" style={{ padding: 0, marginBottom: '6px' }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>HR TOOLS</div>
        <div style={{ padding: '6px', background: 'var(--bg-inset)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {[
              { name: 'Payroll Generator', desc: 'Generate monthly payroll reports' },
              { name: 'Contract Template', desc: 'Generate employment contracts' },
              { name: 'Attendance Import', desc: 'Import attendance data from CSV' },
              { name: 'Insurance Calculator', desc: 'Calculate NHI/Labor insurance' },
            ].map((tool, idx) => (
              <div key={idx} className="outset" style={{ padding: '6px', cursor: 'pointer' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '2px' }}>{tool.name}</div>
                <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{tool.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HR Page — main component using DepartmentShell
// ============================================
export default function HRPage({ isAdmin = false, userProfile }: HRPageProps) {
  const tabs: DepartmentTab[] = [
    { id: 'dashboard', label: 'DASHBOARD', show: true,    component: <HRDashboard /> },
    { id: 'records',   label: 'RECORDS',   show: true,    component: <HRRecords /> },
    { id: 'bulletin',  label: 'BULLETIN',  show: true,    component: <AnnouncementManagementPage isAdmin={isAdmin} /> },
    { id: 'line',      label: 'LINE PUSH', show: true,    component: <HRNotificationPage /> },
    { id: 'tools',     label: 'TOOLS',     show: isAdmin, component: <HRTools /> },
    { id: 'review',    label: 'REVIEW',    show: isAdmin, badge: 0, component: <AnnouncementReviewPage /> },
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
