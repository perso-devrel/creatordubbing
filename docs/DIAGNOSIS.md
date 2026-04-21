# 진단 리포트 (DIAGNOSIS) — 2026-04-17

> TASK.md Phase 1 #1 산출물. 현재 저장소의 품질 지표와 구조를 한 문서로 요약한다. 구체 수정은 후속 이슈에서 수행한다.

## 1. 품질 스모크 (루프 시작 시점)

| 항목 | 결과 | 상세 |
|---|---|---|
| `npx tsc --noEmit` | ✅ 통과 (exit 0) | 타입 에러 0개 |
| `npm run lint` | ❌ 실행 불가 | `eslint-plugin-react` v7이 ESLint v10 API와 비호환 (`contextOrFilename.getFilename is not a function`) |
| `npm test` (Vitest) | ⚠️ 일부 실패 | Test Files 5/32 failed, Tests 19/436 failed |

### 1-1. Lint 실패 원인
`eslint-config-next@16.2.4`가 의존하는 `eslint-plugin-react`(내부 경로 `node_modules/eslint-config-next/node_modules/eslint-plugin-react/lib/util/version.js:31`) 가 ESLint 10의 신규 `context` API와 호환되지 않는다. 이 문제는 **"린트 실행 자체가 불가능"** 한 상태이므로 #3(Lint 수정)에서 최우선으로 처리.

### 1-2. Vitest 실패 분류 (19건)
1. **환경변수 누락** (7건, `src/app/api/dashboard/dashboard-routes.test.ts`): `PERSO_API_KEY`, `TURSO_URL`, `TURSO_AUTH_TOKEN` 이 테스트 환경에서 주입되지 않음 → `getServerEnv()` 가 throw.
2. **에러 코드/메시지 기대값 불일치** (9건): 테스트가 `DB_ERROR` / `Invalid or expired` / `Internal Server Error` 를 기대하지만 구현은 `INTERNAL_ERROR` / `Missing or expired access token` / 라우트별 개별 메시지를 반환. → 구현과 테스트 중 **어느 쪽이 정답인지** 먼저 판단 필요.
3. **인증 흐름 변경 누락** (3건, `auth-sync.test.ts`): 테스트는 200을 기대하나 실제로는 401. 세션 검증이 선행되도록 변경되었지만 테스트 stub이 갱신되지 않은 것으로 보임.

**권고 우선순위**: 테스트 인프라 점검(#4) → 테스트 코드/구현 정합성 수정(#5) 순. 2번 그룹은 계약(contract)의 변화이므로 Phase 1 #4 또는 별도 이슈에서 판단.

## 2. npm 스크립트 인벤토리

| 스크립트 | 목적 |
|---|---|
| `dev` | `next dev` 로컬 개발 서버 |
| `build` | `next build` 프로덕션 빌드 |
| `analyze` | `@next/bundle-analyzer` 기반 번들 분석 (ANALYZE=true) |
| `start` / `start:test` / `start:test2` | 프로덕션 서버 기동 (포트 3000/3100/3101) |
| `lint` | ESLint 실행 (현재 실행 불가 — 1-1 참조) |
| `test` | Vitest 단일 실행 |
| `test:watch` | Vitest 감시 모드 |
| `test:e2e` | Playwright E2E |
| `test:install` | `playwright install chromium` |
| `test:lighthouse*` | Lighthouse 측정 (dev/prod/prod2) |
| `test:lighthouse:*:parse` | Lighthouse 결과 파싱 유틸 |
| `test:lighthouse:a11y` | a11y 세부 이슈 파서 |
| `test:lighthouse:gate` | 성능 gate 체크 |
| `test:cleanup` | 남은 포트 프로세스 정리 |

## 3. 의존성 인벤토리 (카테고리별)

### 3-1. 런타임 의존성
- **프레임워크**: `next@16.2.4`, `react@19.2.5`, `react-dom@19.2.5`
- **데이터 페칭/상태**: `@tanstack/react-query@5.99.0`, `zustand@5.0.12`
- **스키마 검증**: `zod@4.3.6`
- **DB 클라이언트**: `@libsql/client@0.17.2` (Turso/libSQL)
- **UI 보조**: `clsx@2.1.1`, `tailwind-merge@3.5.0`, `lucide-react@1.8.0`, `recharts@3.8.1`
- **서버 전용 가드**: `server-only@0.0.1`

### 3-2. 개발 의존성
- **Tailwind**: `tailwindcss@^4`, `@tailwindcss/postcss@^4`
- **빌드 보조**: `@next/bundle-analyzer@16.2.4`
- **타입**: `typescript@^6`, `@types/node@^25`, `@types/react@^19`, `@types/react-dom@^19`
- **테스트**: `vitest@^4.1.4`, `@vitest/coverage-v8@^4.1.4`, `jsdom@^29.0.2`, `@testing-library/react@^16.3.2`, `@testing-library/dom@^10.4.1`, `@playwright/test@^1.59.1`, `@vitejs/plugin-react@^6.0.1`
- **린트**: `eslint@^10`, `eslint-config-next@16.2.4`
- **품질 측정**: `lighthouse@^13.1.0`

### 3-3. 메이저 업그레이드 후보 (정보만 — 업그레이드는 TASK.md에 의해 루프에서 금지)
- 현 시점 모두 최신 메이저. Next 16 / React 19 / Vitest 4 / Tailwind 4 / TypeScript 6 / ESLint 10 은 전부 최신 라인. `eslint-plugin-react` 상위 버전(설정 내부 의존) 필요 여부는 #3에서 판단.

## 4. `src/` 디렉터리 책임

| 경로 | 책임 |
|---|---|
| `src/app/(app)/` | 인증 후 사용자 영역 (batch, billing, dashboard, dubbing, settings, uploads, youtube) |
| `src/app/(marketing)/` | 비회원 랜딩·홍보 페이지 |
| `src/app/api/` | Route Handlers — `auth`, `dashboard`, `perso`, `youtube` |
| `src/app/auth/` | 인증 콜백/세션 엔드포인트 (라우트 핸들러와 페이지 혼재) |
| `src/app/layout.tsx` · `global-error.tsx` · `not-found.tsx` | 앱 전역 쉘 |
| `src/components/` | UI 프리미티브(`ui`), 레이아웃, 피드백, providers, 공용 컴포넌트 |
| `src/features/` | 도메인별 feature 모듈 (auth, billing, dashboard, dubbing, landing) — 페이지와 컴포넌트를 feature 단위로 조립 |
| `src/hooks/` | 재사용 React hook |
| `src/lib/` | 도메인 로직 (perso, youtube, auth, db), 검증기(validators), 공용 클라이언트(api, api-client), 환경변수(env), 로거 |
| `src/services/` | 외부 시스템 연동 서비스 계층 |
| `src/stores/` | zustand 스토어 |
| `src/utils/` | 순수 유틸 |
| `src/instrumentation.ts` | Next.js instrumentation 훅 |
| `src/test-setup.ts` | Vitest setup (globals/matchers/mocks) |

## 5. perso.ai 호출 지점 (루프 내 **실호출 금지** — 모킹만)
- **클라이언트**: `src/lib/perso/client.ts` (`persoFetch`, `FILE_BASE`)
- **에러 매핑**: `src/lib/perso/errors.ts`
- **라우트 헬퍼**: `src/lib/perso/route-helpers.ts`
- **타입**: `src/lib/perso/types.ts`
- **API 라우트 사용처**:
  - `src/app/api/perso/download/route.ts`
  - `src/app/api/perso/external/metadata/route.ts`
  - `src/app/api/perso/external/upload/route.ts`
  - `src/app/api/perso/languages/route.ts`
  - `src/app/api/perso/lipsync/route.ts`
  - `src/app/api/perso/progress/route.ts`

> 후속 이슈에서 `persoFetch` 를 mock 하는 테스트 유틸 도입을 검토 (TASK.md Phase 1 주의 문구 참조).

## 6. 민감 파일 / 환경변수 상황
- 루트에 `.env` 존재 (Git 추적 제외 상태인지 #6(보안 스윕)에서 재확인 필수).
- `.env.example` 존재 → 필요한 키 세트 유추 가능.
- `src/lib/env.ts` 의 `getServerEnv()` 가 `PERSO_API_KEY`, `TURSO_URL`, `TURSO_AUTH_TOKEN` 을 필수로 검증 → 테스트 환경에 동일 변수가 stub 되지 않아 일부 테스트 실패(1-2 ①).

## 7. 후속 이슈 후보 (Phase 1)

| # | 제목 (예정) | 근거 |
|---|---|---|
| #2 | TypeScript 타입 에러 수정 | 현재 0건이지만, 작업 중 회귀 방지를 위해 CI 검증 보강만 수행 (스코프 축소 가능) |
| #3 | Lint 실행 복구 | 1-1 참조 — `eslint-plugin-react` 혹은 `eslint-config-next` 패치·재설정 필요 |
| #4 | 테스트 인프라 점검 | 1-2 ① 환경변수 주입 / `src/test-setup.ts` 보강 |
| #5 | 도메인 유닛 테스트 보강 + 계약 일치화 | 1-2 ②③ 테스트와 구현의 기대값 합의 후 수정 |
| #6 | 보안 1차 스윕 | `.env` 추적 상태·하드코딩 키 탐색 (기존 `docs/SECURITY_AUDIT.md`와 비교) |
| #7 | `npm outdated` 정리 | minor/patch 업데이트만 반영 |

## 8. 제약/주의 (진단 결과 도출)
1. **린트가 죽어 있다** → #3을 #2 보다 **먼저** 처리해야 이후 이슈들의 자체 검증 체크리스트(린트 통과)가 실효 있음.
2. **테스트 19건 실패는 구조적 결함이 아닌 "환경변수 + 계약 drift"** → 큰 리팩토링 없이 정리 가능할 것으로 추정.
3. **`perso.ai` 클라이언트는 이미 중앙화되어 있다** (`src/lib/perso/client.ts`) → 모킹 레이어 도입 지점이 명확.

---

*이 문서는 루프 시작 시점의 진단이다. 후속 이슈가 반영되면 해당 수치는 변동됨 — `PROGRESS.md` 에서 추적.*
