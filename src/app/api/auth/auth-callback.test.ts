import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/queries', () => ({
  upsertUser: vi.fn(),
}))

vi.mock('@/lib/auth/session-cookie', () => ({
  SESSION_COOKIE: 'dubtube_session',
  signSessionCookie: vi.fn((uid: string) => `${uid}.fakesig`),
}))

vi.mock('@/lib/env', () => ({
  getServerEnv: vi.fn(() => ({
    GOOGLE_CLIENT_SECRET: 'test-secret',
    PERSO_API_KEY: 'k',
    PERSO_API_BASE_URL: 'https://api.perso.ai',
    TURSO_URL: 'http://localhost',
    TURSO_AUTH_TOKEN: 'tok',
  })),
  getClientEnv: vi.fn(() => ({
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'test-client-id',
    NEXT_PUBLIC_PERSO_FILE_BASE_URL: 'https://perso.ai',
  })),
}))

import { POST } from './callback/route'
import { upsertUser } from '@/lib/db/queries'
import { getServerEnv } from '@/lib/env'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/callback', () => {
  it('returns 400 for missing code', async () => {
    const res = await POST(makeReq({ redirectUri: 'http://localhost' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing redirectUri', async () => {
    const res = await POST(makeReq({ code: 'abc' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid body', async () => {
    const res = await POST(makeReq(null))
    expect(res.status).toBe(400)
  })

  it('returns 500 when GOOGLE_CLIENT_SECRET is not configured', async () => {
    vi.mocked(getServerEnv).mockReturnValueOnce({
      GOOGLE_CLIENT_SECRET: undefined,
      PERSO_API_KEY: 'k',
      PERSO_API_BASE_URL: 'https://api.perso.ai',
      TURSO_URL: 'http://localhost',
      TURSO_AUTH_TOKEN: 'tok',
    })
    const res = await POST(makeReq({ code: 'abc', redirectUri: 'http://localhost' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('CONFIG_ERROR')
  })

  it('returns 401 when Google token exchange fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'invalid_grant',
    })
    const res = await POST(makeReq({ code: 'bad-code', redirectUri: 'http://localhost' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('TOKEN_EXCHANGE_FAILED')
  })

  it('returns 401 when userinfo fetch fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'at-123',
          refresh_token: 'rt-456',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
      })
    const res = await POST(makeReq({ code: 'good-code', redirectUri: 'http://localhost' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('USERINFO_FAILED')
  })

  it('exchanges code and returns user + sets cookies on success', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'at-123',
          refresh_token: 'rt-456',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/photo.jpg',
        }),
      })

    const res = await POST(makeReq({ code: 'good-code', redirectUri: 'http://localhost' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.id).toBe('user-1')
    expect(body.data.email).toBe('test@example.com')

    expect(upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
        accessToken: 'at-123',
        refreshToken: 'rt-456',
      }),
    )

    const setCookies = res.headers.getSetCookie()
    expect(setCookies.find((c: string) => c.startsWith('dubtube_session='))).toBeDefined()
    expect(setCookies.find((c: string) => c.startsWith('google_access_token='))).toBeDefined()
  })

  it('handles missing refresh_token gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'at-789',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'user-2',
          email: 'no-refresh@example.com',
        }),
      })

    const res = await POST(makeReq({ code: 'code-no-refresh', redirectUri: 'http://localhost' }))
    expect(res.status).toBe(200)

    expect(upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-2',
        refreshToken: null,
      }),
    )
  })
})
