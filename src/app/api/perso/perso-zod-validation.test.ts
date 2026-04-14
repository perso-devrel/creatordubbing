import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(async () => ({
    ok: true,
    session: { uid: 'user1', email: 'user1@example.com' },
  })),
}))

vi.mock('@/lib/perso/client', () => ({
  persoFetch: vi.fn(async () => ({ ok: true })),
}))

describe('Perso routes — zod body validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('external/metadata rejects invalid body (bad url)', async () => {
    const { POST } = await import('./external/metadata/route')
    const req = new NextRequest('http://localhost/api/perso/external/metadata', {
      method: 'POST',
      body: JSON.stringify({ spaceSeq: 1, url: 'not-a-url' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_BODY')
  })

  it('external/metadata rejects missing spaceSeq', async () => {
    const { POST } = await import('./external/metadata/route')
    const req = new NextRequest('http://localhost/api/perso/external/metadata', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=abc' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('external/upload rejects missing url', async () => {
    const { PUT } = await import('./external/upload/route')
    const req = new NextRequest('http://localhost/api/perso/external/upload', {
      method: 'PUT',
      body: JSON.stringify({ spaceSeq: 1 }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('upload/register rejects empty fileName', async () => {
    const { PUT } = await import('./upload/register/route')
    const req = new NextRequest('http://localhost/api/perso/upload/register', {
      method: 'PUT',
      body: JSON.stringify({ spaceSeq: 1, fileUrl: 'https://example.com/f.mp4', fileName: '' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('validate rejects missing fields', async () => {
    const { POST } = await import('./validate/route')
    const req = new NextRequest('http://localhost/api/perso/validate', {
      method: 'POST',
      body: JSON.stringify({ spaceSeq: 1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('translate rejects invalid preferredSpeedType', async () => {
    const { POST } = await import('./translate/route')
    const req = new NextRequest('http://localhost/api/perso/translate?spaceSeq=1', {
      method: 'POST',
      body: JSON.stringify({
        mediaSeq: 1, isVideoProject: true, sourceLanguageCode: 'ko',
        targetLanguageCodes: ['en'], numberOfSpeakers: 1, preferredSpeedType: 'BLUE',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('script PATCH rejects empty translatedText', async () => {
    const { PATCH } = await import('./script/route')
    const req = new NextRequest('http://localhost/api/perso/script?projectSeq=1&sentenceSeq=1', {
      method: 'PATCH',
      body: JSON.stringify({ translatedText: '' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('download rejects invalid target', async () => {
    const { GET } = await import('./download/route')
    const req = new NextRequest('http://localhost/api/perso/download?projectSeq=1&spaceSeq=1&target=invalid')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_PARAM')
  })

  it('download accepts valid target', async () => {
    const { GET } = await import('./download/route')
    const req = new NextRequest('http://localhost/api/perso/download?projectSeq=1&spaceSeq=1&target=video')
    const res = await GET(req)
    expect(res.status).not.toBe(400)
  })
})
