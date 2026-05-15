# sub2tube Chrome Extension

sub2tube에서 생성한 더빙 오디오를 YouTube Studio에 업로드하는 Chrome 확장 프로그램입니다. 기본 도움 모드는 파일 추가까지만 진행하고, 자동 모드는 파일 추가 후 게시까지 진행합니다.

## Requirements

- Node.js 20+
- npm 10+

## Setup

```bash
cd extension
npm install
```

## Build

```bash
npm run build
```

빌드 결과는 `extension/dist/`에 생성됩니다. Chrome에 등록하거나 로컬에서 로드할 때는 이 폴더를 선택합니다.

## Load In Chrome

1. Chrome에서 `chrome://extensions`를 엽니다.
2. 오른쪽 위의 개발자 모드를 켭니다.
3. 압축해제된 확장 프로그램 로드를 선택합니다.
4. `extension/dist` 폴더를 선택합니다.
5. 표시된 확장 프로그램 ID를 웹앱 환경 변수 `NEXT_PUBLIC_EXTENSION_ID`에 설정합니다.

## Development

```bash
npm run dev
```

파일 변경 시 빌드가 다시 실행됩니다. Chrome 확장 프로그램 화면에서 새로고침하면 변경 사항을 확인할 수 있습니다.

## Scripts

| Command | Description |
| --- | --- |
| `npm run build` | 프로덕션 빌드 후 manifest와 아이콘을 `dist`에 복사합니다. |
| `npm run dev` | Vite watch 빌드를 실행합니다. |
| `npm run typecheck` | TypeScript 타입 검사를 실행합니다. |
| `npm run lint` | ESLint 검사를 실행합니다. |
| `npm test` | Vitest 단위 테스트를 실행합니다. |

## Upload Modes

- Assisted: 파일 추가까지만 진행합니다. YouTube Studio에서 사용자가 직접 확인하고 게시합니다.
- Auto: 파일 추가 후 게시까지 진행합니다.

## Structure

```text
extension/
├── manifest.json
├── public/icons/
├── scripts/postbuild.js
├── src/
│   ├── background.ts
│   ├── content.ts
│   ├── messages.ts
│   ├── settings.ts
│   ├── upload-steps.ts
│   └── popup/
│       ├── index.html
│       ├── labels.ts
│       └── main.ts
└── vite.config.ts
```

## Debugging

- Background service worker: `chrome://extensions`에서 sub2tube 확장 프로그램의 서비스 워커 링크를 엽니다.
- Content script: YouTube Studio 탭의 DevTools Console에서 `[sub2tube]` 로그를 확인합니다.
- Popup: 확장 프로그램 아이콘을 오른쪽 클릭한 뒤 팝업 검사를 선택합니다.

웹앱 콘솔에서 연결 상태를 확인할 때는 확장 프로그램 ID를 넣어 아래 메시지를 보냅니다.

```js
chrome.runtime.sendMessage('EXTENSION_ID', { type: 'PING' }, console.log)
```
