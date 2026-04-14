// 1 credit = 1 minute of dubbing = $1
export const CREDIT_RATE_PER_MINUTE = 1 // USD

export interface CreditPack {
  minutes: number
  price: number
  label: string
}

export const CREDIT_PACKS: CreditPack[] = [
  { minutes: 10, price: 10, label: '10분' },
  { minutes: 30, price: 30, label: '30분' },
  { minutes: 60, price: 60, label: '1시간' },
  { minutes: 120, price: 120, label: '2시간' },
]
