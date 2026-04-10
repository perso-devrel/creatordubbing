# 현재 상태

- **브랜치**: harness가 `ralph/<timestamp>`를 자동 생성
- **Base 브랜치**: `develop` (없으면 `main`으로 폴백)
- **현재 origin**: `https://github.com/perso-devrel/creatordubbing.git` (private, admin 권한 있음)
- **main / develop** 모두 origin에 최초 push 완료 (커밋 `33ccde2`)
- **마지막 사람 터치**: 2026-04-10, Ralph 하네스 초기 세팅 + 원격 연결 완료
- **최근 주요 결정**:
  - Next.js 16 / React 19 프로젝트. Next 16 관례를 매번 `node_modules/next/dist/docs/`에서 확인하도록 PROMPT에 박음.
  - 감사 리포트(치명적 6건 + 성능 4건)를 BACKLOG에 P0/P1로 시드.
  - 신규 기능 3건(URL 업로드, YouTube 업로드 검증, 다중 오디오 트랙, 시청 분석)을 P1/P2로 시드.
  - 테스트 영상은 `testvideo/test_animation.mp4` 고정 사용, 커밋 금지.
  - 자동 배포는 Vercel 가정. 루프는 `ralph/*` 브랜치에서만 돌고 push 금지.
- **알려진 이슈**:
  - Vitest 아직 미도입 — P2-3에서 처음 도입.
  - `gh` CLI는 alpaka206 계정으로 인증됨. repo 설정 반영 완료 (`delete_branch_on_merge=false`, `allow_squash_merge=true`, `allow_merge_commit=true`). `allow_auto_merge`는 org 정책으로 false 유지.
  - Google OAuth access token이 `localStorage`에 저장되어 있음 (authStore.ts:30-35).
  - **Vercel 자동 배포 미구성** — CLI TLS 에러로 자동화 불가. 사람이 아침에 다음 단계를 수동 진행:
    1. https://vercel.com/new 에서 `perso-devrel/creatordubbing` import (root = 현재 디렉토리)
    2. env 변수 입력: `PERSO_API_KEY`, `PERSO_API_BASE_URL`, `NEXT_PUBLIC_PERSO_FILE_BASE_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TURSO_URL`, `TURSO_AUTH_TOKEN`
    3. Production branch = `main`, Preview = `develop`
    4. Build command = `npm run build` (default), Framework = Next.js (auto)
  - **Vercel 연결 완료 후 BACKLOG의 "Vercel 수동 연동 확인" 항목을 체크할 것.**
- **다음 루프가 기대하는 출발점**: BACKLOG.md의 P0-1 (`/api/dashboard/*` 인가 + zod)부터 시작.
- **QA 완료 정의 (프로젝트 종료 조건)**:
  1. 감사 리포트의 13개 항목 모두 체크.
  2. `npm run build`, `npx tsc --noEmit`, `npm run lint` 전부 0 에러.
  3. Playwright E2E 스모크 + 더빙 플로우 통과.
  4. Lighthouse 성능 90+ (baseline 대비 회귀 없음).
  5. `testvideo/test_animation.mp4`로 end-to-end 더빙 → YouTube 업로드 → 분석 데이터 취합이 수동 테스트에서 동작.
