'use client'

import { type FormEvent, useState } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { isValidYouTubeUrl } from '@/utils/validators'
import { useLocaleText } from '@/hooks/useLocaleText'
import { useLocaleRouter } from '@/hooks/useLocalePath'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { signInWithGoogle } from '@/lib/google-auth'

const SIGN_IN_REDIRECT_DELAY_MS = 900

export function HeroUrlInput() {
  const [url, setUrl] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const router = useLocaleRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authLoading = useAuthStore((state) => state.isLoading)
  const addToast = useNotificationStore((state) => state.addToast)
  const isValid = url.length > 0 && isValidYouTubeUrl(url)
  const t = useLocaleText()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isValid || authLoading || signingIn) return

    const returnTo = `/dubbing?url=${encodeURIComponent(url)}`
    if (isAuthenticated) {
      router.push(returnTo)
      return
    }

    addToast({
      type: 'info',
      title: t('features.landing.heroUrlInput.signInRequired'),
      message: t('features.landing.heroUrlInput.signInWithGoogleToContinue'),
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
  }

  return (
    <form className="mt-10 max-w-xl" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2 rounded-lg border border-surface-200 bg-white p-2 shadow-sm dark:border-surface-800 dark:bg-surface-900 sm:flex-row">
        <Input
          placeholder={t('features.landing.heroUrlInput.pasteAYouTubeLink')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0"
          icon={<Play className="h-4 w-4" />}
        />
        <Button type="submit" className="shrink-0" disabled={!isValid || authLoading} loading={signingIn}>
          {t('features.landing.heroUrlInput.startDubbing')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
