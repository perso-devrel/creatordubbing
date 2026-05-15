import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session-cookie', () => ({
  verifySessionCookiePayload: vi.fn(),
}))

vi.mock('@/lib/auth/token-refresh', () => ({
  getOrRefreshAccessToken: vi.fn(),
}))

vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  isUserSessionActive: vi.fn(),
}))

import { requireSession, forbiddenUidMismatch } from './session'
import { verifySessionCookiePayload } from '@/lib/auth/session-cookie'
import { getOrRefreshAccessToken } from '@/lib/auth/token-refresh'
import { getUser, isUserSessionActive } from '@/lib/db/queries'

function makeReq(cookie?: string): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: cookie ? { cookie } : undefined,
  })
}

describe('requireSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no app session cookie exists', async () => {
    const result = await requireSession(makeReq())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const body = await result.response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns 401 when the app session cookie is invalid', async () => {
    vi.mocked(verifySessionCookiePayload).mockResolvedValueOnce(null)

    const result = await requireSession(makeReq('sub2tube_session=bad'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const body = await result.response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns 401 when a non-legacy server session was revoked', async () => {
    vi.mocked(verifySessionCookiePayload).mockResolvedValueOnce({
      uid: 'user-1',
      sid: 'sid-1',
      exp: 9999999999,
      legacy: false,
    })
    vi.mocked(isUserSessionActive).mockResolvedValueOnce(false)

    const result = await requireSession(makeReq('sub2tube_session=signed'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }
  })

  it('returns session from DB user when app session is active', async () => {
    vi.mocked(verifySessionCookiePayload).mockResolvedValueOnce({
      uid: 'user-1',
      sid: 'sid-1',
      exp: 9999999999,
      legacy: false,
    })
    vi.mocked(isUserSessionActive).mockResolvedValueOnce(true)
    vi.mocked(getOrRefreshAccessToken).mockResolvedValueOnce('google-token')
    vi.mocked(getUser).mockResolvedValueOnce({ email: 'test@example.com' } as never)

    const result = await requireSession(makeReq('sub2tube_session=signed'))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.session).toEqual({ uid: 'user-1', email: 'test@example.com' })
    }
  })

  it('keeps app session valid even when Google token refresh fails', async () => {
    vi.mocked(verifySessionCookiePayload).mockResolvedValueOnce({
      uid: 'user-2',
      sid: 'sid-2',
      exp: 9999999999,
      legacy: false,
    })
    vi.mocked(isUserSessionActive).mockResolvedValueOnce(true)
    vi.mocked(getOrRefreshAccessToken).mockResolvedValueOnce(null)
    vi.mocked(getUser).mockResolvedValueOnce({ email: 'no-token@example.com' } as never)

    const result = await requireSession(makeReq('sub2tube_session=signed'))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.session).toEqual({ uid: 'user-2', email: 'no-token@example.com' })
    }
  })
})

describe('forbiddenUidMismatch', () => {
  it('returns 403 with FORBIDDEN code', async () => {
    const res = forbiddenUidMismatch()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('FORBIDDEN')
  })
})
