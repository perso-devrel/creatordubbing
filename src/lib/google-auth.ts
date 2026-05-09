/**
 * Google OAuth direct sign-in (no Firebase SDK).
 * Client-only — uses popup + window.localStorage.
 */
'use client'

export interface GoogleUser {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
}

const STORAGE_KEY_USER = 'google_user'

export function getStoredUser(): GoogleUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function storeUser(user: GoogleUser) {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
}

export async function signInWithGoogle(options: { forceConsent?: boolean } = {}): Promise<{
  user: GoogleUser
}> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('Google 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.')

  return new Promise((resolve, reject) => {
    const redirectUri = `${window.location.origin}/auth/callback`
    const scope = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ].join(' ')

    const stateNonce = crypto.randomUUID()
    sessionStorage.setItem('oauth_state', stateNonce)

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&include_granted_scopes=true` +
      `&prompt=${options.forceConsent ? 'consent' : 'select_account'}` +
      `&state=${encodeURIComponent(stateNonce)}`

    const popup = window.open(authUrl, 'google_auth', 'width=500,height=600')
    if (!popup) {
      reject(new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.'))
      return
    }

    // Use postMessage instead of polling popup.location (avoids COOP issues)
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'google_oauth_callback') return

      window.removeEventListener('message', onMessage)
      clearInterval(closedTimer)

      const { code, error, state: returnedState } = event.data

      if (error) {
        reject(new Error('Google 인증을 완료하지 못했습니다. 다시 시도해 주세요.'))
        return
      }
      if (!code) {
        reject(new Error('인증 코드를 받지 못했습니다.'))
        return
      }

      const expectedState = sessionStorage.getItem('oauth_state')
      sessionStorage.removeItem('oauth_state')
      if (!expectedState || returnedState !== expectedState) {
        reject(new Error('로그인 요청을 확인할 수 없습니다. 다시 시도해 주세요.'))
        return
      }

      try {
        const res = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error?.message || '인증에 실패했습니다.')
        }

        const body = await res.json()
        const data = body.data

        const user: GoogleUser = {
          uid: data.id,
          email: data.email,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
        }

        storeUser(user)
        resolve({ user })
      } catch (err) {
        reject(err)
      }
    }

    window.addEventListener('message', onMessage)

    // Detect manual close without completing auth
    const closedTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(closedTimer)
        window.removeEventListener('message', onMessage)
        reject(new Error('로그인이 취소되었습니다.'))
      }
    }, 500)
  })
}

export function signOut(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_USER)
}

export function restoreSession(): { user: GoogleUser | null } {
  return { user: getStoredUser() }
}
