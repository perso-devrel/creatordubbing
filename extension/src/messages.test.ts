import { describe, it, expect } from 'vitest'
import {
  isPingMessage,
  isUploadToYouTubeMessage,
  isUploadProgressEvent,
  isUploadDoneEvent,
  isUploadErrorEvent,
  isInboundMessage,
  isOutboundEvent,
} from './messages'

describe('isPingMessage', () => {
  it('accepts valid PING', () => {
    expect(isPingMessage({ type: 'PING' })).toBe(true)
  })

  it('rejects wrong type', () => {
    expect(isPingMessage({ type: 'PONG' })).toBe(false)
  })

  it('rejects null', () => {
    expect(isPingMessage(null)).toBe(false)
  })

  it('rejects string', () => {
    expect(isPingMessage('PING')).toBe(false)
  })
})

describe('isUploadToYouTubeMessage', () => {
  const valid = {
    type: 'UPLOAD_TO_YOUTUBE',
    payload: {
      videoId: 'abc123',
      languageCode: 'ko',
      audioUrl: 'https://example.com/audio.mp3',
      mode: 'assisted' as const,
    },
  }

  it('accepts valid message', () => {
    expect(isUploadToYouTubeMessage(valid)).toBe(true)
  })

  it('accepts auto mode', () => {
    expect(isUploadToYouTubeMessage({ ...valid, payload: { ...valid.payload, mode: 'auto' } })).toBe(true)
  })

  it('rejects invalid mode', () => {
    expect(isUploadToYouTubeMessage({ ...valid, payload: { ...valid.payload, mode: 'manual' } })).toBe(false)
  })

  it('rejects missing payload', () => {
    expect(isUploadToYouTubeMessage({ type: 'UPLOAD_TO_YOUTUBE' })).toBe(false)
  })

  it('rejects missing videoId', () => {
    const payload = { languageCode: 'ko', audioUrl: 'https://example.com/audio.mp3', mode: 'assisted' }
    expect(isUploadToYouTubeMessage({ type: 'UPLOAD_TO_YOUTUBE', payload })).toBe(false)
  })

  it('rejects wrong type field', () => {
    expect(isUploadToYouTubeMessage({ ...valid, type: 'PING' })).toBe(false)
  })

  it('rejects array payload', () => {
    expect(isUploadToYouTubeMessage({ type: 'UPLOAD_TO_YOUTUBE', payload: [] })).toBe(false)
  })
})

describe('isUploadProgressEvent', () => {
  it('accepts valid progress event', () => {
    expect(isUploadProgressEvent({
      type: 'UPLOAD_PROGRESS',
      payload: { jobId: 'j1', step: 'NAVIGATING' },
    })).toBe(true)
  })

  it('rejects missing payload', () => {
    expect(isUploadProgressEvent({ type: 'UPLOAD_PROGRESS' })).toBe(false)
  })
})

describe('isUploadDoneEvent', () => {
  it('accepts valid done event', () => {
    expect(isUploadDoneEvent({
      type: 'UPLOAD_DONE',
      payload: { jobId: 'j1', videoId: 'v1', languageCode: 'ko' },
    })).toBe(true)
  })

  it('rejects null payload', () => {
    expect(isUploadDoneEvent({ type: 'UPLOAD_DONE', payload: null })).toBe(false)
  })
})

describe('isUploadErrorEvent', () => {
  it('accepts valid error event', () => {
    expect(isUploadErrorEvent({
      type: 'UPLOAD_ERROR',
      payload: { jobId: 'j1', step: 'INJECTING_AUDIO', error: 'fail', retryable: true },
    })).toBe(true)
  })

  it('rejects wrong type', () => {
    expect(isUploadErrorEvent({ type: 'UPLOAD_DONE', payload: {} })).toBe(false)
  })
})

describe('isInboundMessage', () => {
  it('recognizes PING as inbound', () => {
    expect(isInboundMessage({ type: 'PING' })).toBe(true)
  })

  it('recognizes UPLOAD_TO_YOUTUBE as inbound', () => {
    expect(isInboundMessage({
      type: 'UPLOAD_TO_YOUTUBE',
      payload: { videoId: 'v', languageCode: 'en', audioUrl: 'u', mode: 'auto' },
    })).toBe(true)
  })

  it('rejects outbound events', () => {
    expect(isInboundMessage({ type: 'UPLOAD_PROGRESS', payload: { jobId: 'j', step: 'NAVIGATING' } })).toBe(false)
  })
})

describe('isOutboundEvent', () => {
  it('recognizes UPLOAD_PROGRESS as outbound', () => {
    expect(isOutboundEvent({ type: 'UPLOAD_PROGRESS', payload: { jobId: 'j', step: 'NAVIGATING' } })).toBe(true)
  })

  it('recognizes UPLOAD_DONE as outbound', () => {
    expect(isOutboundEvent({ type: 'UPLOAD_DONE', payload: { jobId: 'j' } })).toBe(true)
  })

  it('recognizes UPLOAD_ERROR as outbound', () => {
    expect(isOutboundEvent({ type: 'UPLOAD_ERROR', payload: { jobId: 'j' } })).toBe(true)
  })

  it('rejects inbound messages', () => {
    expect(isOutboundEvent({ type: 'PING' })).toBe(false)
  })
})
