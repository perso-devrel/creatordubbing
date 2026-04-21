import type { Job } from './background-types'

export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function buildStudioUrl(videoId: string): string {
  return `https://studio.youtube.com/video/${videoId}/translations`
}

export function createJob(
  jobId: string,
  payload: { videoId: string; languageCode: string; audioUrl: string; mode: 'auto' | 'assisted' },
): Job {
  return {
    jobId,
    videoId: payload.videoId,
    languageCode: payload.languageCode,
    audioUrl: payload.audioUrl,
    mode: payload.mode,
    tabId: null,
    status: 'pending',
    createdAt: Date.now(),
  }
}
