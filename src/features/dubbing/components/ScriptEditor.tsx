'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, RotateCcw, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { getLanguageByCode } from '@/utils/languages'
import { useNotificationStore } from '@/stores/notificationStore'
import {
  getProjectScript,
  updateSentenceTranslation,
  regenerateSentenceAudio,
} from '@/lib/api-client'
import type { ScriptSentence } from '@/lib/perso/types'

function formatMs(ms: number | undefined | null) {
  if (ms == null || isNaN(ms)) return '0:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

interface SentenceRowProps {
  sentence: ScriptSentence
  projectSeq: number
  onRegenerate: (audioSentenceSeq: number) => Promise<void>
}

function SentenceRow({ sentence, projectSeq, onRegenerate }: SentenceRowProps) {
  const addToast = useNotificationStore((s) => s.addToast)
  const [text, setText] = useState(sentence.translatedText)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const isDirty = text !== sentence.translatedText

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateSentenceTranslation(projectSeq, sentence.sentenceSeq, text)
      addToast({ type: 'success', title: '저장됨', message: '번역이 업데이트되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '저장 실패' })
    } finally {
      setSaving(false)
    }
  }, [projectSeq, sentence.sentenceSeq, text, addToast])

  const handleRegenerate = useCallback(async () => {
    if (isDirty) {
      // Save first if there are unsaved changes
      await handleSave()
    }
    setRegenerating(true)
    try {
      await onRegenerate(sentence.audioSentenceSeq)
      addToast({ type: 'success', title: '재생성 요청됨', message: '오디오가 재생성됩니다. 완료 후 영상을 다시 다운로드하세요.' })
    } catch {
      addToast({ type: 'error', title: '재생성 실패' })
    } finally {
      setRegenerating(false)
    }
  }, [isDirty, handleSave, onRegenerate, sentence.audioSentenceSeq, addToast])

  return (
    <div className="rounded-lg border border-surface-200 p-3 space-y-2 dark:border-surface-800">
      <div className="flex items-center gap-2 text-xs text-surface-400">
        <span>{formatMs(sentence.startMs)} → {formatMs(sentence.endMs)}</span>
        {sentence.speakerLabel && (
          <span className="rounded bg-surface-100 px-1.5 py-0.5 dark:bg-surface-800">{sentence.speakerLabel}</span>
        )}
      </div>
      <p className="text-xs text-surface-500 italic">&ldquo;{sentence.originalText}&rdquo;</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
      />
      <div className="flex justify-end gap-2">
        {isDirty && (
          <Button size="sm" variant="outline" onClick={handleSave} loading={saving}>
            <Save className="h-3.5 w-3.5" />
            저장
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleRegenerate} loading={regenerating} disabled={saving}>
          <RotateCcw className="h-3.5 w-3.5" />
          오디오 재생성
        </Button>
      </div>
    </div>
  )
}

interface ScriptEditorProps {
  langCode: string
  projectSeq: number
  spaceSeq: number
}

export function ScriptEditor({ langCode, projectSeq, spaceSeq }: ScriptEditorProps) {
  const addToast = useNotificationStore((s) => s.addToast)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sentences, setSentences] = useState<ScriptSentence[] | null>(null)

  const lang = getLanguageByCode(langCode)

  const loadScript = useCallback(async () => {
    if (sentences) { setOpen((v) => !v); return }
    setLoading(true)
    setOpen(true)
    try {
      const data = await getProjectScript(projectSeq, spaceSeq)
      // Perso may return [] directly, or wrap sentences in an object envelope —
      // normalize so `.map` below can never crash.
      const list: ScriptSentence[] = Array.isArray(data)
        ? data
        : Array.isArray((data as { sentences?: ScriptSentence[] } | null)?.sentences)
          ? (data as { sentences: ScriptSentence[] }).sentences
          : []
      setSentences(list)
    } catch {
      addToast({ type: 'error', title: '스크립트 로드 실패' })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [sentences, projectSeq, spaceSeq, addToast])

  const handleRegenerate = useCallback(async (audioSentenceSeq: number) => {
    await regenerateSentenceAudio(projectSeq, audioSentenceSeq)
  }, [projectSeq])

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-800">
      <button
        onClick={loadScript}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{lang?.flag}</span>
          <span className="text-sm font-medium text-surface-900 dark:text-white">{lang?.name} 스크립트 수정</span>
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
        <div className="border-t border-surface-200 p-3 space-y-2 dark:border-surface-800 max-h-96 overflow-y-auto">
          <p className="text-xs text-surface-400 mb-3">
            번역 텍스트를 수정하고 저장한 뒤 &ldquo;오디오 재생성&rdquo;을 클릭하면 해당 문장의 더빙 오디오가 다시 생성됩니다.
            재생성 후에는 영상을 다시 다운로드하거나 YouTube에 다시 업로드하세요.
          </p>
          {sentences.length === 0 && (
            <p className="text-sm text-surface-500 py-4 text-center">
              표시할 스크립트가 없습니다.
            </p>
          )}
          {sentences.map((s) => (
            <SentenceRow
              key={s.sentenceSeq}
              sentence={s}
              projectSeq={projectSeq}
              onRegenerate={handleRegenerate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
