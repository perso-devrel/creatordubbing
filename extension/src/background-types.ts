export interface Job {
  jobId: string
  videoId: string
  languageCode: string
  audioUrl: string
  mode: 'auto' | 'assisted'
  tabId: number | null
  status: 'pending' | 'running' | 'done' | 'error'
  step?: string
  error?: string
  createdAt: number
}

export const STORAGE_KEY = 'creatordub_jobs'
