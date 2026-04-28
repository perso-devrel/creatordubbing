# QA 체크리스트

> `develop_loop` 브랜치의 산출물을 `develop`에 머지하기 전 수동 QA 가이드.

---

## Phase 1 — 웹앱 QA

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

### 보안
- [ ] `.env` 파일이 git에 추적되지 않음
- [ ] `docs/SECURITY_SWEEP.md` 검토

---

## Phase 2 — Chrome 확장 스캐폴드

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

## Phase 3 — 업로드 로직

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

## Phase 4 — 웹앱↔확장 통합

### 확장 감지
- [ ] 웹앱에서 확장 미설치 시 "Dubtube 확장 미설치" 안내 표시
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

## Phase 5 — 문서

### 문서 존재 확인
- [ ] `extension/README.md` 존재 + 내용 정확
- [ ] `README.md`에 확장 설명 + mermaid 다이어그램 존재
- [ ] `docs/QA_CHECKLIST.md` (이 문서) 존재
- [ ] `docs/SELECTORS_TO_VERIFY.md` 존재
- [ ] `docs/SECURITY_SWEEP.md` 존재
- [ ] `docs/DIAGNOSIS.md` 존재
- [ ] `CHANGELOG.md` 존재 + `develop_loop` 변경점 포함
- [ ] `PROGRESS.md` 최종 상태 업데이트됨

---

## 전체 회귀 테스트

- [ ] 웹앱 `npm test` 전체 통과
- [ ] 확장 `npm test` 전체 통과
- [ ] 웹앱 `npm run build` 성공
- [ ] 확장 `npm run build` 성공
- [ ] `git status` clean (미커밋 파일 없음)
