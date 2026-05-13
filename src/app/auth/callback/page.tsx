'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { completeGoogleSignIn } from '@/lib/google-auth'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useLocaleText } from '@/hooks/useLocaleText'

async function hasConnectedYouTubeChannel(): Promise<boolean> {
  try {
    const res = await fetch('/api/youtube/stats?channel=true', { cache: 'no-store' })
    const body = (await res.json().catch(() => null)) as { ok?: boolean; data?: unknown } | null
    return res.ok && body?.ok === true && !!body.data
  } catch {
    return false
  }
}

export default function AuthCallbackPage() {
  const t = useLocaleText()
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

        // YouTube reconnect flow: just go back wherever the user came from.
        if (scopeMode === 'youtube-write' || scopeMode === 'youtube-readonly') {
          window.location.replace(returnTo)
          return
        }

        // Initial login: nudge user to connect YouTube if they haven't yet.
        const connected = await hasConnectedYouTubeChannel()
        if (cancelled) return

        if (!connected) {
          addToast({
            type: 'info',
            title: t('components.layout.landingNavBar.connectYouTubeChannel'),
            message: t('components.layout.landingNavBar.connectYouTubeChannelInSettings'),
          })
          window.location.replace('/settings?section=youtube')
          return
        }

        const isLandingReturn = returnTo === '/' || returnTo === '' || returnTo.startsWith('/?')
        window.location.replace(isLandingReturn ? '/dashboard' : returnTo)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : t('components.layout.landingNavBar.pleaseTryAgainShortlyContactUsIfThe')
        setErrorMessage(message)
        addToast({
          type: 'error',
          title: t('components.layout.landingNavBar.couldNotSignIn'),
          message,
        })
        window.setTimeout(() => {
          if (!cancelled) window.location.replace('/')
        }, 2000)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [addToast, t])

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50 px-6 text-center text-sm text-surface-600 dark:bg-surface-950 dark:text-surface-300">
      {errorMessage ?? t('app.auth.callback.page.processingLogin')}
    </main>
  )
}
