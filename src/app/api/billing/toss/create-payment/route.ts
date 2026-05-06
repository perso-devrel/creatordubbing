import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { apiFail, apiFailFromError, apiOk } from '@/lib/api/response'
import { getCreditPack } from '@/features/billing/constants/plans'
import {
  createPaymentOrder,
  updatePaymentOrderCheckout,
  updatePaymentOrderStatus,
} from '@/lib/db/queries'
import { createTossPayment } from '@/lib/toss/client'
import { createTossPaymentBodySchema } from '@/lib/validators/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function createOrderId() {
  const compactUuid = randomUUID().replace(/-/g, '').slice(0, 20)
  return `DT-${Date.now()}-${compactUuid}`
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  const parsed = createTossPaymentBodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiFail('BAD_REQUEST', parsed.error.issues.map((i) => i.message).join('; '), 400)
  }

  const pack = getCreditPack(parsed.data.minutes)
  if (!pack) {
    return apiFail('INVALID_CREDIT_PACK', 'Unsupported credit pack', 400)
  }

  const orderId = createOrderId()
  const orderName = `Dubtube ${pack.minutes}분 크레딧`
  const origin = req.nextUrl.origin

  try {
    await createPaymentOrder({
      orderId,
      userId: auth.session.uid,
      packMinutes: pack.minutes,
      amount: pack.priceKrw,
      currency: 'KRW',
      orderName,
    })

    const payment = await createTossPayment({
      amount: pack.priceKrw,
      orderId,
      orderName,
      successUrl: `${origin}/billing/success`,
      failUrl: `${origin}/billing/fail`,
      customerEmail: auth.session.email,
    })

    const checkoutUrl = payment.checkout?.url
    if (!checkoutUrl) {
      await updatePaymentOrderStatus(orderId, 'checkout_failed', payment)
      return apiFail('TOSS_CHECKOUT_URL_MISSING', 'Toss did not return a checkout URL', 502)
    }

    await updatePaymentOrderCheckout(orderId, checkoutUrl, payment)
    return apiOk({ checkoutUrl, orderId, amount: pack.priceKrw, minutes: pack.minutes })
  } catch (err) {
    await updatePaymentOrderStatus(orderId, 'checkout_failed').catch(() => {})
    return apiFailFromError(err)
  }
}
