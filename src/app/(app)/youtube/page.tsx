'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Video, Unlink, Settings, Globe, Loader2 } from 'lucide-react'
import { Card, CardTitle, CardDescription, Button, Badge, Input, Select } from '@/components/ui'
import { useChannelStats, useMyVideos } from '@/hooks/useYouTubeData'
import { formatNumber } from '@/utils/formatters'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import { SUPPORTED_LANGUAGES } from '@/utils/languages'
import type { PrivacyStatus } from '@/features/dubbing/types/dubbing.types'

export default function YouTubeSettingsPage() {
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
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">YouTube 설정</h1>
        <p className="text-surface-500 dark:text-surface-400">YouTube 채널 연결 및 업로드 설정을 관리하세요</p>
      </div>

      {/* Channel Connection */}
      <Card>
        <CardTitle>연결된 채널</CardTitle>
        {channelLoading ? (
          <div className="mt-4 flex items-center gap-2 text-surface-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">채널 정보 불러오는 중...</span>
          </div>
        ) : channelError ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-8">
            <Video className="h-12 w-12 text-surface-300" />
            <p className="text-sm text-red-500">
              {channelError instanceof Error ? channelError.message : 'YouTube 채널 정보를 불러오지 못했습니다.'}
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
                  구독자 {formatNumber(channel.subscriberCount)} · 영상 {formatNumber(channel.videoCount)}개
                </p>
              </div>
              <Badge variant="success">연결됨</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.reload())
            }}>
              <Unlink className="h-4 w-4" />
              연결 해제
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-4 py-8">
            <Video className="h-12 w-12 text-surface-300" />
            <p className="text-surface-500">연결된 YouTube 채널이 없습니다</p>
            <p className="text-xs text-surface-400">Google 로그인 시 YouTube 권한이 함께 연결됩니다</p>
            <Button onClick={() => window.location.href = '/'}>
              <Globe className="h-4 w-4" />
              Google 계정으로 연결
            </Button>
          </div>
        )}
      </Card>

      {/* Default Upload Settings */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-surface-400" />
          <CardTitle>기본 업로드 설정</CardTitle>
        </div>

        <div className="space-y-4">
          <Select
            label="기본 공개 설정"
            value={defaultVisibility}
            onChange={(e) => setDefaultVisibility(e.target.value as PrivacyStatus)}
            options={[
              { value: 'public', label: '공개' },
              { value: 'unlisted', label: '일부 공개' },
              { value: 'private', label: '비공개' },
            ]}
          />
          <p className="-mt-3 text-xs text-surface-400">
            새 더빙 시작 시 이 값이 기본값으로 적용됩니다. 각 더빙 별로 변경할 수 있습니다.
          </p>

          <Select
            label="기본 작성 언어"
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            options={SUPPORTED_LANGUAGES.map((l) => ({
              value: l.code,
              label: `${l.flag} ${l.name} (${l.nativeName})`,
            }))}
          />
          <p className="-mt-3 text-xs text-surface-400">
            편한 언어를 선택해주세요. 작성하신 내용은 선택하신 언어로 자동 번역되어 함께 업로드됩니다. 더빙별로도 변경할 수 있습니다.
          </p>

          <Input
            label="기본 태그"
            value={defaultTagsString}
            onChange={(e) => handleDefaultTagsChange(e.target.value)}
            placeholder="콤마로 구분 (예: Dubtube, AI더빙, dubbed)"
          />
          <p className="-mt-3 text-xs text-surface-400">
            새 더빙 시작 시 이 태그들이 기본값으로 채워집니다. 더빙별로도 변경할 수 있습니다.
          </p>
        </div>
      </Card>

      {/* Recent Videos */}
      {isConnected && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>내 영상</CardTitle>
            <CardDescription>{formatNumber(channel.videoCount)}개 영상</CardDescription>
          </div>

          {videosLoading ? (
            <div className="flex items-center gap-2 py-4 text-surface-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">영상 목록 불러오는 중...</span>
            </div>
          ) : videosError ? (
            <p className="py-4 text-center text-sm text-red-500">
              {videosError instanceof Error ? videosError.message : 'YouTube 영상 목록을 불러오지 못했습니다.'}
            </p>
          ) : videos.length === 0 ? (
            <p className="py-4 text-center text-sm text-surface-400">영상이 없습니다</p>
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
                    이 영상 더빙
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
