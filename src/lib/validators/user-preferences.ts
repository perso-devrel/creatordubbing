import { z } from 'zod'

/**
 * 서버에 저장되는 사용자별 워크플로우 설정.
 * youtubeSettingsStore와 동일한 형태 — UI는 이 값을 그대로 hydrate한다.
 *
 * 새 키 추가 시 이 스키마와 DEFAULT_USER_PREFERENCES, 그리고 클라이언트 store만 갱신하면 된다.
 */
export const userPreferencesSchema = z.object({
  defaultPrivacy: z.enum(['public', 'unlisted', 'private']).optional(),
  defaultLanguage: z.string().min(1).max(20).optional(),
  defaultTags: z.array(z.string().max(100)).max(50).optional(),
})

export type UserPreferences = z.infer<typeof userPreferencesSchema>

export const DEFAULT_USER_PREFERENCES: Required<UserPreferences> = {
  defaultPrivacy: 'private',
  defaultLanguage: 'ko',
  defaultTags: ['Dubtube', 'AI더빙', 'dubbed'],
}

/** DB에서 읽은 raw JSON 문자열을 안전하게 파싱한다 — 깨졌거나 비어있으면 기본값 반환. */
export function parseUserPreferences(raw: string | null): Required<UserPreferences> {
  if (!raw) return { ...DEFAULT_USER_PREFERENCES, defaultTags: [...DEFAULT_USER_PREFERENCES.defaultTags] }
  try {
    const parsed = userPreferencesSchema.parse(JSON.parse(raw))
    return {
      defaultPrivacy: parsed.defaultPrivacy ?? DEFAULT_USER_PREFERENCES.defaultPrivacy,
      defaultLanguage: parsed.defaultLanguage ?? DEFAULT_USER_PREFERENCES.defaultLanguage,
      defaultTags: parsed.defaultTags ?? [...DEFAULT_USER_PREFERENCES.defaultTags],
    }
  } catch {
    return { ...DEFAULT_USER_PREFERENCES, defaultTags: [...DEFAULT_USER_PREFERENCES.defaultTags] }
  }
}
