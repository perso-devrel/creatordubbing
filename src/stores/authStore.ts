'use client'

import { create } from 'zustand'
import type { GoogleUser } from '@/lib/firebase'

interface AuthState {
  user: GoogleUser | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: GoogleUser | null) => void
  setAccessToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setAccessToken: (token) => {
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('google_access_token', token)
    }
    set({ accessToken: token })
  },

  setLoading: (loading) => set({ isLoading: loading }),

  clear: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },
}))
