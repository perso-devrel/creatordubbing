# CreatorDub — Reproducible Build Prompt

> **Purpose.** Hand this file to a capable coding assistant (Claude Opus, GPT-4, etc.) and it should be able to reproduce the CreatorDub project from scratch. Every section is intentionally concrete — follow conventions literally rather than improvising.

---

## 1. Project Vision

**CreatorDub** is an AI multilingual dubbing and YouTube upload automation platform aimed at YouTube creators who want to reach non-native audiences without running a manual translation pipeline.

A creator signs in with Google, pastes a YouTube URL (or uploads a video), picks target languages, optionally edits the translated script, and CreatorDub:

1. Dubs the video into every selected language via [Perso.ai](https://developers.perso.ai).
2. Optionally applies lip-sync to match the translated audio.
3. Uploads each dubbed video (plus SRT captions) to YouTube via the Data API v3.
4. Tracks credits (per-minute, DB-backed) and surfaces per-language analytics in a dashboard.

**Primary users.** Solo / small-team YouTube creators producing long-form or Short videos who want localised uploads.

**Success criteria.**

- A creator can complete the 5-step dubbing wizard end-to-end and see the resulting video live on YouTube without touching the YouTube UI.
- Credits pre-check prevents over-dubbing; completed jobs deduct minutes atomically.
- Dashboard charts populate from the same Turso DB that stores job and upload state.
- Type check (`npx tsc --noEmit`), lint, unit tests, and Playwright E2E all stay green.

---

## 2. Tech Stack

| Area | Choice | Notes |
| ---- | ------ | ----- |
| Framework | **Next.js 16.2.3** (App Router) | Breaking changes vs Next 15. Always read the guides in `node_modules/next/dist/docs/` before writing code. |
| Runtime | React 19 (stable) | Server Components by default; `'use client'` only when needed. |
| Language | TypeScript 5 | `strict` mode. |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | No CSS-in-JS. |
| State (client) | Zustand 5 | `authStore`, `notificationStore`, `themeStore`, plus feature-local `dubbingStore`. |
| Data fetching | TanStack React Query v5 | Dashboard, YouTube hooks. |
| Validation | Zod v4 | Every API mutation goes through a discriminated union. |
| DB | **Turso (libSQL)** via `@libsql/client@0.17.x` | `db.execute()` for single statements, `db.batch()` for atomic multi-statement. |
| Dubbing engine | **Perso.ai API** | All requests proxied server-side through `src/lib/perso/client.ts` (injects `XP-API-KEY`). |
| YouTube | **YouTube Data API v3** + Analytics API v2 | Upload, caption, stats, analytics. |
| Auth | Google OAuth 2.0 | Signed session cookie (`creatordub_session`), `SESSION_SECRET`. |
| Testing | Vitest (unit) + Playwright (E2E) + Lighthouse gate | See `npm run` scripts. |
| Deployment | Vercel | `vercel.json` at root. |

No classes. Plain functions + hooks. No Redux / MobX. No Prisma / Drizzle — raw libSQL queries in `src/lib/db/queries/`.

---

## 3. Architecture

```
src/
├── app/                          Next.js App Router — pages + API routes
│   ├── (app)/                    Route group: pages that require auth
│   │   ├── dashboard/            Overview charts
│   │   ├── dubbing/              5-step wizard entry
│   │   ├── batch/                Batch queue view
│   │   ├── billing/              Credits & plans
│   │   ├── youtube/              YouTube upload manager
│   │   ├── uploads/              Past dubbed outputs
│   │   ├── settings/             User settings
│   │   └── layout.tsx            Shared authed layout
│   ├── (marketing)/              Public pages (landing)
│   ├── api/
│   │   ├── auth/                 Google sign-in, session sync, token refresh
│   │   ├── dashboard/
│   │   │   ├── mutations/        SINGLE endpoint for all DB writes
│   │   │   ├── jobs/             GET list of user jobs
│   │   │   ├── summary/          GET dashboard summary row
│   │   │   ├── credit-usage/     GET monthly credit usage
│   │   │   ├── language-performance/ GET aggregated YT perf by language
│   │   │   └── completed-languages/  GET completed jobs ready to upload
│   │   ├── perso/                Perso.ai proxy routes
│   │   │   ├── spaces/           Create / list spaces
│   │   │   ├── upload/           Upload media
│   │   │   ├── project/          Kick a dubbing project
│   │   │   ├── queue/            Submit to queue
│   │   │   ├── progress/         Poll progress
│   │   │   ├── download/         Download result
│   │   │   ├── script/           Script CRUD
│   │   │   ├── translate/        Translation
│   │   │   ├── languages/        Supported languages list
│   │   │   ├── lipsync/          Lip-sync submit
│   │   │   ├── projects/         List projects
│   │   │   ├── external/         External URL registration
│   │   │   └── validate/         Validation helpers
│   │   └── youtube/
│   │       ├── upload/           Server-side upload (fetches from Perso CDN → YouTube)
│   │       ├── caption/          Attach SRT
│   │       ├── stats/            Views / likes / comments refresh
│   │       ├── analytics/        YouTube Analytics API v2
│   │       └── videos/           List user's uploads
│   ├── global-error.tsx
│   ├── layout.tsx
│   └── not-found.tsx
├── features/                     Domain-grouped UI + logic
│   ├── dubbing/
│   │   ├── components/
│   │   │   ├── DubbingWizard.tsx
│   │   │   ├── ScriptEditor.tsx
│   │   │   └── steps/
│   │   │       ├── VideoInputStep.tsx
│   │   │       ├── LanguageSelectStep.tsx
│   │   │       ├── TranslationEditStep.tsx
│   │   │       ├── ProcessingStep.tsx
│   │   │       └── UploadStep.tsx
│   │   ├── hooks/
│   │   ├── store/dubbingStore.ts  Zustand (wizard state)
│   │   └── types/
│   ├── dashboard/                Charts, tables, summary cards
│   ├── landing/                  Public landing sections
│   ├── auth/                     OAuth UI
│   └── billing/                  Credit & plan UI
├── lib/
│   ├── db/
│   │   ├── client.ts             getDb() — libSQL client singleton
│   │   └── queries/
│   │       ├── users.ts
│   │       ├── jobs.ts
│   │       ├── youtube.ts
│   │       ├── dashboard.ts
│   │       └── index.ts
│   ├── perso/
│   │   ├── client.ts             persoFetch wrapper (injects XP-API-KEY, strips envelope)
│   │   ├── errors.ts             PersoError + mapPersoError
│   │   ├── route-helpers.ts      Request/response shared helpers
│   │   └── types.ts
│   ├── youtube/
│   │   ├── server.ts             Server-side YT client
│   │   ├── upload.ts             Upload helper
│   │   ├── stats.ts              Stats refresh
│   │   ├── analytics.ts          Analytics API
│   │   └── route-helpers.ts
│   ├── validators/               Zod schemas (one file per domain)
│   ├── api/                      Shared API response helpers
│   ├── api-client.ts             Client-side fetch wrapper
│   ├── auth/                     Session verification (server only)
│   ├── env.ts                    Typed env accessor (getServerEnv)
│   ├── google-auth.ts            Google token verify / refresh
│   └── logger.ts                 Structured logger
├── stores/
│   ├── authStore.ts              Current user, tokens, sign-out
│   ├── notificationStore.ts      Toast queue
│   └── themeStore.ts             Light/dark theme
├── hooks/
│   ├── useDashboardData.ts       React Query hook
│   └── useYouTubeData.ts
├── components/
│   ├── ui/                       Reusable primitives — Button, Card, Modal, Progress, Badge, Tabs, Toggle, Tooltip, Input, Select
│   ├── layout/                   Header, Sidebar, Shell
│   ├── feedback/                 Toast, error boundary helpers
│   ├── shared/
│   └── providers/                React Query provider, theme provider
├── services/                     External-API service layer
└── utils/                        Pure utility helpers

middleware.ts                     Next.js middleware — auth gate for (app) routes
next.config.ts                    Next.js config (bundle analyzer, headers)
vercel.json                       Vercel deployment config
```

---

## 4. Core Flows

### 4.1 Dubbing Wizard (5 steps)

Managed by `src/features/dubbing/store/dubbingStore.ts` (Zustand). `isSubmitted` guard persists across remounts.

1. **VideoInputStep** — YouTube URL OR local upload. Creates a Perso `space` and registers media, storing `spaceSeq` + `mediaSeq` in the store.
2. **LanguageSelectStep** — source language auto-detected; user picks target languages and toggles lip-sync.
3. **TranslationEditStep** — fetch/edit per-language segments; allows excluding segments.
4. **ProcessingStep** — for each target language: create a Perso project → submit queue → poll `/progress`. Writes `dubbing_jobs` row and one `job_languages` row per language via the `mutations` endpoint.
5. **UploadStep** — lists completed languages; opens a YouTube upload modal (title / description / tags / privacy editable) and invokes `/api/youtube/upload`.

### 4.2 Perso Integration

- All Perso calls go through `src/lib/perso/client.ts` on the server. The client injects `XP-API-KEY`, normalises the `{ result: ... }` envelope, and throws `PersoError(code, message, status)`.
- Browser code calls our `/api/perso/*` proxy routes — never Perso directly.
- Lifecycle: `create space` → `upload media` (or register external URL) → `create project` → `submit queue` → `poll progress` → `download`.

### 4.3 YouTube Upload (CORS workaround)

The browser cannot fetch Perso CDN files and POST them to YouTube directly (CORS). Instead:

```
Browser → POST /api/youtube/upload { jobLanguageId, title, description, ... }
   Server → fetch(persoCdnUrl)          // server-side, no CORS
   Server → YouTube Data API v3 upload  // resumable or multipart
   Server → write youtube_uploads + update job_languages.youtube_video_id
```

Captions (SRT) are attached with a follow-up `/api/youtube/caption` call.

### 4.4 Credits

- `users.credits_remaining` stored in minutes.
- Pre-check before starting a dubbing job.
- `deductUserMinutes` mutation on job completion; `addCredits` for purchases.
- All credit movements go through the `/api/dashboard/mutations` endpoint under the `deductUserMinutes` / `addCredits` discriminated-union variants.

---

## 5. Database Schema (Turso / libSQL)

Inferred from `src/lib/db/queries/*.ts`. All timestamps use SQLite `datetime('now')`.

### `users`

| Column | Notes |
| ------ | ----- |
| `id` | Primary key (Google user ID) |
| `email` | |
| `display_name` | nullable |
| `photo_url` | nullable |
| `google_access_token` | nullable |
| `google_refresh_token` | nullable |
| `token_expires_at` | ISO timestamp, nullable |
| `credits_remaining` | integer (minutes) |
| `updated_at` | `datetime('now')` on upsert/update |

Operations: `upsertUser`, `getUser`, `getUserTokens`, `updateUserTokens`, `updateUserCredits`, `deductUserMinutes` (with `MAX(0, …)`), `addUserCredits`.

### `dubbing_jobs`

| Column | Notes |
| ------ | ----- |
| `id` | autoincrement |
| `user_id` | FK → users.id |
| `video_title` | |
| `video_duration_ms` | integer |
| `video_thumbnail` | |
| `source_language` | |
| `media_seq` | Perso media ID |
| `space_seq` | Perso space ID |
| `lip_sync_enabled` | 0/1 |
| `is_short` | 0/1 |
| `status` | `'processing'`, `'completed'`, etc. |
| `created_at`, `updated_at` | |

### `job_languages` (one row per target language on a job)

| Column | Notes |
| ------ | ----- |
| `id` | autoincrement |
| `job_id` | FK → dubbing_jobs.id |
| `language_code` | e.g. `'ja'`, `'en'` |
| `project_seq` | Perso project ID |
| `status` | `'processing' | 'completed' | 'failed'` |
| `progress` | 0–100 |
| `progress_reason` | free text from Perso |
| `dubbed_video_url` | nullable |
| `audio_url` | nullable |
| `srt_url` | nullable |
| `youtube_video_id` | nullable (set after YT upload) |
| `youtube_upload_status` | e.g. `'uploaded'` |

### `youtube_uploads`

| Column | Notes |
| ------ | ----- |
| `id` | autoincrement |
| `user_id` | FK → users.id |
| `job_language_id` | FK → job_languages.id (nullable) |
| `youtube_video_id` | |
| `title` | |
| `language_code` | |
| `privacy_status` | `'private' | 'unlisted' | 'public'` |
| `is_short` | 0/1 |
| `view_count`, `like_count`, `comment_count` | integers |
| `last_stats_fetch` | ISO timestamp |
| `created_at` | |

---

## 6. Critical Conventions (MUST follow)

1. **Atomic writes use `db.batch()`.** Single statements use `db.execute()`. Any multi-statement mutation (e.g. delete job + delete languages) must be a single batch — see `deleteDubbingJob` in `queries/jobs.ts`.
2. **Mutations funnel through a single endpoint.** Client code never calls per-table mutation routes. It POSTs `{ type, payload }` to `/api/dashboard/mutations`, which validates via `mutationActionSchema` (Zod discriminated union on `type`) and dispatches.
3. **Ownership verification.** `getUserIdFromAction` / `getJobIdFromAction` in `src/lib/validators/dashboard.ts` tell the mutations route whether to verify ownership directly or query the DB via `verifyJobOwnership()`.
4. **Server-only modules use `import 'server-only'`.** All files in `src/lib/db/queries/`, `src/lib/perso/client.ts`, and session helpers must include it at the top. Do not import them from client components.
5. **`'use client'` is opt-in.** Server Components by default. Only mark a file client when it uses hooks, browser APIs, Zustand, or event handlers.
6. **No classes.** Only functions and hooks. Don't introduce OO.
7. **Perso envelope.** Responses from Perso look like `{ result: ... }`. `persoFetch` strips this — consumers see the inner payload directly.
8. **Perso `progressReason` case.** Values arrive as either UPPERCASE (`'COMPLETED'`, `'FAILED'`) or PascalCase (`'Completed'`, `'Failed'`). Always match both — e.g. `if (reason === 'COMPLETED' || reason === 'Completed')`. This is a real gotcha from production logs.
9. **Modal keyboard handling gotcha.** `src/components/ui/Modal.tsx` uses `useRef` for `handleKeyDown` instead of the handler itself in deps. Inlining would cause focus loss when the handler's identity changes on each render. Keep the `useRef` pattern.
10. **Zod schema per domain.** `src/lib/validators/{auth,dashboard,dubbing,perso,youtube}.ts`. Every route handler validates query/body against a schema before touching `queries/`.
11. **YouTube uploads run server-side.** Never let the browser hit `upload.youtube.googleapis.com` directly — CORS fails. Proxy through `/api/youtube/upload`.
12. **Session cookie is `creatordub_session`.** Signed with `SESSION_SECRET`. `middleware.ts` gates `(app)` routes.
13. **OAuth tokens are stored per user.** `google_access_token`, `google_refresh_token`, `token_expires_at` on `users`. Refresh via `src/lib/google-auth.ts` before expiry.
14. **Next.js 16 specifics.** Read `node_modules/next/dist/docs/` before touching routing, caching, or metadata — several APIs moved or changed semantics vs Next 15.

---

## 7. Environment Variables

Copy `.env.example` to `.env.local`. Every variable is required.

| Variable | Scope | Purpose |
| -------- | ----- | ------- |
| `PERSO_API_KEY` | server | Injected as `XP-API-KEY` on Perso requests. |
| `PERSO_API_BASE_URL` | server | Usually `https://api.perso.ai`. |
| `NEXT_PUBLIC_PERSO_FILE_BASE_URL` | client | Base URL for Perso-hosted files (e.g. `https://perso.ai`). |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | client | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | server | Google OAuth client secret. |
| `SESSION_SECRET` | server | Signs `creatordub_session` cookie. Rotate if compromised. |
| `TURSO_URL` | server | libSQL URL — `libsql://<db>.turso.io`. |
| `TURSO_AUTH_TOKEN` | server | libSQL auth token. |

`getServerEnv()` in `src/lib/env.ts` validates these at import time on the server.

---

## 8. Build Verification Commands

Run these before every PR merge. All must pass.

```bash
npx tsc --noEmit              # TypeScript — zero errors
npm run lint                  # ESLint (eslint-config-next)
npm run test                  # Vitest unit tests
npm run build                 # Production build must succeed
npm run test:e2e              # Playwright E2E
npm run test:lighthouse:gate  # Performance gate (parse-a11y-details.mjs, etc.)
npm run dev                   # Manual smoke at http://localhost:3000
```

---

## 9. Reference

- **Sister project:** https://github.com/perso-devrel/anivoice — same Perso-powered dubbing architecture, slightly different domain (anime) and stack (Vite + Firebase). Patterns for Perso proxying and space/media/project lifecycle are shared; crib liberally when in doubt.
- **Next.js 16 docs:** `node_modules/next/dist/docs/` — the source of truth; do not trust pre-Next-16 memory.
- **Perso.ai developer portal:** https://developers.perso.ai
- **Security policy:** `.github/SECURITY.md` — private vulnerability reporting only.
- **Git flow:** `main ← develop ← issue branch`. Squash merge. `main` and `develop` are permanent; never delete.

---

## 10. When in Doubt

- Read the actual source before writing — the codebase is the spec.
- If you see a deprecation notice from Next.js 16 while editing, heed it.
- Prefer editing existing files to creating new ones.
- Never fabricate env vars, table columns, or API routes. Grep first.
- Put new mutations under `mutationActionSchema`; don't add parallel endpoints.
- Put new server-only code under `src/lib/**` with `import 'server-only'` at the top.
- For every UI piece, check `src/components/ui/` first for a reusable primitive.

This document is the contract. Follow it literally and the result will be a working CreatorDub.
