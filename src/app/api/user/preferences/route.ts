import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { getUserPreferencesRaw, setUserPreferencesRaw } from '@/lib/db/queries'
import {
  parseUserPreferences,
  userPreferencesSchema,
} from '@/lib/validators/user-preferences'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  try {
    const raw = await getUserPreferencesRaw(auth.session.uid)
    return apiOk(parseUserPreferences(raw))
  } catch (err) {
    return apiFailFromError(err)
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiFail('INVALID_BODY', 'Invalid JSON body', 400)
  }

  const parsed = userPreferencesSchema.safeParse(body)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    return apiFail('INVALID_BODY', `Invalid preferences: ${details}`, 400)
  }

  try {
    // 부분 업데이트 지원 — 기존 저장 값에 머지해 누락된 키는 유지한다.
    const existingRaw = await getUserPreferencesRaw(auth.session.uid)
    const existing = parseUserPreferences(existingRaw)
    const next = {
      defaultPrivacy: parsed.data.defaultPrivacy ?? existing.defaultPrivacy,
      defaultLanguage: parsed.data.defaultLanguage ?? existing.defaultLanguage,
      defaultTags: parsed.data.defaultTags ?? existing.defaultTags,
    }
    await setUserPreferencesRaw(auth.session.uid, JSON.stringify(next))
    return apiOk(next)
  } catch (err) {
    return apiFailFromError(err)
  }
}
