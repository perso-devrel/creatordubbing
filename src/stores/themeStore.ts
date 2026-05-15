'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark'
export type ThemePreference = 'system' | ThemeMode

interface ThemeState {
  mode: ThemeMode
  preference: ThemePreference
  toggle: () => void
  setMode: (mode: ThemeMode) => void
  setPreference: (preference: ThemePreference) => void
  syncSystemMode: () => void
}

function applyMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

function getSystemMode(): ThemeMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveMode(preference: ThemePreference): ThemeMode {
  return preference === 'system' ? getSystemMode() : preference
}

function getInitialMode(): ThemeMode {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function normalizePreference(value: unknown, fallback: ThemePreference = 'system'): ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark' ? value : fallback
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      mode: getInitialMode(),
      toggle: () =>
        set((state) => {
          const next = state.mode === 'dark' ? 'light' : 'dark'
          applyMode(next)
          return { preference: next, mode: next }
        }),
      setMode: (mode) => {
        applyMode(mode)
        set({ preference: mode, mode })
      },
      setPreference: (preference) => {
        const mode = resolveMode(preference)
        applyMode(mode)
        set({ preference, mode })
      },
      syncSystemMode: () => {
        set((state) => {
          if (state.preference !== 'system') return {}
          const mode = resolveMode('system')
          applyMode(mode)
          return state.mode === mode ? {} : { mode }
        })
      },
    }),
    {
      name: 'sub2tube-theme',
      version: 1,
      skipHydration: true,
      migrate: (persistedState) => {
        const state = persistedState as Partial<ThemeState> | undefined
        if (!state) return persistedState
        const legacyMode = state.mode === 'light' || state.mode === 'dark' ? state.mode : undefined
        const preference = normalizePreference(state.preference, legacyMode ?? 'system')
        const mode = resolveMode(preference)
        return { ...state, preference, mode }
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const preference = normalizePreference(state.preference, normalizePreference(state.mode))
        const mode = resolveMode(preference)
        state.preference = preference
        state.mode = mode
        applyMode(mode)
      },
    },
  ),
)
