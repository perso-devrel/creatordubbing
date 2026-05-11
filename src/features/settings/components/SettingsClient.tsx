'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Globe, Globe2, Loader2, Settings, Unlink, Video } from 'lucide-react'
import { Card, CardTitle, Select, Button, Badge, Input } from '@/components/ui'
import {
  APP_LOCALE_LABELS,
  APP_LOCALES,
  MARKET_LANGUAGE_PRESETS,
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

const APP_LOCALE_OPTIONS = APP_LOCALES.map((locale) => ({
  value: locale,
  label: `${APP_LOCALE_LABELS[locale].nativeLabel} / ${APP_LOCALE_LABELS[locale].label}`,
}))

export function SettingsClient() {
  const t = useLocaleText()
  const { metadataTargetPreset, setAppLocale, setMetadataTargetPreset } = useI18nStore()
  const { preference: themePreference, setPreference: setThemePreference } = useThemeStore()
  const appLocale = useAppLocale()
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
  const presetOptions = MARKET_LANGUAGE_PRESETS.map((preset) => ({
    value: preset.id,
    label: t(preset.labelKey),
  }))
  const defaultTagsString = defaultTags.join(', ')
  const youtubeSectionRef = useRef<HTMLDivElement>(null)

  const selectedPreset = MARKET_LANGUAGE_PRESETS.find((preset) => preset.id === metadataTargetPreset)
  const presetLanguages = selectedPreset
    ? selectedPreset.languageCodes.map((code) => getLanguageByCode(code)).filter(Boolean)
    : []

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('section') !== 'youtube') return
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        youtubeSectionRef.current?.scrollIntoView({ block: 'start' })
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const handleDefaultTagsChange = (value: string) => {
    const parsed = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    setDefaultTags(parsed)
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
            value={appLocale}
            onChange={(event) => {
              const nextLocale = event.target.value as AppLocale
              setAppLocale(nextLocale)
              localeRouter.replaceLocale(nextLocale)
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
            value={defaultLanguage}
            onChange={(event) => setDefaultLanguage(event.target.value)}
            options={languageOptions}
          />
          <Select
            label={t('app.app.youtube.page.defaultVisibility')}
            value={defaultPrivacy}
            onChange={(event) => setDefaultPrivacy(event.target.value as PrivacyStatus)}
            options={[
              { value: 'public', label: t('app.app.youtube.page.public') },
              { value: 'unlisted', label: t('app.app.youtube.page.unlisted') },
              { value: 'private', label: t('app.app.youtube.page.private') },
            ]}
          />
          <Input
            label={t('app.app.youtube.page.defaultTags')}
            value={defaultTagsString}
            onChange={(event) => handleDefaultTagsChange(event.target.value)}
            placeholder={t('app.app.youtube.page.commaSeparatedEGDubtubeAIDubbingVlog')}
          />
          <Select
            label={t('settings.recommendedLanguageSet')}
            value={metadataTargetPreset}
            onChange={(event) => setMetadataTargetPreset(event.target.value)}
            options={presetOptions}
            className="md:col-span-2"
          />
        </div>

        {selectedPreset && (
          <div className="mt-4 rounded-lg border border-surface-200 bg-surface-100/70 p-3 dark:border-surface-700 dark:bg-surface-850">
            <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
              {t(selectedPreset.labelKey)}
            </p>
            <p className="mt-1 text-xs leading-5 text-surface-600 dark:text-surface-300">
              {t(selectedPreset.descriptionKey)}
            </p>
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
        )}
      </Card>

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
      const { user } = await signInWithGoogle({ forceConsent: true })
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
