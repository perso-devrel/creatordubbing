'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, Captions, Languages, Link2, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import { Button, Card, CardTitle, Input, Select } from '@/components/ui'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { extractVideoId } from '@/utils/validators'
import { SUPPORTED_LANGUAGES } from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'
import { getAiDisclosureText, stripAiDisclosureFooter } from '../../utils/aiDisclosure'
import type { PrivacyStatus } from '../../types/dubbing.types'

export function UploadSettingsStep() {
  const {
    videoMeta,
    videoSource,
    deliverableMode,
    uploadSettings,
    setUploadSettings,
    syncPrivacyFromGlobalDefault,
    syncMetadataLanguageFromGlobalDefault,
    prevStep,
    nextStep,
  } = useDubbingStore()
  const locale = useAppLocale()
  const t = useLocaleText()
  const privacyOptions: { value: PrivacyStatus; label: string }[] = [
    { value: 'private', label: t({ ko: '비공개 (권장)', en: 'Private (recommended)' }) },
    { value: 'unlisted', label: t({ ko: '일부 공개', en: 'Unlisted' }) },
    { value: 'public', label: t({ ko: '공개', en: 'Public' }) },
  ]
  const languageOptions = SUPPORTED_LANGUAGES.map((l) => ({
    value: l.code,
    label: locale === 'ko'
      ? `${l.flag} ${l.nativeName} (${l.name})`
      : `${l.flag} ${l.name} (${l.nativeName})`,
  }))

  // YouTube 설정 페이지의 기본값과 동기화 (사용자 override 없을 때만).
  useEffect(() => {
    syncPrivacyFromGlobalDefault()
    syncMetadataLanguageFromGlobalDefault()
  }, [syncPrivacyFromGlobalDefault, syncMetadataLanguageFromGlobalDefault])

  const originalYouTubeId =
    videoSource?.type === 'url' && videoSource.url ? extractVideoId(videoSource.url) : null
  const originalYouTubeUrl = originalYouTubeId
    ? `https://www.youtube.com/watch?v=${originalYouTubeId}`
    : null
  const aiDisclosureText = getAiDisclosureText(uploadSettings.metadataLanguage)

  useEffect(() => {
    const strippedDescription = stripAiDisclosureFooter(uploadSettings.description)
    if (strippedDescription !== uploadSettings.description) {
      setUploadSettings({ description: strippedDescription })
    }
  }, [uploadSettings.description, setUploadSettings])

  useEffect(() => {
    if (deliverableMode === 'newDubbedVideos' && !uploadSettings.autoUpload && uploadSettings.uploadCaptions) {
      setUploadSettings({ uploadCaptions: false })
    }
  }, [deliverableMode, uploadSettings.autoUpload, uploadSettings.uploadCaptions, setUploadSettings])

  // 영상 정보로 제목/설명을 초기 1회 채워준다. 사용자가 빈 값으로 지웠을 때
  // 다시 채워 넣지 않도록 videoMeta.id 단위로 한 번만 실행. (deps에 입력값을
  // 넣으면 사용자가 지울 때마다 재초기화돼 빈 값이 유지되지 않는다.)
  const initializedForVideoIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!videoMeta?.title) return
    if (initializedForVideoIdRef.current === videoMeta.id) return
    initializedForVideoIdRef.current = videoMeta.id

    const { title, description } = useDubbingStore.getState().uploadSettings
    const patch: Partial<typeof uploadSettings> = {}
    if (!title) patch.title = videoMeta.title
    if (!description) {
      patch.description = locale === 'ko'
        ? `${videoMeta.title} - Dubtube AI 더빙`
        : `${videoMeta.title} - Dubtube AI dubbing`
    }
    if (Object.keys(patch).length > 0) setUploadSettings(patch)
  }, [locale, videoMeta?.id, videoMeta?.title, setUploadSettings])

  const tagsString = uploadSettings.tags.join(', ')

  const handleTagsChange = (value: string) => {
    const parsed = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    setUploadSettings({ tags: parsed })
  }

  const isMultiAudio = deliverableMode === 'originalWithMultiAudio'
  const uploadsVideoToYouTube =
    deliverableMode === 'newDubbedVideos' ||
    (isMultiAudio && videoSource?.type === 'upload')
  const shouldShowAiDisclosure = deliverableMode === 'newDubbedVideos'
  const canContinue =
    deliverableMode === 'originalWithMultiAudio'
      ? true
      : uploadSettings.title.trim().length > 0
  const handleSyntheticMediaToggle = () => {
    setUploadSettings({
      containsSyntheticMedia: !uploadSettings.containsSyntheticMedia,
      description: stripAiDisclosureFooter(uploadSettings.description),
    })
  }
  const handleAutoUploadToggle = () => {
    const nextAutoUpload = !uploadSettings.autoUpload
    setUploadSettings(nextAutoUpload
      ? { autoUpload: true, uploadCaptions: true }
      : { autoUpload: false, uploadCaptions: false })
  }
  const captionUploadDisabled =
    deliverableMode === 'newDubbedVideos' && !uploadSettings.autoUpload

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">{t({ ko: '업로드 설정', en: 'Upload settings' })}</h2>
        <p className="mt-1 text-surface-600 dark:text-surface-400">
          {isMultiAudio
            ? t({ ko: '원본 영상에 자막을 추가하기 전에 기본 설정을 확인하세요.', en: 'Review the settings before adding captions to the original video.' })
            : t({ ko: '더빙 완료 후 YouTube에 어떻게 올릴지 미리 정하세요.', en: 'Choose how the finished dubbing should be uploaded to YouTube.' })}
        </p>
      </div>

      {/* Title/Desc/Tags — for new dubbed video uploads */}
      {deliverableMode === 'newDubbedVideos' && (
        <Card>
          <CardTitle>{t({ ko: '제목 · 설명 · 태그', en: 'Title, description, and tags' })}</CardTitle>
          <div className="space-y-4">
            <Select
              label={t({ ko: '제목·설명 작성 언어', en: 'Title and description language' })}
              value={uploadSettings.metadataLanguage}
              onChange={(e) => setUploadSettings({ metadataLanguage: e.target.value })}
              options={languageOptions}
            />
            <p className="-mt-2 text-xs text-surface-500 dark:text-surface-300">
              {t({
                ko: '제목과 설명을 작성할 언어입니다. 업로드할 때 언어별로 번역됩니다.',
                en: 'This is the language you write in. Titles and descriptions are translated during upload.',
              })}
            </p>

            <Input
              label={t({ ko: '제목', en: 'Title' })}
              value={uploadSettings.title}
              onChange={(e) => setUploadSettings({ title: e.target.value })}
              placeholder={t({ ko: '영상 제목', en: 'Video title' })}
            />

            <div className="w-full">
              <label htmlFor="upload-description" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                {t({ ko: '설명', en: 'Description' })}
              </label>
              <textarea
                id="upload-description"
                rows={4}
                value={uploadSettings.description}
                onChange={(e) => setUploadSettings({ description: e.target.value })}
                placeholder={t({ ko: '영상 설명', en: 'Video description' })}
                className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 resize-none"
              />
              {uploadSettings.containsSyntheticMedia && shouldShowAiDisclosure && (
                <AiDisclosurePreview text={aiDisclosureText} />
              )}
            </div>

            <Input
              label={t({ ko: '태그 (쉼표 구분)', en: 'Tags (comma-separated)' })}
              value={tagsString}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder={t({ ko: 'Dubtube, AI 더빙, 리뷰', en: 'Dubtube, AI dubbing, review' })}
            />
            <p className="-mt-2 text-xs text-surface-500 dark:text-surface-300">
              {t({ ko: '태그는 번역하지 않고 그대로 사용됩니다.', en: 'Tags are used as written and are not translated.' })}
            </p>

            <Select
              label={t({ ko: '공개 범위', en: 'Visibility' })}
              value={uploadSettings.privacyStatus}
              onChange={(e) => setUploadSettings({ privacyStatus: e.target.value as PrivacyStatus })}
              options={privacyOptions}
            />
          </div>
        </Card>
      )}

      {/* Multi-audio: show privacy for original upload if source is file upload */}
      {isMultiAudio && videoSource?.type === 'upload' && (
        <Card>
          <CardTitle>{t({ ko: '원본 영상 업로드 설정', en: 'Original video upload settings' })}</CardTitle>
          <div className="space-y-4">
            <Select
              label={t({ ko: '제목·설명 작성 언어', en: 'Title and description language' })}
              value={uploadSettings.metadataLanguage}
              onChange={(e) => setUploadSettings({ metadataLanguage: e.target.value })}
              options={languageOptions}
            />
            <p className="-mt-2 text-xs text-surface-500 dark:text-surface-300">
              {t({
                ko: '제목과 설명을 작성할 언어입니다. 업로드할 때 언어별로 번역됩니다.',
                en: 'This is the language you write in. Titles and descriptions are translated during upload.',
              })}
            </p>

            <Input
              label={t({ ko: '제목', en: 'Title' })}
              value={uploadSettings.title}
              onChange={(e) => setUploadSettings({ title: e.target.value })}
              placeholder={t({ ko: '영상 제목', en: 'Video title' })}
            />

            <div className="w-full">
              <label htmlFor="upload-description" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                {t({ ko: '설명', en: 'Description' })}
              </label>
              <textarea
                id="upload-description"
                rows={3}
                value={uploadSettings.description}
                onChange={(e) => setUploadSettings({ description: e.target.value })}
                placeholder={t({ ko: '영상 설명', en: 'Video description' })}
                className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 resize-none"
              />
              {uploadSettings.containsSyntheticMedia && shouldShowAiDisclosure && (
                <AiDisclosurePreview text={aiDisclosureText} />
              )}
            </div>

            <Input
              label={t({ ko: '태그 (쉼표 구분)', en: 'Tags (comma-separated)' })}
              value={tagsString}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder={t({ ko: 'Dubtube, AI 더빙, 자막', en: 'Dubtube, AI dubbing, captions' })}
            />
            <p className="-mt-2 text-xs text-surface-500 dark:text-surface-300">
              {t({ ko: '태그는 번역하지 않고 그대로 사용됩니다.', en: 'Tags are used as written and are not translated.' })}
            </p>

            <Select
              label={t({ ko: '공개 범위', en: 'Visibility' })}
              value={uploadSettings.privacyStatus}
              onChange={(e) => setUploadSettings({ privacyStatus: e.target.value as PrivacyStatus })}
              options={privacyOptions}
            />
          </div>
        </Card>
      )}

      {/* Upload options — for both newDubbedVideos and originalWithMultiAudio */}
      <Card>
        <CardTitle>{t({ ko: '업로드 옵션', en: 'Upload options' })}</CardTitle>
        <div className="mt-4 space-y-2">
          <ToggleRow
            icon={<Upload className="h-4 w-4 text-emerald-500" />}
            label={t({ ko: '완료 후 자동 업로드', en: 'Auto-upload when finished' })}
            description={isMultiAudio
              ? t({ ko: '완료된 번역 자막을 자동으로 업로드합니다.', en: 'Automatically upload translated captions when processing finishes.' })
              : t({ ko: '더빙이 완료되면 언어별 영상을 자동으로 업로드합니다.', en: 'Automatically upload each dubbed video when processing finishes.' })}
            active={uploadSettings.autoUpload}
            activeLabel={t({ ko: '켜짐', en: 'On' })}
            inactiveLabel={t({ ko: '꺼짐', en: 'Off' })}
            onToggle={handleAutoUploadToggle}
          />

          {(deliverableMode === 'newDubbedVideos' || isMultiAudio) && (
            <ToggleRow
              icon={<Captions className="h-4 w-4 text-surface-400" />}
              label={isMultiAudio
                ? t({ ko: '자막(SRT) 업로드', en: 'Upload captions (SRT)' })
                : t({ ko: '더빙 영상에 자막(SRT) 업로드', en: 'Upload captions (SRT) with dubbed videos' })}
              description={isMultiAudio
                ? t({ ko: '완료된 언어의 번역 자막을 대상 영상에 올립니다.', en: 'Upload translated captions for each completed language to the target video.' })
                : t({ ko: '선택한 언어에 맞는 자막을 영상과 함께 올립니다.', en: 'Upload matching captions with each selected language video.' })}
              active={captionUploadDisabled ? false : uploadSettings.uploadCaptions}
              activeLabel={t({ ko: '켜짐', en: 'On' })}
              inactiveLabel={t({ ko: '꺼짐', en: 'Off' })}
              onToggle={() => setUploadSettings({ uploadCaptions: !uploadSettings.uploadCaptions })}
              disabled={captionUploadDisabled}
              disabledBadgeLabel={t({ ko: '자동 업로드 꺼짐', en: 'Auto-upload off' })}
            />
          )}

          {originalYouTubeUrl && deliverableMode === 'newDubbedVideos' && (
            <ToggleRow
              icon={<Link2 className="h-4 w-4 text-surface-400" />}
              label={t({ ko: '설명에 원본 YouTube 링크 추가', en: 'Add original YouTube link to description' })}
              description={originalYouTubeUrl}
              active={uploadSettings.attachOriginalLink}
              activeLabel={t({ ko: '추가 ON', en: 'On' })}
              inactiveLabel={t({ ko: '추가 OFF', en: 'Off' })}
              onToggle={() => setUploadSettings({ attachOriginalLink: !uploadSettings.attachOriginalLink })}
            />
          )}

          {uploadsVideoToYouTube && (
            <>
              <ToggleRow
                icon={<ShieldCheck className="h-4 w-4 text-surface-400" />}
                label={t({ ko: '아동용 영상', en: 'Made for kids' })}
                description={t({
                  ko: 'YouTube의 아동용 콘텐츠 정책에 맞게 설정하세요. 일반 영상은 꺼두면 됩니다.',
                  en: 'Set this according to YouTube made-for-kids policy. Leave it off for general videos.',
                })}
                active={uploadSettings.selfDeclaredMadeForKids}
                activeLabel={t({ ko: '예', en: 'Yes' })}
                inactiveLabel={t({ ko: '아니오', en: 'No' })}
                onToggle={() => setUploadSettings({ selfDeclaredMadeForKids: !uploadSettings.selfDeclaredMadeForKids })}
              />

              {shouldShowAiDisclosure && (
                <ToggleRow
                  icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                  label={t({ ko: 'AI 음성 사용 표시', en: 'Disclose AI voice use' })}
                  description={t({
                    ko: '설명 맨 아래에 AI 보이스로 더빙했다는 문구를 붙입니다.',
                    en: 'Adds a note at the end of the description that the video uses AI voice dubbing.',
                  })}
                  active={uploadSettings.containsSyntheticMedia}
                  activeLabel={t({ ko: '켜짐', en: 'On' })}
                  inactiveLabel={t({ ko: '꺼짐', en: 'Off' })}
                  onToggle={handleSyntheticMediaToggle}
                />
              )}
            </>
          )}

          {/* 다국어 오디오 트랙: 자막 모드에서만 노출. 실서비스 검증 전이라 비활성. */}
          {isMultiAudio && (
            <ToggleRow
              icon={<Languages className="h-4 w-4 text-surface-400" />}
              label={t({ ko: '다국어 오디오 트랙 추가', en: 'Add multilingual audio tracks' })}
              description={t({
                ko: 'YouTube 다국어 오디오 트랙은 아직 준비 중입니다.',
                en: 'YouTube multilingual audio tracks are coming soon.',
              })}
              active={false}
              activeLabel={t({ ko: '켜짐', en: 'On' })}
              inactiveLabel={t({ ko: '준비 중', en: 'Soon' })}
              onToggle={() => {}}
              disabled
            />
          )}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          {t({ ko: '이전', en: 'Back' })}
        </Button>
        <Button onClick={nextStep} disabled={!canContinue}>
          {t({ ko: '다음: 설정 확인', en: 'Next: Review settings' })}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function AiDisclosurePreview({ text }: { text: string }) {
  const t = useLocaleText()

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/70 dark:bg-amber-950/20">
      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
        {t({ ko: '설명 맨 아래에 자동 추가', en: 'Automatically added to the end of the description' })}
      </p>
      <p className="mt-1 text-xs leading-5 text-surface-700 dark:text-surface-200">
        {text}
      </p>
    </div>
  )
}

interface ToggleRowProps {
  icon: ReactNode
  label: string
  description?: string
  active: boolean
  activeLabel: string
  inactiveLabel: string
  onToggle: () => void
  disabled?: boolean
  disabledBadgeLabel?: string
}

function ToggleRow({ icon, label, description, active, activeLabel, inactiveLabel, onToggle, disabled, disabledBadgeLabel }: ToggleRowProps) {
  const t = useLocaleText()

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50 ${disabled ? 'opacity-75' : ''}`}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-surface-700 dark:text-surface-300">{label}</p>
            {disabled && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {disabledBadgeLabel ?? t({ ko: '준비 중', en: 'Coming soon' })}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-300">{description}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
          disabled
            ? 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-300 cursor-not-allowed'
            : `cursor-pointer ${active
              ? 'bg-brand-600 text-white'
              : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'}`
        }`}
      >
        {active ? activeLabel : inactiveLabel}
      </button>
    </div>
  )
}
