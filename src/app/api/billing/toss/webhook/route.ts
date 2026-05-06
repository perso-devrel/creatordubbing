import { NextRequest } from 'next/server'
import { apiFail, apiFailFromError, apiOk } from '@/lib/api/response'
import { getPaymentOrderByOrderId, grantPaidCredits, updatePaymentOrderStatus } from '@/lib/db/queries'
import { retrieveTossPayment } from '@/lib/toss/client'
import { tossWebhookSchema } from '@/lib/validators/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function getNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value)
}

export async function POST(req: NextRequest) {
  const parsed = tossWebhookSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiFail('BAD_REQUEST', parsed.error.issues.map((i) => i.message).join('; '), 400)
  }

  const { eventType, data = {} } = parsed.data
  if (eventType !== 'PAYMENT_STATUS_CHANGED') {
    return apiOk({ received: true, ignored: true })
  }

  const orderId = getString(data.orderId)
  const paymentKey = getString(data.paymentKey)
  const status = getString(data.status)
  if (!orderId || !paymentKey) {
    return apiOk({ received: true, ignored: true })
  }

  const order = await getPaymentOrderByOrderId(orderId)
  if (!order) {
    return apiOk({ received: true, ignored: true })
  }

  try {
    await updatePaymentOrderStatus(orderId, `webhook_${status ?? 'unknown'}`, parsed.data)
    if (status !== 'DONE') {
      return apiOk({ received: true, status })
    }

    const payment = await retrieveTossPayment(paymentKey)
    const paidAmount = getNumber(payment.totalAmount ?? payment.amount)
    if (paidAmount !== Number(order.amount) || payment.status !== 'DONE') {
      await updatePaymentOrderStatus(orderId, 'webhook_verification_failed', payment)
      return apiOk({ received: true, verified: false })
    }

    const result = await grantPaidCredits({
      userId: order.user_id,
      orderId,
      paymentKey,
      minutes: Number(order.pack_minutes),
      rawPayment: payment,
    })
    return apiOk({ received: true, ...result })
  } catch (err) {
    return apiFailFromError(err)
  }
}
