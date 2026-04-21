import { describe, it, expect } from 'vitest'
import {
  isValidYouTubeUrl,
  isValidVideoUrl,
  extractVideoId,
  isValidVideoFile,
} from './validators'

describe('isValidYouTubeUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/a-B_c1d2e3f',
  ])('accepts valid YouTube URL: %s', (url) => {
    expect(isValidYouTubeUrl(url)).toBe(true)
  })

  it.each([
    '',
    'not a url',
    'https://vimeo.com/123456',
    'https://youtube.com/',
    'https://youtube.com/watch',
    'https://youtube.com/watch?v=short',
    'https://youtube.com/playlist?list=PLrAXtmErZgOe',
  ])('rejects invalid URL: %s', (url) => {
    expect(isValidYouTubeUrl(url)).toBe(false)
  })
})

describe('extractVideoId', () => {
  it('extracts from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts from short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts from embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts from shorts URL', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('handles IDs with hyphens and underscores', () => {
    expect(extractVideoId('https://youtu.be/a-B_c1d2e3f')).toBe('a-B_c1d2e3f')
  })

  it('returns null for non-YouTube URL', () => {
    expect(extractVideoId('https://example.com/video.mp4')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBeNull()
  })
})

describe('isValidVideoUrl', () => {
  it('accepts YouTube URLs', () => {
    expect(isValidVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
  })

  it.each([
    'https://example.com/video.mp4',
    'https://cdn.example.com/clip.mov',
    'https://example.com/file.webm',
  ])('accepts direct video URL: %s', (url) => {
    expect(isValidVideoUrl(url)).toBe(true)
  })

  it('accepts video URL with query params', () => {
    expect(isValidVideoUrl('https://cdn.example.com/video.mp4?token=abc123')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidVideoUrl('')).toBe(false)
  })

  it('rejects non-http protocol', () => {
    expect(isValidVideoUrl('ftp://example.com/video.mp4')).toBe(false)
  })

  it('rejects non-video extension', () => {
    expect(isValidVideoUrl('https://example.com/page.html')).toBe(false)
  })

  it('rejects malformed URL', () => {
    expect(isValidVideoUrl('not a url at all')).toBe(false)
  })
})

describe('isValidVideoFile', () => {
  const makeFile = (name: string, sizeMB: number) =>
    new File([new ArrayBuffer(sizeMB * 1024 * 1024)], name, { type: 'video/mp4' })

  it.each(['test.mp4', 'test.mov', 'test.webm'])('accepts valid file: %s', (name) => {
    expect(isValidVideoFile(makeFile(name, 1))).toEqual({ valid: true })
  })

  it('is case-insensitive for extension', () => {
    expect(isValidVideoFile(makeFile('VIDEO.MP4', 1))).toEqual({ valid: true })
  })

  it('rejects unsupported format', () => {
    const result = isValidVideoFile(makeFile('test.avi', 1))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported')
  })

  it('rejects file with no extension', () => {
    const result = isValidVideoFile(new File([new ArrayBuffer(1024)], 'noext'))
    expect(result.valid).toBe(false)
  })

  it('accepts file at exactly max size (2048MB)', () => {
    const exactMax = new File([], 'big.mp4')
    Object.defineProperty(exactMax, 'size', { value: 2048 * 1024 * 1024 })
    expect(isValidVideoFile(exactMax).valid).toBe(true)
  })

  it('rejects file exceeding 2048MB limit', () => {
    const bigFile = new File([], 'test.mp4')
    Object.defineProperty(bigFile, 'size', { value: 2048 * 1024 * 1024 + 1 })
    const result = isValidVideoFile(bigFile)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('too large')
  })
})
