import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/auth/session-cookie', () => ({
  SESSION_COOKIE: 'dubtube_session',
  verifySessionCookie: vi.fn(),
}))

import { POST } from './sync/route'
import { getUser } from '@/lib/db/queries'
import { verifySessionCookie } from '@/lib/auth/session-cookie'
import { NextRequest } from 'next/server'

function makeReq(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
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

  it('returns 401 without a signed app session cookie', async () => {
    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com' }))
    expect(res.status).toBe(401)
    expect(verifySessionCookie).not.toHaveBeenCalled()
  })

  it('returns 401 for an invalid session cookie', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce(null)

    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com' }, 'dubtube_session=signed'))
    expect(res.status).toBe(401)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('returns 401 when session uid does not match the request user', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce('other-user')

    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com' }, 'dubtube_session=signed'))
    expect(res.status).toBe(401)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('returns 401 when the app user no longer exists', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce('u1')
    vi.mocked(getUser).mockResolvedValueOnce(null as never)

    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com' }, 'dubtube_session=signed'))
    expect(res.status).toBe(401)
  })

  it('restores the app session without requiring a Google access token', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce('u1')
    vi.mocked(getUser).mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' } as never)

    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com' }, 'dubtube_session=signed'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.data.id).toBe('u1')
  })

  it('ignores any raw Google token sent by the client body', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce('u1')
    vi.mocked(getUser).mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' } as never)

    const res = await POST(
      makeReq({ uid: 'u1', email: 'a@b.com', accessToken: 'client-token' }, 'dubtube_session=signed'),
    )
    expect(res.status).toBe(200)
    expect(getUser).toHaveBeenCalledWith('u1')
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce('u1')
    vi.mocked(getUser).mockRejectedValueOnce(new Error('DB down'))

    const res = await POST(makeReq({ uid: 'u1', email: 'a@b.com' }, 'dubtube_session=signed'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.error.message).toBe('일시적인 서버 오류가 발생했습니다.')
  })
})
