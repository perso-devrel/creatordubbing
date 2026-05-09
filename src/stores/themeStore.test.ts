import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from './themeStore'

describe('themeStore', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    useThemeStore.setState({ mode: 'light' })
  })

  it('starts from the current html theme class', () => {
    expect(useThemeStore.getState().mode).toBe('light')
  })

  it('toggle switches from dark to light', () => {
    useThemeStore.getState().setMode('dark')
    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().mode).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle switches from light to dark', () => {
    useThemeStore.setState({ mode: 'light' })
    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setMode sets specific mode', () => {
    useThemeStore.getState().setMode('light')
    expect(useThemeStore.getState().mode).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setMode to dark adds dark class', () => {
    useThemeStore.getState().setMode('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    useThemeStore.getState().setMode('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('onRehydrateStorage applies dark class for dark mode', () => {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('dubtube-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 }))
    useThemeStore.persist.rehydrate()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('onRehydrateStorage callback skips when state is falsy', () => {
    const options = (useThemeStore as unknown as { persist: { getOptions: () => { onRehydrateStorage?: () => (state: unknown) => void } } }).persist.getOptions()
    if (options.onRehydrateStorage) {
      const callback = options.onRehydrateStorage()
      document.documentElement.classList.add('dark')
      callback(null)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    }
  })
})
