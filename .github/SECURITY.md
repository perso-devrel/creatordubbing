# 보안 정책 (Security Policy)

> sub2tube 웹 애플리케이션의 보안 취약점 보고 절차를 정의합니다.
> This document defines how to report security vulnerabilities for the sub2tube web application.

---

## 한국어 (Primary)

### 지원 버전 (Supported Versions)

보안 패치는 항상 `main` 브랜치의 최신 배포 버전에만 적용됩니다. 이전 배포분은 별도 지원되지 않으므로, 취약점이 확인되면 최신 버전으로 업그레이드해 주세요.

| 버전 | 지원 여부 |
| ---- | --------- |
| `main` (최신 배포) | 지원 |
| 그 외 브랜치 / 과거 태그 | 미지원 |

### 취약점 신고 방법

**공개 이슈(Public Issue)로 보고하지 마세요.** 취약점 정보가 공개되면 악용 가능성이 높아집니다.

1. GitHub의 **Private Vulnerability Reporting** 을 사용해 주세요.
   - Repository → **Security** 탭 → **Report a vulnerability** 버튼
   - 또는 직접 링크: `https://github.com/perso-devrel/sub2tube/security/advisories/new`
2. GitHub 계정이 없거나 Private Reporting 에 접근할 수 없다면 아래 이메일로 연락 바랍니다.
   - `gyuwon05@gmail.com`
   - PGP 공개키: 현재 미공개 (필요 시 보고자에게 별도 전달)

### 보고 시 포함해 주세요

- 영향받는 컴포넌트 (파일 경로, 엔드포인트, UI 화면 등)
- 재현 절차 (PoC 또는 단계별 설명)
- 예상되는 영향 범위 (정보 유출, 권한 상승, DoS 등)
- 가능하다면 제안하는 완화/수정 방안

### 응답 SLA (Response SLA)

| 단계 | 기한 |
| ---- | ---- |
| 접수 확인 (Initial Acknowledgement) | 영업일 기준 **48시간 이내** |
| 조치 계획 공유 (Remediation Plan) | 접수 후 **7일 이내** |
| 보안 패치 배포 | 심각도에 따라 별도 조율 (Critical: 가능한 한 신속히) |

보고자에게는 처리 과정이 단계별로 공유되며, 원하는 경우 GitHub Security Advisory 에 크레딧을 기재합니다.

### 범위 (Scope)

이 정책은 **sub2tube 웹 애플리케이션 본체**에만 적용됩니다.

**범위 내 (In-scope)**
- 이 저장소(`perso-devrel/sub2tube`)의 애플리케이션 코드
- 배포된 sub2tube 웹 서비스의 엔드포인트 / UI
- 저장소에 포함된 빌드·배포 스크립트 및 GitHub Actions 워크플로

**범위 외 (Out-of-scope)** — 해당 벤더에 직접 신고해 주세요.
- **Perso.ai API**: Perso.ai 측 보안 담당에게 직접 문의
- **YouTube Data API / Google OAuth**: Google Vulnerability Reward Program (`https://bughunters.google.com`)
- **Turso / libSQL**: Turso 보안 담당 (`security@turso.tech`)
- **Next.js / React / Vercel 등 업스트림 의존성**: 각 프로젝트의 보안 정책을 따름

### Safe Harbor

성실한 보안 연구(good-faith research) 로 신고된 건에 대해서는 법적 조치를 취하지 않습니다. 단, 아래 행위는 금지됩니다.

- 실제 사용자 데이터 열람·유출·변조
- 서비스 가용성에 영향을 주는 행위 (DoS, 스팸 등)
- 비공개 취약점을 제3자에게 공개

---

## English

### Supported Versions

Security patches are applied only to the latest deployed version of the `main` branch. Older branches and legacy tags are **not** supported — please upgrade to the latest version before reporting.

| Version | Supported |
| ------- | --------- |
| `main` (latest release) | Yes |
| Other branches / past tags | No |

### Reporting a Vulnerability

**Do not open a public issue.** Public disclosure of unpatched vulnerabilities increases the risk of exploitation.

1. Use GitHub's **Private Vulnerability Reporting** feature:
   - Repository → **Security** tab → **Report a vulnerability**
   - Direct link: `https://github.com/perso-devrel/sub2tube/security/advisories/new`
2. If GitHub is not an option, email the security team:
   - `gyuwon05@gmail.com`
   - PGP key: currently not published; will be shared on request.

### What to Include

- Affected component (file path, endpoint, UI surface)
- Reproduction steps (PoC or step-by-step explanation)
- Expected impact (data disclosure, privilege escalation, DoS, etc.)
- Suggested mitigation or patch, if any

### Response SLA

| Stage | Target |
| ----- | ------ |
| Initial acknowledgement | Within **48 business hours** |
| Remediation plan shared | Within **7 days** of acknowledgement |
| Patch release | Depends on severity; Critical issues are prioritized |

Reporters are updated at each stage and may be credited in the GitHub Security Advisory upon request.

### Scope

This policy covers the **sub2tube web application only**.

**In-scope**
- Application code in this repository (`perso-devrel/sub2tube`)
- Endpoints and UI of the deployed sub2tube web service
- Build, deployment scripts, and GitHub Actions workflows in this repo

**Out-of-scope** — report to the respective vendor instead.
- **Perso.ai API**: contact the Perso.ai security team directly.
- **YouTube Data API / Google OAuth**: Google Vulnerability Reward Program (`https://bughunters.google.com`).
- **Turso / libSQL**: `security@turso.tech`.
- **Next.js / React / Vercel and other upstream dependencies**: follow the respective project's security policy.

### Safe Harbor

We will not pursue legal action against researchers acting in good faith. The following activities are prohibited:

- Accessing, exfiltrating, or modifying real user data
- Degrading service availability (DoS, spam, etc.)
- Disclosing unpatched vulnerabilities to third parties
