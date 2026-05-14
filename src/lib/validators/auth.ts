import { z } from 'zod'

export const syncBodySchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  photoURL: z.string().url().nullable().optional(),
})

export const callbackBodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
  scopeMode: z.enum(['login', 'youtube-write', 'youtube-readonly']).default('login'),
})
