# Changelog

## [develop_loop] — 2026-04-21

`develop` 브랜치에서 분기하여 전체 QA + Chrome 확장 개발을 수행한 브랜치.

### Phase 1 — 웹앱 QA

- **진단 리포트** — 프로젝트 구조·의존성·스크립트 분석 (`docs/DIAGNOSIS.md`)
- **ESLint 실행 복구** — ESLint 10 + `eslint-plugin-react` 비호환 해결, `@next/eslint-plugin-next` 직접 사용
- **테스트 19건 실패 수정** — 환경변수 stub 누락, API 계약 drift 해소 (Vitest 0 failures)
- **유닛 테스트 보강** — `validators.ts` 순수 함수 테스트 16→28개
- **보안 1차 스윕** — `.env` 노출, 하드코딩 키, XSS 전수 점검 (`docs/SECURITY_SWEEP.md`)
- **의존성 패치 업데이트** — tailwindcss, react-query, eslint, typescript 5건

### Phase 2 — Chrome 확장 스캐폴딩

- **폴더 구조 결정** — 단일 `/extension` 폴더 채택 (비교 문서 포함)
- **Manifest V3 스캐폴드** — Vite 7 멀티 엔트리 빌드, 서비스 워커, content script, popup
- **TypeScript + ESLint 설정** — 웹앱과 일관된 도구 체인
- **메시지 타입 스키마** — PING, UPLOAD_TO_YOUTUBE, UPLOAD_PROGRESS/DONE/ERROR + 타입 가드 7개
- **Background 서비스 워커** — 메시지 라우팅, jobId 생성, 탭 관리, storage 저장
- **Content script 골격** — waitForElement 유틸, 7개 업로드 단계 스텁, DomHelper 추상화
- **Popup UI** — 상태 표시, 최근 업로드 로그 3건, auto/assisted 모드 토글

### Phase 3 — 업로드 로직

- **셀렉터 카탈로그** — YouTube Studio DOM 셀렉터 11개 (각 후보 3개) + fallback 체인 (`docs/SELECTORS_TO_VERIFY.md`)
- **업로드 단계 함수화** — 셀렉터 연결, DomHelper 인터페이스 주입
- **파일 주입 유틸** — DataTransfer 기반 `fetchAsFile` + `injectFileToInput`
- **에러 핸들링 & 재시도** — `withRetry` (3회, 지수 백오프 1s→2s→4s), 수동 가이드 URL
- **자동화 모드 토글** — `auto`(게시까지)/`assisted`(파일 주입까지), chrome.storage 기반 설정

### Phase 4 — 웹앱↔확장 통합

- **확장 연동 업로드 버튼** — UploadStep Multi-Audio 섹션에 통합, UPLOAD_TO_YOUTUBE 전송
- **확장 감지 훅** — `useExtensionDetect` (PING 감지 + 버전 + recheck), 설치 가이드 링크
- **진행률 UI** — GET_JOBS 폴링 (3초), 단계별 한국어 라벨, 완료/오류 상태
- **실패 복구 UX** — 오디오 다운로드 + Studio 딥링크 + 수동 3단계 안내

### Phase 5 — 문서화

- **extension README** — 개발 환경, 빌드, Chrome 로드, 디버깅 가이드
- **루트 README 업데이트** — 확장 설명, mermaid 아키텍처 다이어그램, 환경변수
- **QA 체크리스트** — Phase 1~5 산출물 수동 검증 가이드 (`docs/QA_CHECKLIST.md`)
- **CHANGELOG** — 이 문서

### 테스트 현황

- 웹앱 Vitest: 전체 통과
- 확장 Vitest: 63건 전체 통과
- 웹앱 빌드: 성공
- 확장 빌드: 성공
