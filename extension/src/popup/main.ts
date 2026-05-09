import type { Job } from '../background-types'
import { STORAGE_KEY } from '../background-types'
import { getUploadMode, setUploadMode } from '../settings'

const RECENT_JOB_COUNT = 5

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
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

function statusLabel(status: Job['status']): string {
  switch (status) {
    case 'pending': return '대기'
    case 'running': return '진행 중'
    case 'done': return '완료'
    case 'error': return '오류'
  }
}

function renderJobs(jobs: Job[]): void {
  const recent = jobs
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
    const stepInfo = job.step ? ` · ${job.step}` : ''
    const errorInfo = job.error ? `<span class="job-error" title="${escapeHtml(job.error)}">${truncate(job.error, 40)}</span>` : ''
    li.innerHTML = `
      <span class="job-badge ${badgeClass(job.status)}">${statusLabel(job.status)}${stepInfo}</span>
      <span class="job-info">
        <span class="job-video">${job.videoId}</span>
        <span class="job-lang">${job.languageCode}</span>
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
  const running = jobs.filter((j) => j.status === 'running')
  if (running.length > 0) {
    statusEl.textContent = `${running.length}건 업로드 진행 중`
    statusEl.className = 'status active'
  } else {
    statusEl.textContent = '준비됨'
    statusEl.className = 'status ok'
  }
}

function updateModeDesc(isAuto: boolean): void {
  modeDesc.textContent = isAuto
    ? '자동 모드: 게시까지 자동으로 진행'
    : '도움 모드: 파일 추가까지만 자동으로 진행'
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
  statusEl.textContent = `오류: ${err instanceof Error ? err.message : String(err)}`
  statusEl.className = 'status warn'
  jobsContainer.innerHTML = '<p class="empty">데이터를 불러올 수 없습니다.</p>'
})
