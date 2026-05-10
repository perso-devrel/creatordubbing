'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Video, Unlink, Settings, Globe, Loader2 } from 'lucide-react'
import { Card, CardTitle, CardDescription, Button, Badge, Input, Select } from '@/components/ui'
import { useChannelStats, useMyVideos } from '@/hooks/useYouTubeData'
import { formatNumber } from '@/utils/formatters'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import { SUPPORTED_LANGUAGES } from '@/utils/languages'
import { useLocaleText } from '@/hooks/useLocaleText'
import type { PrivacyStatus } from '@/features/dubbing/types/dubbing.types'
import { signInWithGoogle } from '@/lib/google-auth'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useLocaleRouter } from '@/hooks/useLocalePath'

export default function YouTubeSettingsPage() {
  const t = useLocaleText()
  const router = useLocaleRouter()
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const addToast = useNotificationStore((s) => s.addToast)
  const defaultVisibility = useYouTubeSettingsStore((s) => s.defaultPrivacy)
  const setDefaultVisibility = useYouTubeSettingsStore((s) => s.setDefaultPrivacy)
  const defaultLanguage = useYouTubeSettingsStore((s) => s.defaultLanguage)
  const setDefaultLanguage = useYouTubeSettingsStore((s) => s.setDefaultLanguage)
  const defaultTags = useYouTubeSettingsStore((s) => s.defaultTags)
  const setDefaultTags = useYouTubeSettingsStore((s) => s.setDefaultTags)
  const defaultTagsString = defaultTags.join(', ')

  const handleDefaultTagsChange = (value: string) => {
    const parsed = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    setDefaultTags(parsed)
  }

  const { data: channel, isLoading: channelLoading, error: channelError } = useChannelStats()
  const missingYouTubeConnection =
    channelError instanceof Error &&
    (channelError.message.includes(t('internal.keyword.youtubeConnection')) || channelError.message.includes('Google access token'))
  const isConnected = !!channel && !missingYouTubeConnection
  const { data: videos = [], isLoading: videosLoading, error: videosError } = useMyVideos(10, isConnected)

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('app.app.youtube.page.youTubeSettings')}</h1>
        <p className="text-surface-500 dark:text-surface-400">{t('app.app.youtube.page.manageYourYouTubeChannelConnectionAndUploadDefaults')}</p>
      </div>

      {/* Channel Connection */}
      <Card>
        <CardTitle>{t('app.app.youtube.page.connectedChannel')}</CardTitle>
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
                  {t('app.app.youtube.page.valueSubscribersValueVideos', { formatNumberChannelSubscriberCount: formatNumber(channel.subscriberCount), formatNumberChannelVideoCount: formatNumber(channel.videoCount) })}
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

      {/* Default Upload Settings */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-surface-400" />
          <CardTitle>{t('app.app.youtube.page.uploadDefaults')}</CardTitle>
        </div>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-300">
          {t('app.app.youtube.page.theseDefaultsAreAppliedToNewDubbingJobs')}
        </p>

        <div className="space-y-4">
          <Select
            label={t('app.app.youtube.page.defaultVisibility')}
            value={defaultVisibility}
            onChange={(e) => setDefaultVisibility(e.target.value as PrivacyStatus)}
            options={[
              { value: 'public', label: t('app.app.youtube.page.public') },
              { value: 'unlisted', label: t('app.app.youtube.page.unlisted') },
              { value: 'private', label: t('app.app.youtube.page.private') },
            ]}
          />

          <Select
            label={t('app.app.youtube.page.defaultTitleAndDescriptionLanguage')}
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            options={SUPPORTED_LANGUAGES.map((l) => ({
              value: l.code,
              label: `${l.flag} ${l.name} (${l.nativeName})`,
            }))}
          />

          <Input
            label={t('app.app.youtube.page.defaultTags')}
            value={defaultTagsString}
            onChange={(e) => handleDefaultTagsChange(e.target.value)}
            placeholder={t('app.app.youtube.page.commaSeparatedEGDubtubeAIDubbingVlog')}
          />
        </div>
      </Card>

      {/* Recent Videos */}
      {isConnected && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{t('app.app.youtube.page.myVideos')}</CardTitle>
            <CardDescription>{t('app.app.youtube.page.valueVideos', { formatNumberChannelVideoCount: formatNumber(channel.videoCount) })}</CardDescription>
          </div>

          {videosLoading ? (
            <div className="flex items-center gap-2 py-4 text-surface-500 dark:text-surface-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('app.app.youtube.page.loadingVideoList')}</span>
            </div>
          ) : videosError ? (
            <p className="py-4 text-center text-sm text-red-500">
              {videosError instanceof Error ? videosError.message : t('app.app.youtube.page.couldNotLoadTheYouTubeVideoList')}
            </p>
          ) : videos.length === 0 ? (
            <p className="py-4 text-center text-sm text-surface-500 dark:text-surface-300">{t('app.app.youtube.page.noVideosToShow')}</p>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <div
                  key={video.videoId}
                  className="flex flex-col gap-3 rounded-lg border border-surface-200 p-3 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Image
                      src={video.thumbnail || '/Youtube_logo.png'}
                      alt={video.title}
                      width={64}
                      height={36}
                      className="rounded object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-surface-900 dark:text-white">{video.title}</p>
                      <p className="text-xs text-surface-500 dark:text-surface-300">
                        {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full shrink-0 sm:ml-3 sm:w-auto" onClick={() => router.push(`/dubbing?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.videoId}`)}`)}>
                    {t('app.app.youtube.page.dubThisVideo')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
