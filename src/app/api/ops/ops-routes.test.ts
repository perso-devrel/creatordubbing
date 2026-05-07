import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
}))

vi.mock('@/lib/ops/observability', () => ({
  getOpsSummary: vi.fn(async () => ({
    generatedAt: '2026-05-07T00:00:00.000Z',
    windowHours: 24,
    metrics: {
      uploadQueue: { total: 10, done: 8, pending: 0, processing: 0, failed: 2, terminalFailed: 1, failureRate: 20 },
      perso: { total: 10, completed: 9, failed: 1, canceled: 0, failureRate: 10 },
      creditRefunds: { events: 1, releasedMinutes: 12 },
      toss: { failureEvents: 1, affectedOrders: 1 },
    },
    alerts: [{ id: 'toss-failure-events', severity: 'critical', title: 'Toss', message: 'failed', metric: 'toss.failureEvents', value: 1 }],
    recentEvents: [],
  })),
}))

import { requireSession } from '@/lib/auth/session'
import { getOpsSummary } from '@/lib/ops/observability'

const mockSession = vi.mocked(requireSession)

function mockAuth(email = 'admin@example.com') {
  mockSession.mockResolvedValueOnce({
    ok: true,
    session: { uid: 'admin', email },
  })
}

describe('/api/ops', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPERATIONS_ADMIN_EMAILS = 'admin@example.com'
  })

  it('returns operations summary for admins', async () => {
    mockAuth()
    const { GET } = await import('./summary/route')
    const req = new NextRequest('http://localhost/api/ops/summary?hours=12')

    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.metrics.uploadQueue.failureRate).toBe(20)
    expect(getOpsSummary).toHaveBeenCalledWith(12)
  })

  it('returns alert count for admins', async () => {
    mockAuth()
    const { GET } = await import('./alerts/route')
    const req = new NextRequest('http://localhost/api/ops/alerts')

    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.count).toBe(1)
    expect(body.data.alerts[0].id).toBe('toss-failure-events')
  })

  it('returns 403 for non-admin sessions', async () => {
    mockAuth('user@example.com')
    const { GET } = await import('./summary/route')
    const req = new NextRequest('http://localhost/api/ops/summary')

    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe('FORBIDDEN')
  })
})
