export interface CreditPack {
  minutes: number
  price: number
  priceKrw: number
  label: string
}

export const CREDIT_PACKS: CreditPack[] = [
  { minutes: 10, price: 10, priceKrw: 10000, label: '10분' },
  { minutes: 30, price: 30, priceKrw: 30000, label: '30분' },
  { minutes: 60, price: 60, priceKrw: 60000, label: '1시간' },
  { minutes: 120, price: 120, priceKrw: 120000, label: '2시간' },
]

export function getCreditPack(minutes: number) {
  return CREDIT_PACKS.find((pack) => pack.minutes === minutes) ?? null
}
