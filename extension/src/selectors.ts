/**
 * YouTube Studio DOM 셀렉터 카탈로그
 *
 * 모든 셀렉터는 공개 문서/커뮤니티 레퍼런스 기반 추정값이며,
 * YouTube Studio DOM이 수시로 변경되므로 반드시 수동 검증 필요.
 * → docs/SELECTORS_TO_VERIFY.md 참조
 */

export interface SelectorChain {
  name: string
  candidates: string[]
}

export function chain(name: string, ...candidates: string[]): SelectorChain {
  return { name, candidates }
}

// ── 1. 번역 페이지 진입 확인 ─────────────────────────────
// NEEDS_VERIFICATION
export const TRANSLATIONS_PAGE_INDICATOR = chain(
  'translations-page-indicator',
  '#translations-section',
  'ytcp-translations-section',
  '[page-subtype="translations"]',
)

// ── 2. "언어 추가" 버튼 ──────────────────────────────────
// NEEDS_VERIFICATION
export const ADD_LANGUAGE_BUTTON = chain(
  'add-language-button',
  'ytcp-button#add-translations-button',
  'button[aria-label="언어 추가"]',
  'tp-yt-paper-button#add-translations-button',
)

// ── 3. 언어 드롭다운/검색 ────────────────────────────────
// NEEDS_VERIFICATION
export const LANGUAGE_SEARCH_INPUT = chain(
  'language-search-input',
  'ytcp-text-menu iron-input input',
  '#search-input input',
  'input[aria-label="언어 검색"]',
)

// NEEDS_VERIFICATION
export const LANGUAGE_LIST_ITEM = chain(
  'language-list-item',
  'tp-yt-paper-item.language-item',
  'ytcp-text-menu tp-yt-paper-item',
  '.language-list-item',
)

// ── 4. 오디오 트랙 추가 (더빙) ───────────────────────────
// NEEDS_VERIFICATION
export const AUDIO_ADD_BUTTON = chain(
  'audio-add-button',
  'ytcp-button#add-audio-button',
  'button[aria-label="오디오 추가"]',
  '#dub-add-button',
)

// NEEDS_VERIFICATION
const AUDIO_UPLOAD_OPTION = chain(
  'audio-upload-option',
  'tp-yt-paper-item[test-id="upload-audio"]',
  'tp-yt-paper-item:has(yt-icon[icon="upload"])',
  '.upload-audio-option',
)

// ── 5. 파일 입력 요소 ────────────────────────────────────
// NEEDS_VERIFICATION
export const FILE_INPUT = chain(
  'file-input',
  'input[type="file"][accept="audio/*"]',
  'input[type="file"][accept=".mp3,.wav,.flac,.aac,.ogg"]',
  '#file-input input[type="file"]',
)

// ── 6. 게시/저장 버튼 ────────────────────────────────────
// NEEDS_VERIFICATION
export const PUBLISH_BUTTON = chain(
  'publish-button',
  'ytcp-button#publish-button',
  'button[aria-label="게시"]',
  '#publish-button tp-yt-paper-button',
)

// NEEDS_VERIFICATION
const SAVE_BUTTON = chain(
  'save-button',
  'ytcp-button#save-button',
  'button[aria-label="저장"]',
  '#save-button tp-yt-paper-button',
)

// ── 7. 업로드 진행 상태 표시 ─────────────────────────────
// NEEDS_VERIFICATION
const UPLOAD_PROGRESS_BAR = chain(
  'upload-progress-bar',
  'ytcp-uploads-progress-bar',
  '.upload-progress',
  'tp-yt-paper-progress',
)

// NEEDS_VERIFICATION
const SUCCESS_TOAST = chain(
  'success-toast',
  'ytcp-toast[type="success"]',
  '#toast-container tp-yt-paper-toast',
  '.success-message',
)

// ── 유틸: fallback 체인 실행 ─────────────────────────────
export function queryWithFallback<T extends Element = Element>(
  chain: SelectorChain,
  root: ParentNode = document,
): T | null {
  for (const selector of chain.candidates) {
    try {
      const el = root.querySelector<T>(selector)
      if (el) return el
    } catch {
      // invalid selector — skip
    }
  }
  return null
}

// ── 전체 셀렉터 맵 (디버깅/검증용 export) ───────────────
export const ALL_SELECTORS: SelectorChain[] = [
  TRANSLATIONS_PAGE_INDICATOR,
  ADD_LANGUAGE_BUTTON,
  LANGUAGE_SEARCH_INPUT,
  LANGUAGE_LIST_ITEM,
  AUDIO_ADD_BUTTON,
  AUDIO_UPLOAD_OPTION,
  FILE_INPUT,
  PUBLISH_BUTTON,
  SAVE_BUTTON,
  UPLOAD_PROGRESS_BAR,
  SUCCESS_TOAST,
]
