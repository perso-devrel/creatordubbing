import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/queries', () => ({
  revokeUserSession: vi.fn(),
}))

vi.mock('@/lib/auth/session-cookie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session-cookie')>()
  return {
    ...actual,
    verifySessionCookiePayload: vi.fn(),
  }
})

import { POST } from './signout/route'
import { revokeUserSession } from '@/lib/db/queries'
import { verifySessionCookiePayload } from '@/lib/auth/session-cookie'

function req(cookie?: string) {
  return new NextRequest('http://localhost/api/auth/signout', {
    method: 'POST',
    headers: cookie ? { cookie } : undefined,
  })
}

describe('POST /api/auth/signout', () => {
  it('returns 200 with ok true', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: null })
  })

  it('clears dubtube_session cookie', async () => {
    const res = await POST(req())
    const setCookies = res.headers.getSetCookie()
    const sessionCookie = setCookies.find((c: string) =>
      c.startsWith('dubtube_session='),
    )
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie).toContain('Max-Age=0')
    expect(sessionCookie).toContain('HttpOnly')
    expect(sessionCookie).toContain('Path=/')
  })

  it('clears google_access_token cookie', async () => {
    const res = await POST(req())
    const setCookies = res.headers.getSetCookie()
    const tokenCookie = setCookies.find((c: string) =>
      c.startsWith('google_access_token='),
    )
    expect(tokenCookie).toBeDefined()
    expect(tokenCookie).toContain('Max-Age=0')
    expect(tokenCookie).toContain('HttpOnly')
  })

  it('sets SameSite=Lax on cleared cookies', async () => {
    const res = await POST(req())
    const setCookies = res.headers.getSetCookie()
    for (const cookie of setCookies) {
      expect(cookie.toLowerCase()).toContain('samesite=lax')
    }
  })

  it('revokes active server session when cookie has a session id', async () => {
    vi.mocked(verifySessionCookiePayload).mockResolvedValueOnce({
      uid: 'user1',
      sid: 'sid-1',
      exp: 9999999999,
      legacy: false,
    })
    const res = await POST(req('dubtube_session=signed'))
    expect(res.status).toBe(200)
    expect(revokeUserSession).toHaveBeenCalledWith('sid-1')
  })
})
