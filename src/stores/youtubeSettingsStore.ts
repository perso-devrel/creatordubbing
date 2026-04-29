'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PrivacyStatus } from '@/features/dubbing/types/dubbing.types'

interface YouTubeSettingsState {
  defaultPrivacy: PrivacyStatus
  autoSubtitles: boolean
  setDefaultPrivacy: (v: PrivacyStatus) => void
  setAutoSubtitles: (v: boolean) => void
}

export const useYouTubeSettingsStore = create<YouTubeSettingsState>()(
  persist(
    (set) => ({
      defaultPrivacy: 'private',
      autoSubtitles: true,
      setDefaultPrivacy: (v) => set({ defaultPrivacy: v }),
      setAutoSubtitles: (v) => set({ autoSubtitles: v }),
    }),
    { name: 'dubtube-youtube-settings' },
  ),
)
