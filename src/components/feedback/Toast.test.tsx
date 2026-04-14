import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ToastContainer } from './Toast'
import { useNotificationStore } from '@/stores/notificationStore'

describe('ToastContainer', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll()
  })

  afterEach(cleanup)

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />)
    expect(container.innerHTML).toBe('')
  })

  it('renders toasts with aria-live="polite"', () => {
    useNotificationStore.getState().addToast({ type: 'info', title: 'Hello' })
    render(<ToastContainer />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('false')
    expect(screen.getByText('Hello')).toBeTruthy()
  })

  it('renders toast with message', () => {
    useNotificationStore.getState().addToast({ type: 'success', title: 'Done', message: 'All good' })
    render(<ToastContainer />)
    expect(screen.getByText('Done')).toBeTruthy()
    expect(screen.getByText('All good')).toBeTruthy()
  })

  it('renders close button with aria-label', () => {
    useNotificationStore.getState().addToast({ type: 'error', title: 'Err' })
    render(<ToastContainer />)
    expect(screen.getByLabelText('알림 닫기')).toBeTruthy()
  })
})
