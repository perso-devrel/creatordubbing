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
import {
  buildSRT,
  msToSRTTime,
  parseSRT,
  srtTimeToMs,
  type SrtCue,
} from '@/utils/srt'
import type { ScriptSentence } from '@/lib/perso/types'

// ──────────────────────────────────────────────────────────────────────────
// 표시용: m:ss 짧은 포맷
// ──────────────────────────────────────────────────────────────────────────

function formatShortTime(ms: number | undefined | null): string {
  if (ms == null || isNaN(ms)) return '0:00'
  const safe = Math.max(0, Math.floor(ms))
  const m = Math.floor(safe / 60000)
  const s = Math.floor((safe % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ──────────────────────────────────────────────────────────────────────────
// Section 1: 스크립트 (재더빙용) — 텍스트만 편집, Perso에 저장 + 오디오 재생성
// ──────────────────────────────────────────────────────────────────────────

interface EditableSentence extends ScriptSentence {
  editedTranslatedText: string
  savedTranslatedText: string
}

function ScriptRow({
  sentence,
  projectSeq,
  onPatch,
}: {
  sentence: EditableSentence
  projectSeq: number
  onPatch: (
    seq: number,
    patch: Partial<Pick<EditableSentence, 'editedTranslatedText' | 'savedTranslatedText'>>,
  ) => void
}) {
  const addToast = useNotificationStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const dirty = sentence.editedTranslatedText !== sentence.savedTranslatedText

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateSentenceTranslation(
        projectSeq,
        sentence.sentenceSeq,
        sentence.editedTranslatedText,
      )
      onPatch(sentence.sentenceSeq, { savedTranslatedText: sentence.editedTranslatedText })
      addToast({ type: 'success', title: '저장됨', message: '번역이 Perso에 반영되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '저장 실패' })
    } finally {
      setSaving(false)
    }
  }, [projectSeq, sentence.sentenceSeq, sentence.editedTranslatedText, onPatch, addToast])

  const handleRegen = useCallback(async () => {
    if (dirty) await handleSave()
    setRegenerating(true)
    try {
      await regenerateSentenceAudio(projectSeq, sentence.audioSentenceSeq)
      addToast({
        type: 'success',
        title: '재생성 요청됨',
        message: '오디오가 재생성됩니다. 완료 후 더빙 영상이 갱신됩니다.',
      })
    } catch {
      addToast({ type: 'error', title: '재생성 실패' })
    } finally {
      setRegenerating(false)
    }
  }, [dirty, handleSave, projectSeq, sentence.audioSentenceSeq, addToast])

  return (
    <div className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
      <div className="flex items-center gap-2 text-xs text-surface-400">
        <span className="font-mono">
          {formatShortTime(sentence.startMs)} → {formatShortTime(sentence.endMs)}
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
        {dirty && (
          <Button size="sm" variant="outline" onClick={handleSave} loading={saving}>
            <Save className="h-3.5 w-3.5" />
            저장
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegen}
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

// ──────────────────────────────────────────────────────────────────────────
// Section 2: 자막 SRT — Perso의 SRT를 받아 시간/텍스트 편집, 다운로드/YT 적용
// ──────────────────────────────────────────────────────────────────────────

interface EditableCue extends SrtCue {
  id: number
}

function SrtRow({
  cue,
  onPatch,
}: {
  cue: EditableCue
  onPatch: (id: number, patch: Partial<SrtCue>) => void
}) {
  const [startStr, setStartStr] = useState(msToSRTTime(cue.startMs))
  const [endStr, setEndStr] = useState(msToSRTTime(cue.endMs))

  const commitStart = useCallback(() => {
    const ms = srtTimeToMs(startStr)
    if (ms !== null) onPatch(cue.id, { startMs: ms })
    else setStartStr(msToSRTTime(cue.startMs))
  }, [startStr, cue.id, cue.startMs, onPatch])

  const commitEnd = useCallback(() => {
    const ms = srtTimeToMs(endStr)
    if (ms !== null) onPatch(cue.id, { endMs: ms })
    else setEndStr(msToSRTTime(cue.endMs))
  }, [endStr, cue.id, cue.endMs, onPatch])

  return (
    <div className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input
          type="text"
          value={startStr}
          onChange={(e) => setStartStr(e.target.value)}
          onBlur={commitStart}
          className="w-32 rounded border border-surface-300 bg-white px-2 py-0.5 font-mono text-xs text-surface-700 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
        />
        <span className="text-surface-400">&rarr;</span>
        <input
          type="text"
          value={endStr}
          onChange={(e) => setEndStr(e.target.value)}
          onBlur={commitEnd}
          className="w-32 rounded border border-surface-300 bg-white px-2 py-0.5 font-mono text-xs text-surface-700 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
        />
      </div>
      <textarea
        value={cue.text}
        onChange={(e) => onPatch(cue.id, { text: e.target.value })}
        rows={2}
        className="w-full resize-none rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────────────────────────────────

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
  const lang = getLanguageByCode(langCode)
  const [open, setOpen] = useState(false)

  // Script section
  const [sentences, setSentences] = useState<EditableSentence[] | null>(null)
  const [scriptLoading, setScriptLoading] = useState(false)

  // SRT section
  const [cues, setCues] = useState<EditableCue[] | null>(null)
  const [srtLoading, setSrtLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pushingToYT, setPushingToYT] = useState(false)
  const [resetting, setResetting] = useState(false)

  const loadScript = useCallback(async () => {
    setScriptLoading(true)
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
    } finally {
      setScriptLoading(false)
    }
  }, [projectSeq, spaceSeq, addToast])

  const loadSrt = useCallback(async () => {
    setSrtLoading(true)
    try {
      const text = await getTranslatedSrt(projectSeq, spaceSeq, 'translated')
      const parsed = parseSRT(text)
      setCues(parsed.map((c, i) => ({ ...c, id: i })))
    } catch (err) {
      addToast({
        type: 'error',
        title: '자막(SRT) 로드 실패',
        message: err instanceof Error ? err.message : '',
      })
    } finally {
      setSrtLoading(false)
    }
  }, [projectSeq, spaceSeq, addToast])

  const handleToggle = useCallback(() => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (!sentences) loadScript()
    if (!cues) loadSrt()
  }, [open, sentences, cues, loadScript, loadSrt])

  const patchSentence = useCallback(
    (
      seq: number,
      patch: Partial<Pick<EditableSentence, 'editedTranslatedText' | 'savedTranslatedText'>>,
    ) => {
      setSentences((prev) =>
        prev?.map((s) => (s.sentenceSeq === seq ? { ...s, ...patch } : s)) ?? null,
      )
    },
    [],
  )

  const patchCue = useCallback((id: number, patch: Partial<SrtCue>) => {
    setCues((prev) => prev?.map((c) => (c.id === id ? { ...c, ...patch } : c)) ?? null)
  }, [])

  const handleResetSrt = useCallback(async () => {
    setResetting(true)
    try {
      await loadSrt()
      addToast({ type: 'success', title: '자막을 Perso 원본으로 되돌렸습니다.' })
    } finally {
      setResetting(false)
    }
  }, [loadSrt, addToast])

  const buildCurrentSrt = useCallback((): string => {
    if (!cues) return ''
    return buildSRT(cues)
  }, [cues])

  const handleDownload = useCallback(() => {
    const srt = buildCurrentSrt()
    if (!srt) return
    setDownloading(true)
    try {
      const blob = new Blob([srt], { type: 'application/x-subrip;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${lang?.name || langCode}_${langCode}.srt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }, [buildCurrentSrt, lang, langCode])

  const handlePushToYouTube = useCallback(async () => {
    if (!youtubeVideoId) return
    const srt = buildCurrentSrt()
    if (!srt) return
    setPushingToYT(true)
    try {
      await ytUploadCaption({
        videoId: youtubeVideoId,
        language: toBcp47(langCode),
        name: lang?.name || langCode,
        srtContent: srt,
        replace: true,
      })
      addToast({
        type: 'success',
        title: 'YouTube 자막 적용 완료',
        message: '기존 자막을 삭제하고 편집한 SRT를 업로드했습니다.',
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
  }, [youtubeVideoId, buildCurrentSrt, langCode, lang, addToast])

  const srtPreview = cues ? buildCurrentSrt() : ''

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-800">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{lang?.flag}</span>
          <span className="text-sm font-medium text-surface-900 dark:text-white">
            {lang?.name} 자막 · 스크립트
          </span>
        </div>
        {scriptLoading || srtLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
        ) : open ? (
          <ChevronUp className="h-4 w-4 text-surface-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-surface-400" />
        )}
      </button>

      {open && (
        <div className="space-y-6 border-t border-surface-200 p-3 dark:border-surface-800">
          {/* ─── Script section (re-dub only) ─── */}
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
                📝 스크립트 (재더빙용)
              </h4>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                번역 텍스트를 수정하고 &ldquo;오디오 재생성&rdquo;을 누르면 Perso가 더빙 오디오를
                다시 만듭니다. 시간은 Perso가 결정하므로 여기서는 변경할 수 없습니다.
              </p>
            </div>

            {scriptLoading && (
              <div className="flex items-center gap-2 py-4 text-sm text-surface-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                스크립트를 불러오는 중...
              </div>
            )}

            {!scriptLoading && sentences && sentences.length === 0 && (
              <p className="py-2 text-xs text-surface-500">표시할 문장이 없습니다.</p>
            )}

            {!scriptLoading && sentences && sentences.length > 0 && (
              <div className="max-h-[24rem] space-y-2 overflow-y-auto">
                {sentences.map((s) => (
                  <ScriptRow
                    key={s.sentenceSeq}
                    sentence={s}
                    projectSeq={projectSeq}
                    onPatch={patchSentence}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ─── SRT section (caption file edit) ─── */}
          <section className="space-y-3 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
                🎬 자막 SRT 편집
              </h4>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                Perso가 생성한 SRT 파일을 그대로 불러와 편집할 수 있습니다.
                여기서의 변경은 SRT 다운로드와 YouTube 자막 트랙에만 반영되며,
                Perso 더빙 오디오에는 영향을 주지 않습니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload} loading={downloading} disabled={!cues}>
                <Download className="h-3.5 w-3.5" />
                SRT 다운로드
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPreview((v) => !v)} disabled={!cues}>
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                SRT 미리보기
              </Button>
              <Button size="sm" variant="ghost" onClick={handleResetSrt} loading={resetting} disabled={!cues}>
                <RotateCcw className="h-3.5 w-3.5" />
                Perso 원본으로 되돌리기
              </Button>
              {youtubeVideoId && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handlePushToYouTube}
                  loading={pushingToYT}
                  disabled={!cues}
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

            {srtLoading && (
              <div className="flex items-center gap-2 py-4 text-sm text-surface-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                SRT를 불러오는 중...
              </div>
            )}

            {!srtLoading && cues && cues.length === 0 && (
              <p className="py-2 text-xs text-surface-500">자막 파일이 비어 있습니다.</p>
            )}

            {!srtLoading && cues && cues.length > 0 && (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto">
                {cues.map((c) => (
                  <SrtRow key={c.id} cue={c} onPatch={patchCue} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
