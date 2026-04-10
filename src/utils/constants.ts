export const APP_NAME = 'CreatorDub'
export const APP_TAGLINE = 'One URL, reach the world.'
export const MAX_VIDEO_DURATION_MINUTES = 30
export const MAX_LANGUAGES = 10
export const POLLING_INTERVAL_MS = 3000

export const PLAN_TIERS = ['free', 'starter', 'creator', 'agency'] as const
export type PlanTier = (typeof PLAN_TIERS)[number]
