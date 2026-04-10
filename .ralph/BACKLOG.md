# BACKLOG

> 우선순위: P0(즉시) > P1(다음) > P2(그 다음). 완료는 `[x]`, 차단은 `[blocked]`.
> 각 항목은 하나의 iteration으로 끝낼 수 있도록 쪼갤 것.

## P0 — 보안 & Next 16 기본기

### P0-1. `/api/dashboard/*` 서버 세션 기반 인가 + zod 검증
- [ ] (1) 공용 `requireSession()` 유틸 작성 (`src/lib/auth/session.ts`). 클라이언트의 `x-google-access-token` 헤더를 검증하고, 실패 시 401. 최종 목표는 httpOnly 쿠키지만 이 서브태스크에서는 기존 토큰을 서버에서 검증만 한다.
- [ ] (2) `src/lib/validators/dashboard.ts`에 각 엔드포인트별 zod 스키마 정의 (summary/jobs/credit-usage/language-performance/mutations).
- [ ] (3) `/api/dashboard/summary/route.ts` — zod 검증 + 세션의 uid와 요청 uid가 일치하는지 확인.
- [ ] (4) `/api/dashboard/jobs/route.ts` — 동일.
- [ ] (5) `/api/dashboard/credit-usage/route.ts` — 동일.
- [ ] (6) `/api/dashboard/language-performance/route.ts` — 동일. 또한 `(u as Record<string, unknown>).youtube_video_id as string` 캐스팅 제거하고 타입 가드 도입.
- [ ] (7) `/api/dashboard/mutations/route.ts` — 각 `Action.payload.userId`가 세션 uid와 같은지 서버에서 재확인. 다르면 403.
- [ ] (8) 테스트: 유효 uid로 200, 다른 uid로 403, 토큰 없이 401. Playwright 혹은 Vitest로 추가.

### P0-2. `(app)` 레이아웃 서버 컴포넌트 + middleware 전환
- [ ] (1) `src/middleware.ts` 생성. `(app)` 경로 그룹 접근 시 세션 쿠키(또는 현재 과도기엔 localStorage 대체 키)로 인증 체크, 미인증 시 `/`로 redirect.
- [ ] (2) `src/app/(app)/layout.tsx`에서 `'use client'` 제거. `useEffect` 리다이렉트 로직 삭제. 서버 컴포넌트로 전환하고 Sidebar/Topbar 중 인터랙션이 필요한 것만 클라이언트 컴포넌트로 분리.
- [ ] (3) `LoadingSpinner`는 더 이상 레이아웃 레벨에서 필요 없음 — 각 page의 `loading.tsx`로 이전.
- [ ] (4) 로그인 상태 + 비로그인 상태 둘 다 수동 스모크 확인 후 E2E 추가.

## P1 — 성능 최적화

### P1-1. `next.config.ts` 번들 최적화
- [ ] `experimental.optimizePackageImports: ['lucide-react', 'recharts']` 추가.
- [ ] `compress: true`, `poweredByHeader: false` 추가.
- [ ] `npm run build`로 번들 사이즈 before/after 기록.

### P1-2. recharts 지연 로드
- [ ] `src/features/dashboard/components/CreditChart.tsx` 및 `LanguagePerformance`를 `next/dynamic`으로 교체.
- [ ] 필요 시 `ssr: false` 옵션. 차트 영역에 스켈레톤 fallback.
- [ ] Lighthouse LCP 개선 확인.

### P1-3. `<img>` → `next/image`
- [ ] `src/components/layout/Topbar.tsx` 프로필 이미지.
- [ ] `src/features/dubbing/components/steps/VideoInputStep.tsx` 썸네일.
- [ ] `next.config.ts`에 `images.remotePatterns` 구성.

### P1-4. 대시보드 데이터 서버 프리페치
- [ ] `src/hooks/useDashboardData.ts`의 초기 데이터(`useDashboardSummary`, `useRecentJobs`, `useCreditUsage`)를 서버 컴포넌트에서 `fetch`로 가져와 초기 props로 주입.
- [ ] React Query는 폴링/인터랙티브 쿼리에만 남긴다.
- [ ] `user!.uid` non-null assertion 제거.

## P1 — 보안 하드닝

### P1-5. OAuth access token을 httpOnly 쿠키로 이관
- [ ] `/api/auth/callback` (또는 `/api/auth/sync`) 응답에서 httpOnly `Set-Cookie` 발급.
- [ ] `authStore.setAccessToken`이 localStorage에 쓰는 로직 제거.
- [ ] `getStoredAccessToken` 사용처 전부 교체 (firebase.ts, usePersoFlow.ts:50, UploadStep.tsx:25, useDashboardData.ts:50-53).
- [ ] middleware에서 세션 쿠키 검사로 전환.
- [ ] 토큰 갱신 경로 정의 (refresh token 혹은 재로그인).

## P1 — 신규 기능

### P1-6. 동영상 URL 업로드
- [ ] `src/features/dubbing/components/steps/VideoInputStep.tsx`에 URL 입력 탭 추가 (파일/URL 탭 전환).
- [ ] URL 검증 zod 스키마 (YouTube URL, 일반 mp4 URL).
- [ ] `/api/perso/ingest-url` 신설: 서버에서 URL 다운로드 후 Perso.ai에 업로드, 또는 Perso.ai가 URL을 직접 받을 수 있으면 그대로 전달.
- [ ] 기존 플로우와 스텝 전환 로직 재사용.
- [ ] E2E: `testvideo/test_animation.mp4`로 파일 업로드, 공개 YouTube URL로 URL 업로드 각각 검증.

### P1-7. YouTube 업로드 플로우 검증 + 수정
- [ ] 현재 `/api/youtube/upload/route.ts`가 실제로 동작하는지 수동 확인. 로그에 실패 지점 식별.
- [ ] `resumable upload` 프로토콜 준수 여부 확인, 청크 업로드 구현 여부.
- [ ] 업로드 후 `videoId` 반환 → DB에 기록되는 경로 검증 (`createYouTubeUpload`, `updateJobLanguageYouTube`).
- [ ] E2E: 소형 파일로 실 업로드까지 시도하는 테스트 (사용자 OAuth 필요, mock 여부 결정).

## P2 — 고급 기능 & QA 완결

### P2-1. 단일 영상 다중 오디오 트랙
- [ ] YouTube Data API가 다중 오디오 트랙을 지원하는지 기술 조사 → `docs/research/youtube-multi-audio.md`에 결론 기록.
- [ ] 지원하면: 업로드 플로우에서 여러 언어 오디오를 한 번에 첨부하는 UI + API 호출.
- [ ] 미지원이면: 언어별 사이드카 업로드 + 대체 플랜 명시.

### P2-2. YouTube Analytics 연동
- [ ] `/api/youtube/analytics` 신설: YouTube Analytics API v2로 videoId 리스트 → 조회수/평균 시청시간/국가별 통계 fetch.
- [ ] `src/features/dashboard/components/AnalyticsChart.tsx` 신규 — recharts로 시각화 (언어별/국가별/시간대별).
- [ ] 일일 캐시 (libsql)로 API 쿼터 보호.
- [ ] 권한 스코프: `https://www.googleapis.com/auth/yt-analytics.readonly` OAuth 스코프 추가.

### P2-3. Vitest 도입 + 유닛 테스트
- [ ] `vitest`, `@vitest/ui`, `@testing-library/react` devDependency 추가.
- [ ] `vitest.config.ts` + Next 통합 세팅.
- [ ] `src/lib/validators/**` 전부 커버.
- [ ] `src/lib/auth/session.ts` 커버.
- [ ] `src/stores/*` 스토어 커버 (authStore, themeStore, notificationStore).
- [ ] `src/lib/perso/route-helpers.ts`, `src/lib/youtube/route-helpers.ts` 커버.
- [ ] `npm run test` 스크립트 등록.

### P2-4. Lighthouse CI 게이트
- [ ] `tests/parse-lighthouse-issues.mjs`를 확장해 baseline JSON과 비교, 성능 점수 -5 이상 하락 시 `process.exit(1)`.
- [ ] `tests/snapshots/lighthouse-baseline.json` 초기 기록 (현재 빌드로).
- [ ] `npm run test:lighthouse:gate` 스크립트 등록.

### P2-5. 코드 중복 제거
- [ ] `dbMutation` 헬퍼 중복 — `src/features/dubbing/hooks/usePersoFlow.ts:68-82` 와 `src/features/dubbing/components/steps/UploadStep.tsx:28-45` 를 `src/lib/api/dbMutation.ts`로 통합.
- [ ] API 에러 envelope 통일 — `src/lib/api/errors.ts` 신설해 `perso`, `dashboard`, `youtube` 3가지 스타일을 하나로 수렴.
- [ ] `getStoredAccessToken` 중복 정의 정리 (P1-5 완료 후 자동 해소).
- [ ] 테마 초기화 이중화 정리 — `src/app/layout.tsx` inline 스크립트 혹은 `ThemeHydrator` 중 하나만 남긴다.

## P2 — End-to-End QA

### P2-6. 전체 더빙 플로우 E2E
- [ ] `tests/e2e-dubbing.spec.ts`를 확장 또는 신규 `tests/e2e-full-flow.spec.ts` 작성:
  - `testvideo/test_animation.mp4` 파일 업로드 → 언어 선택 → 더빙 요청 → 진행률 폴링 → 완료 → YouTube 업로드 → 분석 데이터 노출 각 단계.
- [ ] 실패한 단계에서 스크린샷 + 로그 수집.

### P2-7. 문서 최신화
- [ ] `README.md`에 실제 env 변수, 개발 서버 기동, 테스트 커맨드, 알려진 제약사항 업데이트.
- [ ] `docs/ARCHITECTURE.md` 신규 — 디렉토리 구조, 서버/클라 경계, 데이터 플로우 다이어그램.

---

## 자가 생성 가능 풀 (BACKLOG 고갈 시)
- 테스트 커버리지 점검
- flaky 테스트 수정
- TODO/FIXME 스윕
- lint/format/typecheck 전수 통과
- 문서 개선
- patch 업데이트
- 성능 프로파일링
- 리팩터링
- 관측성 (로깅, 에러 바운더리)
