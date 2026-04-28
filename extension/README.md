# Dubtube Chrome 확장

YouTube Studio에서 다국어 더빙 오디오를 자동 업로드하는 Chrome 확장(Manifest V3).

## 개발 환경 세팅

```bash
cd extension
npm install
```

**요구 사항**: Node.js 20+, npm 10+

## 빌드

```bash
npm run build
```

빌드 결과물은 `extension/dist/` 폴더에 생성됩니다.

## Chrome에서 로드

1. `chrome://extensions` 페이지 열기
2. 우측 상단 **개발자 모드** 활성화
3. **압축 해제된 확장 프로그램을 로드합니다** 클릭
4. `extension/dist` 폴더 선택
5. 확장 ID 확인 → 웹앱의 `.env`에 `NEXT_PUBLIC_EXTENSION_ID=<ID>` 설정

## 개발 모드

```bash
npm run dev
```

파일 변경 시 자동 빌드됩니다. Chrome에서 확장을 새로고침(리로드)하면 변경 반영.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run build` | 프로덕션 빌드 |
| `npm run dev` | 감시 모드 빌드 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run lint` | ESLint 검사 |
| `npm test` | Vitest 테스트 실행 |

## 프로젝트 구조

```
extension/
├── manifest.json          # MV3 매니페스트
├── vite.config.ts         # Vite 멀티 엔트리 빌드
├── tsconfig.json
├── eslint.config.mjs
├── src/
│   ├── background.ts      # 서비스 워커 — 메시지 라우팅, 탭 관리
│   ├── background-types.ts # Job 인터페이스, storage key
│   ├── background-utils.ts # 순수 유틸 (jobId 생성, URL 빌드)
│   ├── content.ts          # YouTube Studio content script
│   ├── messages.ts         # 웹앱↔확장 메시지 타입 + 타입 가드
│   ├── selectors.ts        # YouTube Studio DOM 셀렉터 카탈로그
│   ├── upload-steps.ts     # 업로드 단계 함수 (DomHelper 추상화)
│   ├── dom-utils.ts        # waitForElement, sleep
│   ├── file-inject.ts      # DataTransfer 기반 파일 주입
│   ├── retry.ts            # withRetry 지수 백오프
│   ├── settings.ts         # 모드 설정 (auto/assisted)
│   ├── popup/
│   │   ├── index.html      # 팝업 UI
│   │   └── main.ts         # 팝업 로직
│   └── *.test.ts           # 단위 테스트
├── dist/                   # 빌드 결과물 (gitignore)
└── scripts/
    └── postbuild.js        # manifest + icons 복사
```

## 디버깅

### 서비스 워커 (background)
1. `chrome://extensions`에서 확장의 **서비스 워커** 링크 클릭
2. DevTools Console에서 `[Dubtube]` 로그 확인

### Content Script
1. YouTube Studio 페이지에서 DevTools 열기
2. Console에서 `[Dubtube]` 로그 확인

### Popup
1. 확장 아이콘 우클릭 → **팝업 검사**
2. DevTools에서 UI 상태 확인

### 메시지 흐름 확인
웹앱 Console에서 확장 통신 테스트:
```js
chrome.runtime.sendMessage('EXTENSION_ID', { type: 'PING' }, console.log)
```

## 업로드 모드

- **assisted** (기본): 오디오 파일 주입까지만 자동. 게시는 사용자가 수동.
- **auto**: 게시까지 모두 자동. 팝업에서 토글 변경 가능.

## 셀렉터 검증

YouTube Studio DOM 셀렉터는 추정값입니다. 실제 검증은 `docs/SELECTORS_TO_VERIFY.md` 체크리스트를 참조하세요.
