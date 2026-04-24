'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, Download, Eye, EyeOff, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { getLanguageByCode } from '@/utils/languages'
import { useNotificationStore } from '@/stores/notificationStore'
import { getProjectScript, updateSentenceTranslation } from '@/lib/api-client'
import { toSRT } from '@/utils/srt'
import type { ScriptSentence } from '@/lib/perso/types'

function formatMs(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const remainder = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(remainder).padStart(3, '0')}`
}

function parseTimeToMs(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2}):(\d{2}),(\d{3})$/)
  if (!match) return null
  const [, h, m, s, ms] = match
  return Number(h) * 3600000 + Number(m) * 60000 + Number(s) * 1000 + Number(ms)
}

interface EditableSentence extends ScriptSentence {
  editedTranslatedText: string
  editedStartMs: number
  editedEndMs: number
}

interface SubtitleRowProps {
  sentence: EditableSentence
  projectSeq: number
  onUpdate: (sentenceSeq: number, patch: Partial<Pick<EditableSentence, 'editedTranslatedText' | 'editedStartMs' | 'editedEndMs'>>) => void
}

function SubtitleRow({ sentence, projectSeq, onUpdate }: SubtitleRowProps) {
  const addToast = useNotificationStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [startTimeStr, setStartTimeStr] = useState(formatMs(sentence.editedStartMs))
  const [endTimeStr, setEndTimeStr] = useState(formatMs(sentence.editedEndMs))

  const textDirty = sentence.editedTranslatedText !== sentence.translatedText

  const handleSaveText = useCallback(async () => {
    setSaving(true)
    try {
      await updateSentenceTranslation(projectSeq, sentence.sentenceSeq, sentence.editedTranslatedText)
      addToast({ type: 'success', title: '저장됨', message: '번역이 업데이트되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '저장 실패' })
    } finally {
      setSaving(false)
    }
  }, [projectSeq, sentence.sentenceSeq, sentence.editedTranslatedText, addToast])

  const handleStartTimeBlur = useCallback(() => {
    const ms = parseTimeToMs(startTimeStr)
    if (ms !== null) {
      onUpdate(sentence.sentenceSeq, { editedStartMs: ms })
    } else {
      setStartTimeStr(formatMs(sentence.editedStartMs))
    }
  }, [startTimeStr, sentence.sentenceSeq, sentence.editedStartMs, onUpdate])

  const handleEndTimeBlur = useCallback(() => {
    const ms = parseTimeToMs(endTimeStr)
    if (ms !== null) {
      onUpdate(sentence.sentenceSeq, { editedEndMs: ms })
    } else {
      setEndTimeStr(formatMs(sentence.editedEndMs))
    }
  }, [endTimeStr, sentence.sentenceSeq, sentence.editedEndMs, onUpdate])

  return (
    <div className="rounded-lg border border-surface-200 p-3 space-y-2 dark:border-surface-800">
      <div className="flex items-center gap-2 text-xs">
        <input
          type="text"
          value={startTimeStr}
          onChange={(e) => setStartTimeStr(e.target.value)}
          onBlur={handleStartTimeBlur}
          className="w-28 rounded border border-surface-300 bg-white px-2 py-0.5 text-xs font-mono text-surface-700 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
        />
        <span className="text-surface-400">&rarr;</span>
        <input
          type="text"
          value={endTimeStr}
          onChange={(e) => setEndTimeStr(e.target.value)}
          onBlur={handleEndTimeBlur}
          className="w-28 rounded border border-surface-300 bg-white px-2 py-0.5 text-xs font-mono text-surface-700 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
        />
        {sentence.speakerLabel && (
          <span className="rounded bg-surface-100 px-1.5 py-0.5 text-surface-400 dark:bg-surface-800">{sentence.speakerLabel}</span>
        )}
      </div>
      <p className="text-xs text-surface-500 italic">&ldquo;{sentence.originalText}&rdquo;</p>
      <textarea
        value={sentence.editedTranslatedText}
        onChange={(e) => onUpdate(sentence.sentenceSeq, { editedTranslatedText: e.target.value })}
        rows={2}
        className="w-full resize-none rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
      />
      {textDirty && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handleSaveText} loading={saving}>
            <Save className="h-3.5 w-3.5" />
            서버에 저장
          </Button>
        </div>
      )}
    </div>
  )
}

interface SubtitleEditorProps {
  langCode: string
  projectSeq: number
  spaceSeq: number
}

export function SubtitleEditor({ langCode, projectSeq, spaceSeq }: SubtitleEditorProps) {
  const addToast = useNotificationStore((s) => s.addToast)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sentences, setSentences] = useState<EditableSentence[] | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const lang = getLanguageByCode(langCode)

  const loadScript = useCallback(async () => {
    if (sentences) { setOpen((v) => !v); return }
    setLoading(true)
    setOpen(true)
    try {
      const data = await getProjectScript(projectSeq, spaceSeq)
      const list: ScriptSentence[] = Array.isArray(data) ? data : []
      setSentences(list.map((s) => ({
        ...s,
        editedTranslatedText: s.translatedText,
        editedStartMs: s.startMs,
        editedEndMs: s.endMs,
      })))
    } catch {
      addToast({ type: 'error', title: '스크립트 로드 실패' })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [sentences, projectSeq, spaceSeq, addToast])

  const handleUpdate = useCallback((sentenceSeq: number, patch: Partial<Pick<EditableSentence, 'editedTranslatedText' | 'editedStartMs' | 'editedEndMs'>>) => {
    setSentences((prev) =>
      prev?.map((s) => s.sentenceSeq === sentenceSeq ? { ...s, ...patch } : s) ?? null
    )
  }, [])

  const handleDownloadSRT = useCallback(() => {
    if (!sentences) return
    const srtContent = toSRT(sentences.map((s) => ({
      startMs: s.editedStartMs,
      endMs: s.editedEndMs,
      translatedText: s.editedTranslatedText,
    })))
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${lang?.name || langCode}_${langCode}.srt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [sentences, lang, langCode])

  const srtPreview = sentences
    ? toSRT(sentences.map((s) => ({
        startMs: s.editedStartMs,
        endMs: s.editedEndMs,
        translatedText: s.editedTranslatedText,
      })))
    : ''

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-800">
      <button
        onClick={loadScript}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{lang?.flag}</span>
          <span className="text-sm font-medium text-surface-900 dark:text-white">{lang?.name} 자막</span>
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
        <div className="border-t border-surface-200 p-3 space-y-3 dark:border-surface-800">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadSRT}>
              <Download className="h-3.5 w-3.5" />
              SRT 다운로드
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              SRT 미리보기
            </Button>
          </div>

          {showPreview && (
            <textarea
              readOnly
              value={srtPreview}
              rows={12}
              className="w-full resize-y rounded-md border border-surface-300 bg-surface-50 px-3 py-2 font-mono text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
            />
          )}

          <div className="max-h-96 overflow-y-auto space-y-2">
            <p className="text-xs text-surface-400 mb-3">
              타이밍과 번역 텍스트를 수정한 뒤 SRT를 다운로드하세요. 타이밍 변경은 SRT 내보내기에만 반영됩니다.
              번역 텍스트는 &ldquo;서버에 저장&rdquo; 버튼으로 서버에 반영할 수 있습니다.
            </p>
            {sentences.length === 0 && (
              <p className="text-sm text-surface-500 py-4 text-center">
                표시할 자막이 없습니다.
              </p>
            )}
            {sentences.map((s) => (
              <SubtitleRow
                key={s.sentenceSeq}
                sentence={s}
                projectSeq={projectSeq}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
