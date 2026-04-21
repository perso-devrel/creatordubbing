import { describe, it, expect } from 'vitest'
import { generateJobId, buildStudioUrl, createJob } from './background-utils'

describe('generateJobId', () => {
  it('starts with "job_" prefix', () => {
    expect(generateJobId()).toMatch(/^job_/)
  })

  it('contains a timestamp segment', () => {
    const before = Date.now()
    const id = generateJobId()
    const after = Date.now()
    const timestamp = Number(id.split('_')[1])
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateJobId()))
    expect(ids.size).toBe(100)
  })
})

describe('buildStudioUrl', () => {
  it('builds correct YouTube Studio translations URL', () => {
    expect(buildStudioUrl('abc123')).toBe(
      'https://studio.youtube.com/video/abc123/translations',
    )
  })

  it('handles videoId with hyphens and underscores', () => {
    expect(buildStudioUrl('a-B_c1')).toBe(
      'https://studio.youtube.com/video/a-B_c1/translations',
    )
  })
})

describe('createJob', () => {
  it('creates a job with pending status', () => {
    const job = createJob('job_123', {
      videoId: 'vid1',
      languageCode: 'ko',
      audioUrl: 'https://example.com/audio.mp3',
      mode: 'assisted',
    })

    expect(job.jobId).toBe('job_123')
    expect(job.videoId).toBe('vid1')
    expect(job.languageCode).toBe('ko')
    expect(job.mode).toBe('assisted')
    expect(job.tabId).toBeNull()
    expect(job.status).toBe('pending')
    expect(job.createdAt).toBeGreaterThan(0)
  })

  it('sets auto mode correctly', () => {
    const job = createJob('job_456', {
      videoId: 'vid2',
      languageCode: 'en',
      audioUrl: 'https://example.com/audio2.mp3',
      mode: 'auto',
    })
    expect(job.mode).toBe('auto')
  })
})
