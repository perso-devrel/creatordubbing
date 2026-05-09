import type { UploadStep } from './messages'
import type { SelectorChain } from './selectors'
import {
  TRANSLATIONS_PAGE_INDICATOR,
  ADD_LANGUAGE_BUTTON,
  LANGUAGE_SEARCH_INPUT,
  LANGUAGE_LIST_ITEM,
  AUDIO_ADD_BUTTON,
  FILE_INPUT,
  PUBLISH_BUTTON,
} from './selectors'
import { fetchAsFile, injectFileToInput } from './file-inject'

// ── DOM 헬퍼 인터페이스 (테스트 시 모킹 가능) ───────────
export interface DomHelper {
  waitFor<T extends Element = Element>(chain: SelectorChain, timeout?: number): Promise<T>
  query<T extends Element = Element>(chain: SelectorChain): T | null
  click(el: Element): void
  typeText(el: Element, text: string): void
  sleep(ms: number): Promise<void>
}

// ── 업로드 컨텍스트 ──────────────────────────────────────
export interface UploadContext {
  jobId: string
  videoId: string
  languageCode: string
  audioUrl: string
  mode: 'auto' | 'assisted'
  reportProgress: (step: UploadStep, detail?: string) => void
  dom: DomHelper
}

// ── 각 단계 구현 ─────────────────────────────────────────

export async function openLanguagesPage(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('OPENING_LANGUAGES', '번역 페이지 확인 중')
  await ctx.dom.waitFor(TRANSLATIONS_PAGE_INDICATOR, 15_000)
}

export async function clickAddLanguage(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('SELECTING_LANGUAGE', '"언어 추가" 버튼 찾는 중')
  const btn = await ctx.dom.waitFor(ADD_LANGUAGE_BUTTON)
  ctx.dom.click(btn)
  await ctx.dom.sleep(500)
}

export async function selectLanguage(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('SELECTING_LANGUAGE', `${ctx.languageCode} 검색 및 선택 중`)
  const input = await ctx.dom.waitFor<HTMLInputElement>(LANGUAGE_SEARCH_INPUT)
  ctx.dom.typeText(input, ctx.languageCode)
  await ctx.dom.sleep(800)

  const item = await ctx.dom.waitFor(LANGUAGE_LIST_ITEM)
  ctx.dom.click(item)
  await ctx.dom.sleep(500)
}

export async function clickDubAdd(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('INJECTING_AUDIO', '오디오 추가 버튼 찾는 중')
  const btn = await ctx.dom.waitFor(AUDIO_ADD_BUTTON)
  ctx.dom.click(btn)
  await ctx.dom.sleep(500)
}

export async function injectAudioFile(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('INJECTING_AUDIO', '오디오 파일 다운로드 중')
  const file = await fetchAsFile(ctx.audioUrl)

  ctx.reportProgress('INJECTING_AUDIO', '오디오 파일 추가 중')
  const input = await ctx.dom.waitFor<HTMLInputElement>(FILE_INPUT)
  injectFileToInput(input, file)
  await ctx.dom.sleep(1000)
}

export async function waitForPublishReady(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('WAITING_PUBLISH', '게시 준비 상태 대기 중')
  await ctx.dom.waitFor(PUBLISH_BUTTON, 30_000)
}

export async function publish(ctx: UploadContext): Promise<void> {
  ctx.reportProgress('PUBLISHING', '게시 중')
  const btn = await ctx.dom.waitFor(PUBLISH_BUTTON)
  ctx.dom.click(btn)
}

// ── 단계 시퀀스 ──────────────────────────────────────────
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
