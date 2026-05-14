'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useI18nStore } from '@/stores/i18nStore'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import { fetchUserPreferences } from '@/lib/api-client/user-preferences'
import { getPathLocale } from '@/lib/i18n/config'

/**
 * youtubeSettingsStore와 i18nStore에 서버(/api/user/preferences) 설정을 주입한다.
 *
 * 1. 사용자 uid 변경(로그인/로그아웃/계정 전환) 시 store를 즉시 reset → 잔존 데이터 노출 방지
 * 2. 서버에서 preferences를 fetch해 store hydrate
 *
 * 저장은 설정 화면에서 명시적으로 수행한다. 태그 입력 중 자동 PUT이 발생하지 않도록
 * 이 훅은 더 이상 store 변경을 서버로 autosave하지 않는다.
 */
export function useUserPreferencesSync() {
  const user = useAuthStore((s) => s.user)
  const uid = user?.uid ?? null
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const routeLocale = getPathLocale(pathname)

  const previousUidRef = useRef<string | null>(uid)

  // ── 1. uid가 바뀌면 즉시 reset (서버 fetch 시작 전 stale 데이터 차단)
  useEffect(() => {
    if (previousUidRef.current !== uid) {
      useYouTubeSettingsStore.getState().reset()
      previousUidRef.current = uid
      // 새 uid에 대한 캐시는 깨끗하게 시작
      if (uid) queryClient.invalidateQueries({ queryKey: ['user-preferences', uid] })
    }
  }, [uid, queryClient])

  // ── 2. 서버에서 preferences 가져오기 (uid별 캐시)
  const { data: serverPrefs } = useQuery({
    queryKey: ['user-preferences', uid],
    queryFn: fetchUserPreferences,
    enabled: !!uid,
    staleTime: 5 * 60_000,
    retry: false,
  })

  // ── 2b. 받은 값을 store에 주입
  useEffect(() => {
    if (!serverPrefs) return
    const store = useYouTubeSettingsStore.getState()
    store.setDefaultPrivacy(serverPrefs.defaultPrivacy)
    store.setDefaultLanguage(serverPrefs.defaultLanguage)
    store.setDefaultTags(serverPrefs.defaultTags)
    const i18nStore = useI18nStore.getState()
    i18nStore.setAppLocale(routeLocale ?? serverPrefs.appLocale)
    i18nStore.setMetadataTargetPreset(serverPrefs.metadataTargetPreset)
    i18nStore.setMetadataTargetLanguages(serverPrefs.metadataTargetLanguages)
  }, [routeLocale, serverPrefs])
}
