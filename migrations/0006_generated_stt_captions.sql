CREATE TABLE IF NOT EXISTS generated_captions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  job_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  source_project_seq INTEGER,
  source_type TEXT NOT NULL DEFAULT 'stt',
  srt_content TEXT NOT NULL,
  cue_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES dubbing_jobs(id) ON DELETE CASCADE,
  UNIQUE (job_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_generated_captions_user_created
  ON generated_captions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_captions_job_language
  ON generated_captions (job_id, language_code);
