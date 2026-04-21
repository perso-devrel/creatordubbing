import { describe, it, expect } from 'vitest'
import { deriveFilename } from './file-inject'

describe('deriveFilename', () => {
  it('extracts filename from URL path', () => {
    expect(deriveFilename('https://example.com/audio/track.mp3', 'audio/mpeg')).toBe('track.mp3')
  })

  it('extracts filename with nested path', () => {
    expect(deriveFilename('https://cdn.example.com/a/b/c/voice.wav', 'audio/wav')).toBe('voice.wav')
  })

  it('falls back to timestamp-based name when URL has no extension', () => {
    const name = deriveFilename('https://example.com/api/audio/123', 'audio/mpeg')
    expect(name).toMatch(/^audio_\d+\.mp3$/)
  })

  it('uses correct extension for wav', () => {
    const name = deriveFilename('https://example.com/stream', 'audio/wav')
    expect(name).toMatch(/\.wav$/)
  })

  it('uses correct extension for flac', () => {
    const name = deriveFilename('https://example.com/stream', 'audio/flac')
    expect(name).toMatch(/\.flac$/)
  })

  it('uses correct extension for ogg', () => {
    const name = deriveFilename('https://example.com/stream', 'audio/ogg')
    expect(name).toMatch(/\.ogg$/)
  })

  it('defaults to mp3 for unknown mime type', () => {
    const name = deriveFilename('https://example.com/stream', 'application/octet-stream')
    expect(name).toMatch(/\.mp3$/)
  })

  it('handles invalid URL gracefully', () => {
    const name = deriveFilename('not-a-url', 'audio/mpeg')
    expect(name).toMatch(/^audio_\d+\.mp3$/)
  })
})
