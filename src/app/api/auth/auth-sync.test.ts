import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/queries', () => ({
  upsertUser: vi.fn(),
  createUserSession: vi.fn(),
}))

vi.mock('@/lib/auth/session-cookie', () => ({
  SESSION_COOKIE: 'dubtube_session',
  SESSION_TTL_SECONDS: 604800,
  createSessionCookie: vi.fn((uid: string) => ({
    cookie: `${uid}.fakesig`,
    sessionId: `sid-${uid}`,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  })),
  verifySessionCookie: vi.fn(),
}))

vi.mock('@/lib/auth/token-refresh', () => ({
  getOrRefreshAccessToken: vi.fn(),
}))

import { POST } from './sync/route'
import { createUserSession, upsertUser } from '@/lib/db/queries'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockGoogleUserinfo(sub: string, email: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ sub, email }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/sync', () => {
  it('returns 400 for missing uid', async () => {
    const res = await POST(makeReq({ email: 'a@b.com' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.error.code).toBe('BAD_REQUEST')
  })

  it('returns 400 for missing email', async () => {
    const res = await POST(makeReq({ uid: 'u1' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid email', async () => {
    const res = await POST(makeReq({ uid: 'u1', email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid body', async () => {
    const req = new NextRequest('http://localhost/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with valid body and sets session cookie', async () => {
    mockGoogleUserinfo('u1', 'a@b.com')
    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com', displayName: 'Test', accessToken: 'tok-valid' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.data.id).toBe('u1')
    expect(upsertUser).toHaveBeenCalledWith({
      id: 'u1',
      email: 'a@b.com',
      displayName: 'Test',
      photoURL: null,
      accessToken: 'tok-valid',
    })
    expect(createUserSession).toHaveBeenCalledWith({
      sessionId: 'sid-u1',
      userId: 'u1',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    })

    const setCookie = res.headers.getSetCookie()
    expect(setCookie.some((c: string) => c.startsWith('dubtube_session=u1.fakesig'))).toBe(true)
  })

  it('does not expose google_access_token as a cookie', async () => {
    mockGoogleUserinfo('u1', 'a@b.com')
    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com', accessToken: 'tok123' }))
    expect(res.status).toBe(200)
    const setCookie = res.headers.getSetCookie()
    expect(setCookie.some((c: string) => c.includes('google_access_token='))).toBe(false)
  })

  it('returns 500 on DB error', async () => {
    mockGoogleUserinfo('u1', 'a@b.com')
    vi.mocked(upsertUser).mockRejectedValueOnce(new Error('DB down'))
    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com', accessToken: 'tok-valid' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.ok).toBe(false)
  })
})
