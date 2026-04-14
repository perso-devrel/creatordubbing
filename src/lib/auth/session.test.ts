import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { requireSession, forbiddenUidMismatch } from './session'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeReq(opts?: { cookie?: string; header?: string }): NextRequest {
  const req = new NextRequest('http://localhost/api/test')
  if (opts?.cookie) {
    req.cookies.set('google_access_token', opts.cookie)
  }
  if (opts?.header) {
    return new NextRequest('http://localhost/api/test', {
      headers: { 'x-google-access-token': opts.header },
    })
  }
  return req
}

describe('requireSession', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns 401 when no access token present', async () => {
    const req = makeReq()
    const result = await requireSession(req)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const body = await result.response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    }
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns session on valid Google tokeninfo', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sub: 'uid123',
        email: 'test@example.com',
        email_verified: 'true',
        expires_in: '3600',
      }),
    })

    const req = makeReq({ cookie: 'valid-token' })
    const result = await requireSession(req)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.session).toEqual({ uid: 'uid123', email: 'test@example.com' })
    }
  })

  it('returns 401 when Google tokeninfo rejects token', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    const req = makeReq({ cookie: 'expired-token' })
    const result = await requireSession(req)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const body = await result.response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toContain('Invalid or expired')
    }
  })

  it('returns 401 when tokeninfo lacks sub or email', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sub: '', email: '' }),
    })

    const req = makeReq({ cookie: 'incomplete-token' })
    const result = await requireSession(req)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const body = await result.response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toContain('missing required claims')
    }
  })

  it('returns 500 when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    const req = makeReq({ cookie: 'some-token' })
    const result = await requireSession(req)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(500)
      const body = await result.response.json()
      expect(body.error.code).toBe('AUTH_ERROR')
    }
  })

  it('reads token from x-google-access-token header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sub: 'uid456',
        email: 'header@example.com',
        email_verified: 'true',
        expires_in: '3600',
      }),
    })

    const req = makeReq({ header: 'header-token' })
    const result = await requireSession(req)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.session.uid).toBe('uid456')
    }
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('header-token'),
    )
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
