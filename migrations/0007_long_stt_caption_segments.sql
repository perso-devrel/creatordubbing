CREATE TABLE IF NOT EXISTS stt_caption_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  job_id INTEGER NOT NULL,
  segment_index INTEGER NOT NULL,
  logical_start_ms INTEGER NOT NULL,
  logical_end_ms INTEGER NOT NULL,
  export_start_ms INTEGER NOT NULL,
  export_end_ms INTEGER NOT NULL,
  media_seq INTEGER NOT NULL DEFAULT 0,
  project_seq INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  progress_reason TEXT NOT NULL DEFAULT 'PENDING',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES dubbing_jobs(id) ON DELETE CASCADE,
  UNIQUE (job_id, segment_index)
);

CREATE INDEX IF NOT EXISTS idx_stt_caption_segments_job
  ON stt_caption_segments (job_id, segment_index);

CREATE INDEX IF NOT EXISTS idx_stt_caption_segments_project
  ON stt_caption_segments (project_seq);
