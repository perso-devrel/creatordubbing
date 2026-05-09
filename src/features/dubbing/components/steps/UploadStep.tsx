'use client'

import { Download, Check, RotateCcw, Upload, Loader2, Volume2 } from 'lucide-react'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardTitle, Badge, Progress } from '@/components/ui'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { getLanguageByCode } from '@/utils/languages'
import { extractVideoId } from '@/utils/validators'
import { useNotificationStore } from '@/stores/notificationStore'
import { useDubbingStore } from '../../store/dubbingStore'
import { usePersoFlow } from '../../hooks/usePersoFlow'
import { useAuthStore } from '@/stores/authStore'
import {
  ytUploadVideo,
  ytUploadCaption,
  ytFetchVideoMetadata,
  ytUpdateVideoLocalizations,
  getPersoFileUrl,
  getTranslatedSrt,
  translateMetadata,
  type MetadataTranslation,
} from '@/lib/api-client'
import { toBcp47 } from '@/utils/languages'
import { dbMutation, dbMutationStrict } from '@/lib/api/dbMutation'
import { SubtitleScriptEditor } from '../SubtitleScriptEditor'
import { YouTubeExtensionUpload } from '../YouTubeExtensionUpload'
import { appendAiDisclosureFooter, appendTextFooter, stripAiDisclosureFooter } from '../../utils/aiDisclosure'
import type { YouTubeUploadState } from '../../types/dubbing.types'

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

function isYouTubeUploadLocked(state: YouTubeUploadState | undefined) {
  return state?.status === 'uploading' || state?.status === 'done'
}

interface YouTubeUploadReservation {
  status: 'reserved' | 'already_uploaded' | 'already_uploading' | 'not_found'
  youtubeVideoId?: string | null
}

export function UploadStep() {
  const {
    selectedLanguages, videoMeta, videoSource, languageProgress, dbJobId,
    spaceSeq, projectMap, youtubeUploads: ytUploads, setYouTubeUploadState,
    uploadSettings, deliverableMode, originalVideoUrl, isShort, reset,
  } = useDubbingStore()
  const { fetchDownloads } = usePersoFlow()
  const addToast = useNotificationStore((s) => s.addToast)
  const userId = useAuthStore((s) => s.user?.uid)
  const router = useRouter()
  const locale = useAppLocale()
  const t = useLocaleText()

  const originalYouTubeId =
    videoSource?.type === 'url' && videoSource.url ? extractVideoId(videoSource.url) : null
  const channelVideoId = videoSource?.type === 'channel' ? videoSource.videoId : null
  const originalYouTubeUrl = originalYouTubeId
    ? `https://www.youtube.com/watch?v=${originalYouTubeId}`
    : null

  const {
    autoUpload,
    attachOriginalLink,
    title: settingsTitle,
    description: settingsDescription,
    tags: settingsTags,
    privacyStatus,
    metadataLanguage,
    uploadCaptions: uploadCaptionsEnabled,
    selfDeclaredMadeForKids,
    containsSyntheticMedia,
    uploadReviewConfirmed,
  } = uploadSettings
  const editableDescription = stripAiDisclosureFooter(settingsDescription || '')
  const shouldUploadCaptions = autoUpload && uploadCaptionsEnabled
  const shouldApplyAiDisclosure = deliverableMode === 'newDubbedVideos' && containsSyntheticMedia
  const videoMetaTitle = videoMeta?.title

  const [loadingDownload, setLoadingDownload] = useState<string | null>(null)
  const [captionUploads, setCaptionUploads] = useState<Record<string, UploadStatus>>({})
  const [audioTrackEnabled, setAudioTrackEnabled] = useState(false)
  const [studioOpenedLang, setStudioOpenedLang] = useState<string | null>(null)
  const autoChainTriggered = useRef(false)
  const existingVideoMetadataSyncRef = useRef<Set<string>>(new Set())
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const getDisplayLanguageName = useCallback((langCode: string) => {
    const language = getLanguageByCode(langCode)
    if (!language) return langCode
    return locale === 'ko' ? language.nativeName : language.name
  }, [locale])
  const privacyLabel = privacyStatus === 'public'
    ? t({ ko: '공개', en: 'Public' })
    : privacyStatus === 'unlisted'
      ? t({ ko: '일부 공개', en: 'Unlisted' })
      : t({ ko: '비공개', en: 'Private' })

  // ─── Metadata translations (Gemini) ─────────────────────────────────
  // Upload Step에 진입한 시점의 (title, description, metadataLanguage, selectedLanguages) 조합으로
  // 한 번 번역해두고 캐시. 모든 언어별 업로드와 localizations에서 공용으로 쓴다.
  // AI 고지 문구는 Gemini에 보내지 않고, 번역 후 로컬 문구 목록에서 언어별로 붙인다.
  // 실패해도 fallback으로 원문이 들어가도록 처리되어 업로드를 막지 않는다.
  const [translations, setTranslations] = useState<Record<string, MetadataTranslation>>({})
  const translatePromiseRef = useRef<Promise<Record<string, MetadataTranslation>> | null>(null)
  const translationCacheKeyRef = useRef<string | null>(null)
  const ensureTranslations = useCallback(async (): Promise<Record<string, MetadataTranslation>> => {
    const cacheKey = JSON.stringify({
      title: settingsTitle?.trim() || videoMeta?.title || '',
      description: editableDescription,
      metadataLanguage,
      selectedLanguages,
    })
    if (translationCacheKeyRef.current === cacheKey && Object.keys(translations).length > 0) {
      return translations
    }
    if (translatePromiseRef.current) return translatePromiseRef.current

    const baseTitle = settingsTitle?.trim() || videoMeta?.title || t({ ko: '더빙 영상', en: 'Dubbed video' })
    if (!baseTitle || selectedLanguages.length === 0) return {}
    translationCacheKeyRef.current = cacheKey

    const p = (async () => {
      try {
        const result = await translateMetadata({
          title: baseTitle,
          description: editableDescription,
          sourceLang: metadataLanguage || 'ko',
          targetLangs: selectedLanguages,
        })
        setTranslations(result)
        return result
      } catch (err) {
        // 실패 시 모든 언어를 원문으로 fallback. 사용자에게는 toast로 1회 안내.
        const fallback: Record<string, MetadataTranslation> = {}
        for (const code of selectedLanguages) {
          fallback[code] = { title: baseTitle, description: editableDescription }
        }
        setTranslations(fallback)
        addToast({
          type: 'warning',
          title: t({ ko: '제목·설명 번역 실패', en: 'Title and description translation failed' }),
          message: err instanceof Error ? err.message : t({ ko: '원문 제목과 설명으로 업로드합니다.', en: 'Uploading with the original title and description.' }),
        })
        return fallback
      } finally {
        translatePromiseRef.current = null
      }
    })()
    translatePromiseRef.current = p
    return p
  }, [translations, settingsTitle, videoMeta?.title, editableDescription, metadataLanguage, selectedLanguages, addToast, t])

  // Original video upload state (for upload + originalWithMultiAudio)
  const [originalUploadState, setOriginalUploadState] = useState<{
    status: 'idle' | 'uploading' | 'done' | 'skipped'
    videoId?: string
    error?: string
  }>({ status: videoSource?.type === 'channel' ? 'skipped' : 'idle' })

  // Resolve the target videoId for multi-audio
  const multiAudioVideoId =
    originalUploadState.videoId || channelVideoId || null

  /** 번역되었거나 원문인 description에 공통 footer를 붙여 준다. AI 고지는 더빙 영상 업로드에만 붙인다. */
  const applyDescriptionFooter = useCallback(
    (desc: string, languageCode: string) => {
      let next = stripAiDisclosureFooter(desc)
      if (attachOriginalLink && originalYouTubeUrl) {
        next = appendTextFooter(next, `${t({ ko: '원본 영상', en: 'Original video' })}: ${originalYouTubeUrl}`)
      }
      return appendAiDisclosureFooter(next, languageCode, shouldApplyAiDisclosure)
    },
    [attachOriginalLink, originalYouTubeUrl, shouldApplyAiDisclosure, t],
  )

  const applyMetadataToExistingVideo = useCallback(async (targetVideoId: string) => {
    if (!isAuthenticated) return

    const requestedTags = Array.from(new Set(settingsTags.map((tag) => tag.trim()).filter(Boolean)))

    // selectedLanguages별 번역을 localizations 맵으로 변환. 번역 캐시 사용.
    // 원본 제목/설명은 건드리지 않고 localizations에만 추가한다.
    const allTranslations = await ensureTranslations()
    const newLocalizations: Record<string, { title: string; description: string }> = {}
    for (const code of selectedLanguages) {
      const t = allTranslations[code]
      if (t) {
        newLocalizations[toBcp47(code)] = {
          title: t.title,
          description: applyDescriptionFooter(t.description, code),
        }
      }
    }

    const localizationKey = Object.keys(newLocalizations).sort().join(',')
    const syncKey = `${targetVideoId}:${requestedTags.join('\n')}:${localizationKey}`
    if (existingVideoMetadataSyncRef.current.has(syncKey)) return
    existingVideoMetadataSyncRef.current.add(syncKey)

    try {
      const metadata = await ytFetchVideoMetadata(targetVideoId)
      const mergedTags = requestedTags.length === 0
        ? metadata.tags
        : Array.from(new Set([...metadata.tags, ...requestedTags]))
      const mergedLocalizations = { ...metadata.localizations, ...newLocalizations }

      const tagsChanged =
        mergedTags.length !== metadata.tags.length ||
        mergedTags.some((tag, index) => tag !== metadata.tags[index])
      const localizationsChanged = Object.entries(newLocalizations).some(([lang, next]) => {
        const existing = metadata.localizations[lang]
        return !existing || existing.title !== next.title || existing.description !== next.description
      })
      if (!tagsChanged && !localizationsChanged) return

      // 원본 제목/설명은 그대로 유지 — localizations와 tags만 갱신.
      await ytUpdateVideoLocalizations({
        videoId: targetVideoId,
        sourceLang: metadata.defaultLanguage || toBcp47(metadataLanguage),
        title: metadata.title || settingsTitle?.trim() || videoMetaTitle || t({ ko: '제목 없음', en: 'Untitled' }),
        description: metadata.description,
        tags: mergedTags,
        localizations: mergedLocalizations,
      })
    } catch (err) {
      addToast({
        type: 'warning',
        title: t({ ko: 'YouTube 제목·설명 적용 실패', en: 'Could not update YouTube title and description' }),
        message: err instanceof Error ? err.message : t({ ko: '자막 업로드는 계속 진행합니다.', en: 'Caption upload will continue.' }),
      })
    }
  }, [
    addToast,
    applyDescriptionFooter,
    ensureTranslations,
    isAuthenticated,
    metadataLanguage,
    selectedLanguages,
    settingsTags,
    settingsTitle,
    t,
    videoMetaTitle,
  ])

  const handleNewDubbing = () => reset()
  const handleGoToDashboard = () => { reset(); router.push('/dashboard') }

  // ─── Original video upload (for upload + originalWithMultiAudio) ──────
  const uploadOriginalToYouTube = useCallback(async () => {
    if (!isAuthenticated || !originalVideoUrl) return null

    setOriginalUploadState({ status: 'uploading' })
    try {
      // 다국어 자막 모드는 영상 1개에 localizations 맵을 함께 보내 YouTube가 시청자
      // 로케일에 맞춰 제목·설명을 보여주도록 한다.
      const allTranslations = await ensureTranslations()
      const localizations: Record<string, { title: string; description: string }> = {}
      for (const code of selectedLanguages) {
        const t = allTranslations[code]
        if (t) {
          localizations[toBcp47(code)] = {
            title: t.title,
            description: applyDescriptionFooter(t.description, code),
          }
        }
      }

      const result = await ytUploadVideo({
        videoUrl: originalVideoUrl,
        title: settingsTitle?.trim() || videoMeta?.title || t({ ko: '원본 영상', en: 'Original video' }),
        description: applyDescriptionFooter(editableDescription, metadataLanguage),
        tags: settingsTags,
        privacyStatus,
        selfDeclaredMadeForKids,
        containsSyntheticMedia: shouldApplyAiDisclosure,
        language: toBcp47(metadataLanguage),
        localizations: Object.keys(localizations).length > 0 ? localizations : undefined,
      })
      setOriginalUploadState({ status: 'done', videoId: result.videoId })
      addToast({
        type: 'success',
        title: t({ ko: '원본 영상 업로드 완료', en: 'Original video uploaded' }),
        message: t({ ko: 'YouTube에서 영상을 확인할 수 있습니다.', en: 'You can review the video on YouTube.' }),
      })
      return result.videoId
    } catch (err) {
      console.warn('[Dubtube] Original video upload failed', err)
      const msg = t({
        ko: '원본 영상 업로드를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        en: 'Could not complete the original video upload. Please try again shortly.',
      })
      setOriginalUploadState({ status: 'idle', error: msg })
      addToast({ type: 'error', title: t({ ko: '원본 영상 업로드 실패', en: 'Original upload failed' }), message: msg })
      return null
    }
  }, [isAuthenticated, originalVideoUrl, settingsTitle, editableDescription, settingsTags, privacyStatus, selfDeclaredMadeForKids, shouldApplyAiDisclosure, videoMeta, addToast, ensureTranslations, selectedLanguages, metadataLanguage, applyDescriptionFooter, t])

  // ─── Audio → Studio helper ──────────────────────────────────────────
  const handleAudioToStudio = useCallback(async (langCode: string, targetVideoId?: string) => {
    const lang = getLanguageByCode(langCode)
    if (!lang) return
    setStudioOpenedLang(langCode)
    try {
      const data = await fetchDownloads(langCode, 'voiceAudio')
      const rawAudioUrl = data?.audioFile?.voiceAudioDownloadLink
      const audioUrl = rawAudioUrl ? (rawAudioUrl.startsWith('http') ? rawAudioUrl : getPersoFileUrl(rawAudioUrl)) : undefined
      if (audioUrl) {
        const a = document.createElement('a')
        a.href = audioUrl
        a.download = `${lang.name}_${langCode}_audio.wav`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      try {
        await navigator.clipboard.writeText(langCode)
      } catch { /* ignore */ }

      const vid = targetVideoId || originalYouTubeId
      const studioUrl = vid
        ? `https://studio.youtube.com/video/${vid}/translations/audio`
        : 'https://studio.youtube.com'
      window.open(studioUrl, 'yt-studio', 'width=1400,height=900,noopener')

      addToast({
        type: 'info',
        title: t({ ko: `${getDisplayLanguageName(langCode)} 오디오 준비 완료`, en: `${getDisplayLanguageName(langCode)} audio ready` }),
        message: t({
          ko: '오디오 파일을 다운로드하고 YouTube Studio를 열었습니다. 언어 코드도 클립보드에 복사했습니다.',
          en: 'Downloaded the audio file, opened YouTube Studio, and copied the language code to your clipboard.',
        }),
      })
    } finally {
      setTimeout(() => setStudioOpenedLang(null), 1500)
    }
  }, [fetchDownloads, originalYouTubeId, addToast, getDisplayLanguageName, t])

  // ─── File download ──────────────────────────────────────────────────
  const handleDownload = useCallback(async (langCode: string, type: 'video' | 'voiceAudio' | 'translatedSubtitle') => {
    setLoadingDownload(`${langCode}-${type}`)
    try {
      const lang = getLanguageByCode(langCode)

      if (type === 'translatedSubtitle') {
        const pSeq = projectMap[langCode]
        if (!pSeq || !spaceSeq) return
        const srtContent = await getTranslatedSrt(pSeq, spaceSeq, 'translated')
        const blob = new Blob([srtContent], { type: 'application/x-subrip;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${lang?.name || langCode}_${langCode}.srt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      const target = type === 'video' ? 'dubbingVideo' : 'voiceAudio'
      const data = await fetchDownloads(langCode, target as 'all')
      if (!data) return

      let rawUrl: string | undefined
      if (type === 'video' && data.videoFile?.videoDownloadLink) rawUrl = data.videoFile.videoDownloadLink
      else if (type === 'voiceAudio' && data.audioFile?.voiceAudioDownloadLink) rawUrl = data.audioFile.voiceAudioDownloadLink
      else if (data.zippedFileDownloadLink) rawUrl = data.zippedFileDownloadLink

      if (rawUrl) {
        const fullUrl = rawUrl.startsWith('http') ? rawUrl : getPersoFileUrl(rawUrl)
        const ext = type === 'video' ? 'mp4' : 'wav'
        const a = document.createElement('a')
        a.href = fullUrl
        a.download = `${lang?.name || langCode}_${langCode}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } finally {
      setLoadingDownload(null)
    }
  }, [fetchDownloads, projectMap, spaceSeq])

  // ─── Upload dubbed video to YouTube (newDubbedVideos mode) ──────────
  const handleYouTubeUpload = useCallback(async (langCode: string) => {
    const existingUpload = useDubbingStore.getState().youtubeUploads[langCode]
    if (isYouTubeUploadLocked(existingUpload)) return

    if (!isAuthenticated) {
      addToast({ type: 'error', title: t({ ko: 'YouTube에 먼저 로그인해 주세요.', en: 'Please sign in to YouTube first.' }) })
      return
    }

    const lang = getLanguageByCode(langCode)
    if (!lang) return

    setYouTubeUploadState(langCode, { status: 'uploading', progress: 0 })
    let uploadReserved = false

    try {
      if (dbJobId) {
        const reservation = await dbMutationStrict<YouTubeUploadReservation>({
          type: 'startJobLanguageYouTubeUpload',
          payload: { jobId: dbJobId, langCode },
        })
        if (reservation.status === 'already_uploaded') {
          setYouTubeUploadState(langCode, {
            status: 'done',
            progress: 100,
            videoId: reservation.youtubeVideoId || undefined,
          })
          return
        }
        if (reservation.status === 'already_uploading') {
          setYouTubeUploadState(langCode, { status: 'uploading', progress: 10 })
          return
        }
        if (reservation.status !== 'reserved') {
          throw new Error(t({ ko: 'YouTube 업로드 상태를 확인할 수 없습니다.', en: 'Could not check YouTube upload status.' }))
        }
        uploadReserved = true
      }

      const downloads = await fetchDownloads(langCode, 'dubbingVideo')
      const rawVideoUrl = downloads?.videoFile?.videoDownloadLink
      if (!rawVideoUrl) throw new Error(t({ ko: '더빙 영상 다운로드 링크를 찾을 수 없습니다.', en: 'Could not find the dubbed video download link.' }))
      const videoUrl = rawVideoUrl.startsWith('http') ? rawVideoUrl : getPersoFileUrl(rawVideoUrl)

      setYouTubeUploadState(langCode, { status: 'uploading', progress: 20 })
      // 번역된 제목·설명을 가져와 그 언어 영상의 메타로 사용한다.
      const allTranslations = await ensureTranslations()
      const baseTitle = settingsTitle?.trim() || videoMeta?.title || t({ ko: '더빙 영상', en: 'Dubbed video' })
      const translated = allTranslations[langCode] ?? { title: baseTitle, description: editableDescription }
      const ytTitle = translated.title
      const ytDescription = applyDescriptionFooter(translated.description, langCode)
      const langTags = Array.from(new Set([
        ...settingsTags,
        lang.name,
      ]))
      const result = await ytUploadVideo({
        videoUrl,
        title: ytTitle,
        description: ytDescription,
        tags: langTags,
        privacyStatus,
        selfDeclaredMadeForKids,
        containsSyntheticMedia: shouldApplyAiDisclosure,
        language: langCode,
      })
      setYouTubeUploadState(langCode, { status: 'uploading', progress: 90 })

      // Upload SRT caption — use Perso's official translated SRT (audioScript target)
      setYouTubeUploadState(langCode, { status: 'uploading', progress: 92 })
      if (shouldUploadCaptions) {
        try {
          const pSeq = projectMap[langCode]
          if (pSeq && spaceSeq) {
            const srtText = await getTranslatedSrt(pSeq, spaceSeq, 'translated')
            if (srtText.trim().length > 0) {
              await ytUploadCaption({
                videoId: result.videoId,
                language: toBcp47(langCode),
                name: '',
                srtContent: srtText,
              })
            }
          }
        } catch { /* caption upload is optional */ }
      }

      setYouTubeUploadState(langCode, { status: 'done', progress: 100, videoId: result.videoId })

      try {
        if (dbJobId) {
          await dbMutationStrict({
            type: 'updateJobLanguageYouTube',
            payload: { jobId: dbJobId, langCode, youtubeVideoId: result.videoId },
          })
        }
        if (userId) {
          await dbMutation({
            type: 'createYouTubeUpload',
            payload: {
              userId,
              youtubeVideoId: result.videoId,
              title: ytTitle,
              languageCode: langCode,
              privacyStatus,
              isShort,
            },
          })
        }
      } catch { /* DB save best-effort */ }

      addToast({
        type: 'success',
        title: t({ ko: `${getDisplayLanguageName(langCode)} 영상 업로드 완료`, en: `${getDisplayLanguageName(langCode)} video uploaded` }),
        message: t({ ko: `${privacyLabel} 상태로 YouTube 업로드가 완료되었습니다.`, en: `Uploaded to YouTube as ${privacyLabel}.` }),
      })
    } catch (err) {
      console.warn('[Dubtube] YouTube upload failed', err)
      const msg = t({
        ko: 'YouTube 업로드를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        en: 'Could not complete the YouTube upload. Please try again shortly.',
      })
      if (uploadReserved && dbJobId) {
        await dbMutation({
          type: 'failJobLanguageYouTubeUpload',
          payload: { jobId: dbJobId, langCode },
        })
      }
      setYouTubeUploadState(langCode, { status: 'error', progress: 0, error: msg })
      addToast({ type: 'error', title: t({ ko: `${getDisplayLanguageName(langCode)} 업로드 실패`, en: `${getDisplayLanguageName(langCode)} upload failed` }), message: msg })
    }
  }, [fetchDownloads, videoMeta, addToast, userId, dbJobId, isShort, isAuthenticated, settingsTitle, editableDescription, settingsTags, privacyStatus, privacyLabel, shouldUploadCaptions, selfDeclaredMadeForKids, shouldApplyAiDisclosure, projectMap, spaceSeq, ensureTranslations, applyDescriptionFooter, setYouTubeUploadState, getDisplayLanguageName, t])

  // ─── Queue upload (background — survives tab close) ─────────────────
  const queueYouTubeUpload = useCallback(async (langCode: string) => {
    const existingUpload = useDubbingStore.getState().youtubeUploads[langCode]
    if (isYouTubeUploadLocked(existingUpload)) return

    if (!userId || !dbJobId) return

    const lang = getLanguageByCode(langCode)
    if (!lang) return

    setYouTubeUploadState(langCode, { status: 'uploading', progress: 10 })
    let uploadReserved = false

    try {
      const reservation = await dbMutationStrict<YouTubeUploadReservation>({
        type: 'startJobLanguageYouTubeUpload',
        payload: { jobId: dbJobId, langCode },
      })
      if (reservation.status === 'already_uploaded') {
        setYouTubeUploadState(langCode, {
          status: 'done',
          progress: 100,
          videoId: reservation.youtubeVideoId || undefined,
        })
        return
      }
      if (reservation.status === 'already_uploading') {
        setYouTubeUploadState(langCode, { status: 'uploading', progress: 10 })
        return
      }
      if (reservation.status !== 'reserved') {
        throw new Error(t({ ko: 'YouTube 업로드 상태를 확인할 수 없습니다.', en: 'Could not check YouTube upload status.' }))
      }
      uploadReserved = true

      const downloads = await fetchDownloads(langCode, 'dubbingVideo')
      const rawVideoUrl = downloads?.videoFile?.videoDownloadLink
      if (!rawVideoUrl) throw new Error(t({ ko: '더빙 영상 다운로드 링크를 찾을 수 없습니다.', en: 'Could not find the dubbed video download link.' }))
      const videoUrl = rawVideoUrl.startsWith('http') ? rawVideoUrl : getPersoFileUrl(rawVideoUrl)

      const allTranslations = await ensureTranslations()
      const baseTitle = settingsTitle?.trim() || videoMeta?.title || t({ ko: '더빙 영상', en: 'Dubbed video' })
      const translated = allTranslations[langCode] ?? { title: baseTitle, description: editableDescription }
      const ytTitle = translated.title
      const langTags = Array.from(new Set([
        ...settingsTags,
        lang.name,
      ]))
      let srtContent: string | null = null
      if (shouldUploadCaptions) {
        const pSeq = projectMap[langCode]
        if (pSeq && spaceSeq) {
          try {
            const srtText = await getTranslatedSrt(pSeq, spaceSeq, 'translated')
            srtContent = srtText.trim().length > 0 ? srtText : null
          } catch { /* queue caption is optional */ }
        }
      }

      await dbMutation({
        type: 'queueYouTubeUpload',
        payload: {
          userId,
          jobId: dbJobId,
          langCode,
          videoUrl,
          title: ytTitle,
          description: applyDescriptionFooter(translated.description, langCode),
          tags: langTags,
          privacyStatus,
          language: langCode,
          isShort,
          uploadCaptions: shouldUploadCaptions,
          captionLanguage: toBcp47(langCode),
          // 빈 문자열로 두면 YouTube가 시청자 로케일에 맞춰 언어 이름 자동 표시.
          captionName: '',
          srtContent,
          selfDeclaredMadeForKids,
          containsSyntheticMedia: shouldApplyAiDisclosure,
        },
      })

      setYouTubeUploadState(langCode, { status: 'done', progress: 100 })
      addToast({
        type: 'success',
        title: t({ ko: `${getDisplayLanguageName(langCode)} 업로드 예약 완료`, en: `${getDisplayLanguageName(langCode)} upload scheduled` }),
        message: t({ ko: '서버에서 업로드를 진행합니다. 탭을 닫아도 계속됩니다.', en: 'The server will upload it in the background. You can close this tab.' }),
      })
    } catch (err) {
      console.warn('[Dubtube] YouTube upload scheduling failed', err)
      const msg = t({
        ko: 'YouTube 업로드 예약에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        en: 'Could not schedule the YouTube upload. Please try again shortly.',
      })
      if (uploadReserved) {
        await dbMutation({
          type: 'failJobLanguageYouTubeUpload',
          payload: { jobId: dbJobId, langCode },
        })
      }
      setYouTubeUploadState(langCode, { status: 'error', progress: 0, error: msg })
      addToast({ type: 'error', title: t({ ko: `${getDisplayLanguageName(langCode)} 업로드 예약 실패`, en: `${getDisplayLanguageName(langCode)} upload scheduling failed` }), message: msg })
    }
  }, [fetchDownloads, videoMeta, addToast, userId, dbJobId, isShort, settingsTitle, editableDescription, settingsTags, privacyStatus, shouldUploadCaptions, selfDeclaredMadeForKids, shouldApplyAiDisclosure, projectMap, spaceSeq, ensureTranslations, applyDescriptionFooter, setYouTubeUploadState, getDisplayLanguageName, t])

  const completedLangs = useMemo(() => selectedLanguages.filter((code) => {
    const lp = languageProgress.find((p) => p.langCode === code)
    return lp?.progressReason === 'COMPLETED' || lp?.progressReason === 'Completed'
  }), [languageProgress, selectedLanguages])

  const failedLangs = useMemo(() => selectedLanguages.filter((code) => {
    const lp = languageProgress.find((p) => p.langCode === code)
    return lp?.progressReason === 'FAILED' || lp?.progressReason === 'Failed' || lp?.progressReason === 'CANCELED'
  }), [languageProgress, selectedLanguages])

  const anyUploading = Object.values(ytUploads).some((s) => s.status === 'uploading')
  const hasPendingYouTubeUploads = completedLangs.some((code) => !isYouTubeUploadLocked(ytUploads[code]))
  const hasAutoUploadCandidates = completedLangs.some((code) => !ytUploads[code])

  const handleUploadAll = useCallback(async () => {
    const pending = completedLangs.filter((code) => !isYouTubeUploadLocked(ytUploads[code]))
    const CONCURRENCY = 2
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map((code) => handleYouTubeUpload(code)))
    }
  }, [completedLangs, ytUploads, handleYouTubeUpload])

  const handleQueueAll = useCallback(async () => {
    const pending = completedLangs.filter((code) => !isYouTubeUploadLocked(ytUploads[code]))
    for (const code of pending) {
      await queueYouTubeUpload(code)
    }
  }, [completedLangs, ytUploads, queueYouTubeUpload])

  // ─── Caption upload to YouTube ───────────────────────────────────────
  const uploadCaptions = useCallback(async (targetVideoId: string, langs: string[]) => {
    for (const langCode of langs) {
      const lang = getLanguageByCode(langCode)
      if (!lang) continue
      const pSeq = projectMap[langCode]
      if (!pSeq || !spaceSeq) continue

      setCaptionUploads((prev) => ({ ...prev, [langCode]: 'uploading' }))
      try {
        const srtContent = await getTranslatedSrt(pSeq, spaceSeq, 'translated')
        if (srtContent.trim().length === 0) {
          setCaptionUploads((prev) => ({ ...prev, [langCode]: 'error' }))
          continue
        }
        await ytUploadCaption({
          videoId: targetVideoId,
          language: toBcp47(langCode),
          name: '',
          srtContent,
        })
        setCaptionUploads((prev) => ({ ...prev, [langCode]: 'done' }))
        addToast({ type: 'success', title: t({ ko: `${getDisplayLanguageName(langCode)} 자막 업로드 완료`, en: `${getDisplayLanguageName(langCode)} captions uploaded` }) })
      } catch (err) {
        console.warn('[Dubtube] Caption upload failed', err)
        setCaptionUploads((prev) => ({ ...prev, [langCode]: 'error' }))
        const msg = t({
          ko: '자막 업로드를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          en: 'Could not complete the caption upload. Please try again shortly.',
        })
        addToast({ type: 'error', title: t({ ko: `${getDisplayLanguageName(langCode)} 자막 업로드 실패`, en: `${getDisplayLanguageName(langCode)} caption upload failed` }), message: msg })
      }
    }
  }, [projectMap, spaceSeq, addToast, getDisplayLanguageName, t])

  const uploadCaptionsWithMetadata = useCallback(async (targetVideoId: string, langs: string[]) => {
    if (deliverableMode === 'originalWithMultiAudio' && videoSource?.type === 'channel') {
      await applyMetadataToExistingVideo(targetVideoId)
    }
    await uploadCaptions(targetVideoId, langs)
  }, [applyMetadataToExistingVideo, deliverableMode, uploadCaptions, videoSource?.type])

  const handleUploadCaptionsToVideo = useCallback(async (targetVideoId: string) => {
    const pending = completedLangs.filter((code) => captionUploads[code] !== 'done')
    await uploadCaptionsWithMetadata(targetVideoId, pending)
  }, [completedLangs, captionUploads, uploadCaptionsWithMetadata])

  // ─── Auto-chain: originalWithMultiAudio ──────────────────────────────
  // 1. Upload original (if file upload) → 2. Auto-upload captions → 3. Extension for audio tracks
  useEffect(() => {
    if (deliverableMode !== 'originalWithMultiAudio') return
    if (!autoUpload || !isAuthenticated) return
    if (!uploadReviewConfirmed) return
    if (completedLangs.length === 0) return
    if (autoChainTriggered.current) return
    autoChainTriggered.current = true

    const chain = async () => {
      let targetVideoId: string | undefined | null

      if (videoSource?.type === 'channel' && channelVideoId) {
        targetVideoId = channelVideoId
      } else if (videoSource?.type === 'upload' && originalVideoUrl) {
        targetVideoId = await uploadOriginalToYouTube()
      }

      if (targetVideoId && videoSource?.type === 'channel') {
        await applyMetadataToExistingVideo(targetVideoId)
      }

      if (targetVideoId && shouldUploadCaptions) {
        await uploadCaptionsWithMetadata(targetVideoId, completedLangs)
      }
    }

    chain()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableMode, autoUpload, isAuthenticated, uploadReviewConfirmed, completedLangs.length])

  // ─── Auto-upload: newDubbedVideos ────────────────────────────────────
  useEffect(() => {
    if (deliverableMode !== 'newDubbedVideos') return
    if (!uploadReviewConfirmed) return
    if (autoUpload && isAuthenticated && hasAutoUploadCandidates && !anyUploading) {
      handleUploadAll()
    }
  }, [deliverableMode, autoUpload, isAuthenticated, uploadReviewConfirmed, hasAutoUploadCandidates, anyUploading, handleUploadAll])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">
          {failedLangs.length > 0
            ? t({ ko: '일부 언어 처리 완료', en: 'Some languages finished' })
            : t({ ko: '더빙 파일이 준비되었습니다', en: 'Dubbing files are ready' })}
        </h2>
        <p className="mt-1 text-surface-500 dark:text-surface-300">
          {locale === 'ko'
            ? `${completedLangs.length} / ${selectedLanguages.length}개 언어 완료.`
            : `${completedLangs.length} of ${selectedLanguages.length} languages complete.`}
          {deliverableMode === 'downloadOnly'
            ? t({ ko: ' 필요한 파일을 다운로드하세요.', en: ' Download the files you need.' })
            : deliverableMode === 'originalWithMultiAudio'
              ? t({ ko: ' 원본 영상에 자막을 추가할 수 있습니다.', en: ' You can add captions to the original video.' })
              : t({ ko: ' 다운로드하거나 YouTube 업로드를 진행하세요.', en: ' Download them or upload to YouTube.' })}
        </p>
      </div>

      {/* ─── originalWithMultiAudio: Original upload + extension auto ─── */}
      {deliverableMode === 'originalWithMultiAudio' && completedLangs.length > 0 && (
        <>
          {/* Original upload status (file upload only) */}
          {videoSource?.type === 'upload' && (
            <Card>
              <CardTitle>{t({ ko: '원본 영상 YouTube 업로드', en: 'Original video YouTube upload' })}</CardTitle>
              <div className="mt-3">
                {originalUploadState.status === 'idle' && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-surface-500 dark:text-surface-300">
                      {t({
                        ko: '원본 영상 YouTube 업로드 후 번역 자막을 추가할 수 있습니다.',
                        en: 'After the original video is uploaded to YouTube, add translated captions.',
                      })}
                    </p>
                    <Button
                      size="sm"
                      onClick={uploadOriginalToYouTube}
                      disabled={!isAuthenticated}
                    >
                      <Upload className="h-4 w-4" />
                      {t({ ko: '원본 업로드', en: 'Upload original' })}
                    </Button>
                  </div>
                )}
                {originalUploadState.status === 'uploading' && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                    <p className="text-sm text-surface-600 dark:text-surface-400">{t({ ko: '원본 영상을 업로드하는 중...', en: 'Uploading original video...' })}</p>
                  </div>
                )}
                {originalUploadState.status === 'done' && originalUploadState.videoId && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-emerald-500" />
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        {t({ ko: '업로드 완료', en: 'Uploaded' })} - <a
                          href={`https://youtube.com/watch?v=${originalUploadState.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >{t({ ko: '영상 보기', en: 'View video' })}</a>
                      </p>
                    </div>
                    <Badge variant="success">{t({ ko: '완료', en: 'Done' })}</Badge>
                  </div>
                )}
                {originalUploadState.error && (
                  <p className="text-xs text-red-500 mt-1">{originalUploadState.error}</p>
                )}
              </div>
            </Card>
          )}

          {/* Channel source — already on YouTube */}
          {videoSource?.type === 'channel' && channelVideoId && (
            <Card>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  {t({ ko: '기존 YouTube 영상에 번역 자막을 추가합니다.', en: 'Translated captions will be added to the existing YouTube video.' })}
                </p>
                <a
                  href={`https://youtube.com/watch?v=${channelVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-500 underline"
                >
                  {t({ ko: '영상 보기', en: 'View video' })}
                </a>
              </div>
            </Card>
          )}

          {/* Caption auto-upload */}
          {multiAudioVideoId && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-4">
                <CardTitle>{t({ ko: '자막(SRT) 업로드', en: 'Upload captions (SRT)' })}</CardTitle>
                {isAuthenticated ? (
                  <Badge variant="success">{t({ ko: '인증됨', en: 'Connected' })}</Badge>
                ) : (
                  <Badge variant="warning">{t({ ko: '로그인 필요', en: 'Sign-in required' })}</Badge>
                )}
              </div>
              <p className="mb-4 text-sm text-surface-500 dark:text-surface-300">
                {t({ ko: '번역된 자막을 원본 영상에 업로드합니다.', en: 'Upload translated captions to the original video.' })}
              </p>
              <div className="space-y-2">
                {completedLangs.map((code) => {
                  const lang = getLanguageByCode(code)
                  if (!lang) return null
                  const status = captionUploads[code]
                  return (
                    <div key={code} className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{lang.flag}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-white">{getDisplayLanguageName(code)}</p>
                          {status === 'uploading' && <p className="text-xs text-brand-500">{t({ ko: '업로드 중...', en: 'Uploading...' })}</p>}
                          {status === 'done' && <p className="text-xs text-emerald-600">{t({ ko: '자막 업로드 완료', en: 'Captions uploaded' })}</p>}
                          {status === 'error' && <p className="text-xs text-red-500">{t({ ko: '업로드 실패', en: 'Upload failed' })}</p>}
                        </div>
                      </div>
                      {status === 'done' ? (
                        <Badge variant="success">{t({ ko: '완료', en: 'Done' })}</Badge>
                      ) : status === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => uploadCaptionsWithMetadata(multiAudioVideoId, [code])}
                          disabled={!isAuthenticated}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {status === 'error' ? t({ ko: '재시도', en: 'Retry' }) : t({ ko: '업로드', en: 'Upload' })}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
              {completedLangs.length > 1 && (
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  onClick={() => handleUploadCaptionsToVideo(multiAudioVideoId)}
                  disabled={!isAuthenticated || completedLangs.every((c) => captionUploads[c] === 'done')}
                >
                  <Upload className="h-4 w-4" />
                  {t({ ko: '전체 자막 업로드', en: 'Upload all captions' })}
                </Button>
              )}
            </Card>
          )}

          {/* Audio track toggle + extension upload */}
          {multiAudioVideoId && (
            <Card className="border-surface-200 dark:border-surface-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{t({ ko: '다국어 오디오 트랙 추가', en: 'Add multilingual audio tracks' })}</CardTitle>
                  <p className="mt-1 text-xs text-surface-500 dark:text-surface-300">
                    {t({ ko: '더빙 오디오를 원본 영상의 오디오 트랙으로 추가합니다.', en: 'Add dubbed audio as audio tracks on the original video.' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAudioTrackEnabled((v) => !v)}
                  className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer sm:self-auto ${
                    audioTrackEnabled
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                  }`}
                >
                  {audioTrackEnabled ? t({ ko: '켜짐', en: 'On' }) : t({ ko: '꺼짐', en: 'Off' })}
                </button>
              </div>

              {!audioTrackEnabled && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  {t({
                    ko: '이 기능은 YouTube 채널에 다국어 오디오 권한이 있을 때만 사용할 수 있습니다.',
                    en: 'This requires multilingual audio access on your YouTube channel.',
                  })}
                </p>
              )}

              {audioTrackEnabled && (
                <div className="mt-4 space-y-4">
                  <YouTubeExtensionUpload
                    videoId={multiAudioVideoId}
                    completedLangs={completedLangs}
                    autoTrigger={autoUpload}
                    getAudioUrl={async (langCode) => {
                      const data = await fetchDownloads(langCode, 'voiceAudio')
                      const raw = data?.audioFile?.voiceAudioDownloadLink
                      return raw ? (raw.startsWith('http') ? raw : getPersoFileUrl(raw)) : undefined
                    }}
                  />

                  <div className="border-t border-surface-200 pt-4 dark:border-surface-700">
                    <p className="mb-3 text-xs text-surface-500 dark:text-surface-300">
                      {t({
                        ko: '확장 프로그램 없이 직접 진행하려면 아래 버튼으로 오디오를 받고 YouTube Studio를 여세요.',
                        en: 'To proceed manually without the extension, use the buttons below to download audio and open YouTube Studio.',
                      })}
                    </p>
                    <div className="space-y-2">
                      {completedLangs.map((code) => {
                        const lang = getLanguageByCode(code)
                        if (!lang) return null
                        const opening = studioOpenedLang === code
                        return (
                          <div key={code} className="flex flex-col gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{lang.flag}</span>
                              <p className="text-sm font-medium text-surface-900 dark:text-white">{getDisplayLanguageName(code)}</p>
                            </div>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => handleAudioToStudio(code, multiAudioVideoId)} loading={opening}>
                              <Volume2 className="h-3.5 w-3.5" />
                              {t({ ko: '오디오 받고 Studio 열기', en: 'Download audio and open Studio' })}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ─── Audio preview for manual mode ─── */}
      {!autoUpload && completedLangs.length > 0 && (
        <Card>
          <CardTitle>{t({ ko: '더빙 오디오 확인', en: 'Review dubbed audio' })}</CardTitle>
          <p className="mb-4 mt-1 text-xs text-surface-500 dark:text-surface-300">
            {t({ ko: '업로드 전에 더빙 오디오를 확인하세요.', en: 'Review the dubbed audio before uploading.' })}
          </p>
          <div className="space-y-3">
            {completedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              const lp = languageProgress.find((p) => p.langCode === code)
              if (!lang || !lp?.audioUrl) return null
              return (
                <div key={code} className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                  <span className="text-lg">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white mb-1">{getDisplayLanguageName(code)}</p>
                    <audio controls preload="none" className="w-full h-8" src={lp.audioUrl}>
                      <track kind="captions" />
                    </audio>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── newDubbedVideos: YouTube Auto Upload ─── */}
      {deliverableMode === 'newDubbedVideos' && (
        <Card className="border-brand-200 dark:border-brand-800">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{t({ ko: 'YouTube 업로드', en: 'YouTube upload' })}</CardTitle>
            {isAuthenticated ? (
              <Badge variant="success">{t({ ko: '인증됨', en: 'Connected' })}</Badge>
            ) : (
              <Badge variant="warning">{t({ ko: 'Google 로그인 필요', en: 'Google sign-in required' })}</Badge>
            )}
          </div>

          {isAuthenticated ? (
            <>
              <p className="mb-4 text-sm text-surface-500 dark:text-surface-300">
                {t({ ko: '언어별 더빙 영상을 새 YouTube 영상으로 업로드합니다.', en: 'Upload each language as a new dubbed YouTube video.' })}
              </p>

              <div className="mb-4 space-y-1 rounded-lg bg-surface-50 p-3 text-xs text-surface-500 dark:bg-surface-800/50 dark:text-surface-300">
                <p>
                  {t({ ko: '자동 업로드', en: 'Auto-upload' })}: <span className="font-medium text-surface-700 dark:text-surface-300">{autoUpload ? t({ ko: '켜짐', en: 'On' }) : t({ ko: '꺼짐', en: 'Off' })}</span>
                  {' · '}
                  {t({ ko: '공개 범위', en: 'Visibility' })}: <span className="font-medium text-surface-700 dark:text-surface-300">{privacyLabel}</span>
                </p>
                <p>
                  {t({ ko: '자막', en: 'Captions' })}: <span className="font-medium text-surface-700 dark:text-surface-300">{shouldUploadCaptions ? t({ ko: '켜짐', en: 'On' }) : t({ ko: '꺼짐', en: 'Off' })}</span>
                  {' · '}
                  {t({ ko: '아동용', en: 'Made for kids' })}: <span className="font-medium text-surface-700 dark:text-surface-300">{selfDeclaredMadeForKids ? t({ ko: '예', en: 'Yes' }) : t({ ko: '아니오', en: 'No' })}</span>
                  {' · '}
                  {t({ ko: 'AI 고지', en: 'AI disclosure' })}: <span className="font-medium text-surface-700 dark:text-surface-300">{shouldApplyAiDisclosure ? t({ ko: '설명에 추가', en: 'Added to description' }) : t({ ko: '추가 안 함', en: 'Not added' })}</span>
                </p>
                {attachOriginalLink && originalYouTubeUrl && (
                  <p className="break-words">{t({ ko: '원본 링크', en: 'Original link' })}: {originalYouTubeUrl}</p>
                )}
              </div>

              <div className="space-y-2">
                {completedLangs.map((code) => {
                  const lang = getLanguageByCode(code)
                  if (!lang) return null
                  const state = ytUploads[code]

                  return (
                    <div
                      key={code}
                      className="flex flex-col gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{lang.flag}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-white">{getDisplayLanguageName(code)}</p>
                          {state?.status === 'uploading' && (
                            <Progress value={state.progress} size="sm" className="mt-1 w-32" />
                          )}
                          {state?.status === 'done' && state.videoId && (
                            <p className="text-xs text-emerald-600">
                              {t({ ko: '업로드 완료', en: 'Uploaded' })} - <a
                                href={`https://youtube.com/watch?v=${state.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >{t({ ko: '영상 보기', en: 'View video' })}</a>
                            </p>
                          )}
                          {state?.status === 'error' && (
                            <p className="text-xs text-red-500">{state.error}</p>
                          )}
                        </div>
                      </div>

                      {state?.status === 'done' ? (
                        <Badge variant="success">{t({ ko: '업로드됨', en: 'Uploaded' })}</Badge>
                      ) : state?.status === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                      ) : (
                        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-0 justify-center"
                            onClick={() => handleYouTubeUpload(code)}
                            disabled={anyUploading || isYouTubeUploadLocked(state)}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {t({ ko: '지금 업로드', en: 'Upload now' })}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-w-0 justify-center"
                            onClick={() => queueYouTubeUpload(code)}
                            disabled={anyUploading || isYouTubeUploadLocked(state)}
                          >
                            {t({ ko: '나중에 업로드', en: 'Upload later' })}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {completedLangs.length > 1 && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    className="min-w-0 justify-center"
                    onClick={handleUploadAll}
                    disabled={anyUploading || !hasPendingYouTubeUploads}
                    loading={anyUploading}
                  >
                    <Upload className="h-4 w-4" />
                    {t({ ko: '모두 지금 업로드', en: 'Upload all now' })}
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-w-0 justify-center"
                    onClick={handleQueueAll}
                    disabled={anyUploading || !hasPendingYouTubeUploads}
                  >
                    <Upload className="h-4 w-4" />
                    {t({ ko: '모두 나중에 업로드', en: 'Queue all for later' })}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-300">
              {t({ ko: 'YouTube에 로그인하면 더빙 영상을 채널에 업로드할 수 있습니다.', en: 'Sign in to YouTube to upload dubbed videos to your channel.' })}
            </p>
          )}
        </Card>
      )}

      {/* ─── Caption upload to original video (URL source) ─── */}
      {deliverableMode === 'newDubbedVideos' && originalYouTubeId && completedLangs.length > 0 && isAuthenticated && (
        <Card>
          <CardTitle>{t({ ko: '원본 영상에 자막 추가', en: 'Add captions to original video' })}</CardTitle>
          <p className="mb-4 mt-1 text-sm text-surface-500 dark:text-surface-300">
            {t({ ko: '번역된 자막(SRT)을 원본 YouTube 영상에 업로드합니다.', en: 'Upload translated captions (SRT) to the original YouTube video.' })}
          </p>
          <div className="space-y-2">
            {completedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              if (!lang) return null
              const status = captionUploads[code]
              return (
                <div key={code} className="flex flex-col gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{getDisplayLanguageName(code)}</p>
                      {status === 'done' && <p className="text-xs text-emerald-600">{t({ ko: '자막 업로드 완료', en: 'Captions uploaded' })}</p>}
                      {status === 'error' && <p className="text-xs text-red-500">{t({ ko: '업로드 실패', en: 'Upload failed' })}</p>}
                    </div>
                  </div>
                  {status === 'done' ? (
                    <Badge variant="success">{t({ ko: '완료', en: 'Done' })}</Badge>
                  ) : status === 'uploading' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                  ) : (
                    <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => uploadCaptions(originalYouTubeId, [code])}>
                      <Upload className="h-3.5 w-3.5" />
                      {t({ ko: '자막 업로드', en: 'Upload captions' })}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── Download section ─── */}
      {completedLangs.length > 0 && (
        <Card>
          <CardTitle>{t({ ko: '더빙 파일 다운로드', en: 'Download dubbing files' })}</CardTitle>
          <div className="mt-4 space-y-2">
            {completedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              if (!lang) return null

              return (
                <div
                  key={code}
                  className="flex flex-col gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{getDisplayLanguageName(code)}</p>
                      <p className="text-xs text-surface-500 dark:text-surface-300">
                        {deliverableMode === 'originalWithMultiAudio'
                          ? t({ ko: '오디오 + 자막', en: 'Audio + captions' })
                          : t({ ko: '영상 + 오디오 + 자막', en: 'Video + audio + captions' })}
                      </p>
                    </div>
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
                    {deliverableMode !== 'originalWithMultiAudio' && (
                      <Button variant="outline" size="sm" className="min-w-0 justify-center" onClick={() => handleDownload(code, 'video')}
                        loading={loadingDownload === `${code}-video`}>
                        <Download className="h-3.5 w-3.5" /> {t({ ko: '영상', en: 'Video' })}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="min-w-0 justify-center" onClick={() => handleDownload(code, 'voiceAudio')}
                      loading={loadingDownload === `${code}-voiceAudio`}>
                      <Download className="h-3.5 w-3.5" /> {t({ ko: '오디오', en: 'Audio' })}
                    </Button>
                    <Button variant="outline" size="sm" className="min-w-0 justify-center" onClick={() => handleDownload(code, 'translatedSubtitle')}
                      loading={loadingDownload === `${code}-translatedSubtitle`}>
                      <Download className="h-3.5 w-3.5" /> {t({ ko: '자막', en: 'Captions' })}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── Failed languages ─── */}
      {failedLangs.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardTitle>{t({ ko: '실패한 언어', en: 'Failed languages' })}</CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {failedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              return lang ? <Badge key={code} variant="error">{lang.flag} {getDisplayLanguageName(code)}</Badge> : null
            })}
          </div>
          <p className="mt-2 text-xs text-surface-500 dark:text-surface-300">
            {t({ ko: '이 언어들은 처리에 실패했습니다. 새 더빙 작업으로 다시 시도할 수 있습니다.', en: 'These languages failed. You can try them again in a new dubbing job.' })}
          </p>
        </Card>
      )}

      {/* ─── Subtitle & Script editor (merged) ─── */}
      {completedLangs.length > 0 && spaceSeq && (
        <Card>
          <CardTitle>{t({ ko: '자막 · 대사 편집', en: 'Edit captions and dialogue' })}</CardTitle>
          <p className="mb-4 mt-1 text-xs text-surface-500 dark:text-surface-300">
            {t({
              ko: '번역 텍스트를 수정하면 다시 생성할 때 더빙 오디오에 반영됩니다. 시간 변경은 자막 파일과 YouTube 자막에 적용됩니다.',
              en: 'Text edits apply to regenerated dubbing audio. Timing edits apply to caption files and YouTube captions.',
            })}
          </p>
          <div className="space-y-2">
            {completedLangs.map((code) => (
              <SubtitleScriptEditor
                key={code}
                langCode={code}
                projectSeq={projectMap[code] || 0}
                spaceSeq={spaceSeq}
                youtubeVideoId={ytUploads[code]?.videoId ?? null}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ─── Actions ─── */}
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={handleNewDubbing}>
          <RotateCcw className="h-4 w-4" /> {t({ ko: '새 더빙', en: 'New dubbing' })}
        </Button>
        <Button onClick={handleGoToDashboard}>{t({ ko: '대시보드로', en: 'Go to dashboard' })}</Button>
      </div>
    </div>
  )
}
