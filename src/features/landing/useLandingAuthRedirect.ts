'use client'

import { useCallback, useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocalePath'
import { useLocaleText } from '@/hooks/useLocaleText'
import { signInWithGoogle } from '@/lib/google-auth'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'

const SIGN_IN_REDIRECT_DELAY_MS = 900

export function useLandingAuthRedirect() {
  const [signingIn, setSigningIn] = useState(false)
  const router = useLocaleRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authLoading = useAuthStore((state) => state.isLoading)
  const addToast = useNotificationStore((state) => state.addToast)
  const t = useLocaleText()

  const navigateWithAuth = useCallback(async (returnTo: string) => {
    if (authLoading || signingIn) return

    if (isAuthenticated) {
      router.push(returnTo)
      return
    }

    addToast({
      type: 'info',
      title: t('features.landing.auth.signInRequired'),
      message: t('features.landing.auth.signInToUse'),
    })
    setSigningIn(true)

    try {
      await new Promise((resolve) => window.setTimeout(resolve, SIGN_IN_REDIRECT_DELAY_MS))
      await signInWithGoogle({ returnTo })
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : t('components.layout.landingNavBar.pleaseTryAgainShortlyContactUsIfThe')
      addToast({ type: 'error', title: t('components.layout.landingNavBar.couldNotSignIn'), message })
      setSigningIn(false)
    }
  }, [addToast, authLoading, isAuthenticated, router, signingIn, t])

  return {
    authLoading,
    navigateWithAuth,
    signingIn,
  }
}
