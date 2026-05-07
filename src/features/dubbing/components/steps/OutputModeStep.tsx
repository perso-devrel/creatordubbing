'use client'

import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, Film, Subtitles, Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useDubbingStore } from '../../store/dubbingStore'
import type { DeliverableMode, VideoSourceType } from '../../types/dubbing.types'

interface DeliverableOption {
  value: DeliverableMode
  icon: typeof Film
  title: string
  description: string
  disabled?: boolean
  badge?: string
}

function getAvailableOptions(sourceType: VideoSourceType): DeliverableOption[] {
  const options: DeliverableOption[] = [
    {
      value: 'newDubbedVideos',
      icon: Film,
      title: '새 더빙 영상 업로드',
      description: '더빙된 영상을 YouTube에 업로드합니다.',
    },
  ]

  if (sourceType === 'channel') {
    options.push({
      value: 'originalWithMultiAudio',
      icon: Subtitles,
      title: '기존 영상에 자막 추가',
      description: '번역된 자막을 기존 YouTube 영상에 업로드합니다.',
    })
  } else if (sourceType === 'upload') {
    options.push({
      value: 'originalWithMultiAudio',
      icon: Subtitles,
      title: '원본 업로드 + 자막 추가',
      description: '원본 영상과 번역된 자막을 YouTube에 업로드합니다.',
    })
  }

  options.push({
    value: 'downloadOnly',
    icon: Download,
    title: '다운로드만',
    description: 'YouTube에 업로드하지 않고 관련 파일을 다운로드합니다.',
  })

  return options
}

export function OutputModeStep() {
  const { deliverableMode, setDeliverableMode, videoSource, prevStep, nextStep } = useDubbingStore()
  const sourceType = videoSource?.type ?? 'upload'
  const options = getAvailableOptions(sourceType)
  const isExternalUrl = videoSource?.type === 'url'

  useEffect(() => {
    if (!options.some((o) => o.value === deliverableMode && !o.disabled)) {
      setDeliverableMode('newDubbedVideos')
    }
  }, [sourceType, options, deliverableMode, setDeliverableMode])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">결과물 선택</h2>
        <p className="mt-1 text-surface-500">
          더빙 결과물을 어떻게 활용할지 선택하세요.
        </p>
      </div>

      {isExternalUrl && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-300">저작권 안내</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              타인의 영상을 무단으로 재업로드하면 저작권 위반이 될 수 있습니다. 저작권을 지켜주세요.
            </p>
          </div>
        </div>
      )}

      <div className={cn('grid gap-4', options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {options.map(({ value, icon: Icon, title, description, disabled, badge }) => {
          const selected = deliverableMode === value && !disabled
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) setDeliverableMode(value)
              }}
              className={cn(
                'flex flex-col items-center gap-4 rounded-xl border-2 p-6 text-center transition-all',
                disabled && 'cursor-not-allowed opacity-60',
                !disabled && 'cursor-pointer',
                selected
                  ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/10 dark:bg-brand-900/10'
                  : disabled
                    ? 'border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/60'
                    : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600',
              )}
            >
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full',
                  selected
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400',
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <p className={cn(
                    'text-lg font-semibold',
                    selected ? 'text-brand-700 dark:text-brand-300' : 'text-surface-900 dark:text-white',
                  )}>
                    {title}
                  </p>
                  {badge && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-surface-500">{description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          이전
        </Button>
        <Button onClick={nextStep}>
          다음: 언어 선택
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
