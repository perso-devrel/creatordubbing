'use client'

import { useMemo, useState } from 'react'
import { Check, FileVideo, Languages, Loader2, RefreshCw, Search, Upload } from 'lucide-react'
import { Badge, Button, Card, CardTitle, Input, Modal, Select, Toggle } from '@/components/ui'
import { useChannelStats, useMyVideos } from '@/hooks/useYouTubeData'
import { translateMetadata } from '@/lib/api-client/translate'
import {
  ytFetchVideoMetadata,
  ytUpdateVideoLocalizations,
  ytUploadVideo,
} from '@/lib/api-client/youtube'
import type { MetadataTranslation } from '@/lib/api-client/translate'
import { getMarketLanguagePreset, MARKET_LANGUAGE_PRESETS } from '@/lib/i18n/config'
import { useI18nStore } from '@/stores/i18nStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import type { PrivacyStatus } from '@/features/dubbing/types/dubbing.types'
import { SUPPORTED_LANGUAGES, fromBcp47, getLanguageByCode, toBcp47 } from '@/utils/languages'
import { cn } from '@/utils/cn'

type Mode = 'new' | 'existing'

function buildInitialTargets(presetId: string, sourceLang: string, exclude: Set<string> = new Set()) {
  return getMarketLanguagePreset(presetId)
    .languageCodes
    .filter((code) => code !== sourceLang && !exclude.has(code))
}

export function MetadataLocalizationTool() {
  const addToast = useNotificationStore((state) => state.addToast)
  const { appLocale, metadataTargetPreset, setMetadataTargetPreset } = useI18nStore()
  const isEnglish = appLocale === 'en'
  const ui = (ko: string, en: string) => (isEnglish ? en : ko)
  const languageOptions = SUPPORTED_LANGUAGES.map((language) => ({
    value: language.code,
    label: isEnglish
      ? `${language.flag} ${language.name} (${language.nativeName})`
      : `${language.flag} ${language.nativeName} (${language.name})`,
  }))
  const presetOptions = MARKET_LANGUAGE_PRESETS.map((preset) => ({
    value: preset.id,
    label: isEnglish ? preset.labelEn : preset.labelKo,
  }))
  const { defaultLanguage, defaultTags, defaultPrivacy } = useYouTubeSettingsStore()
  const { data: channel } = useChannelStats()

  const [mode, setMode] = useState<Mode>('existing')
  const { data: videos = [], isLoading: loadingVideos, error: videosError } = useMyVideos(50, mode === 'existing')
  const [videoId, setVideoId] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  /** 내 영상 모드에서 "불러오기"가 한 번이라도 성공했는지 — 하단 번역 카드 노출 게이트. */
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [sourceLang, setSourceLang] = useState(defaultLanguage)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>(() => [...defaultTags])
  const [targetLangs, setTargetLangs] = useState<string[]>(
    () => buildInitialTargets(metadataTargetPreset, defaultLanguage),
  )
  const [translations, setTranslations] = useState<Record<string, MetadataTranslation>>({})
  /** 내 영상 모드에서 YouTube로부터 가져온 기존 localization 언어 코드 (Perso 코드 기준). */
  const [existingLocalizationLangs, setExistingLocalizationLangs] = useState<Set<string>>(new Set())
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')

  // 새 영상 업로드 확인 모달 상태. 채널·태그·대상 언어는 읽기전용으로 보여주고,
  // 공개 범위(기본: 사용자 설정)와 유아용 여부(기본: false)만 모달에서 조정한다.
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadPrivacy, setUploadPrivacy] = useState<PrivacyStatus>(defaultPrivacy)
  const [uploadMadeForKids, setUploadMadeForKids] = useState(false)
  const [uploadConfirmed, setUploadConfirmed] = useState(false)

  const openUploadModal = () => {
    // 모달 열 때마다 최신 store 값을 가져와 초기화 — 별도의 sync effect 불필요.
    setUploadPrivacy(defaultPrivacy)
    setUploadMadeForKids(false)
    setUploadConfirmed(false)
    setShowUploadModal(true)
  }
  const closeUploadModal = () => setShowUploadModal(false)

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return videos
    return videos.filter((video) => video.title.toLowerCase().includes(q))
  }, [query, videos])

  const selectedPreset = getMarketLanguagePreset(metadataTargetPreset)
  const targetSet = new Set(targetLangs)
  const canTranslate = title.trim().length > 0 && targetLangs.length > 0
  const canApply = mode === 'existing' && videoId && title.trim().length > 0 && Object.keys(translations).length > 0
  const canUpload = mode === 'new' && videoFile && title.trim().length > 0 && Object.keys(translations).length > 0
  /**
   * 사용자가 선택한 대상 언어 모두에 대해 번역(title 채워짐)이 준비됐는지.
   * 이 값이 true면 "업로드/적용" 버튼만, false면 "번역 생성" 버튼만 노출한다.
   * 사용자가 새 언어를 추가하면 자연스럽게 false가 되어 다시 번역 생성으로 돌아간다.
   */
  const allTargetsTranslated =
    targetLangs.length > 0 &&
    targetLangs.every((code) => translations[code]?.title?.trim().length)

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setVideoId('')
    setVideoFile(null)
    setTitle('')
    setDescription('')
    setTags([...defaultTags])
    setTranslations({})
    setExistingLocalizationLangs(new Set())
    setMetadataLoaded(false)
    setTargetLangs(buildInitialTargets(metadataTargetPreset, sourceLang))
  }

  const handleLoadMetadata = async () => {
    if (!videoId) return
    setLoadingMetadata(true)
    try {
      const metadata = await ytFetchVideoMetadata(videoId)
      setTitle(metadata.title)
      setDescription(metadata.description)
      // YouTube에 defaultLanguage가 명시되어 있지 않으면 빈 문자열이 옴 — 사용자 설정 기본값으로 fallback.
      const ytDefaultLang = metadata.defaultLanguage?.trim() ?? ''
      const nextSourceLang = ytDefaultLang ? fromBcp47(ytDefaultLang) : defaultLanguage
      setSourceLang(nextSourceLang)
      if (!ytDefaultLang) {
        addToast({
          type: 'warning',
        title: ui('원문 언어가 YouTube에 설정되어 있지 않습니다', 'The source language is not set on YouTube'),
        message: ui(
          `사용자 기본 언어(${nextSourceLang})로 설정했습니다. 실제와 다르면 위 "원문 언어" 드롭다운에서 변경하세요.`,
          `Using your default language (${nextSourceLang}). If this is not correct, change the source language above.`,
        ),
        })
      }

      // YouTube의 localizations은 BCP-47 키. 내부에서는 Perso 코드로 표준화.
      const existingPersoCodes = new Set(
        Object.keys(metadata.localizations).map((bcp47) => fromBcp47(bcp47)),
      )
      setExistingLocalizationLangs(existingPersoCodes)

      const normalizedTranslations = Object.fromEntries(
        Object.entries(metadata.localizations).map(([bcp47, value]) => [
          fromBcp47(bcp47),
          value,
        ]),
      )
      setTranslations(normalizedTranslations)

      // 이미 번역된 언어는 picker 기본 선택에서 제외 — 사용자는 추가하고 싶은 것만 선택.
      setTargetLangs(buildInitialTargets(metadataTargetPreset, nextSourceLang, existingPersoCodes))
      setMetadataLoaded(true)

      addToast({ type: 'success', title: ui('YouTube 제목·설명을 불러왔습니다', 'Loaded YouTube title and description') })
    } catch (err) {
      addToast({
        type: 'error',
        title: ui('제목·설명 불러오기 실패', 'Failed to load title and description'),
        message: err instanceof Error ? err.message : ui('알 수 없는 오류가 발생했습니다.', 'An unknown error occurred.'),
      })
    } finally {
      setLoadingMetadata(false)
    }
  }

  const handleTranslate = async () => {
    if (!canTranslate) return
    setTranslating(true)
    try {
      const result = await translateMetadata({
        title: title.trim(),
        description,
        sourceLang,
        targetLangs,
      })
      setTranslations((prev) => ({ ...prev, ...result }))
      addToast({ type: 'success', title: ui('제목·설명 번역이 생성되었습니다', 'Title and description translations generated') })
    } catch (err) {
      addToast({
        type: 'error',
        title: ui('번역 생성 실패', 'Translation failed'),
        message: err instanceof Error ? err.message : ui('알 수 없는 오류가 발생했습니다.', 'An unknown error occurred.'),
      })
    } finally {
      setTranslating(false)
    }
  }

  const handleApply = async () => {
    if (!canApply) return
    setSaving(true)
    try {
      const localizations = Object.fromEntries(
        Object.entries(translations).map(([code, value]) => [toBcp47(code), value]),
      )
      await ytUpdateVideoLocalizations({
        videoId,
        sourceLang: toBcp47(sourceLang),
        title: title.trim(),
        description,
        localizations,
      })
      addToast({ type: 'success', title: ui('YouTube 제목·설명 번역을 적용했습니다', 'Applied YouTube title and description translations') })
    } catch (err) {
      addToast({
        type: 'error',
        title: ui('YouTube 적용 실패', 'Failed to apply changes on YouTube'),
        message: err instanceof Error ? err.message : ui('알 수 없는 오류가 발생했습니다.', 'An unknown error occurred.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadNew = async () => {
    if (!canUpload || !videoFile) return
    setUploading(true)
    try {
      const localizations = Object.fromEntries(
        Object.entries(translations).map(([code, value]) => [toBcp47(code), value]),
      )
      await ytUploadVideo({
        video: videoFile,
        title: title.trim(),
        description,
        tags,
        privacyStatus: uploadPrivacy,
        selfDeclaredMadeForKids: uploadMadeForKids,
        language: toBcp47(sourceLang),
        localizations,
      })
      const privacyLabel =
        uploadPrivacy === 'public' ? ui('공개', 'public')
          : uploadPrivacy === 'unlisted' ? ui('일부 공개', 'unlisted')
            : ui('비공개', 'private')
      addToast({
        type: 'success',
        title: ui('YouTube 업로드 완료', 'YouTube upload complete'),
        message: ui(`영상이 ${privacyLabel} 상태로 업로드되었습니다.`, `Video uploaded as ${privacyLabel}.`),
      })
      // 업로드 후 폼 초기화 — 같은 파일 중복 업로드 방지.
      setVideoFile(null)
      setTitle('')
      setDescription('')
      setTags([...defaultTags])
      setTranslations({})
      setShowUploadModal(false)
    } catch (err) {
      addToast({
        type: 'error',
        title: ui('YouTube 업로드 실패', 'YouTube upload failed'),
        message: err instanceof Error ? err.message : ui('알 수 없는 오류가 발생했습니다.', 'An unknown error occurred.'),
      })
    } finally {
      setUploading(false)
    }
  }

  const toggleTarget = (code: string) => {
    if (code === sourceLang) return
    if (mode === 'existing' && existingLocalizationLangs.has(code)) return
    setTargetLangs((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    )
  }

  const updateTranslation = (
    code: string,
    patch: Partial<MetadataTranslation>,
  ) => {
    setTranslations((current) => ({
      ...current,
      [code]: {
        title: current[code]?.title ?? '',
        description: current[code]?.description ?? '',
        ...patch,
      },
    }))
  }

  return (
    <div className="space-y-6">
      {/* 모드 토글 */}
      <div className="flex gap-1 rounded-lg bg-surface-100 p-1 dark:bg-surface-800" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'new'}
          onClick={() => switchMode('new')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-ring',
            mode === 'new'
              ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white'
              : 'text-surface-500 hover:text-surface-700 dark:text-surface-400',
          )}
        >
          <FileVideo className="h-4 w-4" />
          {ui('새 영상 올리기', 'Upload new video')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'existing'}
          onClick={() => switchMode('existing')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-ring',
            mode === 'existing'
              ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white'
              : 'text-surface-500 hover:text-surface-700 dark:text-surface-400',
          )}
        >
          <RefreshCw className="h-4 w-4" />
          {ui('내 영상 불러오기', 'Load my video')}
        </button>
      </div>

      {mode === 'existing' ? (
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>{ui('YouTube 영상 선택', 'Select a YouTube video')}</CardTitle>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                {ui(
                  '내 채널 영상의 현재 제목·설명과 기존 다국어 번역을 불러옵니다. 이미 번역된 언어는 언어 선택 목록에서 비활성화됩니다.',
                  'Load the current title, description, and existing translations for a video on your channel. Already translated languages are disabled in the language list.',
                )}
              </p>
            </div>
            {loadingVideos && <Loader2 className="h-5 w-5 animate-spin text-surface-400" />}
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={ui('영상 제목으로 검색', 'Search by video title')}
                  className="h-10 w-full rounded-lg border border-surface-300 bg-white pl-9 pr-3 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                />
              </div>
              <Select
                label={ui('대상 영상', 'Target video')}
                value={videoId}
                onChange={(event) => {
                  const selected = videos.find((video) => video.videoId === event.target.value)
                  setVideoId(event.target.value)
                  // 다른 영상으로 바꾸면 이전 로드 결과는 무효 — 다시 "불러오기" 눌러야 함.
                  setMetadataLoaded(false)
                  setTitle('')
                  setDescription('')
                  setTranslations({})
                  setExistingLocalizationLangs(new Set())
                  if (selected) setTitle(selected.title)
                }}
                options={[
                  { value: '', label: loadingVideos ? ui('불러오는 중...', 'Loading...') : ui('영상을 선택하세요', 'Select a video') },
                  ...filteredVideos.map((video) => ({
                    value: video.videoId,
                    label: `${video.title} (${video.privacyStatus})`,
                  })),
                ]}
              />
              {videosError && (
                <p className="text-sm text-red-500">
                  {videosError instanceof Error ? videosError.message : ui('YouTube 영상 목록을 불러오지 못했습니다.', 'Could not load YouTube videos.')}
                </p>
              )}
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleLoadMetadata}
                loading={loadingMetadata}
                disabled={!videoId || loadingMetadata}
                className="w-full md:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                {ui('불러오기', 'Load')}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-5">
            <CardTitle>{ui('영상 파일 선택', 'Select a video file')}</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {ui(
                'YouTube에 새로 올릴 영상 파일을 선택하세요. 번역 후 업로드 시 다국어 제목·설명이 함께 적용됩니다.',
                'Select a video file to upload to YouTube. Translated titles and descriptions are applied during upload.',
              )}
            </p>
          </div>

          <label
            htmlFor="metadata-new-video-file"
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
              videoFile
                ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
                : 'border-surface-300 hover:border-brand-300 hover:bg-surface-50 dark:border-surface-700 dark:hover:border-brand-700 dark:hover:bg-surface-800',
            )}
          >
            <FileVideo className="h-8 w-8 text-surface-400" />
            {videoFile ? (
              <>
                <span className="text-sm font-medium text-surface-900 dark:text-white">
                  {videoFile.name}
                </span>
                <span className="text-xs text-surface-500">
                  {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
                  {ui('영상 파일을 선택하세요', 'Select a video file')}
                </span>
                <span className="text-xs text-surface-500">
                  {ui('mp4, mov, webm 등 YouTube가 지원하는 영상 포맷', 'Video formats supported by YouTube, such as mp4, mov, and webm')}
                </span>
              </>
            )}
            <input
              id="metadata-new-video-file"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setVideoFile(file)
              }}
            />
          </label>
          <p className="mt-3 text-xs text-surface-500">
            {ui('업로드 시 비공개로 업로드됩니다. 검토 후 YouTube Studio에서 공개로 전환하세요.', 'Videos are uploaded as private by default. Review them in YouTube Studio before making them public.')}
          </p>
        </Card>
      )}

      {((mode === 'existing' && metadataLoaded) || (mode === 'new' && videoFile)) && (
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{ui('제목·설명 번역', 'Title and description translation')}</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {mode === 'new'
                ? ui('YouTube에 업로드 시 함께 적용될 다국어 제목·설명을 생성합니다.', 'Generate translated titles and descriptions for upload.')
                : ui('더빙 없이 YouTube 다국어 제목·설명에 적용할 번역만 생성합니다.', 'Generate translations for YouTube multilingual titles and descriptions without dubbing.')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label={ui('원문 언어', 'Source language')}
            value={sourceLang}
            onChange={(event) => {
              const nextSourceLang = event.target.value
              setSourceLang(nextSourceLang)
              setTargetLangs(buildInitialTargets(metadataTargetPreset, nextSourceLang, existingLocalizationLangs))
            }}
            options={languageOptions}
          />
          <Select
            label={ui('추천 시장', 'Recommended market')}
            value={metadataTargetPreset}
            onChange={(event) => {
              const nextPreset = event.target.value
              setMetadataTargetPreset(nextPreset)
              setTargetLangs(buildInitialTargets(nextPreset, sourceLang, existingLocalizationLangs))
            }}
            options={presetOptions}
          />
        </div>

        <div className="mt-4 space-y-4">
          <Input
            label={ui('원문 제목', 'Source title')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={ui('YouTube 제목', 'YouTube title')}
          />
          <div>
            <label htmlFor="metadata-source-description" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              {ui('원문 설명', 'Source description')}
            </label>
            <textarea
              id="metadata-source-description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={ui('YouTube 설명', 'YouTube description')}
              className="w-full resize-none rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
          </div>
          {mode === 'new' && (
            <div>
              <Input
                label={ui('태그', 'Tags')}
                value={tags.join(', ')}
                onChange={(event) => {
                  const parsed = event.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                  setTags(parsed)
                }}
                placeholder={ui('쉼표로 구분 (예: 브이로그, 리뷰)', 'Comma-separated (e.g. gaming, vlog)')}
              />
              <p className="mt-1.5 text-xs text-surface-400">
                {ui('YouTube 설정의 기본 태그가 채워져 있습니다. 이 영상에만 적용할 태그로 수정하세요.', 'Default tags from YouTube settings are prefilled. Edit them for this video if needed.')}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
                {isEnglish ? selectedPreset.labelEn : selectedPreset.labelKo}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {isEnglish ? selectedPreset.descriptionEn : selectedPreset.descriptionKo}
              </p>
            </div>
            <Badge variant="brand">{ui(`${targetLangs.length}개 선택`, `${targetLangs.length} selected`)}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((language) => {
              const selected = targetSet.has(language.code)
              const alreadyTranslated = mode === 'existing' && existingLocalizationLangs.has(language.code)
              const disabled = language.code === sourceLang || alreadyTranslated
              return (
                <button
                  key={language.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleTarget(language.code)}
                  title={alreadyTranslated ? ui('이미 번역되어 있는 언어', 'Already translated') : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition',
                    selected
                      ? 'bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800'
                      : alreadyTranslated
                        ? 'bg-surface-100 text-surface-500 ring-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:ring-surface-700'
                        : 'bg-white text-surface-600 ring-surface-200 hover:bg-surface-50 dark:bg-surface-900 dark:text-surface-300 dark:ring-surface-700 dark:hover:bg-surface-800',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {alreadyTranslated && <Check className="h-3 w-3 text-surface-400" />}
                  {language.flag} {isEnglish ? language.name : language.nativeName}
                </button>
              )
            })}
          </div>
          {mode === 'existing' && existingLocalizationLangs.size > 0 && (
            <p className="mt-2 text-xs text-surface-500">
              {ui(`회색으로 표시된 언어 ${existingLocalizationLangs.size}개는 이미 번역되어 있습니다.`, `${existingLocalizationLangs.size} grayed-out languages are already translated.`)}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {!allTargetsTranslated ? (
            <Button
              onClick={handleTranslate}
              loading={translating}
              disabled={!canTranslate || translating}
            >
              <Languages className="h-4 w-4" />
              {ui('번역 생성', 'Generate translations')}
            </Button>
          ) : mode === 'existing' ? (
            <Button
              onClick={handleApply}
              loading={saving}
              disabled={!canApply || saving}
            >
              <Upload className="h-4 w-4" />
              {ui('YouTube에 적용', 'Apply to YouTube')}
            </Button>
          ) : (
            <Button
              onClick={openUploadModal}
              disabled={!canUpload || uploading}
            >
              <Upload className="h-4 w-4" />
              {ui('YouTube에 업로드', 'Upload to YouTube')}
            </Button>
          )}
        </div>
      </Card>
      )}

      {Object.keys(translations).length > 0 && (
        <Card>
          <div className="mb-5">
            <CardTitle>{ui('번역 검토', 'Review translations')}</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {ui('적용 전에 언어별 제목과 설명을 직접 수정할 수 있습니다.', 'Edit titles and descriptions before applying them.')}
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(translations).map(([code, value]) => {
              const language = getLanguageByCode(code) ?? getLanguageByCode(code.split('-')[0])
              const isPreExisting = mode === 'existing' && existingLocalizationLangs.has(code)
              return (
                <div key={code} className="rounded-lg border border-surface-200 p-4 dark:border-surface-800">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-lg">{language?.flag}</span>
                    <span className="font-medium text-surface-900 dark:text-white">
                      {language ? (isEnglish ? language.name : language.nativeName) : code}
                    </span>
                    <span className="text-xs text-surface-400">{toBcp47(code)}</span>
                    {isPreExisting && (
                      <Badge variant="default">{ui('YouTube 기존 번역', 'Existing YouTube translation')}</Badge>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      label={ui('제목', 'Title')}
                      value={value.title}
                      onChange={(event) => updateTranslation(code, { title: event.target.value })}
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                        {ui('설명', 'Description')}
                      </label>
                      <textarea
                        rows={4}
                        value={value.description}
                        onChange={(event) => updateTranslation(code, { description: event.target.value })}
                        className="w-full resize-none rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {mode === 'new' && (
        <Modal
          open={showUploadModal}
          onClose={closeUploadModal}
          title={ui('YouTube 업로드 확인', 'Confirm YouTube upload')}
          size="lg"
        >
          <div className="space-y-5">
            <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{ui('채널', 'Channel')}</p>
              <p className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                {channel
                  ? ui(`${channel.title} · 구독자 ${channel.subscriberCount.toLocaleString('ko-KR')}`, `${channel.title} · ${channel.subscriberCount.toLocaleString('en-US')} subscribers`)
                  : ui('연결된 채널 정보 없음', 'No connected channel information')}
              </p>
            </div>

            <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{ui(`대상 언어 (${Object.keys(translations).length}개)`, `Target languages (${Object.keys(translations).length})`)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.keys(translations).map((code) => {
                  const lang = getLanguageByCode(code) ?? getLanguageByCode(code.split('-')[0])
                  return (
                    <Badge key={code} variant="brand">
                      {lang ? `${lang.flag} ${isEnglish ? lang.name : lang.nativeName}` : code}
                    </Badge>
                  )
                })}
              </div>
            </div>

            <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{ui('태그', 'Tags')}</p>
              <p className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                {tags.length > 0 ? tags.join(', ') : <span className="text-surface-400">{ui('없음', 'None')}</span>}
              </p>
            </div>

            <Select
              label={ui('공개 범위', 'Visibility')}
              value={uploadPrivacy}
              onChange={(e) => setUploadPrivacy(e.target.value as PrivacyStatus)}
              options={[
                { value: 'private', label: ui('비공개', 'Private') },
                { value: 'unlisted', label: ui('일부 공개', 'Unlisted') },
                { value: 'public', label: ui('공개', 'Public') },
              ]}
            />
            <p className="-mt-3 text-xs text-surface-400">
              {ui('YouTube 설정 페이지의 기본값으로 채워져 있습니다. 이 영상에만 적용할 값으로 변경할 수 있습니다.', 'This is prefilled from YouTube settings. You can change it for this video.')}
            </p>

            <div className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">{ui('아동용 영상', 'Made for kids')}</p>
                <p className="text-xs text-surface-500">{ui('YouTube의 아동용 콘텐츠 정책에 따라 표시합니다. 일반 영상은 꺼두세요.', 'Set this according to YouTube made-for-kids policy. Leave it off for general videos.')}</p>
              </div>
              <Toggle checked={uploadMadeForKids} onChange={setUploadMadeForKids} />
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <input
                type="checkbox"
                checked={uploadConfirmed}
                onChange={(e) => setUploadConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-surface-300 text-brand-600 focus-ring"
              />
              <span className="text-sm text-surface-700 dark:text-surface-300">
                {ui('위 설정을 확인했으며 업로드를 진행합니다.', 'I have reviewed these settings and want to upload.')}
              </span>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={closeUploadModal} disabled={uploading}>
              {ui('취소', 'Cancel')}
            </Button>
            <Button
              onClick={handleUploadNew}
              loading={uploading}
              disabled={!uploadConfirmed || uploading}
            >
              <Upload className="h-4 w-4" />
              {ui('업로드', 'Upload')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
