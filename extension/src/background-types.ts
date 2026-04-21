export interface Job {
  jobId: string
  videoId: string
  languageCode: string
  audioUrl: string
  mode: 'auto' | 'assisted'
  tabId: number | null
  status: 'pending' | 'running' | 'done' | 'error'
  createdAt: number
}

export const STORAGE_KEY = 'creatordub_jobs'
