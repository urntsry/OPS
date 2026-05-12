'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/home')
  }, [router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', background: '#008080' }}>
      <div>Redirecting to OPS Desktop...</div>
    </div>
  )
}
