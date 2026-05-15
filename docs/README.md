# sub2tube 문서 인덱스

> 이 폴더는 sub2tube 프로젝트의 **공식 기술 문서**를 모아두는 곳입니다.
> 비즈니스·기획 산출물(서비스 기획서·BRD·요구사항·테스트 계획 등)은 별도 문서 저장소에서 관리됩니다.

## 📐 설계 & 운영

| 파일 | 설명 |
| ---- | ---- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 서버/클라이언트 경계, 데이터 플로우, API 라우트 맵, DB 테이블 요약 |
| [`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) | GitHub Actions cron, 더빙 worker, 업로드 queue, Toss Payments, OAuth redirect, 출시 전 env 체크리스트 |
| [`EXTENSION_STRUCTURE.md`](./EXTENSION_STRUCTURE.md) | Chrome 확장(`/extension`) 폴더 구조 결정 기록 (ADR) |

## 🧪 품질 & 보안

| 파일 | 설명 |
| ---- | ---- |
| [`QA_CHECKLIST.md`](./QA_CHECKLIST.md) | 웹앱 + Chrome 확장 수동 QA 가이드 |
| [`PERFORMANCE_RELEASE_AUDIT.md`](./PERFORMANCE_RELEASE_AUDIT.md) | 성능·접근성·번들 사이즈 출시 전 감사 보고서 |
| [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) | `npm audit` 의존성 보안 감사 |
| [`SECURITY_SWEEP.md`](./SECURITY_SWEEP.md) | 정적 분석 기반 보안 스윕 (XSS, SSRF, 쿠키 보안 등) |
| [`SELECTORS_TO_VERIFY.md`](./SELECTORS_TO_VERIFY.md) | YouTube Studio DOM 셀렉터 수동 검증 체크리스트 |

## 🌐 다국어 README (`readme/`)

| 파일 | 설명 |
| ---- | ---- |
| [`readme/README.en.md`](./readme/README.en.md) | English |
| [`readme/README.ja.md`](./readme/README.ja.md) | 日本語 |
| [`readme/README.zh.md`](./readme/README.zh.md) | 中文 |

## 🔬 리서치 (`research/`)

| 파일 | 설명 |
| ---- | ---- |
| [`research/youtube-multi-audio.md`](./research/youtube-multi-audio.md) | YouTube 멀티 오디오 트랙 처리 리서치 |

## 다른 위치의 문서

- [`README.md`](../README.md) (루트) — 한국어 소개. 다국어 버전은 `docs/readme/`에 있습니다.
- [`AGENTS.md`](../AGENTS.md) — 코딩 에이전트용 지침 (CLAUDE.md가 import).
- [`CHANGELOG.md`](../CHANGELOG.md) — 사용자 시점의 변경 이력.
- [`.github/SECURITY.md`](../.github/SECURITY.md) — 보안 취약점 신고 절차.
- [`extension/README.md`](../extension/README.md) — Chrome 확장 빌드/디버깅 가이드.

> 비즈니스 산출물(서비스 기획서·요구사항·시장 조사 등)은 별도 문서 저장소를 참조하세요.
