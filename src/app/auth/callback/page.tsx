'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'

// Google OAuth popup callback.
// Google redirects here with ?code=... — pass to opener via postMessage then close.
export default function AuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (window.opener) {
      window.opener.postMessage(
        { type: 'google_oauth_callback', code, error },
        window.location.origin,
      )
    }
    window.close()
  }, [])

  return null
}
