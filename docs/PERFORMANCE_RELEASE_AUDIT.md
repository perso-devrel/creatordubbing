# Dubtube 성능 및 출시 전 감사 보고서

작성일: 2026-05-11
상태: 2차 수정 및 재검증 완료, 커밋 미진행

## 요약

초기 병목은 단일 원인이 아니라 i18n 전체 번들 포함, request-time layout API, app layout의 전역 DB 조회, Dubbing wizard의 모든 step 선로딩, Dashboard chart 라이브러리 비용, 남아 있던 과거 코드가 함께 만든 문제였다.

2차 수정까지 적용한 뒤 root/extension 모두 `knip`이 깨끗하게 통과한다. production Lighthouse는 Performance 94, Accessibility 100, Best Practices 100, SEO 100이며, TBT 60ms와 CLS 0이라 현재 기준으로 reflow/repaint가 주요 병목이라는 증거는 약하다. 다만 LCP 3.1s는 이상 목표인 2.5s보다 높아서 다음 최적화 대상이다.

## 적용한 수정

### 렌더링 및 번들

- `src/app/layout.tsx`에서 request-time `headers()`/`cookies()` 사용을 제거했다.
- `src/app/[locale]/(app)/layout.tsx`의 전역 `isOperationsAdminFromCookies()` 호출을 제거했다.
- ops 접근 확인은 `src/features/ops/hooks/useOperationsAccess.ts`의 클라이언트 lazy query로 이동했다.
- `src/features/dubbing/components/DubbingWizard.tsx` step 컴포넌트를 `next/dynamic` 기반으로 분리했다.
- landing first viewport가 아래 섹션 전체를 client bundle에 끌어오지 않도록 `src/features/landing/DeferredLandingSections.tsx`를 추가했다.
- Dashboard chart에서 `recharts`를 제거하고 `CreditChart`, `LanguagePerformance`, `AnalyticsChart`를 SVG/CSS 기반 경량 구현으로 교체했다.
- `recharts` dependency와 이전에 사용하지 않던 `eslint-config-next` devDependency를 제거했다.

### i18n

- `src/lib/i18n/clientMessages.tsx`와 `src/lib/i18n/client-messages/*`를 추가해 client message를 common/route 단위로 분리했다.
- 각 route layout이 필요한 message subset만 주입하도록 변경했다.
- `scripts/generate-client-messages.mjs`와 `npm run i18n:client-messages`를 추가했다.
- `npm run i18n:client-messages` 재실행 결과 추가 diff 없이 재생성 가능함을 확인했다.

### 과거 코드 및 unused export 정리

- 삭제: `ThemeToggleButton.tsx`, `AuthGuard.tsx`, `src/utils/constants.ts`, `src/components/ui/Tooltip.tsx`.
- 정리: `CardHeader`, `CardDescription`, `getExtensionId`, `countText`, `toSRT` 등 미사용 export 제거.
- 정리: 오래된 credit/upload queue helper, 미사용 DB barrel export, 내부 전용 ops/i18n/toss/validator helper export 제거.
- 정리: extension의 미사용 response type과 selector export 제거.
- 추가: root `knip.json`, extension `extension/knip.json`.
- `npx --yes knip`, `npx --yes knip --config knip.json` 모두 출력 없이 통과.

## 성능 결과

| 항목 | 최초 조사 | 1차 수정 후 | 2차 수정 후 |
| --- | ---: | ---: | ---: |
| Lighthouse Performance | 92 | 92 | 94 |
| Accessibility / Best Practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 | 100 / 100 / 100 |
| FCP | 1.2s | 1.2s | 0.9s |
| LCP | 3.3s | 3.3s | 3.1s |
| TBT | 40ms | 30ms | 60ms |
| CLS | 0 | 0 | 0 |
| `.next/static/chunks` JS | 약 11,493KB | 약 2,138KB | 1,317.1KB |
| Lighthouse total byte weight | - | - | 339KiB |

추가로 `/ko` 직접 진입 Lighthouse도 생성했다. 결과는 Performance 94, FCP 0.8s, LCP 3.1s, TBT 80ms, CLS 0으로 `/` redirect 측정과 거의 동일했다. 이 실행은 Windows Chrome 임시 프로필 삭제 `EPERM` 때문에 exit code 1을 반환했지만 `tests/snapshots/lighthouse-ko.report.json/html`은 정상 생성 및 파싱 가능했다.

## Reflow/Repaint 확인

Chrome Performance metrics를 모바일 viewport 기준으로 별도 측정했다.

| 경로 | Task | Script | Layout | Recalc Style | Layout Count | Recalc Count |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` initial | 212ms | 49ms | 55ms | 9ms | 3 | 5 |
| `/ko` initial | 173ms | 39ms | 62ms | 11ms | 4 | 8 |
| `/ko` landing scroll delta | 135ms | 37ms | 47ms | 11ms | 7 | 34 |
| `/ko/dubbing` signed probe | 303ms | 79ms | 43ms | 8ms | 6 | 22 |
| `/ko/dashboard` signed probe | 276ms | 86ms | 50ms | 13ms | 5 | 17 |

판단: layout/recalc 비용은 낮은 편이고 CLS도 0이다. 현재 느린 체감의 주된 원인은 reflow/repaint보다 JS 다운로드/실행량, lazy boundary 이전의 client component 비용, LCP render delay 쪽에 가깝다.

## 출시 전 검증 결과

- `npm run lint`: 통과
- `npm run typecheck`: 통과
- `npm run test`: 46 files, 544 tests 통과
- `npm run build`: 통과
- `npm run i18n:client-messages`: 통과, 추가 diff 없음
- `npx --yes knip`: 통과
- `npm audit --audit-level=moderate`: 취약점 0
- `npm run test:e2e`: 54 Playwright tests 통과
- Lighthouse production report: Performance 94 / A11y 100 / Best Practices 100 / SEO 100
- `npm run test:lighthouse:prod:parse`: 통과
- `npm run test:lighthouse:gate`: 통과
- `npm run test:lighthouse:a11y`: label, color-contrast, canonical 모두 score 1
- `npm --prefix extension run typecheck`: 통과
- `npm --prefix extension run lint`: 통과
- `npm --prefix extension run test`: 9 files, 75 tests 통과
- `npm --prefix extension run build`: 통과
- `npm --prefix extension audit --audit-level=moderate`: 취약점 0
- `npx --yes knip --config knip.json` in `extension`: 통과

## 남은 이슈

1. LCP가 3.1s로 아직 2.5s 목표보다 높다. redirect를 제거해도 동일해서 locale redirect 자체가 주원인은 아니다.
2. Lighthouse가 LCP element detail을 명확히 노출하지 않아, 다음 단계는 Chrome trace 또는 Web Vitals attribution으로 LCP node를 직접 찍는 방식이 필요하다.
3. signed app page 수동 probe에서 일부 API resource 401 로그가 잡혔다. Playwright의 signed dubbing flow는 통과하므로 라우팅/렌더링 회귀는 아니지만, 테스트용 legacy cookie와 실제 DB session 간 차이는 별도 테스트 계정/seed로 보강하는 편이 좋다.
4. Lighthouse CLI가 Windows에서 Chrome 임시 프로필 cleanup `EPERM`을 간헐적으로 낸다. CI에서는 전용 user-data-dir 또는 Playwright 기반 Lighthouse 대체 측정을 고려할 필요가 있다.

## 추가 수정 플랜

1. LCP attribution 추가: `web-vitals` attribution 또는 Playwright CDP trace로 LCP element, render delay, font delay를 파일로 남긴다.
2. Hero LCP 최적화: LCP node가 hero heading이면 critical CSS/font preload와 first viewport DOM 축소를 적용하고, 이미지/배경이면 fetch priority와 사이즈 예약을 조정한다.
3. App page authenticated 성능 테스트 보강: 테스트 DB seed와 v2 session cookie를 만들어 dashboard/dubbing의 실제 데이터 로딩 상태로 Playwright perf probe를 고정한다.
4. Lighthouse 안정화: Windows 임시 프로필 cleanup 실패를 피하도록 전용 Chrome user data dir 또는 Playwright trace 기반 성능 스크립트를 추가한다.
5. CI preflight 정리: `lint`, `typecheck`, `test`, `build`, `knip`, `audit`, extension 검증, Playwright, Lighthouse gate를 한 번에 실행하는 release check script를 추가한다.
