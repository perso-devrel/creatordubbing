# 보안 1차 스윕 (Security Sweep) — 2026-04-21

> 정적 분석 기반 보안 점검 결과.

## 1. 점검 항목별 결과

| 항목 | 결과 | 상세 |
|---|---|---|
| `.env` 추적 상태 | ✅ 안전 | `.gitignore`에 `.env*` 등록, `git ls-files`에서 미추적 확인 |
| 하드코딩 API 키 | ✅ 안전 | `src/` 전체 `sk-`, `AIza`, `ghp_`, `gho_`, `pk_live` 패턴 검색 — 0건 |
| SQL Injection | ✅ 안전 | `src/lib/db/queries/` 전체 쿼리가 `?` + `args` 파라미터화 사용 |
| XSS (`dangerouslySetInnerHTML`) | ⚠️ 낮음 | 2건 — 모두 정적 콘텐츠 (아래 §2 참조) |
| Cookie 보안 | ✅ 안전 | `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV === 'production'` |
| 로그 민감 데이터 | ✅ 안전 | `logger.*` 호출 전수 점검 — 토큰/PII 로깅 없음 |
| 의존성 취약점 | ✅ 안전 | `npm audit` 0건 (2026-04-16 기준, `docs/SECURITY_AUDIT.md` 참조) |
| CSRF 방어 | ✅ 안전 | `sameSite: 'lax'` 쿠키 + API Route Handler 구조 (별도 CSRF 토큰 불필요) |

## 2. 세부 발견 사항

### 2-1. `dangerouslySetInnerHTML` (낮은 위험)

| 파일 | 라인 | 용도 | 위험도 |
|---|---|---|---|
| `src/app/(marketing)/page.tsx` | 50 | JSON-LD 구조화 데이터 (`JSON.stringify(jsonLd)`) | 낮음 — 정적 객체, 사용자 입력 없음 |
| `src/app/layout.tsx` | 44 | 테마 초기화 스크립트 (하드코딩 문자열) | 낮음 — 정적 스크립트 |

두 건 모두 사용자 입력이 주입될 경로가 없으므로 실질 XSS 위험 없음.

### 2-2. 개발 환경 시크릿 폴백

- **파일**: `src/lib/auth/session-cookie.ts:7-12`
- **내용**: `SESSION_SECRET` 미설정 시 `'dubtube-dev-secret-do-not-use-in-prod'` 사용
- **위험도**: 없음 — `NODE_ENV === 'production'`이면 throw하므로 프로덕션 노출 불가
- **권고**: 현행 유지 (개발 편의성 vs 보안 트레이드오프 적절)

### 2-3. Bearer 토큰 전달

- `src/app/api/auth/callback/route.ts`, `sync/route.ts`, `src/lib/youtube/*.ts` 등에서 `Authorization: Bearer ${accessToken}` 사용
- 모두 런타임 변수이며 하드코딩 아님 — 정상

## 3. 권고 사항

| 우선순위 | 권고 | 비고 |
|---|---|---|
| 선택 | pre-commit hook으로 `.env` 커밋 방지 강화 | 현재 `.gitignore`로 충분하나 추가 보호 가능 |
| 선택 | CI에 secrets scanning 도입 (gitleaks 등) | 향후 기여자 증가 시 권장 |
| 정보 | 다음 `npm audit` 재스캔: 2026-05-16 | `docs/SECURITY_AUDIT.md` 참조 |

## 4. 결론

심각(Critical) 또는 높음(High) 위험 항목 **0건**. 현재 코드베이스의 보안 상태는 양호.

---

*이 문서는 정적 분석 기반이며, 동적 테스트(penetration test)는 포함하지 않음.*
