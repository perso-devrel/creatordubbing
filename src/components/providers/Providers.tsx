'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/queryClient'
import { ToastContainer } from '@/components/feedback/Toast'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useI18nStore } from '@/stores/i18nStore'
import { restoreSession, signOut as clearStoredGoogleUser } from '@/lib/google-auth'
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
          if (res.ok) {
            auth.setUser(user)
          } else {
            clearStoredGoogleUser()
            auth.clear()
          }
        })
        .catch(() => {
          clearStoredGoogleUser()
          auth.clear()
        })
    } else {
      auth.setLoading(false)
    }
  }, [])
  return null
}

function I18nHydrator() {
  const pathname = usePathname()

  useEffect(() => {
    useI18nStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    const applyDocumentLang = (state = useI18nStore.getState()) => {
      document.documentElement.lang = pathname === '/privacy' || pathname === '/terms' ? 'ko' : state.appLocale
    }

    applyDocumentLang()
    const unsubscribe = useI18nStore.subscribe(applyDocumentLang)
    return unsubscribe
  }, [pathname])
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
