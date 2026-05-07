'use client'

import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, Captions, Languages, Link2, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import { Button, Card, CardTitle, Input, Select } from '@/components/ui'
import { extractVideoId } from '@/utils/validators'
import { SUPPORTED_LANGUAGES } from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'
import { getAiDisclosureText, stripAiDisclosureFooter } from '../../utils/aiDisclosure'
import type { PrivacyStatus } from '../../types/dubbing.types'

const PRIVACY_OPTIONS: { value: PrivacyStatus; label: string }[] = [
  { value: 'private', label: '비공개 (권장)' },
  { value: 'unlisted', label: '일부 공개' },
  { value: 'public', label: '공개' },
]

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((l) => ({
  value: l.code,
  label: `${l.flag} ${l.name} (${l.nativeName})`,
}))

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
      patch.description = `${videoMeta.title} - Dubtube AI 더빙`
    }
    if (Object.keys(patch).length > 0) setUploadSettings(patch)
  }, [videoMeta?.id, videoMeta?.title, setUploadSettings])

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
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">업로드 설정</h2>
        <p className="mt-1 text-surface-500">
          {isMultiAudio
            ? '원본 영상에 자막을 추가합니다. 기본 설정을 확인하세요.'
            : '처리 완료 후 YouTube에 어떻게 업로드할지 미리 설정하세요.'}
        </p>
      </div>

      {/* Title/Desc/Tags — for new dubbed video uploads */}
      {deliverableMode === 'newDubbedVideos' && (
        <Card>
          <CardTitle>제목 · 설명 · 태그</CardTitle>
          <div className="space-y-4">
            <Select
              label="작성 언어"
              value={uploadSettings.metadataLanguage}
              onChange={(e) => setUploadSettings({ metadataLanguage: e.target.value })}
              options={LANGUAGE_OPTIONS}
            />
            <p className="-mt-2 text-xs text-surface-400">
              작성하기 편한 언어를 선택하세요. 제목과 설명은 더빙 대상 언어 기준으로 자동 번역되어 업로드됩니다.
            </p>

            <Input
              label="제목"
              value={uploadSettings.title}
              onChange={(e) => setUploadSettings({ title: e.target.value })}
              placeholder="영상 제목"
            />

            <div className="w-full">
              <label htmlFor="upload-description" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                설명
              </label>
              <textarea
                id="upload-description"
                rows={4}
                value={uploadSettings.description}
                onChange={(e) => setUploadSettings({ description: e.target.value })}
                placeholder="영상 설명"
                className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 resize-none"
              />
              {uploadSettings.containsSyntheticMedia && shouldShowAiDisclosure && (
                <AiDisclosurePreview text={aiDisclosureText} />
              )}
            </div>

            <Input
              label="태그 (쉼표 구분)"
              value={tagsString}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="Dubtube, AI더빙, dubbed"
            />
            <p className="-mt-2 text-xs text-surface-400">
              태그는 번역하지 않고 그대로 사용합니다.
            </p>

            <Select
              label="공개 설정"
              value={uploadSettings.privacyStatus}
              onChange={(e) => setUploadSettings({ privacyStatus: e.target.value as PrivacyStatus })}
              options={PRIVACY_OPTIONS}
            />
          </div>
        </Card>
      )}

      {/* Multi-audio: show privacy for original upload if source is file upload */}
      {isMultiAudio && videoSource?.type === 'upload' && (
        <Card>
          <CardTitle>원본 영상 업로드 설정</CardTitle>
          <div className="space-y-4">
            <Select
              label="작성 언어"
              value={uploadSettings.metadataLanguage}
              onChange={(e) => setUploadSettings({ metadataLanguage: e.target.value })}
              options={LANGUAGE_OPTIONS}
            />
            <p className="-mt-2 text-xs text-surface-400">
              작성하기 편한 언어를 선택하세요. 제목과 설명은 더빙 대상 언어 기준으로 자동 번역되어 업로드됩니다.
            </p>

            <Input
              label="제목"
              value={uploadSettings.title}
              onChange={(e) => setUploadSettings({ title: e.target.value })}
              placeholder="영상 제목"
            />

            <div className="w-full">
              <label htmlFor="upload-description" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                설명
              </label>
              <textarea
                id="upload-description"
                rows={3}
                value={uploadSettings.description}
                onChange={(e) => setUploadSettings({ description: e.target.value })}
                placeholder="영상 설명"
                className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 resize-none"
              />
              {uploadSettings.containsSyntheticMedia && shouldShowAiDisclosure && (
                <AiDisclosurePreview text={aiDisclosureText} />
              )}
            </div>

            <Input
              label="태그 (쉼표 구분)"
              value={tagsString}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="Dubtube, AI더빙, subtitles"
            />
            <p className="-mt-2 text-xs text-surface-400">
              태그는 번역하지 않고 그대로 사용합니다.
            </p>

            <Select
              label="공개 설정"
              value={uploadSettings.privacyStatus}
              onChange={(e) => setUploadSettings({ privacyStatus: e.target.value as PrivacyStatus })}
              options={PRIVACY_OPTIONS}
            />
          </div>
        </Card>
      )}

      {/* Upload options — for both newDubbedVideos and originalWithMultiAudio */}
      <Card>
        <CardTitle>업로드 옵션</CardTitle>
        <div className="mt-4 space-y-2">
          <ToggleRow
            icon={<Upload className="h-4 w-4 text-emerald-500" />}
            label="완료 즉시 자동 업로드"
            description={isMultiAudio
              ? '더빙 완료 시 자동으로 오디오 트랙을 추가합니다.'
              : '더빙이 완료되면 더빙된 영상을 자동으로 업로드합니다.'}
            active={uploadSettings.autoUpload}
            activeLabel="ON"
            inactiveLabel="OFF"
            onToggle={handleAutoUploadToggle}
          />

          {(deliverableMode === 'newDubbedVideos' || isMultiAudio) && (
            <ToggleRow
              icon={<Captions className="h-4 w-4 text-surface-400" />}
              label={isMultiAudio ? '자막(SRT) 업로드' : '더빙 영상에 자막(SRT) 자동 업로드'}
              description={isMultiAudio ? '완료된 언어의 번역 자막을 대상 영상에 업로드합니다.' : '선택한 언어에 맞는 자막을 함께 업로드합니다.'}
              active={captionUploadDisabled ? false : uploadSettings.uploadCaptions}
              activeLabel="ON"
              inactiveLabel="OFF"
              onToggle={() => setUploadSettings({ uploadCaptions: !uploadSettings.uploadCaptions })}
              disabled={captionUploadDisabled}
              disabledBadgeLabel="자동 업로드 OFF"
            />
          )}

          {originalYouTubeUrl && deliverableMode === 'newDubbedVideos' && (
            <ToggleRow
              icon={<Link2 className="h-4 w-4 text-surface-400" />}
              label="설명란에 원본 YouTube 링크 첨부"
              description={originalYouTubeUrl}
              active={uploadSettings.attachOriginalLink}
              activeLabel="첨부 ON"
              inactiveLabel="첨부 OFF"
              onToggle={() => setUploadSettings({ attachOriginalLink: !uploadSettings.attachOriginalLink })}
            />
          )}

          {uploadsVideoToYouTube && (
            <>
              <ToggleRow
                icon={<ShieldCheck className="h-4 w-4 text-surface-400" />}
                label="아동용으로 제작됨"
                description="YouTube의 아동용 콘텐츠 신고값입니다."
                active={uploadSettings.selfDeclaredMadeForKids}
                activeLabel="예"
                inactiveLabel="아니오"
                onToggle={() => setUploadSettings({ selfDeclaredMadeForKids: !uploadSettings.selfDeclaredMadeForKids })}
              />

              {shouldShowAiDisclosure && (
                <ToggleRow
                  icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                  label="AI 합성/변형 콘텐츠 공개"
                  description="설명 맨 아래에 AI 보이스 클론 더빙 고지 문구를 자동으로 붙입니다."
                  active={uploadSettings.containsSyntheticMedia}
                  activeLabel="ON"
                  inactiveLabel="OFF"
                  onToggle={handleSyntheticMediaToggle}
                />
              )}
            </>
          )}

          {/* 다국어 오디오 트랙: 자막 모드에서만 노출. 실서비스 검증 전이라 비활성. */}
          {isMultiAudio && (
            <ToggleRow
              icon={<Languages className="h-4 w-4 text-surface-400" />}
              label="다국어 오디오 트랙 추가"
              description="번역된 더빙 오디오를 YouTube 다국어 오디오 트랙으로 함께 추가합니다. 추후 기능이 추가될 예정입니다."
              active={false}
              activeLabel="ON"
              inactiveLabel="준비 중"
              onToggle={() => {}}
              disabled
            />
          )}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          이전
        </Button>
        <Button onClick={nextStep} disabled={!canContinue}>
          다음: 설정 확인
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function AiDisclosurePreview({ text }: { text: string }) {
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/70 dark:bg-amber-950/20">
      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
        설명 맨 아래에 자동 추가
      </p>
      <p className="mt-1 text-xs leading-5 text-surface-700 dark:text-surface-200">
        {text}
      </p>
    </div>
  )
}

interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  description?: string
  active: boolean
  activeLabel: string
  inactiveLabel: string
  onToggle: () => void
  disabled?: boolean
  disabledBadgeLabel?: string
}

function ToggleRow({ icon, label, description, active, activeLabel, inactiveLabel, onToggle, disabled, disabledBadgeLabel = '준비 중' }: ToggleRowProps) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-surface-700 dark:text-surface-300">{label}</p>
            {disabled && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {disabledBadgeLabel}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">{description}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
          disabled
            ? 'bg-surface-200 text-surface-400 dark:bg-surface-700 dark:text-surface-500 cursor-not-allowed'
            : `cursor-pointer ${active
              ? 'bg-brand-500 text-white'
              : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'}`
        }`}
      >
        {active ? activeLabel : inactiveLabel}
      </button>
    </div>
  )
}
