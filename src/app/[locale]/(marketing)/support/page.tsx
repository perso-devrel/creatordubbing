import type { Metadata } from 'next'
import { LocaleLink } from '@/components/i18n/LocaleLink'
import {
  getMarketingMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'

const SUPPORT_EMAIL = 'gyuwon05@gmail.com'

const copy = {
  ko: {
    title: '지원 및 문의',
    description: 'sub2tube 이용, 계정, YouTube 연결, 데이터 삭제와 관련된 문의 안내입니다.',
    heading: '지원 및 문의',
    intro:
      '서비스 이용 중 문제가 있거나 Google/YouTube 권한, 데이터 삭제, 결제, 업로드 상태 확인이 필요하면 아래 연락처로 문의해 주세요.',
    emailTitle: '문의 이메일',
    emailBody: '영업일 기준 7일 이내에 답변하거나 진행 상황을 안내합니다.',
    includeTitle: '문의할 때 포함하면 좋은 정보',
    includeItems: [
      '가입한 Google 이메일 주소',
      '문제가 발생한 작업 ID 또는 업로드 ID',
      '문제가 발생한 시간과 화면',
      '브라우저 콘솔 오류 또는 스크린샷이 있다면 함께 첨부',
    ],
    revokeTitle: 'Google/YouTube 권한 해제',
    revokeBody:
      'YouTube 연결은 sub2tube 설정 화면에서 해제할 수 있고, Google 계정 권한 페이지에서도 직접 취소할 수 있습니다.',
    deletionTitle: '데이터 삭제 요청',
    deletionBody:
      '계정 정보, OAuth 토큰, 작업 기록, 업로드 대기열 기록 삭제를 요청할 수 있습니다. 결제 및 정산 관련 기록은 관련 법령에서 요구하는 기간 동안만 보관됩니다.',
    linksTitle: '관련 문서',
    privacy: '개인정보처리방침',
    terms: '서비스 약관',
    googlePermissions: 'Google 계정 권한 관리',
  },
  en: {
    title: 'Support and Contact',
    description: 'How to contact sub2tube about product support, accounts, YouTube access, and data deletion.',
    heading: 'Support and Contact',
    intro:
      'If you need help with the Service, Google/YouTube permissions, data deletion, payments, or upload status, contact us at the email below.',
    emailTitle: 'Support email',
    emailBody: 'We will respond or provide a status update within 7 business days.',
    includeTitle: 'Helpful details to include',
    includeItems: [
      'the Google email address used to sign in',
      'the affected job ID or upload ID',
      'the time and page where the issue occurred',
      'browser console errors or screenshots, if available',
    ],
    revokeTitle: 'Revoke Google/YouTube access',
    revokeBody:
      'You can disconnect YouTube from the sub2tube settings page or revoke access directly from your Google account permissions page.',
    deletionTitle: 'Data deletion requests',
    deletionBody:
      'You may request deletion of account information, OAuth tokens, job records, and upload queue records. Payment and settlement records are retained only for the period required by applicable law.',
    linksTitle: 'Related documents',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    googlePermissions: 'Google account permissions',
  },
} as const

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getMarketingMetadata(locale, 'support')
}

export default async function SupportPage({ params }: LocaleMetadataProps) {
  const locale = await resolveMetadataLocale(params)
  const content = copy[locale]

  return (
    <article className="document-shell">
      <header className="mb-10 border-b border-surface-200 pb-8 dark:border-surface-800">
        <h1 className="text-3xl font-semibold text-surface-950 dark:text-white sm:text-4xl">
          {content.heading}
        </h1>
        <p className="mt-3 break-keep leading-7 text-surface-600 dark:text-surface-300">
          {content.intro}
        </p>
      </header>

      <Section title={content.emailTitle}>
        <p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p>{content.emailBody}</p>
      </Section>

      <Section title={content.includeTitle}>
        <ul className="list-disc space-y-1 pl-6">
          {content.includeItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Section>

      <Section title={content.revokeTitle}>
        <p>{content.revokeBody}</p>
        <p>
          <ExternalA href="https://myaccount.google.com/permissions">
            {content.googlePermissions}
          </ExternalA>
        </p>
      </Section>

      <Section title={content.deletionTitle}>
        <p>{content.deletionBody}</p>
      </Section>

      <Section title={content.linksTitle}>
        <p className="space-x-2">
          <LocaleLink href="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
            {content.privacy}
          </LocaleLink>
          <span aria-hidden="true">·</span>
          <LocaleLink href="/terms" className="text-brand-600 hover:underline dark:text-brand-400">
            {content.terms}
          </LocaleLink>
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-surface-950 dark:text-white">{title}</h2>
      <div className="mt-3 space-y-3 leading-7">{children}</div>
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
