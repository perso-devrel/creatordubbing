# QA 체크리스트

> 웹앱 + Chrome 확장 전체에 대한 수동 QA 가이드입니다. 릴리즈 전 또는 큰 변경 머지 전에 사용하세요.

---

## 1. 웹앱 QA

### 빌드 & 린트
- [ ] `npm install` 성공
- [ ] `npx tsc --noEmit` 에러 0
- [ ] `npm run lint` 에러 0
- [ ] `npm run build` 성공
- [ ] `npm test` 전체 통과

### 기능 확인
- [ ] `npm run dev` 후 `http://localhost:3000` 접속 가능
- [ ] 더빙 위저드 5단계 진행 가능 (UI만 — perso.ai 호출 없이)
- [ ] 대시보드 페이지 로드
- [ ] 로그인/로그아웃 흐름

### 자막 언어 비활성화 (PR #355)
- [ ] 내 채널 영상 중 자막이 2개 이상 있는 영상을 선택했을 때 LanguageSelectStep에서 해당 언어 버튼이 회색 + cursor-not-allowed + "기존 자막" 배지로 표시
- [ ] 상단에 "이미 자막이 있는 N개 언어는 선택할 수 없습니다" 노란 배너 노출
- [ ] 영상을 다른 영상으로 다시 골라도 이전 영상 자막 목록이 남지 않음 (자동 리셋)
- [ ] 자막이 하나도 없는 영상은 모든 언어 활성
- [ ] URL/Upload 탭으로 가져온 영상은 비활성화 영향 없음

### 새 로고/브랜드 자산 (PR #353)
- [ ] 브라우저 탭 favicon이 새 디자인 (오렌지 그라데이션 + 흰 원 안 빨간 재생 + 자막 막대) 으로 표시
- [ ] LandingNavBar / LandingFooter / Sidebar 좌상단 로고가 `/logo.png` 로 노출
- [ ] OG preview (`/opengraph-image`) 새 컬러로 렌더
- [ ] `/manifest.webmanifest` 응답 icons 배열에 120/192/512 PNG 포함
- [ ] 다크/라이트 모드 양쪽에서 로고 깨짐 없음

### 보안
- [ ] `.env` 파일이 git에 추적되지 않음
- [ ] `docs/SECURITY_SWEEP.md` 검토

---

## 2. Chrome 확장 스캐폴드

### 빌드
- [ ] `cd extension && npm install` 성공
- [ ] `npm run build` → `extension/dist/` 생성
- [ ] `npm run typecheck` 에러 0
- [ ] `npm run lint` 에러 0
- [ ] `npm test` 전체 통과

### Chrome 로드
- [ ] `chrome://extensions` → 개발자 모드 → `extension/dist` 로드 성공
- [ ] 확장 아이콘 표시됨
- [ ] 팝업 클릭 시 UI 표시 (버전, 상태)

### Manifest 확인
- [ ] `manifest.json`의 `externally_connectable`에 `localhost:3000` 포함
- [ ] permissions: `activeTab`, `storage`, `tabs`
- [ ] content_scripts: `studio.youtube.com/*` 매칭

---

## 3. 업로드 로직

### 셀렉터
- [ ] `docs/SELECTORS_TO_VERIFY.md` 체크리스트 검증 (YouTube Studio DevTools)
- [ ] `extension/src/selectors.ts`의 각 셀렉터 최소 1개 후보 동작 확인

### 기능 확인 (수동)
- [ ] 팝업에서 auto/assisted 모드 토글 동작
- [ ] 모드 변경 후 팝업 재열기 시 설정 유지됨

### 코드 검토
- [ ] `upload-steps.ts` — 각 단계 함수가 올바른 셀렉터 사용
- [ ] `file-inject.ts` — DataTransfer 방식 확인
- [ ] `retry.ts` — 3회 재시도 + 지수 백오프

---

## 4. 웹앱↔확장 통합

### 확장 감지
- [ ] 웹앱에서 확장 미설치 시 "sub2tube 확장 미설치" 안내 표시
- [ ] "설치 가이드" 버튼 동작
- [ ] "다시 감지" 버튼 → 확장 설치 후 감지됨
- [ ] 확장 설치 시 "연결됨 vX.Y.Z" 표시

### 업로드 버튼
- [ ] UploadStep의 Multi-Audio 섹션에 확장 업로드 버튼 표시
- [ ] YouTube URL이 아닌 경우 확장 업로드 버튼 미표시

### 진행률 (확장 설치 후)
- [ ] 업로드 시작 시 로딩 스피너 표시
- [ ] 진행 단계 텍스트 업데이트

### 실패 복구
- [ ] 오류 발생 시 "재시도", "오디오", "Studio" 버튼 3개 표시
- [ ] "오디오" 버튼 → 오디오 파일 다운로드
- [ ] "Studio" 버튼 → YouTube Studio 번역 페이지 열림
- [ ] 수동 업로드 안내 배너 표시

---

## 5. 문서

### 문서 존재 확인
- [ ] `extension/README.md` 존재 + 내용 정확
- [ ] `README.md`에 확장 설명 + mermaid 다이어그램 존재
- [ ] `docs/QA_CHECKLIST.md` (이 문서) 존재
- [ ] `docs/SELECTORS_TO_VERIFY.md` 존재
- [ ] `docs/SECURITY_SWEEP.md` 존재
- [ ] `CHANGELOG.md` 최신 변경점 반영

---

## 전체 회귀 테스트

- [ ] 웹앱 `npm test` 전체 통과
- [ ] 확장 `npm test` 전체 통과
- [ ] 웹앱 `npm run build` 성공
- [ ] 확장 `npm run build` 성공
- [ ] `git status` clean (미커밋 파일 없음)
