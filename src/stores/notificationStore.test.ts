import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useNotificationStore } from './notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useNotificationStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty toasts', () => {
    expect(useNotificationStore.getState().toasts).toEqual([])
  })

  it('addToast adds a toast with auto-generated id', () => {
    useNotificationStore.getState().addToast({ type: 'success', title: 'Done' })

    const toasts = useNotificationStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].title).toBe('Done')
    expect(toasts[0].id).toMatch(/^toast-\d+$/)
  })

  it('auto-removes toast after duration', () => {
    useNotificationStore.getState().addToast({ type: 'info', title: 'Temp', duration: 2000 })
    expect(useNotificationStore.getState().toasts).toHaveLength(1)

    vi.advanceTimersByTime(2000)
    expect(useNotificationStore.getState().toasts).toHaveLength(0)
  })

  it('removeToast removes specific toast', () => {
    useNotificationStore.getState().addToast({ type: 'error', title: 'Err', duration: 0 })
    const id = useNotificationStore.getState().toasts[0].id

    useNotificationStore.getState().removeToast(id)
    expect(useNotificationStore.getState().toasts).toHaveLength(0)
  })

  it('clearAll removes all toasts', () => {
    useNotificationStore.getState().addToast({ type: 'info', title: 'A', duration: 0 })
    useNotificationStore.getState().addToast({ type: 'info', title: 'B', duration: 0 })
    expect(useNotificationStore.getState().toasts).toHaveLength(2)

    useNotificationStore.getState().clearAll()
    expect(useNotificationStore.getState().toasts).toHaveLength(0)
  })
})
