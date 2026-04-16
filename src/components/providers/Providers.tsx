'use client'

import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/queryClient'
import { ToastContainer } from '@/components/feedback/Toast'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { restoreSession } from '@/lib/google-auth'

function ThemeHydrator() {
  useEffect(() => {
    useThemeStore.persist.rehydrate()
  }, [])
  return null
}

function AuthHydrator() {
  useEffect(() => {
    const { user } = restoreSession()
    const auth = useAuthStore.getState()
    if (user) {
      auth.setUser(user)
      fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }),
      })
        .then((res) => {
          if (res.status === 401) {
            // Token expired and refresh failed — clear session so user can re-login
            auth.clear()
          }
        })
        .catch(() => {})
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
