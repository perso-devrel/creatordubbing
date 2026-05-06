'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_APP_LOCALE,
  DEFAULT_METADATA_TARGET_PRESET,
  resolveAppLocale,
  type AppLocale,
} from '@/lib/i18n/config'

interface I18nState {
  appLocale: AppLocale
  metadataTargetPreset: string
  setAppLocale: (locale: AppLocale) => void
  setMetadataTargetPreset: (presetId: string) => void
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      appLocale: DEFAULT_APP_LOCALE,
      metadataTargetPreset: DEFAULT_METADATA_TARGET_PRESET,
      setAppLocale: (locale) => set({ appLocale: resolveAppLocale(locale) }),
      setMetadataTargetPreset: (presetId) => set({ metadataTargetPreset: presetId }),
    }),
    {
      name: 'dubtube-i18n',
      partialize: (state) => ({
        appLocale: state.appLocale,
        metadataTargetPreset: state.metadataTargetPreset,
      }),
      merge: (persisted, current) => {
        const state = persisted as Partial<I18nState> | undefined
        return {
          ...current,
          ...state,
          appLocale: resolveAppLocale(state?.appLocale),
          metadataTargetPreset: state?.metadataTargetPreset || DEFAULT_METADATA_TARGET_PRESET,
        }
      },
    },
  ),
)
