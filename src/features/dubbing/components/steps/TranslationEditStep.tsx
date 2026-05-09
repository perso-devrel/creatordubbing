'use client'

import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { getLanguageByCode } from '@/utils/languages'
import { useAuthStore } from '@/stores/authStore'
import { useChannelStats } from '@/hooks/useYouTubeData'
import { useDubbingStore } from '../../store/dubbingStore'
import type { PrivacyStatus } from '../../types/dubbing.types'

const PRIVACY_LABELS: Record<PrivacyStatus, string> = {
  private: '비공개',
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
  const { data: channel } = useChannelStats()
  const locale = useAppLocale()
  const t = useLocaleText()

  const needsAutoUploadReview = uploadSettings.autoUpload
  const canStart = !needsAutoUploadReview || uploadSettings.uploadReviewConfirmed
  const privacyLabel = locale === 'ko'
    ? PRIVACY_LABELS[uploadSettings.privacyStatus] ?? uploadSettings.privacyStatus
    : uploadSettings.privacyStatus === 'public'
      ? 'Public'
      : uploadSettings.privacyStatus === 'unlisted'
        ? 'Unlisted'
        : 'Private'
  const targetChannelLabel = channel
    ? locale === 'ko'
      ? `${channel.title} · 구독자 ${channel.subscriberCount.toLocaleString('ko-KR')}`
      : `${channel.title} · ${channel.subscriberCount.toLocaleString('en-US')} subscribers`
    : user?.displayName ?? t({ ko: '연결된 YouTube 채널 없음', en: 'No connected YouTube channel' })
  const uploadsVideoToYouTube =
    deliverableMode === 'newDubbedVideos' ||
    (deliverableMode === 'originalWithMultiAudio' && videoSource?.type === 'upload')
  const showsAiDisclosureSetting = deliverableMode === 'newDubbedVideos'
  const showsCaptionSetting = deliverableMode === 'newDubbedVideos' || deliverableMode === 'originalWithMultiAudio'
  const deliverableModeLabel = deliverableMode === 'newDubbedVideos'
    ? t({ ko: '새 더빙 영상 업로드', en: 'Upload new dubbed videos' })
    : deliverableMode === 'originalWithMultiAudio'
      ? t({ ko: '원본 영상에 자막 추가', en: 'Add captions to original video' })
      : t({ ko: '파일만 다운로드', en: 'Download files only' })
  const metadataLanguageLabel =
    (() => {
      const language = getLanguageByCode(uploadSettings.metadataLanguage)
      if (!language) return uploadSettings.metadataLanguage
      return locale === 'ko' ? language.nativeName : language.name
    })()
  const tagsLabel = uploadSettings.tags.length > 0 ? uploadSettings.tags.join(', ') : t({ ko: '없음', en: 'None' })
  const autoUploadConfirmationText = uploadsVideoToYouTube
    ? showsAiDisclosureSetting
      ? t({ ko: '채널, 공개 범위, 자막, 아동용 여부, AI 표시 설정을 확인했습니다. 완료 후 자동 업로드를 진행합니다.', en: 'I reviewed the channel, visibility, captions, made-for-kids setting, and AI disclosure. Start auto-upload when finished.' })
      : t({ ko: '채널, 공개 범위, 자막, 아동용 여부를 확인했습니다. 완료 후 자동 업로드를 진행합니다.', en: 'I reviewed the channel, visibility, captions, and made-for-kids setting. Start auto-upload when finished.' })
    : t({ ko: '대상 언어, 결과물, 자동 업로드 설정을 확인했습니다. 완료 후 자동 업로드를 진행합니다.', en: 'I reviewed the languages, output, and auto-upload settings. Start auto-upload when finished.' })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">{t({ ko: '설정 확인', en: 'Review settings' })}</h2>
        <p className="mt-1 text-surface-500">
          {t({ ko: '더빙을 시작하기 전에 업로드 설정을 확인하세요.', en: 'Review upload settings before starting dubbing.' })}
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <div className="space-y-3">
          {uploadsVideoToYouTube && (
            <SummaryRow label={t({ ko: '채널', en: 'Channel' })} value={targetChannelLabel} />
          )}

          <SummaryRow
            label={t({ ko: `대상 언어 (${selectedLanguages.length})`, en: `Target languages (${selectedLanguages.length})` })}
            value={(
              <div className="flex flex-wrap justify-end gap-2">
                {selectedLanguages.map((code) => {
                  const lang = getLanguageByCode(code)
                  if (!lang) return null
                  return (
                    <Badge key={code} variant="brand">
                      {lang.flag} {locale === 'ko' ? lang.nativeName : lang.name}
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
            <SummaryRow label={t({ ko: '공개 범위', en: 'Visibility' })} value={privacyLabel} />
          )}

          <SummaryRow label={t({ ko: '결과물', en: 'Output' })} value={deliverableModeLabel} />

          <SummaryRow
            label={t({ ko: '자동 업로드', en: 'Auto-upload' })}
            value={<StatusValue active={uploadSettings.autoUpload} />}
          />

          {showsCaptionSetting && (
            <SummaryRow
              label={t({ ko: '자막', en: 'Captions' })}
              value={<StatusValue active={uploadSettings.autoUpload && uploadSettings.uploadCaptions} />}
            />
          )}

          {uploadsVideoToYouTube && (
            <>
              <SummaryRow
                label={t({ ko: '작성 언어', en: 'Writing language' })}
                value={locale === 'ko' ? `${metadataLanguageLabel} 기준` : `Based on ${metadataLanguageLabel}`}
              />
              <SummaryRow
                label={t({ ko: '태그', en: 'Tags' })}
                value={tagsLabel}
              />
              <SummaryRow
                label={t({ ko: '아동용 영상', en: 'Made for kids' })}
                value={uploadSettings.selfDeclaredMadeForKids ? t({ ko: '예', en: 'Yes' }) : t({ ko: '아니오', en: 'No' })}
              />
              {showsAiDisclosureSetting && (
                <SummaryRow
                  label={t({ ko: 'AI 보이스 고지', en: 'AI voice disclosure' })}
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
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{t({ ko: '처리 과정', en: 'What happens next' })}</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            {deliverableMode === 'originalWithMultiAudio'
              ? t({ ko: 'AI가 영상을 전사하고 선택한 언어로 자막을 만듭니다. 처리 시간은 영상 길이에 따라 달라집니다.', en: 'AI transcribes the video and creates captions in the selected languages. Processing time depends on video length.' })
              : t({ ko: 'AI가 영상을 전사하고 선택한 언어로 더빙 오디오를 만듭니다. 처리 시간은 영상 길이에 따라 달라집니다.', en: 'AI transcribes the video and creates dubbed audio in the selected languages. Processing time depends on video length.' })}
          </p>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          {t({ ko: '이전', en: 'Back' })}
        </Button>
        <Button onClick={nextStep} disabled={!canStart}>
          {t({ ko: '더빙 시작', en: 'Start dubbing' })}
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
  const t = useLocaleText()

  return (
    <span className={cn(
      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-500',
    )}>
      {active ? t({ ko: '켜짐', en: 'On' }) : t({ ko: '꺼짐', en: 'Off' })}
    </span>
  )
}
