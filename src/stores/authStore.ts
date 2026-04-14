'use client'

import { create } from 'zustand'
import type { GoogleUser } from '@/lib/google-auth'

interface AuthState {
  user: GoogleUser | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: GoogleUser | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  clear: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },
}))
