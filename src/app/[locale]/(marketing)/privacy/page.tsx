import type { Metadata } from 'next'
import { LocaleLink } from '@/components/i18n/LocaleLink'
import {
  getMarketingMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { legalMessage, type LegalMessageKey } from '@/lib/i18n/legal'
import type { AppLocale } from '@/lib/i18n/config'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getMarketingMetadata(locale, 'privacy')
}

const LAST_UPDATED = '2026-05-14'

export default async function PrivacyPolicyPage({ params }: LocaleMetadataProps) {
  const locale = await resolveMetadataLocale(params)
  const t = (key: LegalMessageKey, params?: Parameters<typeof legalMessage>[2]) => legalMessage(locale, key, params)

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-surface-700 dark:text-surface-300">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
          {t('legal.privacy.title')}
        </h1>
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
          {t('legal.common.lastUpdated', { date: LAST_UPDATED })}
        </p>
      </header>

      <Section title={t('legal.privacy.section.1.title')}>
        <p>{t('legal.privacy.section.1.body.1')}</p>
        <p>
          {t('legal.privacy.section.1.beforeGooglePolicy')}
          <ExternalA href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </ExternalA>
          {t('legal.privacy.section.1.afterGooglePolicyBeforePrivacy')}
          <ExternalA href="https://policies.google.com/privacy">
            {t('legal.link.googlePrivacyPolicy')}
          </ExternalA>
          {t('legal.privacy.section.1.afterPrivacy')}
        </p>
      </Section>

      <Section title={t('legal.privacy.section.2.title')}>
        <Subheading>{t('legal.privacy.section.2.1.title')}</Subheading>
        <Bullets locale={locale} keys={[
          'legal.privacy.section.2.1.item.1',
          'legal.privacy.section.2.1.item.2',
        ]} />

        <Subheading>{t('legal.privacy.section.2.2.title')}</Subheading>
        <Bullets locale={locale} keys={[
          'legal.privacy.section.2.2.item.1',
          'legal.privacy.section.2.2.item.2',
          'legal.privacy.section.2.2.item.3',
          'legal.privacy.section.2.2.item.4',
        ]} />

        <Subheading>{t('legal.privacy.section.2.3.title')}</Subheading>
        <Bullets locale={locale} keys={[
          'legal.privacy.section.2.3.item.1',
          'legal.privacy.section.2.3.item.2',
          'legal.privacy.section.2.3.item.3',
        ]} />
      </Section>

      <Section title={t('legal.privacy.section.3.title')}>
        <Bullets locale={locale} keys={[
          'legal.privacy.section.3.item.1',
          'legal.privacy.section.3.item.2',
          'legal.privacy.section.3.item.3',
          'legal.privacy.section.3.item.4',
          'legal.privacy.section.3.item.5',
        ]} />
        <p className="mt-4">
          {t('legal.privacy.section.3.beforeStrong')}
          <strong>{t('legal.privacy.section.3.strong')}</strong>
          {t('legal.privacy.section.3.afterStrong')}
        </p>
      </Section>

      <Section title={t('legal.privacy.section.4.title')}>
        <p>{t('legal.privacy.section.4.body')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li><strong>Perso.ai</strong> — {t('legal.privacy.section.4.perso')}</li>
          <li><strong>Google (YouTube Data API)</strong> — {t('legal.privacy.section.4.google')}</li>
          <li><strong>Vercel</strong> — {t('legal.privacy.section.4.vercel')}</li>
          <li><strong>Turso (libSQL)</strong> — {t('legal.privacy.section.4.turso')}</li>
          <li><strong>Toss Payments</strong> — {t('legal.privacy.section.4.toss')}</li>
        </ul>
        <p className="mt-4">{t('legal.privacy.section.4.footer')}</p>
      </Section>

      <Section title={t('legal.privacy.section.5.title')}>
        <Bullets locale={locale} keys={[
          'legal.privacy.section.5.item.1',
          'legal.privacy.section.5.item.2',
          'legal.privacy.section.5.item.3',
          'legal.privacy.section.5.item.4',
          'legal.privacy.section.5.item.5',
        ]} />
      </Section>

      <Section title={t('legal.privacy.section.6.title')}>
        <p>{t('legal.privacy.section.6.body')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>{t('legal.privacy.section.6.item.1')}</li>
          <li>{t('legal.privacy.section.6.item.2')}</li>
          <li>
            {t('legal.privacy.section.6.item.3.beforeLink')}
            <ExternalA href="https://myaccount.google.com/permissions">
              {t('legal.link.googlePermissions')}
            </ExternalA>
            {t('legal.privacy.section.6.item.3.afterLink')}
          </li>
          <li>{t('legal.privacy.section.6.item.4')}</li>
        </ul>
        <p className="mt-4">{t('legal.privacy.section.6.footer')}</p>
      </Section>

      <Section title={t('legal.privacy.section.7.title')}>
        <Bullets locale={locale} keys={[
          'legal.privacy.section.7.item.1',
          'legal.privacy.section.7.item.2',
          'legal.privacy.section.7.item.3',
        ]} />
      </Section>

      <Section title={t('legal.privacy.section.8.title')}>
        <p>
          {t('legal.privacy.section.8.beforeSession')}
          <code>dubtube_session</code>
          {t('legal.privacy.section.8.session')}
          <code>dubtube-theme</code>
          {t('legal.privacy.section.8.theme')}
          <code>dubtube-youtube-settings</code>
          {t('legal.privacy.section.8.settings')}
        </p>
      </Section>

      <Section title={t('legal.privacy.section.9.title')}>
        <p>{t('legal.privacy.section.9.body')}</p>
      </Section>

      <Section title={t('legal.privacy.section.10.title')}>
        <p>{t('legal.privacy.section.10.body')}</p>
      </Section>

      <Section title={t('legal.privacy.section.11.title')}>
        <p>
          {t('legal.privacy.section.11.beforeEmail')}
          <a
            href="mailto:gyuwon05@gmail.com"
            className="text-brand-600 hover:underline dark:text-brand-400"
          >
            gyuwon05@gmail.com
          </a>
          {t('legal.common.emailSuffix')}
        </p>
      </Section>

      <footer className="mt-12 border-t border-surface-200 pt-6 text-sm text-surface-500 dark:border-surface-800 dark:text-surface-300">
        <p>
          {t('legal.common.relatedDocuments')}{' '}
          <LocaleLink href="/terms" className="text-brand-600 hover:underline dark:text-brand-400">
            {t('legal.link.termsOfService')}
          </LocaleLink>{' '}
          ·{' '}
          <ExternalA href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </ExternalA>{' '}
          ·{' '}
          <ExternalA href="https://policies.google.com/privacy">
            Google Privacy Policy
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

function Subheading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 font-semibold text-surface-900 dark:text-white">{children}</h3>
}

function Bullets({ locale, keys }: { locale: AppLocale; keys: LegalMessageKey[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-6">
      {keys.map((key) => <li key={key}>{legalMessage(locale, key)}</li>)}
    </ul>
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
