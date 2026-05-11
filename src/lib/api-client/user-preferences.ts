import { getJson, sendJson } from './shared'
import type { UserPreferences } from '@/lib/validators/user-preferences'

export type UserPreferencesPayload = Required<UserPreferences>

export function fetchUserPreferences(): Promise<UserPreferencesPayload> {
  return getJson<UserPreferencesPayload>('/api/user/preferences')
}

export function saveUserPreferences(
  patch: UserPreferences,
): Promise<UserPreferencesPayload> {
  return sendJson<UserPreferencesPayload>('/api/user/preferences', 'PUT', patch)
}
