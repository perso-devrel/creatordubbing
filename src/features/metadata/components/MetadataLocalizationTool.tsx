'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
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
  const { metadataTargetPreset, setMetadataTargetPreset } = useI18nStore()
  const appLocale = useAppLocale()
  const t = useLocaleText()
  const isEnglish = appLocale === 'en'
  const languageOptions = SUPPORTED_LANGUAGES.map((language) => ({
    value: language.code,
    label: isEnglish
      ? `${language.flag} ${language.name} (${language.nativeName})`
      : `${language.flag} ${language.nativeName} (${language.name})`,
  }))
  const presetOptions = MARKET_LANGUAGE_PRESETS.map((preset) => ({
    value: preset.id,
    label: t(preset.labelKey),
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

  useEffect(() => {
    if (!videosError) return
    console.error('[MetadataLocalizationTool] Failed to load YouTube videos', videosError)
  }, [videosError])

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
        title: t('features.metadata.components.metadataLocalizationTool.theSourceLanguageIsNotSetOnYouTube'),
        message: t('features.metadata.components.metadataLocalizationTool.usingYourDefaultLanguageValueIfThisIs', { nextSourceLang: nextSourceLang }),
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

      addToast({ type: 'success', title: t('features.metadata.components.metadataLocalizationTool.loadedYouTubeTitleAndDescription') })
    } catch (err) {
      console.error('[MetadataLocalizationTool] Failed to load YouTube metadata', err)
      addToast({
        type: 'error',
        title: t('features.metadata.components.metadataLocalizationTool.failedToLoadTitleAndDescription'),
        message: t('features.metadata.components.metadataLocalizationTool.couldNotLoadTheYouTubeTitleAndDescription'),
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
      addToast({ type: 'success', title: t('features.metadata.components.metadataLocalizationTool.titleAndDescriptionTranslationsGenerated') })
    } catch (err) {
      console.error('[MetadataLocalizationTool] Failed to translate metadata', err)
      addToast({
        type: 'error',
        title: t('features.metadata.components.metadataLocalizationTool.translationFailed'),
        message: t('features.metadata.components.metadataLocalizationTool.couldNotGenerateTranslationsPleaseTryAgainShortly'),
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
      addToast({ type: 'success', title: t('features.metadata.components.metadataLocalizationTool.appliedYouTubeTitleAndDescriptionTranslations') })
    } catch (err) {
      console.error('[MetadataLocalizationTool] Failed to apply YouTube metadata', err)
      addToast({
        type: 'error',
        title: t('features.metadata.components.metadataLocalizationTool.failedToApplyChangesOnYouTube'),
        message: t('features.metadata.components.metadataLocalizationTool.couldNotApplyChangesToYouTubePleaseTry'),
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
        uploadPrivacy === 'public' ? t('features.metadata.components.metadataLocalizationTool.public')
          : uploadPrivacy === 'unlisted' ? t('features.metadata.components.metadataLocalizationTool.unlisted')
            : t('features.metadata.components.metadataLocalizationTool.private')
      addToast({
        type: 'success',
        title: t('features.metadata.components.metadataLocalizationTool.youTubeUploadComplete'),
        message: t('features.metadata.components.metadataLocalizationTool.videoUploadedAsValue', { privacyLabel: privacyLabel }),
      })
      // 업로드 후 폼 초기화 — 같은 파일 중복 업로드 방지.
      setVideoFile(null)
      setTitle('')
      setDescription('')
      setTags([...defaultTags])
      setTranslations({})
      setShowUploadModal(false)
    } catch (err) {
      console.error('[MetadataLocalizationTool] Failed to upload YouTube video', err)
      addToast({
        type: 'error',
        title: t('features.metadata.components.metadataLocalizationTool.youTubeUploadFailed'),
        message: t('features.metadata.components.metadataLocalizationTool.couldNotCompleteTheYouTubeUploadCheckThe'),
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
              : 'text-surface-600 hover:text-surface-800 dark:text-surface-300 dark:hover:text-surface-100',
          )}
        >
          <FileVideo className="h-4 w-4" />
          {t('features.metadata.components.metadataLocalizationTool.uploadAndLocalizeNewVideo')}
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
              : 'text-surface-600 hover:text-surface-800 dark:text-surface-300 dark:hover:text-surface-100',
          )}
        >
          <RefreshCw className="h-4 w-4" />
          {t('features.metadata.components.metadataLocalizationTool.useExistingVideo')}
        </button>
      </div>

      {mode === 'existing' ? (
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>{t('features.metadata.components.metadataLocalizationTool.selectAYouTubeVideo')}</CardTitle>
              <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                {t('features.metadata.components.metadataLocalizationTool.loadTheTitleDescriptionAndExistingTranslationsFor')}
              </p>
            </div>
            {loadingVideos && <Loader2 className="h-5 w-5 animate-spin text-surface-500 dark:text-surface-300" />}
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('features.metadata.components.metadataLocalizationTool.searchByVideoTitle')}
                  className="h-10 w-full rounded-lg border border-surface-300 bg-white pl-9 pr-3 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                />
              </div>
              <Select
                label={t('features.metadata.components.metadataLocalizationTool.targetVideo')}
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
                  { value: '', label: loadingVideos ? t('features.metadata.components.metadataLocalizationTool.loading') : t('features.metadata.components.metadataLocalizationTool.selectAVideo') },
                  ...filteredVideos.map((video) => ({
                    value: video.videoId,
                    label: `${video.title} (${video.privacyStatus})`,
                  })),
                ]}
              />
              {videosError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('features.metadata.components.metadataLocalizationTool.couldNotLoadYouTubeVideosPleaseTryAgain')}
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
                {t('features.metadata.components.metadataLocalizationTool.load')}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-5">
            <CardTitle>{t('features.metadata.components.metadataLocalizationTool.selectAVideoFile')}</CardTitle>
            <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
              {t('features.metadata.components.metadataLocalizationTool.selectAVideoFileToUploadMultilingualTitles')}
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
                <span className="text-xs text-surface-500 dark:text-surface-300">
                  {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
                  {t('features.metadata.components.metadataLocalizationTool.selectAVideoFile2')}
                </span>
                <span className="text-xs text-surface-500 dark:text-surface-300">
                  {t('features.metadata.components.metadataLocalizationTool.videoFormatsSupportedByYouTubeSuchAsMp4')}
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
          <p className="mt-3 text-xs text-surface-500 dark:text-surface-300">
            {t('features.metadata.components.metadataLocalizationTool.videosAreUploadedAsPrivateByDefaultReview')}
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
            <CardTitle>{t('features.metadata.components.metadataLocalizationTool.titleAndDescriptionTranslation')}</CardTitle>
            <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
              {mode === 'new'
                ? t('features.metadata.components.metadataLocalizationTool.generateTranslatedTitlesAndDescriptionsForUpload')
                : t('features.metadata.components.metadataLocalizationTool.generateTranslationsForYouTubeMultilingualTitlesAndDescriptions')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label={t('features.metadata.components.metadataLocalizationTool.sourceLanguage')}
            value={sourceLang}
            onChange={(event) => {
              const nextSourceLang = event.target.value
              setSourceLang(nextSourceLang)
              setTargetLangs(buildInitialTargets(metadataTargetPreset, nextSourceLang, existingLocalizationLangs))
            }}
            options={languageOptions}
          />
          <Select
            label={t('features.metadata.components.metadataLocalizationTool.recommendedLanguageSet')}
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
            label={t('features.metadata.components.metadataLocalizationTool.sourceTitle')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('features.metadata.components.metadataLocalizationTool.youTubeTitle')}
          />
          <div>
            <label htmlFor="metadata-source-description" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              {t('features.metadata.components.metadataLocalizationTool.sourceDescription')}
            </label>
            <textarea
              id="metadata-source-description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('features.metadata.components.metadataLocalizationTool.youTubeDescription')}
              className="w-full resize-none rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-500 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-400"
            />
          </div>
          {mode === 'new' && (
            <div>
              <Input
                label={t('features.metadata.components.metadataLocalizationTool.tags')}
                value={tags.join(', ')}
                onChange={(event) => {
                  const parsed = event.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                  setTags(parsed)
                }}
                placeholder={t('features.metadata.components.metadataLocalizationTool.commaSeparatedEGGamingVlog')}
              />
              <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-300">
                {t('features.metadata.components.metadataLocalizationTool.defaultTagsAreAppliedChangeThemForThis')}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
                {t(selectedPreset.labelKey)}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-300">
                {t(selectedPreset.descriptionKey)}
              </p>
            </div>
            <Badge variant="brand">{t('features.metadata.components.metadataLocalizationTool.valueSelected', { targetLangsLength: targetLangs.length })}</Badge>
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
                  title={alreadyTranslated ? t('features.metadata.components.metadataLocalizationTool.alreadyTranslated') : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition',
                    selected
                      ? 'bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800'
                      : alreadyTranslated
                        ? 'bg-surface-100 text-surface-600 ring-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700'
                        : 'bg-white text-surface-600 ring-surface-200 hover:bg-surface-50 dark:bg-surface-900 dark:text-surface-300 dark:ring-surface-700 dark:hover:bg-surface-800',
                    disabled && 'cursor-not-allowed',
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {alreadyTranslated && <Check className="h-3 w-3 text-surface-500 dark:text-surface-300" />}
                  {language.flag} {isEnglish ? language.name : language.nativeName}
                </button>
              )
            })}
          </div>
          {mode === 'existing' && existingLocalizationLangs.size > 0 && (
            <p className="mt-2 text-xs text-surface-500 dark:text-surface-300">
              {t('features.metadata.components.metadataLocalizationTool.valueExistingTranslationsCannotBeSelected', { existingLocalizationLangsSize: existingLocalizationLangs.size })}
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
              {t('features.metadata.components.metadataLocalizationTool.generateTranslations')}
            </Button>
          ) : mode === 'existing' ? (
            <Button
              onClick={handleApply}
              loading={saving}
              disabled={!canApply || saving}
            >
              <Upload className="h-4 w-4" />
              {t('features.metadata.components.metadataLocalizationTool.applyToYouTube')}
            </Button>
          ) : (
            <Button
              onClick={openUploadModal}
              disabled={!canUpload || uploading}
            >
              <Upload className="h-4 w-4" />
              {t('features.metadata.components.metadataLocalizationTool.uploadToYouTube')}
            </Button>
          )}
        </div>
      </Card>
      )}

      {Object.keys(translations).length > 0 && (
        <Card>
          <div className="mb-5">
            <CardTitle>{t('features.metadata.components.metadataLocalizationTool.reviewTranslations')}</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {t('features.metadata.components.metadataLocalizationTool.editTitlesAndDescriptionsBeforeApplyingThem')}
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
                    <span className="text-xs text-surface-500 dark:text-surface-400">{toBcp47(code)}</span>
                    {isPreExisting && (
                      <Badge variant="default">{t('features.metadata.components.metadataLocalizationTool.existingYouTubeTranslation')}</Badge>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      label={t('features.metadata.components.metadataLocalizationTool.title')}
                      value={value.title}
                      onChange={(event) => updateTranslation(code, { title: event.target.value })}
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                        {t('features.metadata.components.metadataLocalizationTool.description')}
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
          title={t('features.metadata.components.metadataLocalizationTool.reviewYouTubeUploadSettings')}
          size="lg"
        >
          <div className="space-y-5">
            <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{t('features.metadata.components.metadataLocalizationTool.channel')}</p>
              <p className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                {channel
                  ? t('features.metadata.components.metadataLocalizationTool.valueValueSubscribers', { channelTitle: channel.title, channelSubscriberCountToLocaleStringKoKR: channel.subscriberCount.toLocaleString('ko-KR'), channelSubscriberCountToLocaleStringEnUS: channel.subscriberCount.toLocaleString('en-US') })
                  : t('features.metadata.components.metadataLocalizationTool.noConnectedChannelInformation')}
              </p>
            </div>

            <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{t('features.metadata.components.metadataLocalizationTool.targetLanguagesValue', { ObjectKeysTranslationsLength: Object.keys(translations).length })}</p>
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
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{t('features.metadata.components.metadataLocalizationTool.tags2')}</p>
              <p className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                {tags.length > 0 ? tags.join(', ') : <span className="text-surface-500 dark:text-surface-400">{t('features.metadata.components.metadataLocalizationTool.none')}</span>}
              </p>
            </div>

            <Select
              label={t('features.metadata.components.metadataLocalizationTool.visibility')}
              value={uploadPrivacy}
              onChange={(e) => setUploadPrivacy(e.target.value as PrivacyStatus)}
              options={[
                { value: 'private', label: t('features.metadata.components.metadataLocalizationTool.private2') },
                { value: 'unlisted', label: t('features.metadata.components.metadataLocalizationTool.unlisted2') },
                { value: 'public', label: t('features.metadata.components.metadataLocalizationTool.public2') },
              ]}
            />
            <p className="-mt-3 text-xs text-surface-500 dark:text-surface-300">
              {t('features.metadata.components.metadataLocalizationTool.theDefaultIsAppliedChangeItForThis')}
            </p>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-white">{t('features.metadata.components.metadataLocalizationTool.madeForKids')}</p>
                <p className="text-xs leading-5 text-surface-500 dark:text-surface-400">{t('features.metadata.components.metadataLocalizationTool.setThisAccordingToYouTubeMadeForKids')}</p>
              </div>
              <Toggle checked={uploadMadeForKids} onChange={setUploadMadeForKids} />
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <input
                type="checkbox"
                checked={uploadConfirmed}
                onChange={(e) => setUploadConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-surface-300 text-brand-600 focus-ring"
              />
              <span className="text-sm leading-6 text-surface-700 dark:text-surface-300">
                {t('features.metadata.components.metadataLocalizationTool.iReviewedTheSettingsAndWantToUpload')}
              </span>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={closeUploadModal} disabled={uploading}>
              {t('features.metadata.components.metadataLocalizationTool.cancel')}
            </Button>
            <Button
              onClick={handleUploadNew}
              loading={uploading}
              disabled={!uploadConfirmed || uploading}
            >
              <Upload className="h-4 w-4" />
              {t('features.metadata.components.metadataLocalizationTool.uploadWithTheseSettings')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
