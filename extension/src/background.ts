import type {
  UploadToYouTubeMessage,
  UploadProgressEvent,
  UploadDoneEvent,
  UploadErrorEvent,
  OutboundEvent,
} from './messages'
import { isPingMessage, isUploadToYouTubeMessage } from './messages'
import type { Job } from './background-types'
import { STORAGE_KEY } from './background-types'
import { generateJobId, buildStudioUrl, createJob } from './background-utils'
import { getUploadMode } from './settings'

// ── Storage helpers ──────────────────────────────────────
async function saveJob(job: Job): Promise<void> {
  const { [STORAGE_KEY]: existing } = await chrome.storage.local.get(STORAGE_KEY)
  const jobs: Job[] = Array.isArray(existing) ? existing : []
  const idx = jobs.findIndex((j) => j.jobId === job.jobId)
  if (idx >= 0) {
    jobs[idx] = job
  } else {
    jobs.push(job)
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: jobs })
}

async function getJobs(): Promise<Job[]> {
  const { [STORAGE_KEY]: existing } = await chrome.storage.local.get(STORAGE_KEY)
  return Array.isArray(existing) ? existing : []
}

async function updateJobStatus(jobId: string, status: Job['status']): Promise<void> {
  const jobs = await getJobs()
  const job = jobs.find((j) => j.jobId === jobId)
  if (job) {
    job.status = status
    await chrome.storage.local.set({ [STORAGE_KEY]: jobs })
  }
}

// ── UPLOAD_TO_YOUTUBE 처리 ───────────────────────────────
async function handleUpload(
  msg: UploadToYouTubeMessage,
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  const jobId = generateJobId()
  const effectiveMode = msg.payload.mode || await getUploadMode()
  const job = createJob(jobId, { ...msg.payload, mode: effectiveMode })

  try {
    const tab = await chrome.tabs.create({ url: buildStudioUrl(msg.payload.videoId), active: false })
    job.tabId = tab.id ?? null
    job.status = 'running'
    await saveJob(job)

    if (tab.id != null) {
      waitForTabLoad(tab.id, () => {
        chrome.tabs.sendMessage(tab.id!, {
          type: 'START_UPLOAD',
          payload: { jobId, ...msg.payload, mode: effectiveMode },
        })
      })
    }

    return { ok: true, jobId }
  } catch (err) {
    job.status = 'error'
    await saveJob(job)
    return { ok: false, error: String(err) }
  }
}

function waitForTabLoad(tabId: number, callback: () => void): void {
  const listener = (
    updatedTabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
  ) => {
    if (updatedTabId === tabId && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener)
      callback()
    }
  }
  chrome.tabs.onUpdated.addListener(listener)
}

const WEBAPP_URL_PATTERNS = [
  'http://localhost:3000/*',
  'https://*.creatordub.com/*',
]

async function relayToWebApp(event: OutboundEvent): Promise<void> {
  for (const pattern of WEBAPP_URL_PATTERNS) {
    try {
      const tabs = await chrome.tabs.query({ url: pattern })
      for (const tab of tabs) {
        if (tab.id != null) {
          chrome.tabs.sendMessage(tab.id, event).catch(() => {
            // tab may not have a content script listener — ignore
          })
        }
      }
    } catch {
      // pattern may not match any tabs — ignore
    }
  }
}

// ── 웹앱 → 확장 외부 메시지 수신 ────────────────────────
chrome.runtime.onMessageExternal.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (isPingMessage(message)) {
      sendResponse({ ok: true, version: chrome.runtime.getManifest().version })
      return true
    }

    if (isUploadToYouTubeMessage(message)) {
      handleUpload(message).then(sendResponse)
      return true
    }

    if (message !== null && typeof message === 'object' && (message as { type: string }).type === 'GET_JOBS') {
      getJobs().then((jobs) => sendResponse({ ok: true, jobs }))
      return true
    }

    sendResponse({ ok: false, error: 'UNKNOWN_MESSAGE_TYPE' })
    return true
  },
)

// ── content script → background 내부 메시지 (진행 릴레이) ─
chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (isContentProgressMessage(message)) {
      relayToWebApp(message as OutboundEvent)
      sendResponse({ ok: true })
      return true
    }

    if (isContentDoneMessage(message)) {
      updateJobStatus(message.payload.jobId, 'done').then(() => {
        relayToWebApp(message as OutboundEvent)
        sendResponse({ ok: true })
      })
      return true
    }

    if (isContentErrorMessage(message)) {
      updateJobStatus(message.payload.jobId, 'error').then(() => {
        relayToWebApp(message as OutboundEvent)
        sendResponse({ ok: true })
      })
      return true
    }

    return false
  },
)

function isContentProgressMessage(msg: unknown): msg is UploadProgressEvent {
  return msg !== null && typeof msg === 'object' && (msg as UploadProgressEvent).type === 'UPLOAD_PROGRESS'
}

function isContentDoneMessage(msg: unknown): msg is UploadDoneEvent {
  return msg !== null && typeof msg === 'object' && (msg as UploadDoneEvent).type === 'UPLOAD_DONE'
}

function isContentErrorMessage(msg: unknown): msg is UploadErrorEvent {
  return msg !== null && typeof msg === 'object' && (msg as UploadErrorEvent).type === 'UPLOAD_ERROR'
}

// ── 설치 이벤트 ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[CreatorDub] Extension installed')
})
