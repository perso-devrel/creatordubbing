import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/queries', () => ({
  purgeExpiredPendingDeletedAccounts: vi.fn(async () => ({ purged: 0 })),
}))

import { GET, POST } from './route'
import { purgeExpiredPendingDeletedAccounts } from '@/lib/db/queries'

const mockPurgeExpiredPendingDeletedAccounts = vi.mocked(purgeExpiredPendingDeletedAccounts)

function req(headers?: HeadersInit, url = 'http://localhost/api/cron/purge-deleted-accounts') {
  return new NextRequest(url, { headers })
}

describe('/api/cron/purge-deleted-accounts', () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
  })

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalCronSecret
    vi.unstubAllEnvs()
  })

  it('allows local cron execution without CRON_SECRET outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const res = await GET(req(undefined, 'http://localhost/api/cron/purge-deleted-accounts?limit=9'))

    expect(res.status).toBe(200)
    expect(mockPurgeExpiredPendingDeletedAccounts).toHaveBeenCalledWith({ limit: 9 })
  })

  it('requires CRON_SECRET in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.error.code).toBe('CONFIG_ERROR')
    expect(mockPurgeExpiredPendingDeletedAccounts).not.toHaveBeenCalled()
  })

  it('rejects invalid cron authorization', async () => {
    process.env.CRON_SECRET = 'cron-secret'

    const res = await POST(req({ authorization: 'Bearer wrong' }))

    expect(res.status).toBe(401)
    expect(mockPurgeExpiredPendingDeletedAccounts).not.toHaveBeenCalled()
  })

  it('purges expired pending accounts with valid cron authorization', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    mockPurgeExpiredPendingDeletedAccounts.mockResolvedValueOnce({ purged: 2 })

    const res = await POST(req({ authorization: 'Bearer cron-secret' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, data: { purged: 2 } })
    expect(mockPurgeExpiredPendingDeletedAccounts).toHaveBeenCalledWith({ limit: 50 })
  })
})
