'use client'

import { useEffect, useMemo } from 'react'
import { ArrowLeft, ArrowRight, Film, Subtitles, Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useLocaleText } from '@/hooks/useLocaleText'
import type { LocalizedText } from '@/lib/i18n/text'
import { useDubbingStore } from '../../store/dubbingStore'
import type { DeliverableMode, VideoSourceType } from '../../types/dubbing.types'

interface DeliverableOption {
  value: DeliverableMode
  icon: typeof Film
  title: LocalizedText
  description: LocalizedText
  disabled?: boolean
  badge?: LocalizedText
}

function getAvailableOptions(sourceType: VideoSourceType): DeliverableOption[] {
  const options: DeliverableOption[] = [
    {
      value: 'newDubbedVideos',
      icon: Film,
      title: { ko: '언어별 새 영상 만들기', en: 'Create new videos for each language' },
      description: { ko: '언어별 더빙 영상을 새 YouTube 영상으로 준비합니다.', en: 'Prepare a separate dubbed YouTube video for each language.' },
    },
  ]

  if (sourceType === 'channel') {
    options.push({
      value: 'originalWithMultiAudio',
      icon: Subtitles,
      title: { ko: '원본 영상에 자막 추가', en: 'Add captions to the original video' },
      description: { ko: '내 채널의 기존 영상에 번역 자막과 제목·설명을 추가합니다.', en: 'Add translated captions, titles, and descriptions to an existing channel video.' },
    })
  } else if (sourceType === 'upload') {
    options.push({
      value: 'originalWithMultiAudio',
      icon: Subtitles,
      title: { ko: '원본 업로드 후 자막 추가', en: 'Upload original with captions' },
      description: { ko: '원본 영상을 YouTube에 올리고 번역 자막을 함께 추가합니다.', en: 'Upload the original video to YouTube and add translated captions.' },
    })
  }

  options.push({
    value: 'downloadOnly',
    icon: Download,
    title: { ko: '파일만 다운로드', en: 'Download files only' },
    description: { ko: 'YouTube 업로드 없이 더빙 영상, 오디오, 자막 파일을 다운로드합니다.', en: 'Download dubbed video, audio, and caption files without uploading to YouTube.' },
  })

  return options
}

export function OutputModeStep() {
  const { deliverableMode, setDeliverableMode, videoSource, prevStep, nextStep } = useDubbingStore()
  const t = useLocaleText()
  const sourceType = videoSource?.type ?? 'upload'
  const options = useMemo(() => getAvailableOptions(sourceType), [sourceType])
  const isExternalUrl = videoSource?.type === 'url'

  useEffect(() => {
    if (!options.some((o) => o.value === deliverableMode && !o.disabled)) {
      setDeliverableMode('newDubbedVideos')
    }
  }, [sourceType, options, deliverableMode, setDeliverableMode])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">{t({ ko: '결과물 선택', en: 'Choose output' })}</h2>
        <p className="mt-1 text-surface-600 dark:text-surface-400">
          {t({ ko: '더빙이 끝난 뒤 어떤 형태로 받을지 선택하세요.', en: 'Choose what you want to do with the finished dubbing.' })}
        </p>
      </div>

      {isExternalUrl && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-300">{t({ ko: '저작권 안내', en: 'Copyright notice' })}</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              {t({
                ko: '직접 소유하지 않은 영상을 재업로드하면 문제가 될 수 있습니다. 업로드 권한이 있는 영상만 사용하세요.',
                en: 'Re-uploading videos you do not own can cause copyright issues. Only use videos you have permission to upload.',
              })}
            </p>
          </div>
        </div>
      )}

      <div className={cn('grid gap-4', options.length === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2')}>
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
                'flex flex-col items-center gap-4 rounded-lg border-2 p-4 text-center transition-all sm:p-5',
                disabled && 'cursor-not-allowed opacity-60',
                !disabled && 'cursor-pointer',
                selected
                  ? 'border-brand-600 bg-brand-50 shadow-sm dark:bg-brand-900/10'
                  : disabled
                    ? 'border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/60'
                    : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600',
              )}
            >
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full',
                  selected
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400',
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <p className={cn(
                    'text-base font-semibold leading-snug',
                    selected ? 'text-brand-700 dark:text-brand-300' : 'text-surface-900 dark:text-white',
                  )}>
                    {t(title)}
                  </p>
                  {badge && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {t(badge)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-surface-600 dark:text-surface-300">{t(description)}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          {t({ ko: '이전', en: 'Back' })}
        </Button>
        <Button onClick={nextStep}>
          {t({ ko: '다음: 언어 선택', en: 'Next: Choose languages' })}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
