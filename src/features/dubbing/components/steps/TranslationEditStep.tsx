'use client'

import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { Button, Card, Badge, Toggle } from '@/components/ui'
import { cn } from '@/utils/cn'
import { getLanguageByCode } from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'

const MAX_SPEAKERS = 10

export function TranslationEditStep() {
  const {
    sourceLanguage,
    selectedLanguages,
    lipSyncEnabled,
    setLipSync,
    numberOfSpeakers,
    setNumberOfSpeakers,
    videoMeta,
    deliverableMode,
    uploadSettings,
    prevStep,
    nextStep,
  } = useDubbingStore()

  const sourceLang = getLanguageByCode(sourceLanguage)
  const isAutoSource = sourceLanguage === 'auto'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">설정 확인</h2>
        <p className="mt-1 text-surface-500">
          처리 전 더빙 설정을 확인하세요.
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <h3 className="font-semibold text-surface-900 dark:text-white mb-4">더빙 설정</h3>

        <div className="space-y-4">
          {/* Source video */}
          <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
            <span className="text-sm text-surface-600 dark:text-surface-400">원본 영상</span>
            <span className="text-sm font-medium text-surface-900 dark:text-white truncate ml-4 max-w-[300px]">
              {videoMeta?.title || '알 수 없음'}
            </span>
          </div>

          {/* Source language */}
          <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
            <span className="text-sm text-surface-600 dark:text-surface-400">원본 언어</span>
            <span className="text-sm font-medium text-surface-900 dark:text-white">
              {isAutoSource
                ? '🌐 자동 감지'
                : `${sourceLang?.flag ?? ''} ${sourceLang?.name ?? '알 수 없음'}`}
            </span>
          </div>

          {/* Target languages */}
          <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
            <span className="text-sm text-surface-600 dark:text-surface-400 mb-2 block">
              대상 언어 ({selectedLanguages.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedLanguages.map((code) => {
                const lang = getLanguageByCode(code)
                if (!lang) return null
                return (
                  <Badge key={code} variant="brand">
                    {lang.flag} {lang.name}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Number of speakers */}
          <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600 dark:text-surface-400">화자 수</span>
              <span className="text-sm font-semibold text-surface-900 dark:text-white">
                {numberOfSpeakers}명
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: MAX_SPEAKERS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumberOfSpeakers(n)}
                  className={cn(
                    'h-8 w-8 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    numberOfSpeakers === n
                      ? 'bg-brand-500 text-white'
                      : 'bg-white text-surface-600 border border-surface-300 hover:border-brand-300 dark:bg-surface-700 dark:text-surface-300 dark:border-surface-600',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-surface-400">
              영상에 등장하는 화자 수를 선택하세요. 정확하게 설정하면 Perso AI가 화자별로 음성을 분리해 더빙합니다.
            </p>
          </div>

          {/* Lip sync */}
          <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
            <div>
              <span className="text-sm text-surface-600 dark:text-surface-400">립싱크</span>
              <p className="text-xs text-surface-400 mt-0.5">더빙 오디오에 맞춰 입 모양을 조절합니다</p>
            </div>
            <Toggle checked={lipSyncEnabled} onChange={setLipSync} />
          </div>

          {/* Deliverable mode */}
          <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
            <span className="text-sm text-surface-600 dark:text-surface-400">결과물 모드</span>
            <span className="text-sm font-medium text-surface-900 dark:text-white">
              {deliverableMode === 'newDubbedVideos' ? '새 더빙 영상 업로드'
                : deliverableMode === 'originalWithMultiAudio' ? '원본 영상에 자막 추가'
                : '다운로드만'}
            </span>
          </div>

          {/* Auto upload */}
          <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
            <span className="text-sm text-surface-600 dark:text-surface-400">자동 업로드</span>
            <span className={cn(
              'text-sm font-medium',
              uploadSettings.autoUpload ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-500',
            )}>
              {uploadSettings.autoUpload ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </Card>

      {/* Info note */}
      <Card className="flex items-start gap-3 bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">처리 과정</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            Perso.ai가 자동으로 영상을 전사하고, 선택한 모든 언어로 번역한 뒤, 보이스 클론으로 더빙 오디오를 생성합니다. 처리 완료 후 번역을 수정할 수 있습니다. 처리 시간은 영상 길이에 따라 보통 3-10분입니다.
          </p>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          이전
        </Button>
        <Button onClick={nextStep}>
          더빙 시작
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
