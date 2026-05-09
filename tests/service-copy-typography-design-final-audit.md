# Dubtube 전체 문구·타이포·디자인·기능 명세 점검

## 적용 메모

이번 반영에서는 아래 항목을 코드에 적용했다.

- 폰트: 한국어는 `Pretendard`를 번들 의존성으로 고정하고, 영어·숫자 UI는 `Geist Sans`, 코드·오류 코드는 `Geist Mono`를 사용하도록 정리했다.
- 자간: 전역 `letter-spacing`을 `0` 기준으로 맞추고, 마케팅식 `tracking-tight`, 과한 대문자 자간, 모바일 버튼 줄바꿈 위험 요소를 줄였다.
- 디자인: red/pink gradient, 큰 radius, 강한 shadow 중심의 AI스러운 장식을 줄이고 YouTube 작업 도구에 맞는 neutral studio palette와 solid CTA로 정리했다.
- 문구: “34개 언어”, “전 세계 시청자”, “원래 목소리”가 한 화면에서 반복되는 구조를 줄이고, 사용자 행동 중심의 짧은 문장으로 바꿨다.
- i18n: 화면에 남아 있던 주요 한국어/영어 문구를 `useLocaleText` 패턴에 맞춰 정리하고, 오류 문구는 사용자에게 보여도 되는 수준으로 완화했다.
- YouTube 토큰: 클라이언트 raw access token을 `/api/auth/sync`나 YouTube API 라우트에서 받지 않고, 서명된 앱 세션과 DB에 암호화 저장된 토큰만 사용하도록 바꿨다.
- YouTube 정책: 연결 해제 API를 추가해 Google token revoke와 DB 토큰 삭제를 수행하고, OAuth callback의 `redirectUri`는 현재 서비스 origin의 `/auth/callback`만 허용하도록 제한했다.
- 보호 라우트: Next 16 기준 `proxy.ts`로 `/metadata`까지 로그인 보호 범위에 포함했다.

작성일: 2026-05-10  
범위: `src/app`, `src/components`, `src/features`, `src/lib`, `extension`의 사용자가 볼 수 있는 페이지, 버튼, 모달, 토스트, 빈 상태, 오류 문구, 확장 프로그램 팝업/진행 문구  
목표: 현재 기능은 유지하고, 실서비스에서 유튜버와 일반 사용자가 보기에 자연스러운 카피와 디자인 방향을 확정한다.

## 1. 결론

현재 Dubtube는 기능 범위가 충분히 서비스답지만, 화면의 첫인상은 "크리에이터용 작업 도구"보다 "AI 랜딩 템플릿"에 가깝다. 이유는 세 가지다.

1. 같은 의미의 문구가 반복된다. 특히 랜딩에서 `34개 언어`, `더빙`, `전 세계 시청자`, `원래 목소리`가 히어로, 통계, 기능, CTA에서 거의 같은 톤으로 반복된다.
2. 한국어에 맞지 않는 자간/대문자 스타일이 있다. `tracking-tight`, `uppercase tracking-wider`, 넓은 CTA의 `whitespace-nowrap` 조합은 한국어에서 답답하거나 깨질 가능성이 있다.
3. 시각 스타일이 과하다. red/pink gradient, 큰 radius, 큰 shadow, gradient text, radial overlay가 너무 반복되어 실제 YouTube 작업 도구보다 AI 생성 랜딩처럼 보인다.

가장 중요한 수정 방향은 다음이다.

- 랜딩은 "영상 하나를 여러 언어로 배포하는 작업 흐름"을 보여줘야 한다. 문구는 감성보다 실제 사용 결과 중심으로 줄인다.
- 앱 내부는 YouTube Studio와 편집 도구 계열에 맞게 조용하고 밀도 있는 작업 UI로 바꾼다.
- 한국어 글자 간격은 기본 `letter-spacing: 0`을 원칙으로 한다.
- 라이트/다크 모드는 색이 확실히 달라야 하며, 배경만 바꾸는 수준이 아니라 카드, 보조 텍스트, CTA 대비까지 재정리해야 한다.
- i18n은 현재처럼 각 컴포넌트에 `{ ko, en }`를 두는 방식으로는 전수 관리가 어렵다. 최소한 화면 문구는 공통 dictionary로 옮기는 편이 맞다.

## 2. 참고한 외부 서비스

디자인과 카피 톤을 보기 위해 공식 페이지를 기준으로 확인했다.

| 서비스 | 확인한 점 | Dubtube에 적용할 판단 |
| --- | --- | --- |
| [HeyGen Video Translator](https://www.heygen.com/translate-v5) | 업로드, YouTube 링크, 언어 선택을 첫 화면에 바로 보여준다. `Translate to`처럼 행동 중심 문구가 많다. | Dubtube도 히어로에서 추상 문구보다 URL 입력, 언어 선택, 업로드 결과를 보여주는 것이 맞다. |
| [ElevenLabs Dubbing Studio](https://elevenlabs.io/dubbing-studio) | 원본 목소리, 타이밍, 감정 보존을 말하되 실제 dubbing UI 스크린샷과 편집 기능을 앞세운다. | "목소리 톤을 살린다"는 한 번만 쓰고, 이후는 결과 검토/다운로드/업로드 흐름을 보여줘야 한다. |
| [Rask AI](https://www.rask.ai/) | 비즈니스/크리에이터 모두가 이해하는 `original video`와 `translation` 비교를 반복해서 보여준다. | Dubtube도 원본 영상, 대상 언어, 생성 결과, YouTube 업로드 상태를 시각적으로 비교해야 한다. |
| [Kapwing AI Dubbing](https://www.kapwing.com/ai/dubbing) | `Upload video or audio. Dub it into 40+ languages.`처럼 짧고 동작이 분명하다. | 히어로 문구를 짧게 줄이고, 설명은 workflow 단위로 나누는 것이 낫다. |
| [Descript](https://www.descript.com/) | AI 기능을 말하지만 편집 도구의 생산성 톤을 유지한다. | 앱 내부는 "AI 신기함"보다 "검토하고 게시하는 작업대" 느낌이 맞다. |

## 3. 최종 디자인안

최종안 이름: **Creator Localization Studio**

핵심 방향은 "YouTube 크리에이터가 영상을 올리고, 언어를 고르고, 검토한 뒤 YouTube에 배포하는 스튜디오"다. 지금의 기능은 유지하되, 시각 언어만 더 실무 도구답게 정리한다.

### 3.1 색상

현재는 red/pink gradient가 화면 전체를 지배한다. 최종안은 중립 배경에 YouTube 계열 red를 소량만 사용하는 구조가 맞다.

| 용도 | 라이트 모드 | 다크 모드 | 사용 방식 |
| --- | --- | --- | --- |
| Page background | `#F7F8FA` | `#0F1115` | 전체 배경 |
| Surface | `#FFFFFF` | `#171A21` | 카드, 패널, 모달 |
| Elevated surface | `#FFFFFF` | `#1E232B` | 선택된 카드, dropdown |
| Border | `#E5E7EB` | `#2A2F3A` | 모든 구획선 |
| Primary text | `#111827` | `#F4F6F8` | 본문/제목 |
| Secondary text | `#4B5563` | `#AEB7C2` | 설명 |
| Muted text | `#6B7280` | `#8B95A1` | 보조 정보, 시간, 상태 |
| Primary | `#E11D48` 또는 `#E62117` | `#F43F5E` | 주요 CTA와 활성 상태만 |
| Info | `#2563EB` | `#60A5FA` | 진행/도움 정보 |
| Success | `#059669` | `#34D399` | 완료 |
| Warning | `#D97706` | `#FBBF24` | 주의 |
| Error | `#DC2626` | `#F87171` | 오류 |

변경 원칙:

- primary 버튼은 gradient를 없애고 solid color로 간다.
- 히어로 배경은 라이트와 다크가 명확히 달라야 한다. 라이트는 밝은 editor canvas, 다크는 어두운 studio canvas로 간다.
- CTA 섹션의 `text-white/80`은 대비가 낮다. 현재 계산 기준으로 brand gradient 위에서 약 2.8~3.4:1까지 떨어질 수 있다. CTA를 계속 어둡게 쓸 경우 본문은 `#FFFFFF` 또는 `#F8FAFC`로 올리고, 배경은 더 어두운 단색 계열로 정리한다.
- `text-surface-400`는 라이트 배경에서 약 2.56:1 수준이라 일반 텍스트로 쓰면 약하다. 라이트 보조 텍스트는 최소 `surface-500` 또는 `surface-600`을 쓴다.

### 3.2 타이포그래피

현재 `Inter`가 latin subset으로 들어가고, 한국어는 시스템 fallback에 의존한다. 한국어 서비스라면 폰트 스택을 한국어 기준으로 정리해야 한다.

최종 권장:

- 영어 UI, 숫자, 짧은 제품 라벨: `Geist Sans`
- 한국어 UI와 본문: `Pretendard`
- 한국어 fallback: `"Noto Sans KR"`, system-ui
- 코드, ID, 오류 코드, 로그성 텍스트: `Geist Mono` 또는 `IBM Plex Mono`

`Geist Sans`는 영어 UI와 숫자가 단정하고 제품 도구 느낌이 강하다. Inter보다 덜 흔해 보이면서도 과하게 개성적이지 않아, 현재 목표인 "AI 랜딩 템플릿 느낌 줄이기"에 맞다. 한국어 glyph는 별도 한국어 폰트로 넘기는 편이 좋다.

`Pretendard`는 한국어 UI에서 가장 무난하다. 버튼, 표, 카드, 설명문까지 폭넓게 안정적이고, YouTube 크리에이터용 SaaS처럼 실무적인 화면에 잘 맞는다.

단일 font-family로 처리할 경우:

```css
--font-sans: "Geist Sans", Pretendard, "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "Geist Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

더 정교하게 나눌 경우:

```css
:root {
  --font-latin: "Geist Sans", Inter, system-ui, sans-serif;
  --font-ko: Pretendard, "Noto Sans KR", system-ui, sans-serif;
  --font-mono: "Geist Mono", "IBM Plex Mono", ui-monospace, monospace;
}

html {
  font-family: var(--font-latin), var(--font-ko);
}

:lang(ko) {
  font-family: var(--font-ko);
}

:lang(en) {
  font-family: var(--font-latin);
}
```

역할별 대안:

| 용도 | 1순위 | 대안 | 판단 |
| --- | --- | --- | --- |
| 영어 UI/버튼/대시보드 | `Geist Sans` | `Inter` | Geist가 더 제품 도구답고, Inter는 현재 구조에서 변경 비용이 낮다. |
| 영어 마케팅 H1 | `Geist Sans` | `Manrope` | Manrope는 부드럽지만 다시 SaaS 랜딩 느낌이 날 수 있어 2순위다. |
| 한국어 UI/본문 | `Pretendard` | `"Noto Sans KR"` | Pretendard가 화면 밀도와 가독성 균형이 좋다. |
| 숫자/통계/가격 | `Geist Sans` + tabular nums | `Inter` | 숫자 정렬이 필요한 카드와 표에는 `font-variant-numeric: tabular-nums`를 쓴다. |
| 코드/오류 코드/운영 화면 | `Geist Mono` | `IBM Plex Mono` | 운영자용 로그와 support code에만 제한적으로 쓴다. |
```

적용 원칙:

- 한국어 문장에는 `tracking-tight`, `tracking-wider`를 쓰지 않는다.
- 전체 기본 letter spacing은 `0`으로 둔다.
- 히어로 H1은 `letter-spacing: 0`, `line-height: 1.08~1.14`.
- 본문은 `line-height: 1.55~1.7`.
- 버튼은 `line-height: 1.2~1.3`, 2줄 가능성이 있는 긴 버튼은 너비를 늘리거나 문구를 줄인다.
- 영어 uppercase label은 아주 짧은 시스템 라벨에만 허용한다. 한국어 문구에 `uppercase tracking-wider`는 제거한다.
- 대시보드 숫자, 가격, 퍼센트, 시간은 `tabular-nums`를 적용해 카드와 표가 흔들리지 않게 한다.
- 혼합 문장에서는 한글과 영문 사이가 어색하게 벌어지지 않도록 letter spacing을 추가하지 않는다.

### 3.3 레이아웃

랜딩:

- 첫 화면은 큰 감성 문구보다 "작업 미리보기"가 중심이어야 한다.
- 좌측 또는 중앙에는 URL 입력, 언어 선택, 작업 상태, YouTube 업로드 상태가 보이는 product preview를 배치한다.
- 히어로 문구는 짧게: "영상 하나로 여러 언어 더빙 만들기"
- 설명은 한 문장: "YouTube 링크나 파일을 넣고, 언어를 고른 뒤 더빙 영상과 제목·설명을 바로 준비하세요."
- 통계 3개는 숫자 자랑이 아니라 기능 요약으로 바꾼다.

앱 내부:

- Dashboard, Dubbing, Metadata, Uploads, Billing은 "작업 콘솔" 톤으로 통일한다.
- 카드 radius는 8px 수준으로 낮춘다.
- 카드 안의 카드 구조를 줄이고, 표/리스트/상태 row 중심으로 바꾼다.
- 큰 gradient card는 QuickStart 정도에서도 제거하고, 좁은 accent strip 또는 icon badge로 대체한다.
- 모달은 `max-height: min(720px, calc(100vh - 48px))`, `overflow-y: auto`가 필요하다.

## 4. 현재 사용자 시나리오와 기능 명세

### 4.1 비로그인 사용자

1. `/` 랜딩에 진입한다.
2. 기능, 가격, 이용 방법, CTA를 확인한다.
3. YouTube URL을 입력하면 `/dubbing?url=...`로 넘어가는 의도를 갖지만, 보호 라우트라 로그인 흐름이 필요하다.
4. `Google로 시작하기`를 누르면 Google OAuth 팝업이 열린다.
5. OAuth 성공 후 서버가 사용자/토큰을 저장하고 `dubtube_session` 쿠키를 발급한다.
6. 클라이언트는 `google_user`를 localStorage에 저장하고, 앱 진입 후 `/api/auth/sync`로 쿠키 세션과 동기화한다.

사용자 관점의 핵심 문구:

- 로그인 실패는 원인을 친절하게 알려야 한다.
- `.env.local`, `client id`, `CSRF`, `popup` 같은 개발자 표현은 사용자에게 직접 보이면 안 된다.

### 4.2 로그인 후 앱 공통

공통 앱 영역:

- 사이드바: 대시보드, 새 더빙, 제목·설명 번역, 더빙 작업, YouTube 업로드, 운영 상태, YouTube, 결제, 설정
- 상단바: 테마 전환, 사용자/채널 정보, 로그아웃
- 설정 동기화: 앱 언어, 기본 메타데이터 언어, 추천 번역 시장, YouTube 업로드 기본값

초기 점검에서 주의할 점으로 본 항목:

- `/metadata`는 사이드바에 있는 앱 화면이므로 앱 보호 라우트에 포함되어야 한다. 현재 반영에서는 Next 16 `proxy.ts` 보호 목록에 포함했다.
- `/youtube`의 `연결 해제`는 앱 로그아웃이 아니라 YouTube 토큰 revoke와 DB 토큰 삭제만 수행하도록 동작을 분리했다.

### 4.3 새 더빙 흐름

1. 영상 선택
   - YouTube URL 입력
   - 파일 업로드
   - 내 YouTube 채널 영상 선택
   - 공개 영상만 채널 목록에서 가져오고, 비공개/일부 공개는 파일 업로드 안내
   - 3분 이하 영상은 Shorts로 감지

2. 출력 모드 선택
   - 언어별 새 더빙 영상 만들기
   - 기존 영상에 자막/메타데이터 추가
   - 파일만 다운로드

3. 언어 선택
   - 인기/지역별 필터
   - 검색
   - 선택 언어 수 표시
   - 예상 필요 시간 표시
   - 현재 예상 시간은 실제 영상 길이가 아니라 선택 언어 수 × 15분이므로, 사용자가 실제 과금/처리 시간으로 오해하지 않도록 문구를 바꿔야 한다.

4. 업로드 설정
   - 제목, 설명, 태그
   - 공개 범위
   - 제목·설명 작성 언어
   - 자막 업로드
   - 원본 링크 첨부
   - 아동용 여부
   - AI 음성 사용 표시
   - 자동 업로드

5. 검토
   - 선택한 파일/URL, 언어, 업로드 설정 확인
   - 자동 업로드 시 확인 체크 필요
   - 현재 컴포넌트 이름은 `TranslationEditStep`이지만 실제 화면은 번역 편집이 아니라 검토 단계다. 사용자 문구는 괜찮지만 코드/기획 명칭은 헷갈릴 수 있다.

6. 처리
   - 작업 생성
   - 크레딧 예약
   - Perso translate 요청
   - 8초 polling 및 장기 처리 backoff
   - 언어별 완료/실패 상태 표시

7. 결과
   - 언어별 영상/오디오/SRT 다운로드
   - YouTube 업로드
   - 기존 영상에 자막/메타데이터 적용
   - 확장 프로그램을 통한 YouTube Studio assisted upload

### 4.4 제목·설명 번역 흐름

1. 새 영상 업로드 모드 또는 내 영상 불러오기 모드를 선택한다.
2. 원본 제목/설명/태그를 입력하거나 기존 YouTube 영상에서 가져온다.
3. 원본 작성 언어와 대상 언어를 선택한다.
4. 이미 번역된 언어는 선택할 수 없게 막는다.
5. Gemini 번역을 실행한다.
6. 결과를 검토한다.
7. 기존 영상에는 localizations를 적용하고, 새 영상은 업로드와 함께 메타데이터 번역을 적용한다.
8. YouTube 업로드 확인 모달에서 업로드 설정을 다시 확인한다.

주의:

- 모달 문구는 좋지만 내용이 길다. 모바일에서는 `Modal` 자체에 scroll 처리가 필요하다.
- `YouTube 업로드 확인` 모달의 버튼은 "업로드 진행"보다 "비공개로 업로드" 또는 "설정대로 업로드"가 더 행동이 정확하다.

### 4.5 결제 흐름

1. `/billing`에서 남은 더빙 시간을 확인한다.
2. 10/30/60/120분 팩 중 하나를 선택한다.
3. Toss 결제창으로 이동한다.
4. 성공 시 `/billing/success`에서 결제 승인 후 시간을 충전한다.
5. 실패 시 `/billing/fail`에서 실패 사유를 보여준다.

주의:

- "결제"만 쓰면 사용자가 무엇을 사는지 약하다. 앱 메뉴는 유지하더라도 화면 제목은 "더빙 시간 충전"이 더 낫다.
- 실패 화면의 raw `code`는 개발자에게는 유용하지만 사용자에게는 "문제가 계속되면 문의에 전달할 코드"라고 설명해야 한다.

### 4.6 작업/업로드/운영 흐름

더빙 작업:

- 진행 중/대기 중/실패/완료 상태를 확인한다.
- 진행 중인 작업 삭제 시 Perso cancel과 DB 삭제가 함께 수행된다.
- 삭제 확인 문구는 현재 의미가 분명하다.

YouTube 업로드:

- 완료됐지만 YouTube video id가 없는 결과를 모아 수동 업로드한다.
- 언어별 업로드 설정을 확인하고 업로드한다.
- 업로드 버튼이 많아지는 화면이므로 버튼 문구는 짧고 상태별로 일정해야 한다.

운영 상태:

- 운영자만 접근한다.
- upload queue, Perso 실패율, Toss webhook 실패, credit release 이벤트를 확인한다.
- 이 화면은 개발자/운영자용이므로 기술 용어가 일부 허용된다.

Chrome 확장:

- Dubtube에서 생성한 오디오 파일을 YouTube Studio에 assisted 방식으로 올린다.
- popup에서 대기, 진행 중, 완료, 오류 상태를 보여준다.
- 현재 `job.step` 같은 내부 단계 값이 그대로 보일 수 있어, 사용자용 단계명으로 매핑해야 한다.

## 5. 화면별 문구 점검과 교정안

아래 표는 현재 남아 있는 주요 문구를 화면 단위로 정리한 것이다. "삭제"는 기능 삭제가 아니라 화면에서 굳이 노출하지 않아도 되는 문장 제거를 뜻한다.

### 5.1 랜딩 공통

| 위치 | 원본 | 판단 | 제안 |
| --- | --- | --- | --- |
| SEO description | `YouTube 크리에이터를 위한 34개 언어 AI 더빙 및 업로드 도구.` | 기능은 맞지만 랜딩 본문과 반복된다. | `YouTube 영상 더빙, 제목·설명 번역, 업로드까지 한 번에 준비하는 크리에이터 현지화 도구.` |
| nav | `기능` | 유지 | `기능` |
| nav | `요금제` | 유지 | `요금` 또는 `요금제` |
| nav | `이용 방법` | 유지 | `이용 방법` |
| button | `Google로 시작하기` | 유지 가능 | `Google로 시작하기` |
| button | `대시보드` | 유지 | `대시보드` |
| toast title | `로그인 실패` | 유지 | `로그인할 수 없습니다` |
| toast message | raw error | 개발자 문구 노출 위험 | `잠시 후 다시 시도해 주세요. 팝업이 차단되어 있으면 허용한 뒤 다시 로그인해 주세요.` |

### 5.2 Hero

| 위치 | 원본 | 판단 | 제안 |
| --- | --- | --- | --- |
| badge | `YouTube 크리에이터를 위한 AI 더빙` | 무난하지만 흔한 AI 카피 | `YouTube 영상 현지화` |
| H1 1행 | `영상 하나로 34개 언어 더빙` | 숫자 강조는 좋지만 바로 아래와 반복 | `영상 하나로 여러 언어 더빙 만들기` |
| H1 2행 | `전 세계 시청자에게 전하세요` | 바로 아래 설명과 의미 중복 | 삭제 또는 `YouTube 업로드까지 한 번에` |
| subcopy | `영상을 올리고 언어를 선택하면 34개 언어 더빙을 만들 수 있습니다.` | H1과 반복 | `YouTube 링크나 파일을 넣고, 필요한 언어를 고르면 더빙 영상과 제목·설명을 함께 준비합니다.` |
| subcopy | `원래 목소리의 톤을 살려 더 많은 시청자에게 콘텐츠를 전하세요.` | 가치 제안으로 좋지만 앞뒤 반복 | `목소리 톤은 살리고, 게시 전 결과를 확인할 수 있습니다.` |
| URL placeholder | 현재 URL 입력 중심 | 유지 | `YouTube 링크를 붙여넣으세요` |
| URL button | 현재 시작 버튼 | 유지하되 짧게 | `더빙 시작` |
| stat | `34개 언어` | H1과 반복 | `지원 언어 34개` |
| stat | `YouTube 업로드` | 유지 | `YouTube 업로드 연동` |
| stat | `보이스 클론` | 일반 사용자에게 약간 기술적 | `목소리 톤 보존` |

히어로 최종 문구:

```text
YouTube 영상 현지화

영상 하나로 여러 언어 더빙 만들기
YouTube 링크나 파일을 넣고, 필요한 언어를 고르면 더빙 영상과 제목·설명을 함께 준비합니다.
목소리 톤은 살리고, 게시 전 결과를 확인할 수 있습니다.

[YouTube 링크를 붙여넣으세요] [더빙 시작]

지원 언어 34개 / YouTube 업로드 연동 / 목소리 톤 보존
```

영문 i18n:

```text
YouTube video localization

Create dubbed versions from one video
Paste a YouTube link or upload a file, choose your languages, and prepare dubbed videos with localized titles and descriptions.
Keep the tone of the original voice and review results before publishing.

[Paste a YouTube link] [Start dubbing]

34 supported languages / YouTube upload integration / Voice tone preserved
```

### 5.3 FeatureShowcase

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `언어별 더빙 영상 자동 생성` 계열 | 기능 설명은 맞지만 "자동"이 반복되면 검토 없이 게시되는 느낌이 난다. | `언어별 결과를 한 번에 생성` |
| `YouTube 업로드까지 자동화` | 업로드 설정/검토가 있으므로 "자동화"는 조심해야 한다. | `YouTube 게시 준비까지 연결` |
| `원본 목소리 톤 유지` | Hero와 중복되지만 기능 카드에서는 유지 가능 | `원본 톤에 가까운 더빙` |
| `제목·설명 번역` | 유지 | `제목·설명 현지화` |
| `성과 분석` | 실제 YouTube stats/analytics가 있으므로 유지 | `언어별 성과 확인` |
| `크레딧 기반 과금` | 사용자에게는 과금 구조 설명 필요 | `필요한 시간만 충전` |

영문 i18n:

- `Generate results for each language`
- `Prepare publishing on YouTube`
- `Dub close to the original tone`
- `Localize titles and descriptions`
- `Review performance by language`
- `Add only the minutes you need`

### 5.4 HowItWorks

| 원본 성격 | 판단 | 제안 |
| --- | --- | --- |
| `영상 업로드` | 유지 | `영상 넣기` |
| `언어 선택` | 유지 | `언어 고르기` |
| `더빙 생성` | 유지 | `결과 확인` |
| `YouTube 업로드` | 유지 | `YouTube에 게시` |
| 설명 문장 | "쉽게", "자동"이 반복될 가능성 | 실제 단계 중심으로 짧게 |

최종 문구:

1. `영상 넣기`: `YouTube 링크를 붙여넣거나 파일을 업로드합니다.`
2. `언어 고르기`: `필요한 언어를 선택하고 제목·설명 기본값을 확인합니다.`
3. `결과 확인`: `언어별 더빙, 자막, 메타데이터 결과를 검토합니다.`
4. `YouTube에 게시`: `다운로드하거나 YouTube 업로드까지 이어서 진행합니다.`

영문 i18n:

1. `Add a video`: `Paste a YouTube link or upload a file.`
2. `Choose languages`: `Select target languages and review title and description defaults.`
3. `Review results`: `Check dubbed videos, captions, and metadata for each language.`
4. `Publish to YouTube`: `Download the files or continue to YouTube upload.`

### 5.5 ROI Calculator

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `예상 추가 조회수` | 과장으로 보일 수 있음 | `참고용 예상 조회수` |
| `최대 +xx% 예상` | 수치 신뢰 근거가 약하면 위험 | `선택 언어 기준 참고치` |
| `100,000 조회수 기준` | 유지 가능하나 명확히 | `현재 월 조회수 100,000회를 기준으로 단순 계산한 값입니다.` |

영문 i18n:

- `Estimated additional views` -> `Reference estimate`
- `Up to +xx% expected` -> `Based on selected languages`
- `Calculated from 100,000 monthly views as a simple estimate.`

### 5.6 Pricing / Billing

| 위치 | 원본 | 판단 | 제안 |
| --- | --- | --- | --- |
| landing pricing heading | `간단한 사용량 기반 요금` 계열 | 유지 가능 | `필요한 더빙 시간만 충전하세요` |
| card label | `모든 플랜 포함` + uppercase tracking | 한국어에 uppercase/tracking 부적절 | `모든 충전권에 포함` |
| app menu | `결제` | 메뉴는 짧아서 유지 가능 | `결제` |
| billing page title | `결제` | 화면 제목으로는 약함 | `더빙 시간 충전` |
| description | `더빙 시간을 충전하고 결제 내역을 확인하세요.` | 자연스러움 | 유지 |
| helper | `충전한 시간은 만료 없이 사용할 수 있습니다.` | 좋음 | 유지 |
| button | `30분 충전` | 자연스러움 | 유지 |
| loading | `결제창으로 이동 중...` | 자연스러움 | `결제창을 여는 중...` |
| success | `30분이 충전되었습니다.` | 좋음 | 유지 |
| fail title | `결제가 완료되지 않았습니다` | 좋음 | 유지 |
| fail body | `결제가 취소되었거나 처리 중 문제가 발생했습니다. 다시 시도해 주세요.` | 좋음 | 유지 |
| fail code | `오류 코드: {code}` | 사용자에게 맥락 부족 | `문의 시 전달할 오류 코드: {code}` |

영문 i18n:

- `Billing` page title -> `Add dubbing minutes`
- `Opening checkout...` -> `Opening checkout...`
- `Support code: {code}`

### 5.7 Dashboard

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `더빙 현황을 확인하세요.` | 너무 넓고 밋밋함 | `최근 더빙, 업로드, 사용 시간을 확인하세요.` |
| `월별 사용 시간` | 유지 | `월별 사용 시간` |
| `더빙 언어별 조회수` | 유지 | `언어별 조회수` |
| `완료된 더빙 작업` 계열 | 유지 | `최근 완료된 더빙` |
| QuickStart gradient card | 문구보다 디자인이 과함 | 일반 패널로 변경 |
| QuickStart body | 새 더빙 시작을 안내 | `YouTube 링크를 붙여넣고 바로 새 더빙을 시작하세요.` |

영문 i18n:

- `Review recent dubbing, uploads, and minute usage.`
- `Views by language`
- `Recent completed dubs`
- `Paste a YouTube link to start a new dubbing job.`

### 5.8 Sidebar / Topbar

| 위치 | 원본 | 판단 | 제안 |
| --- | --- | --- | --- |
| sidebar | `새 더빙` | 좋음 | 유지 |
| sidebar | `제목·설명 번역` | 정확하나 길어 모바일 nowrap 위험 | desktop 유지, mobile tooltip 또는 `메타데이터` |
| sidebar | `더빙 작업` | 좋음 | 유지 |
| sidebar | `YouTube 업로드` | 좋음이나 모바일 길이 | desktop 유지, mobile icon-only |
| sidebar | `운영 상태` | 운영자용으로 적절 | 유지 |
| topbar aria | `테마 전환` | 유지 | `테마 전환` |
| topbar aria | `로그아웃` | 유지 | `로그아웃` |
| subscriber label | `구독자 1,234` | 좋음 | 유지하되 색 대비 상향 |

영문 i18n:

- `Title translation` -> `Title & description`
- `YouTube uploads` 유지

### 5.9 Dubbing page header and wizard

| 위치 | 원본 | 판단 | 제안 |
| --- | --- | --- | --- |
| page title | `새 더빙` | 유지 | `새 더빙` |
| description | `영상을 선택하고 원하는 언어로 더빙하세요.` | 자연스럽지만 약간 명령형 | `영상과 언어를 선택해 더빙 작업을 시작하세요.` |
| step Video | `Video` 또는 `영상` | 한국어 모드에서는 통일 필요 | `영상` |
| step Output | `Output` 또는 `출력` | 유지 | `출력 방식` |
| step Languages | `Languages` 또는 `언어` | 유지 | `언어` |
| step Upload | `Upload` 또는 `업로드` | 설정 단계라 모호 | `게시 설정` |
| step Review | `Review` 또는 `검토` | 유지 | `검토` |
| step Processing | `Processing` | 유지 | `처리` |
| step Results | `Results` | 유지 | `결과` |

영문 i18n:

- `Select a video and dub it into the languages you need.` -> `Choose a video and languages to start a dubbing job.`
- Step labels: `Video`, `Output`, `Languages`, `Publish settings`, `Review`, `Processing`, `Results`

### 5.10 VideoInputStep

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `YouTube URL` | 유지 | `YouTube 링크` |
| `파일 업로드` | 유지 | `파일 업로드` |
| `내 채널` | 유지 | `내 채널 영상` |
| `YouTube URL 또는 .mp4/.mov/.webm 직접 링크를 입력하세요` | 자연스럽지만 길다 | `YouTube 링크나 mp4, mov, webm 파일 링크를 입력하세요.` |
| button `가져오기` | 좋음 | 유지 |
| `공개 영상만 가져올 수 있습니다` 계열 | 기능상 필요 | `공개 영상만 바로 가져올 수 있습니다. 비공개 또는 일부 공개 영상은 파일로 업로드해 주세요.` |
| `영상이 없습니다` | 유지 | `가져올 수 있는 영상이 없습니다` |
| `YouTube 채널 정보를 불러오지 못했습니다` | 반복 문구 | 공통 오류로 통합 |

영문 i18n:

- `YouTube link`
- `Upload file`
- `My channel videos`
- `Paste a YouTube link or a direct mp4, mov, or webm file link.`
- `Only public videos can be imported directly. Upload private or unlisted videos as files.`
- `No videos available to import`

줄바꿈:

- URL input과 `가져오기` 버튼은 모바일에서 같은 줄을 강제하지 않는 것이 안전하다. `sm:flex-row`, 모바일 `flex-col` 권장.

### 5.11 OutputModeStep

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `언어별 새 더빙 영상` 계열 | 좋음 | `언어별 새 영상 만들기` |
| `기존 영상에 자막 추가` | 내부 모드명은 multiAudio인데 실제 현재 기능은 자막/메타데이터 중심이다. 사용자 문구는 현재 기능에 맞음 | `기존 영상에 자막·제목 번역 추가` |
| `파일만 다운로드` | 좋음 | 유지 |
| 비활성 안내 | 조건을 명확히 | `채널 영상 또는 업로드 파일에서 사용할 수 있습니다.` |

영문 i18n:

- `Create new videos for each language`
- `Add captions and localized metadata to an existing video`
- `Download files only`
- `Available for channel videos or uploaded files.`

### 5.12 LanguageSelectStep

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `인기`, `아시아`, `유럽`, `중동` | 유지 | 유지 |
| `예상 필요 시간` | 실제 영상 길이 기반이 아니라 오해 가능 | `예상 차감 시간` 또는 `참고 예상 시간` |
| `{n}분` | 유지 | 유지 |
| 검색 placeholder | 유지 | `언어 검색` |
| 선택 언어 badge | nowrap은 대체로 괜찮지만 긴 nativeName에서 overflow 가능 | badge max-width와 truncate 적용 |

영문 i18n:

- `Reference estimate`
- `Search languages`

### 5.13 UploadSettingsStep

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `작성 언어` | 무엇을 작성하는지 모호 | `제목·설명 작성 언어` |
| `공개 범위` | 유지 | 유지 |
| `자막 업로드` | 유지 | `자막도 업로드` |
| `원본 링크 첨부` | 유지 | `설명에 원본 링크 추가` |
| `아동용 영상` | YouTube 정책상 중요 | `아동용 콘텐츠 여부` |
| `AI 보이스 더빙 고지 추가` | 약간 기술적 | `AI 음성 사용 표시` |
| `자동 업로드` | 위험할 수 있으므로 설명 필요 | `완료 후 자동 업로드` |
| toggle value `ON/OFF` | 한국어 화면에서 어색함 | `켜짐/꺼짐` |
| toggle value `예/아니오` | 위와 불일치 | 같은 화면에서는 `켜짐/꺼짐` 또는 `예/아니오` 중 하나로 통일 |

영문 i18n:

- `Title and description language`
- `Upload captions`
- `Add original link to description`
- `Made for kids`
- `Disclose AI voice use`
- `Upload automatically when complete`
- `On/Off`

### 5.14 Review / TranslationEditStep

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `검토` | 유지 | 유지 |
| `립싱크` | 기능명은 맞음 | `립싱크` |
| `더빙 오디오에 맞춰 입 모양을 조절합니다` | 자연스러움 | 유지 |
| 자동 업로드 확인 체크 | 필요 | `설정을 확인했으며 완료 후 YouTube 업로드를 진행합니다.` |
| 컴포넌트명 `TranslationEditStep` | 사용자에게 안 보이지만 기획 혼동 | 추후 `ReviewStep`으로 변경 권장 |

영문 i18n:

- `Lip sync`
- `Adjust mouth movement to match the dubbed audio.`
- `I reviewed the settings and want to upload to YouTube when complete.`

### 5.15 ProcessingStep

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `처리 중` | 유지 | 유지 |
| `대기 중`, `진행 중`, `완료`, `실패` | 유지 | 유지 |
| `오래 걸릴 수 있습니다` 계열 | 있으면 필요 | `영상 길이와 언어 수에 따라 시간이 걸릴 수 있습니다.` |
| `%` 표시 | 유지 | 유지 |

영문 i18n:

- `Processing`
- `Queued`, `Processing`, `Complete`, `Failed`
- `Processing time depends on video length and the number of languages.`

### 5.16 Results / UploadStep

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `다운로드` | 유지 | 유지 |
| `영상 다운로드` | 유지 | `영상` 버튼 옆 아이콘이면 `영상`만 가능 |
| `음성 다운로드` | 유지 | `음성` |
| `자막 다운로드` | 유지 | `자막` |
| `YouTube에 업로드` | 유지 | `YouTube 업로드` |
| `YouTube Studio에서 열기` | 유지 | 유지 |
| `원본 영상을 업로드하는 중...` | 자연스러움 | `원본 영상을 업로드하는 중...` |
| 여러 버튼 `whitespace-nowrap` | 모바일 overflow 위험 | 버튼 grid 또는 wrapping 허용 |

영문 i18n:

- `Video`
- `Audio`
- `Captions`
- `Upload to YouTube`
- `Open in YouTube Studio`
- `Uploading original video...`

### 5.17 Metadata page and modal

| 위치 | 원본 | 판단 | 제안 |
| --- | --- | --- | --- |
| page title | `YouTube 제목·설명 번역` | 정확 | 유지 |
| page description | `YouTube 제목과 설명만 여러 언어로 번역합니다.` | "만"이 기능을 좁게 보이게 함 | `YouTube 제목과 설명을 여러 언어로 현지화합니다.` |
| tab | `새 영상 올리기` | 유지 | 유지 |
| tab | `내 영상 불러오기` | 유지 | 유지 |
| helper | `내 채널 영상의 제목·설명과 기존 번역을 불러옵니다. 이미 번역된 언어는 선택할 수 없습니다.` | 좋음 | 유지 |
| helper | `업로드 시 비공개로 업로드됩니다. 검토 후 YouTube Studio에서 공개로 전환하세요.` | 좋음 | 유지 |
| modal title | `YouTube 업로드 확인` | 유지 | `YouTube 업로드 설정 확인` |
| confirm checkbox | `위 설정을 확인했으며 업로드를 진행합니다.` | 자연스럽지만 조금 딱딱 | `설정을 확인했으며 YouTube에 업로드합니다.` |
| modal button | `업로드 진행` 계열 | 더 구체적으로 | `설정대로 업로드` |

영문 i18n:

- `Localize YouTube titles and descriptions into multiple languages.`
- `Upload new video`
- `Import my video`
- `This imports the title, description, and existing translations from your channel video. Languages that are already translated cannot be selected.`
- `New uploads are uploaded as private. Review them in YouTube Studio before making them public.`
- `Review YouTube upload settings`
- `I reviewed the settings and want to upload to YouTube.`
- `Upload with these settings`

### 5.18 YouTube page

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `YouTube 채널 연결과 업로드 기본값을 관리하세요.` | 좋음 | 유지 |
| `연결 해제` | 단독으로는 앱 로그아웃인지 YouTube 연결 해제인지 모호 | `YouTube 연결 해제` |
| `최근 영상` | 유지 | 유지 |
| `영상이 없습니다` | 유지 | `표시할 영상이 없습니다` |
| `Dub this video` | 영어 그대로면 한국어 모드에서 튐 | `이 영상 더빙` |

영문 i18n:

- `Manage your YouTube channel connection and upload defaults.`
- `Sign out and disconnect`
- `No videos to show`
- `Dub this video`

### 5.19 Batch page

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `더빙 작업` | 유지 | 유지 |
| `여러 더빙 작업의 진행 상태를 확인하세요.` | 자연스럽지만 반복 | `진행 중인 더빙 작업을 확인하세요.` |
| `진행 중인 작업이 없습니다` | 유지 | 유지 |
| `새 더빙을 시작하면 진행 상태가 여기에 표시됩니다.` | 유지 | 유지 |
| `영상 추가` | 유지 | `새 더빙`과 통일 가능 |
| `이 더빙 작업을 삭제할까요? 진행 중인 작업도 함께 취소됩니다.` | 좋음 | 유지 |
| button `작업 삭제` | 유지 | `삭제` 또는 `작업 삭제` |

영문 i18n:

- `Review active dubbing jobs.`
- `No active jobs`
- `New dubbing jobs will appear here.`
- `Delete this dubbing job? Active processing will also be cancelled.`

### 5.20 Uploads page

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `더빙이 끝난 영상을 YouTube에 올리세요.` | 자연스럽지만 약간 구어체 | `완료된 더빙 결과를 YouTube에 업로드하세요.` |
| `더빙이 완료된 영상이 여기에 표시됩니다.` | 유지 | 유지 |
| `{n}개 언어` badge | 유지 | 유지 |
| upload modal text | 긴 설정이면 모바일 overflow 위험 | 모달 max-height 필요 |
| button | `업로드` | 유지 | `업로드` |

영문 i18n:

- `Upload completed dubbing results to YouTube.`
- `Completed dubbed videos will appear here.`

### 5.21 Settings page

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `설정` | 유지 | 유지 |
| `화면 언어와 YouTube 기본값을 관리하세요.` | 좋음 | 유지 |
| `언어 및 YouTube 기본값` | 유지 | 유지 |
| `화면 언어와 제목·설명 번역 기본값을 정합니다.` | 좋음 | 유지 |
| `앱 언어` | 유지 | 유지 |
| `제목·설명 작성 기본 언어` | 좋음 | 유지 |
| `추천 번역 시장` | "시장"이 조금 마케팅스럽지만 설정 용도로 가능 | `추천 대상 언어 묶음`도 가능 |

영문 i18n:

- `Language and YouTube defaults`
- `Set display language and title/description translation defaults.`
- `App language`
- `Default title and description language`
- `Recommended language set`

### 5.22 Error / Empty / Toast

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `페이지를 찾을 수 없습니다` | 자연스러움 | 유지 |
| `홈으로` | 유지 | 유지 |
| `예상치 못한 오류가 발생했습니다` | 좋음 | 유지 |
| `잠시 후 다시 시도해 주세요. 문제가 계속되면 문의해 주세요.` | 좋음 | 유지 |
| `오류 코드: {digest}` | 개발자 느낌 | `문의 시 전달할 오류 코드: {digest}` |
| `알 수 없는 오류가 발생했습니다` | 반복되지만 필요 | 공통 i18n key로 통일 |
| `Request failed` | 사용자에게 부적절 | `요청을 처리하지 못했습니다.` |
| `Internal Server Error` | 사용자에게 부적절 | `일시적인 서버 오류가 발생했습니다.` |
| `Invalid body` | 사용자에게 부적절 | `입력값을 확인해 주세요.` |

영문 i18n:

- `Support code: {digest}`
- `We couldn't process the request.`
- `A temporary server error occurred.`
- `Please check the values and try again.`

### 5.23 Chrome extension

| 원본 | 판단 | 제안 |
| --- | --- | --- |
| `Dubtube — YouTube 다국어 오디오 업로드` | 기능은 맞지만 길다 | `Dubtube YouTube 업로드 도우미` |
| `Dubtube에서 생성한 다국어 더빙 오디오를 YouTube Studio에 자동 업로드합니다.` | 좋음 | `Dubtube에서 생성한 더빙 오디오를 YouTube Studio에 업로드합니다.` |
| `아직 업로드 기록이 없습니다.` | 좋음 | 유지 |
| `준비됨` | 유지 | 유지 |
| `자동 모드: 게시까지 자동으로 진행` | 실제 위험 행동이므로 명확해야 함 | `자동 모드: 파일 추가 후 게시까지 진행` |
| `도움 모드: 파일 추가까지만 자동으로 진행` | 좋음 | `도움 모드: 파일 추가까지만 진행` |
| `오류: {raw error}` | raw error 노출 위험 | `업로드를 완료하지 못했습니다. YouTube Studio에서 직접 확인해 주세요.` |
| job.step raw | 내부 코드 노출 위험 | `페이지 여는 중`, `언어 선택 중`, `파일 추가 중`, `게시 준비 중`, `게시 중`으로 매핑 |

영문 i18n:

- `Dubtube YouTube upload helper`
- `Uploads dubbed audio from Dubtube to YouTube Studio.`
- `No upload history yet.`
- `Ready`
- `Auto mode: add the file and publish`
- `Assisted mode: add the file only`
- `Upload could not be completed. Please check in YouTube Studio.`

## 6. 반복되거나 삭제해도 되는 말

삭제 또는 축소 우선순위:

1. 히어로 H1의 `34개 언어`와 바로 아래 설명의 `34개 언어` 중 하나는 줄인다.
2. `전 세계 시청자에게 전하세요`와 `더 많은 시청자에게 콘텐츠를 전하세요`는 같은 의미다. 둘 중 하나만 남긴다.
3. `AI`는 랜딩에서 한두 번이면 충분하다. 버튼/기능 카드마다 AI를 반복하면 신뢰보다 템플릿 느낌이 강해진다.
4. ROI 섹션의 성장/조회수 문구는 `예상`, `최대`보다 `참고` 톤으로 낮춘다.
5. `자동`은 신중히 쓴다. 실제로는 사용자가 검토하고 YouTube 설정을 확인하는 흐름이 있으므로 `자동 게시`보다 `게시 준비`, `업로드 연동`, `완료 후 업로드`가 안전하다.
6. 앱 내부의 설명문은 대부분 한 줄이면 충분하다. Dashboard, Batch, Uploads의 헤더 설명은 더 짧게 만든다.

## 7. 자간과 줄바꿈 점검

### 7.1 제거할 자간

| 위치 | 현재 | 문제 | 제안 |
| --- | --- | --- | --- |
| `Hero.tsx` H1 | `tracking-tight` | 한국어 대형 텍스트에서 글자가 붙어 보인다. | 제거 |
| `PricingSection.tsx` | `uppercase tracking-wider` | 한국어 제목에 맞지 않는다. | `font-semibold`만 유지 |
| 앱 헤더/Topbar 일부 | `leading-tight` | 두 줄이 될 때 빽빽해진다. | `leading-snug` 또는 한 줄 보장 |

### 7.2 줄바꿈 막으면 안 되는 곳

| 위치 | 현재 | 문제 | 제안 |
| --- | --- | --- | --- |
| `Hero.tsx` subcopy | `break-keep`, `lg:whitespace-nowrap` | 넓은 화면에서도 긴 한국어 문장이 답답하고, 번역문은 더 길 수 있다. | `max-w`, 자연 줄바꿈 |
| `CTASection.tsx` body | `lg:whitespace-nowrap` | 긴 문장이 카드 폭을 강제한다. | 제거 |
| `VideoInputStep.tsx` URL row | button `whitespace-nowrap` | 모바일에서 input이 과도하게 줄어든다. | 모바일 column, desktop row |
| `Sidebar.tsx` label | `whitespace-nowrap` | 긴 메뉴가 모바일에서 overflow/scroll 의존 | collapsed icon-only 또는 truncate |
| `UploadStep.tsx` 결과 버튼들 | 다수 `whitespace-nowrap` | 언어별 버튼이 좁은 화면에서 깨질 수 있다. | 2열 grid 또는 wrap |
| `Badge.tsx` | 전역 `whitespace-nowrap` | 상태 badge는 괜찮지만 긴 언어명에는 위험 | language badge는 max-width/truncate variant |

### 7.3 줄바꿈을 막아도 되는 곳

- 숫자와 단위: `30분`, `1,000원`, `+3`, `34개`
- 짧은 상태 badge: `완료`, `실패`, `대기 중`
- 아이콘 버튼의 보조 label이 아닌 실제 짧은 CTA: `업로드`, `삭제`, `다시 시도`

## 8. 라이트/다크 시각 대비 점검

확인한 주요 대비:

| 조합 | 대비 | 판단 |
| --- | ---: | --- |
| `surface-500` on white | 약 4.83:1 | 일반 텍스트 최소 기준 충족 |
| `surface-400` on white | 약 2.56:1 | 일반 텍스트로 부족 |
| `brand-500` on white | 약 3.67:1 | 일반 텍스트로 부족, 큰 텍스트만 가능 |
| white on `brand-500` | 약 3.67:1 | 일반 버튼 텍스트로 약함 |
| white on `brand-600` | 약 4.70:1 | 일반 텍스트 기준 충족 |
| `text-white/80` on brand gradient | 약 2.8~3.4:1 가능 | CTA 설명 텍스트로 부족 |
| `surface-400` on dark background | 약 7.76:1 | 다크에서는 충분 |

수정 기준:

- 라이트 모드에서 `text-surface-400`는 placeholder, icon, metadata 정도로만 쓴다.
- 보조 본문은 `text-surface-500` 이상, 중요한 설명은 `text-surface-600`.
- primary button은 `brand-600` 단색을 기본으로 하고, hover만 `brand-700`.
- CTA의 설명 텍스트는 `text-white` 또는 밝은 neutral로 올린다.
- 라이트/다크 hero 배경은 같은 red/pink gradient 변형이 아니라, 서로 다른 surface 체계를 가져야 한다.

## 9. i18n 구조 점검

현재 구조:

- 많은 컴포넌트가 `{ ko, en }` 객체와 `useLocaleText`를 직접 사용한다.
- Metadata tool은 컴포넌트 내부 `ui(ko, en)` helper를 사용한다.
- 일부 페이지는 한국어만 있다. 예: marketing error, not-found, privacy/terms, billing fail 일부, extension popup
- 일부 API/client 오류는 영어 또는 개발자 문구가 그대로 남아 있다. 예: `Request failed`, `Internal Server Error`, `Invalid body`, `uid required`

권장 구조:

1. `src/lib/i18n/messages.ts` 또는 route별 dictionary를 만든다.
2. public landing, app shell, dubbing wizard, metadata, billing, youtube, errors, extension으로 namespace를 나눈다.
3. 버튼/상태/오류 공통 문구는 shared namespace로 빼서 반복을 줄인다.
4. API 오류는 사용자용 `messageKey`와 개발자용 `debugMessage`를 분리한다.
5. 영어 문구는 한국어 원문과 같은 정보량으로 작성한다. 한국어보다 과하게 마케팅스럽게 만들지 않는다.

공통 key 후보:

```ts
common.loading = { ko: "불러오는 중...", en: "Loading..." }
common.retry = { ko: "다시 시도", en: "Try again" }
common.cancel = { ko: "취소", en: "Cancel" }
common.delete = { ko: "삭제", en: "Delete" }
common.close = { ko: "닫기", en: "Close" }
common.unknownError = { ko: "문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", en: "Something went wrong. Please try again shortly." }
common.supportCode = { ko: "문의 시 전달할 오류 코드", en: "Support code" }
status.queued = { ko: "대기 중", en: "Queued" }
status.processing = { ko: "처리 중", en: "Processing" }
status.complete = { ko: "완료", en: "Complete" }
status.failed = { ko: "실패", en: "Failed" }
```

## 10. 기능은 유지하면서 디자인만 바꾸는 구현 범위

기능을 건드리지 않는 디자인 개편은 다음 범위로 충분하다.

1. 디자인 토큰
   - `globals.css` 색상 변수 재정의
   - brand gradient 사용 축소
   - 한국어 font stack 정리

2. 공통 컴포넌트
   - `Button`: primary gradient 제거, solid primary로 변경
   - `Card`: radius 8px, shadow 축소
   - `Modal`: max-height와 scroll 추가
   - `Badge`: language용 truncate variant 추가
   - `Toast`: 모바일 width를 `calc(100vw - 32px)`로 제한

3. 랜딩 섹션
   - `Hero`: 문구 축소, product preview 중심, tracking 제거
   - `FeatureShowcase`: 기능 카드 문구 축소, gradient 장식 축소
   - `HowItWorks`: 단계형 작업 흐름 강조
   - `ROICalculator`: 참고 계산 톤으로 변경
   - `CTASection`: 큰 gradient 카드 제거 또는 solid dark panel로 변경
   - `PricingSection`: uppercase/tracking 제거

4. 앱 내부
   - 페이지 헤더 설명 정리
   - URL input/button 모바일 줄바꿈
   - 결과 버튼 grid/wrap 적용
   - 보조 텍스트 대비 상향
   - YouTube 연결 해제 문구와 실제 동작 일치

5. i18n
   - 화면 문구 dictionary화
   - 영어 문구 동시 반영
   - API 오류 사용자 문구 분리

## 11. 우선순위

P0: 실사용 혼란 또는 신뢰 저하

- `/youtube`의 `연결 해제`가 앱 로그아웃까지 하는 문제: 현재 반영에서 분리 완료
- 로그인/업로드/결제 오류에 개발자 문구가 노출되는 문제
- `text-white/80` CTA와 라이트 `text-surface-400` 대비 부족
- 모달 max-height 없음

P1: 서비스 품질 인상에 큰 영향

- 히어로 반복 문구 정리
- 한국어 `tracking-tight`, `uppercase tracking-wider` 제거
- primary gradient와 과한 shadow 축소
- 라이트/다크 hero/CTA 배경 차별화
- 앱 내부 버튼 줄바꿈 안전성 확보

P2: 유지보수와 일관성

- i18n dictionary 정리
- 공통 오류/상태 문구 key화
- Chrome extension popup 문구와 단계명 정리
- 법적/정책 페이지 영어 대응 여부 결정

## 12. QA 체크리스트

문구:

- 같은 화면에서 `더빙`, `업로드`, `자동`, `AI`가 불필요하게 반복되지 않는가
- 사용자가 다음 행동을 바로 이해하는가
- 개발자용 오류가 사용자에게 노출되지 않는가
- 한국어와 영어 문구가 같은 의미를 갖는가
- YouTube 정책 관련 문구가 과장 없이 정확한가

타이포:

- 한국어 본문에 negative letter spacing이 없는가
- uppercase tracking이 한국어에 적용되지 않는가
- 모바일에서 긴 버튼이 잘리지 않는가
- badge와 메뉴가 overflow를 만들지 않는가
- 모달과 토스트가 360px 폭에서도 화면 밖으로 나가지 않는가

색/대비:

- 라이트에서 `surface-400`가 본문으로 쓰이지 않는가
- primary 버튼 텍스트가 4.5:1 이상인가
- CTA 설명 텍스트가 배경 위에서 충분히 보이는가
- 다크 모드에서 카드 경계와 페이지 배경이 구분되는가
- disabled 상태가 너무 흐리거나 active 상태와 헷갈리지 않는가

기능 유지:

- 로그인, 세션 sync, 사용자 설정 sync 흐름 유지
- 더빙 wizard 7단계 유지
- output mode 조건 유지
- Perso 처리/polling/credit reservation 유지
- YouTube upload/caption/localization 유지
- Toss 결제 흐름 유지
- 운영자 권한 흐름 유지
- extension assisted upload 흐름 유지

## 13. 적용 후 기대되는 화면 톤

최종적으로 Dubtube는 "AI가 만든 화려한 랜딩"이 아니라 "YouTube 현지화를 실제로 처리하는 스튜디오"처럼 보여야 한다.

랜딩에서는 사용자가 바로 이해해야 한다.

```text
내 영상을 넣는다.
필요한 언어를 고른다.
더빙과 제목·설명이 만들어진다.
YouTube에 올리거나 파일로 받는다.
```

앱 내부에서는 사용자가 안심해야 한다.

```text
무엇이 처리 중인지 보인다.
어떤 언어가 완료됐는지 보인다.
게시 전에 확인할 수 있다.
오류가 나도 무엇을 해야 하는지 알 수 있다.
```

이 방향이면 현재 기능을 그대로 두고도 서비스의 신뢰감, 가독성, 실제 사용감이 크게 좋아진다.
