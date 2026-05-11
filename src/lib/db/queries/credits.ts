import 'server-only'

import type { Client, Transaction } from '@libsql/client'
import { getDb } from '@/lib/db/client'
import { recordOperationalEventSafe } from '@/lib/ops/observability'

type DbExecutor = Pick<Client | Transaction, 'execute'>

export interface CreditBalance {
  total: number
  reserved: number
  available: number
}

export interface PaymentOrder {
  order_id: string
  user_id: string
  pack_minutes: number
  amount: number
  currency: string
  status: string
  payment_key: string | null
  checkout_url: string | null
  order_name: string
  raw_json: string | null
}

let creditTablesReady = false

export async function ensureCreditTables() {
  if (creditTablesReady) return
  const db = getDb()
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS payment_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        order_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        pack_minutes INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'KRW',
        status TEXT NOT NULL DEFAULT 'created',
        payment_key TEXT,
        checkout_url TEXT,
        order_name TEXT NOT NULL,
        raw_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created
        ON payment_orders (user_id, created_at DESC)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS credit_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount_minutes INTEGER NOT NULL,
        balance_delta_minutes INTEGER NOT NULL DEFAULT 0,
        reserved_delta_minutes INTEGER NOT NULL DEFAULT 0,
        reference_type TEXT,
        reference_id TEXT,
        idempotency_key TEXT NOT NULL UNIQUE,
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
        ON credit_transactions (user_id, created_at DESC)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference
        ON credit_transactions (reference_type, reference_id)`,
      args: [],
    },
  ])
  creditTablesReady = true
}

async function withWriteTransaction<T>(fn: (tx: Transaction) => Promise<T>) {
  await ensureCreditTables()
  const tx = await getDb().transaction('write')
  try {
    const result = await fn(tx)
    await tx.commit()
    return result
  } catch (err) {
    await tx.rollback().catch(() => {})
    throw err
  } finally {
    tx.close()
  }
}

function asNumber(value: unknown) {
  return Number(value ?? 0)
}

async function getCreditBalanceWithExecutor(userId: string, db: DbExecutor): Promise<CreditBalance> {
  const user = await db.execute({
    sql: 'SELECT COALESCE(credits_remaining, 0) as total FROM users WHERE id = ?',
    args: [userId],
  })
  const reserved = await db.execute({
    sql: `SELECT COALESCE(SUM(reserved_delta_minutes), 0) as reserved
          FROM credit_transactions
          WHERE user_id = ?`,
    args: [userId],
  })

  const total = asNumber(user.rows[0]?.total)
  const reservedMinutes = asNumber(reserved.rows[0]?.reserved)
  return {
    total,
    reserved: reservedMinutes,
    available: Math.max(0, total - reservedMinutes),
  }
}

async function getJobCreditEstimate(jobId: number, db: DbExecutor) {
  const result = await db.execute({
    sql: `SELECT dj.user_id, dj.video_duration_ms,
          COUNT(jl.language_code) as language_count,
          SUM(CASE WHEN jl.status = 'completed' THEN 1 ELSE 0 END) as completed_count
          FROM dubbing_jobs dj
          LEFT JOIN job_languages jl ON jl.job_id = dj.id
          WHERE dj.id = ?
          GROUP BY dj.id`,
    args: [jobId],
  })
  const row = result.rows[0]
  if (!row) {
    const err = new Error('Job not found') as Error & { status?: number; code?: string }
    err.status = 404
    err.code = 'JOB_NOT_FOUND'
    throw err
  }

  const perLanguageMinutes = Math.max(1, Math.ceil(asNumber(row.video_duration_ms) / 60_000))
  const languageCount = Math.max(1, asNumber(row.language_count))
  return {
    userId: String(row.user_id),
    perLanguageMinutes,
    languageCount,
    completedCount: asNumber(row.completed_count),
    estimatedMinutes: perLanguageMinutes * languageCount,
  }
}

async function getReservedForJob(jobId: number, db: DbExecutor) {
  const result = await db.execute({
    sql: `SELECT COALESCE(SUM(reserved_delta_minutes), 0) as reserved
          FROM credit_transactions
          WHERE reference_type = 'dubbing_job' AND reference_id = ?`,
    args: [String(jobId)],
  })
  return asNumber(result.rows[0]?.reserved)
}

async function hasCreditTransaction(idempotencyKey: string, db: DbExecutor) {
  const result = await db.execute({
    sql: 'SELECT id FROM credit_transactions WHERE idempotency_key = ?',
    args: [idempotencyKey],
  })
  return Boolean(result.rows[0])
}

function insufficientCredits(available: number, required: number) {
  const err = new Error(`Insufficient credits: required ${required}, available ${available}`) as Error & {
    status?: number
    code?: string
    details?: unknown
  }
  err.status = 402
  err.code = 'INSUFFICIENT_CREDITS'
  err.details = { available, required }
  return err
}

export async function createPaymentOrder(order: {
  orderId: string
  userId: string
  packMinutes: number
  amount: number
  currency: string
  orderName: string
}) {
  await ensureCreditTables()
  await getDb().execute({
    sql: `INSERT INTO payment_orders
          (provider, order_id, user_id, pack_minutes, amount, currency, status, order_name)
          VALUES ('toss', ?, ?, ?, ?, ?, 'created', ?)`,
    args: [
      order.orderId,
      order.userId,
      order.packMinutes,
      order.amount,
      order.currency,
      order.orderName,
    ],
  })
}

export async function updatePaymentOrderCheckout(orderId: string, checkoutUrl: string, raw: unknown) {
  await ensureCreditTables()
  await getDb().execute({
    sql: `UPDATE payment_orders
          SET status = 'checkout_created', checkout_url = ?, raw_json = ?, updated_at = datetime('now')
          WHERE order_id = ?`,
    args: [checkoutUrl, JSON.stringify(raw), orderId],
  })
}

export async function updatePaymentOrderStatus(orderId: string, status: string, raw?: unknown) {
  await ensureCreditTables()
  await getDb().execute({
    sql: `UPDATE payment_orders
          SET status = ?, raw_json = COALESCE(?, raw_json), updated_at = datetime('now')
          WHERE order_id = ?`,
    args: [status, raw === undefined ? null : JSON.stringify(raw), orderId],
  })
}

export async function getPaymentOrderByOrderId(orderId: string): Promise<PaymentOrder | null> {
  await ensureCreditTables()
  const result = await getDb().execute({
    sql: `SELECT order_id, user_id, pack_minutes, amount, currency, status,
          payment_key, checkout_url, order_name, raw_json
          FROM payment_orders WHERE order_id = ?`,
    args: [orderId],
  })
  const row = result.rows[0]
  return row ? ({ ...row } as unknown as PaymentOrder) : null
}

export async function grantPaidCredits(args: {
  userId: string
  orderId: string
  paymentKey: string
  minutes: number
  rawPayment: unknown
}) {
  return withWriteTransaction(async (tx) => {
    const key = `grant:toss:${args.orderId}`
    if (await hasCreditTransaction(key, tx)) {
      return { granted: false, idempotent: true }
    }

    await tx.execute({
      sql: `UPDATE users
            SET credits_remaining = credits_remaining + ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [args.minutes, args.userId],
    })
    await tx.execute({
      sql: `INSERT INTO credit_transactions
            (user_id, type, amount_minutes, balance_delta_minutes, reserved_delta_minutes,
             reference_type, reference_id, idempotency_key, metadata_json)
            VALUES (?, 'grant', ?, ?, 0, 'payment_order', ?, ?, ?)`,
      args: [
        args.userId,
        args.minutes,
        args.minutes,
        args.orderId,
        key,
        JSON.stringify({ provider: 'toss', paymentKey: args.paymentKey }),
      ],
    })
    await tx.execute({
      sql: `UPDATE payment_orders
            SET status = 'paid', payment_key = ?, raw_json = ?, updated_at = datetime('now')
            WHERE order_id = ?`,
      args: [args.paymentKey, JSON.stringify(args.rawPayment), args.orderId],
    })
    return { granted: true, idempotent: false }
  })
}

export async function reserveJobCredits(userId: string, jobId: number) {
  return withWriteTransaction(async (tx) => {
    const key = `reserve:job:${jobId}`
    if (await hasCreditTransaction(key, tx)) {
      return { reserved: 0, idempotent: true }
    }

    const estimate = await getJobCreditEstimate(jobId, tx)
    if (estimate.userId !== userId) {
      const err = new Error('You do not own this job') as Error & { status?: number; code?: string }
      err.status = 403
      err.code = 'FORBIDDEN'
      throw err
    }

    const balance = await getCreditBalanceWithExecutor(userId, tx)
    if (balance.available < estimate.estimatedMinutes) {
      throw insufficientCredits(balance.available, estimate.estimatedMinutes)
    }

    await tx.execute({
      sql: `INSERT INTO credit_transactions
            (user_id, type, amount_minutes, balance_delta_minutes, reserved_delta_minutes,
             reference_type, reference_id, idempotency_key, metadata_json)
            VALUES (?, 'reserve', ?, 0, ?, 'dubbing_job', ?, ?, ?)`,
      args: [
        userId,
        estimate.estimatedMinutes,
        estimate.estimatedMinutes,
        String(jobId),
        key,
        JSON.stringify({
          perLanguageMinutes: estimate.perLanguageMinutes,
          languageCount: estimate.languageCount,
        }),
      ],
    })
    return { reserved: estimate.estimatedMinutes, idempotent: false }
  })
}

export async function releaseJobCredits(userId: string, jobId: number, reason: string) {
  const result = await withWriteTransaction(async (tx) => {
    const reserved = await getReservedForJob(jobId, tx)
    if (reserved <= 0) {
      return { released: 0, idempotent: true }
    }

    const key = `release:job:${jobId}:${reason}`
    if (await hasCreditTransaction(key, tx)) {
      return { released: 0, idempotent: true }
    }

    await tx.execute({
      sql: `INSERT INTO credit_transactions
            (user_id, type, amount_minutes, balance_delta_minutes, reserved_delta_minutes,
             reference_type, reference_id, idempotency_key, metadata_json)
            VALUES (?, 'release', ?, 0, ?, 'dubbing_job', ?, ?, ?)`,
      args: [userId, reserved, -reserved, String(jobId), key, JSON.stringify({ reason })],
    })
    return { released: reserved, idempotent: false }
  })
  if (!result.idempotent && result.released > 0) {
    await recordOperationalEventSafe({
      category: 'credit',
      eventType: 'credit_released',
      severity: 'info',
      userId,
      referenceType: 'dubbing_job',
      referenceId: jobId,
      message: 'Reserved credits were released',
      metadata: { releasedMinutes: result.released, reason },
      idempotencyKey: `ops:credit_released:${jobId}:${reason}`,
    })
  }
  return result
}

export async function finalizeJobCredits(userId: string, jobId: number) {
  const result = await withWriteTransaction(async (tx) => {
    const key = `finalize:job:${jobId}`
    if (await hasCreditTransaction(key, tx)) {
      return { consumed: 0, released: 0, idempotent: true }
    }

    const estimate = await getJobCreditEstimate(jobId, tx)
    if (estimate.userId !== userId) {
      const err = new Error('You do not own this job') as Error & { status?: number; code?: string }
      err.status = 403
      err.code = 'FORBIDDEN'
      throw err
    }

    const reserved = await getReservedForJob(jobId, tx)
    if (reserved <= 0) {
      return { consumed: 0, released: 0, idempotent: true }
    }

    const consumed = Math.min(reserved, estimate.perLanguageMinutes * estimate.completedCount)
    await tx.execute({
      sql: `UPDATE users
            SET credits_remaining = MAX(0, credits_remaining - ?), updated_at = datetime('now')
            WHERE id = ?`,
      args: [consumed, userId],
    })
    await tx.execute({
      sql: `INSERT INTO credit_transactions
            (user_id, type, amount_minutes, balance_delta_minutes, reserved_delta_minutes,
             reference_type, reference_id, idempotency_key, metadata_json)
            VALUES (?, ?, ?, ?, ?, 'dubbing_job', ?, ?, ?)`,
      args: [
        userId,
        consumed > 0 ? 'consume' : 'release',
        consumed,
        -consumed,
        -reserved,
        String(jobId),
        key,
        JSON.stringify({
          completedCount: estimate.completedCount,
          languageCount: estimate.languageCount,
          releasedUnused: reserved - consumed,
        }),
      ],
    })
    return { consumed, released: reserved - consumed, idempotent: false }
  })
  if (!result.idempotent && result.released > 0) {
    await recordOperationalEventSafe({
      category: 'credit',
      eventType: 'credit_released_after_finalize',
      severity: 'info',
      userId,
      referenceType: 'dubbing_job',
      referenceId: jobId,
      message: 'Unused reserved credits were released after finalization',
      metadata: { consumedMinutes: result.consumed, releasedMinutes: result.released },
      idempotencyKey: `ops:credit_finalize_release:${jobId}`,
    })
  }
  return result
}
