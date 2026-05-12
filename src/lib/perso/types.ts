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
  mediaType: 'video' | 'audio'
  extension: string
  size?: number
  width?: number
  height?: number
  thumbnailFilePath?: string | null
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
  ttsModel?: 'ELEVEN_V2' | 'ELEVEN_V3'
  title?: string
}

export interface TranslateResponse {
  startGenerateProjectIdList: number[]
}

export interface SttRequest {
  mediaSeq: number
  isVideoProject: boolean
  title?: string
}

export interface SttResponse {
  startGenerateProjectIdList: number[]
}

/**
 * Progress reason values from Perso API.
 * Internal values (PENDING, PROCESSING, etc.) are used by our polling logic.
 * Perso API spec also documents human-readable forms (Enqueue Pending, Transcribing, etc.)
 * — both forms are accepted to handle API version differences.
 */
type ProgressReason =
  | 'PENDING'
  | 'CREATED'
  | 'READY'
  | 'READY_TARGET_LANGUAGES'
  | 'ENQUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  // Perso API spec forms (human-readable)
  | 'Enqueue Pending'
  | 'Slow Mode Pending'
  | 'Uploading'
  | 'Transcribing'
  | 'Translating'
  | 'Generating Voice'
  | 'Analyzing Lip Sync'
  | 'Applying Lip Sync'
  | 'Completed'
  | 'Failed'

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
  videoFile?: { videoDownloadLink: string | null }
  audioFile?: {
    voiceAudioDownloadLink?: string | null
    backgroundAudioDownloadLink?: string | null
    voiceWithBackgroundAudioDownloadLink?: string | null
    speakerSegmentExcelFilePath?: string | null
    speakerSegmentWithTranslationExcelFilePath?: string | null
    /** target=audioScript 응답에 포함되는 타임스탬프 데이터(있을 때만). */
    scriptTimestampsDownloadLink?: string | null
    originalSubBackgroundDownloadLink?: string | null
  }
  srtFile?: {
    originalSubtitleDownloadLink?: string | null
    translatedSubtitleDownloadLink?: string | null
    /** target=audioScript 응답에 포함되는 VTT 자막(있을 때만). */
    originalSubtitleVttDownloadLink?: string | null
  }
  zippedFileDownloadLink?: string | null
}

/**
 * 다운로드 가능한 산출물 종류.
 *
 * 주의: Perso 공식 문서엔 `originalSubtitle` / `translatedSubtitle`이
 * 정식으로 적혀 있으나 현재 백엔드는 두 값에 대해 500
 * (Unexpected Download value: ORIGINAL_SUBTITLE / TRANSLATED_SUBTITLE)을
 * 반환한다. 대신 문서엔 없는 `audioScript` target을 사용하면 응답의
 * srtFile.translatedSubtitleDownloadLink / originalSubtitleDownloadLink로
 * 두 SRT 링크를 한 번에 받을 수 있다.
 */
export type DownloadTarget =
  | 'video'
  | 'dubbingVideo'
  | 'lipSyncVideo'
  | 'originalSubtitle'
  | 'translatedSubtitle'
  | 'originalVoiceAudio'
  /** Perso가 생성한 SRT(원본/번역)와 부가 산출물 링크를 묶어 반환한다. */
  | 'audioScript'
  | 'voiceAudio'
  | 'backgroundAudio'
  | 'voicewithBackgroundAudio'
  | 'translatedAudio'
  | 'all'
  | 'originalVoiceSpeakers'
  | 'speakerSegmentExcel'
  | 'speakerSegmentWithTranslationExcel'

export interface ScriptSentence {
  sentenceSeq: number
  audioSentenceSeq: number
  startMs: number
  endMs: number
  originalText: string
  translatedText: string
  speakerLabel: string
}

export interface SttScriptSentence {
  seq: number
  externalScriptSeq?: string
  speakerOrderIndex?: number
  offsetMs: number
  durationMs: number
  originalDraftText?: string
  originalText: string
}

export interface SttScriptResponse {
  hasNext?: boolean
  nextCursorId?: number | null
  sentences?: SttScriptSentence[]
  speakers?: Array<{
    speakerOrderIndex: number
    externalSpeakerSeq?: string
  }>
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
