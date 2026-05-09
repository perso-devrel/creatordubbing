import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
}))

vi.mock('@/lib/db/queries', () => ({
  createPaymentOrder: vi.fn(),
  updatePaymentOrderCheckout: vi.fn(),
  updatePaymentOrderStatus: vi.fn(),
  getPaymentOrderByOrderId: vi.fn(),
  grantPaidCredits: vi.fn(async () => ({ granted: true, idempotent: false })),
}))

vi.mock('@/lib/toss/client', () => ({
  createTossPayment: vi.fn(async () => ({
    orderId: 'DT-1',
    orderName: 'Dubtube 10분 더빙 시간',
    checkout: { url: 'https://pay.toss.test/checkout' },
  })),
  confirmTossPayment: vi.fn(async () => ({
    paymentKey: 'pay_1',
    orderId: 'DT-1',
    orderName: 'Dubtube 10분 더빙 시간',
    status: 'DONE',
  })),
  retrieveTossPayment: vi.fn(async () => ({
    paymentKey: 'pay_1',
    orderId: 'DT-1',
    orderName: 'Dubtube 10분 더빙 시간',
    status: 'DONE',
    totalAmount: 10000,
  })),
}))

vi.mock('@/lib/ops/observability', () => ({
  recordOperationalEventSafe: vi.fn(async () => undefined),
}))

import { requireSession } from '@/lib/auth/session'
import {
  createPaymentOrder,
  getPaymentOrderByOrderId,
  grantPaidCredits,
  updatePaymentOrderCheckout,
  updatePaymentOrderStatus,
} from '@/lib/db/queries'
import { createTossPayment, confirmTossPayment, retrieveTossPayment } from '@/lib/toss/client'

const mockRequireSession = vi.mocked(requireSession)
const mockCreatePaymentOrder = vi.mocked(createPaymentOrder)
const mockUpdatePaymentOrderCheckout = vi.mocked(updatePaymentOrderCheckout)
const mockUpdatePaymentOrderStatus = vi.mocked(updatePaymentOrderStatus)
const mockGetPaymentOrderByOrderId = vi.mocked(getPaymentOrderByOrderId)
const mockGrantPaidCredits = vi.mocked(grantPaidCredits)
const mockCreateTossPayment = vi.mocked(createTossPayment)
const mockConfirmTossPayment = vi.mocked(confirmTossPayment)
const mockRetrieveTossPayment = vi.mocked(retrieveTossPayment)

function auth(uid = 'user1') {
  mockRequireSession.mockResolvedValueOnce({
    ok: true,
    session: { uid, email: `${uid}@example.com` },
  })
}

function noAuth() {
  mockRequireSession.mockResolvedValueOnce({
    ok: false,
    response: Response.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, { status: 401 }),
  })
}

function order(overrides: Partial<Awaited<ReturnType<typeof getPaymentOrderByOrderId>>> = {}) {
  return {
    order_id: 'DT-100',
    user_id: 'user1',
    pack_minutes: 10,
    amount: 10000,
    currency: 'KRW',
    status: 'checkout_created',
    payment_key: null,
    checkout_url: 'https://pay.toss.test/checkout',
    order_name: 'Dubtube 10분 더빙 시간',
    raw_json: null,
    ...overrides,
  }
}

describe('/api/billing/toss/create-payment', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ POST } = await import('./create-payment/route'))
  })

  it('requires an authenticated session', async () => {
    noAuth()
    const req = new NextRequest('http://localhost/api/billing/toss/create-payment', {
      method: 'POST',
      body: JSON.stringify({ minutes: 10 }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects unsupported credit packs', async () => {
    auth()
    const req = new NextRequest('http://localhost/api/billing/toss/create-payment', {
      method: 'POST',
      body: JSON.stringify({ minutes: 999 }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockCreateTossPayment).not.toHaveBeenCalled()
  })

  it('creates a Toss checkout and stores the order', async () => {
    auth()
    const req = new NextRequest('http://localhost/api/billing/toss/create-payment', {
      method: 'POST',
      body: JSON.stringify({ minutes: 10 }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.checkoutUrl).toBe('https://pay.toss.test/checkout')
    expect(mockCreatePaymentOrder).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user1',
      packMinutes: 10,
      amount: 10000,
      currency: 'KRW',
    }))
    expect(mockUpdatePaymentOrderCheckout).toHaveBeenCalled()
  })
})

describe('/api/billing/toss/confirm', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ POST } = await import('./confirm/route'))
  })

  it('rejects amount mismatches before confirming with Toss', async () => {
    auth()
    mockGetPaymentOrderByOrderId.mockResolvedValueOnce(order())
    const req = new NextRequest('http://localhost/api/billing/toss/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentKey: 'pay_1', orderId: 'DT-100', amount: 1 }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockConfirmTossPayment).not.toHaveBeenCalled()
    expect(mockUpdatePaymentOrderStatus).toHaveBeenCalledWith('DT-100', 'amount_mismatch', expect.anything())
  })

  it('confirms payment and grants credits idempotently', async () => {
    auth()
    mockGetPaymentOrderByOrderId.mockResolvedValueOnce(order())
    const req = new NextRequest('http://localhost/api/billing/toss/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentKey: 'pay_1', orderId: 'DT-100', amount: 10000 }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.minutes).toBe(10)
    expect(mockConfirmTossPayment).toHaveBeenCalledWith({ paymentKey: 'pay_1', orderId: 'DT-100', amount: 10000 })
    expect(mockGrantPaidCredits).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user1',
      orderId: 'DT-100',
      paymentKey: 'pay_1',
      minutes: 10,
    }))
  })
})

describe('/api/billing/toss/webhook', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ POST } = await import('./webhook/route'))
  })

  it('verifies DONE payments with Toss before granting credits', async () => {
    mockGetPaymentOrderByOrderId.mockResolvedValueOnce(order())
    const req = new NextRequest('http://localhost/api/billing/toss/webhook', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'PAYMENT_STATUS_CHANGED',
        data: { orderId: 'DT-100', paymentKey: 'pay_1', status: 'DONE' },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockRetrieveTossPayment).toHaveBeenCalledWith('pay_1')
    expect(mockGrantPaidCredits).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user1',
      orderId: 'DT-100',
      minutes: 10,
    }))
  })
})
