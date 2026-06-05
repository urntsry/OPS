'use client'

import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import SalesDeliveryTab from './SalesDeliveryTab'

interface SalesPageProps {
  isAdmin?: boolean
}

export default function SalesPage({ isAdmin = false }: SalesPageProps) {
  void isAdmin
  const tabs: DepartmentTab[] = [
    { id: 'delivery', label: '交期表', show: true, component: <SalesDeliveryTab /> },
  ]

  return (
    <DepartmentShell
      departmentId="sales"
      departmentName="SALES - BUSINESS"
      tabs={tabs}
      defaultTab="delivery"
      statusInfo="MODULE: 交期表"
    />
  )
}
