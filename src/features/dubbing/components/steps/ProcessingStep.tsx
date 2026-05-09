'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Card, Progress, Badge, Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { text, type LocalizedText } from '@/lib/i18n/text'
import { getLanguageByCode } from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'
import { usePersoFlow } from '../../hooks/usePersoFlow'
import type { JobStatus } from '../../types/dubbing.types'

const statusLabels: Record<JobStatus, LocalizedText> = {
  idle: { ko: '대기 중', en: 'Waiting' },
  transcribing: { ko: '전사 중', en: 'Transcribing' },
  translating: { ko: '번역 중', en: 'Translating' },
  synthesizing: { ko: '음성 생성 중', en: 'Generating voice' },
  'lip-syncing': { ko: '립싱크 중', en: 'Lip-syncing' },
  merging: { ko: '처리 중', en: 'Processing' },
  completed: { ko: '완료', en: 'Complete' },
  failed: { ko: '실패', en: 'Failed' },
}

const reasonLabels: Record<string, LocalizedText> = {
  PENDING: { ko: '작업 순서를 기다리는 중...', en: 'Waiting in queue...' },
  CREATED: { ko: '작업을 준비하는 중...', en: 'Preparing job...' },
  READY: { ko: '전사를 준비하는 중...', en: 'Preparing transcription...' },
  READY_TARGET_LANGUAGES: { ko: '번역하는 중...', en: 'Translating...' },
  ENQUEUED: { ko: '음성 생성을 준비하는 중...', en: 'Preparing voice generation...' },
  PROCESSING: { ko: '더빙 오디오를 만드는 중...', en: 'Creating dubbed audio...' },
  COMPLETED: { ko: '완료', en: 'Complete' },
  Completed: { ko: '완료', en: 'Complete' },
  FAILED: { ko: '처리 실패', en: 'Processing failed' },
  Failed: { ko: '처리 실패', en: 'Processing failed' },
  CANCELED: { ko: '취소됨', en: 'Canceled' },
}

function getProgressLabel(locale: ReturnType<typeof useAppLocale>, lp: { progressReason: string; progress: number }) {
  if (lp.progress >= 100 && lp.progressReason !== 'COMPLETED' && lp.progressReason !== 'Completed' && lp.progressReason !== 'FAILED' && lp.progressReason !== 'Failed' && lp.progressReason !== 'CANCELED') {
    return text(locale, { ko: '마무리하는 중...', en: 'Finalizing...' })
  }
  return reasonLabels[lp.progressReason]
    ? text(locale, reasonLabels[lp.progressReason])
    : text(locale, { ko: '처리 중...', en: 'Processing...' })
}

export function ProcessingStep() {
  const { languageProgress, jobStatus, setStep, isSubmitted, setIsSubmitted, deliverableMode } = useDubbingStore()
  const { submitDubbing, startPolling, stopPolling, cancelAll } = usePersoFlow()
  const locale = useAppLocale()
  const t = useLocaleText()
  const [cancelling, setCancelling] = useState(false)
  const submittedRef = useRef(isSubmitted)

  // Submit dubbing and start polling on mount — ref guard prevents double-fire in Strict Mode
  useEffect(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    setIsSubmitted(true)

    const run = async () => {
      try {
        await submitDubbing()
        startPolling()
      } catch {
        // Error already handled in hook via toast
      }
    }
    run()

    return () => stopPolling()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount
  }, [])

  // Auto-advance when all complete
  const allCompleted = languageProgress.length > 0 && languageProgress.every(
    (p) => p.progressReason === 'COMPLETED' || p.progressReason === 'Completed' || p.progressReason === 'FAILED' || p.progressReason === 'Failed' || p.progressReason === 'CANCELED',
  )

  useEffect(() => {
    if (allCompleted) {
      stopPolling()
      const t = setTimeout(() => setStep(7), 2000)
      return () => clearTimeout(t)
    }
  }, [allCompleted, setStep, stopPolling])

  const overallProgress =
    languageProgress.length > 0
      ? Math.round(languageProgress.reduce((acc, p) => acc + p.progress, 0) / languageProgress.length)
      : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">
          {allCompleted ? t({ ko: '처리 완료', en: 'Processing complete' }) : t({ ko: '영상 처리 중', en: 'Processing video' })}
        </h2>
        <p className="mt-1 text-surface-500">
          {allCompleted
            ? t({ ko: '완료된 파일을 확인하고 필요한 작업을 이어서 진행하세요.', en: 'Review the finished files and continue with the next action.' })
            : deliverableMode === 'originalWithMultiAudio'
              ? t({ ko: 'AI가 전사, 번역, 자막 생성을 진행하고 있습니다.', en: 'AI is transcribing, translating, and creating captions.' })
              : t({ ko: 'AI가 전사, 번역, 더빙 오디오 생성을 진행하고 있습니다.', en: 'AI is transcribing, translating, and creating dubbed audio.' })}
        </p>
      </div>

      {/* Overall progress */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{t({ ko: '전체 진행률', en: 'Overall progress' })}</span>
          <span className="text-sm font-bold text-surface-900 dark:text-white">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} size="lg" />
      </Card>

      {/* Cancel button */}
      {!allCompleted && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setCancelling(true)
              await cancelAll()
              setCancelling(false)
            }}
            loading={cancelling}
            disabled={cancelling}
            className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
          >
            <XCircle className="h-4 w-4" />
            {t({ ko: '작업 취소', en: 'Cancel job' })}
          </Button>
        </div>
      )}

      {/* Per-language cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {languageProgress.map((lp) => {
          const lang = getLanguageByCode(lp.langCode)
          if (!lang) return null

          const isCompleted = lp.progressReason === 'COMPLETED' || lp.progressReason === 'Completed'
          const isFailed = lp.progressReason === 'FAILED' || lp.progressReason === 'Failed' || lp.progressReason === 'CANCELED'

          return (
            <Card
              key={lp.langCode}
              className={cn(
                'transition-all',
                isCompleted && 'border-emerald-200 dark:border-emerald-800',
                isFailed && 'border-red-200 dark:border-red-800',
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{lang.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{locale === 'ko' ? lang.nativeName : lang.name}</p>
                  <p className="text-xs text-surface-500">
                    {getProgressLabel(locale, lp)}
                  </p>
                </div>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : isFailed ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                )}
              </div>

              <Progress value={lp.progress} size="sm" />

              <div className="mt-2 flex items-center justify-between">
                <Badge
                  variant={
                    isCompleted ? 'success' : isFailed ? 'error' : 'brand'
                  }
                >
                  {text(locale, statusLabels[lp.status])}
                </Badge>
                <span className="text-xs text-surface-400">{Math.round(lp.progress)}%</span>
              </div>

            </Card>
          )
        })}
      </div>

      {jobStatus === 'failed' && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
          <p className="text-sm text-red-700 dark:text-red-400">
            {t({ ko: '일부 언어 처리에 실패했습니다. 완료된 언어는 다운로드할 수 있습니다.', en: 'Some languages failed. Completed languages are still available to download.' })}
          </p>
        </Card>
      )}
    </div>
  )
}
