import type { PlanTier } from '@/utils/constants'

export interface PlanDefinition {
  tier: PlanTier
  name: string
  price: number
  priceLabel: string
  description: string
  popular?: boolean
  features: string[]
  limits: {
    monthlyMinutes: number | null
    maxLanguages: number
    maxResolution: string
    watermark: boolean
    lipSync: boolean
    autoUpload: boolean
    priorityQueue: boolean
    teamMembers: number
    apiAccess: boolean
    customGlossary: boolean
  }
}

export const PLANS: PlanDefinition[] = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    description: '무료 체험',
    features: ['월 3분 더빙', '2개 언어', '720p 출력', '워터마크 포함'],
    limits: { monthlyMinutes: 3, maxLanguages: 2, maxResolution: '720p', watermark: true, lipSync: false, autoUpload: false, priorityQueue: false, teamMembers: 1, apiAccess: false, customGlossary: false },
  },
  {
    tier: 'starter',
    name: 'Starter',
    price: 9.99,
    priceLabel: '$9.99',
    description: '성장하는 크리에이터',
    features: ['월 30분 더빙', '5개 언어', '1080p 출력', '워터마크 없음', '번역 에디터'],
    limits: { monthlyMinutes: 30, maxLanguages: 5, maxResolution: '1080p', watermark: false, lipSync: false, autoUpload: false, priorityQueue: false, teamMembers: 1, apiAccess: false, customGlossary: false },
  },
  {
    tier: 'creator',
    name: 'Creator',
    price: 29.99,
    priceLabel: '$29.99',
    description: '본격 크리에이터',
    popular: true,
    features: ['무제한 더빙', '10개 언어', '4K 출력', '립싱크', 'YouTube 자동 업로드', '우선 처리 큐', '맞춤 용어집'],
    limits: { monthlyMinutes: null, maxLanguages: 10, maxResolution: '4K', watermark: false, lipSync: true, autoUpload: true, priorityQueue: true, teamMembers: 1, apiAccess: false, customGlossary: true },
  },
  {
    tier: 'agency',
    name: 'Agency',
    price: 99.99,
    priceLabel: '$99.99',
    description: '팀 & 에이전시',
    features: ['Creator 전체 포함', '팀 계정 5명', '전용 API 접근', '맞춤 용어집', '우선 지원', '대량 할인'],
    limits: { monthlyMinutes: null, maxLanguages: 10, maxResolution: '4K', watermark: false, lipSync: true, autoUpload: true, priorityQueue: true, teamMembers: 5, apiAccess: true, customGlossary: true },
  },
]

export const CREDIT_PACKS = [
  { credits: 100, price: 80, perCredit: 0.80 },
  { credits: 500, price: 350, perCredit: 0.70 },
  { credits: 1000, price: 600, perCredit: 0.60 },
]
