import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from './themeStore'

function mockSystemTheme(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('themeStore', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    mockSystemTheme(false)
    useThemeStore.setState({ preference: 'system', mode: 'light' })
  })

  it('defaults to system preference and starts from the current html theme class', () => {
    expect(useThemeStore.getState().preference).toBe('system')
    expect(useThemeStore.getState().mode).toBe('light')
  })

  it('toggle switches from dark to light', () => {
    useThemeStore.getState().setMode('dark')
    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().preference).toBe('light')
    expect(useThemeStore.getState().mode).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle switches from light to dark', () => {
    useThemeStore.setState({ preference: 'system', mode: 'light' })
    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setMode sets specific mode', () => {
    useThemeStore.getState().setMode('light')
    expect(useThemeStore.getState().preference).toBe('light')
    expect(useThemeStore.getState().mode).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setMode to dark adds dark class', () => {
    useThemeStore.getState().setMode('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    useThemeStore.getState().setMode('dark')
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setPreference follows system dark mode', () => {
    mockSystemTheme(true)
    useThemeStore.getState().setPreference('system')
    expect(useThemeStore.getState().preference).toBe('system')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('syncSystemMode updates only system preference', () => {
    mockSystemTheme(true)
    useThemeStore.getState().syncSystemMode()
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    mockSystemTheme(false)
    useThemeStore.getState().setMode('dark')
    useThemeStore.getState().syncSystemMode()
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('onRehydrateStorage applies explicit dark class for legacy dark mode', async () => {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('dubtube-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 }))
    await useThemeStore.persist.rehydrate()
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('onRehydrateStorage resolves system preference from matchMedia', async () => {
    mockSystemTheme(true)
    document.documentElement.classList.remove('dark')
    localStorage.setItem('dubtube-theme', JSON.stringify({ state: { preference: 'system', mode: 'light' }, version: 1 }))
    await useThemeStore.persist.rehydrate()
    expect(useThemeStore.getState().preference).toBe('system')
    expect(useThemeStore.getState().mode).toBe('dark')
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
