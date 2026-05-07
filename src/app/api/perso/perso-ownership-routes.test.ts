import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PersoError } from '@/lib/perso/errors'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(async () => ({
    ok: true,
    session: { uid: 'user1', email: 'user1@example.com' },
  })),
}))

vi.mock('@/lib/perso/client', () => ({
  persoFetch: vi.fn(async () => ({
    seq: 10,
    videoFilePath: '/video.mp4',
    thumbnailFilePath: '/thumb.jpg',
    size: 100,
    durationMs: 1000,
    originalName: 'video.mp4',
  })),
}))

vi.mock('@/lib/perso/ownership', () => ({
  assertPersoMediaOwner: vi.fn(),
  assertPersoProjectOwner: vi.fn(),
  recordPersoMediaOwner: vi.fn(),
}))

import { persoFetch } from '@/lib/perso/client'
import {
  assertPersoMediaOwner,
  assertPersoProjectOwner,
  recordPersoMediaOwner,
} from '@/lib/perso/ownership'

const mockPersoFetch = vi.mocked(persoFetch)
const mockAssertMediaOwner = vi.mocked(assertPersoMediaOwner)
const mockAssertProjectOwner = vi.mocked(assertPersoProjectOwner)
const mockRecordMediaOwner = vi.mocked(recordPersoMediaOwner)

describe('Perso routes — resource ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('checks project ownership before progress fetch', async () => {
    const { GET } = await import('./progress/route')
    const req = new NextRequest('http://localhost/api/perso/progress?projectSeq=7&spaceSeq=3')

    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockAssertProjectOwner).toHaveBeenCalledWith('user1', 7)
    expect(mockPersoFetch).toHaveBeenCalled()
  })

  it('blocks project routes when ownership fails', async () => {
    mockAssertProjectOwner.mockRejectedValueOnce(
      new PersoError('PERSO_RESOURCE_FORBIDDEN', 'forbidden', 403),
    )
    const { GET } = await import('./project/route')
    const req = new NextRequest('http://localhost/api/perso/project?projectSeq=7&spaceSeq=3')

    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe('PERSO_RESOURCE_FORBIDDEN')
    expect(mockPersoFetch).not.toHaveBeenCalled()
  })

  it('checks media ownership before translating', async () => {
    const { POST } = await import('./translate/route')
    const req = new NextRequest('http://localhost/api/perso/translate?spaceSeq=3', {
      method: 'POST',
      body: JSON.stringify({
        mediaSeq: 10,
        isVideoProject: true,
        sourceLanguageCode: 'ko',
        targetLanguageCodes: ['en'],
        numberOfSpeakers: 1,
        preferredSpeedType: 'GREEN',
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockAssertMediaOwner).toHaveBeenCalledWith('user1', 10)
    expect(mockPersoFetch).toHaveBeenLastCalledWith(
      '/video-translator/api/v1/projects/spaces/3/translate',
      expect.objectContaining({
        body: expect.objectContaining({
          title: 'Dubtube project 10',
          ttsModel: 'ELEVEN_V2',
          withLipSync: false,
        }),
      }),
    )
  })

  it('does not forward auto as external upload lang', async () => {
    const { PUT } = await import('./external/upload/route')
    const req = new NextRequest('http://localhost/api/perso/external/upload', {
      method: 'PUT',
      body: JSON.stringify({ spaceSeq: 3, url: 'https://youtube.com/watch?v=abc', lang: 'auto' }),
    })

    const res = await PUT(req)

    expect(res.status).toBe(200)
    expect(mockPersoFetch).toHaveBeenCalledWith(
      '/file/api/upload/video/external',
      expect.objectContaining({
        body: { space_seq: 3, url: 'https://youtube.com/watch?v=abc' },
      }),
    )
  })

  it('records media ownership after external upload', async () => {
    const { PUT } = await import('./external/upload/route')
    const req = new NextRequest('http://localhost/api/perso/external/upload', {
      method: 'PUT',
      body: JSON.stringify({ spaceSeq: 3, url: 'https://youtube.com/watch?v=abc' }),
    })

    const res = await PUT(req)

    expect(res.status).toBe(200)
    expect(mockRecordMediaOwner).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user1',
      spaceSeq: 3,
      sourceType: 'external',
      fileUrl: 'https://youtube.com/watch?v=abc',
    }))
  })

  it('maps script text edits to Perso targetText', async () => {
    const { PATCH } = await import('./script/route')
    const req = new NextRequest('http://localhost/api/perso/script?projectSeq=7&sentenceSeq=9', {
      method: 'PATCH',
      body: JSON.stringify({ translatedText: 'updated text' }),
    })

    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockPersoFetch).toHaveBeenCalledWith(
      '/video-translator/api/v1/project/7/audio-sentence/9',
      expect.objectContaining({
        body: { targetText: 'updated text' },
      }),
    )
  })

  it('requests lip sync with the required speed body', async () => {
    const { POST } = await import('./lipsync/route')
    const req = new NextRequest('http://localhost/api/perso/lipsync?projectSeq=7&spaceSeq=3', {
      method: 'POST',
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockPersoFetch).toHaveBeenCalledWith(
      '/video-translator/api/v1/projects/7/spaces/3/lip-sync',
      expect.objectContaining({
        body: { preferredSpeedType: 'GREEN' },
      }),
    )
  })
})
