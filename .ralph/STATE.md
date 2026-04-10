# 현재 상태

- **브랜치**: harness가 `ralph/<timestamp>`를 자동 생성
- **Base 브랜치**: `develop` (없으면 `main`으로 폴백)
- **마지막 사람 터치**: 2026-04-10, Ralph 하네스 초기 세팅 완료 직후
- **최근 주요 결정**:
  - Next.js 16 / React 19 프로젝트. Next 16 관례를 매번 `node_modules/next/dist/docs/`에서 확인하도록 PROMPT에 박음.
  - 감사 리포트(치명적 6건 + 성능 4건)를 BACKLOG에 P0/P1로 시드.
  - 신규 기능 3건(URL 업로드, YouTube 업로드 검증, 다중 오디오 트랙, 시청 분석)을 P1/P2로 시드.
  - 테스트 영상은 `testvideo/test_animation.mp4` 고정 사용, 커밋 금지.
  - 자동 배포는 Vercel 가정. 루프는 `ralph/*` 브랜치에서만 돌고 push 금지.
- **알려진 이슈**:
  - Vitest 아직 미도입 — P0-5에서 처음 도입.
  - `gh` CLI 미설치 상태일 수 있음 — PR 자동화는 불가하므로 루프는 로컬 커밋까지만 한다.
  - Google OAuth access token이 `localStorage`에 저장되어 있음 (authStore.ts:30-35).
- **다음 루프가 기대하는 출발점**: BACKLOG.md의 P0-1 (`/api/dashboard/*` 인가 + zod)부터 시작.
- **QA 완료 정의 (프로젝트 종료 조건)**:
  1. 감사 리포트의 13개 항목 모두 체크.
  2. `npm run build`, `npx tsc --noEmit`, `npm run lint` 전부 0 에러.
  3. Playwright E2E 스모크 + 더빙 플로우 통과.
  4. Lighthouse 성능 90+ (baseline 대비 회귀 없음).
  5. `testvideo/test_animation.mp4`로 end-to-end 더빙 → YouTube 업로드 → 분석 데이터 취합이 수동 테스트에서 동작.
