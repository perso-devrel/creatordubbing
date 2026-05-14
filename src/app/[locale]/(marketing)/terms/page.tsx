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
  return getMarketingMetadata(locale, 'terms')
}

const LAST_UPDATED = '2026-05-11'

export default async function TermsPage({ params }: LocaleMetadataProps) {
  const locale = await resolveMetadataLocale(params)
  const t = (key: LegalMessageKey, params?: Parameters<typeof legalMessage>[2]) => legalMessage(locale, key, params)

  return (
    <article className="document-shell">
      <header className="mb-10 border-b border-surface-200 pb-8 dark:border-surface-800">
        <h1 className="text-3xl font-semibold text-surface-950 dark:text-white sm:text-4xl">
          {t('legal.terms.title')}
        </h1>
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
          {t('legal.common.lastUpdated', { date: LAST_UPDATED })}
        </p>
      </header>

      <Section title={t('legal.terms.section.1.title')}>
        <p>
          {t('legal.terms.section.1.beforePrivacy')}
          <LocaleLink href="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
            {t('legal.link.privacyPolicy')}
          </LocaleLink>
          {t('legal.terms.section.1.afterPrivacyBeforeYoutube')}
          <ExternalA href="https://www.youtube.com/t/terms">YouTube Terms of Service</ExternalA>
          {t('legal.terms.section.1.afterYoutube')}
        </p>
      </Section>

      <Section title={t('legal.terms.section.2.title')}>
        <p>{t('legal.terms.section.2.body')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li><strong>YouTube Data API v3</strong> - {t('legal.terms.section.2.youtubeDataApi')}</li>
          <li><strong>Perso.ai API</strong> - {t('legal.terms.section.2.persoApi')}</li>
        </ul>
      </Section>

      <Section title={t('legal.terms.section.3.title')}>
        <Bullets locale={locale} keys={[
          'legal.terms.section.3.item.1',
          'legal.terms.section.3.item.2',
          'legal.terms.section.3.item.3',
        ]} />
      </Section>

      <Section title={t('legal.terms.section.4.title')}>
        <p>{t('legal.terms.section.4.body')}</p>
        <Bullets locale={locale} keys={[
          'legal.terms.section.4.item.1',
          'legal.terms.section.4.item.2',
          'legal.terms.section.4.item.3',
          'legal.terms.section.4.item.4',
          'legal.terms.section.4.item.5',
        ]} />
      </Section>

      <Section title={t('legal.terms.section.5.title')}>
        <p>
          {t('legal.terms.section.5.beforeYoutube')}
          <ExternalA href="https://www.youtube.com/t/terms">YouTube Terms of Service</ExternalA>
          {t('legal.terms.section.5.afterYoutube')}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            {t('legal.terms.section.5.item.1.beforeLink')}
            <ExternalA href="https://myaccount.google.com/permissions">
              {t('legal.link.googlePermissions')}
            </ExternalA>
            {t('legal.terms.section.5.item.1.afterLink')}
          </li>
          <li>{t('legal.terms.section.5.item.2')}</li>
          <li>{t('legal.terms.section.5.item.3')}</li>
        </ul>
      </Section>

      <Section title={t('legal.terms.section.6.title')}>
        <Bullets locale={locale} keys={[
          'legal.terms.section.6.item.1',
          'legal.terms.section.6.item.2',
          'legal.terms.section.6.item.3',
        ]} />
      </Section>

      <Section title={t('legal.terms.section.7.title')}>
        <Bullets locale={locale} keys={[
          'legal.terms.section.7.item.1',
          'legal.terms.section.7.item.2',
          'legal.terms.section.7.item.3',
        ]} />
      </Section>

      <Section title={t('legal.terms.section.8.title')}>
        <p>{t('legal.terms.section.8.body')}</p>
        <Bullets locale={locale} keys={[
          'legal.terms.section.8.item.1',
          'legal.terms.section.8.item.2',
          'legal.terms.section.8.item.3',
          'legal.terms.section.8.item.4',
        ]} />
        <p className="mt-4">{t('legal.terms.section.8.footer')}</p>
      </Section>

      <Section title={t('legal.terms.section.9.title')}>
        <Bullets locale={locale} keys={[
          'legal.terms.section.9.item.1',
          'legal.terms.section.9.item.2',
          'legal.terms.section.9.item.3',
        ]} />
      </Section>

      <Section title={t('legal.terms.section.10.title')}>
        <p>{t('legal.terms.section.10.body')}</p>
      </Section>

      <Section title={t('legal.terms.section.11.title')}>
        <p>{t('legal.terms.section.11.body')}</p>
      </Section>

      <Section title={t('legal.terms.section.12.title')}>
        <p>
          {t('legal.terms.section.12.beforeEmail')}
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
          <LocaleLink href="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
            {t('legal.link.privacyPolicy')}
          </LocaleLink>{' '}
          ·{' '}
          <ExternalA href="https://www.youtube.com/t/terms">
            YouTube Terms of Service
          </ExternalA>{' '}
          ·{' '}
          <ExternalA href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </ExternalA>{' '}
          ·{' '}
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
      <h2 className="text-xl font-semibold text-surface-950 dark:text-white">{title}</h2>
      <div className="mt-3 space-y-3 leading-7">{children}</div>
    </section>
  )
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
