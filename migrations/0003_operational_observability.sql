CREATE TABLE IF NOT EXISTS operational_events (
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
);

CREATE INDEX IF NOT EXISTS idx_operational_events_created
  ON operational_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_category_created
  ON operational_events (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_severity_created
  ON operational_events (severity, created_at DESC);
