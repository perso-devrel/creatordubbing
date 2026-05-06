import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { apiFail, apiFailFromError, apiOk } from '@/lib/api/response'
import { confirmTossPaymentBodySchema } from '@/lib/validators/billing'
import {
  getPaymentOrderByOrderId,
  grantPaidCredits,
  updatePaymentOrderStatus,
} from '@/lib/db/queries'
import { confirmTossPayment } from '@/lib/toss/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  const parsed = confirmTossPaymentBodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiFail('BAD_REQUEST', parsed.error.issues.map((i) => i.message).join('; '), 400)
  }

  const { paymentKey, orderId, amount } = parsed.data
  const order = await getPaymentOrderByOrderId(orderId)
  if (!order) {
    return apiFail('ORDER_NOT_FOUND', 'Payment order not found', 404)
  }
  if (order.user_id !== auth.session.uid) {
    return apiFail('FORBIDDEN', 'You do not own this payment order', 403)
  }
  if (Number(order.amount) !== amount) {
    await updatePaymentOrderStatus(orderId, 'amount_mismatch', { paymentKey, amount })
    return apiFail('AMOUNT_MISMATCH', 'Payment amount does not match the order', 400)
  }
  if (order.status === 'paid') {
    return apiOk({ minutes: Number(order.pack_minutes), alreadyPaid: true })
  }

  try {
    const payment = await confirmTossPayment({ paymentKey, orderId, amount })
    if (payment.status !== 'DONE') {
      await updatePaymentOrderStatus(orderId, `toss_${payment.status ?? 'unknown'}`, payment)
      return apiFail('PAYMENT_NOT_DONE', 'Payment has not completed yet', 409, { status: payment.status })
    }

    const result = await grantPaidCredits({
      userId: auth.session.uid,
      orderId,
      paymentKey,
      minutes: Number(order.pack_minutes),
      rawPayment: payment,
    })
    return apiOk({ minutes: Number(order.pack_minutes), ...result })
  } catch (err) {
    return apiFailFromError(err)
  }
}
