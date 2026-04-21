# YouTube Studio 셀렉터 수동 검증 체크리스트

> 이 문서의 셀렉터는 공개 커뮤니티 레퍼런스 기반 **추정값**입니다.
> 실제 YouTube Studio DOM은 수시로 변경되므로, 아래 체크리스트를 직접 검증해야 합니다.
>
> **검증 방법**: YouTube Studio (`studio.youtube.com/video/{id}/translations`)에서
> 브라우저 DevTools를 열고 각 셀렉터를 `document.querySelector()`로 테스트합니다.

---

## 검증 대상 (extension/src/selectors.ts)

### 1. 번역 페이지 진입 확인 (`TRANSLATIONS_PAGE_INDICATOR`)
- [ ] `#translations-section`
- [ ] `ytcp-translations-section`
- [ ] `[page-subtype="translations"]`
- **기대**: 번역 페이지 로드 시 존재하는 고유 요소

### 2. "언어 추가" 버튼 (`ADD_LANGUAGE_BUTTON`)
- [ ] `ytcp-button#add-translations-button`
- [ ] `button[aria-label="언어 추가"]`
- [ ] `tp-yt-paper-button#add-translations-button`
- **기대**: 클릭하면 언어 선택 드롭다운/다이얼로그 열림

### 3. 언어 검색 입력 (`LANGUAGE_SEARCH_INPUT`)
- [ ] `ytcp-text-menu iron-input input`
- [ ] `#search-input input`
- [ ] `input[aria-label="언어 검색"]`
- **기대**: 언어 추가 드롭다운 내 검색 필드

### 4. 언어 목록 항목 (`LANGUAGE_LIST_ITEM`)
- [ ] `tp-yt-paper-item.language-item`
- [ ] `ytcp-text-menu tp-yt-paper-item`
- [ ] `.language-list-item`
- **기대**: 특정 언어 클릭 시 해당 언어 선택됨. `textContent`에 언어 이름 포함.

### 5. 오디오 추가 버튼 (`AUDIO_ADD_BUTTON`)
- [ ] `ytcp-button#add-audio-button`
- [ ] `button[aria-label="오디오 추가"]`
- [ ] `#dub-add-button`
- **기대**: 선택한 언어의 오디오/더빙 트랙 추가 영역

### 6. 오디오 업로드 옵션 (`AUDIO_UPLOAD_OPTION`)
- [ ] `tp-yt-paper-item[test-id="upload-audio"]`
- [ ] `tp-yt-paper-item:has(yt-icon[icon="upload"])`
- [ ] `.upload-audio-option`
- **기대**: 오디오 추가 메뉴에서 "파일 업로드" 옵션

### 7. 파일 입력 (`FILE_INPUT`)
- [ ] `input[type="file"][accept="audio/*"]`
- [ ] `input[type="file"][accept=".mp3,.wav,.flac,.aac,.ogg"]`
- [ ] `#file-input input[type="file"]`
- **기대**: 숨겨진 `<input type="file">` — DataTransfer로 파일 주입 가능

### 8. 게시 버튼 (`PUBLISH_BUTTON`)
- [ ] `ytcp-button#publish-button`
- [ ] `button[aria-label="게시"]`
- [ ] `#publish-button tp-yt-paper-button`
- **기대**: 오디오 업로드 완료 후 활성화되는 게시 버튼

### 9. 저장 버튼 (`SAVE_BUTTON`)
- [ ] `ytcp-button#save-button`
- [ ] `button[aria-label="저장"]`
- [ ] `#save-button tp-yt-paper-button`
- **기대**: 게시 대신 저장(임시저장)만 할 때 사용

### 10. 업로드 진행 표시 (`UPLOAD_PROGRESS_BAR`)
- [ ] `ytcp-uploads-progress-bar`
- [ ] `.upload-progress`
- [ ] `tp-yt-paper-progress`
- **기대**: 파일 업로드 중 진행률 표시 요소

### 11. 성공 토스트 (`SUCCESS_TOAST`)
- [ ] `ytcp-toast[type="success"]`
- [ ] `#toast-container tp-yt-paper-toast`
- [ ] `.success-message`
- **기대**: 게시 성공 후 표시되는 확인 토스트

---

## 검증 결과 기록

| 셀렉터 이름 | 동작하는 후보 | 검증일 | 비고 |
|---|---|---|---|
| TRANSLATIONS_PAGE_INDICATOR | | | |
| ADD_LANGUAGE_BUTTON | | | |
| LANGUAGE_SEARCH_INPUT | | | |
| LANGUAGE_LIST_ITEM | | | |
| AUDIO_ADD_BUTTON | | | |
| AUDIO_UPLOAD_OPTION | | | |
| FILE_INPUT | | | |
| PUBLISH_BUTTON | | | |
| SAVE_BUTTON | | | |
| UPLOAD_PROGRESS_BAR | | | |
| SUCCESS_TOAST | | | |

> **주의**: YouTube Studio는 A/B 테스트로 사용자마다 DOM이 다를 수 있습니다.
> 여러 계정/브라우저에서 교차 검증을 권장합니다.
