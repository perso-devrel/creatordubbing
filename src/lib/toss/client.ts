import 'server-only'

import { getServerEnv } from '@/lib/env'

const DEFAULT_METHOD = 'CARD'

export interface TossPayment {
  paymentKey?: string
  orderId: string
  orderName: string
  status?: string
  totalAmount?: number
  amount?: number
  currency?: string
  method?: string | null
  checkout?: {
    url?: string
  }
  [key: string]: unknown
}

class TossApiError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, code: string, message: string, details: unknown = null) {
    super(message)
    this.name = 'TossApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function getTossConfig() {
  const env = getServerEnv()
  if (!env.TOSS_SECRET_KEY) {
    throw new TossApiError(503, 'TOSS_NOT_CONFIGURED', 'Toss Payments secret key is not configured')
  }
  return {
    baseUrl: (env.TOSS_API_BASE_URL ?? 'https://api.tosspayments.com').replace(/\/$/, ''),
    secretKey: env.TOSS_SECRET_KEY,
  }
}

function authHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

async function tossRequest<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { baseUrl, secretKey } = getTossConfig()
  const headers = new Headers(init.headers)
  headers.set('Authorization', authHeader(secretKey))
  headers.set('Content-Type', 'application/json')
  headers.set('Accept-Language', 'ko-KR')
  if (init.idempotencyKey) {
    headers.set('Idempotency-Key', init.idempotencyKey)
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const code = typeof body?.code === 'string' ? body.code : 'TOSS_API_ERROR'
    const message = typeof body?.message === 'string' ? body.message : `Toss API failed with ${res.status}`
    throw new TossApiError(res.status, code, message, body)
  }
  return body as T
}

export function createTossPayment(args: {
  amount: number
  orderId: string
  orderName: string
  successUrl: string
  failUrl: string
  customerEmail?: string | null
  customerName?: string | null
}) {
  return tossRequest<TossPayment>('/v1/payments', {
    method: 'POST',
    idempotencyKey: `create-${args.orderId}`,
    body: JSON.stringify({
      method: DEFAULT_METHOD,
      amount: args.amount,
      currency: 'KRW',
      orderId: args.orderId,
      orderName: args.orderName,
      successUrl: args.successUrl,
      failUrl: args.failUrl,
      flowMode: 'DEFAULT',
      customerEmail: args.customerEmail ?? undefined,
      customerName: args.customerName ?? undefined,
    }),
  })
}

export function confirmTossPayment(args: {
  paymentKey: string
  orderId: string
  amount: number
}) {
  return tossRequest<TossPayment>('/v1/payments/confirm', {
    method: 'POST',
    idempotencyKey: `confirm-${args.orderId}`,
    body: JSON.stringify(args),
  })
}

export function retrieveTossPayment(paymentKey: string) {
  return tossRequest<TossPayment>(`/v1/payments/${encodeURIComponent(paymentKey)}`, {
    method: 'GET',
  })
}
