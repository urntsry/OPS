'use client'

import DepartmentShell, { type DepartmentTab } from './DepartmentShell'

interface SalesPageProps {
  isAdmin?: boolean
}

function SalesDashboard() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
        {[
          { label: 'MONTHLY ORDERS', value: '--', color: 'var(--accent-blue)' },
          { label: 'REVENUE', value: '--', color: 'var(--status-success)' },
          { label: 'PENDING QUOTES', value: '--', color: 'var(--status-warning)' },
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
        <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>SALES PIPELINE</div>
        <div style={{ padding: '12px', background: 'var(--bg-inset)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
          Sales pipeline and CRM module — coming soon.
        </div>
      </div>
    </div>
  )
}

function ClientRecords() {
  return (
    <div className="window" style={{ padding: 0 }}>
      <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>CLIENT DATABASE</div>
      <div style={{ padding: '12px', background: 'var(--bg-inset)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
        Client management and contact records — connect database to populate.
      </div>
    </div>
  )
}

function QuoteManager() {
  return (
    <div className="window" style={{ padding: 0 }}>
      <div className="titlebar" style={{ padding: '1px 6px', fontSize: '9px' }}>QUOTATION MANAGER</div>
      <div style={{ padding: '12px', background: 'var(--bg-inset)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>
        Quote creation, tracking and follow-up — coming soon.
      </div>
    </div>
  )
}

export default function SalesPage({ isAdmin = false }: SalesPageProps) {
  const tabs: DepartmentTab[] = [
    { id: 'dashboard', label: 'DASHBOARD', show: true, component: <SalesDashboard /> },
    { id: 'clients',   label: 'CLIENTS',   show: true, component: <ClientRecords /> },
    { id: 'quotes',    label: 'QUOTES',    show: true, component: <QuoteManager /> },
  ]

  return (
    <DepartmentShell
      departmentId="sales"
      departmentName="SALES - BUSINESS"
      tabs={tabs}
      defaultTab="dashboard"
      statusInfo="MODULE: Sales"
    />
  )
}
