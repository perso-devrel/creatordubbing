import { describe, it, expect } from 'vitest'
import { POST } from './signout/route'

describe('POST /api/auth/signout', () => {
  it('returns 200 with ok true', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: null })
  })

  it('clears creatordub_session cookie', async () => {
    const res = await POST()
    const setCookies = res.headers.getSetCookie()
    const sessionCookie = setCookies.find((c: string) =>
      c.startsWith('creatordub_session='),
    )
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie).toContain('Max-Age=0')
    expect(sessionCookie).toContain('HttpOnly')
    expect(sessionCookie).toContain('Path=/')
  })

  it('clears google_access_token cookie', async () => {
    const res = await POST()
    const setCookies = res.headers.getSetCookie()
    const tokenCookie = setCookies.find((c: string) =>
      c.startsWith('google_access_token='),
    )
    expect(tokenCookie).toBeDefined()
    expect(tokenCookie).toContain('Max-Age=0')
    expect(tokenCookie).toContain('HttpOnly')
  })

  it('sets SameSite=Lax on cleared cookies', async () => {
    const res = await POST()
    const setCookies = res.headers.getSetCookie()
    for (const cookie of setCookies) {
      expect(cookie.toLowerCase()).toContain('samesite=lax')
    }
  })
})
