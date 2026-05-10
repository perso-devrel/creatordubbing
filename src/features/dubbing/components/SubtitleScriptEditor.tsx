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
        title: t('features.dubbing.components.subtitleScriptEditor.saved'),
        message: t('features.dubbing.components.subtitleScriptEditor.yourTranslationEditHasBeenSaved'),
      })
    } catch {
      addToast({ type: 'error', title: t('features.dubbing.components.subtitleScriptEditor.saveFailed') })
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
        title: t('features.dubbing.components.subtitleScriptEditor.audioRegenerationStarted'),
        message: t('features.dubbing.components.subtitleScriptEditor.theDubbedVideoWillUpdateWhenItFinishes'),
      })
    } catch {
      addToast({ type: 'error', title: t('features.dubbing.components.subtitleScriptEditor.audioRegenerationFailed') })
    } finally {
      setRegenerating(false)
    }
  }, [dirty, handleSave, projectSeq, sentence.audioSentenceSeq, sentence.editedTranslatedText, addToast, t])

  return (
    <div className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
      <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-300">
        <span className="font-mono">
          {formatShortTime(sentence.startMs)} → {formatShortTime(sentence.endMs)}
        </span>
        {sentence.speakerLabel && (
          <span className="rounded bg-surface-100 px-1.5 py-0.5 dark:bg-surface-800">
            {sentence.speakerLabel}
          </span>
        )}
      </div>
      <p className="text-xs italic text-surface-500 dark:text-surface-300">&ldquo;{sentence.originalText}&rdquo;</p>
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
            {t('features.dubbing.components.subtitleScriptEditor.save')}
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
          {t('features.dubbing.components.subtitleScriptEditor.regenerateAudio')}
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
        <span className="text-surface-500 dark:text-surface-300">&rarr;</span>
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
      addToast({ type: 'error', title: t('features.dubbing.components.subtitleScriptEditor.failedToLoadDialogue') })
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
        title: t('features.dubbing.components.subtitleScriptEditor.failedToLoadCaptions'),
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
        title: t('features.dubbing.components.subtitleScriptEditor.captionsRestoredToTheGeneratedVersion'),
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
        title: t('features.dubbing.components.subtitleScriptEditor.youTubeCaptionsUpdated'),
        message: t('features.dubbing.components.subtitleScriptEditor.existingCaptionsWereReplacedWithYourEditedCaptions'),
      })
    } catch (err) {
      addToast({
        type: 'error',
        title: t('features.dubbing.components.subtitleScriptEditor.failedToUpdateYouTubeCaptions'),
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
            {t('features.dubbing.components.subtitleScriptEditor.valueCaptionsAndDialogue', { languageName: languageName })}
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
                {t('features.dubbing.components.subtitleScriptEditor.editDialogue')}
              </h4>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-300">
                {t('features.dubbing.components.subtitleScriptEditor.editTranslatedLinesThenRegenerateAudioToApply')}
              </p>
            </div>

            {scriptLoading && (
              <div className="flex items-center gap-2 py-4 text-sm text-surface-500 dark:text-surface-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('features.dubbing.components.subtitleScriptEditor.loadingDialogue')}
              </div>
            )}

            {!scriptLoading && sentences && sentences.length === 0 && (
              <p className="py-2 text-xs text-surface-500 dark:text-surface-300">{t('features.dubbing.components.subtitleScriptEditor.noLinesToShow')}</p>
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
                {t('features.dubbing.components.subtitleScriptEditor.editCaptionFile')}
              </h4>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-300">
                {t('features.dubbing.components.subtitleScriptEditor.editTheGeneratedCaptionTextAndTimingThese')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload} loading={downloading} disabled={!cues}>
                <Download className="h-3.5 w-3.5" />
                {t('features.dubbing.components.subtitleScriptEditor.downloadCaptions')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPreview((v) => !v)} disabled={!cues}>
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {t('features.dubbing.components.subtitleScriptEditor.previewCaptions')}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleResetSrt} loading={resetting} disabled={!cues}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t('features.dubbing.components.subtitleScriptEditor.restoreGeneratedCaptions')}
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
                  {t('features.dubbing.components.subtitleScriptEditor.updateYouTubeCaptions')}
                </Button>
              )}
            </div>
            {!youtubeVideoId && (
              <p className="text-xs text-surface-500 dark:text-surface-300">
                {t('features.dubbing.components.subtitleScriptEditor.theYouTubeCaptionButtonBecomesAvailableAfterThis')}
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
              <div className="flex items-center gap-2 py-4 text-sm text-surface-500 dark:text-surface-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('features.dubbing.components.subtitleScriptEditor.loadingCaptions')}
              </div>
            )}

            {!srtLoading && cues && cues.length === 0 && (
              <p className="py-2 text-xs text-surface-500 dark:text-surface-300">{t('features.dubbing.components.subtitleScriptEditor.theCaptionFileIsEmpty')}</p>
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
