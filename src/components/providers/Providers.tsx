'use client'

import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/queryClient'
import { ToastContainer } from '@/components/feedback/Toast'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { restoreSession } from '@/lib/firebase'

function ThemeHydrator() {
  useEffect(() => {
    useThemeStore.persist.rehydrate()
    const mode = useThemeStore.getState().mode
    const root = document.documentElement
    if (mode === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [])
  return null
}

function AuthHydrator() {
  useEffect(() => {
    const { user, accessToken } = restoreSession()
    const auth = useAuthStore.getState()
    if (user) {
      auth.setUser(user)
      if (accessToken) auth.setAccessToken(accessToken)
      // Sync to DB (best-effort)
      fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          accessToken,
        }),
      }).catch(() => {})
    } else {
      auth.setLoading(false)
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient)
  return (
    <QueryClientProvider client={client}>
      <ThemeHydrator />
      <AuthHydrator />
      {children}
      <ToastContainer />
    </QueryClientProvider>
  )
}
