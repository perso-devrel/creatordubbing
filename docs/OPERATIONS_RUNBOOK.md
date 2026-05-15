# 운영 설정 런북

작성일: 2026-05-11 KST

## GitHub Actions cron

Vercel Cron은 사용하지 않는다. 운영 background job은 `.github/workflows/upload-cron.yml`에서 GitHub Actions schedule로 실행한다.

- 실행 주기: 5분마다, `2/5 * * * *`
- 호출 endpoint (워크플로 한 번에 순차 호출):
  - `POST /api/cron/process-dubbing-jobs`
  - `POST /api/cron/process-uploads`
  - `POST /api/cron/purge-deleted-accounts`
- 보호 방식: `Authorization: Bearer <CRON_SECRET>`
- GitHub repository variable: `PROD_BASE_URL=https://운영도메인`
- GitHub repository secret: `CRON_SECRET`
- 배포 환경 env: `CRON_SECRET`

`CRON_SECRET`은 GitHub secret과 배포 환경 env에 같은 값으로 넣어야 한다. 두 값이 다르면 cron 요청은 401로 실패한다.

GitHub Actions schedule은 무료로 대체 가능하지만 정확한 초 단위 실행 보장은 없다. GitHub 문서 기준으로 부하 상황에서는 지연되거나 일부 작업이 누락될 수 있고, public repository는 60일 동안 활동이 없으면 schedule workflow가 자동 비활성화될 수 있다. 업로드 큐처럼 5분 단위 지연이 허용되는 작업에만 사용한다.

## 더빙 worker와 업로드 큐

더빙 시작 시점에 업로드 설정 snapshot을 `dubbing_jobs`에 저장한다.

- `upload_settings_json`: 자동 업로드, 제목, 설명, 태그, 공개 범위, 자막 업로드, AI disclosure, 원본 링크 포함 여부
- `deliverable_mode`: `newDubbedVideos`, `originalWithMultiAudio`, `downloadOnly`
- `original_video_url`
- `original_youtube_url`

`process-dubbing-jobs` cron은 Perso 진행 상태를 서버에서 수집한다.

- 진행 중 언어의 Perso progress를 조회한다.
- 완료되면 Perso download link를 DB에 저장한다.
- 자동 업로드 조건을 만족하면 `upload_queue`에 enqueue한다.
- 실패하면 operational event를 기록하고 최근 작업에서 실패 상태를 볼 수 있게 DB 상태를 갱신한다.

수동 업로드도 브라우저가 영상 파일이나 자막을 직접 fetch하지 않는다. 버튼 클릭 시 `queueJobLanguageYouTubeUpload` mutation만 호출하고, 서버가 완료된 작업의 DB/Perso 정보를 기준으로 업로드 큐를 만든다.

업로드 큐는 idempotent하게 동작한다.

- 이미 업로드된 언어는 기존 YouTube video id를 반환한다.
- pending/processing/done 큐가 있으면 새 큐를 만들지 않는다.
- 실패한 큐는 같은 row를 pending으로 되살려 재시도한다.
- 업로드 실패 시 `job_languages.youtube_upload_status = 'failed'`로 갱신한다.

## 회원탈퇴 데이터 보존 정책

회원탈퇴 흐름은 두 단계로 동작한다. 사용자 요청 시점에 즉시 soft-delete + 7일 복구창을 열고, 만료된 row는 cron이 정리한다.

### 1단계: 탈퇴 요청 시점 (soft-delete)

`DELETE /api/user/account` 가 `requestUserAccountDeletion(uid)` (`src/lib/db/queries/users.ts`) 을 호출한다.

- `users` row에 `account_status='pending_deletion'`, `deletion_requested_at`, `deletion_restore_expires_at` (요청 시점 + 7일) 기록
- 식별 가능 필드 즉시 익명화: `email = withdrawal-requested+<sha256(uid)>@withdrawal.sub2tube.local`, `display_name = '회원탈퇴 요청'`, `photo_url = NULL`
- Google 토큰 (access/refresh) 즉시 NULL 처리
- 모든 활성 세션(`app_sessions`) 즉시 revoke
- 연결된 row에 `account_deletion_requested_at` 표시: `dubbing_jobs`, `job_languages`, `youtube_uploads`, `upload_queue`, `analytics_cache`, `perso_media_resources`, `payment_orders`, `credit_transactions`, `operational_events`

복구창 안에서 다시 Google 로그인하면 `upsertUser` 가 `canRestorePendingDeletion` 을 거쳐 모든 marker를 클리어한다 (`account_status='active'` 복귀).

### 2단계: 만료 후 cron purge

`/api/cron/purge-deleted-accounts` 가 5분마다 실행되며 `purgeExpiredPendingDeletedAccounts({ limit })` 을 호출한다.

- 기본 batch: 50, 쿼리스트링 `?limit=N` 으로 1~200 사이 지정 가능
- 함수 max duration: 300초
- `deletion_restore_expires_at < now()` 인 pending_deletion 사용자만 대상

각 만료 사용자에 대해 `purgeExpiredDeletedAccount(tx, uid, personalDataErasedAt)` 가 수행:

| 테이블 | 처리 |
|--------|------|
| `users` | HARD DELETE |
| `app_sessions` | HARD DELETE |
| `dubbing_jobs`, `job_languages`, `youtube_uploads`, `upload_queue`, `analytics_cache`, `perso_media_resources` | HARD DELETE |
| `payment_orders`, `credit_transactions` | 익명화 후 RETAIN — `user_id = deleted:<sha256(uid)>`, raw_json/metadata_json 클리어, `retention_until = created_at + 5년`, `account_retention_reason='settlement_and_legal_retention'` |
| `operational_events` | `user_id = NULL` 처리 후 RETAIN (감사 로그 보존) |

### 보존 기간 근거

- **7일 복구창**: UX — 사용자 실수/번복 대응
- **5년 결제/크레딧 보존**: 한국 전자상거래법 (전자상거래등에서의 소비자보호에 관한 법률 제6조) 상 거래 기록 5년 보관 의무. 식별값 익명화 후 결제 사실관계만 남긴다.
- **YouTube 영상 자체는 삭제하지 않음**: 사용자가 본인 채널에 올린 콘텐츠 소유권은 유지. DB의 연결 row만 삭제.

### Google OAuth 토큰

DB의 `google_access_token` / `google_refresh_token` 은 1단계에서 NULL 처리되지만, **Google 측 oauth2 revoke 호출은 현재 누락**되어 있다 (`disconnect-youtube` 라우트만 revoke 호출). 사용자가 Google 계정의 권한 화면에서 별도로 해제할 때까지 sub2tube는 권한 목록에 남는다. 추후 `requestUserAccountDeletion` 직전에 revoke 호출 추가 권장.

## Toss Payments

Toss 운영 결제는 key만 넣으면 동작하도록 서버 구현이 준비되어 있다.

필수 배포 env:

- `TOSS_SECRET_KEY`: 운영용 `live_sk...` 또는 `live_gsk...`
- `TOSS_API_BASE_URL=https://api.tosspayments.com`

운영 시 Toss 개발자센터에 등록할 값:

- success URL: `https://운영도메인/billing/success`
- fail URL: `https://운영도메인/billing/fail`
- webhook URL: `https://운영도메인/api/billing/toss/webhook`

## 운영 OAuth Redirect

운영 OAuth redirect는 실제 도메인을 구매하고 Vercel에 연결한 뒤 그 도메인으로 등록하면 된다.

예시:

- 로컬: `http://localhost:3000/auth/callback`
- 운영: `https://운영도메인/auth/callback`

Google Cloud Console의 OAuth Client 설정에 다음 값을 등록한다.

- Authorized JavaScript origins: `https://운영도메인`
- Authorized redirect URIs: `https://운영도메인/auth/callback`

Google OAuth의 redirect URI는 완전 일치해야 한다. 도메인을 바꾸면 Google Cloud Console에도 같은 redirect URI를 다시 등록해야 하며, 값이 다르면 `redirect_uri_mismatch`로 로그인과 YouTube 권한 동의가 차단된다.

## 출시 전 env 체크리스트

배포 환경:

- `NEXT_PUBLIC_SITE_URL`
- `PERSO_API_KEY`
- `PERSO_API_BASE_URL`
- `NEXT_PUBLIC_PERSO_FILE_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `ALLOW_LEGACY_PLAINTEXT_TOKENS=false`
- `TURSO_URL`
- `TURSO_AUTH_TOKEN`
- `TOSS_SECRET_KEY`
- `TOSS_API_BASE_URL`
- `CRON_SECRET`
- `OPERATIONS_ADMIN_EMAILS`
- `NEXT_PUBLIC_EXTENSION_ID` if the Chrome extension is used

GitHub Actions:

- repository variable `PROD_BASE_URL`
- repository secret `CRON_SECRET`

외부 콘솔:

- Google OAuth production origin and redirect URI
- YouTube Data API enabled
- YouTube Analytics API enabled
- Toss Payments production key
- Toss Payments webhook endpoint
