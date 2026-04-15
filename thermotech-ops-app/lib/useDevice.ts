'use client'

import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// 斷點說明：
// mobile: < 768px (手機)
// tablet: 768px - 1399px (平板 & 較小桌面視窗 - 行事曆全寬，任務在下方)
// desktop: >= 1400px (大桌面 - 行事曆+右側任務列表並排)

export function useDevice(): DeviceType {
  const [device, setDevice] = useState<DeviceType>('desktop')

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDevice('mobile')
      } else if (width < 1400) {
        // 768-1399: 使用平板佈局 (行事曆全寬優先)
        setDevice('tablet')
      } else {
        // >= 1400: 大桌面才使用並排佈局
        setDevice('desktop')
      }
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return device
}










