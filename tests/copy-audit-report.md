# Dubtube 서비스 카피 점검 보고서

작성일: 2026-05-10  
범위: 랜딩, 약관/개인정보, 앱 셸, 대시보드, 새 더빙 위저드, YouTube 업로드, 메타데이터 번역, 결제, 설정, 운영 화면, Chrome 확장 팝업/진행 문구

## 점검 기준

- 유튜버와 일반 사용자가 바로 이해할 수 있는지
- 개발자/내부 시스템 용어가 노출되지 않는지
- 한국어 서비스 안에서 영어가 불필요하게 섞이지 않는지
- YouTube에 그대로 올라가는 제목, 설명, 태그, 자막명 문구가 자연스러운지
- 과장, 가짜 후기처럼 보일 수 있는 신뢰 리스크가 있는지
- 버튼, 모달, 빈 상태, 로딩, 토스트까지 실제 사용 흐름에 맞는지

참고: 일부 터미널 출력은 인코딩 문제로 한글이 깨져 보였지만, 실제 파일을 UTF-8로 다시 확인했습니다. 이 보고서는 실제 파일 기준으로 작성했습니다.

## 적용 결과

아래 점검표의 P0/P1 항목을 실제 코드에 반영했습니다. 한국어 화면에서 영어가 섞여 보이던 업로드, 운영 상태, 결제, 더빙 위저드 문구를 i18n 구조로 정리했고, 영어 UI도 같은 의미로 자연스럽게 맞췄습니다.

랜딩의 과장 표현(`클릭 한 번`, `프로급`, `내 목소리를 그대로`)은 기대치를 낮춘 표현으로 바꿨고, 실제 고객 근거가 없어 보이는 후기 섹션은 첫 화면에서 제거했습니다. 결제/잔액 단위는 사용자가 이해하기 쉬운 `더빙 시간` 중심으로 맞췄습니다.

검증:

- `npm run typecheck` 통과
- `npm run lint` 통과
- `npm test` 통과: 46개 파일, 532개 테스트

부가 수정:

- env 변경 뒤 남은 로컬 로그인 정보 때문에 `/api/auth/sync`, `/api/user/preferences`, `/api/youtube/stats`가 연쇄 401을 내던 흐름을 정리했습니다. 서버 세션 동기화가 성공한 뒤에만 인증 상태로 올리고, 실패하면 브라우저의 저장된 로그인 정보를 지웁니다.

## 용어 통일안

| 현재 혼용 | 권장 표현 |
|---|---|
| YouTube Upload, Upload, Uploaded | YouTube 업로드, 업로드, 업로드됨 |
| credits, 크레딧, 시간 | 결제/잔액은 `더빙 시간`, 내부 단위가 필요할 때만 `크레딧` |
| metadata, localizations | 일반 화면은 `제목·설명`, 필요 시 `다국어 제목·설명` |
| Privacy | 공개 범위 |
| Made for kids | 아동용 영상 |
| synthetic media | AI 생성 또는 합성 콘텐츠 |
| Studio | YouTube Studio |
| assisted | 도움 모드 |
| 예약 (탭 닫아도 OK) | 나중에 업로드 |

## 우선순위 P0: 바로 고쳐야 할 문구

| 위치 | 원본 | 수정안 | 판단 |
|---|---|---|---|
| `src/app/(app)/uploads/page.tsx` | `YouTube upload settings` | `YouTube 업로드 설정` | 모달 제목이 영어라 완성도가 떨어져 보입니다. |
| `src/app/(app)/uploads/page.tsx` | `Title` | `제목` | 입력 라벨 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Description` | `설명` | 입력 라벨 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Tags (comma separated)` | `태그` | 괄호 설명은 도움말로 분리하거나 `쉼표로 구분`으로 자연화. |
| `src/app/(app)/uploads/page.tsx` | `Privacy` | `공개 범위` | YouTube 정책 용어는 한국어로 통일. |
| `src/app/(app)/uploads/page.tsx` | `Upload translated SRT captions with the video` | `번역된 SRT 자막도 함께 업로드` | 컨트롤 라벨 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Made for kids` | `아동용 영상` | YouTube 사용자에게 익숙한 표현. |
| `src/app/(app)/uploads/page.tsx` | `Disclose AI-generated or synthetic media` | `AI 생성 또는 합성 콘텐츠임을 표시` | 정책 설정 의미가 더 명확합니다. |
| `src/app/(app)/uploads/page.tsx` | `Language: {langName}` | `언어: {langName}` | 모달 정보 라벨 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Cancel` | `취소` | 버튼 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Uploading...` | `업로드 중...` | 로딩 문구 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Upload` | `업로드` | 버튼 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Upload failed` | `업로드 실패` | 토스트 제목 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Unknown error` | `알 수 없는 오류가 발생했습니다.` | 사용자에게 보이는 오류 fallback. |
| `src/app/(app)/uploads/page.tsx` | `Resolving link...` | `다운로드 링크 확인 중...` | resolving은 개발자식 표현입니다. |
| `src/app/(app)/uploads/page.tsx` | `Watch` | `YouTube에서 보기` | 클릭 결과가 더 명확합니다. |
| `src/app/(app)/uploads/page.tsx` | `Uploaded` | `업로드됨` | 상태 배지 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `YouTube Upload` | `YouTube에 업로드` | 행 버튼과 페이지 제목 모두 한국어로 통일. |
| `src/app/(app)/uploads/page.tsx` | `Upload completed dubbed videos to YouTube` | `완료된 더빙 영상을 YouTube에 업로드하세요.` | 페이지 설명 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Loading...` | `불러오는 중...` | 로딩 문구 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `No videos to upload` | `업로드할 영상이 없습니다` | 빈 상태 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `Completed dubbed videos will appear here.` | `더빙이 완료된 영상이 여기에 표시됩니다.` | 빈 상태 설명 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `{n} languages` | `{n}개 언어` | 카드 배지 영어 잔존. |
| `src/app/(app)/uploads/page.tsx` | `${item.video_title} - ${langName} dubbed by Dubtube AI` | `${item.video_title} - Dubtube AI ${langName} 더빙` 또는 언어별 자동 번역 | YouTube 설명으로 나갈 수 있어 자연스러워야 합니다. |
| `src/app/(app)/uploads/page.tsx` | `Dubtube, AI dubbing, ${langName}, dubbed` | `Dubtube, AI 더빙, ${langName}` | 기본 태그에 영어와 한국어가 어색하게 섞입니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `Dubbed Video` | `더빙 영상` | YouTube 제목 fallback으로 나갈 수 있는 문구입니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `Original Video` | `원본 영상` | YouTube 제목 fallback 영어 잔존. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `Untitled` | `제목 없음` | YouTube 메타데이터 fallback 영어 잔존. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `${lang.name} subtitles` | 빈 값 `''` 또는 `${lang.nativeName} 자막` | YouTube 자막 트랙명은 시청자 언어로 보이게 하거나 로케일 자동 표시가 더 낫습니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `Audio + SRT` | `오디오 + 자막` | 다운로드 영역 영어 잔존. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `Video + Audio + SRT` | `영상 + 오디오 + 자막` | 다운로드 영역 영어 잔존. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `Video` | `영상` | 다운로드 버튼 영어 잔존. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `Audio` | `오디오` | 다운로드 버튼 영어 잔존. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `SRT` | `자막` | 일반 사용자는 SRT보다 자막이 직관적입니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `예약 (탭 닫아도 OK)` | `나중에 업로드` | “OK”는 임시 개발 문구처럼 보입니다. 설명은 툴팁/보조문으로 분리. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Dubbing completed with errors` | `일부 언어 더빙이 완료되지 않았습니다` | 토스트 영어 잔존, 사용자 행동이 불명확. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `All dubbing complete!` | `모든 언어 더빙이 완료되었습니다` | 토스트 영어 잔존, 느낌표는 줄이는 편이 낫습니다. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Space Error` | `작업 공간을 불러오지 못했습니다` | Perso 내부 용어 노출. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Uploading video...` | `영상을 업로드하는 중...` | 토스트 영어 잔존. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Video uploaded` | `영상 업로드 완료` | 토스트 영어 잔존. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `${file.name} ready for dubbing` | `${file.name} 영상을 더빙할 준비가 완료되었습니다.` | 사용자에게 자연스러운 완료 문구. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Upload Error` | `영상 업로드 실패` | 토스트 영어 잔존. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Import Error` | `영상 가져오기 실패` | 토스트 영어 잔존. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Submitting dubbing job...` | `더빙 작업을 시작하는 중...` | 개발자식 job 표현. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `${targetLanguages.length} languages` | `${targetLanguages.length}개 언어` | 토스트 메시지 영어 잔존. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Dubbing Error` | `더빙 시작 실패` | 토스트 영어 잔존. |
| `src/features/dubbing/hooks/usePersoFlow.ts` | `Download Error` | `파일 다운로드 실패` | 토스트 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Operations` | `운영 상태` | 앱 전체가 한국어인데 운영 화면만 영어입니다. |
| `src/features/ops/components/OpsDashboard.tsx` | `Monitor upload queue failures, Perso failures, credit releases, and Toss webhook failures.` | `업로드 큐, Perso 작업, 크레딧 반환, Toss 웹훅 오류를 모니터링합니다.` | 운영자용이라도 한국어 셸과 맞춰야 합니다. |
| `src/features/ops/components/OpsDashboard.tsx` | `Window` | `조회 기간` | 컨트롤 라벨 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Refresh` | `새로고침` | 버튼 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Last updated: {generatedLabel}` | `마지막 업데이트: {generatedLabel}` | 상태 문구 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Operations access unavailable` | `운영 화면에 접근할 수 없습니다` | 에러 카드 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Admin permission is required.` | `관리자 권한이 필요합니다.` | 에러 fallback 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Upload queue failure rate` | `업로드 큐 실패율` | 지표명 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Perso failure rate` | `Perso 작업 실패율` | 지표명 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Credit release events` | `크레딧 반환 이벤트` | 지표명 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Toss webhook failures` | `Toss 웹훅 실패` | 지표명 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Alerts` | `알림` | 카드 제목 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Healthy` | `정상` | 배지 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `No active operations alerts for this window.` | `현재 조회 기간에 활성 운영 알림이 없습니다.` | 빈 상태 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Recent Events` | `최근 이벤트` | 카드 제목 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `Time / Category / Severity / Message / Reference` | `시간 / 분류 / 심각도 / 메시지 / 참조` | 테이블 헤더 영어 잔존. |
| `src/features/ops/components/OpsDashboard.tsx` | `No recent operational events.` | `최근 운영 이벤트가 없습니다.` | 빈 상태 영어 잔존. |
| `src/features/ops/components/OpsAlertButton.tsx` | `Operations alerts` | `운영 알림` | aria-label/title 영어 잔존. |
| `src/app/(app)/ops/layout.tsx` | `Operations` | `운영 상태` | 브라우저 타이틀 영어 잔존. |

## 우선순위 P1: 실사용 흐름에서 어색한 문구

| 위치 | 원본 | 수정안 | 판단 |
|---|---|---|---|
| `src/features/landing/Hero.tsx` | `클릭 한 번으로 {SUPPORTED_LANGUAGE_COUNT}개국 더빙` | `영상 하나로 {SUPPORTED_LANGUAGE_COUNT}개 언어 더빙` | 지원 대상은 국가가 아니라 언어입니다. “클릭 한 번”은 실제 단계 수와 맞지 않을 수 있습니다. |
| `src/features/landing/Hero.tsx` | `내 채널을 세계에 알리세요` | `내 채널을 전 세계 시청자에게 전하세요` | 약간 광고 문구처럼 떠 보입니다. 더 자연스럽게 혜택을 설명. |
| `src/features/landing/Hero.tsx` | `영상 하나만 올리면 {SUPPORTED_LANGUAGE_COUNT}개 언어로 프로급 더빙이 완성됩니다.` | `영상을 올리고 언어를 선택하면 {SUPPORTED_LANGUAGE_COUNT}개 언어 더빙을 만들 수 있습니다.` | “하나만”, “프로급”은 과장으로 보일 수 있습니다. |
| `src/features/landing/Hero.tsx` | `보이스 클론이 내 목소리를 그대로 살려` | `원래 목소리의 톤을 살려` | “그대로”는 품질 보장처럼 들립니다. |
| `src/features/landing/FeatureShowcase.tsx` | `모든 더빙 언어에서 내 고유한 목소리를 유지합니다. 시청자는 내 목소리로 듣게 됩니다.` | `여러 언어에서도 원래 목소리의 톤과 분위기를 유지하도록 돕습니다.` | 보이스 클론 품질을 과장하지 않는 표현. |
| `src/features/landing/FeatureShowcase.tsx` | `프로 더빙 도구` | `더빙 제작 도구` | “프로”는 근거 없는 품질 주장으로 보일 수 있습니다. |
| `src/features/landing/HowItWorks.tsx` | `원클릭 보이스 클론을 활성화하세요.` | `보이스 클론 사용 여부를 선택하세요.` | 실제 작업은 원클릭보다 여러 확인 단계가 있어 보입니다. |
| `src/features/landing/HowItWorks.tsx` | `유저별 음성 매핑도 가능합니다.` | `여러 화자가 있는 영상도 설정에 맞춰 처리할 수 있습니다.` | “유저별 음성 매핑”은 개발자식 표현. |
| `src/features/landing/ROICalculator.tsx` | `성장 가능성 시뮬레이터` | `예상 도달 범위 계산기` | 수익/성장 보장처럼 보이지 않게 조정. |
| `src/features/landing/ROICalculator.tsx` | `YouTube 공식 데이터 및 Jamie Oliver(3배 도달)·MrBeast 등 공개 사례 기반 추정치.` | `공개 사례와 업계 데이터를 바탕으로 한 참고용 추정치입니다.` | 특정 사례를 쓰려면 출처와 조건을 명확히 해야 합니다. |
| `src/features/landing/ROICalculator.tsx` | `+{growthPct}%` | `최대 +{growthPct}% 예상` 또는 `참고 예상치 +{growthPct}%` | 숫자가 보장처럼 보일 수 있습니다. |
| `src/features/landing/Testimonials.tsx` | `전 세계 크리에이터가 사랑하는 서비스` | `크리에이터를 위한 더빙 워크플로우` | 실제 고객 근거가 없다면 과장/가짜 후기 느낌이 납니다. |
| `src/features/landing/Testimonials.tsx` | `Sarah Chen`, `박민재`, `Alex Rivera` 후기 3개 | 실제 고객 후기만 노출하거나, 출시 전이면 섹션 제거 | 가짜 후기로 보이면 신뢰를 크게 잃습니다. |
| `src/features/landing/PricingSection.tsx` | `구독 없음. 1분 더빙 = $1. 원하는 만큼 충전해서 사용하세요.` | `구독 없이 필요한 만큼 충전하세요. 더빙 1분 단위로 사용합니다.` | 결제 페이지는 KRW인데 랜딩은 USD라 한국 사용자에게 혼란. |
| `src/features/landing/PricingSection.tsx` | `$1/분` | `1분 단위 과금` 또는 실제 원화 가격 | 결제 통화와 맞춰야 합니다. |
| `src/features/landing/CTASection.tsx` | `전 세계를 만날 준비 되셨나요?` | `전 세계 시청자를 만날 준비가 되셨나요?` | 조사 누락과 대상 불명확. |
| `src/features/dashboard/components/DashboardContent.tsx` | `돌아오신 것을 환영합니다! 더빙 현황을 확인하세요.` | `더빙 현황을 확인하세요.` | 업무형 앱에서 흔한 AI식 환영 문구입니다. |
| `src/features/dashboard/components/RecentJobs.tsx` | `새 더빙을 시작해보세요!` | `새 더빙을 시작하세요.` | 느낌표를 줄여 더 자연스럽게. |
| `src/features/dashboard/components/CreditChart.tsx` | `${Number(value)} credits` | `${Number(value)}분` 또는 `${Number(value)} 크레딧` | 결제 페이지는 “시간/분”을 쓰므로 단위 통일 필요. |
| `src/app/(app)/billing/page.tsx` | `시간을 충전하고 사용 내역을 확인하세요` | `더빙 시간을 충전하고 결제 내역을 확인하세요.` | “시간”만 있으면 무엇을 충전하는지 모호합니다. |
| `src/app/(app)/billing/page.tsx` | `국내 결제는 KRW 기준으로 처리됩니다` | `결제는 원화(KRW)로 처리됩니다.` | “국내 결제”보다 간결하고 자연스럽습니다. |
| `src/app/(app)/billing/page.tsx` | `시간 충전` | `더빙 시간 충전` | 결제 대상 명확화. |
| `src/app/(app)/youtube/page.tsx` | `각 더빙 별로 변경할 수 있습니다.` | `각 더빙별로 변경할 수 있습니다.` | 띄어쓰기 수정. |
| `src/app/(app)/youtube/page.tsx` | `기본 작성 언어` | `기본 원문 언어` | 제목/설명을 어떤 언어로 쓰는지 더 명확합니다. |
| `src/app/(app)/youtube/page.tsx` | `편한 언어를 선택해주세요.` | `제목과 설명을 작성할 기본 언어를 선택하세요.` | 반말은 아니지만 서비스 문구는 `선택하세요`가 더 깔끔합니다. |
| `src/app/(app)/youtube/page.tsx` | `Google 로그인 시 YouTube 권한이 함께 연결됩니다` | `Google로 로그인하면 YouTube 권한을 함께 요청합니다.` | 권한 동의 흐름을 더 정확히 설명. |
| `src/app/(app)/batch/page.tsx` | `배치 큐` | `작업 큐` 또는 `더빙 작업` | 일반 유튜버에게 “배치”는 덜 친숙합니다. |
| `src/app/(app)/batch/page.tsx` | `여러 영상을 더빙 큐에 추가하세요` | `여러 더빙 작업의 진행 상태를 확인하세요.` | 실제 화면은 추가보다 진행 관리에 가까움. |
| `src/app/(app)/batch/page.tsx` | `이 작업을 큐에서 삭제하시겠습니까? 진행 중인 Perso 더빙도 함께 취소됩니다.` | `이 더빙 작업을 삭제할까요? 진행 중인 작업도 함께 취소됩니다.` | Perso 내부 서비스명은 굳이 노출하지 않아도 됩니다. |
| `src/components/layout/Sidebar.tsx` | `운영 관측` | `운영 상태` | “관측”은 기술 문서 느낌이 납니다. |
| `src/app/global-error.tsx` | `오류 코드: {error.digest}` 또는 `error.message` 그대로 노출 | `잠시 후 다시 시도해 주세요. 문제가 계속되면 문의해 주세요.` + 작은 코드 | 일반 사용자에게 원문 에러는 불필요하고 불안감을 줍니다. |
| `src/app/(app)/error.tsx` | `{error.digest ? ... : error.message}` | `잠시 후 다시 시도해 주세요.` + 필요 시 `오류 코드`만 작게 표시 | 서버/개발자 메시지가 노출될 수 있습니다. |

## 메타데이터 번역 화면

| 위치 | 원본 | 수정안 | 판단 |
|---|---|---|---|
| `src/app/(app)/metadata/page.tsx` | `메타데이터 번역` | `YouTube 제목·설명 번역` | “메타데이터”는 유튜버에게 덜 직관적입니다. |
| `src/app/(app)/metadata/page.tsx` | `더빙이나 자막 없이 YouTube 제목·설명 번역만 생성하고 적용합니다.` | `더빙 없이 YouTube 제목과 설명만 여러 언어로 번역해 적용합니다.` | 자연스러운 설명으로 정리. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `내 영상 업로드` | `내 영상 불러오기` | 이 모드는 업로드가 아니라 기존 영상 메타데이터 수정입니다. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `새 영상 업로드` | `새 영상 올리기` | 버튼/탭 문구는 더 짧고 자연스럽게. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `이미 번역된 언어는 picker에서 비활성화됩니다.` | `이미 번역된 언어는 언어 선택 목록에서 비활성화됩니다.` | picker는 개발자/디자인 툴 용어. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `YouTube localizations에 들어갈 번역만 생성합니다.` | `YouTube 다국어 제목·설명에 적용할 번역만 생성합니다.` | localizations는 사용자에게 노출하지 않는 것이 좋습니다. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `videoId: ${result.videoId} (${privacyLabel}로 업로드되었습니다)` | `영상이 ${privacyLabel} 상태로 업로드되었습니다.` | videoId는 개발자 정보입니다. 필요하면 링크로 제공. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `비공개(private)로 올라갑니다.` | `비공개로 업로드됩니다.` | 영어 괄호는 불필요합니다. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `변경 가능.` | `변경할 수 있습니다.` | 문장 단편이 어색합니다. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `위 채널, 공개 범위, 태그, 아동용 등 설정들을 확인했으며 업로드는 진행합니다.` | `위 설정을 확인했으며 업로드를 진행합니다.` | 조사와 문장 흐름이 어색합니다. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `회색 표시 언어` | `회색으로 표시된 언어` | 자연스러운 한국어. |

## 새 더빙 위저드

| 위치 | 원본 | 수정안 | 판단 |
|---|---|---|---|
| `src/app/(app)/dubbing/page.tsx` | `영상을 여러 언어로 더빙하세요` | `영상을 선택하고 여러 언어로 더빙하세요.` | 실제 첫 단계와 더 잘 맞습니다. |
| `src/features/dubbing/components/steps/VideoInputStep.tsx` | `공개 영상만 가져올 수 있습니다. 비공개·일부공개 영상은 외부 다운로드가 막혀 있어 가져올 수 없으니...` | `공개 영상만 가져올 수 있습니다. 비공개 또는 일부 공개 영상은 파일로 직접 업로드하거나 YouTube에서 공개로 변경해 주세요.` | 문장이 길고 “외부 다운로드가 막혀”가 기술적으로 들립니다. |
| `src/features/dubbing/components/steps/VideoInputStep.tsx` | `원격 서버에서 다운로드 중...` | `영상 파일을 가져오는 중...` | 원격 서버는 사용자에게 불필요한 용어. |
| `src/features/dubbing/components/steps/VideoInputStep.tsx` | `Perso.ai에 업로드 중...` | `영상을 업로드하는 중...` | 제3자 처리사를 꼭 노출할 필요가 없습니다. |
| `src/features/dubbing/components/steps/VideoInputStep.tsx` | `MP4, MOV, WebM — 최대 30분` | `MP4, MOV, WebM / 최대 30분` | 현재도 이해되지만 기호를 일반 UI 스타일로 정리. |
| `src/features/dubbing/components/steps/VideoInputStep.tsx` | `Shorts` | `쇼츠` | 한국어 UI와 맞춤. |
| `src/features/dubbing/components/steps/VideoInputStep.tsx` | `{formatDuration(videoMeta.duration)} 길이` | `길이 {formatDuration(videoMeta.duration)}` | 어순이 자연스럽습니다. |
| `src/features/dubbing/components/steps/OutputModeStep.tsx` | `저작권을 지켜주세요.` | `업로드 권한이 있는 영상인지 확인해 주세요.` | 훈계처럼 들리지 않고 사용자가 해야 할 행동을 안내. |
| `src/features/dubbing/components/steps/OutputModeStep.tsx` | `원본 업로드 + 자막 추가` | `원본 영상 업로드 후 자막 추가` | 사용 흐름이 더 명확합니다. |
| `src/features/dubbing/components/steps/LanguageSelectStep.tsx` | `예상 크레딧` | `예상 사용 시간` 또는 `예상 차감 크레딧` | 결제 페이지가 “시간” 중심이면 단위 통일 필요. |
| `src/features/dubbing/components/steps/UploadSettingsStep.tsx` | `작성하기 편한 언어를 선택하세요.` | `제목과 설명을 작성할 언어를 선택하세요.` | “편한 언어”보다 입력 목적이 명확합니다. |
| `src/features/dubbing/components/steps/UploadSettingsStep.tsx` | `placeholder="Dubtube, AI더빙, dubbed"` | `placeholder="Dubtube, AI 더빙, 브이로그"` | 영어 `dubbed`가 어색합니다. |
| `src/features/dubbing/components/steps/UploadSettingsStep.tsx` | `태그는 번역하지 않고 그대로 사용합니다.` | `태그는 언어별로 번역되지 않습니다.` | 더 짧고 명확합니다. |
| `src/features/dubbing/components/steps/UploadSettingsStep.tsx` | `완료 즉시 자동 업로드` | `완료 후 자동 업로드` | “즉시”는 부담이 커 보이고, 시스템 지연과도 충돌 가능. |
| `src/features/dubbing/components/steps/UploadSettingsStep.tsx` | `자동 업로드 OFF` | `자동 업로드 꺼짐` | UI 상태도 한국어로. |
| `src/features/dubbing/components/steps/UploadSettingsStep.tsx` | `다국어 오디오 트랙 추가` + `추후 기능이 추가될 예정입니다.` | 기능이 준비 전이면 숨김 유지 또는 `준비 중인 기능입니다.` | 실제 사용자는 비활성 기능 노출을 혼란스러워할 수 있습니다. |
| `src/features/dubbing/components/steps/TranslationEditStep.tsx` | `위 채널, 공개 범위, 작성 언어, 태그, 자막, 아동용, AI 합성 고지 설정을 확인했으며 처리 완료 후 자동 업로드를 실행합니다.` | `채널, 공개 범위, 제목·설명 언어, 태그, 자막, 아동용 여부, AI 콘텐츠 표시 설정을 확인했습니다. 처리 완료 후 자동 업로드를 진행합니다.` | 한 문장에 항목이 너무 많고 딱딱합니다. |
| `src/features/dubbing/components/steps/TranslationEditStep.tsx` | `진행 전 설정을 확인하세요.` | `더빙을 시작하기 전에 설정을 확인하세요.` | 사용 시나리오가 더 명확합니다. |
| `src/features/dubbing/components/steps/TranslationEditStep.tsx` | `AI가 자동으로 영상을 전사하고...` | `영상을 분석해 자막과 더빙 오디오를 생성합니다. 영상 길이에 따라 몇 분 정도 걸릴 수 있습니다.` | AI 반복과 기술 단계 나열을 줄입니다. |
| `src/features/dubbing/components/steps/ProcessingStep.tsx` | `전사 중` | `음성 분석 중` | “전사”는 일반 사용자에게 덜 익숙합니다. |
| `src/features/dubbing/components/steps/ProcessingStep.tsx` | `synthesizing: 대기열` | `음성 생성 대기 중` | 진행 상태가 더 구체적입니다. |
| `src/features/dubbing/components/steps/ProcessingStep.tsx` | `Project #{lp.projectSeq}` | 숨김 또는 `작업 번호 {lp.projectSeq}` | 내부 프로젝트 번호처럼 보여 개발자용입니다. |
| `src/features/dubbing/components/steps/ProcessingStep.tsx` | `더빙 완료!` | `더빙 완료` | 서비스 전체 톤과 맞게 느낌표 제거. |

## 더빙 결과, 편집, 확장 업로드

| 위치 | 원본 | 수정안 | 판단 |
|---|---|---|---|
| `src/features/dubbing/components/steps/UploadStep.tsx` | `더빙된 영상이 준비되었습니다!` | `더빙 영상이 준비되었습니다` | 느낌표 제거, 자연화. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `더빙 부분 완료` | `일부 언어 더빙 완료` | 의미가 더 명확합니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `{completed} / {selected}개 언어 완료.` | `{selected}개 언어 중 {completed}개가 완료되었습니다.` | 읽는 순서가 자연스럽습니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `원본 영상에 오디오 트랙을 추가합니다.` | `원본 영상에 자막과 오디오 트랙을 추가할 수 있습니다.` | 결과 화면에서 가능한 행동으로 설명. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `인증됨` | `YouTube 연결됨` | 사용자가 무엇이 인증됐는지 바로 알 수 있습니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `Google 로그인 시 자동 인증` | `Google로 로그인하면 YouTube 업로드를 사용할 수 있습니다` | 배지 문구로는 길어 카드 설명으로 이동 권장. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `즉시` | `지금 업로드` | 버튼만 봐도 행동이 명확해야 합니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `예약` | `나중에 업로드` | “예약”은 특정 시간 예약처럼 오해될 수 있습니다. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `오디오 + Studio` | `오디오 받고 YouTube Studio 열기` | 버튼의 실제 동작을 더 정확히 설명. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `AI 합성 고지` | `AI 콘텐츠 표시` | YouTube 사용자에게 더 자연스러운 정책 표현. |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `추가 안 함` | `표시 안 함` | “고지”보다 표시 상태로 통일. |
| `src/features/dubbing/components/SubtitleScriptEditor.tsx` | `스크립트 (재더빙용)` | `번역 스크립트` | “재더빙용”은 내부 기능 설명처럼 느껴짐. |
| `src/features/dubbing/components/SubtitleScriptEditor.tsx` | `Perso가 더빙 오디오를 다시 만듭니다.` | `수정한 문장으로 더빙 오디오를 다시 생성합니다.` | Perso 노출 제거, 사용 행동 중심. |
| `src/features/dubbing/components/SubtitleScriptEditor.tsx` | `시간은 Perso가 결정하므로 여기서는 변경할 수 없습니다.` | `오디오 타이밍은 자동으로 계산되며, 여기서는 텍스트만 수정할 수 있습니다.` | 서비스 내부명 제거. |
| `src/features/dubbing/components/SubtitleScriptEditor.tsx` | `Perso 원본으로 되돌리기` | `처음 생성된 자막으로 되돌리기` | 제3자 내부명 대신 사용자 기준 표현. |
| `src/features/dubbing/components/SubtitleScriptEditor.tsx` | `자막을 Perso 원본으로 되돌렸습니다.` | `자막을 처음 생성된 상태로 되돌렸습니다.` | 토스트에서도 내부명 제거. |
| `src/features/dubbing/components/YouTubeExtensionUpload.tsx` | `Dubtube 확장 미설치` | `Dubtube 확장 프로그램이 설치되어 있지 않습니다` | 빈 상태 문장으로 자연화. |
| `src/features/dubbing/components/YouTubeExtensionUpload.tsx` | `다시 감지` | `다시 확인` | 일반 사용자에게 더 자연스럽습니다. |
| `src/features/dubbing/components/YouTubeExtensionUpload.tsx` | `확장 자동 업로드` | `확장 프로그램 자동 업로드` | 의미 명확화. |
| `src/features/dubbing/components/YouTubeExtensionUpload.tsx` | `오디오 주입 중` | `오디오 파일 추가 중` | “주입”은 개발자식 표현. |
| `src/features/dubbing/components/YouTubeExtensionUpload.tsx` | `Studio` | `YouTube Studio` | 버튼 단독 사용 시 명확성 부족. |
| `src/features/dubbing/components/YouTubeExtensionUpload.tsx` | `YouTube Studio에서 자동 진행됩니다.` | `YouTube Studio가 열리고 오디오 트랙 추가가 진행됩니다.` | 실제 동작을 더 정확히 안내. |
| `src/features/dubbing/utils/aiDisclosure.ts` | `Dubtube에서 AI 보이스 클론으로 더빙되었습니다.` | `이 영상은 Dubtube에서 AI 음성 클론을 사용해 더빙했습니다.` | YouTube 설명에 들어갈 문장이라 문체를 자연스럽게. |

## Chrome 확장 프로그램

| 위치 | 원본 | 수정안 | 판단 |
|---|---|---|---|
| `extension/src/popup/index.html` | `assisted — 파일 주입까지만 자동` | `도움 모드: 파일 추가까지만 자동으로 진행` | 영어 모드명과 “주입” 제거. |
| `extension/src/popup/main.ts` | `진행` | `진행 중` | 상태 배지 문구 자연화. |
| `extension/src/popup/main.ts` | `auto — 게시까지 모두 자동` | `자동 모드: 게시까지 자동으로 진행` | 영어 제거. |
| `extension/src/popup/main.ts` | `assisted — 파일 주입까지만 자동` | `도움 모드: 파일 추가까지만 자동으로 진행` | 영어와 개발자식 용어 제거. |
| `extension/src/popup/main.ts` | `오류: {message}` | `오류가 발생했습니다: {message}` | 문장형으로 자연화. |
| `extension/src/popup/main.ts` | `{job.step}` 그대로 표시 | `STEP_LABELS`로 변환한 한국어 단계명 표시 | `OPENING_LANGUAGES` 같은 내부 단계가 노출될 수 있습니다. |
| `extension/src/upload-steps.ts` | `"언어 추가" 버튼 탐색 중` | `"언어 추가" 버튼 찾는 중` | 탐색은 개발자식 느낌. |
| `extension/src/upload-steps.ts` | `파일 입력 요소에 주입 중` | `오디오 파일을 추가하는 중` | DOM 용어 제거. |
| `extension/src/content.ts` | `자동화 실패 (3회 재시도 후). 수동 진행: {guideUrl} — {err}` | `자동 업로드에 실패했습니다. 3회 재시도했지만 완료하지 못했습니다. 수동으로 진행해 주세요: {guideUrl}` | 사용자에게 내부 오류 형식을 덜 노출. |
| `extension/src/content.ts` | `[Dubtube] Content script loaded on YouTube Studio` | 콘솔 전용이면 유지, 사용자 노출 가능하면 제거 | 일반 사용자가 볼 문구는 아니지만 확장 디버깅 흔적입니다. |

## 약관/개인정보/법적 문구

| 위치 | 원본 | 수정안 | 판단 |
|---|---|---|---|
| `src/app/(marketing)/privacy/page.tsx` | `OAuth 2.0 액세스 토큰 / 리프레시 토큰` | `Google OAuth 인증 토큰` + 별도 설명 | 일반 사용자가 보기엔 기술적이지만 정책 문서라 허용. 더 쉽게 풀 수 있음. |
| `src/app/(marketing)/privacy/page.tsx` | `모델 학습·휴먼 리뷰 등에도 사용하지 않습니다.` | `AI 모델 학습이나 사람이 검토하는 용도로 사용하지 않습니다.` | “휴먼 리뷰”는 번역투입니다. |
| `src/app/(marketing)/privacy/page.tsx` | `IP/User-Agent 기본 로그` | `IP 주소, 브라우저 정보 등 기본 접속 로그` | 일반 독자에게 더 명확합니다. |
| `src/app/(marketing)/privacy/page.tsx` | `<code> dubtube-youtube-settings</code>` | `<code>dubtube-youtube-settings</code>` | 쿠키명 앞 공백 제거. |
| `src/app/(marketing)/terms/page.tsx` | `본 서비스는 "있는 그대로(as-is)" 제공되며` | `본 서비스는 현재 제공되는 상태 그대로 제공되며` | 법적 의미는 유지하면서 번역투 완화. |
| `src/app/(marketing)/terms/page.tsx` | `본 서비스의 API/시스템에 대한 비정상적·자동화된 호출` | `본 서비스의 시스템을 비정상적으로 호출하거나 자동화해 악용하는 행위` | 일반 사용자에게 더 명확합니다. |
| `src/app/(marketing)/terms/page.tsx` | `크레딧 시스템의 회피·부정 사용` | `크레딧을 우회하거나 부정하게 사용하는 행위` | 자연스러운 한국어. |

## 유지해도 괜찮은 문구

| 위치 | 판단 |
|---|---|
| 랜딩 내비게이션 `기능`, `요금제`, `이용 방법`, `Google로 시작하기` | 정상. |
| 앱 공통 `테마 전환`, `로그아웃`, `알림 닫기` | 정상. |
| 더빙 위저드 단계 `영상`, `결과물`, `언어`, `업로드 설정`, `확인`, `처리`, `결과` | 짧고 이해 가능합니다. |
| `자막 · 스크립트 편집`, `YouTube에 자막 적용`, `SRT 미리보기` | 고급 기능 화면에서는 유지 가능. 단, 일반 버튼은 `자막` 병기를 권장. |
| 결제 성공/실패 페이지 기본 문구 | 큰 문제 없음. 오류 코드는 작게 유지 가능. |

## 적용 순서 제안

1. `uploads` 페이지 영어 UI와 기본 YouTube 메타데이터를 먼저 수정합니다. 실제 사용자가 보는 화면이기도 하고, 생성물이 YouTube에 그대로 나갈 수 있습니다.
2. `usePersoFlow`, `UploadStep`의 영어 토스트와 fallback 제목을 정리합니다.
3. `ops` 화면을 한국어로 통일합니다. 운영자용이라도 앱 안의 품질 신호입니다.
4. 랜딩의 과장 가능 문구, ROI, 후기 섹션을 사실 기반 문구로 낮춥니다.
5. Perso, localizations, project, selector, inject 같은 내부 용어를 사용자 기준 표현으로 바꿉니다.
