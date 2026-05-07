'use client'

import { useMemo, useState } from 'react'
import { Check, FileVideo, Languages, Loader2, RefreshCw, Search, Send, Upload } from 'lucide-react'
import { Badge, Button, Card, CardTitle, Input, Select } from '@/components/ui'
import { useMyVideos } from '@/hooks/useYouTubeData'
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
import { SUPPORTED_LANGUAGES, fromBcp47, getLanguageByCode, toBcp47 } from '@/utils/languages'
import { cn } from '@/utils/cn'

type Mode = 'new' | 'existing'

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((language) => ({
  value: language.code,
  label: `${language.flag} ${language.name} (${language.nativeName})`,
}))

const PRESET_OPTIONS = MARKET_LANGUAGE_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.labelKo,
}))

function buildInitialTargets(presetId: string, sourceLang: string, exclude: Set<string> = new Set()) {
  return getMarketLanguagePreset(presetId)
    .languageCodes
    .filter((code) => code !== sourceLang && !exclude.has(code))
}

export function MetadataLocalizationTool() {
  const addToast = useNotificationStore((state) => state.addToast)
  const { metadataTargetPreset, setMetadataTargetPreset } = useI18nStore()
  const { defaultLanguage } = useYouTubeSettingsStore()
  const { data: videos = [], isLoading: loadingVideos } = useMyVideos(50)

  const [mode, setMode] = useState<Mode>('existing')
  const [videoId, setVideoId] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  /** 내 영상 모드에서 "불러오기"가 한 번이라도 성공했는지 — 하단 번역 카드 노출 게이트. */
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [sourceLang, setSourceLang] = useState(defaultLanguage)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
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

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setVideoId('')
    setVideoFile(null)
    setTitle('')
    setDescription('')
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
          title: '원문 언어가 YouTube에 설정되어 있지 않습니다',
          message: `사용자 기본 언어(${nextSourceLang})로 설정했습니다. 실제와 다르면 위 "원문 언어" 드롭다운에서 변경하세요.`,
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

      addToast({ type: 'success', title: 'YouTube 메타데이터를 불러왔습니다' })
    } catch (err) {
      addToast({
        type: 'error',
        title: '메타데이터 불러오기 실패',
        message: err instanceof Error ? err.message : '알 수 없는 오류',
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
      addToast({ type: 'success', title: '제목·설명 번역이 생성되었습니다' })
    } catch (err) {
      addToast({
        type: 'error',
        title: '번역 생성 실패',
        message: err instanceof Error ? err.message : '알 수 없는 오류',
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
      addToast({ type: 'success', title: 'YouTube 제목·설명 번역을 적용했습니다' })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'YouTube 적용 실패',
        message: err instanceof Error ? err.message : '알 수 없는 오류',
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
      const result = await ytUploadVideo({
        video: videoFile,
        title: title.trim(),
        description,
        tags: [],
        privacyStatus: 'private',
        language: toBcp47(sourceLang),
        localizations,
      })
      addToast({
        type: 'success',
        title: 'YouTube 업로드 완료',
        message: `videoId: ${result.videoId} (비공개로 업로드되었습니다)`,
      })
      // 업로드 후 폼 초기화 — 같은 파일 중복 업로드 방지.
      setVideoFile(null)
      setTitle('')
      setDescription('')
      setTranslations({})
    } catch (err) {
      addToast({
        type: 'error',
        title: 'YouTube 업로드 실패',
        message: err instanceof Error ? err.message : '알 수 없는 오류',
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
          새 영상 업로드
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
          내 영상 업로드
        </button>
      </div>

      {mode === 'existing' ? (
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>YouTube 영상 선택</CardTitle>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                내 채널 영상의 현재 제목·설명과 기존 다국어 번역을 불러옵니다. 이미 번역된 언어는 picker에서 비활성화됩니다.
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
                  placeholder="영상 제목으로 검색"
                  className="h-10 w-full rounded-lg border border-surface-300 bg-white pl-9 pr-3 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                />
              </div>
              <Select
                label="대상 영상"
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
                  { value: '', label: loadingVideos ? '불러오는 중...' : '영상을 선택하세요' },
                  ...filteredVideos.map((video) => ({
                    value: video.videoId,
                    label: `${video.title} (${video.privacyStatus})`,
                  })),
                ]}
              />
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
                불러오기
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-5">
            <CardTitle>영상 파일 선택</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              YouTube에 새로 올릴 영상 파일을 선택하세요. 번역 후 업로드 시 다국어 메타데이터가 함께 적용됩니다.
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
                  영상 파일을 선택하세요
                </span>
                <span className="text-xs text-surface-500">
                  mp4, mov, webm 등 YouTube가 지원하는 영상 포맷
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
            업로드 시 비공개(private)로 올라갑니다. 검토 후 YouTube Studio에서 공개 전환하세요.
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
            <CardTitle>제목·설명 번역</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {mode === 'new'
                ? 'YouTube에 업로드 시 함께 적용될 다국어 제목/설명을 생성합니다.'
                : '더빙이나 자막 생성 없이 YouTube localizations에 들어갈 번역만 생성합니다.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="원문 언어"
            value={sourceLang}
            onChange={(event) => {
              const nextSourceLang = event.target.value
              setSourceLang(nextSourceLang)
              setTargetLangs(buildInitialTargets(metadataTargetPreset, nextSourceLang, existingLocalizationLangs))
            }}
            options={LANGUAGE_OPTIONS}
          />
          <Select
            label="추천 시장"
            value={metadataTargetPreset}
            onChange={(event) => {
              const nextPreset = event.target.value
              setMetadataTargetPreset(nextPreset)
              setTargetLangs(buildInitialTargets(nextPreset, sourceLang, existingLocalizationLangs))
            }}
            options={PRESET_OPTIONS}
          />
        </div>

        <div className="mt-4 space-y-4">
          <Input
            label="원문 제목"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="YouTube 제목"
          />
          <div>
            <label htmlFor="metadata-source-description" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              원문 설명
            </label>
            <textarea
              id="metadata-source-description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="YouTube 설명"
              className="w-full resize-none rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
                {selectedPreset.labelKo}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {selectedPreset.descriptionKo}
              </p>
            </div>
            <Badge variant="brand">{targetLangs.length}개 선택</Badge>
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
                  title={alreadyTranslated ? '이미 번역되어 있는 언어' : undefined}
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
                  {language.flag} {language.name}
                </button>
              )
            })}
          </div>
          {mode === 'existing' && existingLocalizationLangs.size > 0 && (
            <p className="mt-2 text-xs text-surface-500">
              회색 표시 언어 ({existingLocalizationLangs.size}개)는 이미 번역되어 있습니다.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleTranslate}
            loading={translating}
            disabled={!canTranslate || translating}
          >
            <Languages className="h-4 w-4" />
            번역 생성
          </Button>
          {mode === 'existing' ? (
            <Button
              onClick={handleApply}
              loading={saving}
              disabled={!canApply || saving}
            >
              <Upload className="h-4 w-4" />
              YouTube에 적용
            </Button>
          ) : (
            <Button
              onClick={handleUploadNew}
              loading={uploading}
              disabled={!canUpload || uploading}
            >
              <Upload className="h-4 w-4" />
              YouTube에 업로드
            </Button>
          )}
        </div>
      </Card>
      )}

      {Object.keys(translations).length > 0 && (
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>번역 검토</CardTitle>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                적용 전에 언어별 제목과 설명을 직접 수정할 수 있습니다.
              </p>
            </div>
            {mode === 'existing' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApply}
                loading={saving}
                disabled={!canApply || saving}
              >
                <Send className="h-4 w-4" />
                적용
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadNew}
                loading={uploading}
                disabled={!canUpload || uploading}
              >
                <Send className="h-4 w-4" />
                업로드
              </Button>
            )}
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
                      {language?.name ?? code}
                    </span>
                    <span className="text-xs text-surface-400">{toBcp47(code)}</span>
                    {isPreExisting && (
                      <Badge variant="default">YouTube 기존 번역</Badge>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="제목"
                      value={value.title}
                      onChange={(event) => updateTranslation(code, { title: event.target.value })}
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                        설명
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
    </div>
  )
}
