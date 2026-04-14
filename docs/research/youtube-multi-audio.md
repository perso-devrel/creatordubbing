# YouTube 다중 오디오 트랙 기술 조사

> 작성일: 2026-04-10 | BACKLOG P2-1

## 질문

단일 YouTube 영상에 여러 언어의 오디오 트랙을 API로 첨부할 수 있는가?

## 결론 (TL;DR)

**YouTube Data API v3는 다중 오디오 트랙 업로드를 지원하지 않는다.**

YouTube는 2024년부터 크리에이터 스튜디오 UI에서 "대체 오디오 트랙(Alternative Audio Tracks)" 기능을 제공하지만, 이에 대응하는 공개 REST API 엔드포인트는 존재하지 않는다. 따라서 현재 프로젝트에서 API만으로 다중 오디오 트랙을 자동 삽입하는 것은 불가능하다.

## 상세 조사

### 1. YouTube Studio의 다중 오디오 트랙 기능

- 2023년 9월 YouTube가 "Multi-language audio" 기능을 발표.
- 2024년 2월 전체 크리에이터에게 확대 적용.
- YouTube Studio → 영상 편집 → "오디오" 탭에서 언어별 오디오 파일(.mp3, .aac, .wav 등)을 수동 업로드.
- 시청자는 재생 중 기어 아이콘 → "오디오 트랙"에서 언어 전환 가능.
- 제한사항: 원본 영상의 오디오를 대체하는 것이 아니라 추가 트랙으로 삽입됨.

### 2. YouTube Data API v3 지원 현황

| API Resource | 다중 오디오 관련 필드 | 지원 여부 |
|---|---|---|
| `videos.insert` | `snippet.defaultAudioLanguage` | 단일 값만 — 기본 오디오 언어 메타데이터 |
| `videos.update` | `snippet.defaultAudioLanguage` | 변경 가능하지만 오디오 파일과 무관 |
| `captions.insert` | `snippet.language`, `snippet.audioTrackType` | **자막(텍스트) 전용** — 오디오 파일 아님 |
| `captions.list` | `audioTrackType` enum | `commentary`, `descriptive`, `primary`, `unknown` — 자막 종류 구분용 |
| 오디오 트랙 전용 리소스 | — | **존재하지 않음** |

- `captions` 리소스의 `audioTrackType`은 "이 자막이 어떤 오디오 트랙에 대응하는지" 메타데이터일 뿐, 오디오 파일 업로드와 무관.
- YouTube Data API v3 공식 참조문서에 오디오 트랙(audio track) 업로드/관리 엔드포인트는 없음.
- YouTube Content ID API (Partner API)에는 `audioTracks` 관련 기능이 있으나 MCN/파트너 계정 전용이며 일반 OAuth 접근 불가.

### 3. 대안 평가

| 대안 | 실현 가능성 | 장점 | 단점 |
|---|---|---|---|
| **A. 언어별 별도 영상 업로드 (현재 방식)** | ✅ 즉시 가능 | API 완전 지원, 구현 완료 | 영상 중복, 시청자 분산, SEO 분리 |
| **B. 자막(Caption) 트랙만 추가** | ✅ 즉시 가능 | API 지원, 이미 구현됨 | 음성이 아닌 텍스트만 — 더빙 취지와 불일치 |
| **C. YouTube Studio 수동 업로드 안내** | ✅ 가능 | 진정한 다중 오디오 | 자동화 불가, UX 마찰 |
| **D. Selenium/Puppeteer로 Studio UI 자동화** | ⚠️ 기술적 가능 | 자동화 달성 | Google ToS 위반 위험, 깨지기 쉬움, 유지보수 불가 |
| **E. YouTube Content ID API** | ❌ 불가 | 공식 API | MCN/파트너 전용, 일반 계정 접근 불가 |
| **F. API 지원 대기** | — | 장기적 최선 | 시기 불명 |

### 4. 권장 방향

**단기 (현재 iteration에서 적용):**

1. **현재 방식 유지** — 언어별 별도 영상 업로드 (A).
2. 업로드 완료 후 **Studio 다중 오디오 업로드 안내 메시지** 표시 (C 보조).
   - "YouTube Studio에서 이 영상에 더빙 오디오를 추가 트랙으로 등록할 수 있습니다."
   - 영상 편집 직링크: `https://studio.youtube.com/video/{videoId}/edit`

**중기 (API 변경 감시):**

3. YouTube Data API 변경 로그를 주기적으로 확인.
   - 감시 대상: `videos` 리소스에 `audioTracks` part 추가 여부.
   - 감시 URL: YouTube API revision history.
4. API 지원이 추가되면:
   - 더빙 완료 → 원본 영상에 오디오 트랙 첨부 (별도 영상 업로드 불필요).
   - OAuth 스코프에 해당 권한 추가 필요할 수 있음.

## 현재 프로젝트 영향

- `src/lib/youtube/server.ts`: 변경 불필요. `uploadVideoToYouTube`는 현재 방식(영상별 업로드) 유지.
- `src/features/dubbing/components/steps/UploadStep.tsx`: Studio 안내 메시지 추가 가능 (선택).
- OAuth 스코프(`src/lib/firebase.ts`): 변경 불필요.
- DB 스키마: 변경 불필요 — 현재 `youtube_uploads` 테이블이 영상별 레코드를 이미 관리.

## 참고

- YouTube Help: "Add audio in another language to your video" (YouTube Studio 기능 설명)
- YouTube Data API v3 Reference: Videos, Captions 리소스
- YouTube Blog (2023-09): "Multi-language audio on YouTube"
