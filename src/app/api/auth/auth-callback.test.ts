import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/queries', () => ({
  upsertUser: vi.fn(),
  createUserSession: vi.fn(),
}))

vi.mock('@/lib/auth/session-cookie', () => ({
  SESSION_COOKIE: 'sub2tube_session',
  SESSION_TTL_SECONDS: 604800,
  createSessionCookie: vi.fn((uid: string) => ({
    cookie: `${uid}.fakesig`,
    sessionId: `sid-${uid}`,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  })),
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
    NEXT_PUBLIC_PERSO_FILE_BASE_URL: 'https://portal-media.perso.ai',
  })),
}))

import { POST } from './callback/route'
import { createUserSession, upsertUser } from '@/lib/db/queries'
import { getServerEnv } from '@/lib/env'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
const CALLBACK_REDIRECT_URI = 'http://localhost/auth/callback'

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
    const res = await POST(makeReq({ redirectUri: CALLBACK_REDIRECT_URI }))
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

  it('returns 400 for an unapproved redirect origin', async () => {
    const res = await POST(makeReq({ code: 'abc', redirectUri: 'https://evil.example/auth/callback' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_REDIRECT_URI')
  })

  it('returns 400 for an unexpected redirect path', async () => {
    const res = await POST(makeReq({ code: 'abc', redirectUri: 'http://localhost/other/callback' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_REDIRECT_URI')
  })

  it('returns 500 when GOOGLE_CLIENT_SECRET is not configured', async () => {
    vi.mocked(getServerEnv).mockReturnValueOnce({
      GOOGLE_CLIENT_SECRET: undefined,
      PERSO_API_KEY: 'k',
      PERSO_API_BASE_URL: 'https://api.perso.ai',
      TURSO_URL: 'http://localhost',
      TURSO_AUTH_TOKEN: 'tok',
    })
    const res = await POST(makeReq({ code: 'abc', redirectUri: CALLBACK_REDIRECT_URI }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('CONFIG_ERROR')
  })

  it('returns 401 when Google token exchange fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'invalid_grant',
    })
    const res = await POST(makeReq({ code: 'bad-code', redirectUri: CALLBACK_REDIRECT_URI }))
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
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.force-ssl',
            'https://www.googleapis.com/auth/youtube.readonly',
          ].join(' '),
          token_type: 'Bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
      })
    const res = await POST(makeReq({
      code: 'good-code',
      redirectUri: CALLBACK_REDIRECT_URI,
      scopeMode: 'youtube-write',
    }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('USERINFO_FAILED')
  })

  it('rejects YouTube reconnect when Google did not grant YouTube scopes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'login-only-token',
        refresh_token: 'rt-456',
        expires_in: 3600,
        scope: 'openid email profile',
        token_type: 'Bearer',
      }),
    })

    const res = await POST(makeReq({
      code: 'missing-youtube-scope',
      redirectUri: CALLBACK_REDIRECT_URI,
      scopeMode: 'youtube-write',
    }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toMatchObject({
      code: 'YOUTUBE_SCOPE_DENIED',
      message: expect.stringContaining('YouTube 권한이 허용되지 않았습니다'),
    })
    expect(upsertUser).not.toHaveBeenCalled()
    expect(createUserSession).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('exchanges code and returns user + sets cookies on success', async () => {
    const grantedYouTubeScopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' ')

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'at-123',
          refresh_token: 'rt-456',
          expires_in: 3600,
          scope: grantedYouTubeScopes,
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

    const res = await POST(makeReq({
      code: 'good-code',
      redirectUri: CALLBACK_REDIRECT_URI,
      scopeMode: 'youtube-write',
    }))
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
    expect(createUserSession).toHaveBeenCalledWith({
      sessionId: 'sid-user-1',
      userId: 'user-1',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    })

    const tokenRequestBody = mockFetch.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(tokenRequestBody.get('redirect_uri')).toBe(CALLBACK_REDIRECT_URI)

    const setCookies = res.headers.getSetCookie()
    expect(setCookies.find((c: string) => c.startsWith('sub2tube_session='))).toBeDefined()
    expect(setCookies.find((c: string) => c.startsWith('google_access_token='))).toBeUndefined()
  })

  it('does not overwrite stored YouTube tokens on login-only callback', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'login-at-123',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'user-login',
          email: 'login@example.com',
        }),
      })

    const res = await POST(makeReq({ code: 'login-code', redirectUri: CALLBACK_REDIRECT_URI }))
    expect(res.status).toBe(200)

    expect(upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-login',
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
      }),
    )
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

    const res = await POST(makeReq({
      code: 'code-no-refresh',
      redirectUri: CALLBACK_REDIRECT_URI,
      scopeMode: 'youtube-write',
    }))
    expect(res.status).toBe(200)

    expect(upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-2',
        refreshToken: null,
      }),
    )
  })
})
