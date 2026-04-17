'use client'

import { create } from 'zustand'
import type {
  DubbingStep,
  VideoSource,
  VideoMetadata,
  TranslationSegment,
  LanguageProgress,
  GlossaryEntry,
  JobStatus,
  UploadSettings,
} from '../types/dubbing.types'

const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
  autoUpload: true,
  uploadAsShort: false,
  attachOriginalLink: true,
  title: '',
  description: '',
  tags: ['CreatorDub', 'AI더빙', 'dubbed'],
  privacyStatus: 'private',
}

interface DubbingState {
  // Wizard navigation
  currentStep: DubbingStep
  setStep: (step: DubbingStep) => void
  nextStep: () => void
  prevStep: () => void

  // Submission guard — persists across component remounts
  isSubmitted: boolean
  setIsSubmitted: (v: boolean) => void

  // Perso context
  spaceSeq: number | null
  mediaSeq: number | null
  setSpaceSeq: (seq: number) => void
  setMediaSeq: (seq: number) => void

  // Step 1: Video source
  videoSource: VideoSource | null
  videoMeta: VideoMetadata | null
  setVideoSource: (source: VideoSource) => void
  setVideoMeta: (meta: VideoMetadata) => void

  // Step 2: Language selection
  sourceLanguage: string
  selectedLanguages: string[]
  lipSyncEnabled: boolean
  setSourceLanguage: (code: string) => void
  toggleLanguage: (code: string) => void
  setLipSync: (enabled: boolean) => void

  // Step 3: Translation editing
  segments: Record<string, TranslationSegment[]>
  setSegments: (langCode: string, segments: TranslationSegment[]) => void
  updateSegment: (langCode: string, segmentId: string, text: string) => void
  toggleExcludeSegment: (langCode: string, segmentId: string) => void

  // Step 4: Processing — maps langCode to projectSeq
  projectMap: Record<string, number>
  jobStatus: JobStatus
  languageProgress: LanguageProgress[]
  setProjectMap: (map: Record<string, number>) => void
  setJobStatus: (status: JobStatus) => void
  setLanguageProgress: (progress: LanguageProgress[]) => void
  updateLanguageProgress: (langCode: string, update: Partial<LanguageProgress>) => void

  // DB
  dbJobId: number | null
  setDbJobId: (id: number) => void

  // Shorts
  isShort: boolean
  setIsShort: (v: boolean) => void

  // Upload settings (chosen before dubbing starts)
  uploadSettings: UploadSettings
  setUploadSettings: (patch: Partial<UploadSettings>) => void

  // Glossary
  glossary: GlossaryEntry[]
  addGlossaryEntry: (entry: GlossaryEntry) => void
  removeGlossaryEntry: (id: string) => void

  // Reset
  reset: () => void
}

const initialState = {
  currentStep: 1 as DubbingStep,
  isSubmitted: false,
  spaceSeq: null as number | null,
  mediaSeq: null as number | null,
  videoSource: null as VideoSource | null,
  videoMeta: null as VideoMetadata | null,
  sourceLanguage: 'ko',
  selectedLanguages: [] as string[],
  lipSyncEnabled: false,
  isShort: false,
  segments: {} as Record<string, TranslationSegment[]>,
  projectMap: {} as Record<string, number>,
  dbJobId: null as number | null,
  jobStatus: 'idle' as JobStatus,
  languageProgress: [] as LanguageProgress[],
  glossary: [] as GlossaryEntry[],
  uploadSettings: { ...DEFAULT_UPLOAD_SETTINGS } as UploadSettings,
}

export const useDubbingStore = create<DubbingState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),
  setIsSubmitted: (v) => set({ isSubmitted: v }),
  nextStep: () => set((s) => ({ currentStep: Math.min(6, s.currentStep + 1) as DubbingStep })),
  prevStep: () => set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) as DubbingStep })),

  setSpaceSeq: (seq) => set({ spaceSeq: seq }),
  setMediaSeq: (seq) => set({ mediaSeq: seq }),

  setVideoSource: (source) => set({ videoSource: source }),
  setVideoMeta: (meta) => set({ videoMeta: meta }),

  setSourceLanguage: (code) =>
    set((s) => ({
      sourceLanguage: code,
      // Target list must not include the source language
      selectedLanguages: s.selectedLanguages.filter((l) => l !== code),
    })),
  toggleLanguage: (code) =>
    set((s) => ({
      selectedLanguages: s.selectedLanguages.includes(code)
        ? s.selectedLanguages.filter((l) => l !== code)
        : [...s.selectedLanguages, code],
    })),
  setLipSync: (enabled) => set({ lipSyncEnabled: enabled }),

  setSegments: (langCode, segments) =>
    set((s) => ({ segments: { ...s.segments, [langCode]: segments } })),
  updateSegment: (langCode, segmentId, text) =>
    set((s) => ({
      segments: {
        ...s.segments,
        [langCode]: (s.segments[langCode] || []).map((seg) =>
          seg.id === segmentId ? { ...seg, translatedText: text } : seg,
        ),
      },
    })),
  toggleExcludeSegment: (langCode, segmentId) =>
    set((s) => ({
      segments: {
        ...s.segments,
        [langCode]: (s.segments[langCode] || []).map((seg) =>
          seg.id === segmentId ? { ...seg, excluded: !seg.excluded } : seg,
        ),
      },
    })),

  setProjectMap: (map) => set({ projectMap: map }),
  setJobStatus: (status) => set({ jobStatus: status }),
  setLanguageProgress: (progress) => set({ languageProgress: progress }),
  updateLanguageProgress: (langCode, update) =>
    set((s) => ({
      languageProgress: s.languageProgress.map((lp) =>
        lp.langCode === langCode ? { ...lp, ...update } : lp,
      ),
    })),

  setDbJobId: (id) => set({ dbJobId: id }),
  setIsShort: (v) => set((s) => ({
    isShort: v,
    uploadSettings: { ...s.uploadSettings, uploadAsShort: v },
  })),

  setUploadSettings: (patch) => set((s) => ({
    uploadSettings: { ...s.uploadSettings, ...patch },
  })),

  addGlossaryEntry: (entry) => set((s) => ({ glossary: [...s.glossary, entry] })),
  removeGlossaryEntry: (id) => set((s) => ({ glossary: s.glossary.filter((e) => e.id !== id) })),

  reset: () => set(initialState),
}))
