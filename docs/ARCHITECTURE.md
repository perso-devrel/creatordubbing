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
| `users` | 사용자 프로필, 크레딧, 플랜, 암호화된 Google access/refresh token, 탈퇴 상태 마커 |
| `app_sessions` | 활성 세션 (탈퇴 시 즉시 revoke 대상) |
| `user_preferences` | 사용자별 워크플로 설정 — 기본 언어/태그/공개 범위, metadata target preset (서버가 source of truth) |
| `dubbing_jobs` | 더빙 작업 단위. `upload_settings_json`, `deliverable_mode`, `original_video_url`, `original_youtube_url` 로 업로드 설정 스냅샷 보관 (migration 0008) |
| `job_languages` | 작업별 언어 진행 상태, YouTube 업로드 결과 (`youtube_upload_status`) |
| `youtube_uploads` | YouTube 업로드 기록 + 통계 |
| `upload_queue` | 큐 워커가 처리할 자동 업로드 작업 (idempotent) |
| `perso_media_resources` | Perso.ai에 업로드된 원본 미디어 메타 — 탈퇴 cron 시 함께 삭제 |
| `analytics_cache` | YouTube Analytics API 응답 캐시 (24h TTL) |
| `payment_orders` | Toss 결제 주문 / 영수 — 탈퇴 후에도 5년 익명 보존 (전자상거래법) |
| `credit_transactions` | 크레딧 적립·차감 내역 — 탈퇴 후에도 5년 익명 보존 |
| `operational_events` | 운영 이벤트 감사 로그 — 탈퇴 후 user_id NULL 처리 후 보존 |

마이그레이션 0001~0008 (`migrations/`) 에 스키마 정의. 0006/0007은 탈퇴 복구창과 보존 메타데이터 컬럼 추가, 0008은 업로드 스냅샷 컬럼 추가.

## API 라우트 맵

| Endpoint | Method | 용도 |
|----------|--------|------|
| `/api/auth/callback` | POST | OAuth code → token 교환 + 세션 쿠키 발급 |
| `/api/auth/sync` | POST | OAuth 토큰 동기화 + 쿠키 설정 |
| `/api/auth/signout` | POST | 세션 쿠키 클리어 |
| `/api/auth/disconnect-youtube` | POST | Google revoke 호출 + DB의 YouTube 토큰 정리 (계정은 유지) |
| `/api/dashboard/*` | GET/POST | 대시보드 데이터 (세션 인가) |
| `/api/perso/*` | GET/POST | Perso.ai API 프록시 |
| `/api/youtube/upload` | POST | 영상 업로드 (resumable) |
| `/api/youtube/upload-session` | POST | resumable upload 세션 URI 발급 (브라우저 → YouTube 직업로드) |
| `/api/youtube/caption` | GET | 영상의 자막 트랙 목록 조회 (LanguageSelectStep 비활성화에 사용) |
| `/api/youtube/caption` | POST | 자막(SRT) 업로드 |
| `/api/youtube/metadata` | GET/POST | 영상 메타데이터 조회/업데이트 (다국어 localization 포함) |
| `/api/youtube/stats` | GET | 영상/채널 통계 |
| `/api/youtube/videos` | GET | 사용자 영상 목록 |
| `/api/youtube/analytics` | GET | 시청 분석 데이터 |
| `/api/user/account` | DELETE | 회원탈퇴 요청 (7일 복구창 soft-delete) |
| `/api/user/preferences` | GET/POST | 사용자 워크플로 기본값 |
| `/api/cron/process-dubbing-jobs` | POST | 더빙 진행 상태 폴링 cron (Bearer CRON_SECRET) |
| `/api/cron/process-uploads` | POST | 업로드 큐 처리 cron |
| `/api/cron/purge-deleted-accounts` | POST | 만료된 탈퇴 row 정리 cron (자세한 동작은 OPERATIONS_RUNBOOK 참고) |
