/**
 * Perso.ai API TypeScript types.
 *
 * IMPORTANT: This file MUST NOT contain `import 'server-only'`.
 * Both server routes and client code import these types.
 */

export interface PersoSpace {
  spaceSeq: number
  spaceName: string
  planName: string
  tier: string
  memberCount?: number
  seat?: number
  memberRole?: string
  useVideoTranslatorEdit?: boolean
}

export interface SasTokenResponse {
  blobSasUrl: string
  expirationDatetime?: string
}

export interface UploadVideoResponse {
  /** mediaSeq */
  seq: number
  videoFilePath: string
  thumbnailFilePath: string
  size: number
  durationMs: number
  originalName: string
}

export interface ExternalMetadataResponse {
  durationMs: number
  originalName: string
  thumbnailFilePath: string
  mediaType: string
  size: number
  extension: string
  width: number
  height: number
}

export interface MediaValidateRequest {
  spaceSeq: number
  durationMs: number
  originalName: string
  mediaType: string
  extension: string
  size: number
  width: number
  height: number
}

export interface TranslateRequest {
  mediaSeq: number
  isVideoProject: boolean
  sourceLanguageCode: string
  targetLanguageCodes: string[]
  numberOfSpeakers: number
  withLipSync?: boolean
  preferredSpeedType: 'GREEN' | 'RED'
  customDictionaryBlobPath?: string
  srtBlobPath?: string
}

export interface TranslateResponse {
  startGenerateProjectIdList: number[]
}

export type ProgressReason =
  | 'PENDING'
  | 'CREATED'
  | 'READY'
  | 'READY_TARGET_LANGUAGES'
  | 'ENQUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'

export interface ProgressResponse {
  projectSeq: number
  progress: number
  progressReason: ProgressReason
  hasFailed?: boolean
  speedType?: string
  expectedRemainingTimeMinutes?: number
  isCancelable?: boolean
}

export interface DownloadResponse {
  videoFile?: { videoDownloadLink: string }
  audioFile?: { voiceAudioDownloadLink: string }
  srtFile?: {
    originalSubtitleDownloadLink: string
    translatedSubtitleDownloadLink: string
  }
  zippedFileDownloadLink?: string
}

export type DownloadTarget =
  | 'video'
  | 'dubbingVideo'
  | 'lipSyncVideo'
  | 'originalSubtitle'
  | 'translatedSubtitle'
  | 'voiceAudio'
  | 'backgroundAudio'
  | 'all'

export interface ScriptSentence {
  sentenceSeq: number
  audioSentenceSeq: number
  startMs: number
  endMs: number
  originalText: string
  translatedText: string
  speakerLabel: string
}

export interface ProjectDetail {
  projectSeq: number
  title: string
  sourceLanguageCode: string
  targetLanguageCode: string
  status: string
  thumbnailFilePath: string
  durationMs: number
}

export interface PersoLanguage {
  code: string
  name: string
  experiment: boolean
}

/** Standard response envelope used by all Next.js /api/perso/* routes. */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } }
