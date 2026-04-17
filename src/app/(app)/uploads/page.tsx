'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle2, ExternalLink, Video, Settings2 } from 'lucide-react'
import { Card, CardTitle, Button, Badge, Input, Select } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { LanguageBadge } from '@/components/shared/LanguageBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { formatDuration } from '@/utils/formatters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { ytUploadVideo, ytUploadCaption, getDownloadLinks, getPersoFileUrl } from '@/lib/api-client'
import { toBcp47 } from '@/utils/languages'
import { dbMutation } from '@/lib/api/dbMutation'
import { getLanguageByCode } from '@/utils/languages'
import type { CompletedJobLanguage } from '@/lib/db/queries/dashboard'

type UploadState = 'idle' | 'fetching' | 'uploading' | 'done' | 'error'
type PrivacyStatus = 'public' | 'unlisted' | 'private'
type ShortsMode = 'regular' | 'shorts' | 'both'

interface UploadSettings {
  title: string
  description: string
  tags: string
  privacyStatus: PrivacyStatus
  shortsMode: ShortsMode
}

const PRIVACY_OPTIONS = [
  { value: 'private', label: '비공개' },
  { value: 'unlisted', label: '일부 공개' },
  { value: 'public', label: '공개' },
]

const SHORTS_OPTIONS: Array<{ value: ShortsMode; label: string; hint: string }> = [
  { value: 'regular', label: '일반 영상', hint: '일반 YouTube 영상으로 업로드' },
  { value: 'shorts', label: 'Shorts', hint: '제목/태그에 #Shorts 추가' },
  { value: 'both', label: '일반 + Shorts 양쪽', hint: '두 개의 영상으로 각각 업로드' },
]

async function fetchCompletedLanguages(uid: string): Promise<CompletedJobLanguage[]> {
  const res = await fetch(`/api/dashboard/completed-languages?uid=${encodeURIComponent(uid)}`, { cache: 'no-store' })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error?.message || 'Failed to load')
  return json.data
}

function buildDefaultSettings(item: CompletedJobLanguage, langName: string): UploadSettings {
  return {
    title: `[${langName}] ${item.video_title}`,
    description: `${item.video_title} - ${langName} dubbed by CreatorDub AI`,
    tags: `CreatorDub, AI dubbing, ${langName}, dubbed`,
    privacyStatus: 'private',
    shortsMode: 'regular',
  }
}

interface UploadSettingsModalProps {
  open: boolean
  onClose: () => void
  settings: UploadSettings
  onChange: (settings: UploadSettings) => void
  onConfirm: () => void
  isLoading: boolean
  langName: string
}

function UploadSettingsModal({ open, onClose, settings, onChange, onConfirm, isLoading, langName }: UploadSettingsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="YouTube upload settings" size="lg">
      <div className="space-y-4">
        <Input
          label="Title"
          value={settings.title}
          onChange={(e) => onChange({ ...settings, title: e.target.value })}
          placeholder="Video title"
        />

        <div className="w-full">
          <label htmlFor="yt-description" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
            Description
          </label>
          <textarea
            id="yt-description"
            rows={4}
            value={settings.description}
            onChange={(e) => onChange({ ...settings, description: e.target.value })}
            placeholder="Video description"
            className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 resize-none"
          />
        </div>

        <Input
          label="Tags (comma separated)"
          value={settings.tags}
          onChange={(e) => onChange({ ...settings, tags: e.target.value })}
          placeholder="tag1, tag2, tag3"
        />

        <Select
          label="Privacy"
          value={settings.privacyStatus}
          onChange={(e) => onChange({ ...settings, privacyStatus: e.target.value as PrivacyStatus })}
          options={PRIVACY_OPTIONS}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
            업로드 형식
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SHORTS_OPTIONS.map((opt) => {
              const active = settings.shortsMode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...settings, shortsMode: opt.value })}
                  className={
                    'rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ' +
                    (active
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-surface-200 hover:border-surface-300 dark:border-surface-700 dark:hover:border-surface-600')
                  }
                >
                  <div className="text-sm font-medium text-surface-900 dark:text-white">{opt.label}</div>
                  <div className="mt-0.5 text-[11px] text-surface-500">{opt.hint}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50">
          <span className="text-xs text-surface-500">Language: {langName}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" onClick={onClose} className="bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700">
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isLoading || !settings.title.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface UploadRowProps {
  item: CompletedJobLanguage
  userId: string
}

function UploadRow({ item, userId }: UploadRowProps) {
  const addToast = useNotificationStore((s) => s.addToast)
  const queryClient = useQueryClient()
  const [state, setState] = useState<UploadState>(item.youtube_video_id ? 'done' : 'idle')
  const [videoId, setVideoId] = useState<string | null>(item.youtube_video_id)
  const lang = getLanguageByCode(item.language_code)
  const langName = lang?.name || item.language_code

  const [modalOpen, setModalOpen] = useState(false)
  const [settings, setSettings] = useState<UploadSettings>(() => buildDefaultSettings(item, langName))

  const handleOpenModal = useCallback(() => {
    setSettings(buildDefaultSettings(item, langName))
    setModalOpen(true)
  }, [item, langName])

  const handleUpload = useCallback(async () => {
    setModalOpen(false)
    setState('fetching')
    try {
      const toAbs = (u: string | null | undefined): string | null => {
        if (!u) return null
        return u.startsWith('http') ? u : getPersoFileUrl(u)
      }

      const refetchFromPerso = async (): Promise<{ video: string | null; srt: string | null }> => {
        if (!item.project_seq || !item.space_seq) return { video: null, srt: null }
        const [dubDl, allDl] = await Promise.all([
          getDownloadLinks(item.project_seq, item.space_seq, 'dubbingVideo'),
          getDownloadLinks(item.project_seq, item.space_seq, 'all'),
        ])
        const raw = dubDl.videoFile?.videoDownloadLink
          ?? allDl.videoFile?.videoDownloadLink
          ?? allDl.zippedFileDownloadLink
          ?? null
        const rawSrt = allDl.srtFile?.translatedSubtitleDownloadLink ?? null
        return { video: toAbs(raw), srt: toAbs(rawSrt) }
      }

      // Start from DB URL (normalized). Refetch if missing or later if fetch fails (expired CDN link).
      let videoUrl = toAbs(item.dubbed_video_url)
      let srtUrl = toAbs(item.srt_url)

      if (!videoUrl) {
        const fresh = await refetchFromPerso()
        videoUrl = fresh.video
        srtUrl = srtUrl ?? fresh.srt
      }
      if (!videoUrl) throw new Error('No dubbed video download link available')

      setState('uploading')
      const baseTags = settings.tags.split(',').map((t) => t.trim()).filter(Boolean)

      // Build the list of variants to upload (1 for regular/shorts, 2 for both).
      const variants: Array<{ isShort: boolean; title: string; tags: string[] }> = []
      if (settings.shortsMode === 'regular' || settings.shortsMode === 'both') {
        variants.push({ isShort: false, title: settings.title, tags: baseTags })
      }
      if (settings.shortsMode === 'shorts' || settings.shortsMode === 'both') {
        variants.push({
          isShort: true,
          title: settings.title.startsWith('#Shorts ') ? settings.title : `#Shorts ${settings.title}`,
          tags: Array.from(new Set([...baseTags, 'Shorts'])),
        })
      }

      const doUpload = (url: string, v: (typeof variants)[number]) =>
        ytUploadVideo({
          videoUrl: url,
          title: v.title,
          description: settings.description,
          tags: v.tags,
          privacyStatus: settings.privacyStatus,
          language: item.language_code,
        })

      const uploadOnce = async (v: (typeof variants)[number]) => {
        try {
          return await doUpload(videoUrl!, v)
        } catch (err) {
          const msg = err instanceof Error ? err.message : ''
          const isFetchFailure = /VIDEO_FETCH_FAILED|fetch/i.test(msg)
          if (!isFetchFailure || !item.project_seq || !item.space_seq) throw err
          setState('fetching')
          const fresh = await refetchFromPerso()
          if (!fresh.video) throw err
          videoUrl = fresh.video
          srtUrl = srtUrl ?? fresh.srt
          setState('uploading')
          return await doUpload(videoUrl, v)
        }
      }

      const results: Array<{ variant: (typeof variants)[number]; videoId: string }> = []
      for (const v of variants) {
        const r = await uploadOnce(v)
        results.push({ variant: v, videoId: r.videoId })

        if (srtUrl) {
          try {
            const srtRes = await fetch(srtUrl)
            const srtText = await srtRes.text()
            await ytUploadCaption({
              videoId: r.videoId,
              language: item.language_code,
              name: `${langName} subtitles`,
              srtContent: srtText,
            })
          } catch {
            // SRT optional
          }
        }
      }

      // Surface the regular (non-short) upload on the row if present, else the first one.
      const displayed = results.find((r) => !r.variant.isShort) ?? results[0]
      setVideoId(displayed.videoId)
      setState('done')

      const privacyLabel = PRIVACY_OPTIONS.find((o) => o.value === settings.privacyStatus)?.label || settings.privacyStatus
      const modeLabel = settings.shortsMode === 'both' ? '일반 + Shorts' : settings.shortsMode === 'shorts' ? 'Shorts' : '일반'
      addToast({
        type: 'success',
        title: `${langName} upload complete`,
        message: `${modeLabel} · ${privacyLabel} (${results.length}개 업로드)`,
      })

      await Promise.all([
        ...results.map((r) =>
          dbMutation({
            type: 'createYouTubeUpload',
            payload: {
              userId,
              youtubeVideoId: r.videoId,
              title: r.variant.title,
              languageCode: item.language_code,
              privacyStatus: settings.privacyStatus,
              isShort: r.variant.isShort,
            },
          }),
        ),
        dbMutation({
          type: 'updateJobLanguageYouTube',
          payload: {
            jobId: item.job_id,
            langCode: item.language_code,
            youtubeVideoId: displayed.videoId,
          },
        }),
      ])
      queryClient.invalidateQueries({ queryKey: ['completed-languages'] })
    } catch (err) {
      setState('error')
      addToast({ type: 'error', title: 'Upload failed', message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [item, langName, settings, userId, addToast, queryClient])

  const isLoading = state === 'fetching' || state === 'uploading'
  const loadingLabel = state === 'fetching' ? 'Resolving link...' : 'Uploading...'

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
        <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-surface-100 text-xs text-surface-400 dark:bg-surface-800">
          {formatDuration(Math.round(item.video_duration_ms / 1000))}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-surface-900 dark:text-white">{item.video_title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {lang && <LanguageBadge code={item.language_code} />}
            {videoId && (
              <a
                href={`https://youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Watch
              </a>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {state === 'done' ? (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3" />
              Uploaded
            </Badge>
          ) : isLoading ? (
            <div className="flex items-center gap-1.5 text-xs text-surface-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingLabel}
            </div>
          ) : (
            <Button size="sm" onClick={handleOpenModal} disabled={state === 'error'}>
              <Settings2 className="h-3.5 w-3.5" />
              YouTube Upload
            </Button>
          )}
        </div>
      </div>

      <UploadSettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        settings={settings}
        onChange={setSettings}
        onConfirm={handleUpload}
        isLoading={isLoading}
        langName={langName}
      />
    </>
  )
}

export default function UploadsPage() {
  const user = useAuthStore((s) => s.user)
  const { data: items = [], isLoading } = useQuery<CompletedJobLanguage[]>({
    queryKey: ['completed-languages', user?.uid],
    queryFn: () => fetchCompletedLanguages(user!.uid),
    enabled: !!user,
    staleTime: 60_000,
  })

  const jobs = items.reduce<Record<number, { title: string; durationMs: number; createdAt: string; langs: CompletedJobLanguage[] }>>((acc, item) => {
    if (!acc[item.job_id]) {
      acc[item.job_id] = {
        title: item.video_title,
        durationMs: item.video_duration_ms,
        createdAt: item.created_at,
        langs: [],
      }
    }
    acc[item.job_id].langs.push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">YouTube Upload</h1>
        <p className="text-surface-500 dark:text-surface-400">Upload completed dubbed videos to YouTube</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-surface-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Video className="h-12 w-12" />}
          title="No videos to upload"
          description="Completed dubbed videos will appear here."
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(jobs).map(([jobId, job]) => (
            <Card key={jobId}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {formatDuration(Math.round(job.durationMs / 1000))} · {new Date(job.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <Badge variant="success">{job.langs.length} languages</Badge>
              </div>
              <div className="space-y-2">
                {job.langs.map((item) => (
                  <UploadRow key={`${item.job_id}-${item.language_code}`} item={item} userId={user?.uid || ''} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
