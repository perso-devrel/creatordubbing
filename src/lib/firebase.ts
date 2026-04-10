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

const STORAGE_KEY_TOKEN = 'google_access_token'
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

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY_TOKEN)
}

function storeUser(user: GoogleUser) {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
}

export async function signInWithGoogle(): Promise<{
  user: GoogleUser
  accessToken: string
}> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID를 .env.local에 설정해주세요')

  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin
    const scope = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ].join(' ')

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scope)}` +
      `&include_granted_scopes=true` +
      `&prompt=consent`

    const popup = window.open(authUrl, 'google_auth', 'width=500,height=600')
    if (!popup) {
      reject(new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.'))
      return
    }

    const timer = setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(timer)
          reject(new Error('로그인이 취소되었습니다.'))
          return
        }

        const url = popup.location.href
        if (url.startsWith(redirectUri)) {
          clearInterval(timer)
          popup.close()

          const hash = new URL(url).hash.substring(1)
          const params = new URLSearchParams(hash)
          const accessToken = params.get('access_token')

          if (!accessToken) {
            reject(new Error('인증 토큰을 받지 못했습니다.'))
            return
          }

          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (!res.ok) throw new Error('유저 정보를 가져올 수 없습니다.')
          const info = await res.json()

          const user: GoogleUser = {
            uid: info.sub,
            email: info.email,
            displayName: info.name || null,
            photoURL: info.picture || null,
          }

          localStorage.setItem(STORAGE_KEY_TOKEN, accessToken)
          storeUser(user)

          resolve({ user, accessToken })
        }
      } catch {
        // Cross-origin — popup still on Google's domain, keep waiting
      }
    }, 500)
  })
}

export function signOut(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_TOKEN)
  localStorage.removeItem(STORAGE_KEY_USER)
}

export function restoreSession(): { user: GoogleUser | null; accessToken: string | null } {
  const user = getStoredUser()
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_TOKEN) : null
  return { user, accessToken }
}

export type User = GoogleUser
