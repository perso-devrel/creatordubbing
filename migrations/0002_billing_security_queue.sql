CREATE TABLE IF NOT EXISTS payment_orders (
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
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created
  ON payment_orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS credit_transactions (
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
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON credit_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference
  ON credit_transactions (reference_type, reference_id);

CREATE TABLE IF NOT EXISTS app_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user
  ON app_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS perso_media_resources (
  media_seq INTEGER NOT NULL,
  space_seq INTEGER,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (media_seq, user_id)
);

CREATE INDEX IF NOT EXISTS idx_perso_media_resources_user
  ON perso_media_resources (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS upload_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  job_id INTEGER NOT NULL,
  lang_code TEXT NOT NULL,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  privacy_status TEXT NOT NULL DEFAULT 'private',
  language TEXT NOT NULL DEFAULT '',
  is_short INTEGER NOT NULL DEFAULT 0,
  upload_captions INTEGER NOT NULL DEFAULT 1,
  caption_language TEXT,
  caption_name TEXT,
  srt_content TEXT,
  self_declared_made_for_kids INTEGER NOT NULL DEFAULT 0,
  contains_synthetic_media INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  retries INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  youtube_video_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_upload_queue_status_created
  ON upload_queue (status, created_at);

CREATE INDEX IF NOT EXISTS idx_upload_queue_user_created
  ON upload_queue (user_id, created_at DESC);
