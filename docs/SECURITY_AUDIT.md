# Security Audit Report — sub2tube

- **Scan date**: 2026-04-16
- **Tool**: `npm audit` (auditReportVersion 2)
- **Scope**: root `package.json` dependency tree (prod + dev + optional)
- **Command**: `npm audit --json`

---

## 요약 (Korean Summary)

- **결과**: 현재 의존성 트리에서 알려진 취약점이 **0건** 확인되었습니다.
- **스캔 범위**: 총 **809개** 패키지 (production 94 / dev 670 / optional 111 / peer 0).
- **심각도별 건수**: critical 0 · high 0 · moderate 0 · low 0 · info 0.
- **조치 필요 사항**: 현 시점 즉시 조치 필요한 CVE는 없습니다. Dependabot 일일 스캔과 CI 의 `npm audit --audit-level=high` 게이트로 지속 감시합니다.
- **권고**:
  1. `.github/dependabot.yml` 의 일일 업데이트를 활성 상태로 유지합니다.
  2. PR CI 에서 `npm-audit.yml` 워크플로가 실패하면 병합 전 반드시 해결합니다.
  3. 매주 월요일 CodeQL 스케줄 스캔 결과를 Security 탭에서 확인합니다.
  4. 새로운 의존성 추가 시 로컬에서 `npm audit` 재확인.
  5. 다음 정기 점검 예정일: **2026-05-16** (월 1회 권장).

---

## English Details

### Vulnerability counts

| Severity | Count |
| -------- | ----- |
| critical | 0 |
| high     | 0 |
| moderate | 0 |
| low      | 0 |
| info     | 0 |
| **total**| **0** |

### Dependency inventory

| Type     | Count |
| -------- | ----- |
| prod     | 94 |
| dev      | 670 |
| optional | 111 |
| peer     | 0 |
| peerOptional | 0 |
| **total** | **809** |

### High / Critical findings

None. No packages in the dependency tree currently match a known GHSA advisory at HIGH or CRITICAL severity.

Because there are no HIGH or CRITICAL entries, the per-package table (package name, vulnerable version, CVE ID, fix version, affected path) is intentionally empty. Once `npm audit` reports such entries, each will be recorded here with:

- Package name
- Vulnerable version range
- CVE / GHSA identifier
- Patched version
- Affected dependency path (root → vulnerable package)

### Raw audit output

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    },
    "dependencies": {
      "prod": 94,
      "dev": 670,
      "optional": 111,
      "peer": 0,
      "peerOptional": 0,
      "total": 809
    }
  }
}
```

### Recommended actions

1. **Keep Dependabot daily updates enabled** for the `npm` ecosystem (see `.github/dependabot.yml`). Minor + patch are grouped; majors land as individual PRs for isolated review.
2. **Enforce `npm audit --audit-level=high`** on every PR via the `npm-audit.yml` workflow — CI must stay green before merge.
3. **Review weekly CodeQL runs** (`security-extended` + `security-and-quality` queries) under the Security tab every Monday.
4. **Re-run `npm audit` locally** before opening PRs that touch `package.json` or `package-lock.json`.
5. **Monthly re-scan**: next scheduled review is **2026-05-16**. Update this document with the new date and any findings.
6. **Supply-chain hygiene**: prefer packages with active maintenance and provenance-signed releases (`npm --provenance`) when possible.

### Methodology notes

- `npm audit` consults the npm advisory database (GHSA-backed) and reports both direct and transitive vulnerabilities.
- Results reflect the state of `package-lock.json` at scan time and may change as upstream advisories are published.
- Absence of findings does **not** imply absence of vulnerabilities — only that none are currently known to the public advisory database.
