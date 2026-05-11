'use client'

import { create } from 'zustand'
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
  reset: () => void
}

const INITIAL_YOUTUBE_SETTINGS = {
  defaultPrivacy: 'private' as PrivacyStatus,
  defaultLanguage: 'ko',
  defaultTags: ['Dubtube', 'AI더빙', 'dubbed'],
}

/**
 * 인메모리 캐시. 서버(/api/user/preferences)가 source of truth이며,
 * 로그인 직후 useUserPreferencesSync 훅이 hydrate한다.
 * 저장은 설정 화면에서 명시적으로 수행한다.
 *
 * localStorage 영속화는 일부러 사용하지 않는다 — 다른 사용자가 같은 브라우저로
 * 로그인했을 때 이전 사용자의 설정이 새는 것을 방지하기 위함.
 */
export const useYouTubeSettingsStore = create<YouTubeSettingsState>(
  (set) => ({
    ...INITIAL_YOUTUBE_SETTINGS,
    setDefaultPrivacy: (v) => set({ defaultPrivacy: v }),
    setDefaultLanguage: (v) => set({ defaultLanguage: v }),
    setDefaultTags: (v) => set({ defaultTags: v }),
    // 계정 전환 직후 서버에서 새 값을 받기 전, 이전 사용자 설정이 잠시 노출되지 않도록 초기값으로 되돌린다.
    reset: () => set({ ...INITIAL_YOUTUBE_SETTINGS, defaultTags: [...INITIAL_YOUTUBE_SETTINGS.defaultTags] }),
  }),
)
