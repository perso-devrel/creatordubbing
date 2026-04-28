'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  mode: 'light' | 'dark'
  toggle: () => void
  setMode: (mode: 'light' | 'dark') => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      toggle: () =>
        set((state) => {
          const next = state.mode === 'dark' ? 'light' : 'dark'
          document.documentElement.classList.toggle('dark', next === 'dark')
          return { mode: next }
        }),
      setMode: (mode) => {
        document.documentElement.classList.toggle('dark', mode === 'dark')
        set({ mode })
      },
    }),
    {
      name: 'dubtube-theme',
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', state.mode === 'dark')
        }
      },
    },
  ),
)
