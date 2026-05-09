'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Puzzle, Upload, AlertCircle, ExternalLink, CheckCircle, XCircle, Loader2, Download } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { getLanguageByCode } from '@/utils/languages'
import { useNotificationStore } from '@/stores/notificationStore'
import { useExtensionDetect, sendToExtension } from '@/hooks/useExtensionDetect'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { text, type LocalizedText } from '@/lib/i18n/text'

interface Props {
  videoId: string
  completedLangs: string[]
  getAudioUrl: (langCode: string) => Promise<string | undefined>
  autoTrigger?: boolean
}

const INSTALL_GUIDE_URL = 'https://github.com/perso-devrel/dubtube/blob/main/extension/README.md'
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

const STEP_LABELS: Record<string, LocalizedText> = {
  NAVIGATING: { ko: 'YouTube Studio 여는 중', en: 'Opening YouTube Studio' },
  OPENING_LANGUAGES: { ko: '번역 페이지 확인 중', en: 'Checking the translations page' },
  SELECTING_LANGUAGE: { ko: '언어 선택 중', en: 'Choosing language' },
  INJECTING_AUDIO: { ko: '오디오 파일 추가 중', en: 'Adding audio file' },
  WAITING_PUBLISH: { ko: '게시 대기 중', en: 'Waiting to publish' },
  PUBLISHING: { ko: '게시 중', en: 'Publishing' },
  COMPLETED: { ko: '완료', en: 'Complete' },
}

const STEP_ALIASES: Record<string, string> = {
  OPENING_TRANSLATIONS: 'OPENING_LANGUAGES',
  OPENING_TRANSLATION_PAGE: 'OPENING_LANGUAGES',
  CHECKING_TRANSLATIONS: 'OPENING_LANGUAGES',
  ADDING_LANGUAGE: 'SELECTING_LANGUAGE',
  SELECT_LANGUAGE: 'SELECTING_LANGUAGE',
  LANGUAGE_SELECT: 'SELECTING_LANGUAGE',
  DOWNLOADING_AUDIO: 'INJECTING_AUDIO',
  ADDING_AUDIO: 'INJECTING_AUDIO',
  AUDIO_INJECTING: 'INJECTING_AUDIO',
  WAITING_FOR_PUBLISH: 'WAITING_PUBLISH',
  PUBLISH_READY: 'WAITING_PUBLISH',
  PUBLISHED: 'COMPLETED',
  DONE: 'COMPLETED',
}

function normalizeStep(step: string) {
  const normalized = step.trim().replace(/[\s-]+/g, '_').toUpperCase()
  return STEP_ALIASES[normalized] ?? normalized
}

export function YouTubeExtensionUpload({ videoId, completedLangs, getAudioUrl, autoTrigger = false }: Props) {
  const { status: extensionStatus, version, recheck } = useExtensionDetect()
  const locale = useAppLocale()
  const t = useLocaleText()
  const [uploadingLang, setUploadingLang] = useState<string | null>(null)
  const [langJobs, setLangJobs] = useState<Record<string, LangJobState>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoTriggered = useRef(false)
  const loggedExtensionErrors = useRef<Set<string>>(new Set())
  const addToast = useNotificationStore((s) => s.addToast)

  const getDisplayLanguageName = useCallback((langCode: string) => {
    const lang = getLanguageByCode(langCode)
    if (!lang) return langCode
    return locale === 'ko' ? lang.nativeName : lang.name
  }, [locale])

  const getStepLabel = useCallback((step?: string) => {
    if (!step) return t({ ko: '진행 중...', en: 'In progress...' })
    const label = STEP_LABELS[normalizeStep(step)]
    return label ? text(locale, label) : t({ ko: '진행 중...', en: 'In progress...' })
  }, [locale, t])

  const pollJobs = useCallback(async () => {
    try {
      const response = await sendToExtension({ type: 'GET_JOBS' }) as { ok: boolean; jobs?: ExtJob[] }
      if (!response.ok || !response.jobs) return

      const updated: Record<string, LangJobState> = {}
      for (const job of response.jobs) {
        if (job.videoId === videoId) {
          if (job.error) {
            const errorKey = `${job.jobId}:${job.error}`
            if (!loggedExtensionErrors.current.has(errorKey)) {
              loggedExtensionErrors.current.add(errorKey)
              console.warn('[Dubtube] Extension upload error', {
                jobId: job.jobId,
                languageCode: job.languageCode,
                step: job.step,
                error: job.error,
              })
            }
          }
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
        addToast({ type: 'error', title: t({ ko: '오디오 파일을 준비하지 못했습니다', en: 'Could not prepare the audio file' }) })
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
          title: t({ ko: `${getDisplayLanguageName(langCode)} 오디오 트랙 추가 시작`, en: `${getDisplayLanguageName(langCode)} audio track started` }),
          message: t({ ko: 'YouTube Studio에서 진행 상황을 확인하세요.', en: 'Check the progress in YouTube Studio.' }),
        })
      } else {
        if (response.error) {
          console.warn('[Dubtube] Extension upload request failed', response.error)
        }
        addToast({
          type: 'error',
          title: t({ ko: '오디오 트랙 추가 실패', en: 'Audio track upload failed' }),
          message: t({ ko: '잠시 후 다시 시도하거나 수동으로 추가해 주세요.', en: 'Try again shortly or add it manually.' }),
        })
      }
    } catch (err) {
      console.warn('[Dubtube] Extension connection failed', err)
      addToast({
        type: 'error',
        title: t({ ko: '확장 프로그램 연결 실패', en: 'Extension connection failed' }),
        message: t({ ko: 'Chrome 확장 프로그램이 켜져 있는지 확인해 주세요.', en: 'Check that the Chrome extension is enabled.' }),
      })
    } finally {
      setUploadingLang(null)
    }
  }, [videoId, getAudioUrl, addToast, getDisplayLanguageName, t])

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
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-surface-500 dark:text-surface-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
            {t({ ko: '확장 프로그램이 필요합니다', en: 'Chrome extension required' })}
          </p>
          <p className="mb-2 text-xs text-surface-500 dark:text-surface-300">
            {t({
              ko: '확장 프로그램을 설치하면 YouTube Studio에서 오디오 트랙 추가를 도와드립니다.',
              en: 'Install the extension to add audio tracks in YouTube Studio.',
            })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(INSTALL_GUIDE_URL, '_blank')}>
              <ExternalLink className="h-3 w-3" />
              {t({ ko: '설치 가이드', en: 'Install guide' })}
            </Button>
            <Button variant="ghost" size="sm" onClick={recheck}>
              {t({ ko: '다시 확인', en: 'Check again' })}
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
          {t({ ko: '오디오 트랙 자동 추가', en: 'Audio track assistant' })}
        </span>
        <Badge variant="success">{t({ ko: '연결됨', en: 'Connected' })}{version ? ` v${version}` : ''}</Badge>
      </div>
      <p className="mb-3 text-xs text-surface-500 dark:text-surface-300">
        {t({
          ko: 'Chrome 확장이 YouTube Studio를 열고 더빙 오디오를 트랙으로 추가합니다.',
          en: 'The Chrome extension opens YouTube Studio and adds dubbed audio as tracks.',
        })}
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
                <p className="text-sm font-medium text-surface-900 dark:text-white">{getDisplayLanguageName(code)}</p>
                {job?.status === 'running' && (
                  <p className="text-xs text-brand-500">
                    {getStepLabel(job.step)}
                  </p>
                )}
                {job?.status === 'done' && (
                  <p className="text-xs text-emerald-600">{t({ ko: '오디오 트랙 추가 완료', en: 'Audio track added' })}</p>
                )}
                {job?.status === 'error' && (
                  <div>
                    <p className="text-xs text-red-500">{t({ ko: '자동 추가 실패', en: 'Auto add failed' })}</p>
                    <p className="text-[10px] text-red-400">
                      {t({
                        ko: '업로드를 완료하지 못했습니다. YouTube Studio에서 직접 확인해 주세요.',
                        en: 'Upload could not be completed. Please check in YouTube Studio.',
                      })}
                    </p>
                    {job.step && (
                      <p className="text-[10px] text-red-400">
                        {t({ ko: '멈춘 단계', en: 'Stopped at' })}: {getStepLabel(job.step)}
                      </p>
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
                    {t({ ko: '재시도', en: 'Retry' })}
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
                    {t({ ko: '오디오 받기', en: 'Download audio' })}
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
                    {t({ ko: 'Studio 열기', en: 'Open Studio' })}
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
                {t({ ko: '자동 추가', en: 'Auto add' })}
              </Button>
            )}
          </div>
        )
      })}

      {Object.values(langJobs).some((j) => j.status === 'error') && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/10 dark:border-amber-800">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
            {t({ ko: '수동으로 추가하기', en: 'Add manually' })}
          </p>
          <ol className="text-xs text-amber-700 dark:text-amber-400 list-decimal list-inside space-y-0.5">
            <li>{t({ ko: '오디오 파일을 내려받으세요.', en: 'Download the audio file.' })}</li>
            <li>{t({ ko: 'YouTube Studio 번역 페이지를 여세요.', en: 'Open the translations page in YouTube Studio.' })}</li>
            <li>{t({ ko: '해당 언어의 오디오 트랙에 파일을 추가하세요.', en: 'Add the file to the audio track for that language.' })}</li>
          </ol>
        </div>
      )}
    </div>
  )
}
