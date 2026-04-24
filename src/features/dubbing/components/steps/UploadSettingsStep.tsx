'use client'

import { useEffect, useMemo } from 'react'
import { ArrowLeft, ArrowRight, Link2, Upload, Zap } from 'lucide-react'
import { Button, Card, CardTitle, Input, Select } from '@/components/ui'
import { cn } from '@/utils/cn'
import { extractVideoId } from '@/utils/validators'
import { getLanguageByCode } from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'
import type { PrivacyStatus } from '../../types/dubbing.types'

const PRIVACY_OPTIONS: { value: PrivacyStatus; label: string }[] = [
  { value: 'private', label: '비공개 (권장)' },
  { value: 'unlisted', label: '일부 공개' },
  { value: 'public', label: '공개' },
]

export function UploadSettingsStep() {
  const {
    videoMeta,
    videoSource,
    isShort,
    selectedLanguages,
    deliverableMode,
    uploadSettings,
    setUploadSettings,
    prevStep,
    nextStep,
  } = useDubbingStore()

  const originalYouTubeId =
    videoSource?.type === 'url' && videoSource.url ? extractVideoId(videoSource.url) : null
  const originalYouTubeUrl = originalYouTubeId
    ? `https://www.youtube.com/watch?v=${originalYouTubeId}`
    : null

  useEffect(() => {
    const patch: Partial<typeof uploadSettings> = {}
    if (!uploadSettings.title && videoMeta?.title) {
      patch.title = videoMeta.title
    }
    if (!uploadSettings.description && videoMeta?.title) {
      patch.description = `${videoMeta.title} - CreatorDub AI 더빙\n\n원본 영상에서 AI 보이스 클론으로 더빙되었습니다.`
    }
    if (Object.keys(patch).length > 0) setUploadSettings(patch)
  }, [videoMeta?.title, uploadSettings.title, uploadSettings.description, setUploadSettings])

  const firstLangName = useMemo(() => {
    const first = selectedLanguages[0]
    if (!first) return null
    return getLanguageByCode(first)?.name || first
  }, [selectedLanguages])

  const previewTitle = firstLangName && deliverableMode === 'newDubbedVideos'
    ? `${uploadSettings.uploadAsShort ? '#Shorts ' : ''}[${firstLangName}] ${uploadSettings.title || '(제목 없음)'}`
    : uploadSettings.title || '(제목 없음)'

  const previewDescription = (() => {
    const base = uploadSettings.description || '(설명 없음)'
    if (uploadSettings.attachOriginalLink && originalYouTubeUrl) {
      return `${base}\n\n원본 영상: ${originalYouTubeUrl}`
    }
    return base
  })()

  const tagsString = uploadSettings.tags.join(', ')

  const handleTagsChange = (value: string) => {
    const parsed = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    setUploadSettings({ tags: parsed })
  }

  const canContinue =
    deliverableMode === 'originalWithMultiAudio'
      ? true
      : uploadSettings.title.trim().length > 0

  const isMultiAudio = deliverableMode === 'originalWithMultiAudio'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">업로드 설정</h2>
        <p className="mt-1 text-surface-500">
          {isMultiAudio
            ? '원본 영상에 오디오 트랙을 추가합니다. 기본 설정을 확인하세요.'
            : '처리 완료 후 YouTube에 어떻게 업로드할지 미리 설정하세요.'}
        </p>
      </div>

      {/* Title/Desc/Tags — only for newDubbedVideos or originalWithMultiAudio(upload) */}
      {deliverableMode === 'newDubbedVideos' && (
        <Card>
          <CardTitle>제목 · 설명 · 태그</CardTitle>
          <p className="mt-1 mb-4 text-xs text-surface-500">각 언어별로 제목 앞에 [언어명]이 자동 추가됩니다.</p>
          <div className="space-y-4">
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
              placeholder="CreatorDub, AI더빙, dubbed"
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
            원본 영상이 YouTube에 먼저 업로드된 후, 더빙 오디오 트랙이 자동 추가됩니다.
          </p>
          <div className="space-y-4">
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

          {deliverableMode === 'newDubbedVideos' && (
            <ToggleRow
              icon={<Zap className="h-4 w-4 text-brand-500" />}
              label={isShort ? 'Shorts로 업로드 (자동 감지됨)' : 'Shorts로 업로드'}
              description="제목 앞에 #Shorts가 추가되고 Shorts 태그가 붙습니다."
              active={uploadSettings.uploadAsShort}
              activeLabel="Shorts ON"
              inactiveLabel="Shorts OFF"
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
        </div>
      </Card>

      {/* Preview — only for newDubbedVideos */}
      {deliverableMode === 'newDubbedVideos' && firstLangName && (
        <Card className="border-brand-200 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-900/10">
          <CardTitle>미리보기 ({firstLangName})</CardTitle>
          <div className="mt-3 space-y-2">
            <div>
              <p className="text-xs text-surface-500">제목</p>
              <p className="mt-0.5 text-sm font-medium text-surface-900 dark:text-white break-all">{previewTitle}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">설명</p>
              <p className="mt-0.5 whitespace-pre-line text-sm text-surface-700 dark:text-surface-300">{previewDescription}</p>
            </div>
          </div>
        </Card>
      )}

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
}

function ToggleRow({ icon, label, description, active, activeLabel, inactiveLabel, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50">
      <div className="flex min-w-0 items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-surface-700 dark:text-surface-300">{label}</p>
          {description && (
            <p className="mt-0.5 truncate text-xs text-surface-400">{description}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
          active
            ? 'bg-brand-500 text-white'
            : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
        }`}
      >
        {active ? activeLabel : inactiveLabel}
      </button>
    </div>
  )
}
