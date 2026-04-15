'use client'

import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// 斷點說明：
// mobile: < 768px (手機)
// tablet: 768px - 1023px (平板 - Sidebar + 單頁切換)
// desktop: >= 1024px (桌面 - Win95 OS 體驗：Taskbar + Start Menu + 多視窗)

export function useDevice(): DeviceType {
  const [device, setDevice] = useState<DeviceType>('desktop')

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDevice('mobile')
      } else if (width < 1024) {
        setDevice('tablet')
      } else {
        setDevice('desktop')
      }
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return device
}










