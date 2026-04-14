export const PLAN_TIERS = ['free', 'starter', 'creator', 'agency'] as const
export type PlanTier = (typeof PLAN_TIERS)[number]
