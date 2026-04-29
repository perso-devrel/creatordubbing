import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '개인정보처리방침 — Dubtube',
  description:
    'Dubtube의 개인정보처리방침. YouTube API Services 데이터 사용, 수집·보관·삭제 정책을 안내합니다.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '2026-04-29'

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-surface-700 dark:text-surface-300">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
          개인정보처리방침
        </h1>
        <p className="mt-2 text-sm text-surface-500">최종 업데이트: {LAST_UPDATED}</p>
      </header>

      <Section title="1. 개요">
        <p>
          Dubtube(&ldquo;본 서비스&rdquo;)는 YouTube 크리에이터가 자신의 영상을 다국어로 더빙하고
          자막·오디오 트랙을 YouTube에 업로드할 수 있도록 돕는 서비스입니다. 본 방침은 Dubtube가
          사용자로부터 수집·이용·보관·파기하는 개인정보의 범위와 방법을 설명합니다.
        </p>
        <p>
          Dubtube는{' '}
          <ExternalA href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </ExternalA>
          를 준수하며, 동 정책의 Limited Use 요구사항을 포함하여 적용됩니다.
        </p>
      </Section>

      <Section title="2. 수집하는 정보">
        <h3 className="mt-4 font-semibold text-surface-900 dark:text-white">2.1 Google 계정 정보</h3>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>이메일 주소, 이름, 프로필 사진(Google OpenID Connect 표준 클레임)</li>
          <li>OAuth 2.0 액세스 토큰 / 리프레시 토큰</li>
        </ul>

        <h3 className="mt-6 font-semibold text-surface-900 dark:text-white">
          2.2 YouTube 데이터 (사용자 명시 동의 후)
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>채널 정보(채널명, 구독자 수, 채널 ID, 채널 썸네일)</li>
          <li>영상 메타데이터(제목, 설명, 썸네일, 조회수, 게시일)</li>
          <li>사용자가 더빙 대상으로 지정한 영상의 오디오/자막 데이터</li>
          <li>사용자가 업로드 권한을 부여한 영상에 대한 자막(SRT) 및 오디오 트랙</li>
        </ul>

        <h3 className="mt-6 font-semibold text-surface-900 dark:text-white">
          2.3 서비스 이용 데이터
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>더빙 작업 기록(원본 언어, 대상 언어, 처리 상태, 결과 URL)</li>
          <li>크레딧 사용 내역</li>
          <li>업로드 큐 상태</li>
        </ul>
      </Section>

      <Section title="3. 정보 사용 목적">
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>더빙 영상·오디오·자막 생성 및 사용자 YouTube 채널로의 업로드</li>
          <li>다국어 자막 트랙 추가/교체(YouTube Captions API 사용)</li>
          <li>크레딧 차감·결제·잔여량 표시</li>
          <li>사용자 인증 및 세션 유지</li>
          <li>서비스 안정성 모니터링 및 오류 진단</li>
        </ul>
        <p className="mt-4">
          Dubtube는 YouTube API Services를 통해 받은 사용자 데이터를{' '}
          <strong>광고 또는 외부 마케팅 목적으로 사용·전송하지 않으며</strong>,
          모델 학습·휴먼 리뷰 등에도 사용하지 않습니다.
        </p>
      </Section>

      <Section title="4. 제3자 제공 및 처리 위탁">
        <p>다음의 처리 위탁사에 한해, 서비스 제공 목적으로 필요한 최소 범위에서 데이터를 전달합니다.</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <strong>Perso.ai</strong> — 보이스 클론, 음성 합성, 번역 처리. 사용자가 더빙
            대상으로 지정한 영상/오디오 데이터에 한해 전달됨.
          </li>
          <li>
            <strong>Google (YouTube Data API)</strong> — 채널/영상 조회, 영상·자막·오디오 트랙 업로드.
          </li>
          <li>
            <strong>Vercel</strong> — 웹 애플리케이션 호스팅, 로그 수집(IP/User-Agent 기본 로그).
          </li>
          <li>
            <strong>Turso (libSQL)</strong> — 사용자 계정·작업 기록 데이터베이스 호스팅.
          </li>
        </ul>
        <p className="mt-4">
          위 외의 제3자에게는 사용자의 명시적 동의 없이 제공하지 않습니다.
          단, 법령에 따라 수사기관의 적법한 요청이 있는 경우는 예외로 합니다.
        </p>
      </Section>

      <Section title="5. 보관 기간 및 파기">
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>계정 정보: 회원 탈퇴 또는 계정 연결 해제 시 즉시 파기</li>
          <li>OAuth 토큰: 사용자가 Google 계정 연결을 해제하거나 권한을 회수하면 즉시 폐기</li>
          <li>더빙 작업 기록: 작업 완료일로부터 12개월 보관 후 자동 파기 (사용자가 즉시 삭제 요청 가능)</li>
          <li>결제·과금 관련 기록: 관련 법령(전자상거래법 등)에 따라 5년간 보관</li>
        </ul>
      </Section>

      <Section title="6. 사용자 권리">
        <p>사용자는 언제든 다음을 요청할 수 있습니다.</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>본인 데이터의 열람/정정/삭제</li>
          <li>처리 정지 또는 동의 철회</li>
          <li>YouTube/Google 권한 회수 — {' '}
            <ExternalA href="https://myaccount.google.com/permissions">
              Google 계정 보안 → 타사 앱 액세스
            </ExternalA>
            에서 직접 회수 가능
          </li>
        </ul>
        <p className="mt-4">
          위 요청은 본 페이지 하단의 연락처로 이메일을 보내주시면 영업일 기준 7일 이내에 처리합니다.
        </p>
      </Section>

      <Section title="7. 보안">
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>모든 통신은 HTTPS(TLS 1.2 이상)로 암호화됩니다.</li>
          <li>OAuth 액세스 토큰은 HttpOnly·Secure 쿠키로만 저장되며, 클라이언트 JavaScript에서 직접 접근할 수 없습니다.</li>
          <li>리프레시 토큰은 서버 측 데이터베이스에서 암호화 저장됩니다.</li>
          <li>세션은 HMAC-SHA256으로 서명된 쿠키를 사용합니다.</li>
        </ul>
      </Section>

      <Section title="8. 쿠키">
        <p>
          본 서비스는 사용자 인증과 환경 설정을 위해 다음 쿠키를 사용합니다:
          {' '}<code>dubtube_session</code> (세션 식별), <code>google_access_token</code> (YouTube
          API 호출용 단기 토큰), <code>dubtube-theme</code> (라이트/다크 모드 설정),
          <code> dubtube-youtube-settings</code> (사용자 기본 업로드 설정).
        </p>
      </Section>

      <Section title="9. 미성년자 보호">
        <p>
          Dubtube는 만 14세 미만의 개인정보를 수집하지 않습니다. 미성년자가 서비스를 이용할
          경우 법정대리인의 동의가 필요합니다.
        </p>
      </Section>

      <Section title="10. 본 방침의 변경">
        <p>
          본 방침이 변경되는 경우, 변경 사항은 본 페이지에 공지하고 적용 7일 전부터 알립니다.
          중요한 변경(데이터 사용 목적의 확대 등)의 경우 사용자에게 별도 동의를 다시 요청할 수
          있습니다.
        </p>
      </Section>

      <Section title="11. 연락처">
        <p>
          개인정보 관련 문의는{' '}
          <a
            href="mailto:devrel.365@gmail.com"
            className="text-brand-600 hover:underline dark:text-brand-400"
          >
            devrel.365@gmail.com
          </a>
          으로 보내주세요.
        </p>
      </Section>

      <footer className="mt-12 border-t border-surface-200 pt-6 text-sm text-surface-500 dark:border-surface-800">
        <p>
          관련 문서:{' '}
          <Link href="/terms" className="text-brand-600 hover:underline dark:text-brand-400">
            서비스 약관
          </Link>{' '}
          ·{' '}
          <ExternalA href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </ExternalA>{' '}
          ·{' '}
          <ExternalA href="https://www.youtube.com/t/terms">
            YouTube Terms of Service
          </ExternalA>
        </p>
      </footer>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-surface-900 dark:text-white">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  )
}

function ExternalA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-600 hover:underline dark:text-brand-400"
    >
      {children}
    </a>
  )
}
