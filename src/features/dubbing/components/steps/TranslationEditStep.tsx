'use client'

import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { getLanguageByCode } from '@/utils/languages'
import { useAuthStore } from '@/stores/authStore'
import { useDubbingStore } from '../../store/dubbingStore'
import type { PrivacyStatus } from '../../types/dubbing.types'

const PRIVACY_LABELS: Record<PrivacyStatus, string> = {
  private: '비공개 (권장)',
  unlisted: '일부 공개',
  public: '공개',
}

export function TranslationEditStep() {
  const {
    selectedLanguages,
    videoSource,
    deliverableMode,
    uploadSettings,
    setUploadSettings,
    prevStep,
    nextStep,
  } = useDubbingStore()
  const user = useAuthStore((s) => s.user)

  const needsAutoUploadReview = uploadSettings.autoUpload
  const canStart = !needsAutoUploadReview || uploadSettings.uploadReviewConfirmed
  const privacyLabel = PRIVACY_LABELS[uploadSettings.privacyStatus] ?? uploadSettings.privacyStatus
  const targetChannelLabel = user?.email ?? 'Google 로그인 후 연결된 YouTube 채널'
  const uploadsVideoToYouTube =
    deliverableMode === 'newDubbedVideos' ||
    (deliverableMode === 'originalWithMultiAudio' && videoSource?.type === 'upload')
  const showsAiDisclosureSetting = deliverableMode === 'newDubbedVideos'
  const showsCaptionSetting = deliverableMode === 'newDubbedVideos' || deliverableMode === 'originalWithMultiAudio'
  const deliverableModeLabel = deliverableMode === 'newDubbedVideos'
    ? '새 더빙 영상 업로드'
    : deliverableMode === 'originalWithMultiAudio'
      ? '원본 영상에 자막 추가'
      : '다운로드만'
  const metadataLanguageLabel =
    getLanguageByCode(uploadSettings.metadataLanguage)?.name ?? uploadSettings.metadataLanguage
  const tagsLabel = uploadSettings.tags.length > 0 ? uploadSettings.tags.join(', ') : '없음'
  const autoUploadConfirmationText = uploadsVideoToYouTube
    ? showsAiDisclosureSetting
      ? '위 채널, 공개 범위, 작성 언어, 태그, 자막, 아동용, AI 합성 고지 설정을 확인했으며 처리 완료 후 자동 업로드를 실행합니다.'
      : '위 채널, 공개 범위, 작성 언어, 태그, 자막, 아동용 설정을 확인했으며 처리 완료 후 자동 업로드를 실행합니다.'
    : '위 대상 언어, 결과물 모드, 자동 업로드, 자막 설정을 확인했으며 처리 완료 후 자동 업로드를 실행합니다.'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">설정 확인</h2>
        <p className="mt-1 text-surface-500">
          진행 전 설정을 확인하세요.
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <div className="space-y-3">
          {uploadsVideoToYouTube && (
            <SummaryRow label="채널" value={targetChannelLabel} />
          )}

          <SummaryRow
            label={`대상 언어 (${selectedLanguages.length})`}
            value={(
              <div className="flex flex-wrap justify-end gap-2">
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
            )}
          />

          {/*
          Lip sync — 원본+자막 모드는 비디오 픽셀을 건드리지 않으므로 미노출.
          립싱크 UI는 임시 숨김 상태이며, 기능 복구 시 아래 블록과 Toggle import,
          lipSyncEnabled/setLipSync store 값을 함께 되살리면 된다.
          {deliverableMode !== 'originalWithMultiAudio' && (
            <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
              <div>
                <span className="text-sm text-surface-600 dark:text-surface-400">립싱크</span>
                <p className="text-xs text-surface-400 mt-0.5">더빙 오디오에 맞춰 입 모양을 조절합니다</p>
              </div>
              <Toggle checked={lipSyncEnabled} onChange={setLipSync} />
            </div>
          )}
          */}

          {uploadsVideoToYouTube && (
            <SummaryRow label="공개 범위" value={privacyLabel} />
          )}

          <SummaryRow label="결과물 모드" value={deliverableModeLabel} />

          <SummaryRow
            label="자동 업로드"
            value={<StatusValue active={uploadSettings.autoUpload} />}
          />

          {showsCaptionSetting && (
            <SummaryRow
              label="자막"
              value={<StatusValue active={uploadSettings.autoUpload && uploadSettings.uploadCaptions} />}
            />
          )}

          {uploadsVideoToYouTube && (
            <>
              <SummaryRow
                label="작성 언어"
                value={`${metadataLanguageLabel} 기준`}
              />
              <SummaryRow
                label="태그"
                value={tagsLabel}
              />
              <SummaryRow
                label="아동용"
                value={uploadSettings.selfDeclaredMadeForKids ? '예' : '아니오'}
              />
              {showsAiDisclosureSetting && (
                <SummaryRow
                  label="AI 합성 고지"
                  value={<StatusValue active={uploadSettings.containsSyntheticMedia} />}
                />
              )}
            </>
          )}
        </div>

        {needsAutoUploadReview && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-surface-700 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-surface-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              checked={uploadSettings.uploadReviewConfirmed}
              onChange={(e) => setUploadSettings({ uploadReviewConfirmed: e.target.checked })}
            />
            <span>
              {autoUploadConfirmationText}
            </span>
          </label>
        )}
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

function SummaryRow({
  label,
  value,
  description,
}: {
  label: string
  value: ReactNode
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
      <div className="min-w-0">
        <span className="text-sm text-surface-600 dark:text-surface-400">{label}</span>
        {description && (
          <p className="mt-0.5 text-xs text-surface-400">{description}</p>
        )}
      </div>
      <div className="max-w-[60%] break-words text-right text-sm font-medium text-surface-900 dark:text-white">
        {value}
      </div>
    </div>
  )
}

function StatusValue({ active }: { active: boolean }) {
  return (
    <span className={cn(
      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-500',
    )}>
      {active ? 'ON' : 'OFF'}
    </span>
  )
}
