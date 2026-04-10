import 'server-only'

import { createClient, type Client } from '@libsql/client'
import { getServerEnv } from '@/lib/env'

let _client: Client | null = null

/** Lazy Turso/libSQL client (Node runtime). */
export function getDb(): Client {
  if (_client) return _client
  const env = getServerEnv()
  _client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  })
  return _client
}

/**
 * Idempotent schema init. Call once at boot / first-request.
 * Schema is byte-identical to the Vite project's `services/db.ts`.
 */
export async function initializeSchema(): Promise<void> {
  const db = getDb()
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT,
      photo_url TEXT,
      google_access_token TEXT,
      youtube_channel_id TEXT,
      plan TEXT DEFAULT 'free',
      credits_remaining INTEGER DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dubbing_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      video_title TEXT,
      video_duration_ms INTEGER,
      video_thumbnail TEXT,
      source_language TEXT DEFAULT 'ko',
      media_seq INTEGER,
      space_seq INTEGER,
      lip_sync_enabled INTEGER DEFAULT 0,
      is_short INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_languages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      language_code TEXT NOT NULL,
      project_seq INTEGER,
      status TEXT DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      progress_reason TEXT DEFAULT 'PENDING',
      dubbed_video_url TEXT,
      audio_url TEXT,
      srt_url TEXT,
      youtube_video_id TEXT,
      youtube_upload_status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS youtube_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      job_language_id INTEGER,
      youtube_video_id TEXT NOT NULL,
      title TEXT,
      language_code TEXT,
      privacy_status TEXT DEFAULT 'private',
      is_short INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      last_stats_fetch TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
}
