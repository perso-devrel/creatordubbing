import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
  forbiddenUidMismatch: vi.fn(
    () =>
      Response.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'UID mismatch' } },
        { status: 403 },
      ),
  ),
}))

vi.mock('@/lib/perso/client', () => ({
  persoFetch: vi.fn(async () => ({ ok: true })),
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

describe('Perso API routes — session auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const cases: {
    name: string
    path: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH'
    importPath: string
    body?: Record<string, unknown>
    query?: string
  }[] = [
    { name: 'spaces', path: '/api/perso/spaces', method: 'GET', importPath: './spaces/route' },
    { name: 'languages', path: '/api/perso/languages', method: 'GET', importPath: './languages/route' },
    {
      name: 'external/metadata',
      path: '/api/perso/external/metadata',
      method: 'POST',
      importPath: './external/metadata/route',
      body: { spaceSeq: 1, url: 'https://youtube.com/watch?v=abc' },
    },
    {
      name: 'external/upload',
      path: '/api/perso/external/upload',
      method: 'PUT',
      importPath: './external/upload/route',
      body: { spaceSeq: 1, url: 'https://youtube.com/watch?v=abc' },
    },
    {
      name: 'upload/sas-token',
      path: '/api/perso/upload/sas-token',
      method: 'GET',
      importPath: './upload/sas-token/route',
      query: 'fileName=test.mp4',
    },
    {
      name: 'upload/register',
      path: '/api/perso/upload/register',
      method: 'PUT',
      importPath: './upload/register/route',
      body: { spaceSeq: 1, fileUrl: 'https://example.com/f.mp4', fileName: 'f.mp4' },
    },
    {
      name: 'validate',
      path: '/api/perso/validate',
      method: 'POST',
      importPath: './validate/route',
      body: { spaceSeq: 1, durationMs: 5000, originalName: 'test.mp4', mediaType: 'video', extension: 'mp4', size: 1000, width: 1920, height: 1080 },
    },
    {
      name: 'queue',
      path: '/api/perso/queue',
      method: 'PUT',
      importPath: './queue/route',
      query: 'spaceSeq=1',
    },
    {
      name: 'translate',
      path: '/api/perso/translate',
      method: 'POST',
      importPath: './translate/route',
      query: 'spaceSeq=1',
      body: { targetLanguages: ['en'] },
    },
    {
      name: 'projects',
      path: '/api/perso/projects',
      method: 'GET',
      importPath: './projects/route',
      query: 'spaceSeq=1',
    },
    {
      name: 'script GET',
      path: '/api/perso/script',
      method: 'GET',
      importPath: './script/route',
      query: 'projectSeq=1&spaceSeq=1',
    },
    {
      name: 'script PATCH',
      path: '/api/perso/script',
      method: 'PATCH',
      importPath: './script/route',
      query: 'projectSeq=1&sentenceSeq=1',
      body: { translatedText: 'hello' },
    },
    {
      name: 'script/regenerate',
      path: '/api/perso/script/regenerate',
      method: 'PATCH',
      importPath: './script/regenerate/route',
      query: 'projectSeq=1&audioSentenceSeq=1',
    },
    {
      name: 'download',
      path: '/api/perso/download',
      method: 'GET',
      importPath: './download/route',
      query: 'projectSeq=1&spaceSeq=1',
    },
    {
      name: 'lipsync',
      path: '/api/perso/lipsync',
      method: 'POST',
      importPath: './lipsync/route',
      query: 'projectSeq=1&spaceSeq=1',
    },
    {
      name: 'project',
      path: '/api/perso/project',
      method: 'GET',
      importPath: './project/route',
      query: 'projectSeq=1&spaceSeq=1',
    },
    {
      name: 'progress',
      path: '/api/perso/progress',
      method: 'GET',
      importPath: './progress/route',
      query: 'projectSeq=1&spaceSeq=1',
    },
  ]

  for (const tc of cases) {
    it(`${tc.name} (${tc.method}) → 401 without auth`, async () => {
      mockNoAuth()
      const url = `http://localhost${tc.path}${tc.query ? `?${tc.query}` : ''}`
      const init: { method: string; body?: string } = { method: tc.method }
      if (tc.body) init.body = JSON.stringify(tc.body)

      const req = new NextRequest(url, init)
      const mod = await import(tc.importPath)
      const handler = mod[tc.method]
      const res = await handler(req)
      expect(res.status).toBe(401)
    })

    it(`${tc.name} (${tc.method}) → calls handler with valid auth`, async () => {
      mockAuth()
      const url = `http://localhost${tc.path}${tc.query ? `?${tc.query}` : ''}`
      const init: { method: string; body?: string } = { method: tc.method }
      if (tc.body) init.body = JSON.stringify(tc.body)

      const req = new NextRequest(url, init)
      const mod = await import(tc.importPath)
      const handler = mod[tc.method]
      const res = await handler(req)
      expect(res.status).not.toBe(401)
    })
  }
})
