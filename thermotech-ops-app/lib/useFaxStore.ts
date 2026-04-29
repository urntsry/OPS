'use client'

import { create } from 'zustand'
import { getFaxes } from './faxApi'

/**
 * Lightweight global store for FAX unhandled count.
 * Used by Taskbar (badge) + InboxTab so a "MARK HANDLED" click in
 * one place updates the badge instantly (optimistic), without waiting
 * for Supabase Realtime to round-trip.
 */
interface FaxState {
  unhandledCount: number
  isFlashing: boolean
  lastSyncAt: number
  refresh: () => Promise<void>
  decrement: () => void
  increment: () => void
  setCount: (n: number) => void
  triggerFlash: () => void
}

export const useFaxStore = create<FaxState>((set, get) => ({
  unhandledCount: 0,
  isFlashing: false,
  lastSyncAt: 0,

  // Authoritative refresh (call on mount, on Realtime tick, periodically)
  refresh: async () => {
    try {
      const faxes = await getFaxes(200)
      const unhandled = faxes.filter(f =>
        !f.is_handled && (f.status === 'analyzed' || f.status === 'pending' || f.status === 'analyzing')
      ).length
      const prev = get().unhandledCount
      set({ unhandledCount: unhandled, lastSyncAt: Date.now() })
      // Flash badge if new ones arrived
      if (unhandled > prev && prev > 0) {
        set({ isFlashing: true })
        setTimeout(() => set({ isFlashing: false }), 5000)
      }
    } catch { /* silent */ }
  },

  // Optimistic: user just marked one handled, drop count by 1 right away
  decrement: () => {
    const cur = get().unhandledCount
    if (cur > 0) set({ unhandledCount: cur - 1 })
  },

  // Optimistic: user just unmarked or new fax arrived
  increment: () => {
    set({ unhandledCount: get().unhandledCount + 1 })
  },

  setCount: (n: number) => set({ unhandledCount: Math.max(0, n) }),

  triggerFlash: () => {
    set({ isFlashing: true })
    setTimeout(() => set({ isFlashing: false }), 5000)
  },
}))
