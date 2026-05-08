'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PrivacyStatus } from '@/features/dubbing/types/dubbing.types'

interface YouTubeSettingsState {
  defaultPrivacy: PrivacyStatus
  /**
   * 사용자가 제목·설명을 작성할 기본 언어 (perso.ai 코드 기반).
   * 업로드 시 이 언어로 작성된 텍스트를 기준 삼아 다른 대상 언어로 자동 번역한다.
   */
  defaultLanguage: string
  /**
   * 새 더빙 세션 시작 시 업로드 태그의 기본값으로 적용된다.
   * 사용자가 더빙별로 override 가능.
   */
  defaultTags: string[]
  setDefaultPrivacy: (v: PrivacyStatus) => void
  setDefaultLanguage: (v: string) => void
  setDefaultTags: (v: string[]) => void
}

export const useYouTubeSettingsStore = create<YouTubeSettingsState>()(
  persist(
    (set) => ({
      defaultPrivacy: 'private',
      defaultLanguage: 'ko',
      defaultTags: ['Dubtube', 'AI더빙', 'dubbed'],
      setDefaultPrivacy: (v) => set({ defaultPrivacy: v }),
      setDefaultLanguage: (v) => set({ defaultLanguage: v }),
      setDefaultTags: (v) => set({ defaultTags: v }),
    }),
    { name: 'dubtube-youtube-settings' },
  ),
)
