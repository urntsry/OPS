'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WindowState {
  id: string
  title: string
  isOpen: boolean
  isMinimized: boolean
  isMaximized: boolean
  isFullscreen: boolean
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

export interface WindowConfig {
  id: string
  title: string
  defaultWidth: number
  defaultHeight: number
  type: 'internal' | 'external'
  externalUrl?: string
  fullscreenDefault?: boolean
  hidden?: boolean
}

export const WINDOW_CONFIGS: WindowConfig[] = [
  // Active modules
  { id: 'hr', title: 'HR - PERSONNEL', defaultWidth: 700, defaultHeight: 500, type: 'internal' },
  { id: 'meeting', title: 'MEETING - 會議', defaultWidth: 800, defaultHeight: 550, type: 'internal' },
  { id: 'fax', title: 'FAX - 傳真中心', defaultWidth: 1100, defaultHeight: 720, type: 'internal' },
  { id: 'settings', title: 'CONFIG - SETTINGS', defaultWidth: 750, defaultHeight: 500, type: 'internal' },
  { id: 'manager', title: 'MANAGER - 管理監控', defaultWidth: 900, defaultHeight: 600, type: 'internal' },
  { id: 'points', title: 'POINTS - 積分中心', defaultWidth: 550, defaultHeight: 450, type: 'internal' },
  { id: 'appcenter', title: 'APP CENTER - 軟體中心', defaultWidth: 700, defaultHeight: 500, type: 'internal' },

  // Hidden — under construction
  { id: 'operations', title: 'OPS - FACTORY', defaultWidth: 600, defaultHeight: 400, type: 'internal', hidden: true },
  { id: 'sales', title: 'SALES - BUSINESS', defaultWidth: 600, defaultHeight: 400, type: 'internal', hidden: true },
  { id: 'reports', title: 'REPORT - ANALYTICS', defaultWidth: 600, defaultHeight: 400, type: 'internal', hidden: true },
  { id: 'devtracker', title: 'DEV TRACKER', defaultWidth: 800, defaultHeight: 500, type: 'internal', hidden: true },

  // External Apps
  { id: 'capacity', title: 'CAPACITY - 產能系統', defaultWidth: 900, defaultHeight: 600, type: 'external', externalUrl: 'https://ca-chi.vercel.app', fullscreenDefault: false },
]

export function getWindowConfig(id: string): WindowConfig | undefined {
  return WINDOW_CONFIGS.find(c => c.id === id)
}

const TASKBAR_HEIGHT = 28

let globalZCounter = 10

function getCenterPosition(width: number, height: number): { x: number; y: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  return {
    x: Math.max(0, Math.round((vw - width) / 2)),
    y: Math.max(0, Math.round((vh - height - TASKBAR_HEIGHT) / 2)),
  }
}

interface WindowManagerStore {
  windows: Record<string, WindowState>
  activeWindowId: string | null

  openWindow: (id: string) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  maximizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  toggleMaximize: (id: string) => void
  toggleFullscreen: (id: string) => void
  focusWindow: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  resizeWindow: (id: string, w: number, h: number) => void
  toggleMinimizeRestore: (id: string) => void
}

export const useWindowManager = create<WindowManagerStore>()(persist((set, get) => ({
  windows: {},
  activeWindowId: null,

  openWindow: (id: string) => {
    const { windows } = get()
    const config = WINDOW_CONFIGS.find(c => c.id === id)
    if (!config) return

    if (windows[id]?.isOpen) {
      if (windows[id].isMinimized) {
        get().restoreWindow(id)
      } else {
        get().focusWindow(id)
      }
      return
    }

    globalZCounter++

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const maxW = Math.max(320, vw - 20)
    const maxH = Math.max(240, vh - TASKBAR_HEIGHT - 20)
    const w = Math.min(config.defaultWidth, maxW)
    const h = Math.min(config.defaultHeight, maxH)
    const pos = getCenterPosition(w, h)
    const x = pos.x
    const y = pos.y

    set({
      windows: {
        ...windows,
        [id]: {
          id,
          title: config.title,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          isFullscreen: config.fullscreenDefault || false,
          x,
          y,
          width: w,
          height: h,
          zIndex: globalZCounter,
        },
      },
      activeWindowId: id,
    })
  },

  closeWindow: (id: string) => {
    const { windows, activeWindowId } = get()
    if (!windows[id]) return

    const updated = { ...windows }
    updated[id] = { ...updated[id], isOpen: false, isMinimized: false, isMaximized: false, isFullscreen: false }

    const newActive = activeWindowId === id
      ? Object.values(updated)
          .filter(w => w.isOpen && !w.isMinimized && w.id !== id)
          .sort((a, b) => b.zIndex - a.zIndex)[0]?.id || null
      : activeWindowId

    set({ windows: updated, activeWindowId: newActive })
  },

  minimizeWindow: (id: string) => {
    const { windows, activeWindowId } = get()
    if (!windows[id]) return

    const updated = { ...windows }
    updated[id] = { ...updated[id], isMinimized: true, isFullscreen: false }

    const newActive = activeWindowId === id
      ? Object.values(updated)
          .filter(w => w.isOpen && !w.isMinimized && w.id !== id)
          .sort((a, b) => b.zIndex - a.zIndex)[0]?.id || null
      : activeWindowId

    set({ windows: updated, activeWindowId: newActive })
  },

  maximizeWindow: (id: string) => {
    const { windows } = get()
    if (!windows[id]) return

    globalZCounter++
    const updated = { ...windows }
    updated[id] = { ...updated[id], isMaximized: true, isMinimized: false, isFullscreen: false, zIndex: globalZCounter }

    set({ windows: updated, activeWindowId: id })
  },

  restoreWindow: (id: string) => {
    const { windows } = get()
    if (!windows[id]) return

    globalZCounter++
    const updated = { ...windows }
    updated[id] = { ...updated[id], isMaximized: false, isMinimized: false, isFullscreen: false, zIndex: globalZCounter }

    set({ windows: updated, activeWindowId: id })
  },

  toggleMaximize: (id: string) => {
    const { windows } = get()
    if (!windows[id]) return
    if (windows[id].isMaximized) {
      get().restoreWindow(id)
    } else {
      get().maximizeWindow(id)
    }
  },

  toggleFullscreen: (id: string) => {
    const { windows } = get()
    if (!windows[id]) return

    globalZCounter++
    const updated = { ...windows }
    const isFs = updated[id].isFullscreen
    updated[id] = {
      ...updated[id],
      isFullscreen: !isFs,
      isMaximized: false,
      isMinimized: false,
      zIndex: globalZCounter,
    }

    set({ windows: updated, activeWindowId: id })
  },

  focusWindow: (id: string) => {
    const { windows, activeWindowId } = get()
    if (!windows[id] || activeWindowId === id) return

    globalZCounter++
    const updated = { ...windows }
    updated[id] = { ...updated[id], zIndex: globalZCounter, isMinimized: false }

    set({ windows: updated, activeWindowId: id })
  },

  moveWindow: (id: string, x: number, y: number) => {
    const { windows } = get()
    if (!windows[id]) return

    const updated = { ...windows }
    updated[id] = { ...updated[id], x, y }

    set({ windows: updated })
  },

  resizeWindow: (id: string, w: number, h: number) => {
    const { windows } = get()
    if (!windows[id]) return

    const updated = { ...windows }
    updated[id] = { ...updated[id], width: Math.max(280, w), height: Math.max(200, h) }

    set({ windows: updated })
  },

  toggleMinimizeRestore: (id: string) => {
    const { windows, activeWindowId } = get()
    if (!windows[id]) return

    if (windows[id].isMinimized) {
      get().restoreWindow(id)
    } else if (activeWindowId === id) {
      get().minimizeWindow(id)
    } else {
      get().focusWindow(id)
    }
  },
}), {
  name: 'ops-window-state',
  partialize: (state) => ({
    windows: state.windows,
    activeWindowId: state.activeWindowId,
  }),
  onRehydrateStorage: () => {
    return (state) => {
      if (state?.windows) {
        const maxZ = Math.max(10, ...Object.values(state.windows).map(w => w.zIndex))
        globalZCounter = maxZ
      }
    }
  },
}))

export { TASKBAR_HEIGHT }
