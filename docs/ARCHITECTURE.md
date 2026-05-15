# Architecture

## 서버/클라이언트 경계

```
브라우저 (CSR)                   Next.js 서버 (SSR + API)              외부 서비스
─────────────                   ────────────────────────              ──────────
Zustand stores                  proxy.ts (미들웨어)                    Google OAuth
React Query hooks ──────────▶   /api/* Route Handlers ──────────▶    Perso.ai API
features/* components           lib/db/ (Turso 직접)                  YouTube Data API
lib/api-client.ts               lib/youtube/server.ts                 YouTube Analytics API
lib/firebase.ts (OAuth)         lib/perso/*.ts                        Turso (libsql)
                                lib/auth/session.ts
```

### 인증 플로우

1. 클라이언트: `signInWithGoogle()` → Google OAuth popup → authorization code 획득
2. 클라이언트: `POST /api/auth/callback` → 서버가 code를 access_token + refresh_token으로 교환
3. 서버: `sub2tube_session` + `google_access_token` httpOnly 쿠키 설정, refresh_token DB 저장
4. 서버: `proxy.ts` 미들웨어가 `sub2tube_session` 쿠키로 인증 상태 확인
5. API 라우트: `requireSession()` (대시보드) 또는 `requireAccessToken()` (YouTube) 로 인가

### 더빙 데이터 플로우

```
파일/URL 입력 → Perso.ai 업로드 → 언어 선택 → Perso.ai 더빙 요청
    → 진행률 폴링 → 더빙 완료 → (선택) YouTube 업로드
    → DB 기록 (dubbing_jobs, job_languages, youtube_uploads)
```

### 대시보드 데이터 플로우

서버 컴포넌트(`dashboard/page.tsx`)가 Turso DB 직접 조회 → `initialData`로 클라이언트에 전달 → React Query가 `staleTime` 이후 자동 갱신.

YouTube Analytics 데이터는 클라이언트에서 `/api/youtube/analytics` 호출 → 서버가 YouTube Analytics API v2 쿼리 + `analytics_cache` 테이블로 24시간 TTL 캐시.

## DB 테이블

| 테이블 | 용도 |
|--------|------|
| `users` | 사용자 프로필, 크레딧, 플랜 |
| `dubbing_jobs` | 더빙 작업 단위 |
| `job_languages` | 작업별 언어 진행 상태 |
| `youtube_uploads` | YouTube 업로드 기록 + 통계 |
| `analytics_cache` | YouTube Analytics API 응답 캐시 (24h TTL) |

## API 라우트 맵

| Endpoint | Method | 용도 |
|----------|--------|------|
| `/api/auth/sync` | POST | OAuth 토큰 동기화 + 쿠키 설정 |
| `/api/auth/signout` | POST | 세션 쿠키 클리어 |
| `/api/dashboard/*` | GET/POST | 대시보드 데이터 (세션 인가) |
| `/api/perso/*` | GET/POST | Perso.ai API 프록시 |
| `/api/youtube/upload` | POST | 영상 업로드 (resumable) |
| `/api/youtube/caption` | POST | 자막(SRT) 업로드 |
| `/api/youtube/stats` | GET | 영상/채널 통계 |
| `/api/youtube/videos` | GET | 사용자 영상 목록 |
| `/api/youtube/analytics` | GET | 시청 분석 데이터 |
