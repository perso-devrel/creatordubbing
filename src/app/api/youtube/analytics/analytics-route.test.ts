import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { VideoAnalytics } from '@/lib/youtube/types'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(async () => ({
    ok: true,
    session: { uid: 'u1', email: 'u1@example.com' },
  })),
}))

const mockAnalytics: VideoAnalytics = {
  videoId: 'vid1',
  daily: [{ date: '2026-01-01', views: 50, estimatedMinutesWatched: 20, averageViewDuration: 60 }],
  countries: [{ country: 'US', views: 50, estimatedMinutesWatched: 20 }],
  totals: { views: 50, estimatedMinutesWatched: 20, averageViewDuration: 60 },
}

vi.mock('@/lib/youtube/route-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/youtube/route-helpers')>()
  return {
    ...actual,
    requireAccessToken: vi.fn(async () => 'mock-token'),
    ytHandle: vi.fn(async (fn: () => Promise<unknown>) => {
      try {
        const data = await fn()
        return Response.json({ ok: true, data })
      } catch (err) {
        const code = (err as { code?: string }).code || 'UNKNOWN'
        const status = (err as { status?: number }).status || 500
        const message = err instanceof Error ? err.message : 'Unknown'
        return Response.json({ ok: false, error: { code, message } }, { status })
      }
    }),
  }
})

const mockFetchVideoAnalytics = vi.fn<
  (accessToken: string, videoId: string, startDate: string, endDate: string) => Promise<VideoAnalytics>
>().mockResolvedValue(mockAnalytics)
vi.mock('@/lib/youtube/server', () => ({
  fetchVideoAnalytics: (...args: [string, string, string, string]) => mockFetchVideoAnalytics(...args),
}))

const mockExecute = vi.fn()
vi.mock('@/lib/db/client', () => ({
  getDb: () => ({ execute: mockExecute }),
}))

describe('GET /api/youtube/analytics', () => {
  let GET: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockExecute.mockResolvedValue({ rows: [] })
    ;({ GET } = await import('./route'))
  })

  it('returns empty array when no videoIds provided', async () => {
    const req = new NextRequest('http://localhost/api/youtube/analytics')
    const res = await GET(req)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toEqual([])
  })

  it('fetches analytics for provided videoIds', async () => {
    const req = new NextRequest('http://localhost/api/youtube/analytics?videoIds=vid1&userId=u1')
    const res = await GET(req)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].videoId).toBe('vid1')
    expect(mockFetchVideoAnalytics).toHaveBeenCalledWith('mock-token', 'vid1', expect.any(String), expect.any(String))
  })

  it('uses cache when available and fresh', async () => {
    const now = new Date().toISOString()
    mockExecute.mockResolvedValueOnce({
      rows: [{ data: JSON.stringify(mockAnalytics), fetched_at: now }],
    })

    const req = new NextRequest('http://localhost/api/youtube/analytics?videoIds=vid1&userId=u1')
    const res = await GET(req)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(mockFetchVideoAnalytics).not.toHaveBeenCalled()
  })

  it('ignores stale cache and fetches fresh data', async () => {
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockExecute
      .mockResolvedValueOnce({
        rows: [{ data: JSON.stringify(mockAnalytics), fetched_at: staleDate }],
      })
      .mockResolvedValueOnce({ rows: [] })

    const req = new NextRequest('http://localhost/api/youtube/analytics?videoIds=vid1&userId=u1')
    const res = await GET(req)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockFetchVideoAnalytics).toHaveBeenCalled()
  })

  it('handles multiple videoIds', async () => {
    mockFetchVideoAnalytics
      .mockResolvedValueOnce({ ...mockAnalytics, videoId: 'v1' })
      .mockResolvedValueOnce({ ...mockAnalytics, videoId: 'v2' })
    mockExecute.mockResolvedValue({ rows: [] })

    const req = new NextRequest('http://localhost/api/youtube/analytics?videoIds=v1,v2&userId=u1')
    const res = await GET(req)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].videoId).toBe('v1')
    expect(body.data[1].videoId).toBe('v2')
  })

  it('accepts custom date range', async () => {
    const req = new NextRequest(
      'http://localhost/api/youtube/analytics?videoIds=vid1&userId=u1&startDate=2026-01-01&endDate=2026-01-31',
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockFetchVideoAnalytics).toHaveBeenCalledWith('mock-token', 'vid1', '2026-01-01', '2026-01-31')
  })

  it('uses session uid for cache key instead of query param', async () => {
    mockExecute.mockResolvedValue({ rows: [] })

    const req = new NextRequest('http://localhost/api/youtube/analytics?videoIds=vid1')
    const res = await GET(req)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toHaveLength(1)
    const cacheSelectCall = mockExecute.mock.calls.find(
      (call) => typeof call[0]?.sql === 'string' && call[0].sql.includes('SELECT'),
    )
    expect(cacheSelectCall?.[0].args).toContain('u1:vid1')
  })

  it('writes cache after fetching fresh data', async () => {
    mockExecute.mockResolvedValue({ rows: [] })

    const req = new NextRequest('http://localhost/api/youtube/analytics?videoIds=vid1&userId=u1')
    await GET(req)

    const setCacheCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0]?.sql === 'string' && call[0].sql.includes('INSERT OR REPLACE'),
    )
    expect(setCacheCalls.length).toBe(1)
  })
})
