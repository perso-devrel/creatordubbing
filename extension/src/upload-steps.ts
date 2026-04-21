import type { UploadStep } from './messages'

export interface UploadContext {
  jobId: string
  videoId: string
  languageCode: string
  audioUrl: string
  mode: 'auto' | 'assisted'
  reportProgress: (step: UploadStep, detail?: string) => void
}

// ── 각 단계 스텁 — Phase 3에서 실제 구현 ────────────────

export async function openLanguagesPage(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('OPENING_LANGUAGES', '번역 페이지 탐색 중')
  // TODO: Phase 3 #17 — 번역 페이지 DOM 확인
}

export async function clickAddLanguage(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('SELECTING_LANGUAGE', '언어 추가 버튼 탐색 중')
  // TODO: Phase 3 #17 — "언어 추가" 버튼 클릭
}

export async function selectLanguage(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('SELECTING_LANGUAGE', `${ctx.languageCode} 선택 중`)
  // TODO: Phase 3 #17 — 드롭다운에서 언어 선택
}

export async function clickDubAdd(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('INJECTING_AUDIO', '더빙 추가 탐색 중')
  // TODO: Phase 3 #17 — "��빙 추가" 또는 오디오 트랙 추가 버튼
}

export async function injectAudioFile(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('INJECTING_AUDIO', '오디오 파일 주입 중')
  // TODO: Phase 3 #18 — DataTransfer 기반 파일 주입
}

export async function waitForPublishReady(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('WAITING_PUBLISH', '게시 준비 상태 대기 중')
  // TODO: Phase 3 #17 — 게시 버튼 활성화 대기
}

export async function publish(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('PUBLISHING', '게시 중')
  // TODO: Phase 3 #20 — auto 모드에서만 실행
}

export type StepFn = (ctx: UploadContext) => Promise<void>

export function getStepSequence(mode: 'auto' | 'assisted'): StepFn[] {
  const base: StepFn[] = [
    openLanguagesPage,
    clickAddLanguage,
    selectLanguage,
    clickDubAdd,
    injectAudioFile,
    waitForPublishReady,
  ]

  if (mode === 'auto') {
    base.push(publish)
  }

  return base
}
