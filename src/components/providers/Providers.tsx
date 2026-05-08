'use client'

import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/queryClient'
import { ToastContainer } from '@/components/feedback/Toast'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useI18nStore } from '@/stores/i18nStore'
import { restoreSession } from '@/lib/google-auth'
import { useUserPreferencesSync } from '@/hooks/useUserPreferencesSync'

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

function I18nHydrator() {
  useEffect(() => {
    useI18nStore.persist.rehydrate()
    const unsubscribe = useI18nStore.subscribe((state) => {
      document.documentElement.lang = state.appLocale
    })
    document.documentElement.lang = useI18nStore.getState().appLocale
    return unsubscribe
  }, [])
  return null
}

/** youtubeSettingsStore ↔ /api/user/preferences 양방향 동기화. QueryClientProvider 안쪽에서 mount되어야 함. */
function UserPreferencesSync() {
  useUserPreferencesSync()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient)
  return (
    <QueryClientProvider client={client}>
      <ThemeHydrator />
      <I18nHydrator />
      <AuthHydrator />
      <UserPreferencesSync />
      {children}
      <ToastContainer />
    </QueryClientProvider>
  )
}
