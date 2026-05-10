'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/queryClient'
import { ToastContainer } from '@/components/feedback/Toast'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useI18nStore } from '@/stores/i18nStore'
import { restoreSession, signOut as clearStoredGoogleUser } from '@/lib/google-auth'
import { useUserPreferencesSync } from '@/hooks/useUserPreferencesSync'
import {
  getPathLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  stripLocalePrefix,
  withLocalePath,
  type AppLocale,
} from '@/lib/i18n/config'

function writeLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`
}

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
  const router = useRouter()
  const initializedRef = useRef(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let canceled = false

    const applyDocumentLang = (state = useI18nStore.getState()) => {
      document.documentElement.lang = state.appLocale
      writeLocaleCookie(state.appLocale)
    }

    const currentLocalizedPath = () => {
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
      return stripLocalePrefix(current || '/')
    }

    Promise.resolve(useI18nStore.persist.rehydrate()).finally(() => {
      if (canceled) return

      const routeLocale = getPathLocale(window.location.pathname)
      if (routeLocale) {
        useI18nStore.getState().setAppLocale(routeLocale)
      }

      applyDocumentLang()
      initializedRef.current = true

      unsubscribe = useI18nStore.subscribe((state) => {
        applyDocumentLang(state)

        const routeLocale = getPathLocale(window.location.pathname)
        if (routeLocale && routeLocale !== state.appLocale) {
          router.replace(withLocalePath(currentLocalizedPath(), state.appLocale))
        }
      })
    })

    return () => {
      canceled = true
      initializedRef.current = false
      unsubscribe?.()
    }
  }, [router])

  useEffect(() => {
    if (!initializedRef.current) return
    const routeLocale = getPathLocale(pathname)
    if (routeLocale && useI18nStore.getState().appLocale !== routeLocale) {
      useI18nStore.getState().setAppLocale(routeLocale)
    }
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
