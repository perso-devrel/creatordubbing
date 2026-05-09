'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function YouTubeSettingsPage() {
  const t = useLocaleText()
  const router = useRouter()
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
    (channelError.message.includes('YouTube 연결') || channelError.message.includes('Google access token'))
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
        title: t({ ko: 'YouTube에 연결할 수 없습니다', en: 'Could not connect YouTube' }),
        message: t({
          ko: '팝업 차단을 확인한 뒤 다시 시도해 주세요.',
          en: 'Please allow pop-ups and try again.',
        }),
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
        title: t({ ko: '연결을 해제하지 못했습니다', en: 'Could not disconnect' }),
        message: t({
          ko: '잠시 후 다시 시도해 주세요.',
          en: 'Please try again shortly.',
        }),
      })
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t({ ko: 'YouTube 설정', en: 'YouTube settings' })}</h1>
        <p className="text-surface-500 dark:text-surface-400">{t({ ko: 'YouTube 채널 연결과 업로드 기본값을 관리하세요.', en: 'Manage your YouTube channel connection and upload defaults.' })}</p>
      </div>

      {/* Channel Connection */}
      <Card>
        <CardTitle>{t({ ko: '연결된 채널', en: 'Connected channel' })}</CardTitle>
        {channelLoading ? (
          <div className="mt-4 flex items-center gap-2 text-surface-500 dark:text-surface-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t({ ko: '채널 정보 불러오는 중...', en: 'Loading channel information...' })}</span>
          </div>
        ) : channelError && !missingYouTubeConnection ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-8">
            <Video className="h-12 w-12 text-surface-300" />
            <p className="text-sm text-red-500">
              {channelError instanceof Error ? channelError.message : t({ ko: 'YouTube 채널 정보를 불러오지 못했습니다.', en: 'Could not load YouTube channel information.' })}
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
                  {t({ ko: `구독자 ${formatNumber(channel.subscriberCount)} · 영상 ${formatNumber(channel.videoCount)}개`, en: `${formatNumber(channel.subscriberCount)} subscribers · ${formatNumber(channel.videoCount)} videos` })}
                </p>
              </div>
              <Badge variant="success">{t({ ko: '연결됨', en: 'Connected' })}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect} loading={disconnecting} className="w-full sm:w-auto">
              <Unlink className="h-4 w-4" />
              {t({ ko: 'YouTube 연결 해제', en: 'Disconnect YouTube' })}
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-4 py-8">
            <Video className="h-12 w-12 text-surface-300" />
            <p className="text-surface-500 dark:text-surface-300">{t({ ko: '연결된 YouTube 채널이 없습니다', en: 'No YouTube channel connected' })}</p>
            <p className="max-w-md text-center text-xs leading-5 text-surface-600 dark:text-surface-300">
              {t({
                ko: '채널 영상 조회, 업로드, 자막·제목 수정, 분석 데이터 확인에 필요한 YouTube 권한을 요청합니다. 권한은 언제든 해제할 수 있습니다.',
                en: 'Dubtube requests YouTube permissions for channel reads, uploads, captions, title updates, and analytics. You can disconnect at any time.',
              })}
            </p>
            <Button onClick={handleReconnect} loading={connecting}>
              <Globe className="h-4 w-4" />
              {t({ ko: 'Google 계정으로 YouTube 연결', en: 'Connect YouTube with Google' })}
            </Button>
          </div>
        )}
      </Card>

      {/* Default Upload Settings */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-surface-400" />
          <CardTitle>{t({ ko: '업로드 기본값', en: 'Upload defaults' })}</CardTitle>
        </div>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-300">
          {t({ ko: '아래 기본값은 새 더빙에 먼저 적용되며, 작업마다 바꿀 수 있습니다.', en: 'These defaults are applied to new dubbing jobs first, and can be changed per job.' })}
        </p>

        <div className="space-y-4">
          <Select
            label={t({ ko: '기본 공개 범위', en: 'Default visibility' })}
            value={defaultVisibility}
            onChange={(e) => setDefaultVisibility(e.target.value as PrivacyStatus)}
            options={[
              { value: 'public', label: t({ ko: '공개', en: 'Public' }) },
              { value: 'unlisted', label: t({ ko: '일부 공개', en: 'Unlisted' }) },
              { value: 'private', label: t({ ko: '비공개', en: 'Private' }) },
            ]}
          />

          <Select
            label={t({ ko: '제목·설명 기본 언어', en: 'Default title and description language' })}
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            options={SUPPORTED_LANGUAGES.map((l) => ({
              value: l.code,
              label: `${l.flag} ${l.name} (${l.nativeName})`,
            }))}
          />

          <Input
            label={t({ ko: '기본 태그', en: 'Default tags' })}
            value={defaultTagsString}
            onChange={(e) => handleDefaultTagsChange(e.target.value)}
            placeholder={t({ ko: '쉼표로 구분 (예: Dubtube, AI 더빙, 브이로그)', en: 'Comma-separated (e.g. Dubtube, AI dubbing, vlog)' })}
          />
        </div>
      </Card>

      {/* Recent Videos */}
      {isConnected && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{t({ ko: '내 영상', en: 'My videos' })}</CardTitle>
            <CardDescription>{t({ ko: `${formatNumber(channel.videoCount)}개 영상`, en: `${formatNumber(channel.videoCount)} videos` })}</CardDescription>
          </div>

          {videosLoading ? (
            <div className="flex items-center gap-2 py-4 text-surface-500 dark:text-surface-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t({ ko: '영상 목록 불러오는 중...', en: 'Loading video list...' })}</span>
            </div>
          ) : videosError ? (
            <p className="py-4 text-center text-sm text-red-500">
              {videosError instanceof Error ? videosError.message : t({ ko: 'YouTube 영상 목록을 불러오지 못했습니다.', en: 'Could not load the YouTube video list.' })}
            </p>
          ) : videos.length === 0 ? (
            <p className="py-4 text-center text-sm text-surface-500 dark:text-surface-300">{t({ ko: '표시할 영상이 없습니다', en: 'No videos to show' })}</p>
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
                    {t({ ko: '이 영상 더빙', en: 'Dub this video' })}
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
