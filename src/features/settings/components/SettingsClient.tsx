'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Globe, Globe2, Languages, Loader2, Save, Settings, Unlink, Video } from 'lucide-react'
import { Card, CardTitle, Select, Button, Badge, Input, Modal } from '@/components/ui'
import {
  APP_LOCALE_LABELS,
  APP_LOCALES,
  CUSTOM_METADATA_TARGET_PRESET,
  getMarketLanguagePreset,
  getMetadataTargetLanguageCodes,
  MARKET_LANGUAGE_PRESETS,
  normalizeMetadataTargetLanguages,
  type AppLocale,
} from '@/lib/i18n/config'
import { useI18nStore } from '@/stores/i18nStore'
import { useThemeStore, type ThemePreference } from '@/stores/themeStore'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '@/utils/languages'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { useLocaleRouter } from '@/hooks/useLocalePath'
import { useChannelStats } from '@/hooks/useYouTubeData'
import { formatNumber } from '@/utils/formatters'
import { signInWithGoogle } from '@/lib/google-auth'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import type { PrivacyStatus } from '@/features/dubbing/types/dubbing.types'
import { saveUserPreferences } from '@/lib/api-client/user-preferences'

const APP_LOCALE_OPTIONS = APP_LOCALES.map((locale) => ({
  value: locale,
  label: `${APP_LOCALE_LABELS[locale].nativeLabel} / ${APP_LOCALE_LABELS[locale].label}`,
}))

function formatTags(tags: readonly string[]) {
  return tags.join(', ')
}

function parseTagsInput(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function sameLanguageSet(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  return a.every((code) => bSet.has(code))
}

function orderLanguageCodes(codes: readonly string[]) {
  const selected = new Set(codes)
  return SUPPORTED_LANGUAGES
    .filter((language) => selected.has(language.code))
    .map((language) => language.code)
}

function resolvePresetForLanguageSet(languageCodes: readonly string[]) {
  return MARKET_LANGUAGE_PRESETS.find((preset) => sameLanguageSet(preset.languageCodes, languageCodes))
}

export function SettingsClient() {
  const t = useLocaleText()
  const {
    metadataTargetPreset,
    metadataTargetLanguages,
    setAppLocale,
    setMetadataTargetPreset,
    setMetadataTargetLanguages,
  } = useI18nStore()
  const { preference: themePreference, setPreference: setThemePreference } = useThemeStore()
  const appLocale = useAppLocale()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const addToast = useNotificationStore((state) => state.addToast)
  const {
    defaultPrivacy,
    defaultLanguage,
    defaultTags,
    setDefaultPrivacy,
    setDefaultLanguage,
    setDefaultTags,
  } = useYouTubeSettingsStore()
  const localeRouter = useLocaleRouter()
  const isEnglish = appLocale === 'en'
  const languageOptions = SUPPORTED_LANGUAGES.map((language) => ({
    value: language.code,
    label: isEnglish
      ? `${language.flag} ${language.name} (${language.nativeName})`
      : `${language.flag} ${language.nativeName} (${language.name})`,
  }))
  const [draftAppLocale, setDraftAppLocale] = useState<AppLocale>(appLocale)
  const [draftDefaultPrivacy, setDraftDefaultPrivacy] = useState<PrivacyStatus>(defaultPrivacy)
  const [draftDefaultLanguage, setDraftDefaultLanguage] = useState(defaultLanguage)
  const [draftMetadataTargetPreset, setDraftMetadataTargetPreset] = useState(metadataTargetPreset)
  const [draftMetadataTargetLanguages, setDraftMetadataTargetLanguages] = useState<string[]>(
    () => getMetadataTargetLanguageCodes(metadataTargetPreset, metadataTargetLanguages),
  )
  const [defaultTagsInput, setDefaultTagsInput] = useState(() => formatTags(defaultTags))
  const [languageModalOpen, setLanguageModalOpen] = useState(false)
  const [modalLanguageCodes, setModalLanguageCodes] = useState<string[]>(
    () => getMetadataTargetLanguageCodes(metadataTargetPreset, metadataTargetLanguages),
  )
  const youtubeSectionRef = useRef<HTMLDivElement>(null)

  const draftTags = useMemo(() => parseTagsInput(defaultTagsInput), [defaultTagsInput])
  const targetLanguageCodes = useMemo(
    () => getMetadataTargetLanguageCodes(draftMetadataTargetPreset, draftMetadataTargetLanguages),
    [draftMetadataTargetLanguages, draftMetadataTargetPreset],
  )
  const selectedPreset = getMarketLanguagePreset(draftMetadataTargetPreset)
  const presetLanguages = targetLanguageCodes.map((code) => getLanguageByCode(code)).filter(Boolean)
  const persistedPreferenceSnapshot = useMemo(() => ({
    appLocale,
    metadataTargetPreset,
    metadataTargetLanguages: getMetadataTargetLanguageCodes(metadataTargetPreset, metadataTargetLanguages),
    defaultPrivacy,
    defaultLanguage,
    defaultTags,
  }), [appLocale, defaultLanguage, defaultPrivacy, defaultTags, metadataTargetLanguages, metadataTargetPreset])
  const draftPreferenceSnapshot = useMemo(() => ({
    appLocale: draftAppLocale,
    metadataTargetPreset: draftMetadataTargetPreset,
    metadataTargetLanguages: targetLanguageCodes,
    defaultPrivacy: draftDefaultPrivacy,
    defaultLanguage: draftDefaultLanguage,
    defaultTags: draftTags,
  }), [
    draftAppLocale,
    draftDefaultLanguage,
    draftDefaultPrivacy,
    draftMetadataTargetPreset,
    draftTags,
    targetLanguageCodes,
  ])
  const hasPendingPreferenceChanges = JSON.stringify(persistedPreferenceSnapshot) !== JSON.stringify(draftPreferenceSnapshot)
  const selectedModalPresetId = resolvePresetForLanguageSet(modalLanguageCodes)?.id ?? null

  const saveMutation = useMutation({ mutationFn: saveUserPreferences })

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('section') !== 'youtube') return
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        youtubeSectionRef.current?.scrollIntoView({ block: 'start' })
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDraftAppLocale(appLocale)
      setDraftDefaultPrivacy(defaultPrivacy)
      setDraftDefaultLanguage(defaultLanguage)
      setDraftMetadataTargetPreset(metadataTargetPreset)
      setDraftMetadataTargetLanguages(getMetadataTargetLanguageCodes(metadataTargetPreset, metadataTargetLanguages))
      setDefaultTagsInput(formatTags(defaultTags))
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [appLocale, defaultLanguage, defaultPrivacy, defaultTags, metadataTargetLanguages, metadataTargetPreset])

  const openLaunchLanguageModal = () => {
    setModalLanguageCodes(targetLanguageCodes)
    setLanguageModalOpen(true)
  }

  const toggleModalLanguage = (code: string) => {
    setModalLanguageCodes((current) => {
      if (current.includes(code)) {
        if (current.length <= 1) return current
        return current.filter((item) => item !== code)
      }
      return orderLanguageCodes([...current, code])
    })
  }

  const applyLanguagePreset = (languageCodes: readonly string[]) => {
    setModalLanguageCodes(orderLanguageCodes(languageCodes))
  }

  const applyLaunchLanguages = () => {
    const normalized = normalizeMetadataTargetLanguages(modalLanguageCodes)
    const matchedPreset = resolvePresetForLanguageSet(normalized)
    setDraftMetadataTargetLanguages(normalized)
    setDraftMetadataTargetPreset(matchedPreset?.id ?? CUSTOM_METADATA_TARGET_PRESET)
    setLanguageModalOpen(false)
  }

  const savePreferences = async () => {
    try {
      const saved = await saveMutation.mutateAsync(draftPreferenceSnapshot)
      queryClient.setQueryData(['user-preferences', user?.uid ?? null], saved)
      setDefaultPrivacy(saved.defaultPrivacy)
      setDefaultLanguage(saved.defaultLanguage)
      setDefaultTags(saved.defaultTags)
      setAppLocale(saved.appLocale)
      setMetadataTargetPreset(saved.metadataTargetPreset)
      setMetadataTargetLanguages(saved.metadataTargetLanguages)
      setDefaultTagsInput(formatTags(saved.defaultTags))
      addToast({ type: 'success', title: t('settings.preferences.saved') })
      if (saved.appLocale !== appLocale) {
        localeRouter.replaceLocale(saved.appLocale)
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: t('settings.preferences.saveFailed'),
        message: error instanceof Error ? error.message : t('common.unknownError'),
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{t('settings.languageDefaults.title')}</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {t('settings.languageDefaults.description')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label={t('settings.appLocale')}
            value={draftAppLocale}
            onChange={(event) => {
              const nextLocale = event.target.value as AppLocale
              setDraftAppLocale(nextLocale)
            }}
            options={APP_LOCALE_OPTIONS}
          />
          <Select
            label={t('settings.themeMode')}
            value={themePreference}
            onChange={(event) => setThemePreference(event.target.value as ThemePreference)}
            options={[
              { value: 'system', label: t('settings.themeMode.system') },
              { value: 'light', label: t('settings.themeMode.light') },
              { value: 'dark', label: t('settings.themeMode.dark') },
            ]}
          />
          <Select
            label={t('settings.metadataLanguage')}
            value={draftDefaultLanguage}
            onChange={(event) => setDraftDefaultLanguage(event.target.value)}
            options={languageOptions}
          />
          <Select
            label={t('app.app.youtube.page.defaultVisibility')}
            value={draftDefaultPrivacy}
            onChange={(event) => setDraftDefaultPrivacy(event.target.value as PrivacyStatus)}
            options={[
              { value: 'public', label: t('app.app.youtube.page.public') },
              { value: 'unlisted', label: t('app.app.youtube.page.unlisted') },
              { value: 'private', label: t('app.app.youtube.page.private') },
            ]}
          />
          <Input
            label={t('app.app.youtube.page.defaultTags')}
            value={defaultTagsInput}
            onChange={(event) => setDefaultTagsInput(event.target.value)}
            placeholder={t('app.app.youtube.page.commaSeparatedEGDubtubeAIDubbingVlog')}
          />
          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                {t('settings.launchLanguageSelection')}
              </label>
              <Button type="button" variant="outline" size="sm" onClick={openLaunchLanguageModal}>
                <Languages className="h-4 w-4" />
                {t('settings.launchLanguageSelection.edit')}
              </Button>
            </div>
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-850">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {t(selectedPreset.labelKey)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-surface-600 dark:text-surface-300">
                    {t('settings.launchLanguageSelection.selectedCount', { count: targetLanguageCodes.length })}
                  </p>
                </div>
                <Badge variant="brand">{t(selectedPreset.labelKey)}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {presetLanguages.map((language) => language && (
                  <span
                    key={language.code}
                    className="max-w-full rounded-full bg-white px-2.5 py-1 text-xs font-medium text-surface-700 ring-1 ring-surface-200 dark:bg-surface-900 dark:text-surface-200 dark:ring-surface-700"
                  >
                    {language.flag} {isEnglish ? language.name : language.nativeName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {hasPendingPreferenceChanges && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-500/60 dark:bg-surface-850 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-brand-800 dark:text-surface-100">
              {t('settings.preferences.unsavedChanges')}
            </p>
            <Button onClick={savePreferences} loading={saveMutation.isPending} className="w-full sm:w-auto">
              <Save className="h-4 w-4" />
              {t('settings.preferences.saveChanges')}
            </Button>
          </div>
        )}
      </Card>

      <Modal
        open={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
        title={t('settings.launchLanguages.modalTitle')}
        size="xl"
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-surface-800 dark:text-surface-100">
              {t('settings.launchLanguages.presets')}
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              {MARKET_LANGUAGE_PRESETS.map((preset) => {
                const active = selectedModalPresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyLanguagePreset(preset.languageCodes)}
                    className={`rounded-lg border p-3 text-left transition focus-ring ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-900 dark:border-brand-400 dark:bg-surface-800 dark:text-surface-50'
                        : 'border-surface-200 bg-white text-surface-800 hover:bg-surface-50 dark:border-surface-600 dark:bg-surface-850 dark:text-surface-100 dark:hover:bg-surface-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{t(preset.labelKey)}</span>
                      {active && <Check className="h-4 w-4" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-surface-600 dark:text-surface-300">
                      {t(preset.descriptionKey)}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
                {t('settings.launchLanguages.allLanguages')}
              </p>
              <Badge variant="brand">
                {t('settings.launchLanguageSelection.selectedCount', { count: modalLanguageCodes.length })}
              </Badge>
            </div>
            <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {SUPPORTED_LANGUAGES.map((language) => {
                const selected = modalLanguageCodes.includes(language.code)
                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => toggleModalLanguage(language.code)}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition focus-ring ${
                      selected
                        ? 'border-brand-400 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-surface-800 dark:text-surface-50'
                        : 'border-surface-200 bg-white text-surface-700 hover:bg-surface-50 dark:border-surface-600 dark:bg-surface-850 dark:text-surface-200 dark:hover:bg-surface-800'
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      {language.flag} {isEnglish ? `${language.name} (${language.nativeName})` : `${language.nativeName} (${language.name})`}
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setLanguageModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={applyLaunchLanguages}>
              <Check className="h-4 w-4" />
              {t('settings.launchLanguages.applySelection')}
            </Button>
          </div>
        </div>
      </Modal>

      <div ref={youtubeSectionRef} id="youtube-settings" className="scroll-mt-20">
        <YouTubeConnectionCard />
      </div>
    </div>
  )
}

function YouTubeConnectionCard() {
  const t = useLocaleText()
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const addToast = useNotificationStore((state) => state.addToast)
  const { data: channel, isLoading: channelLoading, error: channelError } = useChannelStats()
  const missingYouTubeConnection =
    channelError instanceof Error &&
    (channelError.message.includes(t('internal.keyword.youtubeConnection')) || channelError.message.includes('Google access token'))
  const isConnected = !!channel && !missingYouTubeConnection

  const handleReconnect = async () => {
    setConnecting(true)
    try {
      const { user } = await signInWithGoogle({ forceConsent: true, scopeMode: 'youtube-write' })
      useAuthStore.getState().setUser(user)
      window.location.reload()
    } catch {
      addToast({
        type: 'error',
        title: t('app.app.youtube.page.couldNotConnectYouTube'),
        message: t('app.app.youtube.page.pleaseAllowPopUpsAndTryAgain'),
      })
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/auth/disconnect-youtube', { method: 'POST' })
      if (!res.ok) throw new Error('disconnect failed')
      window.location.reload()
    } catch {
      addToast({
        type: 'error',
        title: t('app.app.youtube.page.couldNotDisconnect'),
        message: t('app.app.youtube.page.pleaseTryAgainShortly'),
      })
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5 text-surface-400" />
        <CardTitle>{t('app.app.youtube.page.connectedChannel')}</CardTitle>
      </div>

      {channelLoading ? (
        <div className="mt-4 flex items-center gap-2 text-surface-500 dark:text-surface-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('app.app.youtube.page.loadingChannelInformation')}</span>
        </div>
      ) : channelError && !missingYouTubeConnection ? (
        <div className="mt-4 flex flex-col items-center gap-3 py-8">
          <Video className="h-12 w-12 text-surface-300" />
          <p className="text-sm text-red-500">
            {channelError instanceof Error ? channelError.message : t('app.app.youtube.page.couldNotLoadYouTubeChannelInformation')}
          </p>
        </div>
      ) : isConnected ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {channel.thumbnail ? (
              <Image
                src={channel.thumbnail}
                alt={channel.title}
                width={48}
                height={48}
                className="rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                {channel.title[0]?.toUpperCase() || 'Y'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-surface-900 dark:text-white">{channel.title}</p>
              <p className="text-sm text-surface-500 dark:text-surface-300">
                {t('app.app.youtube.page.valueSubscribersValueVideos', {
                  formatNumberChannelSubscriberCount: formatNumber(channel.subscriberCount),
                  formatNumberChannelVideoCount: formatNumber(channel.videoCount),
                })}
              </p>
            </div>
            <Badge variant="success">{t('app.app.youtube.page.connected')}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleDisconnect} loading={disconnecting} className="w-full sm:w-auto">
            <Unlink className="h-4 w-4" />
            {t('app.app.youtube.page.disconnectYouTube')}
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 py-8">
          <Video className="h-12 w-12 text-surface-300" />
          <p className="text-surface-500 dark:text-surface-300">{t('app.app.youtube.page.noYouTubeChannelConnected')}</p>
          <p className="max-w-md text-center text-xs leading-5 text-surface-600 dark:text-surface-300">
            {t('app.app.youtube.page.dubtubeRequestsYouTubePermissionsForChannelReadsUploads')}
          </p>
          <Button onClick={handleReconnect} loading={connecting}>
            <Globe className="h-4 w-4" />
            {t('app.app.youtube.page.connectYouTubeWithGoogle')}
          </Button>
        </div>
      )}
    </Card>
  )
}
