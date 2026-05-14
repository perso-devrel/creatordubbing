import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
}))

vi.mock('@/lib/db/queries', () => ({
  requestUserAccountDeletion: vi.fn(),
}))

import { requireSession } from '@/lib/auth/session'
import { requestUserAccountDeletion } from '@/lib/db/queries'
import { DELETE } from './route'

const mockRequireSession = vi.mocked(requireSession)
const mockRequestUserAccountDeletion = vi.mocked(requestUserAccountDeletion)

function req(cookie?: string) {
  return new NextRequest('http://localhost/api/user/account', {
    method: 'DELETE',
    headers: cookie ? { cookie } : undefined,
  })
}

describe('DELETE /api/user/account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without a valid session', async () => {
    mockRequireSession.mockResolvedValueOnce({
      ok: false,
      response: Response.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } },
        { status: 401 },
      ),
    })

    const res = await DELETE(req())
    expect(res.status).toBe(401)
    expect(mockRequestUserAccountDeletion).not.toHaveBeenCalled()
  })

  it('requests deletion for the authenticated account and clears auth cookies', async () => {
    mockRequireSession.mockResolvedValueOnce({
      ok: true,
      session: { uid: 'user-1', email: 'user@example.com' },
    })

    const res = await DELETE(req('dubtube_session=signed'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, data: null })
    expect(mockRequestUserAccountDeletion).toHaveBeenCalledWith('user-1')

    const setCookies = res.headers.getSetCookie()
    expect(setCookies.some((cookie) => cookie.startsWith('dubtube_session=') && cookie.includes('Max-Age=0'))).toBe(true)
    expect(setCookies.some((cookie) => cookie.startsWith('google_access_token=') && cookie.includes('Max-Age=0'))).toBe(true)
  })

  it('returns a server error when deletion fails', async () => {
    mockRequireSession.mockResolvedValueOnce({
      ok: true,
      session: { uid: 'user-1', email: 'user@example.com' },
    })
    mockRequestUserAccountDeletion.mockRejectedValueOnce(new Error('DB failed'))

    const res = await DELETE(req('dubtube_session=signed'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })
})
