'use client'

import { useState, useCallback, useEffect } from 'react'
import { Puzzle, Upload, AlertCircle } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { getLanguageByCode } from '@/utils/languages'
import { useNotificationStore } from '@/stores/notificationStore'

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || ''

interface Props {
  videoId: string
  completedLangs: string[]
  getAudioUrl: (langCode: string) => Promise<string | undefined>
}

type ExtensionStatus = 'checking' | 'installed' | 'not-installed'

interface ChromeRuntime {
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void
  lastError?: { message: string }
}

function getChromeRuntime(): ChromeRuntime | null {
  if (typeof globalThis !== 'undefined' && 'chrome' in globalThis) {
    const c = (globalThis as Record<string, unknown>).chrome as { runtime?: ChromeRuntime } | undefined
    return c?.runtime ?? null
  }
  return null
}

function sendToExtension(message: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime()
    if (!EXTENSION_ID || !runtime) {
      reject(new Error('Chrome 확장 API를 사용할 수 없습니다'))
      return
    }
    runtime.sendMessage(EXTENSION_ID, message, (response: unknown) => {
      if (runtime.lastError) {
        reject(new Error(runtime.lastError.message))
      } else {
        resolve(response)
      }
    })
  })
}

export function YouTubeExtensionUpload({ videoId, completedLangs, getAudioUrl }: Props) {
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>('checking')
  const [uploadingLang, setUploadingLang] = useState<string | null>(null)
  const addToast = useNotificationStore((s) => s.addToast)

  useEffect(() => {
    async function checkExtension() {
      if (!EXTENSION_ID) {
        setExtensionStatus('not-installed')
        return
      }
      try {
        const response = await sendToExtension({ type: 'PING' }) as { ok?: boolean }
        setExtensionStatus(response?.ok ? 'installed' : 'not-installed')
      } catch {
        setExtensionStatus('not-installed')
      }
    }
    checkExtension()
  }, [])

  const handleExtensionUpload = useCallback(async (langCode: string) => {
    const lang = getLanguageByCode(langCode)
    if (!lang) return

    setUploadingLang(langCode)
    try {
      const audioUrl = await getAudioUrl(langCode)
      if (!audioUrl) {
        addToast({ type: 'error', title: '오디오 URL을 찾을 수 없습니다' })
        return
      }

      const response = await sendToExtension({
        type: 'UPLOAD_TO_YOUTUBE',
        payload: {
          videoId,
          languageCode: langCode,
          audioUrl,
          mode: 'assisted',
        },
      }) as { ok: boolean; jobId?: string; error?: string }

      if (response.ok) {
        addToast({
          type: 'success',
          title: `${lang.name} 확장 업로드 시작`,
          message: `작업 ID: ${response.jobId}. YouTube Studio에서 자동 진행됩니다.`,
        })
      } else {
        addToast({ type: 'error', title: `확장 업로드 실패`, message: response.error || '알 수 없는 오류' })
      }
    } catch (err) {
      addToast({ type: 'error', title: '확장 통신 실패', message: err instanceof Error ? err.message : String(err) })
    } finally {
      setUploadingLang(null)
    }
  }, [videoId, getAudioUrl, addToast])

  if (extensionStatus === 'checking') return null

  if (extensionStatus === 'not-installed') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-surface-300 p-3 dark:border-surface-700">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-surface-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
            CreatorDub 확장 미설치
          </p>
          <p className="text-xs text-surface-400">
            {!EXTENSION_ID
              ? 'NEXT_PUBLIC_EXTENSION_ID 환경변수가 설정되지 않았습니다.'
              : 'Chrome 확장을 설치하면 오디오 트랙 업로드를 자동화할 수 있습니다.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Puzzle className="h-4 w-4 text-brand-500" />
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
          확장 자동 업로드
        </span>
        <Badge variant="success">연결됨</Badge>
      </div>
      <p className="text-xs text-surface-500 mb-3">
        CreatorDub 확장이 YouTube Studio를 자동으로 열고 오디오 트랙을 추가합니다.
      </p>
      {completedLangs.map((code) => {
        const lang = getLanguageByCode(code)
        if (!lang) return null
        return (
          <div
            key={code}
            className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{lang.flag}</span>
              <p className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExtensionUpload(code)}
              loading={uploadingLang === code}
              disabled={uploadingLang !== null}
            >
              <Upload className="h-3.5 w-3.5" />
              자동 업로드
            </Button>
          </div>
        )
      })}
    </div>
  )
}
