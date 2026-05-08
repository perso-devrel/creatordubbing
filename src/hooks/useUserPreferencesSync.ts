'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import {
  fetchUserPreferences,
  saveUserPreferences,
} from '@/lib/api-client/user-preferences'

const SAVE_DEBOUNCE_MS = 800

/**
 * youtubeSettingsStore와 서버(/api/user/preferences) 간 양방향 동기화.
 *
 * 1. 사용자 uid 변경(로그인/로그아웃/계정 전환) 시 store를 즉시 reset → 잔존 데이터 노출 방지
 * 2. 서버에서 preferences를 fetch해 store hydrate
 * 3. 사용자가 store를 변경하면 debounced로 서버에 PUT
 *
 * Providers에서 1회 마운트하면 앱 전역에서 자동 동작.
 */
export function useUserPreferencesSync() {
  const user = useAuthStore((s) => s.user)
  const uid = user?.uid ?? null
  const queryClient = useQueryClient()

  const previousUidRef = useRef<string | null>(uid)
  /** 서버에서 받은 값을 store에 주입하는 동안엔 PUT을 트리거하지 않도록 잠그는 플래그. */
  const hydratingRef = useRef(false)

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
    hydratingRef.current = true
    const store = useYouTubeSettingsStore.getState()
    store.setDefaultPrivacy(serverPrefs.defaultPrivacy)
    store.setDefaultLanguage(serverPrefs.defaultLanguage)
    store.setDefaultTags(serverPrefs.defaultTags)
    // 다음 tick에 잠금 해제 — subscribe 콜백이 위 set 호출들을 처리한 뒤 PUT이 안 나가도록.
    const handle = setTimeout(() => { hydratingRef.current = false }, 0)
    return () => clearTimeout(handle)
  }, [serverPrefs])

  // ── 3. store 변경 → debounced 서버 PUT
  const saveMutation = useMutation({ mutationFn: saveUserPreferences })

  useEffect(() => {
    if (!uid) return
    let timer: ReturnType<typeof setTimeout> | null = null
    let lastSerialized = ''

    const unsubscribe = useYouTubeSettingsStore.subscribe((state) => {
      if (hydratingRef.current) return
      const next = {
        defaultPrivacy: state.defaultPrivacy,
        defaultLanguage: state.defaultLanguage,
        defaultTags: state.defaultTags,
      }
      const serialized = JSON.stringify(next)
      if (serialized === lastSerialized) return
      lastSerialized = serialized
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        saveMutation.mutate(next)
      }, SAVE_DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [uid, saveMutation])
}
