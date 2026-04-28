# Dubtube

[🇰🇷 한국어](./README.md) | [🇺🇸 English](./README.en.md) | [🇯🇵 日本語](./README.ja.md) | [🇨🇳 中文](./README.zh.md)

> **AI-powered multilingual dubbing & YouTube upload automation for creators.**
> Upload one video and Dubtube dubs it into multiple languages, uploads the results to YouTube with captions, and surfaces watch-time analytics in a single dashboard.

Powered by the [Perso.ai](https://developers.perso.ai) API.

## Features

- **AI dubbing** — a 5-step wizard dubs your video into multiple languages while preserving the source speaker's tone.
- **Lip-sync** — optional mouth re-animation to match the translated audio.
- **Script editing** — edit the translated transcript sentence-by-sentence and regenerate audio.
- **YouTube auto-upload** — dubbed videos are uploaded through our server to YouTube Data API v3 along with SRT captions.
- **Multi-audio track helper** — YouTube's multi-audio-track API is unavailable, so Dubtube organises per-language videos instead.
- **Credit system** — per-minute credit pre-check before dubbing, deduction on completion.
- **Dashboard & analytics** — per-language views/likes, monthly credit usage, and YouTube Analytics integration.

## Tech Stack

| Area | Stack |
| ---- | ----- |
| Framework | Next.js 16.2.3 (App Router) |
| Runtime | React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 |
| Data fetching | TanStack React Query v5 |
| Validation | Zod v4 |
| Database | Turso (libSQL) via `@libsql/client` |
| Dubbing engine | Perso.ai API |
| Upload & stats | YouTube Data API v3 + Analytics API v2 |
| Auth | Google OAuth 2.0 + signed session cookie |
| Testing | Vitest, Playwright, Lighthouse |

> **Note:** This project builds on Next.js 16's breaking changes. Read the guides in `node_modules/next/dist/docs/` before modifying any code.

## Getting Started

### Prerequisites

- Node.js 20+
- A [Perso.ai](https://developers.perso.ai) API key
- A Turso database
- A Google Cloud Console project with OAuth and the YouTube Data API enabled

### Install

```bash
git clone https://github.com/perso-devrel/dubtube.git
cd dubtube
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

```env
# Perso.ai
PERSO_API_KEY=
PERSO_API_BASE_URL=https://api.perso.ai
NEXT_PUBLIC_PERSO_FILE_BASE_URL=https://perso.ai

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Session cookie signing
SESSION_SECRET=

# Turso DB
TURSO_URL=
TURSO_AUTH_TOKEN=
```

### Development Server

```bash
npm run dev         # http://localhost:3000
```

### Testing & Verification

```bash
npx tsc --noEmit              # Type check
npm run lint                  # ESLint
npm run test                  # Vitest (unit)
npm run build                 # Production build
npm run test:e2e              # Playwright E2E
npm run test:lighthouse:gate  # Lighthouse performance gate
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated routes (dashboard, dubbing, batch, billing, youtube, uploads, settings)
│   ├── (marketing)/        # Public pages (landing)
│   ├── api/                # Route handlers
│   │   ├── auth/           # Login, session, token sync
│   │   ├── dashboard/      # mutations (single endpoint), jobs, summary, credit-usage, language-performance
│   │   ├── perso/          # Perso.ai proxy (spaces, upload, project, queue, progress, download, …)
│   │   └── youtube/        # upload, caption, stats, analytics, videos
│   └── layout.tsx
├── features/               # Domain-grouped features
│   ├── dubbing/            # 5-step wizard, Zustand store, types
│   ├── dashboard/          # Charts, tables, summary cards
│   ├── landing/            # Landing sections
│   ├── auth/               # OAuth UI
│   └── billing/            # Credits & plans
├── lib/
│   ├── db/                 # libSQL client + queries/{users,jobs,youtube,dashboard}
│   ├── perso/              # persoFetch wrapper, error mapping, route helpers
│   ├── youtube/            # Upload, captions, stats, analytics
│   ├── validators/         # Zod schemas (discriminated-union mutations)
│   ├── auth/               # Session verification
│   └── env.ts              # Env parsing
├── stores/                 # Zustand (auth, notification, theme)
├── hooks/                  # React Query hooks
├── components/             # Shared UI, layout, providers
└── services/               # External API service layer
```

## Dubbing Workflow

```
Video input → Language select → Script edit → Processing → Upload
```

1. **Video input** — paste a YouTube URL or upload a local file. Metadata is registered to a Perso space.
2. **Language select** — pick the source language (auto-detected) and target languages; toggle lip-sync.
3. **Script edit** — fine-tune the translated transcript or exclude segments.
4. **Processing** — kick a Perso job and poll progress in real time.
5. **Upload** — auto-upload to YouTube with editable title/description/tags/privacy via the upload modal.

## Known Limitations

- YouTube's multi-audio-track API is unavailable — we upload per-language videos as a workaround.
- Perso `progressReason` values come in both UPPERCASE and PascalCase; always handle both.

## Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/awesome`)
3. Commit (`git commit -m 'feat: add awesome'`)
4. Push and open a Pull Request

Git flow: `main ← develop ← issue branches`, squash-merge. `main` and `develop` are permanent branches — do not delete.

## Security

**Do not open public issues for vulnerabilities.** Use GitHub Private Vulnerability Reporting. See [.github/SECURITY.md](./.github/SECURITY.md) for details.

## License

This repository is **proprietary**. All rights reserved. No part may be redistributed or reused without prior written permission.

## Acknowledgements

- [Perso.ai](https://perso.ai) — AI dubbing engine
- [Turso](https://turso.tech) — database
- [Vercel](https://vercel.com) — deployment platform
- Sister project [AniVoice](https://github.com/perso-devrel/anivoice) — similar Perso-powered dubbing platform
