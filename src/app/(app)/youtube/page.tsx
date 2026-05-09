'use client'

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

export default function YouTubeSettingsPage() {
  const t = useLocaleText()
  const router = useRouter()
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
  const isConnected = !!channel
  const { data: videos = [], isLoading: videosLoading, error: videosError } = useMyVideos(10, isConnected)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t({ ko: 'YouTube 설정', en: 'YouTube settings' })}</h1>
        <p className="text-surface-500 dark:text-surface-400">{t({ ko: 'YouTube 채널 연결과 기본 업로드 설정을 관리하세요.', en: 'Manage your YouTube channel connection and upload defaults.' })}</p>
      </div>

      {/* Channel Connection */}
      <Card>
        <CardTitle>{t({ ko: '연결된 채널', en: 'Connected channel' })}</CardTitle>
        {channelLoading ? (
          <div className="mt-4 flex items-center gap-2 text-surface-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t({ ko: '채널 정보 불러오는 중...', en: 'Loading channel information...' })}</span>
          </div>
        ) : channelError ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-8">
            <Video className="h-12 w-12 text-surface-300" />
            <p className="text-sm text-red-500">
              {channelError instanceof Error ? channelError.message : t({ ko: 'YouTube 채널 정보를 불러오지 못했습니다.', en: 'Could not load YouTube channel information.' })}
            </p>
          </div>
        ) : isConnected ? (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-lg font-bold text-white">
                  {channel.title[0]?.toUpperCase() || 'Y'}
                </div>
              )}
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{channel.title}</p>
                <p className="text-sm text-surface-500">
                  {t({ ko: `구독자 ${formatNumber(channel.subscriberCount)} · 영상 ${formatNumber(channel.videoCount)}개`, en: `${formatNumber(channel.subscriberCount)} subscribers · ${formatNumber(channel.videoCount)} videos` })}
                </p>
              </div>
              <Badge variant="success">{t({ ko: '연결됨', en: 'Connected' })}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.reload())
            }}>
              <Unlink className="h-4 w-4" />
              {t({ ko: '연결 해제', en: 'Disconnect' })}
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-4 py-8">
            <Video className="h-12 w-12 text-surface-300" />
            <p className="text-surface-500">{t({ ko: '연결된 YouTube 채널이 없습니다', en: 'No YouTube channel connected' })}</p>
            <p className="text-xs text-surface-400">{t({ ko: 'Google로 로그인하면 YouTube 권한을 함께 요청합니다.', en: 'Signing in with Google also requests YouTube permissions.' })}</p>
            <Button onClick={() => window.location.href = '/'}>
              <Globe className="h-4 w-4" />
              {t({ ko: 'Google 계정으로 연결', en: 'Connect Google account' })}
            </Button>
          </div>
        )}
      </Card>

      {/* Default Upload Settings */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-surface-400" />
          <CardTitle>{t({ ko: '기본 업로드 설정', en: 'Default upload settings' })}</CardTitle>
        </div>

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
          <p className="-mt-3 text-xs text-surface-400">
            {t({ ko: '새 더빙 시작 시 이 값이 기본값으로 적용됩니다. 각 더빙별로 변경할 수 있습니다.', en: 'This is used as the default for new dubbing jobs. You can change it for each job.' })}
          </p>

          <Select
            label={t({ ko: '기본 원문 언어', en: 'Default source language' })}
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            options={SUPPORTED_LANGUAGES.map((l) => ({
              value: l.code,
              label: `${l.flag} ${l.name} (${l.nativeName})`,
            }))}
          />
          <p className="-mt-3 text-xs text-surface-400">
            {t({ ko: '제목과 설명을 작성할 기본 언어를 선택하세요. 더빙별로 변경할 수 있습니다.', en: 'Choose the default language for titles and descriptions. You can change it for each job.' })}
          </p>

          <Input
            label={t({ ko: '기본 태그', en: 'Default tags' })}
            value={defaultTagsString}
            onChange={(e) => handleDefaultTagsChange(e.target.value)}
            placeholder={t({ ko: '쉼표로 구분 (예: Dubtube, AI 더빙, 브이로그)', en: 'Comma-separated (e.g. Dubtube, AI dubbing, vlog)' })}
          />
          <p className="-mt-3 text-xs text-surface-400">
            {t({ ko: '새 더빙 시작 시 이 태그들이 기본값으로 채워집니다. 더빙별로 변경할 수 있습니다.', en: 'These tags are prefilled for new dubbing jobs. You can change them for each job.' })}
          </p>
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
            <div className="flex items-center gap-2 py-4 text-surface-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t({ ko: '영상 목록 불러오는 중...', en: 'Loading video list...' })}</span>
            </div>
          ) : videosError ? (
            <p className="py-4 text-center text-sm text-red-500">
              {videosError instanceof Error ? videosError.message : t({ ko: 'YouTube 영상 목록을 불러오지 못했습니다.', en: 'Could not load the YouTube video list.' })}
            </p>
          ) : videos.length === 0 ? (
            <p className="py-4 text-center text-sm text-surface-400">{t({ ko: '영상이 없습니다', en: 'No videos found' })}</p>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <div
                  key={video.videoId}
                  className="flex items-center justify-between rounded-lg border border-surface-200 p-3 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50"
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
                      <p className="text-xs text-surface-500">
                        {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 ml-3" onClick={() => router.push(`/dubbing?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.videoId}`)}`)}>
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
