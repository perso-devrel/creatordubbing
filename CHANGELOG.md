# Changelog

본 프로젝트는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따르며, 버전 표기는 [SemVer](https://semver.org/lang/ko/)를 사용합니다.

## [Unreleased]

### Added
- **Chrome 확장 (Manifest V3)** — YouTube Studio 멀티 오디오 트랙 자동 추가
  - Background 서비스 워커 · Content Script · Popup UI
  - 셀렉터 카탈로그 + fallback 체인 (`docs/SELECTORS_TO_VERIFY.md`)
  - DataTransfer 기반 파일 주입, `withRetry` 3회 지수 백오프
  - `auto`(게시까지) / `assisted`(파일 주입까지) 모드 토글
- **웹앱 ↔ 확장 통합** — UploadStep Multi-Audio 섹션에 업로드 버튼, `useExtensionDetect` 훅으로 설치/버전 감지
- **진행률 UI** — `GET_JOBS` 폴링(3초), 단계별 한국어 라벨, 실패 시 오디오 다운로드 + Studio 딥링크 + 수동 3단계 안내
- **단위 테스트** — `validators.ts` 순수 함수 테스트 16→28개, dom-utils 7개 추가
- **문서** — `extension/README.md`, `docs/QA_CHECKLIST.md`, 루트 README의 mermaid 아키텍처 다이어그램

### Changed
- ESLint 10 호환 정비 — `eslint-config-next` 의존 제거, `@next/eslint-plugin-next` 직접 사용
- 의존성 패치 업데이트 — tailwindcss · react-query · eslint · typescript 등 5건

### Fixed
- 테스트 환경변수 stub 누락 / API 계약 drift 해소 (Vitest 0 failures)

### Security
- 1차 보안 스윕 — `.env` 노출, 하드코딩 키, XSS, 쿠키 보안 전수 점검 (`docs/SECURITY_SWEEP.md`)
- 의존성 취약점 0건 (`docs/SECURITY_AUDIT.md`)

### 검증 현황 (마지막 측정 시점 기준)
- 웹앱 Vitest: 전체 통과
- 확장 Vitest: 전체 통과
- 웹앱 / 확장 빌드: 성공
- Lighthouse Production: Performance 94 · Accessibility 100 · Best Practices 100 · SEO 100 (`docs/PERFORMANCE_RELEASE_AUDIT.md`)
