import { describe, expect, it } from 'vitest'
import { buildOpsAlerts, type OpsSummary } from './observability'

const emptyMetrics: OpsSummary['metrics'] = {
  uploadQueue: {
    total: 0,
    done: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    terminalFailed: 0,
    failureRate: 0,
  },
  perso: {
    total: 0,
    completed: 0,
    failed: 0,
    canceled: 0,
    failureRate: 0,
  },
  creditRefunds: {
    events: 0,
    releasedMinutes: 0,
  },
  toss: {
    failureEvents: 0,
    affectedOrders: 0,
  },
}

describe('buildOpsAlerts', () => {
  it('returns no alerts for healthy metrics', () => {
    expect(buildOpsAlerts(emptyMetrics)).toEqual([])
  })

  it('raises upload, perso, toss, and credit alerts from thresholds', () => {
    const alerts = buildOpsAlerts({
      ...emptyMetrics,
      uploadQueue: {
        ...emptyMetrics.uploadQueue,
        total: 10,
        failed: 2,
        terminalFailed: 1,
        failureRate: 20,
      },
      perso: {
        ...emptyMetrics.perso,
        total: 10,
        failed: 2,
        canceled: 1,
        failureRate: 30,
      },
      creditRefunds: {
        events: 5,
        releasedMinutes: 30,
      },
      toss: {
        failureEvents: 1,
        affectedOrders: 1,
      },
    })

    expect(alerts.map((alert) => alert.id)).toEqual([
      'upload-queue-failure-rate',
      'upload-queue-terminal-failed',
      'perso-failure-rate',
      'toss-failure-events',
      'credit-refunds-spike',
    ])
    expect(alerts[0].severity).toBe('critical')
    expect(alerts[2].severity).toBe('critical')
  })
})
