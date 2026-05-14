ALTER TABLE dubbing_jobs ADD COLUMN youtube_upload_snapshot_json TEXT;
ALTER TABLE job_languages ADD COLUMN youtube_upload_snapshot_json TEXT;

ALTER TABLE upload_queue ADD COLUMN upload_kind TEXT NOT NULL DEFAULT 'new_video_dubbed_video';
ALTER TABLE upload_queue ADD COLUMN metadata_json TEXT;
ALTER TABLE upload_queue ADD COLUMN localizations_json TEXT;

ALTER TABLE youtube_uploads ADD COLUMN upload_kind TEXT NOT NULL DEFAULT 'new_video_dubbed_video';
ALTER TABLE youtube_uploads ADD COLUMN metadata_json TEXT;
