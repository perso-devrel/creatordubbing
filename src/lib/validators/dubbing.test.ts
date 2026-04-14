import { describe, it, expect } from 'vitest'
import { videoUrlSchema, videoUrlInputSchema } from './dubbing'

describe('videoUrlSchema', () => {
  it('accepts YouTube URL', () => {
    expect(() => videoUrlSchema.parse('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).not.toThrow()
  })

  it('accepts direct mp4 URL', () => {
    expect(() => videoUrlSchema.parse('https://cdn.example.com/video.mp4')).not.toThrow()
  })

  it('accepts mp4 URL with query params', () => {
    expect(() => videoUrlSchema.parse('https://cdn.example.com/video.mp4?token=abc')).not.toThrow()
  })

  it('rejects empty string', () => {
    expect(() => videoUrlSchema.parse('')).toThrow()
  })

  it('rejects non-video URL', () => {
    expect(() => videoUrlSchema.parse('https://example.com/page.html')).toThrow()
  })

  it('rejects random text', () => {
    expect(() => videoUrlSchema.parse('not a url')).toThrow()
  })
})

describe('videoUrlInputSchema', () => {
  it('accepts valid input', () => {
    const input = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      spaceSeq: 1,
    }
    const result = videoUrlInputSchema.parse(input)
    expect(result.lang).toBe('ko')
  })

  it('rejects invalid spaceSeq', () => {
    expect(() =>
      videoUrlInputSchema.parse({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        spaceSeq: 0,
      }),
    ).toThrow()
  })
})
