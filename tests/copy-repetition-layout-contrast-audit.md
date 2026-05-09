# Dubtube 문구 반복·줄바꿈·대비 재점검 보고서

작성일: 2026-05-10  
대상: 랜딩, 약관/개인정보, 앱 셸, 대시보드, 새 더빙, 결과/업로드/편집, YouTube 설정, 제목·설명 번역, 결제, 설정, 운영 화면
적용 상태: 2026-05-10 코드 반영 완료. 법적 문서처럼 보고서에서 유지 가능하다고 판단한 항목은 그대로 두었습니다.

## 점검 방식

- 소스 기준으로 버튼, 탭, 모달, 빈 상태, 토스트, 확인 문구, 도움말 문구를 다시 확인했습니다.
- 로컬 `http://localhost:3000`에서 데스크톱 1440px, 모바일 390px 기준으로 라이트/다크 화면을 확인했습니다.
- 확인한 경로: `/`, `/terms`, `/privacy`, `/dashboard`, `/dubbing`, `/youtube`, `/metadata`, `/uploads`, `/batch`, `/billing`, `/settings`, `/ops`
- 자동 대비 체크는 투명 배경을 완벽히 계산하지 못해 거짓 양성이 있었고, 실제 문제는 화면과 CSS 클래스를 함께 보고 판단했습니다.

## 결론

현재 문구는 이전보다 많이 정리됐지만, 실서비스 관점에서 아직 아래 4가지는 먼저 손봐야 합니다.

1. 모바일 앱 화면에서 본문 폭이 심하게 좁아집니다. 사이드바가 모바일에서도 `w-64`, 본문이 `ml-64`라 `/metadata`, `/uploads`, `/settings`에서 제목, 셀렉트, 버튼이 70~90px 폭으로 깨집니다.
2. 결제/요금제에서 `10분`, `30분`, `1분 단위 과금` 같은 정보가 카드마다 반복됩니다. 가격 정보라 눈에 잘 띄지만, 반복이 많아 서비스가 덜 정돈돼 보입니다.
3. 랜딩과 일부 기능 설명에 `글로벌 진출`, `공략`, `ROI`, `국가권`처럼 일반 유튜버보다 마케팅/개발자에게 가까운 표현이 남아 있습니다.
4. 다크모드에서 중요하지 않은 설명은 괜찮지만, 설정/확인에 영향을 주는 작은 보조 문구까지 `text-surface-400` 계열로 낮게 처리된 곳이 있어 가독성을 조금 올리는 편이 좋습니다.

## P0: 화면 사용성 문제

| 위치 | 현재 | 문제 | 수정안 |
|---|---|---|---|
| `src/components/layout/Sidebar.tsx`, `src/app/(app)/layout.tsx` | 사이드바 `fixed w-64`, 본문 `ml-64` | 모바일에서도 사이드바 폭이 고정되어 본문이 찌그러집니다. 실제 확인 시 `/metadata`의 `YouTube 제목·설명 번역`, `영상을 선택하세요`, `불러오기`, `/settings`의 셀렉트와 설명이 매우 좁게 줄바꿈됐습니다. | 모바일에서는 사이드바를 숨기거나 드로어로 전환하고, 본문 여백은 `lg:ml-64`로 제한합니다. `main`도 모바일 `p-4`, 데스크톱 `p-6` 정도로 분기합니다. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `grid gap-3 md:grid-cols-[1fr_auto]` 안의 셀렉트/버튼 | 앱 셸 폭 문제가 해결되기 전까지 모바일에서 셀렉트와 `불러오기` 버튼이 한 글자 단위로 깨집니다. | 앱 셸 수정이 우선입니다. 보강으로 버튼 영역은 `md:flex`, 모바일은 세로 배치 유지가 적절합니다. |
| `src/features/settings/components/SettingsClient.tsx` | 프리셋 설명 카드 | 모바일 앱 폭이 좁아져 `크리에이터 성장 시장`과 설명이 거의 세로 한 줄처럼 보입니다. | 앱 셸 수정 후에도 설명 문장은 최대 폭에서 자연 줄바꿈되게 유지합니다. 프리셋명은 억지로 한 줄 고정하지 않습니다. |
| `src/app/(app)/uploads/page.tsx` | 업로드 행의 액션 버튼 | 모바일 폭이 충분하지 않으면 `YouTube에 업로드`, 로딩 문구가 밀릴 수 있습니다. | 행을 모바일에서 `flex-col sm:flex-row`로 바꾸고, 버튼은 `shrink-0 whitespace-nowrap`를 줍니다. |

## P1: 반복되거나 덜 필요한 문구

| 위치 | 원본 | 수정안 | 판단 |
|---|---|---|---|
| `src/features/landing/PricingSection.tsx` | 각 가격 카드마다 `1분 단위 과금` | 카드에서는 제거하고 섹션 설명의 `더빙 시간은 1분 단위로 사용합니다.`만 유지 | 같은 정보가 4번 반복됩니다. 섹션 설명에 이미 있어 충분합니다. |
| `src/app/(app)/billing/page.tsx` | `10분` 제목 아래 `10분`, `30분` 제목 아래 `30분` | `pack.label`을 제거하거나 `처음 테스트`, `가장 많이 사용`, `1시간`, `2시간`처럼 의미 있는 보조 라벨로 변경 | 현재는 10분/30분 카드에서 같은 말이 두 번 보여 허술해 보입니다. |
| `src/features/billing/constants/plans.ts` | `{ minutes: 10, label: '10분' }`, `{ minutes: 30, label: '30분' }` | `label`을 optional로 두고 같은 값이면 렌더링하지 않음 | 데이터 구조에서 중복 원인이 생깁니다. |
| `src/app/(app)/youtube/page.tsx` | `... 더빙별로 변경할 수 있습니다.`가 3개 설정마다 반복 | 카드 상단에 `아래 기본값은 새 더빙에 먼저 적용되며, 작업마다 바꿀 수 있습니다.` 한 번만 표시 | 같은 안내가 세 번 반복됩니다. 설정 화면은 더 짧게 보여도 이해됩니다. |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `YouTube 설정 페이지의 기본값으로 채워져 있습니다. 이 영상에만 적용할 값으로 변경할 수 있습니다.` | `기본값이 적용되어 있습니다. 필요하면 이 영상에서만 바꾸세요.` | 의미는 좋지만 문장이 길고 반복 느낌이 있습니다. |
| `src/features/settings/components/SettingsClient.tsx` | 페이지 설명 `앱 언어와 YouTube 기본값을 관리하세요.` + 카드 설명 `앱 언어와 YouTube 제목·설명 번역 기본값을 관리합니다.` | 페이지 설명은 유지, 카드 설명은 `화면 언어와 제목·설명 번역 기본값을 정합니다.` | 바로 아래에서 거의 같은 말을 반복합니다. |
| `src/features/landing/CTASection.tsx`, `src/features/landing/PricingSection.tsx` | `지금 시작하기`가 요금제와 CTA에 반복 | 둘 다 유지 가능. 줄이고 싶다면 CTA는 `더빙 시작하기`로 변경 | CTA 반복은 치명적이지 않지만 같은 화면에서 연달아 보이면 단조롭습니다. |
| 앱 셸 + 페이지 제목 | 사이드바 `결제`, 페이지 제목 `결제` 등 | 유지 | 내비게이션과 현재 페이지 제목은 정상적인 중복입니다. 바꾸지 않아도 됩니다. |
| 약관/개인정보 | `본 서비스` 반복 | 유지 | 법적 문서의 반복은 정확성을 위한 것이므로 서비스 화면과 같은 기준으로 줄이지 않는 편이 낫습니다. |

## P1: 자연스럽게 바꾸면 좋은 문구

| 위치 | 원본 | 수정안 |
|---|---|---|
| `src/features/landing/FeatureShowcase.tsx` | `문장 단위로 번역을 검토하고 수정할 수 있습니다. 브랜드명, 고유명사 보호 기능.` | `문장 단위로 번역을 검토하고 브랜드명·고유명사를 다듬을 수 있습니다.` |
| `src/features/landing/FeatureShowcase.tsx` | `글로벌 진출에 필요한 모든 것` | `다국어 더빙에 필요한 기본 기능` |
| `src/features/landing/HowItWorks.tsx` | `4단계로 글로벌 진출` | `4단계로 다국어 더빙 시작` |
| `src/features/landing/HowItWorks.tsx` | `동영상 선택부터 다국어 업로드까지, 한 흐름으로` | `영상 선택부터 YouTube 업로드까지 한 흐름으로 진행하세요.` |
| `src/lib/i18n/config.ts` | `크리에이터 성장 시장` | `크리에이터 추천 언어` |
| `src/lib/i18n/config.ts` | `YouTube 소비가 크고 현지화 효율이 좋은 국가권을 우선 공략합니다.` | `YouTube 시청자가 많고 현지화 효과를 기대하기 쉬운 언어를 우선 선택합니다.` |
| `src/lib/i18n/config.ts` | `Prioritize regions with large YouTube audiences and efficient localization ROI.` | `Prioritize languages with large YouTube audiences and practical localization potential.` |
| `src/features/landing/ROICalculator.tsx` | `참고 예상 도달 증가율` | `참고용 예상 증가율` |
| `src/features/landing/ROICalculator.tsx` | `최대 +{growthPct}%` | `참고 +{growthPct}%` 또는 `최대 +{growthPct}% 예상` |
| `src/app/(app)/uploads/page.tsx` | `완료된 더빙 영상을 YouTube에 업로드하세요.` | `더빙이 끝난 영상을 YouTube에 올리세요.` |
| `src/features/dubbing/components/steps/UploadSettingsStep.tsx` | `완료 즉시 자동 업로드` | `완료 후 자동 업로드` |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `즉시` | `지금 업로드` |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `예약` | `나중에 업로드` |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `오디오 + Studio` | `오디오 받고 Studio 열기` |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `자막 · 스크립트 편집` | `자막 · 대사 편집` |
| `src/features/dubbing/components/steps/UploadStep.tsx` | `오디오 미리듣기` | `더빙 오디오 확인` |
| `src/features/dubbing/components/steps/TranslationEditStep.tsx` | `채널, 공개 범위, 자막, 아동용 영상, AI 고지 설정을 확인했습니다. 완료 후 자동 업로드를 진행합니다.` | `채널, 공개 범위, 자막, 아동용 여부, AI 표시 설정을 확인했습니다. 완료 후 자동 업로드를 진행합니다.` |
| `src/features/dubbing/components/steps/VideoInputStep.tsx` | `{formatDuration(videoMeta.duration)} 길이` | `길이 {formatDuration(videoMeta.duration)}` |
| `src/app/(app)/youtube/page.tsx` | `기본 업로드 설정` | `업로드 기본값` |
| `src/app/(app)/youtube/page.tsx` | `기본 원문 언어` | `제목·설명 기본 언어` |
| `src/app/(app)/settings/page.tsx` | `앱 언어와 YouTube 기본값을 관리하세요.` | `화면 언어와 YouTube 기본값을 관리하세요.` |
| `src/features/settings/components/SettingsClient.tsx` | `Language and localization` | `Language and YouTube defaults` |

## P2: 유지해도 되지만 더 짧게 만들 수 있는 문구

| 위치 | 현재 | 더 짧은 안 |
|---|---|---|
| `src/app/(app)/metadata/page.tsx` | `더빙 없이 YouTube 제목과 설명만 여러 언어로 번역해 적용합니다.` | `YouTube 제목과 설명만 여러 언어로 번역합니다.` |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `내 채널 영상의 현재 제목·설명과 기존 다국어 번역을 불러옵니다. 이미 번역된 언어는 언어 선택 목록에서 비활성화됩니다.` | `내 채널 영상의 제목·설명과 기존 번역을 불러옵니다. 이미 번역된 언어는 선택할 수 없습니다.` |
| `src/features/metadata/components/MetadataLocalizationTool.tsx` | `YouTube에 새로 올릴 영상 파일을 선택하세요. 번역 후 업로드 시 다국어 제목·설명이 함께 적용됩니다.` | `새로 올릴 영상 파일을 선택하세요. 업로드할 때 다국어 제목·설명이 함께 적용됩니다.` |
| `src/features/dubbing/components/steps/UploadSettingsStep.tsx` | `제목과 설명을 작성할 언어입니다. 업로드 시 대상 언어별로 자동 번역됩니다.` | `제목과 설명을 작성할 언어입니다. 업로드할 때 언어별로 번역됩니다.` |
| `src/features/dubbing/components/steps/ProcessingStep.tsx` | `AI가 전사, 번역, 더빙 오디오 생성을 진행하고 있습니다.` | `자막과 더빙 오디오를 생성하고 있습니다.` |
| `src/features/dubbing/components/YouTubeExtensionUpload.tsx` | `Chrome 확장 프로그램이 필요합니다` | `확장 프로그램이 필요합니다` |

## 줄바꿈을 막아야 하는 부분

| 대상 | 현재 상태 | 권장 |
|---|---|---|
| 가격, 시간, 단위: `₩10,000`, `10분`, `120분`, `100.0K회`, `0%` | 대부분 자연스럽지만 명시적인 보호가 적습니다. | 가격/시간/퍼센트는 `whitespace-nowrap`를 적용해 숫자와 단위가 분리되지 않게 합니다. |
| 짧은 상태 배지: `완료`, `처리 중`, `대기 중`, `Google 로그인 필요` | 배지는 inline-flex라 비교적 안전합니다. | 긴 배지는 모바일에서 줄바꿈보다 축약을 우선합니다. 예: `로그인 필요`, hover/title로 전체 설명. |
| 액션 버튼: `YouTube에 업로드`, `전체 자막 업로드`, `YouTube에 자막 적용`, `오디오 받고 Studio 열기` | 일부 버튼은 좁은 폭에서 줄바꿈될 수 있습니다. | 버튼 자체는 `whitespace-nowrap`, 행 컨테이너는 모바일에서 세로 배치나 `flex-wrap`을 허용합니다. |
| 툴팁 | `whitespace-nowrap` 고정 | 모바일에서 긴 툴팁이 화면 밖으로 나갈 수 있습니다. `max-w-xs whitespace-normal`로 바꾸는 편이 안전합니다. |
| 랜딩 히어로/CTA 설명 | `sm:whitespace-nowrap` | 640~800px 구간에서 문장이 길면 넘칠 수 있습니다. `lg:whitespace-nowrap`로 늦추거나 `max-w`를 좁히고 자연 줄바꿈을 허용합니다. |
| 언어 이름 칩 | 언어명이 긴 경우 줄바꿈 가능 | 칩은 `max-w-full`, 내부 텍스트 `truncate` 또는 `break-keep`을 섞어 카드 폭을 밀지 않게 합니다. |
| 날짜/시간, 작업 시간 | 일부 테이블만 `whitespace-nowrap` | 대시보드/작업 목록의 날짜와 길이는 숫자 단위가 분리되지 않게 `whitespace-nowrap`를 권장합니다. |

## 다크모드/라이트모드 대비와 시각 문제

| 위치 | 현재 | 판단 | 수정안 |
|---|---|---|---|
| 앱 모바일 전체 | 본문 폭이 좁아져 텍스트가 줄 단위로 깨짐 | 대비보다 레이아웃 문제가 먼저입니다. 버튼/셀렉트가 보이지 않는 것처럼 느껴집니다. | 앱 셸 반응형 수정이 최우선입니다. |
| `Button` ghost variant | 다크모드 `dark:text-surface-400`, hover `dark:hover:bg-surface-800` | 보조 버튼에는 괜찮지만 주요 행동 옆에 있을 때 약해 보입니다. | 중요한 보조 액션은 `outline` 또는 `dark:text-surface-200`로 올립니다. |
| `MetadataLocalizationTool` 이미 번역된 언어 칩 | `dark:bg-surface-800 dark:text-surface-500` + `opacity-50` | 다크모드에서 너무 흐려서 “비활성 이유”가 잘 안 보일 수 있습니다. | 비활성은 `opacity-70`, 텍스트 `dark:text-surface-400`, tooltip/title 유지. |
| `UploadSettingsStep` 비활성 토글 | `opacity-60`, 내부 `dark:text-surface-500` | 준비 중 기능이면 흐린 게 맞지만, 배지까지 흐려져 이유가 약합니다. | 행은 흐리게 두되 `준비 중`, `자동 업로드 꺼짐` 배지는 대비를 유지합니다. |
| `billing` 카드 | 미선택 카드가 다크모드에서 border 중심 | 클릭 가능한 카드라는 신호가 약합니다. | 미선택도 `dark:bg-surface-900`, hover는 `dark:bg-surface-800/70`; 선택 시 border와 bg를 더 강하게. |
| 작은 도움말 전반 | `text-xs text-surface-400` | 단순 보조 정보는 괜찮지만, YouTube 권한/기본값/업로드 정책처럼 행동에 영향 주는 설명은 낮습니다. | 중요한 도움말은 `text-surface-500 dark:text-surface-300` 또는 `text-sm`로 올립니다. |
| 랜딩 CTA | `text-white/80`, 흰색 ghost 버튼 | 실제 화면에서 충분히 보입니다. | 유지 가능. |
| Google 시작 버튼 | 명시 색상 `#131314`, `#e3e3e3` | Google 버튼 스타일로 충분히 보입니다. | 유지 가능. |
| 차트 축/빈 상태 | `#a1a1aa`, `text-surface-400` | 빈 상태는 괜찮고, 차트 축은 보조 정보라 허용 가능. | 데이터 해석에 중요한 축이면 `surface-500/300`으로 올립니다. |

## 페이지별 판단

### 랜딩

- `보이스 클론`, `YouTube 업로드`, `{n}개 언어`는 반복되지만 핵심 가치라 유지 가능합니다.
- `1분 단위 과금`은 카드마다 반복하지 않는 편이 낫습니다.
- `글로벌 진출`, `공략`, `ROI`는 일반 유튜버에게 살짝 광고/전략 문서처럼 느껴집니다. `다국어 더빙`, `추천 언어`, `효과를 기대하기 쉬운 언어` 쪽이 자연스럽습니다.
- 히어로와 CTA의 `sm:whitespace-nowrap`는 작은 태블릿에서 위험합니다. 모바일은 줄바꿈 허용, 넓은 화면만 한 줄 고정이 좋습니다.

### 대시보드

- `대시보드`, `더빙 현황을 확인하세요.`, `빠른 시작`, `최근 작업`은 자연스럽습니다.
- 차트의 `언어별 성과`, `더빙 시간 사용량`, `시청 분석`은 유지 가능합니다.
- 빈 상태 `새 더빙을 시작하세요.`는 적절합니다.

### 새 더빙 위저드

- 단계명은 짧고 좋습니다.
- `완료 즉시 자동 업로드`는 `완료 후 자동 업로드`가 더 안정적입니다.
- `즉시`, `예약`은 버튼만 보면 행동이 약합니다. `지금 업로드`, `나중에 업로드`가 더 낫습니다.
- `오디오 + Studio`는 기능을 모르는 사용자가 이해하기 어렵습니다. `오디오 받고 Studio 열기`로 바꾸는 편이 좋습니다.
- `자막 · 스크립트 편집`은 혼용 느낌이 있습니다. 일반 사용자 기준은 `자막 · 대사 편집`이 더 자연스럽습니다.

### 제목·설명 번역

- 페이지 제목 `YouTube 제목·설명 번역`은 좋습니다.
- `내 영상 불러오기`, `새 영상 올리기`도 기능과 맞습니다.
- 다만 설명 문장이 조금 깁니다. `기존 번역`, `선택할 수 없습니다`처럼 줄이면 더 실제 서비스 같습니다.
- 이미 번역된 언어 칩은 다크모드에서 너무 약합니다.

### YouTube 설정

- 같은 `더빙별로 변경할 수 있습니다.` 설명이 세 번 반복됩니다.
- 반복 안내는 카드 상단에 한 번만 두고 각 필드는 짧게 유지하는 편이 좋습니다.
- `기본 업로드 설정`보다 `업로드 기본값`이 더 간결합니다.

### YouTube 업로드

- 페이지 설명은 자연스럽지만 `업로드하세요`보다 `올리세요`가 더 가볍고 일반적입니다.
- 모달의 설정 라벨은 전반적으로 괜찮습니다.
- 업로드 행은 모바일에서 액션 버튼이 줄바꿈/압축될 가능성이 있어 레이아웃 보강이 필요합니다.

### 결제

- 페이지 설명과 결제 내역 문구는 괜찮습니다.
- `pack.label` 중복은 꼭 정리하는 편이 좋습니다.
- `결제는 원화(KRW)로 처리됩니다.`는 유지 가능하지만, 너무 흐리게 보이면 카드 하단 안내로 내려도 됩니다.

### 설정

- 기능은 이해되지만 페이지 설명과 카드 설명이 거의 같은 의미입니다.
- 프리셋명 `크리에이터 성장 시장`은 전략 문서 느낌이 있어 `크리에이터 추천 언어`가 더 서비스답습니다.
- 모바일 폭 문제 때문에 가장 많이 깨져 보인 화면입니다.

### 약관/개인정보

- 법적 문서라 반복이 있어도 큰 문제는 없습니다.
- 이전 보고서의 `휴먼 리뷰`, `as-is`, 기술 용어 완화 정도만 나중에 반영하면 됩니다.

### 운영 화면

- 일반 사용자에게는 `/ops`가 404로 보이고 사이드바에도 숨겨져 있어 정상입니다.
- 운영자 화면까지 확인할 경우에는 표의 시간/심각도/참조 값은 줄바꿈 방지가 필요합니다.

## 그대로 둬도 되는 항목

| 항목 | 이유 |
|---|---|
| 사이드바 메뉴명과 페이지 제목의 중복 | 내비게이션과 현재 위치 표시라 정상입니다. |
| `YouTube` 영어 표기 | 브랜드/서비스명이므로 한국어 UI에서도 유지가 자연스럽습니다. |
| `Google로 시작하기`, `Google 계정으로 연결` | OAuth 로그인 흐름이라 명확합니다. |
| `SRT` 병기 | 고급 다운로드/자막 기능에서는 유지 가능하지만, 기본 버튼은 `자막`이 더 좋습니다. |
| 약관/개인정보의 반복 표현 | 법적 정확성을 우선합니다. |
| `로딩 중`, `불러오는 중`, `업로드 중` 반복 | 상태 문구라 화면별 반복이 자연스럽습니다. |

## 적용 순서 제안

1. 앱 셸 모바일 레이아웃을 먼저 수정합니다. 이 문제가 남아 있으면 좋은 문구도 깨져 보입니다.
2. 결제/요금제 중복을 정리합니다. `1분 단위 과금`, `pack.label`이 가장 눈에 띕니다.
3. 랜딩의 과한 전략/마케팅 표현을 일반 유튜버 말투로 낮춥니다.
4. `YouTube 설정`, `설정`, `메타데이터 번역`의 반복 도움말을 줄입니다.
5. 버튼 줄바꿈 방지와 다크모드 비활성/보조문 대비를 보강합니다.
