import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    execute: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    close: vi.fn(),
  }
  return {
    tx,
    transaction: vi.fn(async () => tx),
    execute: vi.fn(),
  }
})

vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn(() => ({
    execute: mocks.execute,
    transaction: mocks.transaction,
  })),
}))

vi.mock('@/lib/auth/token-crypto', () => ({
  encryptToken: vi.fn(async (value: string | null | undefined) => value ? `encrypted:${value}` : null),
  decryptToken: vi.fn(async (value: string | null | undefined) => value ? value.replace(/^encrypted:/, '') : null),
}))

import { purgeExpiredPendingDeletedAccounts, requestUserAccountDeletion, upsertUser } from './users'

function resetTx() {
  mocks.tx.execute.mockReset()
  mocks.tx.commit.mockReset()
  mocks.tx.rollback.mockReset()
  mocks.tx.close.mockReset()
  mocks.transaction.mockClear()
  mocks.execute.mockReset()
}

describe('user account deletion recovery queries', () => {
  beforeEach(() => {
    resetTx()
    mocks.tx.execute.mockResolvedValue({ rows: [] })
    mocks.tx.commit.mockResolvedValue(undefined)
    mocks.tx.rollback.mockResolvedValue(undefined)
  })

  it('marks the account and related records as pending deletion instead of deleting them', async () => {
    await requestUserAccountDeletion('user-1')

    const sql = mocks.tx.execute.mock.calls.map(([query]) => query.sql).join('\n')
    expect(sql).toContain('UPDATE users')
    expect(sql).toContain('account_status = ?')
    expect(sql).toContain('email = ?')
    expect(sql).toContain('UPDATE app_sessions SET revoked_at')
    expect(sql).toContain('UPDATE upload_queue SET account_deletion_requested_at')
    expect(sql).toContain('UPDATE dubbing_jobs SET account_deletion_requested_at')
    expect(sql).toContain('UPDATE job_languages')
    expect(sql).toContain('UPDATE youtube_uploads')
    expect(sql).toContain('UPDATE analytics_cache SET account_deletion_requested_at')
    expect(sql).toContain('UPDATE payment_orders SET account_deletion_requested_at')
    expect(sql).not.toContain('DELETE FROM users')
    expect(sql).not.toContain('DELETE FROM dubbing_jobs')
    expect(mocks.tx.execute.mock.calls[0][0].args[0]).toBe('pending_deletion')
    expect(mocks.tx.execute.mock.calls[0][0].args[3]).toMatch(/^withdrawal-requested\+[a-f0-9]{32}@withdrawal\.sub2tube\.local$/)
    expect(mocks.tx.commit).toHaveBeenCalled()
  })

  it('restores pending deletion markers when the user signs in within the recovery window', async () => {
    mocks.tx.execute.mockResolvedValueOnce({
      rows: [{ account_status: 'pending_deletion', deletion_restore_expires_at: new Date(Date.now() + 60_000).toISOString() }],
    })

    await upsertUser({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenExpiresAt: '2026-01-01T00:00:00.000Z',
    })

    const sql = mocks.tx.execute.mock.calls.map(([query]) => query.sql).join('\n')
    expect(sql).toContain('SELECT account_status, deletion_restore_expires_at FROM users')
    expect(sql).toContain('UPDATE dubbing_jobs SET account_deletion_requested_at = NULL')
    expect(sql).toContain('UPDATE payment_orders SET account_deletion_requested_at = NULL')
    expect(sql).toContain('account_status = excluded.account_status')
    expect(sql).not.toContain('DELETE FROM users')
    expect(mocks.tx.commit).toHaveBeenCalled()
  })

  it('purges expired pending deletion data before creating a fresh account on sign-in', async () => {
    mocks.tx.execute.mockResolvedValueOnce({
      rows: [{ account_status: 'pending_deletion', deletion_restore_expires_at: new Date(Date.now() - 60_000).toISOString() }],
    })

    await upsertUser({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
      accessToken: 'access',
      refreshToken: null,
      tokenExpiresAt: '2026-01-01T00:00:00.000Z',
    })

    const sql = mocks.tx.execute.mock.calls.map(([query]) => query.sql).join('\n')
    expect(sql).toContain('UPDATE payment_orders')
    expect(sql).toContain('checkout_url = NULL')
    expect(sql).toContain('raw_json = ?')
    expect(sql).toContain('account_retention_reason = ?')
    expect(sql).toContain('UPDATE credit_transactions')
    expect(sql).toContain('metadata_json = ?')
    expect(sql).toContain('DELETE FROM upload_queue')
    expect(sql).toContain('DELETE FROM job_languages')
    expect(sql).toContain('DELETE FROM users')
    expect(sql).toContain('INSERT INTO users')
    expect(mocks.tx.commit).toHaveBeenCalled()
  })

  it('purges expired pending deletion accounts in batches for cron', async () => {
    const now = new Date('2026-05-14T00:00:00.000Z')
    mocks.tx.execute.mockResolvedValueOnce({
      rows: [{ id: 'user-1' }, { id: 'user-2' }],
    })

    const result = await purgeExpiredPendingDeletedAccounts({ limit: 2, now })

    const sql = mocks.tx.execute.mock.calls.map(([query]) => query.sql).join('\n')
    expect(result).toEqual({ purged: 2 })
    expect(mocks.tx.execute.mock.calls[0][0].sql).toContain('deletion_restore_expires_at')
    expect(mocks.tx.execute.mock.calls[0][0].args).toEqual(['pending_deletion', now.toISOString(), 2])
    expect(sql.match(/UPDATE payment_orders/g)).toHaveLength(2)
    expect(sql.match(/DELETE FROM users/g)).toHaveLength(2)
    expect(sql).toContain('personal_data_erased_at = ?')
    expect(sql).toContain('account_retention_until = datetime')
    expect(mocks.tx.commit).toHaveBeenCalled()
  })
})
