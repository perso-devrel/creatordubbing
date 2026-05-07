CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  google_access_token TEXT,
  google_refresh_token TEXT,
  token_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS dubbing_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  video_duration_ms INTEGER NOT NULL DEFAULT 0,
  video_thumbnail TEXT NOT NULL DEFAULT '',
  source_language TEXT NOT NULL DEFAULT 'auto',
  media_seq INTEGER,
  space_seq INTEGER,
  lip_sync_enabled INTEGER NOT NULL DEFAULT 0,
  is_short INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_user_created
  ON dubbing_jobs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS job_languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  project_seq INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  progress_reason TEXT NOT NULL DEFAULT '',
  dubbed_video_url TEXT,
  audio_url TEXT,
  srt_url TEXT,
  youtube_video_id TEXT,
  youtube_upload_status TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (job_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_job_languages_job
  ON job_languages (job_id);

CREATE TABLE IF NOT EXISTS youtube_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  job_language_id INTEGER,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  language_code TEXT NOT NULL,
  privacy_status TEXT NOT NULL DEFAULT 'private',
  is_short INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  last_stats_fetch TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_youtube_uploads_video
  ON youtube_uploads (youtube_video_id);

CREATE INDEX IF NOT EXISTS idx_youtube_uploads_user_created
  ON youtube_uploads (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_cache (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  data TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_user_video
  ON analytics_cache (user_id, video_id);
