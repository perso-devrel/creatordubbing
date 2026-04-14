import 'server-only'

import { getUserTokens, updateUserTokens } from '@/lib/db/queries'
import { getServerEnv, getClientEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REFRESH_BUFFER_MS = 5 * 60 * 1000

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  return Date.now() >= new Date(expiresAt).getTime() - REFRESH_BUFFER_MS
}

export async function refreshGoogleToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const serverEnv = getServerEnv()
  const clientEnv = getClientEnv()

  if (!serverEnv.GOOGLE_CLIENT_SECRET) return null

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: serverEnv.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    logger.warn('google token refresh failed', { status: res.status })
    return null
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

export async function getOrRefreshAccessToken(
  userId: string,
): Promise<string | null> {
  const tokens = await getUserTokens(userId)
  if (!tokens) return null

  if (tokens.accessToken && !isTokenExpired(tokens.tokenExpiresAt)) {
    return tokens.accessToken
  }

  if (!tokens.refreshToken) return tokens.accessToken

  const refreshed = await refreshGoogleToken(tokens.refreshToken)
  if (!refreshed) return tokens.accessToken

  const expiresAt = new Date(
    Date.now() + refreshed.expiresIn * 1000,
  ).toISOString()
  await updateUserTokens(userId, refreshed.accessToken, expiresAt)

  return refreshed.accessToken
}
