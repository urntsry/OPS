'use client'

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'thermotech-ops-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // 初始化時從 localStorage 讀取
  useEffect(() => {
    setMounted(true)
    
    // 檢查 localStorage
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    
    if (savedTheme) {
      setThemeState(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      // 檢查系統偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const defaultTheme: Theme = prefersDark ? 'dark' : 'light'
      setThemeState(defaultTheme)
      document.documentElement.setAttribute('data-theme', defaultTheme)
    }
  }, [])

  // 切換主題
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }, [])

  // 切換 light/dark
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }, [theme, setTheme])

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    mounted
  }
}









