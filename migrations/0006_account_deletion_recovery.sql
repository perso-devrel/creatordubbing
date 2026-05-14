ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN deletion_requested_at TEXT;
ALTER TABLE users ADD COLUMN deletion_restore_expires_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_account_status
  ON users (account_status, deletion_restore_expires_at);

ALTER TABLE dubbing_jobs ADD COLUMN account_deletion_requested_at TEXT;
ALTER TABLE job_languages ADD COLUMN account_deletion_requested_at TEXT;
ALTER TABLE youtube_uploads ADD COLUMN account_deletion_requested_at TEXT;
ALTER TABLE analytics_cache ADD COLUMN account_deletion_requested_at TEXT;
ALTER TABLE perso_media_resources ADD COLUMN account_deletion_requested_at TEXT;
ALTER TABLE upload_queue ADD COLUMN account_deletion_requested_at TEXT;
ALTER TABLE payment_orders ADD COLUMN account_deletion_requested_at TEXT;
ALTER TABLE credit_transactions ADD COLUMN account_deletion_requested_at TEXT;
ALTER TABLE operational_events ADD COLUMN account_deletion_requested_at TEXT;
