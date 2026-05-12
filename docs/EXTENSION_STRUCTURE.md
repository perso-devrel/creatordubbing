# Chrome 확장 폴더 구조 결정 — 2026-04-21

## 비교

| 기준 | A: 단일 `/extension` | B: `/apps` + `/packages/shared` 모노레포 |
|---|---|---|
| 초기 구축 비용 | 낮음 — 폴더 1개 추가 | 높음 — 루트 구조 재편, pnpm/turborepo 도입 |
| 코드 공유 | `import` 상대 경로 또는 path alias | `@packages/shared` 패키지 import |
| 빌드 독립성 | 별도 Vite 설정 (`extension/vite.config.ts`) | 완전 독립 (각 app별 빌드) |
| CI 영향 | 기존 CI 변경 불필요 (extension은 별도 빌드) | 모노레포 도구 설정 필요 |
| 기존 웹앱 영향 | 없음 — 루트 구조 그대로 | 높음 — `src/` → `apps/web/src/` 이동 |
| 확장성 | 확장 1개에 적합 | 앱 3개 이상 시 유리 |
| 타입 공유 | `extension/src/shared/` 또는 심볼릭 링크 | `packages/shared` 직접 import |

## 결정

**옵션 A: 단일 `/extension` 폴더 채택**

### 근거
1. MVP 단계에서 모노레포 도입은 과도한 초기 비용
2. 웹앱과 확장 간 공유 코드가 메시지 타입 스키마 정도로 제한적
3. 기존 웹앱 구조를 건드리지 않아 리스크 최소화
4. 향후 필요 시 모노레포로 전환 가능 (역방향 전환 비용 낮음)

### 채택 구조

```
dubtube/
├── extension/           ← 신규
│   ├── src/
│   │   ├── background.ts
│   │   ├── content.ts
│   │   ├── popup/
│   │   ├── messages.ts
│   │   └── selectors.ts
│   ├── public/
│   │   └── icons/
│   ├── manifest.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── src/                 ← 기존 웹앱 (변경 없음)
├── package.json         ← 기존 루트 (변경 없음)
└── ...
```

### 코드 공유 전략
- 메시지 타입은 `extension/src/messages.ts`에 정의
- 웹앱에서 확장으로 메시지 전송 시 `chrome.runtime.sendMessage` 사용 (타입은 별도 복사 또는 빌드 시 공유)
- 공유 필요성이 커지면 그때 `packages/shared` 분리 검토

---

*Chrome 확장 도입 시점에 확정된 폴더 구조 결정 기록(ADR)이며, 이후 확장 관련 작업은 이 구조를 따른다.*
