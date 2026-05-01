'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Card, Progress, Badge, Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { getLanguageByCode } from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'
import { usePersoFlow } from '../../hooks/usePersoFlow'
import type { JobStatus } from '../../types/dubbing.types'

const statusLabels: Record<JobStatus, string> = {
  idle: '대기 중',
  transcribing: '전사 중',
  translating: '번역 중',
  synthesizing: '대기열',
  'lip-syncing': '립싱크 중',
  merging: '처리 중',
  completed: '완료',
  failed: '실패',
}

const reasonLabels: Record<string, string> = {
  PENDING: '대기열에서 대기 중...',
  CREATED: '초기화 중...',
  READY: '전사 준비 중...',
  READY_TARGET_LANGUAGES: '번역 중...',
  ENQUEUED: '합성 대기 중...',
  PROCESSING: '더빙 오디오 생성 중...',
  COMPLETED: '완료!',
  Completed: '완료!',
  FAILED: '처리 실패',
  Failed: '처리 실패',
  CANCELED: '취소됨',
}

function getProgressLabel(lp: { progressReason: string; progress: number }) {
  if (lp.progress >= 100 && lp.progressReason !== 'COMPLETED' && lp.progressReason !== 'Completed' && lp.progressReason !== 'FAILED' && lp.progressReason !== 'Failed' && lp.progressReason !== 'CANCELED') {
    return '마무리 중...'
  }
  return reasonLabels[lp.progressReason] || lp.progressReason
}

export function ProcessingStep() {
  const { languageProgress, jobStatus, setStep, isSubmitted, setIsSubmitted, deliverableMode } = useDubbingStore()
  const { submitDubbing, startPolling, stopPolling, cancelAll } = usePersoFlow()
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
          {allCompleted ? '더빙 완료!' : '영상 처리 중'}
        </h2>
        <p className="mt-1 text-surface-500">
          {allCompleted
            ? '모든 언어 처리가 완료되었습니다.'
            : deliverableMode === 'originalWithMultiAudio'
              ? 'AI가 전사, 번역, 자막 생성을 진행하고 있습니다.'
              : 'AI가 전사, 번역, 더빙 오디오를 생성하고 있습니다. 몇 분 정도 소요됩니다.'}
        </p>
      </div>

      {/* Overall progress */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300">전체 진행률</span>
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
            더빙 취소
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
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{lang.name}</p>
                  <p className="text-xs text-surface-500">
                    {getProgressLabel(lp)}
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
                  {statusLabels[lp.status]}
                </Badge>
                <span className="text-xs text-surface-400">{Math.round(lp.progress)}%</span>
              </div>

              {lp.projectSeq > 0 && (
                <p className="mt-1 text-[10px] text-surface-400">Project #{lp.projectSeq}</p>
              )}
            </Card>
          )
        })}
      </div>

      {jobStatus === 'failed' && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
          <p className="text-sm text-red-700 dark:text-red-400">
            일부 언어 처리에 실패했습니다. 완료된 언어는 다운로드할 수 있습니다.
          </p>
        </Card>
      )}
    </div>
  )
}
