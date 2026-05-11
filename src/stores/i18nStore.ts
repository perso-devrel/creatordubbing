'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_APP_LOCALE,
  DEFAULT_METADATA_TARGET_LANGUAGES,
  DEFAULT_METADATA_TARGET_PRESET,
  normalizeMetadataTargetLanguages,
  resolveMetadataTargetPresetId,
  resolveAppLocale,
  type AppLocale,
} from '@/lib/i18n/config'

interface I18nState {
  appLocale: AppLocale
  metadataTargetPreset: string
  metadataTargetLanguages: string[]
  setAppLocale: (locale: AppLocale) => void
  setMetadataTargetPreset: (presetId: string) => void
  setMetadataTargetLanguages: (languageCodes: string[]) => void
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      appLocale: DEFAULT_APP_LOCALE,
      metadataTargetPreset: DEFAULT_METADATA_TARGET_PRESET,
      metadataTargetLanguages: [...DEFAULT_METADATA_TARGET_LANGUAGES],
      setAppLocale: (locale) => set({ appLocale: resolveAppLocale(locale) }),
      setMetadataTargetPreset: (presetId) => set({ metadataTargetPreset: resolveMetadataTargetPresetId(presetId) }),
      setMetadataTargetLanguages: (languageCodes) => set({
        metadataTargetLanguages: normalizeMetadataTargetLanguages(languageCodes),
      }),
    }),
    {
      name: 'dubtube-i18n',
      partialize: (state) => ({
        appLocale: state.appLocale,
        metadataTargetPreset: state.metadataTargetPreset,
        metadataTargetLanguages: state.metadataTargetLanguages,
      }),
      merge: (persisted, current) => {
        const state = persisted as Partial<I18nState> | undefined
        return {
          ...current,
          ...state,
          appLocale: resolveAppLocale(state?.appLocale),
          metadataTargetPreset: resolveMetadataTargetPresetId(state?.metadataTargetPreset || DEFAULT_METADATA_TARGET_PRESET),
          metadataTargetLanguages: normalizeMetadataTargetLanguages(state?.metadataTargetLanguages),
        }
      },
      skipHydration: true,
    },
  ),
)
