/**
 * Google OAuth direct sign-in (no Firebase SDK).
 * Redirect-based flow: navigates main window to Google, returns via /auth/callback.
 */
'use client'

import {
  DEFAULT_APP_LOCALE,
  getLocaleFromCookieString,
  getPathLocale,
  withSafeLocalePath,
} from '@/lib/i18n/config'

export interface GoogleUser {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
}

export type GoogleAuthScopeMode = 'login' | 'youtube-write' | 'youtube-readonly'

const STORAGE_KEY_USER = 'google_user'
const STORAGE_KEY_OAUTH_STATE = 'oauth_state'
const STORAGE_KEY_OAUTH_SCOPE_MODE = 'oauth_scope_mode'
const STORAGE_KEY_OAUTH_RETURN = 'oauth_return_to'

const BASE_SCOPES = ['openid', 'email', 'profile'] as const
const YOUTUBE_WRITE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
] as const
const YOUTUBE_READONLY_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'] as const

function getGoogleScopes(mode: GoogleAuthScopeMode): readonly string[] {
  switch (mode) {
    case 'youtube-write':
      return [...BASE_SCOPES, ...YOUTUBE_WRITE_SCOPES, ...YOUTUBE_READONLY_SCOPES]
    case 'youtube-readonly':
      return [...BASE_SCOPES, ...YOUTUBE_READONLY_SCOPES]
    case 'login':
    default:
      return BASE_SCOPES
  }
}

function getStoredUser(): GoogleUser | null {
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

function getCurrentLocale() {
  return getPathLocale(window.location.pathname) ??
    getLocaleFromCookieString(document.cookie) ??
    DEFAULT_APP_LOCALE
}

function getCurrentReturnPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

/**
 * Navigates the current window to Google's OAuth consent screen.
 * Returns a Promise that never resolves on the calling side (page is leaving).
 * The flow completes in /auth/callback via completeGoogleSignIn().
 */
export function signInWithGoogle(
  options: { forceConsent?: boolean; scopeMode?: GoogleAuthScopeMode; returnTo?: string } = {}
): Promise<never> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) {
    return Promise.reject(new Error('Google 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.'))
  }

  const scopeMode: GoogleAuthScopeMode = options.scopeMode ?? 'login'
  const redirectUri = `${window.location.origin}/auth/callback`
  const scope = getGoogleScopes(scopeMode).join(' ')
  const stateNonce = crypto.randomUUID()
  const returnTo = withSafeLocalePath(options.returnTo ?? getCurrentReturnPath(), getCurrentLocale(), '/dashboard')

  sessionStorage.setItem(STORAGE_KEY_OAUTH_STATE, stateNonce)
  sessionStorage.setItem(STORAGE_KEY_OAUTH_SCOPE_MODE, scopeMode)
  sessionStorage.setItem(STORAGE_KEY_OAUTH_RETURN, returnTo)

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

  window.location.href = authUrl
  return new Promise<never>(() => {})
}

/**
 * Completes the OAuth flow inside /auth/callback after Google redirects back.
 * Validates state, exchanges code via the server, stores user locally, and
 * returns the user along with the original scopeMode and returnTo destination.
 */
export async function completeGoogleSignIn(): Promise<{
  user: GoogleUser
  scopeMode: GoogleAuthScopeMode
  returnTo: string
}> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const errorParam = params.get('error')

  const expectedState = sessionStorage.getItem(STORAGE_KEY_OAUTH_STATE)
  const scopeMode = (sessionStorage.getItem(STORAGE_KEY_OAUTH_SCOPE_MODE) as GoogleAuthScopeMode) || 'login'
  const returnTo = sessionStorage.getItem(STORAGE_KEY_OAUTH_RETURN) || '/dashboard'

  sessionStorage.removeItem(STORAGE_KEY_OAUTH_STATE)
  sessionStorage.removeItem(STORAGE_KEY_OAUTH_SCOPE_MODE)
  sessionStorage.removeItem(STORAGE_KEY_OAUTH_RETURN)

  if (errorParam) {
    throw new Error('Google 인증을 완료하지 못했습니다. 다시 시도해 주세요.')
  }
  if (!code) {
    throw new Error('인증 코드를 받지 못했습니다.')
  }
  if (!expectedState || state !== expectedState) {
    throw new Error('로그인 요청을 확인할 수 없습니다. 다시 시도해 주세요.')
  }

  const redirectUri = `${window.location.origin}/auth/callback`
  const res = await fetch('/api/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri, scopeMode }),
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
  return { user, scopeMode, returnTo }
}

export function signOut(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_USER)
}

export function restoreSession(): { user: GoogleUser | null } {
  return { user: getStoredUser() }
}
