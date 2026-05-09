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
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'

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
  const t = useLocaleText()
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
      addToast({
        type: 'success',
        title: t({ ko: '저장 완료', en: 'Saved' }),
        message: t({ ko: '수정한 번역을 저장했습니다.', en: 'Your translation edit has been saved.' }),
      })
    } catch {
      addToast({ type: 'error', title: t({ ko: '저장 실패', en: 'Save failed' }) })
    } finally {
      setSaving(false)
    }
  }, [projectSeq, sentence.sentenceSeq, sentence.editedTranslatedText, onPatch, addToast, t])

  const handleRegen = useCallback(async () => {
    if (dirty) await handleSave()
    setRegenerating(true)
    try {
      await regenerateSentenceAudio(projectSeq, sentence.audioSentenceSeq, sentence.editedTranslatedText)
      addToast({
        type: 'success',
        title: t({ ko: '오디오 다시 만들기 시작', en: 'Audio regeneration started' }),
        message: t({ ko: '완료되면 더빙 영상에 반영됩니다.', en: 'The dubbed video will update when it finishes.' }),
      })
    } catch {
      addToast({ type: 'error', title: t({ ko: '오디오 다시 만들기 실패', en: 'Audio regeneration failed' }) })
    } finally {
      setRegenerating(false)
    }
  }, [dirty, handleSave, projectSeq, sentence.audioSentenceSeq, sentence.editedTranslatedText, addToast, t])

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
            {t({ ko: '저장', en: 'Save' })}
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
          {t({ ko: '오디오 다시 만들기', en: 'Regenerate audio' })}
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
  const locale = useAppLocale()
  const t = useLocaleText()
  const addToast = useNotificationStore((s) => s.addToast)
  const lang = getLanguageByCode(langCode)
  const languageName = lang ? (locale === 'ko' ? lang.nativeName : lang.name) : langCode
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
      addToast({ type: 'error', title: t({ ko: '대사를 불러오지 못했습니다', en: 'Failed to load dialogue' }) })
    } finally {
      setScriptLoading(false)
    }
  }, [projectSeq, spaceSeq, addToast, t])

  const loadSrt = useCallback(async () => {
    setSrtLoading(true)
    try {
      const text = await getTranslatedSrt(projectSeq, spaceSeq, 'translated')
      const parsed = parseSRT(text)
      setCues(parsed.map((c, i) => ({ ...c, id: i })))
    } catch (err) {
      addToast({
        type: 'error',
        title: t({ ko: '자막 파일을 불러오지 못했습니다', en: 'Failed to load captions' }),
        message: err instanceof Error ? err.message : '',
      })
    } finally {
      setSrtLoading(false)
    }
  }, [projectSeq, spaceSeq, addToast, t])

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
      addToast({
        type: 'success',
        title: t({ ko: '자막을 처음 생성된 상태로 되돌렸습니다', en: 'Captions restored to the generated version' }),
      })
    } finally {
      setResetting(false)
    }
  }, [loadSrt, addToast, t])

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
        name: '',
        srtContent: srt,
        replace: true,
      })
      addToast({
        type: 'success',
        title: t({ ko: 'YouTube 자막 적용 완료', en: 'YouTube captions updated' }),
        message: t({ ko: '기존 자막을 교체하고 편집한 자막을 업로드했습니다.', en: 'Existing captions were replaced with your edited captions.' }),
      })
    } catch (err) {
      addToast({
        type: 'error',
        title: t({ ko: 'YouTube 자막 적용 실패', en: 'Failed to update YouTube captions' }),
        message: err instanceof Error ? err.message : '',
      })
    } finally {
      setPushingToYT(false)
    }
  }, [youtubeVideoId, buildCurrentSrt, langCode, addToast, t])

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
            {t({ ko: `${languageName} 자막 · 대사`, en: `${languageName} captions and dialogue` })}
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
                {t({ ko: '대사 수정', en: 'Edit dialogue' })}
              </h4>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t({
                  ko: '번역 문장을 고친 뒤 오디오를 다시 만들면 더빙 음성에 반영됩니다. 대사 시간은 여기서 변경할 수 없습니다.',
                  en: 'Edit translated lines, then regenerate audio to apply the change to the dubbed voice. Dialogue timing cannot be changed here.',
                })}
              </p>
            </div>

            {scriptLoading && (
              <div className="flex items-center gap-2 py-4 text-sm text-surface-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t({ ko: '대사를 불러오는 중...', en: 'Loading dialogue...' })}
              </div>
            )}

            {!scriptLoading && sentences && sentences.length === 0 && (
              <p className="py-2 text-xs text-surface-500">{t({ ko: '표시할 문장이 없습니다.', en: 'No lines to show.' })}</p>
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
                {t({ ko: '자막 파일 편집', en: 'Edit caption file' })}
              </h4>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t({
                  ko: '생성된 자막 파일의 문장과 시간을 수정할 수 있습니다. 이 변경은 자막 다운로드와 YouTube 자막에만 적용됩니다.',
                  en: 'Edit the generated caption text and timing. These changes apply only to caption downloads and YouTube captions.',
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload} loading={downloading} disabled={!cues}>
                <Download className="h-3.5 w-3.5" />
                {t({ ko: '자막 파일 받기', en: 'Download captions' })}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPreview((v) => !v)} disabled={!cues}>
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {t({ ko: '자막 미리보기', en: 'Preview captions' })}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleResetSrt} loading={resetting} disabled={!cues}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t({ ko: '처음 생성된 자막으로 되돌리기', en: 'Restore generated captions' })}
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
                  {t({ ko: 'YouTube에 자막 적용', en: 'Update YouTube captions' })}
                </Button>
              )}
            </div>
            {!youtubeVideoId && (
              <p className="text-xs text-surface-400">
                {t({
                  ko: '이 언어의 영상이 YouTube에 업로드되면 자막 적용 버튼이 활성화됩니다.',
                  en: 'The YouTube caption button becomes available after this language is uploaded.',
                })}
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
                {t({ ko: '자막 파일을 불러오는 중...', en: 'Loading captions...' })}
              </div>
            )}

            {!srtLoading && cues && cues.length === 0 && (
              <p className="py-2 text-xs text-surface-500">{t({ ko: '자막 파일이 비어 있습니다.', en: 'The caption file is empty.' })}</p>
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
