import type { Job } from '../background-types'
import { STORAGE_KEY } from '../background-types'
import { getUploadMode, setUploadMode } from '../settings'
import {
  USER_UPLOAD_FAILURE_MESSAGE,
  modeDescription,
  statusLabel,
  uploadStepLabel,
} from './labels'

const RECENT_JOB_COUNT = 5

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const statusEl = document.getElementById('status')!
const versionEl = document.getElementById('version')!
const jobsContainer = document.getElementById('jobs-container')!
const modeToggle = document.getElementById('mode-toggle') as HTMLInputElement
const modeDesc = document.getElementById('mode-desc')!

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function badgeClass(status: Job['status']): string {
  return `badge-${status}`
}

function renderJobs(jobs: Job[]): void {
  const recent = jobs
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, RECENT_JOB_COUNT)

  if (recent.length === 0) {
    jobsContainer.innerHTML = '<p class="empty">아직 업로드 기록이 없습니다.</p>'
    return
  }

  const ul = document.createElement('ul')
  ul.className = 'job-list'

  for (const job of recent) {
    const li = document.createElement('li')
    li.className = 'job-item'

    const stepText = uploadStepLabel(job.step)
    const stepInfo = stepText ? `<span class="job-step">${escapeHtml(stepText)}</span>` : ''
    const errorInfo = job.status === 'error'
      ? `<span class="job-error">${escapeHtml(USER_UPLOAD_FAILURE_MESSAGE)}</span>`
      : ''

    li.innerHTML = `
      <span class="job-badge ${badgeClass(job.status)}">${escapeHtml(statusLabel(job.status))}</span>
      <span class="job-info">
        <span class="job-video">${escapeHtml(job.videoId)}</span>
        <span class="job-meta">${escapeHtml(job.languageCode)}</span>
        ${stepInfo}
        ${errorInfo}
      </span>
      <span class="job-time">${formatTime(job.createdAt)}</span>
    `
    ul.appendChild(li)
  }

  jobsContainer.innerHTML = ''
  jobsContainer.appendChild(ul)
}

function updateStatus(jobs: Job[]): void {
  const runningCount = jobs.filter((j) => j.status === 'running').length
  if (runningCount > 0) {
    statusEl.textContent = `${runningCount}건 업로드 진행 중`
    statusEl.className = 'status active'
    return
  }

  statusEl.textContent = '준비됨'
  statusEl.className = 'status ok'
}

function updateModeDesc(isAuto: boolean): void {
  modeDesc.textContent = modeDescription(isAuto)
}

async function init(): Promise<void> {
  const manifest = chrome.runtime.getManifest()
  versionEl.textContent = `v${manifest.version}`

  const currentMode = await getUploadMode()
  modeToggle.checked = currentMode === 'auto'
  updateModeDesc(modeToggle.checked)

  modeToggle.addEventListener('change', async () => {
    const newMode = modeToggle.checked ? 'auto' : 'assisted'
    await setUploadMode(newMode)
    updateModeDesc(modeToggle.checked)
  })

  const { [STORAGE_KEY]: stored } = await chrome.storage.local.get(STORAGE_KEY)
  const jobs: Job[] = Array.isArray(stored) ? stored : []

  updateStatus(jobs)
  renderJobs(jobs)
}

init().catch((err) => {
  console.error('[Dubtube] Popup initialization failed', err)
  statusEl.textContent = '상태를 불러오지 못했습니다.'
  statusEl.className = 'status warn'
  jobsContainer.innerHTML = '<p class="empty">업로드 기록을 불러오지 못했습니다.</p>'
})
