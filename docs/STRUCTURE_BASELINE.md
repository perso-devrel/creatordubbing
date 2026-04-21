# 프로젝트 구조 베이스라인 (Phase 0)

> 최종 업데이트: 2026-04-17 18:17
> 목적: Ralph Loop 시작 시점의 기존 프로젝트 구조를 고정(snapshot)하여 이후 변경 분량·영향 범위를 추적하기 위함.

## 환경 스냅샷
- Node: v24.15.0
- npm: 11.12.1
- pnpm: 미설치 (npm 단독 운용)
- OS: Windows 11 Pro (build 10.0.26200)
- 루트 경로: `C:\Users\EST-INFRA\Desktop\creatordub-next`
- 원격: https://github.com/perso-devrel/creatordubbing
- 베이스 브랜치: `develop`
- 루프 브랜치: `develop_loop`

## 최상위 트리 (요약)
```
.
├── AGENTS.md              # 프로젝트 지침 (CLAUDE.md → AGENTS.md import)
├── CLAUDE.md              # @AGENTS.md
├── README.md / .en.md / .ja.md / .zh.md
├── TASK.md                # Ralph Loop 규칙서
├── eslint.config.mjs      # Flat config, eslint ^10
├── middleware.ts
├── next.config.ts
├── next-env.d.ts
├── package.json           # Next 16.2.4, React 19, Vitest 4, Playwright 1.59
├── playwright.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── .github/               # Actions, Dependabot, CodeQL
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY_AUDIT.md
│   └── research/
├── public/                # svg + Youtube_logo.png
├── src/
│   ├── app/
│   │   ├── (app)/         # batch, billing, dashboard, dubbing, settings, uploads, youtube
│   │   ├── (marketing)/
│   │   ├── api/           # auth, dashboard, perso, youtube
│   │   ├── auth/
│   │   ├── global-error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── components/        # feedback, layout, providers, shared, ui
│   ├── features/          # auth, billing, dashboard, dubbing, landing
│   ├── hooks/
│   ├── lib/               # api, api-client, auth, db, logger, perso, validators, youtube
│   ├── services/
│   ├── stores/
│   ├── utils/
│   ├── instrumentation.ts
│   └── test-setup.ts
└── tests/                 # Playwright E2E + Lighthouse parsers
```

## 주요 스크립트 (package.json)
- `dev` / `build` / `start` — Next.js
- `lint` — ESLint (flat config)
- `test` — Vitest 단일 실행
- `test:watch` — Vitest 감시 모드
- `test:e2e` — Playwright
- `test:lighthouse*` — Lighthouse 성능/접근성 측정 및 파싱

## 핵심 의존성
- 런타임: `next@16.2.4`, `react@19.2.5`, `@tanstack/react-query@5`, `zustand@5`, `zod@4`
- 데이터: `@libsql/client@0.17` (Turso/SQLite)
- UI: `tailwindcss@4`, `clsx`, `tailwind-merge`, `lucide-react`, `recharts`
- 개발: `typescript@6`, `vitest@4`, `@playwright/test@1.59`, `eslint@10`, `eslint-config-next@16.2.4`

## 비고
- `AGENTS.md`가 "This is NOT the Next.js you know" 경고를 포함 → Next 16 breaking change 존재. `node_modules/next/dist/docs/`의 공식 문서를 우선 참조해야 함.
- `perso.ai` API 호출 코드는 `src/lib/perso/` 에 집중되어 있을 가능성 — 루프 내에서는 **모킹만 허용**.
- 기존 `docs/SECURITY_AUDIT.md`가 존재하므로 Phase 1 #6(보안 스윕) 진행 시 해당 문서와의 중복/불일치를 확인할 것.
- Chrome 확장 폴더(`/extension`)는 **아직 없음** — Phase 2에서 신설 예정.

## 변경 추적 규칙
이 문서는 **Phase 0 snapshot**이다. 수정하지 말고, 변경 사항은 각 이슈별 PROGRESS.md/PR 본문에 기록한다.
