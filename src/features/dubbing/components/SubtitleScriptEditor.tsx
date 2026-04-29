'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Save,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { getLanguageByCode, toBcp47 } from '@/utils/languages'
import { useNotificationStore } from '@/stores/notificationStore'
import {
  getProjectScript,
  getTranslatedSrt,
  regenerateSentenceAudio,
  updateSentenceTranslation,
  ytUploadCaption,
} from '@/lib/api-client'
import type { ScriptSentence } from '@/lib/perso/types'

function formatMs(ms: number | undefined | null): string {
  if (ms == null || isNaN(ms)) return '0:00'
  const safe = Math.max(0, Math.floor(ms))
  const m = Math.floor(safe / 60000)
  const s = Math.floor((safe % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

interface EditableSentence extends ScriptSentence {
  editedTranslatedText: string
  /** Perso 서버에 저장된 마지막 번역 텍스트(되돌림 비교용). */
  savedTranslatedText: string
}

interface RowProps {
  sentence: EditableSentence
  projectSeq: number
  onPatch: (
    sentenceSeq: number,
    patch: Partial<Pick<EditableSentence, 'editedTranslatedText' | 'savedTranslatedText'>>,
  ) => void
}

function SentenceRow({ sentence, projectSeq, onPatch }: RowProps) {
  const addToast = useNotificationStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const textDirty = sentence.editedTranslatedText !== sentence.savedTranslatedText

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateSentenceTranslation(
        projectSeq,
        sentence.sentenceSeq,
        sentence.editedTranslatedText,
      )
      onPatch(sentence.sentenceSeq, {
        savedTranslatedText: sentence.editedTranslatedText,
      })
      addToast({ type: 'success', title: '저장됨', message: '번역이 Perso에 반영되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '저장 실패' })
    } finally {
      setSaving(false)
    }
  }, [projectSeq, sentence.sentenceSeq, sentence.editedTranslatedText, onPatch, addToast])

  const handleRegenerate = useCallback(async () => {
    if (textDirty) await handleSave()
    setRegenerating(true)
    try {
      await regenerateSentenceAudio(projectSeq, sentence.audioSentenceSeq)
      addToast({
        type: 'success',
        title: '재생성 요청됨',
        message: '오디오가 재생성됩니다. 완료 후 SRT를 다시 다운로드하거나 YouTube에 적용하세요.',
      })
    } catch {
      addToast({ type: 'error', title: '재생성 실패' })
    } finally {
      setRegenerating(false)
    }
  }, [textDirty, handleSave, projectSeq, sentence.audioSentenceSeq, addToast])

  return (
    <div className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
      <div className="flex items-center gap-2 text-xs text-surface-400">
        <span className="font-mono">
          {formatMs(sentence.startMs)} → {formatMs(sentence.endMs)}
        </span>
        {sentence.speakerLabel && (
          <span className="rounded bg-surface-100 px-1.5 py-0.5 dark:bg-surface-800">
            {sentence.speakerLabel}
          </span>
        )}
      </div>
      <p className="text-xs italic text-surface-500">&ldquo;{sentence.originalText}&rdquo;</p>
      <textarea
        value={sentence.editedTranslatedText}
        onChange={(e) =>
          onPatch(sentence.sentenceSeq, { editedTranslatedText: e.target.value })
        }
        rows={2}
        className="w-full resize-none rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
      />
      <div className="flex justify-end gap-2">
        {textDirty && (
          <Button size="sm" variant="outline" onClick={handleSave} loading={saving}>
            <Save className="h-3.5 w-3.5" />
            저장
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
          loading={regenerating}
          disabled={saving}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          오디오 재생성
        </Button>
      </div>
    </div>
  )
}

interface SubtitleScriptEditorProps {
  langCode: string
  projectSeq: number
  spaceSeq: number
  /** 이 언어의 더빙 영상이 이미 YouTube에 업로드되어 있을 때만 전달된다. */
  youtubeVideoId?: string | null
}

export function SubtitleScriptEditor({
  langCode,
  projectSeq,
  spaceSeq,
  youtubeVideoId,
}: SubtitleScriptEditorProps) {
  const addToast = useNotificationStore((s) => s.addToast)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sentences, setSentences] = useState<EditableSentence[] | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [srtPreview, setSrtPreview] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pushingToYT, setPushingToYT] = useState(false)

  const lang = getLanguageByCode(langCode)

  const loadScript = useCallback(async () => {
    if (sentences) {
      setOpen((v) => !v)
      return
    }
    setLoading(true)
    setOpen(true)
    try {
      const data = await getProjectScript(projectSeq, spaceSeq)
      const list: ScriptSentence[] = Array.isArray(data) ? data : []
      setSentences(
        list.map((s) => ({
          ...s,
          editedTranslatedText: s.translatedText,
          savedTranslatedText: s.translatedText,
        })),
      )
    } catch {
      addToast({ type: 'error', title: '스크립트 로드 실패' })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [sentences, projectSeq, spaceSeq, addToast])

  const handlePatch = useCallback(
    (
      sentenceSeq: number,
      patch: Partial<Pick<EditableSentence, 'editedTranslatedText' | 'savedTranslatedText'>>,
    ) => {
      setSentences((prev) =>
        prev?.map((s) => (s.sentenceSeq === sentenceSeq ? { ...s, ...patch } : s)) ?? null,
      )
    },
    [],
  )

  const handleDownloadSRT = useCallback(async () => {
    setDownloading(true)
    try {
      const srt = await getTranslatedSrt(projectSeq, spaceSeq, 'translated')
      const blob = new Blob([srt], { type: 'application/x-subrip;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${lang?.name || langCode}_${langCode}.srt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      addToast({
        type: 'error',
        title: 'SRT 다운로드 실패',
        message: err instanceof Error ? err.message : '',
      })
    } finally {
      setDownloading(false)
    }
  }, [projectSeq, spaceSeq, lang, langCode, addToast])

  const handleTogglePreview = useCallback(async () => {
    if (showPreview) {
      setShowPreview(false)
      return
    }
    if (!srtPreview) {
      setPreviewLoading(true)
      try {
        const srt = await getTranslatedSrt(projectSeq, spaceSeq, 'translated')
        setSrtPreview(srt)
      } catch (err) {
        addToast({
          type: 'error',
          title: 'SRT 미리보기 실패',
          message: err instanceof Error ? err.message : '',
        })
        return
      } finally {
        setPreviewLoading(false)
      }
    }
    setShowPreview(true)
  }, [showPreview, srtPreview, projectSeq, spaceSeq, addToast])

  const handlePushToYouTube = useCallback(async () => {
    if (!youtubeVideoId) return
    setPushingToYT(true)
    try {
      const srtContent = await getTranslatedSrt(projectSeq, spaceSeq, 'translated')
      await ytUploadCaption({
        videoId: youtubeVideoId,
        language: toBcp47(langCode),
        name: lang?.name || langCode,
        srtContent,
        replace: true,
      })
      addToast({
        type: 'success',
        title: 'YouTube 자막 적용 완료',
        message: '기존 자막을 삭제하고 Perso 자막을 그대로 업로드했습니다.',
      })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'YouTube 자막 적용 실패',
        message: err instanceof Error ? err.message : '',
      })
    } finally {
      setPushingToYT(false)
    }
  }, [youtubeVideoId, projectSeq, spaceSeq, langCode, lang, addToast])

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-800">
      <button
        type="button"
        onClick={loadScript}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{lang?.flag}</span>
          <span className="text-sm font-medium text-surface-900 dark:text-white">
            {lang?.name} 자막 · 스크립트
          </span>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
        ) : open ? (
          <ChevronUp className="h-4 w-4 text-surface-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-surface-400" />
        )}
      </button>

      {open && sentences && (
        <div className="space-y-3 border-t border-surface-200 p-3 dark:border-surface-800">
          <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <p className="font-medium">편집 가이드</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>
                <strong>번역 텍스트</strong>를 수정하고 저장하면 Perso 서버에 반영되며,
                오디오 재생성 후 자막(SRT)도 함께 갱신됩니다.
              </li>
              <li>
                <strong>SRT/YouTube 자막</strong>은 Perso가 생성한 파일을 그대로 사용합니다
                (타이밍은 Perso 기준, 클라이언트에서 별도 변환 없음).
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadSRT} loading={downloading}>
              <Download className="h-3.5 w-3.5" />
              SRT 다운로드
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTogglePreview}
              loading={previewLoading}
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              SRT 미리보기
            </Button>
            {youtubeVideoId && (
              <Button
                size="sm"
                variant="primary"
                onClick={handlePushToYouTube}
                loading={pushingToYT}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                YouTube에 자막 적용
              </Button>
            )}
          </div>
          {!youtubeVideoId && (
            <p className="text-xs text-surface-400">
              이 언어의 영상이 YouTube에 업로드된 뒤 &ldquo;YouTube에 자막 적용&rdquo; 버튼이 활성화됩니다.
            </p>
          )}

          {showPreview && (
            <textarea
              readOnly
              value={srtPreview}
              rows={12}
              className="w-full resize-y rounded-md border border-surface-300 bg-surface-50 px-3 py-2 font-mono text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
            />
          )}

          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {sentences.length === 0 && (
              <p className="py-4 text-center text-sm text-surface-500">
                표시할 문장이 없습니다.
              </p>
            )}
            {sentences.map((s) => (
              <SentenceRow
                key={s.sentenceSeq}
                sentence={s}
                projectSeq={projectSeq}
                onPatch={handlePatch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
