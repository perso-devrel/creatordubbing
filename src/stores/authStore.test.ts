import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    })
  })

  it('starts with null user and loading state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isLoading).toBe(true)
    expect(state.isAuthenticated).toBe(false)
  })

  it('setUser marks authenticated and stops loading', () => {
    const mockUser = { uid: 'u1', displayName: 'Test', email: 'test@test.com', photoURL: null } as never
    useAuthStore.getState().setUser(mockUser)

    const state = useAuthStore.getState()
    expect(state.user).toBe(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('setUser(null) clears authentication', () => {
    useAuthStore.getState().setUser({ uid: 'u1' } as never)
    useAuthStore.getState().setUser(null)

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('clear resets all state', () => {
    useAuthStore.getState().setUser({ uid: 'u1' } as never)
    useAuthStore.getState().clear()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('setLoading updates loading state', () => {
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})
