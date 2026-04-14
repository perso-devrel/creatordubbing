# CreatorDub

AI 기반 영상 더빙 플랫폼. YouTube 영상을 여러 언어로 더빙하고, 더빙 결과를 YouTube에 업로드하며, 시청 분석 데이터를 대시보드에서 확인할 수 있다.

## 스택

- **Next.js 16.2.3** (App Router) / React 19 / TypeScript
- **Tailwind CSS v4** / Zustand / React Query
- **Turso (libsql)** — DB
- **Perso.ai API** — 더빙 엔진
- **YouTube Data API v3** — 업로드, 통계
- **YouTube Analytics API v2** — 시청 분석
- **Google OAuth 2.0** — 인증

## 환경 변수

`.env.local`에 다음을 설정:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_PERSO_FILE_BASE_URL=
PERSO_API_KEY=
PERSO_API_BASE_URL=
TURSO_URL=
TURSO_AUTH_TOKEN=
```

## 개발 서버

```bash
npm install
npm run dev        # http://localhost:3000
```

## 테스트

```bash
npx tsc --noEmit              # 타입 체크
npm run lint                  # ESLint
npm run test                  # Vitest 유닛 테스트
npm run build                 # 프로덕션 빌드
npm run test:e2e              # Playwright E2E
npm run test:lighthouse:gate  # Lighthouse 성능 게이트
```

## 디렉토리 구조

```
src/
  app/                    # Next.js App Router
    (app)/                # 인증 필요 라우트 (dashboard, dubbing, batch, billing, youtube)
    api/                  # API Route Handlers
      dashboard/          # 대시보드 데이터 API
      perso/              # Perso.ai 프록시 API
      youtube/            # YouTube 업로드/통계/분석 API
      auth/               # 인증 관련 API
  features/               # 기능별 컴포넌트
    dubbing/              # 더빙 워크플로우 (5단계 위저드)
    dashboard/            # 대시보드 차트 및 요약
    landing/              # 랜딩 페이지
    auth/                 # 인증 UI
    billing/              # 결제/크레딧
  lib/                    # 서버 유틸
    db/                   # Turso DB 클라이언트 + 쿼리
    perso/                # Perso.ai API 헬퍼
    youtube/              # YouTube API 서버 함수
    auth/                 # 세션 검증
    api/                  # 공용 API 응답 헬퍼
    validators/           # Zod 스키마
  stores/                 # Zustand 스토어 (auth, notification, theme)
  hooks/                  # React Query 훅
  components/             # 공용 UI 컴포넌트
  proxy.ts                # 인증 미들웨어
```

## 알려진 제약

- YouTube 다중 오디오 트랙은 API 미지원 — 언어별 별도 영상 업로드 방식 사용
- Google OAuth implicit flow 사용 중 — authorization code flow 전환 예정
- `creatordub_session` 쿠키 하드닝 필요
