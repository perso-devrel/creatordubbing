'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Google OAuth popup callback page.
// Google redirects here with ?code=... — we pass it to the opener via postMessage then close.
export default function AuthCallbackPage() {
  const params = useSearchParams()

  useEffect(() => {
    const code = params.get('code')
    const error = params.get('error')

    if (window.opener) {
      window.opener.postMessage(
        { type: 'google_oauth_callback', code, error },
        window.location.origin,
      )
    }
    window.close()
  }, [params])

  return null
}
