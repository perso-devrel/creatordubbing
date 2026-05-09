import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '서비스 약관 — Dubtube',
  description:
    'Dubtube 서비스 약관. YouTube API Services Terms of Service 동의를 포함합니다.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '2026-04-29'

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-surface-700 dark:text-surface-300">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
          서비스 약관
        </h1>
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">최종 업데이트: {LAST_UPDATED}</p>
      </header>

      <Section title="1. 약관의 동의">
        <p>
          본 약관은 Dubtube(&ldquo;본 서비스&rdquo;)의 이용 조건을 규정합니다. 본 서비스에
          가입하거나 사용함으로써 사용자는 본 약관과{' '}
          <Link href="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
            개인정보처리방침
          </Link>
          에 동의한 것으로 간주됩니다. 또한 사용자는 본 서비스가 YouTube API Services를 사용하므로,{' '}
          <ExternalA href="https://www.youtube.com/t/terms">YouTube Terms of Service</ExternalA>
          에도 함께 동의해야 합니다.
        </p>
      </Section>

      <Section title="2. 서비스 개요">
        <p>
          Dubtube는 YouTube 크리에이터가 자신의 영상을 다국어로 자동 더빙하고, 결과물을 영상·자막·오디오
          트랙 형태로 YouTube에 업로드할 수 있게 하는 웹 서비스입니다. 본 서비스는 다음
          제3자 API를 사용합니다:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <strong>YouTube Data API v3</strong> — 채널/영상 조회, 영상·자막·오디오 트랙 업로드
          </li>
          <li>
            <strong>YouTube Analytics API</strong> — 사용자 채널의 분석 데이터 표시
          </li>
          <li>
            <strong>Perso.ai API</strong> — 보이스 클론, 음성 합성, 번역
          </li>
        </ul>
      </Section>

      <Section title="3. 계정 및 인증">
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>본 서비스는 Google OAuth 2.0을 통한 로그인만 제공합니다.</li>
          <li>사용자는 정확한 정보를 제공해야 하며, 계정 보안에 대한 책임을 집니다.</li>
          <li>한 사용자는 하나의 계정만 가질 수 있으며, 계정 양도는 금지됩니다.</li>
        </ul>
      </Section>

      <Section title="4. 사용자 의무">
        <p>사용자는 본 서비스를 이용함에 있어 다음 행위를 하지 않습니다.</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>저작권자의 동의 없이 타인의 영상을 더빙·업로드하는 행위</li>
          <li>YouTube 커뮤니티 가이드 및 저작권 정책에 위배되는 콘텐츠 생성</li>
          <li>딥페이크 등 타인의 명예를 훼손하거나 사기에 이용될 수 있는 콘텐츠 생성</li>
          <li>본 서비스의 API/시스템에 대한 비정상적·자동화된 호출(스크래핑, DDoS 등)</li>
          <li>더빙 시간 또는 결제 시스템의 회피·부정 사용</li>
        </ul>
      </Section>

      <Section title="5. YouTube API Services 동의 및 제한">
        <p>
          본 서비스를 사용함으로써 사용자는{' '}
          <ExternalA href="https://www.youtube.com/t/terms">
            YouTube Terms of Service
          </ExternalA>
          에 동의하게 됩니다. YouTube로부터 데이터에 대한 권한을 부여받는 시점부터 다음의
          제한이 적용됩니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            사용자는 언제든{' '}
            <ExternalA href="https://myaccount.google.com/permissions">
              Google 계정 보안 → 타사 앱 액세스
            </ExternalA>
            에서 Dubtube의 권한을 회수할 수 있습니다.
          </li>
          <li>
            본 서비스는 받은 YouTube 데이터를 광고·마케팅 목적으로 사용하거나 외부에 양도하지
            않습니다.
          </li>
          <li>
            본 서비스가 저장·캐시한 YouTube 채널/영상 데이터는 서비스 표시와 안정성을 위해 필요한
            기간 동안 보관되며, 사용자 요청 또는 YouTube 연결 해제 시 삭제 또는 갱신 중단 처리됩니다.
          </li>
        </ul>
      </Section>

      <Section title="6. 더빙 시간 및 결제">
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>본 서비스는 더빙 1분당 충전한 더빙 시간 1분을 차감하는 선불 모델을 사용합니다.</li>
          <li>구매한 더빙 시간은 환불되지 않으나, 만료 기한은 없습니다.</li>
          <li>본 서비스 장애로 처리가 실패한 작업은 차감된 더빙 시간이 자동 환원됩니다.</li>
        </ul>
      </Section>

      <Section title="7. 지적 재산권">
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            본 서비스가 생성한 더빙 영상·자막·오디오의 저작권은 원본 영상의 권리자(통상 사용자
            본인)에게 귀속됩니다.
          </li>
          <li>
            Dubtube의 로고·UI·코드 등 서비스 자체의 지적 재산권은 Dubtube에 귀속됩니다.
          </li>
          <li>
            보이스 클론에 사용되는 사용자 음성은 사용자 본인 또는 사용자가 권리를 보유한
            인물의 것이어야 합니다.
          </li>
        </ul>
      </Section>

      <Section title="8. 면책 및 책임 제한">
        <p>
          본 서비스는 &ldquo;있는 그대로(as-is)&rdquo; 제공되며, 다음 사항에 대해서는 명시적으로
          면책됩니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>제3자 API(YouTube, Google, Perso.ai)의 장애 또는 정책 변경으로 인한 서비스 중단</li>
          <li>사용자가 업로드한 콘텐츠로 인한 저작권/명예훼손 분쟁</li>
          <li>AI 더빙 결과물의 정확성·자연스러움</li>
          <li>천재지변, 정전, 네트워크 장애 등 불가항력적 사유로 인한 손해</li>
        </ul>
        <p className="mt-4">
          Dubtube의 책임은 사용자가 본 서비스에 직전 12개월간 지불한 금액을 한도로 합니다.
        </p>
      </Section>

      <Section title="9. 서비스 변경 및 종료">
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            본 서비스는 사전 공지 후 기능을 변경하거나 일부 기능을 종료할 수 있습니다.
          </li>
          <li>
            사용자는 언제든 계정 연결 해제로 서비스 이용을 중단할 수 있으며, 이 경우 본 서비스가
            보유한 사용자 데이터는 개인정보처리방침에 따라 파기됩니다.
          </li>
          <li>
            사용자가 본 약관을 중대하게 위반한 경우 사전 공지 없이 계정 이용이 정지될 수
            있습니다.
          </li>
        </ul>
      </Section>

      <Section title="10. 약관의 변경">
        <p>
          본 약관이 변경되는 경우 변경 사항은 본 페이지에 공지하고, 적용 7일 전부터 알립니다.
          중요한 변경의 경우 사용자에게 별도 동의를 다시 요청할 수 있습니다.
        </p>
      </Section>

      <Section title="11. 준거법 및 분쟁 해결">
        <p>
          본 약관은 대한민국 법령에 따라 해석되며, 본 서비스 이용과 관련하여 분쟁이 발생할 경우
          서울중앙지방법원을 1심 관할 법원으로 합니다.
        </p>
      </Section>

      <Section title="12. 연락처">
        <p>
          본 약관에 관한 문의는{' '}
          <a
            href="mailto:devrel.365@gmail.com"
            className="text-brand-600 hover:underline dark:text-brand-400"
          >
            devrel.365@gmail.com
          </a>
          으로 보내주세요.
        </p>
      </Section>

      <footer className="mt-12 border-t border-surface-200 pt-6 text-sm text-surface-500 dark:border-surface-800 dark:text-surface-300">
        <p>
          관련 문서:{' '}
          <Link href="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
            개인정보처리방침
          </Link>{' '}
          ·{' '}
          <ExternalA href="https://www.youtube.com/t/terms">
            YouTube Terms of Service
          </ExternalA>{' '}
          ·{' '}
          <ExternalA href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </ExternalA>
          {' '}·{' '}
          <ExternalA href="https://policies.google.com/privacy">
            Google Privacy Policy
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
