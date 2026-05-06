import 'server-only'

import { getDb } from '@/lib/db/client'
import { logger } from '@/lib/logger'

export type OperationalEventCategory = 'upload_queue' | 'perso' | 'credit' | 'toss'
export type OperationalEventSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface OperationalEventInput {
  category: OperationalEventCategory
  eventType: string
  severity: OperationalEventSeverity
  userId?: string | null
  referenceType?: string | null
  referenceId?: string | number | null
  message: string
  metadata?: Record<string, unknown> | null
  idempotencyKey?: string | null
}

export interface OperationalEvent {
  id: number
  category: OperationalEventCategory
  eventType: string
  severity: OperationalEventSeverity
  userId: string | null
  referenceType: string | null
  referenceId: string | null
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface OpsMetric {
  total: number
  failed: number
  failureRate: number
}

export interface OpsSummary {
  generatedAt: string
  windowHours: number
  metrics: {
    uploadQueue: OpsMetric & {
      done: number
      pending: number
      processing: number
      terminalFailed: number
    }
    perso: OpsMetric & {
      completed: number
      canceled: number
    }
    creditRefunds: {
      events: number
      releasedMinutes: number
    }
    toss: {
      failureEvents: number
      affectedOrders: number
    }
  }
  alerts: OpsAlert[]
  recentEvents: OperationalEvent[]
}

export interface OpsAlert {
  id: string
  severity: OperationalEventSeverity
  title: string
  message: string
  metric: string
  value: number
}

let opsTablesReady = false

export async function ensureOperationalTables() {
  if (opsTablesReady) return
  const db = getDb()
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS operational_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        user_id TEXT,
        reference_type TEXT,
        reference_id TEXT,
        message TEXT NOT NULL,
        metadata_json TEXT,
        idempotency_key TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_operational_events_created
        ON operational_events (created_at DESC)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_operational_events_category_created
        ON operational_events (category, created_at DESC)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_operational_events_severity_created
        ON operational_events (severity, created_at DESC)`,
      args: [],
    },
  ])
  opsTablesReady = true
}

function asNumber(value: unknown) {
  return Number(value ?? 0)
}

function rate(failed: number, total: number) {
  if (total <= 0) return 0
  return Math.round((failed / total) * 1000) / 10
}

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string' || raw.length === 0) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function rowToEvent(row: Record<string, unknown>): OperationalEvent {
  return {
    id: Number(row.id),
    category: String(row.category) as OperationalEventCategory,
    eventType: String(row.event_type),
    severity: String(row.severity) as OperationalEventSeverity,
    userId: row.user_id ? String(row.user_id) : null,
    referenceType: row.reference_type ? String(row.reference_type) : null,
    referenceId: row.reference_id ? String(row.reference_id) : null,
    message: String(row.message),
    metadata: parseMetadata(row.metadata_json),
    createdAt: String(row.created_at),
  }
}

export async function recordOperationalEvent(input: OperationalEventInput) {
  await ensureOperationalTables()
  await getDb().execute({
    sql: `INSERT OR IGNORE INTO operational_events
          (category, event_type, severity, user_id, reference_type, reference_id,
           message, metadata_json, idempotency_key)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.category,
      input.eventType,
      input.severity,
      input.userId ?? null,
      input.referenceType ?? null,
      input.referenceId === undefined || input.referenceId === null ? null : String(input.referenceId),
      input.message,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.idempotencyKey ?? null,
    ],
  })

  const logExtra = {
    category: input.category,
    eventType: input.eventType,
    severity: input.severity,
    userId: input.userId ?? undefined,
    referenceType: input.referenceType ?? undefined,
    referenceId: input.referenceId ?? undefined,
    ...(input.metadata ?? {}),
  }
  if (input.severity === 'critical' || input.severity === 'error') {
    logger.error(input.message, logExtra)
  } else if (input.severity === 'warning') {
    logger.warn(input.message, logExtra)
  } else {
    logger.info(input.message, logExtra)
  }
}

export async function recordOperationalEventSafe(input: OperationalEventInput) {
  try {
    await recordOperationalEvent(input)
  } catch (err) {
    logger.warn('operational event record failed', {
      category: input.category,
      eventType: input.eventType,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

async function scalarStats(sql: string, args: (string | number | null)[]) {
  const result = await getDb().execute({ sql, args })
  return result.rows[0] ?? {}
}

export function buildOpsAlerts(
  metrics: OpsSummary['metrics'],
): OpsAlert[] {
  const alerts: OpsAlert[] = []

  if (metrics.uploadQueue.total >= 5 && metrics.uploadQueue.failureRate >= 20) {
    alerts.push({
      id: 'upload-queue-failure-rate',
      severity: 'critical',
      title: '업로드 큐 실패율 급증',
      message: `최근 업로드 큐 실패율이 ${metrics.uploadQueue.failureRate}%입니다.`,
      metric: 'uploadQueue.failureRate',
      value: metrics.uploadQueue.failureRate,
    })
  } else if (metrics.uploadQueue.total >= 5 && metrics.uploadQueue.failureRate >= 10) {
    alerts.push({
      id: 'upload-queue-failure-rate',
      severity: 'warning',
      title: '업로드 큐 실패율 상승',
      message: `최근 업로드 큐 실패율이 ${metrics.uploadQueue.failureRate}%입니다.`,
      metric: 'uploadQueue.failureRate',
      value: metrics.uploadQueue.failureRate,
    })
  }

  if (metrics.uploadQueue.terminalFailed > 0) {
    alerts.push({
      id: 'upload-queue-terminal-failed',
      severity: 'error',
      title: '재시도 소진 업로드 존재',
      message: `${metrics.uploadQueue.terminalFailed}개 업로드가 재시도를 모두 소진했습니다.`,
      metric: 'uploadQueue.terminalFailed',
      value: metrics.uploadQueue.terminalFailed,
    })
  }

  if (metrics.perso.total >= 5 && metrics.perso.failureRate >= 20) {
    alerts.push({
      id: 'perso-failure-rate',
      severity: 'critical',
      title: 'Perso 처리 실패율 급증',
      message: `최근 Perso 언어 작업 실패율이 ${metrics.perso.failureRate}%입니다.`,
      metric: 'perso.failureRate',
      value: metrics.perso.failureRate,
    })
  } else if (metrics.perso.total >= 5 && metrics.perso.failureRate >= 10) {
    alerts.push({
      id: 'perso-failure-rate',
      severity: 'warning',
      title: 'Perso 처리 실패율 상승',
      message: `최근 Perso 언어 작업 실패율이 ${metrics.perso.failureRate}%입니다.`,
      metric: 'perso.failureRate',
      value: metrics.perso.failureRate,
    })
  }

  if (metrics.toss.failureEvents > 0) {
    alerts.push({
      id: 'toss-failure-events',
      severity: 'critical',
      title: 'Toss 결제/웹훅 실패',
      message: `최근 Toss 실패 이벤트가 ${metrics.toss.failureEvents}건 발생했습니다.`,
      metric: 'toss.failureEvents',
      value: metrics.toss.failureEvents,
    })
  }

  if (metrics.creditRefunds.events >= 5) {
    alerts.push({
      id: 'credit-refunds-spike',
      severity: 'warning',
      title: '크레딧 환불 이벤트 증가',
      message: `최근 크레딧 release 이벤트가 ${metrics.creditRefunds.events}건 발생했습니다.`,
      metric: 'creditRefunds.events',
      value: metrics.creditRefunds.events,
    })
  } else if (metrics.creditRefunds.events > 0) {
    alerts.push({
      id: 'credit-refunds-present',
      severity: 'info',
      title: '크레딧 환불 이벤트',
      message: `최근 크레딧 release 이벤트가 ${metrics.creditRefunds.events}건 있습니다.`,
      metric: 'creditRefunds.events',
      value: metrics.creditRefunds.events,
    })
  }

  return alerts
}

export async function getOpsSummary(windowHours = 24): Promise<OpsSummary> {
  await ensureOperationalTables()
  const windowArg = `-${Math.max(1, Math.min(168, Math.floor(windowHours)))} hours`

  const [upload, perso, credits, toss, events] = await Promise.all([
    scalarStats(
      `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'failed' AND retries >= 3 THEN 1 ELSE 0 END) as terminal_failed
        FROM upload_queue
        WHERE created_at >= datetime('now', ?) OR updated_at >= datetime('now', ?)`,
      [windowArg, windowArg],
    ),
    scalarStats(
      `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' OR progress_reason IN ('COMPLETED', 'Completed') THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' OR progress_reason IN ('FAILED', 'Failed') THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN progress_reason = 'CANCELED' THEN 1 ELSE 0 END) as canceled
        FROM job_languages
        WHERE created_at >= datetime('now', ?) OR updated_at >= datetime('now', ?)`,
      [windowArg, windowArg],
    ),
    scalarStats(
      `SELECT
          COUNT(*) as events,
          COALESCE(SUM(
            CASE
              WHEN type = 'release' THEN ABS(reserved_delta_minutes)
              WHEN COALESCE(CAST(json_extract(metadata_json, '$.releasedUnused') AS INTEGER), 0) > 0
                THEN COALESCE(CAST(json_extract(metadata_json, '$.releasedUnused') AS INTEGER), 0)
              ELSE 0
            END
          ), 0) as released_minutes
        FROM credit_transactions
        WHERE created_at >= datetime('now', ?)
          AND (
            type = 'release'
            OR COALESCE(CAST(json_extract(metadata_json, '$.releasedUnused') AS INTEGER), 0) > 0
          )`,
      [windowArg],
    ),
    scalarStats(
      `SELECT
          COUNT(*) as failure_events,
          COUNT(DISTINCT CASE WHEN reference_type = 'payment_order' THEN reference_id END) as affected_orders
        FROM operational_events
        WHERE created_at >= datetime('now', ?)
          AND category = 'toss'
          AND event_type LIKE 'toss_webhook_%'
          AND severity IN ('warning', 'error', 'critical')`,
      [windowArg],
    ),
    getDb().execute({
      sql: `SELECT *
            FROM operational_events
            WHERE created_at >= datetime('now', ?)
            ORDER BY created_at DESC
            LIMIT 30`,
      args: [windowArg],
    }),
  ])

  const uploadFailed = asNumber(upload.failed)
  const uploadTotal = asNumber(upload.total)
  const persoFailed = asNumber(perso.failed) + asNumber(perso.canceled)
  const persoTotal = asNumber(perso.total)
  const metrics: OpsSummary['metrics'] = {
    uploadQueue: {
      total: uploadTotal,
      done: asNumber(upload.done),
      pending: asNumber(upload.pending),
      processing: asNumber(upload.processing),
      failed: uploadFailed,
      terminalFailed: asNumber(upload.terminal_failed),
      failureRate: rate(uploadFailed, uploadTotal),
    },
    perso: {
      total: persoTotal,
      completed: asNumber(perso.completed),
      failed: asNumber(perso.failed),
      canceled: asNumber(perso.canceled),
      failureRate: rate(persoFailed, persoTotal),
    },
    creditRefunds: {
      events: asNumber(credits.events),
      releasedMinutes: asNumber(credits.released_minutes),
    },
    toss: {
      failureEvents: asNumber(toss.failure_events),
      affectedOrders: asNumber(toss.affected_orders),
    },
  }

  return {
    generatedAt: new Date().toISOString(),
    windowHours,
    metrics,
    alerts: buildOpsAlerts(metrics),
    recentEvents: events.rows.map((row) => rowToEvent(row as Record<string, unknown>)),
  }
}
