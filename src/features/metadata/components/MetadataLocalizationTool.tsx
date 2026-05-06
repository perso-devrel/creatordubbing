'use client'

import { useMemo, useState } from 'react'
import { Check, Languages, Loader2, RefreshCw, Search, Send, Upload } from 'lucide-react'
import { Badge, Button, Card, CardTitle, Input, Select } from '@/components/ui'
import { useMyVideos } from '@/hooks/useYouTubeData'
import { translateMetadata } from '@/lib/api-client/translate'
import {
  ytFetchVideoMetadata,
  ytUpdateVideoLocalizations,
} from '@/lib/api-client/youtube'
import type { MetadataTranslation } from '@/lib/api-client/translate'
import { getMarketLanguagePreset, MARKET_LANGUAGE_PRESETS } from '@/lib/i18n/config'
import { useI18nStore } from '@/stores/i18nStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import { SUPPORTED_LANGUAGES, fromBcp47, getLanguageByCode, toBcp47 } from '@/utils/languages'
import { cn } from '@/utils/cn'

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((language) => ({
  value: language.code,
  label: `${language.flag} ${language.name} (${language.nativeName})`,
}))

const PRESET_OPTIONS = MARKET_LANGUAGE_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.labelKo,
}))

function buildInitialTargets(presetId: string, sourceLang: string) {
  return getMarketLanguagePreset(presetId).languageCodes.filter((code) => code !== sourceLang)
}

export function MetadataLocalizationTool() {
  const addToast = useNotificationStore((state) => state.addToast)
  const { metadataTargetPreset, setMetadataTargetPreset } = useI18nStore()
  const { defaultLanguage } = useYouTubeSettingsStore()
  const { data: videos = [], isLoading: loadingVideos } = useMyVideos(50)

  const [videoId, setVideoId] = useState('')
  const [sourceLang, setSourceLang] = useState(defaultLanguage)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetLangs, setTargetLangs] = useState<string[]>(
    () => buildInitialTargets(metadataTargetPreset, defaultLanguage),
  )
  const [translations, setTranslations] = useState<Record<string, MetadataTranslation>>({})
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return videos
    return videos.filter((video) => video.title.toLowerCase().includes(q))
  }, [query, videos])

  const selectedPreset = getMarketLanguagePreset(metadataTargetPreset)
  const targetSet = new Set(targetLangs)
  const canTranslate = title.trim().length > 0 && targetLangs.length > 0
  const canApply = videoId && title.trim().length > 0 && Object.keys(translations).length > 0

  const handleLoadMetadata = async () => {
    if (!videoId) return
    setLoadingMetadata(true)
    try {
      const metadata = await ytFetchVideoMetadata(videoId)
      setTitle(metadata.title)
      setDescription(metadata.description)
      const nextSourceLang = fromBcp47(metadata.defaultLanguage || defaultLanguage)
      setSourceLang(nextSourceLang)
      setTargetLangs(buildInitialTargets(metadataTargetPreset, nextSourceLang))
      setTranslations(metadata.localizations)
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

  const toggleTarget = (code: string) => {
    if (code === sourceLang) return
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
      <Card>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <CardTitle>YouTube 영상 선택</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              내 채널 영상의 현재 제목·설명을 불러와 번역본만 추가합니다.
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
                if (selected && !title) setTitle(selected.title)
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

      <Card>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>제목·설명 번역</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              더빙이나 자막 생성 없이 YouTube localizations에 들어갈 번역만 생성합니다.
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
              setTargetLangs(buildInitialTargets(metadataTargetPreset, nextSourceLang))
            }}
            options={LANGUAGE_OPTIONS}
          />
          <Select
            label="추천 시장"
            value={metadataTargetPreset}
            onChange={(event) => {
              const nextPreset = event.target.value
              setMetadataTargetPreset(nextPreset)
              setTargetLangs(buildInitialTargets(nextPreset, sourceLang))
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
              const disabled = language.code === sourceLang
              return (
                <button
                  key={language.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleTarget(language.code)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition',
                    selected
                      ? 'bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800'
                      : 'bg-white text-surface-600 ring-surface-200 hover:bg-surface-50 dark:bg-surface-900 dark:text-surface-300 dark:ring-surface-700 dark:hover:bg-surface-800',
                    disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {language.flag} {language.name}
                </button>
              )
            })}
          </div>
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
          <Button
            onClick={handleApply}
            loading={saving}
            disabled={!canApply || saving}
          >
            <Upload className="h-4 w-4" />
            YouTube에 적용
          </Button>
        </div>
      </Card>

      {Object.keys(translations).length > 0 && (
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>번역 검토</CardTitle>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                적용 전에 언어별 제목과 설명을 직접 수정할 수 있습니다.
              </p>
            </div>
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
          </div>

          <div className="space-y-4">
            {Object.entries(translations).map(([code, value]) => {
              const language = getLanguageByCode(code) ?? getLanguageByCode(code.split('-')[0])
              return (
                <div key={code} className="rounded-lg border border-surface-200 p-4 dark:border-surface-800">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-lg">{language?.flag}</span>
                    <span className="font-medium text-surface-900 dark:text-white">
                      {language?.name ?? code}
                    </span>
                    <span className="text-xs text-surface-400">{toBcp47(code)}</span>
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
