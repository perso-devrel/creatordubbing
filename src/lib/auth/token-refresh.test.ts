import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/queries', () => ({
  getUserTokens: vi.fn(),
  updateUserTokens: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  getServerEnv: vi.fn(() => ({
    GOOGLE_CLIENT_SECRET: 'secret',
    PERSO_API_KEY: 'k',
    PERSO_API_BASE_URL: 'https://api.perso.ai',
    TURSO_URL: 'http://localhost',
    TURSO_AUTH_TOKEN: 'tok',
  })),
  getClientEnv: vi.fn(() => ({
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'client-id',
    NEXT_PUBLIC_PERSO_FILE_BASE_URL: 'https://perso.ai',
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  isTokenExpired,
  refreshGoogleToken,
  getOrRefreshAccessToken,
} from './token-refresh'
import { getUserTokens, updateUserTokens } from '@/lib/db/queries'
import { getServerEnv } from '@/lib/env'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isTokenExpired', () => {
  it('returns true for null expiresAt', () => {
    expect(isTokenExpired(null)).toBe(true)
  })

  it('returns true for past date', () => {
    expect(isTokenExpired('2020-01-01T00:00:00.000Z')).toBe(true)
  })

  it('returns false for future date beyond buffer', () => {
    const future = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    expect(isTokenExpired(future)).toBe(false)
  })

  it('returns true for date within 5-minute buffer', () => {
    const nearFuture = new Date(Date.now() + 3 * 60 * 1000).toISOString()
    expect(isTokenExpired(nearFuture)).toBe(true)
  })
})

describe('refreshGoogleToken', () => {
  it('returns null when GOOGLE_CLIENT_SECRET is not set', async () => {
    vi.mocked(getServerEnv).mockReturnValueOnce({
      GOOGLE_CLIENT_SECRET: undefined,
      PERSO_API_KEY: 'k',
      PERSO_API_BASE_URL: 'https://api.perso.ai',
      TURSO_URL: 'http://localhost',
      TURSO_AUTH_TOKEN: 'tok',
    })
    const result = await refreshGoogleToken('rt-123')
    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns null when Google returns error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 })
    const result = await refreshGoogleToken('bad-token')
    expect(result).toBeNull()
  })

  it('returns new tokens on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-at', expires_in: 3600 }),
    })
    const result = await refreshGoogleToken('rt-123')
    expect(result).toEqual({ accessToken: 'new-at', expiresIn: 3600 })
  })
})

describe('getOrRefreshAccessToken', () => {
  it('returns null when user has no tokens', async () => {
    vi.mocked(getUserTokens).mockResolvedValueOnce(null)
    const result = await getOrRefreshAccessToken('user-1')
    expect(result).toBeNull()
  })

  it('returns existing token when not expired', async () => {
    const future = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    vi.mocked(getUserTokens).mockResolvedValueOnce({
      accessToken: 'valid-at',
      refreshToken: 'rt',
      tokenExpiresAt: future,
    })
    const result = await getOrRefreshAccessToken('user-1')
    expect(result).toBe('valid-at')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns null when expired but no refresh token', async () => {
    vi.mocked(getUserTokens).mockResolvedValueOnce({
      accessToken: 'old-at',
      refreshToken: null,
      tokenExpiresAt: '2020-01-01T00:00:00.000Z',
    })
    const result = await getOrRefreshAccessToken('user-1')
    expect(result).toBeNull()
  })

  it('refreshes and updates DB when token is expired', async () => {
    vi.mocked(getUserTokens).mockResolvedValueOnce({
      accessToken: 'old-at',
      refreshToken: 'rt-123',
      tokenExpiresAt: '2020-01-01T00:00:00.000Z',
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'fresh-at', expires_in: 3600 }),
    })

    const result = await getOrRefreshAccessToken('user-1')
    expect(result).toBe('fresh-at')
    expect(updateUserTokens).toHaveBeenCalledWith(
      'user-1',
      'fresh-at',
      expect.stringContaining('T'),
    )
  })

  it('returns null when refresh fails', async () => {
    vi.mocked(getUserTokens).mockResolvedValueOnce({
      accessToken: 'old-at',
      refreshToken: 'rt-bad',
      tokenExpiresAt: '2020-01-01T00:00:00.000Z',
    })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    const result = await getOrRefreshAccessToken('user-1')
    expect(result).toBeNull()
  })
})
