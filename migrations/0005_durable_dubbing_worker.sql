ALTER TABLE dubbing_jobs ADD COLUMN upload_settings_json TEXT;
ALTER TABLE dubbing_jobs ADD COLUMN deliverable_mode TEXT NOT NULL DEFAULT 'newDubbedVideos';
ALTER TABLE dubbing_jobs ADD COLUMN original_video_url TEXT;
ALTER TABLE dubbing_jobs ADD COLUMN original_youtube_url TEXT;

CREATE INDEX IF NOT EXISTS idx_job_languages_worker
  ON job_languages (status, progress_reason, updated_at);
