import { describe, it, expect } from 'vitest'
import {
  summaryQuerySchema,
  jobsQuerySchema,
  mutationActionSchema,
} from './dashboard'

describe('summaryQuerySchema', () => {
  it('accepts valid uid', () => {
    expect(summaryQuerySchema.parse({ uid: 'user123' })).toEqual({ uid: 'user123' })
  })

  it('rejects empty uid', () => {
    expect(() => summaryQuerySchema.parse({ uid: '' })).toThrow()
  })

  it('rejects missing uid', () => {
    expect(() => summaryQuerySchema.parse({})).toThrow()
  })
})

describe('jobsQuerySchema', () => {
  it('accepts valid params with default limit', () => {
    const result = jobsQuerySchema.parse({ uid: 'user123' })
    expect(result.uid).toBe('user123')
    expect(result.limit).toBe(10)
  })

  it('accepts custom limit', () => {
    const result = jobsQuerySchema.parse({ uid: 'user123', limit: '50' })
    expect(result.limit).toBe(50)
  })

  it('rejects limit over 100', () => {
    expect(() => jobsQuerySchema.parse({ uid: 'u', limit: '200' })).toThrow()
  })
})

describe('mutationActionSchema', () => {
  it('accepts createDubbingJob', () => {
    const action = {
      type: 'createDubbingJob',
      payload: {
        userId: 'u1',
        videoTitle: 'Test',
        videoDurationMs: 60000,
        videoThumbnail: 'https://img.jpg',
        sourceLanguage: 'ko',
        mediaSeq: 1,
        spaceSeq: 1,
        lipSyncEnabled: false,
        isShort: false,
      },
    }
    expect(() => mutationActionSchema.parse(action)).not.toThrow()
  })

  it('accepts updateJobStatus', () => {
    const action = {
      type: 'updateJobStatus',
      payload: { jobId: 1, status: 'completed' },
    }
    expect(() => mutationActionSchema.parse(action)).not.toThrow()
  })

  it('rejects unknown type', () => {
    const action = { type: 'unknownAction', payload: {} }
    expect(() => mutationActionSchema.parse(action)).toThrow()
  })
})
