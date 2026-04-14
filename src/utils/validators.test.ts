import { describe, it, expect } from 'vitest'
import {
  isValidYouTubeUrl,
  isValidVideoUrl,
  extractVideoId,
  isValidVideoFile,
} from './validators'

describe('isValidYouTubeUrl', () => {
  it('accepts standard watch URL', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
  })

  it('accepts short URL', () => {
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  it('accepts embed URL', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true)
  })

  it('accepts shorts URL', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true)
  })

  it('rejects non-YouTube URL', () => {
    expect(isValidYouTubeUrl('https://vimeo.com/123456')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidYouTubeUrl('')).toBe(false)
  })

  it('rejects random text', () => {
    expect(isValidYouTubeUrl('not a url')).toBe(false)
  })
})

describe('isValidVideoUrl', () => {
  it('accepts YouTube URL', () => {
    expect(isValidVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
  })

  it('accepts direct mp4 URL', () => {
    expect(isValidVideoUrl('https://example.com/video.mp4')).toBe(true)
  })

  it('accepts direct mov URL', () => {
    expect(isValidVideoUrl('https://example.com/video.mov')).toBe(true)
  })

  it('accepts direct webm URL', () => {
    expect(isValidVideoUrl('https://example.com/video.webm')).toBe(true)
  })

  it('accepts mp4 URL with query params', () => {
    expect(isValidVideoUrl('https://cdn.example.com/video.mp4?token=abc123')).toBe(true)
  })

  it('rejects non-video URL', () => {
    expect(isValidVideoUrl('https://example.com/page.html')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidVideoUrl('')).toBe(false)
  })
})

describe('extractVideoId', () => {
  it('extracts from watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts from short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for non-YouTube URL', () => {
    expect(extractVideoId('https://example.com/video.mp4')).toBeNull()
  })
})

describe('isValidVideoFile', () => {
  const makeFile = (name: string, sizeMB: number) =>
    new File([new ArrayBuffer(sizeMB * 1024 * 1024)], name, { type: 'video/mp4' })

  it('accepts mp4 file', () => {
    expect(isValidVideoFile(makeFile('test.mp4', 1))).toEqual({ valid: true })
  })

  it('accepts mov file', () => {
    expect(isValidVideoFile(makeFile('test.mov', 1))).toEqual({ valid: true })
  })

  it('accepts webm file', () => {
    expect(isValidVideoFile(makeFile('test.webm', 1))).toEqual({ valid: true })
  })

  it('rejects unsupported format', () => {
    const result = isValidVideoFile(makeFile('test.avi', 1))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported')
  })

  it('rejects file exceeding 2048MB limit', () => {
    const bigFile = new File([], 'test.mp4', { type: 'video/mp4' })
    Object.defineProperty(bigFile, 'size', { value: 2049 * 1024 * 1024 })
    const result = isValidVideoFile(bigFile)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('too large')
  })
})
