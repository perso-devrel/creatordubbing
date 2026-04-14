'use client'

import { useState } from 'react'
import { Video, ExternalLink, Unlink, AlertTriangle, Settings, Globe } from 'lucide-react'
import { Card, CardTitle, CardDescription, Button, Badge, Select, Toggle } from '@/components/ui'

export default function YouTubeSettingsPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [defaultVisibility, setDefaultVisibility] = useState('public')
  const [autoSubtitles, setAutoSubtitles] = useState(true)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">YouTube 설정</h1>
        <p className="text-surface-500 dark:text-surface-400">YouTube 채널 연결 및 업로드 설정을 관리하세요</p>
      </div>

      {/* Channel Connection */}
      <Card>
        <CardTitle>연결된 채널</CardTitle>
        {isConnected ? (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-lg font-bold text-white">
                YT
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">내 채널</p>
                <p className="text-sm text-surface-500">YouTube 채널 연결됨</p>
              </div>
              <Badge variant="success">연결됨</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsConnected(false)}>
              <Unlink className="h-4 w-4" />
              연결 해제
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-4 py-8">
            <Video className="h-12 w-12 text-surface-300" />
            <p className="text-surface-500">연결된 YouTube 채널이 없습니다</p>
            <Button onClick={() => setIsConnected(true)}>
              <Globe className="h-4 w-4" />
              YouTube 채널 연결
            </Button>
          </div>
        )}
      </Card>

      {/* Multi-Audio Eligibility */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-300">Multi-Audio Track 요구사항</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              YouTube Multi-Audio Track 업로드는 구독자 수, 커뮤니티 가이드라인 준수 등 채널 자격 요건을 충족해야 합니다. YouTube Studio에서 자격 여부를 확인하세요.
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              <ExternalLink className="h-3.5 w-3.5" />
              자격 확인
            </Button>
          </div>
        </div>
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
            onChange={(e) => setDefaultVisibility(e.target.value)}
            options={[
              { value: 'public', label: '공개' },
              { value: 'unlisted', label: '일부 공개' },
              { value: 'private', label: '비공개' },
            ]}
          />

          <div className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800">
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">자막(SRT) 자동 업로드</p>
              <p className="text-xs text-surface-500">각 더빙 언어에 대해 SRT 파일을 자동 업로드합니다</p>
            </div>
            <Toggle checked={autoSubtitles} onChange={setAutoSubtitles} />
          </div>
        </div>
      </Card>

      {/* Recent Videos */}
      {isConnected && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>내 영상</CardTitle>
            <CardDescription>채널 영상</CardDescription>
          </div>
          <div className="py-8 text-center text-sm text-surface-400">
            영상 목록을 불러올 수 없습니다
          </div>
        </Card>
      )}
    </div>
  )
}
