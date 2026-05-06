import { z } from 'zod'

export const createTossPaymentBodySchema = z.object({
  minutes: z.number().int().positive(),
})

export const confirmTossPaymentBodySchema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z.string().min(6).max(64).regex(/^[A-Za-z0-9_-]+$/),
  amount: z.coerce.number().int().positive(),
})

export const tossWebhookSchema = z.object({
  eventType: z.string().min(1),
  createdAt: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
})
