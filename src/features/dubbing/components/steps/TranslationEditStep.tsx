'use client'

import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { Button, Card, CardTitle, Badge, Toggle } from '@/components/ui'
import { cn } from '@/utils/cn'
import { getLanguageByCode } from '@/utils/languages'
import { useAuthStore } from '@/stores/authStore'
import { useDubbingStore } from '../../store/dubbingStore'
import type { PrivacyStatus } from '../../types/dubbing.types'

const MAX_SPEAKERS = 10

const PRIVACY_LABELS: Record<PrivacyStatus, string> = {
  private: '비공개 (권장)',
  unlisted: '일부 공개',
  public: '공개',
}

export function TranslationEditStep() {
  const {
    sourceLanguage,
    selectedLanguages,
    lipSyncEnabled,
    setLipSync,
    numberOfSpeakers,
    setNumberOfSpeakers,
    videoMeta,
    videoSource,
    deliverableMode,
    uploadSettings,
    setUploadSettings,
    prevStep,
    nextStep,
  } = useDubbingStore()
  const user = useAuthStore((s) => s.user)

  const sourceLang = getLanguageByCode(sourceLanguage)
  const isAutoSource = sourceLanguage === 'auto'

  const needsAutoUploadReview = uploadSettings.autoUpload
  const canStart = !needsAutoUploadReview || uploadSettings.uploadReviewConfirmed
  const privacyLabel = PRIVACY_LABELS[uploadSettings.privacyStatus] ?? uploadSettings.privacyStatus
  const targetChannelLabel = user?.email ?? 'Google 로그인 후 연결된 YouTube 채널'

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
              영상에 등장하는 화자 수를 선택하세요.
            </p>
          </div>

          {/* Lip sync — 원본+자막 모드는 비디오 픽셀을 건드리지 않으므로 미노출 */}
          {deliverableMode !== 'originalWithMultiAudio' && (
            <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
              <div>
                <span className="text-sm text-surface-600 dark:text-surface-400">립싱크</span>
                <p className="text-xs text-surface-400 mt-0.5">더빙 오디오에 맞춰 입 모양을 조절합니다</p>
              </div>
              <Toggle checked={lipSyncEnabled} onChange={setLipSync} />
            </div>
          )}

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
            {deliverableMode === 'originalWithMultiAudio'
              ? 'AI가 자동으로 영상을 전사하고, 선택한 모든 언어로 번역한 뒤, 자막을 생성합니다. 처리 완료 후 번역을 수정할 수 있습니다. 처리 시간은 영상 길이에 따라 달라집니다.'
              : 'AI가 자동으로 영상을 전사하고, 선택한 모든 언어로 번역한 뒤, 보이스 클론으로 더빙 영상을 생성합니다. 처리 완료 후 번역을 수정할 수 있습니다. 처리 시간은 영상 길이에 따라 달라집니다.'}
          </p>
        </div>
      </Card>

      {/* 자동 업로드 최종 확인 — 자동 업로드 ON일 때만 노출. 더빙 시작 전 마지막 사용자 동의 게이트. */}
      {needsAutoUploadReview && (
        <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/10">
          <CardTitle>자동 업로드 최종 확인</CardTitle>
          <div className="mt-4 grid gap-2 text-xs text-surface-600 dark:text-surface-300 sm:grid-cols-2">
            <ReviewItem label="채널" value={targetChannelLabel} />
            <ReviewItem label="공개 범위" value={privacyLabel} />
            <ReviewItem label="Shorts tag" value={uploadSettings.uploadAsShort ? 'ON' : 'OFF'} />
            <ReviewItem label="자막" value={uploadSettings.uploadCaptions ? '업로드' : '업로드 안 함'} />
            <ReviewItem label="아동용" value={uploadSettings.selfDeclaredMadeForKids ? '예' : '아니오'} />
            <ReviewItem label="AI 합성 공개" value={uploadSettings.containsSyntheticMedia ? 'ON' : 'OFF'} />
            <ReviewItem
              label="제목/설명 번역"
              value={`${getLanguageByCode(uploadSettings.metadataLanguage)?.name ?? uploadSettings.metadataLanguage} 기준 → ${selectedLanguages.length}개 언어`}
            />
            <ReviewItem
              label="localizations"
              value={deliverableMode === 'originalWithMultiAudio' && videoSource?.type === 'upload' ? 'YouTube localizations 포함' : '언어별 제목/설명 적용'}
            />
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-white/70 p-3 text-sm text-surface-700 dark:border-amber-900/70 dark:bg-surface-900/50 dark:text-surface-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              checked={uploadSettings.uploadReviewConfirmed}
              onChange={(e) => setUploadSettings({ uploadReviewConfirmed: e.target.checked })}
            />
            <span>
              위 채널, 공개 범위, 제목/설명 번역, 자막, Shorts tag, 아동용, AI 합성 공개 설정을 확인했으며 처리 완료 후 자동 업로드를 실행합니다.
            </span>
          </label>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          이전
        </Button>
        <Button onClick={nextStep} disabled={!canStart}>
          더빙 시작
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/70 px-3 py-2 dark:bg-surface-900/50">
      <p className="text-[11px] font-medium text-surface-400">{label}</p>
      <p className="mt-0.5 truncate text-surface-700 dark:text-surface-200">{value}</p>
    </div>
  )
}
