// ── 업로드 모드 ──────────────────────────────────────────
export type UploadMode = 'auto' | 'assisted'

// ── 업로드 단계 ──────────────────────────────────────────
export type UploadStep =
  | 'NAVIGATING'
  | 'OPENING_LANGUAGES'
  | 'SELECTING_LANGUAGE'
  | 'INJECTING_AUDIO'
  | 'WAITING_PUBLISH'
  | 'PUBLISHING'

// ── 웹앱 → 확장 메시지 ──────────────────────────────────
export interface PingMessage {
  type: 'PING'
}

export interface UploadToYouTubeMessage {
  type: 'UPLOAD_TO_YOUTUBE'
  payload: {
    videoId: string
    languageCode: string
    audioUrl: string
    mode: UploadMode
  }
}

export type InboundMessage = PingMessage | UploadToYouTubeMessage

// ── 확장 → 웹앱 응답 ────────────────────────────────────
export interface PongResponse {
  ok: true
  version: string
}

export interface UploadAcceptedResponse {
  ok: true
  jobId: string
}

export interface ErrorResponse {
  ok: false
  error: string
}

export type InboundResponse = PongResponse | UploadAcceptedResponse | ErrorResponse

// ── 확장 → 웹앱 이벤트 (progress / done / error) ────────
export interface UploadProgressEvent {
  type: 'UPLOAD_PROGRESS'
  payload: {
    jobId: string
    step: UploadStep
    detail?: string
  }
}

export interface UploadDoneEvent {
  type: 'UPLOAD_DONE'
  payload: {
    jobId: string
    videoId: string
    languageCode: string
  }
}

export interface UploadErrorEvent {
  type: 'UPLOAD_ERROR'
  payload: {
    jobId: string
    step: UploadStep
    error: string
    retryable: boolean
  }
}

export type OutboundEvent = UploadProgressEvent | UploadDoneEvent | UploadErrorEvent

// ── 모든 메시지 유니언 ───────────────────────────────────
export type Message = InboundMessage | OutboundEvent

// ── 타입 가드 ────────────────────────────────────────────
export function isPingMessage(msg: unknown): msg is PingMessage {
  return isObject(msg) && msg.type === 'PING'
}

export function isUploadToYouTubeMessage(msg: unknown): msg is UploadToYouTubeMessage {
  if (!isObject(msg) || msg.type !== 'UPLOAD_TO_YOUTUBE') return false
  const p = msg.payload
  return (
    isObject(p) &&
    typeof p.videoId === 'string' &&
    typeof p.languageCode === 'string' &&
    typeof p.audioUrl === 'string' &&
    (p.mode === 'auto' || p.mode === 'assisted')
  )
}

export function isUploadProgressEvent(msg: unknown): msg is UploadProgressEvent {
  return isObject(msg) && msg.type === 'UPLOAD_PROGRESS' && isObject(msg.payload)
}

export function isUploadDoneEvent(msg: unknown): msg is UploadDoneEvent {
  return isObject(msg) && msg.type === 'UPLOAD_DONE' && isObject(msg.payload)
}

export function isUploadErrorEvent(msg: unknown): msg is UploadErrorEvent {
  return isObject(msg) && msg.type === 'UPLOAD_ERROR' && isObject(msg.payload)
}

export function isInboundMessage(msg: unknown): msg is InboundMessage {
  return isPingMessage(msg) || isUploadToYouTubeMessage(msg)
}

export function isOutboundEvent(msg: unknown): msg is OutboundEvent {
  return isUploadProgressEvent(msg) || isUploadDoneEvent(msg) || isUploadErrorEvent(msg)
}

// ── 유틸 ─────────────────────────────────────────────────
export function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}
