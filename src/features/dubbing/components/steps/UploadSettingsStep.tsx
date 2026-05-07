'use client'

import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, Captions, Languages, Link2, ShieldCheck, Sparkles, Upload, Zap } from 'lucide-react'
import { Button, Card, CardTitle, Input, Select } from '@/components/ui'
import { extractVideoId } from '@/utils/validators'
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'
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
    isShort,
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
      patch.description = `${videoMeta.title} - Dubtube AI 더빙\n\n원본 영상에서 AI 보이스 클론으로 더빙되었습니다.`
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
  const canContinue =
    deliverableMode === 'originalWithMultiAudio'
      ? true
      : uploadSettings.title.trim().length > 0

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

      {/* Title/Desc/Tags — only for newDubbedVideos or originalWithMultiAudio(upload) */}
      {deliverableMode === 'newDubbedVideos' && (
        <Card>
          <CardTitle>제목 · 설명 · 태그</CardTitle>
          <p className="mt-1 mb-4 text-xs text-surface-500">
            아래 텍스트는 <strong>{getLanguageByCode(uploadSettings.metadataLanguage)?.name ?? uploadSettings.metadataLanguage}</strong> 기준으로 작성한 것으로 간주하고, 각 대상 언어로 자동 번역되어 업로드됩니다.
          </p>
          <div className="space-y-4">
            <Select
              label="제목·설명 작성 언어"
              value={uploadSettings.metadataLanguage}
              onChange={(e) => setUploadSettings({ metadataLanguage: e.target.value })}
              options={LANGUAGE_OPTIONS}
            />
            <p className="-mt-2 text-xs text-surface-400">
              마이페이지의 기본 작성 언어를 따르며, 여기에서 더빙별로 변경할 수 있습니다.
            </p>

            <Input
              label="제목 (공통)"
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
            </div>

            <Input
              label="태그 (쉼표 구분)"
              value={tagsString}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="Dubtube, AI더빙, dubbed"
            />

            <Select
              label="공개 설정"
              value={uploadSettings.privacyStatus}
              onChange={(e) => setUploadSettings({ privacyStatus: e.target.value as PrivacyStatus })}
              options={PRIVACY_OPTIONS}
            />
            <p className="-mt-2 text-xs text-surface-400">
              안전을 위해 비공개를 권장합니다. 업로드 후 YouTube Studio에서 변경할 수 있습니다.
            </p>
          </div>
        </Card>
      )}

      {/* Multi-audio: show privacy for original upload if source is file upload */}
      {isMultiAudio && videoSource?.type === 'upload' && (
        <Card>
          <CardTitle>원본 영상 업로드 설정</CardTitle>
          <p className="mt-1 mb-4 text-xs text-surface-500">
            아래 텍스트는 <strong>{getLanguageByCode(uploadSettings.metadataLanguage)?.name ?? uploadSettings.metadataLanguage}</strong> 기준으로 작성한 것으로 간주하고, 선택한 대상 언어로 자동 번역되어 YouTube `localizations`에 함께 등록됩니다.
          </p>
          <div className="space-y-4">
            <Select
              label="제목·설명 작성 언어"
              value={uploadSettings.metadataLanguage}
              onChange={(e) => setUploadSettings({ metadataLanguage: e.target.value })}
              options={LANGUAGE_OPTIONS}
            />

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
            </div>

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
              : '더빙이 완료되면 개입 없이 모든 언어를 자동으로 업로드합니다.'}
            active={uploadSettings.autoUpload}
            activeLabel="ON"
            inactiveLabel="OFF"
            onToggle={() => setUploadSettings({ autoUpload: !uploadSettings.autoUpload })}
          />

          {/* Shorts 토글: 새로 영상을 YouTube에 올리는 케이스에만 노출.
              channel 모드는 이미 업로드된 영상이라 Shorts 분류가 고정됨. */}
          {(deliverableMode === 'newDubbedVideos' ||
            (deliverableMode === 'originalWithMultiAudio' && videoSource?.type === 'upload')) && (
            <ToggleRow
              icon={<Zap className="h-4 w-4 text-brand-500" />}
              label={isShort ? 'Shorts 해시태그 붙이기 (자동 감지됨)' : 'Shorts 해시태그 붙이기'}
              description="제목 앞에 #Shorts가 추가되고 Shorts 태그가 붙습니다. 최종 Shorts 분류는 영상 비율·길이에 따라 YouTube가 결정합니다."
              active={uploadSettings.uploadAsShort}
              activeLabel="ON"
              inactiveLabel="OFF"
              onToggle={() => setUploadSettings({ uploadAsShort: !uploadSettings.uploadAsShort })}
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

          {(deliverableMode === 'newDubbedVideos' || isMultiAudio) && (
            <ToggleRow
              icon={<Captions className="h-4 w-4 text-surface-400" />}
              label={isMultiAudio ? '자막(SRT) 업로드' : '더빙 영상에 자막(SRT) 첨부'}
              description={isMultiAudio ? '완료된 언어의 번역 자막을 대상 영상에 업로드합니다.' : '즉시 업로드와 예약 업로드 모두 번역 자막을 함께 처리합니다.'}
              active={uploadSettings.uploadCaptions}
              activeLabel="ON"
              inactiveLabel="OFF"
              onToggle={() => setUploadSettings({ uploadCaptions: !uploadSettings.uploadCaptions })}
            />
          )}

          {uploadsVideoToYouTube && (
            <>
              <ToggleRow
                icon={<ShieldCheck className="h-4 w-4 text-surface-400" />}
                label="아동용으로 제작됨"
                description="YouTube의 아동용 콘텐츠 신고값입니다. 기본값은 아니오입니다."
                active={uploadSettings.selfDeclaredMadeForKids}
                activeLabel="예"
                inactiveLabel="아니오"
                onToggle={() => setUploadSettings({ selfDeclaredMadeForKids: !uploadSettings.selfDeclaredMadeForKids })}
              />

              <ToggleRow
                icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                label="AI 합성/변형 콘텐츠 공개"
                description="AI 더빙 음성이 포함되므로 기본값은 공개 ON입니다."
                active={uploadSettings.containsSyntheticMedia}
                activeLabel="ON"
                inactiveLabel="OFF"
                onToggle={() => setUploadSettings({ containsSyntheticMedia: !uploadSettings.containsSyntheticMedia })}
              />
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

interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  description?: string
  active: boolean
  activeLabel: string
  inactiveLabel: string
  onToggle: () => void
  disabled?: boolean
}

function ToggleRow({ icon, label, description, active, activeLabel, inactiveLabel, onToggle, disabled }: ToggleRowProps) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-surface-700 dark:text-surface-300">{label}</p>
            {disabled && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                준비 중
              </span>
            )}
          </div>
          {description && (
            <p className={`mt-0.5 text-xs text-surface-400 ${disabled ? '' : 'truncate'}`}>{description}</p>
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

