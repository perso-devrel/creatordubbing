import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/upload-queue/process', () => ({
  processUploadQueue: vi.fn(async () => ({ processed: 0, results: [] })),
}))

import { GET, POST } from './route'
import { processUploadQueue } from '@/lib/upload-queue/process'

function req(headers?: HeadersInit, url = 'http://localhost/api/cron/process-uploads') {
  return new NextRequest(url, { headers })
}

describe('/api/cron/process-uploads', () => {
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

    const res = await GET(req(undefined, 'http://localhost/api/cron/process-uploads?limit=7'))

    expect(res.status).toBe(200)
    expect(processUploadQueue).toHaveBeenCalledWith({ limit: 7 })
  })

  it('requires CRON_SECRET in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.error.code).toBe('CONFIG_ERROR')
    expect(processUploadQueue).not.toHaveBeenCalled()
  })

  it('rejects invalid cron authorization', async () => {
    process.env.CRON_SECRET = 'cron-secret'

    const res = await POST(req({ authorization: 'Bearer wrong' }))

    expect(res.status).toBe(401)
    expect(processUploadQueue).not.toHaveBeenCalled()
  })

  it('runs upload queue with valid cron authorization', async () => {
    process.env.CRON_SECRET = 'cron-secret'

    const res = await POST(req({ authorization: 'Bearer cron-secret' }))

    expect(res.status).toBe(200)
    expect(processUploadQueue).toHaveBeenCalledWith({ limit: 50 })
  })
})
