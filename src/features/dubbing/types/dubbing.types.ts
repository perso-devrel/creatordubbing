export type DubbingStep = 1 | 2 | 3 | 4 | 5

export type JobStatus = 'idle' | 'transcribing' | 'translating' | 'synthesizing' | 'lip-syncing' | 'merging' | 'completed' | 'failed'

export type VideoSourceType = 'url' | 'upload' | 'channel'

export interface VideoSource {
  type: VideoSourceType
  url?: string
  file?: File
  videoId?: string
}

export interface VideoMetadata {
  id: string
  title: string
  thumbnail: string
  duration: number // seconds
  durationMs: number // milliseconds (from Perso)
  channelTitle: string
  width?: number
  height?: number
}

export interface TranslationSegment {
  id: string
  sentenceSeq: number
  audioSentenceSeq: number
  startTime: number
  endTime: number
  originalText: string
  translatedText: string
  excluded: boolean
  locked: boolean
  audioUrl?: string
}

export interface LanguageProgress {
  langCode: string
  projectSeq: number
  status: JobStatus
  progress: number
  progressReason: string
  audioUrl?: string
  srtUrl?: string
  dubbingVideoUrl?: string
}

export interface DubbingJob {
  id: string
  videoMeta: VideoMetadata
  selectedLanguages: string[]
  lipSyncEnabled: boolean
  languageProgress: LanguageProgress[]
  overallProgress: number
  status: JobStatus
  createdAt: string
}

export interface GlossaryEntry {
  id: string
  original: string
  translations: Record<string, string>
  locked: boolean
}

// Perso-specific
export interface PersoUploadResult {
  mediaSeq: number
  filePath: string
  thumbnailPath: string
  durationMs: number
}
