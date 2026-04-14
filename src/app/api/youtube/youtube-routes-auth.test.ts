import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
}))

vi.mock('@/lib/youtube/route-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/youtube/route-helpers')>()
  return {
    ...actual,
    requireAccessToken: vi.fn(async () => 'mock-token'),
    ytHandle: vi.fn(async (fn: () => Promise<unknown>) => {
      try {
        const data = await fn()
        return Response.json({ ok: true, data })
      } catch {
        return Response.json({ ok: false, error: { code: 'ERR', message: 'fail' } }, { status: 500 })
      }
    }),
  }
})

vi.mock('@/lib/youtube/server', () => ({
  uploadVideoToYouTube: vi.fn(async () => ({ videoId: 'yt-1' })),
  uploadCaptionToYouTube: vi.fn(async () => undefined),
  fetchVideoStatistics: vi.fn(async () => []),
  fetchChannelStatistics: vi.fn(async () => ({})),
  fetchMyVideos: vi.fn(async () => []),
  fetchVideoAnalytics: vi.fn(async () => ({ videoId: 'v1', daily: [], countries: [], totals: {} })),
  YouTubeError: class extends Error {
    constructor(public status: number, msg: string, public code = 'ERR') { super(msg) }
  },
}))

vi.mock('@/lib/db/client', () => ({
  getDb: () => ({ execute: vi.fn(async () => ({ rows: [] })) }),
}))

import { requireSession } from '@/lib/auth/session'

const mockSession = vi.mocked(requireSession)

function mockNoAuth() {
  mockSession.mockResolvedValueOnce({
    ok: false,
    response: Response.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } },
      { status: 401 },
    ),
  })
}

function mockAuth(uid = 'user1') {
  mockSession.mockResolvedValueOnce({
    ok: true,
    session: { uid, email: `${uid}@example.com` },
  })
}

describe('YouTube API routes — session auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const cases: {
    name: string
    path: string
    method: 'GET' | 'POST'
    importPath: string
    body?: BodyInit
    contentType?: string
  }[] = [
    { name: 'stats', path: '/api/youtube/stats', method: 'GET', importPath: './stats/route' },
    { name: 'videos', path: '/api/youtube/videos', method: 'GET', importPath: './videos/route' },
    {
      name: 'caption',
      path: '/api/youtube/caption',
      method: 'POST',
      importPath: './caption/route',
      body: JSON.stringify({ videoId: 'v1', language: 'ko', name: 'Korean', srtContent: 'x' }),
      contentType: 'application/json',
    },
    {
      name: 'upload',
      path: '/api/youtube/upload',
      method: 'POST',
      importPath: './upload/route',
    },
    {
      name: 'analytics',
      path: '/api/youtube/analytics',
      method: 'GET',
      importPath: './analytics/route',
    },
  ]

  for (const tc of cases) {
    it(`${tc.name} (${tc.method}) → 401 without auth`, async () => {
      mockNoAuth()
      const headers: Record<string, string> = {}
      if (tc.contentType) headers['Content-Type'] = tc.contentType
      const req = new NextRequest(`http://localhost${tc.path}`, {
        method: tc.method,
        ...(tc.body ? { body: tc.body } : {}),
        headers,
      })
      const mod = await import(tc.importPath)
      const handler = mod[tc.method]
      const res = await handler(req)
      expect(res.status).toBe(401)
    })

    it(`${tc.name} (${tc.method}) → calls handler with valid auth`, async () => {
      mockAuth()
      const headers: Record<string, string> = {}
      if (tc.contentType) headers['Content-Type'] = tc.contentType
      const req = new NextRequest(`http://localhost${tc.path}`, {
        method: tc.method,
        ...(tc.body ? { body: tc.body } : {}),
        headers,
      })
      const mod = await import(tc.importPath)
      const handler = mod[tc.method]
      const res = await handler(req)
      expect(res.status).not.toBe(401)
    })
  }
})
