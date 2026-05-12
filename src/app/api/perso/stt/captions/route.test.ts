import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn(),
}))

vi.mock('@/lib/db/queries/generated-captions', () => ({
  getGeneratedCaption: vi.fn(),
  upsertGeneratedCaption: vi.fn(),
}))

vi.mock('@/lib/db/queries/jobs', () => ({
  updateJobLanguageCompleted: vi.fn(),
  updateJobLanguageProgress: vi.fn(),
}))

vi.mock('@/lib/perso/client', () => ({
  persoFetch: vi.fn(),
}))

vi.mock('@/lib/translate/gemini', () => ({
  translateTimedSubtitles: vi.fn(),
}))

import { requireSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { upsertGeneratedCaption } from '@/lib/db/queries/generated-captions'
import { updateJobLanguageCompleted, updateJobLanguageProgress } from '@/lib/db/queries/jobs'
import { persoFetch } from '@/lib/perso/client'
import { translateTimedSubtitles } from '@/lib/translate/gemini'

function mockAuth() {
  vi.mocked(requireSession).mockResolvedValue({
    ok: true,
    session: { uid: 'user-1', email: 'user@example.com' },
  })
}

function mockDb() {
  vi.mocked(getDb).mockReturnValue({
    execute: vi.fn(async ({ sql }: { sql: string }) => {
      if (sql.includes('FROM dubbing_jobs')) return { rows: [{ user_id: 'user-1' }] }
      if (sql.includes('project_seq')) return { rows: [{ id: 1 }] }
      if (sql.includes('SELECT language_code')) {
        return { rows: [{ language_code: 'en' }, { language_code: 'ja' }] }
      }
      return { rows: [] }
    }),
  } as never)
}

describe('/api/perso/stt/captions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockAuth()
    mockDb()
    vi.mocked(persoFetch).mockResolvedValue({
      hasNext: false,
      sentences: [
        {
          seq: 1,
          speakerOrderIndex: 1,
          offsetMs: 0,
          durationMs: 1200,
          originalText: 'Hello world',
        },
      ],
    })
    vi.mocked(upsertGeneratedCaption).mockResolvedValue()
    vi.mocked(updateJobLanguageCompleted).mockResolvedValue()
    vi.mocked(updateJobLanguageProgress).mockResolvedValue()
  })

  it('generates captions per language and keeps partial failures isolated', async () => {
    vi.mocked(translateTimedSubtitles).mockImplementation(async ({ targetLanguageCode }) => {
      if (targetLanguageCode === 'ja') throw new Error('Gemini failed')
      return [{ startMs: 0, endMs: 1200, text: 'Hello world' }]
    })

    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/perso/stt/captions', {
      method: 'POST',
      body: JSON.stringify({
        jobId: 10,
        projectSeq: 99,
        spaceSeq: 7,
        targetLanguageCodes: ['en', 'ja'],
        sourceLanguageCode: 'auto',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.languages).toEqual([{ langCode: 'en', srtUrl: '/api/perso/stt/captions?jobId=10&langCode=en', cueCount: 1 }])
    expect(body.data.failedLanguages).toEqual([{ langCode: 'ja', error: 'Gemini failed' }])
    expect(updateJobLanguageCompleted).toHaveBeenCalledWith(10, 'en', {
      srtUrl: '/api/perso/stt/captions?jobId=10&langCode=en',
    })
    expect(updateJobLanguageProgress).toHaveBeenCalledWith(10, 'ja', 'failed', 0, 'FAILED')
  })
})
