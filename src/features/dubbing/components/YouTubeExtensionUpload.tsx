'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Puzzle, Upload, AlertCircle, ExternalLink, CheckCircle, XCircle, Loader2, Download } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { getLanguageByCode } from '@/utils/languages'
import { useNotificationStore } from '@/stores/notificationStore'
import { useExtensionDetect, sendToExtension } from '@/hooks/useExtensionDetect'

interface Props {
  videoId: string
  completedLangs: string[]
  getAudioUrl: (langCode: string) => Promise<string | undefined>
  autoTrigger?: boolean
}

const INSTALL_GUIDE_URL = 'https://github.com/perso-devrel/creatordubbing/blob/main/extension/README.md'
const POLL_INTERVAL = 3000

type JobStatus = 'pending' | 'running' | 'done' | 'error'

interface ExtJob {
  jobId: string
  videoId: string
  languageCode: string
  status: JobStatus
  step?: string
  error?: string
}

interface LangJobState {
  jobId: string
  status: JobStatus
  step?: string
  error?: string
}

const STEP_LABELS: Record<string, string> = {
  NAVIGATING: '페이지 이동 중',
  OPENING_LANGUAGES: '번역 페이지 확인',
  SELECTING_LANGUAGE: '언어 선택 중',
  INJECTING_AUDIO: '오디오 주입 중',
  WAITING_PUBLISH: '게시 대기',
  PUBLISHING: '게시 중',
  COMPLETED: '완료',
}

export function YouTubeExtensionUpload({ videoId, completedLangs, getAudioUrl, autoTrigger = false }: Props) {
  const { status: extensionStatus, version, recheck } = useExtensionDetect()
  const [uploadingLang, setUploadingLang] = useState<string | null>(null)
  const [langJobs, setLangJobs] = useState<Record<string, LangJobState>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoTriggered = useRef(false)
  const addToast = useNotificationStore((s) => s.addToast)

  const pollJobs = useCallback(async () => {
    try {
      const response = await sendToExtension({ type: 'GET_JOBS' }) as { ok: boolean; jobs?: ExtJob[] }
      if (!response.ok || !response.jobs) return

      const updated: Record<string, LangJobState> = {}
      for (const job of response.jobs) {
        if (job.videoId === videoId) {
          updated[job.languageCode] = {
            jobId: job.jobId,
            status: job.status,
            step: job.step,
            error: job.error,
          }
        }
      }
      if (Object.keys(updated).length > 0) {
        setLangJobs((prev) => ({ ...prev, ...updated }))
      }
    } catch {
      // extension unavailable — stop polling
    }
  }, [videoId])

  useEffect(() => {
    const hasActiveJobs = Object.values(langJobs).some(
      (j) => j.status === 'pending' || j.status === 'running',
    )
    if (hasActiveJobs && extensionStatus === 'installed') {
      pollRef.current = setInterval(pollJobs, POLL_INTERVAL)
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [langJobs, extensionStatus, pollJobs])

  const handleExtensionUpload = useCallback(async (langCode: string) => {
    const lang = getLanguageByCode(langCode)
    if (!lang) return

    setUploadingLang(langCode)
    try {
      const audioUrl = await getAudioUrl(langCode)
      if (!audioUrl) {
        addToast({ type: 'error', title: '오디오 URL을 찾을 수 없습니다' })
        return
      }

      const response = await sendToExtension({
        type: 'UPLOAD_TO_YOUTUBE',
        payload: { videoId, languageCode: langCode, audioUrl, mode: 'assisted' },
      }) as { ok: boolean; jobId?: string; error?: string }

      if (response.ok && response.jobId) {
        setLangJobs((prev) => ({
          ...prev,
          [langCode]: { jobId: response.jobId!, status: 'running' },
        }))
        addToast({
          type: 'success',
          title: `${lang.name} 확장 업로드 시작`,
          message: 'YouTube Studio에서 자동 진행됩니다.',
        })
      } else {
        addToast({ type: 'error', title: '확장 업로드 실패', message: response.error || '알 수 없는 오류' })
      }
    } catch (err) {
      addToast({ type: 'error', title: '확장 통신 실패', message: err instanceof Error ? err.message : String(err) })
    } finally {
      setUploadingLang(null)
    }
  }, [videoId, getAudioUrl, addToast])

  // Auto-trigger: sequentially upload all languages without user clicking
  useEffect(() => {
    if (!autoTrigger || autoTriggered.current) return
    if (extensionStatus !== 'installed') return
    if (completedLangs.length === 0) return
    autoTriggered.current = true

    const runAll = async () => {
      for (const code of completedLangs) {
        if (langJobs[code]?.status === 'done') continue
        await handleExtensionUpload(code)
      }
    }
    runAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTrigger, extensionStatus, completedLangs.length])

  if (extensionStatus === 'checking') return null

  if (extensionStatus === 'not-installed') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-surface-300 p-3 dark:border-surface-700">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-surface-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
            CreatorDub 확장 미설치
          </p>
          <p className="text-xs text-surface-400 mb-2">
            Chrome 확장을 설치하면 오디오 트랙 업로드를 자동화할 수 있습니다.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(INSTALL_GUIDE_URL, '_blank')}>
              <ExternalLink className="h-3 w-3" />
              설치 가이드
            </Button>
            <Button variant="ghost" size="sm" onClick={recheck}>
              다시 감지
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Puzzle className="h-4 w-4 text-brand-500" />
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
          확장 자동 업로드
        </span>
        <Badge variant="success">연결됨{version ? ` v${version}` : ''}</Badge>
      </div>
      <p className="text-xs text-surface-500 mb-3">
        CreatorDub 확장이 YouTube Studio를 자동으로 열고 오디오 트랙을 추가합니다.
      </p>
      {completedLangs.map((code) => {
        const lang = getLanguageByCode(code)
        if (!lang) return null
        const job = langJobs[code]

        return (
          <div
            key={code}
            className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg">{lang.flag}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</p>
                {job?.status === 'running' && (
                  <p className="text-xs text-brand-500">
                    {job.step ? STEP_LABELS[job.step] || job.step : '진행 중...'}
                  </p>
                )}
                {job?.status === 'done' && (
                  <p className="text-xs text-emerald-600">업로드 완료</p>
                )}
                {job?.status === 'error' && (
                  <div>
                    <p className="text-xs text-red-500">자동 업로드 실패</p>
                    {job.error && (
                      <p className="text-[10px] text-red-400 mt-0.5 break-all">{job.error}</p>
                    )}
                    {job.step && (
                      <p className="text-[10px] text-red-400">실패 단계: {STEP_LABELS[job.step] || job.step}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {job?.status === 'done' ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : job?.status === 'running' || job?.status === 'pending' ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            ) : job?.status === 'error' ? (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtensionUpload(code)}
                    disabled={uploadingLang !== null}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    재시도
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const url = await getAudioUrl(code)
                      if (url) window.open(url, '_blank')
                    }}
                  >
                    <Download className="h-3 w-3" />
                    오디오
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://studio.youtube.com/video/${videoId}/translations`,
                        '_blank',
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    Studio
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleExtensionUpload(code)}
                loading={uploadingLang === code}
                disabled={uploadingLang !== null}
              >
                <Upload className="h-3.5 w-3.5" />
                자동 업로드
              </Button>
            )}
          </div>
        )
      })}

      {Object.values(langJobs).some((j) => j.status === 'error') && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/10 dark:border-amber-800">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
            수동 업로드 안내
          </p>
          <ol className="text-xs text-amber-700 dark:text-amber-400 list-decimal list-inside space-y-0.5">
            <li>위에서 &quot;오디오&quot; 버튼을 눌러 파일을 다운로드하세요.</li>
            <li>&quot;Studio&quot; 버튼을 눌러 YouTube Studio 번역 페이지를 여세요.</li>
            <li>해당 언어의 오디오 트랙에 다운로드한 파일을 업로드하세요.</li>
          </ol>
        </div>
      )}
    </div>
  )
}
