'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PrivacyStatus } from '@/features/dubbing/types/dubbing.types'

interface YouTubeSettingsState {
  defaultPrivacy: PrivacyStatus
  autoSubtitles: boolean
  /**
   * 사용자가 제목·설명을 작성할 기본 언어 (perso.ai 코드 기반).
   * 업로드 시 이 언어로 작성된 텍스트를 기준 삼아 다른 대상 언어로 자동 번역한다.
   */
  defaultLanguage: string
  setDefaultPrivacy: (v: PrivacyStatus) => void
  setAutoSubtitles: (v: boolean) => void
  setDefaultLanguage: (v: string) => void
}

export const useYouTubeSettingsStore = create<YouTubeSettingsState>()(
  persist(
    (set) => ({
      defaultPrivacy: 'private',
      autoSubtitles: true,
      defaultLanguage: 'ko',
      setDefaultPrivacy: (v) => set({ defaultPrivacy: v }),
      setAutoSubtitles: (v) => set({ autoSubtitles: v }),
      setDefaultLanguage: (v) => set({ defaultLanguage: v }),
    }),
    { name: 'dubtube-youtube-settings' },
  ),
)
