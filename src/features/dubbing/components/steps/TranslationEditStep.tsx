'use client'

import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { getLanguageByCode } from '@/utils/languages'
import { useAuthStore } from '@/stores/authStore'
import { useChannelStats } from '@/hooks/useYouTubeData'
import { useDubbingStore } from '../../store/dubbingStore'
import type { PrivacyStatus } from '../../types/dubbing.types'

const PRIVACY_LABELS: Record<PrivacyStatus, string> = {
  private: 'privacyStatus.private',
  unlisted: 'privacyStatus.unlisted',
  public: 'privacyStatus.public',
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

  const needsAutoUploadReview = uploadSettings.autoUpload && deliverableMode !== 'downloadOnly'
  const canStart = !needsAutoUploadReview || uploadSettings.uploadReviewConfirmed
  const privacyLabel = t(PRIVACY_LABELS[uploadSettings.privacyStatus] ?? uploadSettings.privacyStatus)
  const targetChannelLabel = channel
    ? t('features.dubbing.components.steps.translationEditStep.channelWithSubscriberCount', {
      title: channel.title,
      count: channel.subscriberCount.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US'),
    })
    : user?.displayName ?? t('features.dubbing.components.steps.translationEditStep.noConnectedYouTubeChannel')
  const uploadsVideoToYouTube =
    deliverableMode === 'newDubbedVideos' ||
    (deliverableMode === 'originalWithMultiAudio' && videoSource?.type === 'upload')
  const showsAiDisclosureSetting = deliverableMode === 'newDubbedVideos'
  const showsCaptionSetting = deliverableMode === 'newDubbedVideos' || deliverableMode === 'originalWithMultiAudio'
  const deliverableModeLabel = deliverableMode === 'newDubbedVideos'
    ? t('features.dubbing.components.steps.translationEditStep.uploadNewDubbedVideos')
    : deliverableMode === 'originalWithMultiAudio'
      ? t('features.dubbing.components.steps.translationEditStep.addCaptionsToOriginalVideo')
      : t('features.dubbing.components.steps.translationEditStep.downloadFilesOnly')
  const metadataLanguageLabel =
    (() => {
      const language = getLanguageByCode(uploadSettings.metadataLanguage)
      if (!language) return uploadSettings.metadataLanguage
      return locale === 'ko' ? language.nativeName : language.name
    })()
  const tagsLabel = uploadSettings.tags.length > 0 ? uploadSettings.tags.join(', ') : t('features.dubbing.components.steps.translationEditStep.none')
  const autoUploadConfirmationText = uploadsVideoToYouTube
    ? t('features.dubbing.components.steps.translationEditStep.iReviewedTheSettingsAndWantToUpload')
    : t('features.dubbing.components.steps.translationEditStep.iReviewedTheSettingsAndWantToUpload2')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">{t('features.dubbing.components.steps.translationEditStep.reviewSettings')}</h2>
        <p className="mt-1 text-surface-500 dark:text-surface-300">
          {t('features.dubbing.components.steps.translationEditStep.reviewUploadSettingsBeforeStartingDubbing')}
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <div className="space-y-3">
          {uploadsVideoToYouTube && (
            <SummaryRow label={t('features.dubbing.components.steps.translationEditStep.channel')} value={targetChannelLabel} />
          )}

          <SummaryRow
            label={t('features.dubbing.components.steps.translationEditStep.targetLanguagesValue', { selectedLanguagesLength: selectedLanguages.length })}
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
                <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-300">더빙 오디오에 맞춰 입 모양을 조절합니다</p>
              </div>
              <Toggle checked={lipSyncEnabled} onChange={setLipSync} />
            </div>
          )}
          */}

          {uploadsVideoToYouTube && (
            <SummaryRow label={t('features.dubbing.components.steps.translationEditStep.visibility')} value={privacyLabel} />
          )}

          <SummaryRow label={t('features.dubbing.components.steps.translationEditStep.output')} value={deliverableModeLabel} />

          {deliverableMode !== 'downloadOnly' && (
            <SummaryRow
              label={t('features.dubbing.components.steps.translationEditStep.autoUpload')}
              value={<StatusValue active={uploadSettings.autoUpload} />}
            />
          )}

          {showsCaptionSetting && (
            <SummaryRow
              label={t('features.dubbing.components.steps.translationEditStep.captions')}
              value={<StatusValue active={uploadSettings.autoUpload && uploadSettings.uploadCaptions} />}
            />
          )}

          {uploadsVideoToYouTube && (
            <>
              <SummaryRow
                label={t('features.dubbing.components.steps.translationEditStep.writingLanguage')}
                value={t('features.dubbing.components.steps.translationEditStep.metadataBasedOn', { language: metadataLanguageLabel })}
              />
              <SummaryRow
                label={t('features.dubbing.components.steps.translationEditStep.tags')}
                value={tagsLabel}
              />
              <SummaryRow
                label={t('features.dubbing.components.steps.translationEditStep.madeForKids')}
                value={uploadSettings.selfDeclaredMadeForKids ? t('features.dubbing.components.steps.translationEditStep.yes') : t('features.dubbing.components.steps.translationEditStep.no')}
              />
              {showsAiDisclosureSetting && (
                <SummaryRow
                  label={t('features.dubbing.components.steps.translationEditStep.aIVoiceDisclosure')}
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

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          {t('features.dubbing.components.steps.translationEditStep.back')}
        </Button>
        <Button onClick={nextStep} disabled={!canStart}>
          {t('features.dubbing.components.steps.translationEditStep.startDubbing')}
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
        <span className="text-sm text-surface-600 dark:text-surface-300">{label}</span>
        {description && (
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-300">{description}</p>
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
      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-500 dark:text-surface-300',
    )}>
      {active ? t('features.dubbing.components.steps.translationEditStep.on') : t('features.dubbing.components.steps.translationEditStep.off')}
    </span>
  )
}
