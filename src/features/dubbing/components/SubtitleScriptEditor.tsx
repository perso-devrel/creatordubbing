'use client'

import { useCallback, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  RotateCcw,
  Save,
  UploadCloud,
  Video,
} from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { getLanguageByCode, toBcp47 } from '@/utils/languages'
import { useNotificationStore } from '@/stores/notificationStore'
import {
  getProjectScript,
  getTranslatedSrt,
  getGeneratedSttCaptionSrt,
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
import { cn } from '@/utils/cn'
import type { PrivacyStatus } from '@/features/dubbing/types/dubbing.types'

const ENABLE_SENTENCE_LEVEL_AUDIO_REGENERATION = false

type EditorTab = 'dialogue' | 'captions'

function formatShortTime(ms: number | undefined | null): string {
  if (ms == null || isNaN(ms)) return '0:00'
  const safe = Math.max(0, Math.floor(ms))
  const m = Math.floor(safe / 60000)
  const s = Math.floor((safe % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

interface EditableSentence extends ScriptSentence {
  editedTranslatedText: string
  savedTranslatedText: string
}

function ScriptRow({
  sentence,
  projectSeq,
  disabled,
  onPatch,
}: {
  sentence: EditableSentence
  projectSeq: number
  disabled?: boolean
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

  const handleSave = useCallback(async (): Promise<boolean> => {
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
      return true
    } catch {
      addToast({ type: 'error', title: t('features.dubbing.components.subtitleScriptEditor.saveFailed') })
      return false
    } finally {
      setSaving(false)
    }
  }, [projectSeq, sentence.sentenceSeq, sentence.editedTranslatedText, onPatch, addToast, t])

  const handleRegen = useCallback(async () => {
    if (dirty) {
      const saved = await handleSave()
      if (!saved) return
    }

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
      <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-surface-300">
        <span className="font-mono">
          {formatShortTime(sentence.startMs)} <span aria-hidden="true">→</span> {formatShortTime(sentence.endMs)}
        </span>
        {sentence.speakerLabel && (
          <span className="rounded bg-surface-100 px-1.5 py-0.5 dark:bg-surface-800">
            {sentence.speakerLabel}
          </span>
        )}
        {dirty && (
          <Badge variant="warning" className="px-1.5 py-0 text-[11px]">
            {t('features.dubbing.components.subtitleScriptEditor.dialogueChanged')}
          </Badge>
        )}
      </div>
      <p className="text-xs italic text-surface-500 dark:text-surface-300">&ldquo;{sentence.originalText}&rdquo;</p>
      <textarea
        value={sentence.editedTranslatedText}
        onChange={(e) =>
          onPatch(sentence.sentenceSeq, { editedTranslatedText: e.target.value })
        }
        rows={2}
        disabled={disabled}
        className="w-full resize-none rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
      />
      {ENABLE_SENTENCE_LEVEL_AUDIO_REGENERATION && (
        <div className="flex justify-end gap-2">
          {dirty && (
            <Button size="sm" variant="outline" onClick={handleSave} loading={saving} disabled={disabled}>
              <Save className="h-3.5 w-3.5" />
              {t('features.dubbing.components.subtitleScriptEditor.save')}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegen}
            loading={regenerating}
            disabled={disabled || saving}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('features.dubbing.components.subtitleScriptEditor.regenerateAudio')}
          </Button>
        </div>
      )}
    </div>
  )
}

interface EditableCue extends SrtCue {
  id: number
}

function SrtRow({
  cue,
  disabled,
  onPatch,
  onValidityChange,
}: {
  cue: EditableCue
  disabled?: boolean
  onPatch: (id: number, patch: Partial<SrtCue>) => void
  onValidityChange: (id: number, invalid: boolean) => void
}) {
  const t = useLocaleText()
  const [startStr, setStartStr] = useState(msToSRTTime(cue.startMs))
  const [endStr, setEndStr] = useState(msToSRTTime(cue.endMs))
  const [timeError, setTimeError] = useState<string | null>(null)

  const validateAndPatchTiming = useCallback(() => {
    const startMs = srtTimeToMs(startStr)
    const endMs = srtTimeToMs(endStr)

    if (startMs === null || endMs === null) {
      setTimeError(t('features.dubbing.components.subtitleScriptEditor.timeFormatInvalid'))
      onValidityChange(cue.id, true)
      return
    }

    if (startMs >= endMs) {
      setTimeError(t('features.dubbing.components.subtitleScriptEditor.timeRangeInvalid'))
      onValidityChange(cue.id, true)
      return
    }

    setTimeError(null)
    onValidityChange(cue.id, false)
    onPatch(cue.id, { startMs, endMs })
  }, [startStr, endStr, cue.id, onPatch, onValidityChange, t])

  return (
    <div className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input
          type="text"
          value={startStr}
          onChange={(e) => setStartStr(e.target.value)}
          onBlur={validateAndPatchTiming}
          disabled={disabled}
          aria-invalid={Boolean(timeError)}
          className="w-32 rounded border border-surface-300 bg-white px-2 py-0.5 font-mono text-xs text-surface-700 focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
        />
        <span className="text-surface-500 dark:text-surface-300" aria-hidden="true">→</span>
        <input
          type="text"
          value={endStr}
          onChange={(e) => setEndStr(e.target.value)}
          onBlur={validateAndPatchTiming}
          disabled={disabled}
          aria-invalid={Boolean(timeError)}
          className="w-32 rounded border border-surface-300 bg-white px-2 py-0.5 font-mono text-xs text-surface-700 focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
        />
      </div>
      {timeError && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {timeError}
        </p>
      )}
      <textarea
        value={cue.text}
        onChange={(e) => onPatch(cue.id, { text: e.target.value })}
        rows={2}
        disabled={disabled}
        className="w-full resize-none rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
      />
    </div>
  )
}

interface SubtitleScriptEditorProps {
  langCode: string
  projectSeq: number
  spaceSeq: number
  allowDialogueEditing?: boolean
  youtubeVideoId?: string | null
  youtubePreviewVisibility?: PrivacyStatus
  /** 자막 편집 시 화면에 노출할 영상의 직접 재생 URL.
   * - 원본+자막 모드: 원본 영상 URL (모든 언어 공유)
   * - 새 더빙 영상 모드: 해당 언어의 더빙 영상 URL */
  previewVideoUrl?: string | null
  sttCaptionJobId?: number | null
}

export function SubtitleScriptEditor({
  langCode,
  projectSeq,
  spaceSeq,
  allowDialogueEditing = true,
  youtubeVideoId,
  youtubePreviewVisibility,
  previewVideoUrl,
  sttCaptionJobId,
}: SubtitleScriptEditorProps) {
  const locale = useAppLocale()
  const t = useLocaleText()
  const addToast = useNotificationStore((s) => s.addToast)
  const lang = getLanguageByCode(langCode)
  const languageName = lang ? (locale === 'ko' ? lang.nativeName : lang.name) : langCode
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<EditorTab>(allowDialogueEditing ? 'dialogue' : 'captions')

  const [sentences, setSentences] = useState<EditableSentence[] | null>(null)
  const [scriptLoading, setScriptLoading] = useState(false)
  const [applyingDialogue, setApplyingDialogue] = useState(false)

  const [cues, setCues] = useState<EditableCue[] | null>(null)
  const [savedSrt, setSavedSrt] = useState<string | null>(null)
  const [srtRevision, setSrtRevision] = useState(0)
  const [invalidCueIds, setInvalidCueIds] = useState<Set<number>>(() => new Set())
  const [srtLoading, setSrtLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showYouTubePreview, setShowYouTubePreview] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pushingToYT, setPushingToYT] = useState(false)
  const [resetting, setResetting] = useState(false)
  const youtubeWatchUrl = youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : null
  const youtubeEmbedUrl = youtubeVideoId ? `https://www.youtube.com/embed/${youtubeVideoId}` : null

  const loadScript = useCallback(async () => {
    if (!projectSeq) return

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
    if (!projectSeq) return

    setSrtLoading(true)
    try {
      const text = sttCaptionJobId
        ? await getGeneratedSttCaptionSrt(sttCaptionJobId, langCode)
        : await getTranslatedSrt(projectSeq, spaceSeq, 'translated')
      const parsed = parseSRT(text)
      const editableCues = parsed.map((c, i) => ({ ...c, id: i }))
      setCues(editableCues)
      setSavedSrt(buildSRT(editableCues))
      setSrtRevision((revision) => revision + 1)
      setInvalidCueIds(new Set())
    } catch (err) {
      addToast({
        type: 'error',
        title: t('features.dubbing.components.subtitleScriptEditor.failedToLoadCaptions'),
        message: err instanceof Error ? err.message : '',
      })
    } finally {
      setSrtLoading(false)
    }
  }, [langCode, projectSeq, spaceSeq, sttCaptionJobId, addToast, t])

  const handleToggle = useCallback(() => {
    if (open) {
      setOpen(false)
      return
    }

    setOpen(true)
    if (allowDialogueEditing && !sentences) loadScript()
    if (!cues) loadSrt()
  }, [open, allowDialogueEditing, sentences, cues, loadScript, loadSrt])

  const handleTabChange = useCallback((tab: EditorTab) => {
    if (tab === 'dialogue' && !allowDialogueEditing) return

    setActiveTab(tab)
    if (tab === 'dialogue' && allowDialogueEditing && !sentences) loadScript()
    if (tab === 'captions' && !cues) loadSrt()
  }, [allowDialogueEditing, sentences, cues, loadScript, loadSrt])

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

  const setCueValidity = useCallback((id: number, invalid: boolean) => {
    setInvalidCueIds((prev) => {
      const next = new Set(prev)
      if (invalid) next.add(id)
      else next.delete(id)
      if (next.size === prev.size && next.has(id) === prev.has(id)) return prev
      return next
    })
  }, [])

  const dirtySentences = sentences?.filter((s) => s.editedTranslatedText !== s.savedTranslatedText) ?? []
  const dirtySentenceCount = dirtySentences.length
  const hasInvalidCaptionTiming = invalidCueIds.size > 0

  const buildCurrentSrt = useCallback((): string => {
    if (!cues) return ''
    return buildSRT(cues)
  }, [cues])

  const srtPreview = cues ? buildCurrentSrt() : ''
  const captionDirty = Boolean(cues && savedSrt !== null && srtPreview !== savedSrt)
  const visibleTab: EditorTab = allowDialogueEditing ? activeTab : 'captions'

  const handleApplyDialogueChanges = useCallback(async () => {
    const changed = sentences?.filter((s) => s.editedTranslatedText !== s.savedTranslatedText) ?? []
    if (!changed.length) return

    setApplyingDialogue(true)
    try {
      for (const sentence of changed) {
        await updateSentenceTranslation(
          projectSeq,
          sentence.sentenceSeq,
          sentence.editedTranslatedText,
        )
      }

      for (const sentence of changed) {
        await regenerateSentenceAudio(
          projectSeq,
          sentence.audioSentenceSeq,
          sentence.editedTranslatedText,
        )
      }

      const changedSeqs = new Set(changed.map((sentence) => sentence.sentenceSeq))
      setSentences((prev) =>
        prev?.map((sentence) =>
          changedSeqs.has(sentence.sentenceSeq)
            ? { ...sentence, savedTranslatedText: sentence.editedTranslatedText }
            : sentence,
        ) ?? null,
      )
      addToast({
        type: 'success',
        title: t('features.dubbing.components.subtitleScriptEditor.dialogueChangesApplied'),
        message: t('features.dubbing.components.subtitleScriptEditor.dialogueChangesAppliedMessage', { languageName }),
      })
    } catch (err) {
      addToast({
        type: 'error',
        title: t('features.dubbing.components.subtitleScriptEditor.dialogueChangesApplyFailed'),
        message: err instanceof Error ? err.message : '',
      })
    } finally {
      setApplyingDialogue(false)
    }
  }, [sentences, projectSeq, addToast, t, languageName])

  const handleDiscardDialogueChanges = useCallback(() => {
    setSentences((prev) =>
      prev?.map((sentence) => ({
        ...sentence,
        editedTranslatedText: sentence.savedTranslatedText,
      })) ?? null,
    )
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

  const handleDownload = useCallback(() => {
    if (hasInvalidCaptionTiming) {
      addToast({
        type: 'error',
        title: t('features.dubbing.components.subtitleScriptEditor.fixCaptionTimingBeforeExport'),
      })
      return
    }

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
  }, [hasInvalidCaptionTiming, buildCurrentSrt, lang, langCode, addToast, t])

  const handleToggleYouTubePreview = useCallback(() => {
    const nextVisible = !showYouTubePreview
    if (nextVisible && youtubePreviewVisibility === 'private') {
      addToast({
        type: 'warning',
        title: t('features.dubbing.components.subtitleScriptEditor.youtubePreviewUnavailableForPrivateVideo'),
        message: t('features.dubbing.components.subtitleScriptEditor.youtubePreviewPublicOrUnlistedOnly'),
      })
    }
    setShowYouTubePreview(nextVisible)
  }, [showYouTubePreview, youtubePreviewVisibility, addToast, t])

  const handleYouTubePreviewError = useCallback(() => {
    addToast({
      type: 'warning',
      title: t('features.dubbing.components.subtitleScriptEditor.youtubePreviewLoadFailed'),
      message: t('features.dubbing.components.subtitleScriptEditor.youtubePreviewMayBeUnavailableForPrivateVideos'),
    })
  }, [addToast, t])

  const handlePushToYouTube = useCallback(async () => {
    if (!youtubeVideoId) return

    if (hasInvalidCaptionTiming) {
      addToast({
        type: 'error',
        title: t('features.dubbing.components.subtitleScriptEditor.fixCaptionTimingBeforeExport'),
      })
      return
    }

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
      setSavedSrt(srt)
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
  }, [youtubeVideoId, hasInvalidCaptionTiming, buildCurrentSrt, langCode, addToast, t])

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
            {t(
              allowDialogueEditing
                ? 'features.dubbing.components.subtitleScriptEditor.valueCaptionsAndDialogue'
                : 'features.dubbing.components.subtitleScriptEditor.valueCaptionsOnly',
              { languageName },
            )}
          </span>
          {captionDirty && (
            <Badge variant="warning">
              {t('features.dubbing.components.subtitleScriptEditor.captionChangesPending')}
            </Badge>
          )}
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
        <div className="space-y-4 border-t border-surface-200 p-3 dark:border-surface-800">
          {allowDialogueEditing && (
            <div className="inline-flex rounded-lg border border-surface-200 bg-surface-50 p-1 dark:border-surface-800 dark:bg-surface-900">
              <button
                type="button"
                onClick={() => handleTabChange('dialogue')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  visibleTab === 'dialogue'
                    ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-800 dark:text-white'
                    : 'text-surface-500 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white',
                )}
              >
                {t('features.dubbing.components.subtitleScriptEditor.dialogueTab')}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('captions')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  visibleTab === 'captions'
                    ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-800 dark:text-white'
                    : 'text-surface-500 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white',
                )}
              >
                {t('features.dubbing.components.subtitleScriptEditor.captionsTab')}
              </button>
            </div>
          )}

          {previewVideoUrl ? (
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900/50">
              <div className="mb-3 flex min-w-0 items-start gap-2">
                <Video className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <p className="text-sm font-medium text-surface-900 dark:text-white">
                  {t('features.dubbing.components.subtitleScriptEditor.videoPreview')}
                </p>
              </div>
              <div className="aspect-video w-full max-w-xl overflow-hidden rounded-lg border border-surface-200 bg-black dark:border-surface-700">
                <video controls preload="metadata" className="h-full w-full" src={previewVideoUrl}>
                  <track kind="captions" />
                </video>
              </div>
              {youtubeVideoId && youtubeWatchUrl && (
                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-surface-300 bg-white px-3 text-sm font-medium text-surface-700 transition-all duration-200 hover:bg-surface-100 focus-ring dark:border-surface-700 dark:bg-transparent dark:text-surface-300 dark:hover:bg-surface-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('features.dubbing.components.subtitleScriptEditor.openInYouTube')}
                </a>
              )}
            </div>
          ) : youtubeVideoId && youtubeWatchUrl && youtubeEmbedUrl && (
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2">
                  <Video className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {t('features.dubbing.components.subtitleScriptEditor.youtubePreview')}
                    </p>
                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-300">
                      {t('features.dubbing.components.subtitleScriptEditor.youtubePreviewPublicOrUnlistedOnly')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={youtubeWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-surface-300 bg-white px-3 text-sm font-medium text-surface-700 transition-all duration-200 hover:bg-surface-100 focus-ring dark:border-surface-700 dark:bg-transparent dark:text-surface-300 dark:hover:bg-surface-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t('features.dubbing.components.subtitleScriptEditor.openInYouTube')}
                  </a>
                  <Button size="sm" variant="outline" onClick={handleToggleYouTubePreview}>
                    {showYouTubePreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showYouTubePreview
                      ? t('features.dubbing.components.subtitleScriptEditor.hideYouTubePreview')
                      : t('features.dubbing.components.subtitleScriptEditor.youtubePreview')}
                  </Button>
                </div>
              </div>
              {showYouTubePreview && (
                <div className="mt-3 aspect-video w-full max-w-xl overflow-hidden rounded-lg border border-surface-200 bg-black dark:border-surface-700">
                  <iframe
                    title={t('features.dubbing.components.subtitleScriptEditor.youtubePreview')}
                    src={youtubeEmbedUrl}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onError={handleYouTubePreviewError}
                  />
                </div>
              )}
            </div>
          )}

          {allowDialogueEditing && visibleTab === 'dialogue' && (
            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
                  {t('features.dubbing.components.subtitleScriptEditor.editDialogue')}
                </h4>
                <p className="mt-1 text-xs text-surface-500 dark:text-surface-300">
                  {t('features.dubbing.components.subtitleScriptEditor.editDialogueThenApplyToRegenerateLanguageAudio')}
                </p>
              </div>

              {scriptLoading && (
                <div className="flex items-center gap-2 py-4 text-sm text-surface-500 dark:text-surface-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('features.dubbing.components.subtitleScriptEditor.loadingDialogue')}
                </div>
              )}

              {!scriptLoading && sentences && sentences.length === 0 && (
                <p className="py-2 text-xs text-surface-500 dark:text-surface-300">
                  {t('features.dubbing.components.subtitleScriptEditor.noLinesToShow')}
                </p>
              )}

              {!scriptLoading && sentences && sentences.length > 0 && (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {sentences.map((s) => (
                    <ScriptRow
                      key={s.sentenceSeq}
                      sentence={s}
                      projectSeq={projectSeq}
                      disabled={applyingDialogue}
                      onPatch={patchSentence}
                    />
                  ))}
                </div>
              )}

              {sentences && sentences.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {dirtySentenceCount > 0
                        ? t('features.dubbing.components.subtitleScriptEditor.dialogueChangesValue', { count: dirtySentenceCount })
                        : t('features.dubbing.components.subtitleScriptEditor.noDialogueChanges')}
                    </p>
                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-300">
                      {t('features.dubbing.components.subtitleScriptEditor.applyRegeneratesThisLanguageAudio')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDiscardDialogueChanges}
                      disabled={dirtySentenceCount === 0 || applyingDialogue}
                    >
                      {t('features.dubbing.components.subtitleScriptEditor.discardChanges')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApplyDialogueChanges}
                      loading={applyingDialogue}
                      disabled={dirtySentenceCount === 0}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t('features.dubbing.components.subtitleScriptEditor.applyDialogueChanges')}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {visibleTab === 'captions' && (
            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
                  {t('features.dubbing.components.subtitleScriptEditor.editCaptionFile')}
                </h4>
                <p className="mt-1 text-xs text-surface-500 dark:text-surface-300">
                  {t('features.dubbing.components.subtitleScriptEditor.editTheGeneratedCaptionTextAndTimingThese')}
                </p>
              </div>

              {srtLoading && (
                <div className="flex items-center gap-2 py-4 text-sm text-surface-500 dark:text-surface-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('features.dubbing.components.subtitleScriptEditor.loadingCaptions')}
                </div>
              )}

              {!srtLoading && cues && cues.length === 0 && (
                <p className="py-2 text-xs text-surface-500 dark:text-surface-300">
                  {t('features.dubbing.components.subtitleScriptEditor.theCaptionFileIsEmpty')}
                </p>
              )}

              {!srtLoading && cues && cues.length > 0 && (
                <div className="max-h-112 space-y-2 overflow-y-auto">
                  {cues.map((c) => (
                    <SrtRow
                      key={`${srtRevision}-${c.id}`}
                      cue={c}
                      disabled={pushingToYT || resetting}
                      onPatch={patchCue}
                      onValidityChange={setCueValidity}
                    />
                  ))}
                </div>
              )}

              {showPreview && (
                <textarea
                  readOnly
                  value={srtPreview}
                  rows={12}
                  className="w-full resize-y rounded-md border border-surface-300 bg-surface-50 px-3 py-2 font-mono text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
                />
              )}

              {cues && cues.length > 0 && (
                <div className="space-y-2 rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900/50">
                  {hasInvalidCaptionTiming && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {t('features.dubbing.components.subtitleScriptEditor.fixCaptionTimingBeforeExport')}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownload}
                      loading={downloading}
                      disabled={hasInvalidCaptionTiming}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t('features.dubbing.components.subtitleScriptEditor.downloadCaptions')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowPreview((v) => !v)}>
                      {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {t('features.dubbing.components.subtitleScriptEditor.previewCaptions')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleResetSrt} loading={resetting}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t('features.dubbing.components.subtitleScriptEditor.restoreGeneratedCaptions')}
                    </Button>
                    {captionDirty && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handlePushToYouTube}
                        loading={pushingToYT}
                        disabled={hasInvalidCaptionTiming}
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        {t('features.dubbing.components.subtitleScriptEditor.updateYouTubeCaptions')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
