import type { UploadStep } from './messages'
import type { DomHelper, UploadContext } from './upload-steps'
import type { SelectorChain } from './selectors'
import { queryWithFallback } from './selectors'
import { waitForElement, sleep } from './dom-utils'
import { getStepSequence } from './upload-steps'

interface StartUploadPayload {
  jobId: string
  videoId: string
  languageCode: string
  audioUrl: string
  mode: 'auto' | 'assisted'
}

function isStartUpload(msg: unknown): msg is { type: 'START_UPLOAD'; payload: StartUploadPayload } {
  return msg !== null && typeof msg === 'object' && (msg as { type: string }).type === 'START_UPLOAD'
}

function sendProgressToBackground(step: UploadStep, jobId: string, detail?: string): void {
  chrome.runtime.sendMessage({ type: 'UPLOAD_PROGRESS', payload: { jobId, step, detail } })
}

function sendDoneToBackground(jobId: string, videoId: string, languageCode: string): void {
  chrome.runtime.sendMessage({ type: 'UPLOAD_DONE', payload: { jobId, videoId, languageCode } })
}

function sendErrorToBackground(jobId: string, step: UploadStep, error: string, retryable: boolean): void {
  chrome.runtime.sendMessage({ type: 'UPLOAD_ERROR', payload: { jobId, step, error, retryable } })
}

function createDomHelper(): DomHelper {
  return {
    async waitFor<T extends Element = Element>(chain: SelectorChain, timeout?: number): Promise<T> {
      for (const selector of chain.candidates) {
        try {
          const el = await waitForElement<T>(selector, { timeout: timeout ?? 10_000 })
          return el
        } catch {
          // try next candidate
        }
      }
      throw new Error(`셀렉터 체인 "${chain.name}" 실패: 모든 후보 탐색 불가`)
    },

    query<T extends Element = Element>(chain: SelectorChain): T | null {
      return queryWithFallback<T>(chain)
    },

    click(el: Element): void {
      (el as HTMLElement).click()
    },

    typeText(el: Element, text: string): void {
      const input = el as HTMLInputElement
      input.focus()
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },

    sleep,
  }
}

async function executeUpload(payload: StartUploadPayload): Promise<void> {
  const { jobId, videoId, languageCode, audioUrl, mode } = payload

  const ctx: UploadContext = {
    jobId,
    videoId,
    languageCode,
    audioUrl,
    mode,
    reportProgress: (step, detail) => sendProgressToBackground(step, jobId, detail),
    dom: createDomHelper(),
  }

  const steps = getStepSequence(mode)

  try {
    ctx.reportProgress('NAVIGATING', 'YouTube Studio 페이지 로드 완료')

    for (const step of steps) {
      await step(ctx)
    }

    sendDoneToBackground(jobId, videoId, languageCode)
  } catch (err) {
    sendErrorToBackground(jobId, 'NAVIGATING', String(err), true)
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (isStartUpload(message)) {
    executeUpload(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }))
    return true
  }

  return false
})

console.log('[CreatorDub] Content script loaded on YouTube Studio')
