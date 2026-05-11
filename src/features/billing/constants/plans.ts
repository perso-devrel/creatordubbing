import type { MessageKey } from '@/lib/i18n/messages'

export interface CreditPack {
  minutes: number
  price: number
  priceKrw: number
  labelKey?: MessageKey
}

export const CREDIT_PACKS: CreditPack[] = [
  { minutes: 10, price: 10, priceKrw: 10000 },
  { minutes: 30, price: 30, priceKrw: 30000 },
  { minutes: 60, price: 60, priceKrw: 60000, labelKey: 'billing.creditPack.oneHour' },
  { minutes: 120, price: 120, priceKrw: 120000, labelKey: 'billing.creditPack.twoHours' },
]

export function getCreditPack(minutes: number) {
  return CREDIT_PACKS.find((pack) => pack.minutes === minutes) ?? null
}
