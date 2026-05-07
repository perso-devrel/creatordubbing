import { describe, it, expect } from 'vitest'
import {
  externalMetadataBodySchema,
  externalUploadBodySchema,
  uploadRegisterBodySchema,
  mediaValidateBodySchema,
  translateBodySchema,
  scriptPatchBodySchema,
  generateAudioBodySchema,
  downloadTargetSchema,
} from './perso'

describe('externalMetadataBodySchema', () => {
  it('accepts valid body', () => {
    const r = externalMetadataBodySchema.safeParse({ spaceSeq: 1, url: 'https://youtube.com/watch?v=abc' })
    expect(r.success).toBe(true)
  })
  it('accepts optional lang', () => {
    const r = externalMetadataBodySchema.safeParse({ spaceSeq: 1, url: 'https://youtube.com/watch?v=abc', lang: 'en' })
    expect(r.success).toBe(true)
  })
  it('rejects missing spaceSeq', () => {
    const r = externalMetadataBodySchema.safeParse({ url: 'https://example.com' })
    expect(r.success).toBe(false)
  })
  it('rejects invalid url', () => {
    const r = externalMetadataBodySchema.safeParse({ spaceSeq: 1, url: 'not-a-url' })
    expect(r.success).toBe(false)
  })
  it('rejects non-positive spaceSeq', () => {
    const r = externalMetadataBodySchema.safeParse({ spaceSeq: 0, url: 'https://example.com' })
    expect(r.success).toBe(false)
  })
})

describe('externalUploadBodySchema', () => {
  it('accepts valid body', () => {
    const r = externalUploadBodySchema.safeParse({ spaceSeq: 1, url: 'https://example.com/v.mp4' })
    expect(r.success).toBe(true)
  })
  it('rejects missing url', () => {
    const r = externalUploadBodySchema.safeParse({ spaceSeq: 1 })
    expect(r.success).toBe(false)
  })
})

describe('uploadRegisterBodySchema', () => {
  it('accepts valid body', () => {
    const r = uploadRegisterBodySchema.safeParse({ spaceSeq: 1, fileUrl: 'https://example.com/f.mp4', fileName: 'f.mp4' })
    expect(r.success).toBe(true)
  })
  it('rejects empty fileName', () => {
    const r = uploadRegisterBodySchema.safeParse({ spaceSeq: 1, fileUrl: 'https://example.com/f.mp4', fileName: '' })
    expect(r.success).toBe(false)
  })
  it('rejects invalid fileUrl', () => {
    const r = uploadRegisterBodySchema.safeParse({ spaceSeq: 1, fileUrl: 'bad', fileName: 'f.mp4' })
    expect(r.success).toBe(false)
  })
})

describe('mediaValidateBodySchema', () => {
  const valid = {
    spaceSeq: 1, durationMs: 5000, originalName: 'test.mp4',
    mediaType: 'video' as const, extension: 'mp4', size: 1000, width: 1920, height: 1080,
  }
  it('accepts valid body', () => {
    expect(mediaValidateBodySchema.safeParse(valid).success).toBe(true)
  })
  it('rejects missing field', () => {
    const { width: _w, ...missing } = valid
    void _w
    expect(mediaValidateBodySchema.safeParse(missing).success).toBe(false)
  })
  it('rejects negative size', () => {
    expect(mediaValidateBodySchema.safeParse({ ...valid, size: -1 }).success).toBe(false)
  })
  it('accepts audio without dimensions', () => {
    expect(mediaValidateBodySchema.safeParse({
      spaceSeq: 1,
      durationMs: 5000,
      originalName: 'voice.mp3',
      mediaType: 'audio',
      extension: '.mp3',
    }).success).toBe(true)
  })
})

describe('translateBodySchema', () => {
  const valid = {
    mediaSeq: 1, isVideoProject: true, sourceLanguageCode: 'ko',
    targetLanguageCodes: ['en'], numberOfSpeakers: 1, preferredSpeedType: 'GREEN' as const,
  }
  it('accepts valid body', () => {
    expect(translateBodySchema.safeParse(valid).success).toBe(true)
  })
  it('accepts optional fields', () => {
    expect(translateBodySchema.safeParse({
      ...valid,
      withLipSync: true,
      srtBlobPath: '/p',
      ttsModel: 'ELEVEN_V2',
      title: 'Project title',
    }).success).toBe(true)
  })
  it('rejects empty title when present', () => {
    expect(translateBodySchema.safeParse({ ...valid, title: '' }).success).toBe(false)
  })
  it('rejects empty targetLanguageCodes', () => {
    expect(translateBodySchema.safeParse({ ...valid, targetLanguageCodes: [] }).success).toBe(false)
  })
  it('rejects invalid preferredSpeedType', () => {
    expect(translateBodySchema.safeParse({ ...valid, preferredSpeedType: 'BLUE' }).success).toBe(false)
  })
  it('rejects invalid ttsModel', () => {
    expect(translateBodySchema.safeParse({ ...valid, ttsModel: 'OTHER' }).success).toBe(false)
  })
})

describe('scriptPatchBodySchema', () => {
  it('accepts valid body', () => {
    expect(scriptPatchBodySchema.safeParse({ translatedText: 'hello' }).success).toBe(true)
  })
  it('rejects empty translatedText', () => {
    expect(scriptPatchBodySchema.safeParse({ translatedText: '' }).success).toBe(false)
  })
  it('rejects missing field', () => {
    expect(scriptPatchBodySchema.safeParse({}).success).toBe(false)
  })
})

describe('generateAudioBodySchema', () => {
  it('accepts targetText', () => {
    expect(generateAudioBodySchema.safeParse({ targetText: 'hello' }).success).toBe(true)
  })
  it('rejects empty targetText', () => {
    expect(generateAudioBodySchema.safeParse({ targetText: '' }).success).toBe(false)
  })
})

describe('downloadTargetSchema', () => {
  it.each([
    'video', 'dubbingVideo', 'lipSyncVideo', 'originalSubtitle',
    'translatedSubtitle', 'originalVoiceAudio', 'voiceAudio',
    'backgroundAudio', 'voicewithBackgroundAudio', 'translatedAudio',
    'all', 'originalVoiceSpeakers', 'speakerSegmentExcel',
    'speakerSegmentWithTranslationExcel', 'audioScript',
  ])('accepts "%s"', (target) => {
    expect(downloadTargetSchema.safeParse(target).success).toBe(true)
  })
  it('rejects invalid target', () => {
    expect(downloadTargetSchema.safeParse('invalid').success).toBe(false)
  })
})
