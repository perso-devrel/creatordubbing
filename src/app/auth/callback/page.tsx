'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { completeGoogleSignIn } from '@/lib/google-auth'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import {
  DEFAULT_APP_LOCALE,
  getLocaleFromCookieString,
  getPathLocale,
  isSafeLocalPath,
  stripLocalePrefix,
  withLocalePath,
  withSafeLocalePath,
  type AppLocale,
} from '@/lib/i18n/config'

async function hasConnectedYouTubeChannel(): Promise<boolean> {
  try {
    const res = await fetch('/api/youtube/stats?channel=true', { cache: 'no-store' })
    const body = (await res.json().catch(() => null)) as { ok?: boolean; data?: unknown } | null
    return res.ok && body?.ok === true && !!body.data
  } catch {
    return false
  }
}

function getRedirectLocale(returnTo: string, fallback: AppLocale): AppLocale {
  return getPathLocale(returnTo) ??
    getPathLocale(window.location.pathname) ??
    getLocaleFromCookieString(document.cookie) ??
    fallback ??
    DEFAULT_APP_LOCALE
}

function isLandingPath(path: string): boolean {
  if (!isSafeLocalPath(path)) return false
  const [pathWithoutHash] = path.split('#')
  const [pathname] = pathWithoutHash.split('?')
  return stripLocalePrefix(pathname || '/') === '/'
}

export default function AuthCallbackPage() {
  const t = useLocaleText()
  const appLocale = useAppLocale()
  const addToast = useNotificationStore((s) => s.addToast)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const finishedRef = useRef(false)

  useEffect(() => {
    if (finishedRef.current) return
    finishedRef.current = true

    let cancelled = false

    ;(async () => {
      try {
        const { user, scopeMode, returnTo } = await completeGoogleSignIn()
        if (cancelled) return

        useAuthStore.getState().setUser(user)
        const redirectLocale = getRedirectLocale(returnTo, appLocale)

        // YouTube reconnect flow: just go back wherever the user came from.
        if (scopeMode === 'youtube-write' || scopeMode === 'youtube-readonly') {
          window.location.replace(withSafeLocalePath(returnTo, redirectLocale, '/settings?section=youtube'))
          return
        }

        // Initial login: nudge user to connect YouTube if they haven't yet.
        const connected = await hasConnectedYouTubeChannel()
        if (cancelled) return

        if (!connected) {
          addToast({
            type: 'info',
            title: t('app.auth.callback.page.connectYouTubeChannel'),
            message: t('app.auth.callback.page.connectYouTubeChannelInSettings'),
          })
          window.location.replace(withLocalePath('/settings?section=youtube', redirectLocale))
          return
        }

        const normalizedReturnTo = withSafeLocalePath(returnTo, redirectLocale, '/dashboard')
        window.location.replace(isLandingPath(normalizedReturnTo) ? withLocalePath('/dashboard', redirectLocale) : normalizedReturnTo)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : t('app.auth.callback.page.tryAgainShortly')
        setErrorMessage(message)
        addToast({
          type: 'error',
          title: t('app.auth.callback.page.couldNotSignIn'),
          message,
        })
        window.setTimeout(() => {
          if (!cancelled) window.location.replace(withLocalePath('/', appLocale))
        }, 2000)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [addToast, appLocale, t])

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50 px-6 text-center text-sm text-surface-600 dark:bg-surface-950 dark:text-surface-300">
      {errorMessage ?? t('app.auth.callback.page.processingLogin')}
    </main>
  )
}
