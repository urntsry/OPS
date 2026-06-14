'use client'

import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import SalesDeliveryTab from './SalesDeliveryTab'
import WorkTasksTab from './WorkTasksTab'

interface SalesPageProps {
  isAdmin?: boolean
  userProfile?: { id?: string; full_name?: string; role?: string } | null
}

export default function SalesPage({ isAdmin = false, userProfile }: SalesPageProps) {
  void isAdmin
  const tabs: DepartmentTab[] = [
    { id: 'tasks', label: '任務', show: true, component: <WorkTasksTab userProfile={userProfile} /> },
    { id: 'delivery', label: '交期表', show: true, component: <SalesDeliveryTab /> },
  ]

  return (
    <DepartmentShell
      departmentId="sales"
      departmentName="SALES - BUSINESS"
      tabs={tabs}
      defaultTab="tasks"
      statusInfo="MODULE: 業務"
    />
  )
}
