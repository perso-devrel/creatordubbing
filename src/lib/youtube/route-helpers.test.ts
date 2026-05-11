import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { ytOk, ytFail, ytHandle, requireAccessToken, parseQuery, parseYtBody } from './route-helpers'
import { YouTubeError } from './server'
import { verifySessionCookie } from '@/lib/auth/session-cookie'
import { getOrRefreshAccessToken } from '@/lib/auth/token-refresh'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/auth/session-cookie', () => ({
  verifySessionCookie: vi.fn(),
}))

vi.mock('@/lib/auth/token-refresh', () => ({
  getOrRefreshAccessToken: vi.fn(),
}))

describe('ytOk', () => {
  it('returns JSON with ok: true envelope', async () => {
    const res = ytOk({ videoId: 'abc' })
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: { videoId: 'abc' } })
    expect(res.status).toBe(200)
  })

  it('accepts custom ResponseInit', async () => {
    const res = ytOk('created', { status: 201 })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: 'created' })
  })
})

describe('ytFail', () => {
  it('maps YouTubeError with code and status', async () => {
    const err = new YouTubeError(403, 'Quota exceeded', 'QUOTA_EXCEEDED')
    const res = ytFail(err)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body).toEqual({
      ok: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: 'YouTube API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
        details: null,
      },
    })
  })

  it('defaults YouTubeError status to 500 when falsy', async () => {
    const err = new YouTubeError(0, 'No status', 'NO_STATUS')
    const res = ytFail(err)
    expect(res.status).toBe(500)
  })

  it('handles generic Error', async () => {
    const res = ytFail(new Error('something broke'))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toEqual({ code: 'INTERNAL_ERROR', message: '일시적인 서버 오류가 발생했습니다.', details: null })
  })

  it('handles non-Error values', async () => {
    const res = ytFail('string error')
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toEqual({ code: 'UNKNOWN', message: '일시적인 서버 오류가 발생했습니다.', details: null })
  })
})

describe('ytHandle', () => {
  it('wraps successful return in ytOk envelope', async () => {
    const res = await ytHandle(async () => ({ count: 5 }))
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: { count: 5 } })
  })

  it('wraps thrown YouTubeError in ytFail envelope', async () => {
    const res = await ytHandle(async () => {
      throw new YouTubeError(404, 'Not found', 'NOT_FOUND')
    })
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('wraps thrown generic Error in ytFail envelope', async () => {
    const res = await ytHandle(async () => {
      throw new Error('unexpected')
    })
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })
})

describe('parseQuery', () => {
  const schema = z.object({
    id: z.string().min(1),
    count: z.string().default('5').transform(Number).pipe(z.number().int()),
  })

  it('parses valid query params', () => {
    const url = new URL('http://localhost?id=abc&count=10')
    const result = parseQuery(url, schema)
    expect(result).toEqual({ id: 'abc', count: 10 })
  })

  it('applies defaults for missing optional params', () => {
    const url = new URL('http://localhost?id=abc')
    const result = parseQuery(url, schema)
    expect(result).toEqual({ id: 'abc', count: 5 })
  })

  it('throws YouTubeError(400) for invalid params', () => {
    const url = new URL('http://localhost')
    expect(() => parseQuery(url, schema)).toThrow(YouTubeError)
    try {
      parseQuery(url, schema)
    } catch (e) {
      expect((e as YouTubeError).status).toBe(400)
      expect((e as YouTubeError).code).toBe('INVALID_QUERY')
    }
  })
})

describe('parseYtBody', () => {
  const schema = z.object({ name: z.string().min(1) })

  it('parses valid JSON body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await parseYtBody(req, schema)
    expect(result).toEqual({ name: 'test' })
  })

  it('throws YouTubeError(400) for invalid JSON', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    })
    await expect(parseYtBody(req, schema)).rejects.toThrow(YouTubeError)
    const req2 = new Request('http://localhost', {
      method: 'POST',
      body: 'not json',
    })
    try {
      await parseYtBody(req2, schema)
    } catch (e) {
      expect((e as YouTubeError).status).toBe(400)
      expect((e as YouTubeError).code).toBe('INVALID_BODY')
    }
  })

  it('throws YouTubeError(400) for schema violation', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    try {
      await parseYtBody(req, schema)
    } catch (e) {
      expect((e as YouTubeError).status).toBe(400)
      expect((e as YouTubeError).code).toBe('INVALID_BODY')
      expect((e as YouTubeError).message).toContain('Invalid body')
    }
  })
})

describe('requireAccessToken', () => {
  it('returns token from verified app session and encrypted DB token', async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn((name: string) =>
        name === 'dubtube_session' ? { name, value: 'session-cookie' } : undefined,
      ),
    } as never)
    vi.mocked(verifySessionCookie).mockResolvedValueOnce('user-1')
    vi.mocked(getOrRefreshAccessToken).mockResolvedValueOnce('db-token')

    const req = new Request('http://localhost')
    const token = await requireAccessToken(req)
    expect(token).toBe('db-token')
    expect(getOrRefreshAccessToken).toHaveBeenCalledWith('user-1', { force: undefined })
  })

  it('passes force refresh through to the token loader', async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn((name: string) =>
        name === 'dubtube_session' ? { name, value: 'session-cookie' } : undefined,
      ),
    } as never)
    vi.mocked(verifySessionCookie).mockResolvedValueOnce('user-1')
    vi.mocked(getOrRefreshAccessToken).mockResolvedValueOnce('fresh-token')

    const req = new Request('http://localhost')
    const token = await requireAccessToken(req, { forceRefresh: true })
    expect(token).toBe('fresh-token')
    expect(getOrRefreshAccessToken).toHaveBeenCalledWith('user-1', { force: true })
  })

  it('does not accept raw Authorization or x-google-access-token headers', async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn(() => undefined),
    } as never)

    const req = new Request('http://localhost', {
      headers: {
        Authorization: 'Bearer header-token',
        'x-google-access-token': 'custom-token',
      },
    })
    await expect(requireAccessToken(req)).rejects.toThrow(YouTubeError)
  })

  it('throws YouTubeError(401) when no app session token can be resolved', async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn(() => undefined),
    } as never)

    const req = new Request('http://localhost')
    await expect(requireAccessToken(req)).rejects.toThrow(YouTubeError)
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn(() => undefined),
    } as never)
    try {
      await requireAccessToken(req)
    } catch (e) {
      expect(e).toBeInstanceOf(YouTubeError)
      expect((e as YouTubeError).status).toBe(401)
      expect((e as YouTubeError).code).toBe('MISSING_ACCESS_TOKEN')
    }
  })
})
