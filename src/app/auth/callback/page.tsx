'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useLocaleText } from '@/hooks/useLocaleText'

// Google OAuth popup callback.
// Google redirects here with ?code=... — pass to opener via postMessage then close.
export default function AuthCallbackPage() {
  const t = useLocaleText()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    const state = params.get('state')

    if (window.opener) {
      window.opener.postMessage(
        { type: 'google_oauth_callback', code, error, state },
        window.location.origin,
      )
    }
    window.close()
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50 px-6 text-center text-sm text-surface-600 dark:bg-surface-950 dark:text-surface-300">
      {t('app.auth.callback.page.processingLogin')}
    </main>
  )
}
