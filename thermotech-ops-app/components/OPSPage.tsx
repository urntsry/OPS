'use client'

import DepartmentShell, { type DepartmentTab } from './DepartmentShell'

interface OPSPageProps {
  isAdmin?: boolean
  userProfile?: any
}

function OPSDashboard() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
        {[
          { label: 'LINES ACTIVE', value: '--', color: 'var(--status-success)' },
          { label: 'DAILY OUTPUT', value: '--', color: 'var(--accent-blue)' },
          { label: 'DEFECT RATE', value: '--', color: 'var(--status-warning)' },
          { label: 'PENDING ISSUES', value: '--', color: 'var(--status-error)' },
        ].map((s, i) => (
          <div key={i} className="window" style={{ padding: 0 }}>
            <div style={{ padding: '6px', background: 'var(--bg-inset)', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="window" style={{ padding: 0 }}>
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>PRODUCTION STATUS</div>
        <div style={{ padding: '12px', background: 'var(--bg-inset)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
          Production monitoring module — coming soon.
        </div>
      </div>
    </div>
  )
}

function ProductionRecords() {
  return (
    <div className="window" style={{ padding: 0 }}>
      <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>PRODUCTION RECORDS</div>
      <div style={{ padding: '12px', background: 'var(--bg-inset)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
        Production log and output records — connect database to populate.
      </div>
    </div>
  )
}

function QualityControl() {
  return (
    <div className="window" style={{ padding: 0 }}>
      <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>QUALITY CONTROL</div>
      <div style={{ padding: '12px', background: 'var(--bg-inset)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
        QC inspection records and defect tracking — coming soon.
      </div>
    </div>
  )
}

function OPSTools() {
  return (
    <div className="window" style={{ padding: 0 }}>
      <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>OPS TOOLS</div>
      <div style={{ padding: '6px', background: 'var(--bg-inset)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {[
          { name: 'Batch Tracker', desc: 'Track production batches' },
          { name: 'Machine Log', desc: 'Equipment maintenance records' },
          { name: 'Material Calc', desc: 'Raw material calculator' },
          { name: 'Shift Planner', desc: 'Shift scheduling tool' },
        ].map((t, i) => (
          <div key={i} className="outset" style={{ padding: '6px', cursor: 'pointer' }}>
            <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '2px' }}>{t.name}</div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OPSPage({ isAdmin = false }: OPSPageProps) {
  const tabs: DepartmentTab[] = [
    { id: 'dashboard',  label: 'DASHBOARD',  show: true,    component: <OPSDashboard /> },
    { id: 'production', label: 'PRODUCTION', show: true,    component: <ProductionRecords /> },
    { id: 'quality',    label: 'QUALITY',    show: true,    component: <QualityControl /> },
    { id: 'tools',      label: 'TOOLS',      show: isAdmin, component: <OPSTools /> },
  ]

  return (
    <DepartmentShell
      departmentId="ops"
      departmentName="OPS - FACTORY"
      tabs={tabs}
      defaultTab="dashboard"
      statusInfo="MODULE: Operations"
    />
  )
}
