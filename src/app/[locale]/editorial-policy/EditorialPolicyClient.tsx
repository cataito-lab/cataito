'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { ArrowLeft, ShieldX, AlertTriangle, FileCheck2, RefreshCw, Flag, Award, ListChecks } from 'lucide-react';

const BADGE_KEYS = [
  'verdictGame-Changing',
  'verdictHighlyRecommended',
  'verdictRecommended',
  'verdictWorthTrying',
  'verdictForSpecificNeeds',
  'verdictConsiderAlternatives',
] as const;

export default function EditorialPolicyClient() {
  const locale = useLocale();
  const t = useTranslations('editorialPolicy');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');

  const rejectItems = t.raw('reject_items') as string[];
  const watchItems = t.raw('watch_items') as string[];
  const scaleItems = t.raw('scale_items') as string[];
  const methodItems = t.raw('method_items') as string[];
  const badgeLabels = BADGE_KEYS.map((key) => (tCommon as any)(key) as string);

  return (
    <>
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} locale={locale} />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--primary)] transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          {tCommon('backToHome')}
        </Link>

        <article className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">{t('title')}</h1>
          <p className="text-sm text-[var(--muted)] mb-8">{t('last_updated')}</p>

          <div className="space-y-8 text-[var(--muted)] leading-relaxed">
            {/* Intro */}
            <section>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-3">{t('intro_title')}</h2>
              <p>{t('intro_text')}</p>
            </section>

            {/* Rating scale */}
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] mb-3">
                <Award className="w-5 h-5 text-[var(--primary)]" />
                {t('scale_title')}
              </h2>
              <p>{t('scale_text')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                {scaleItems.map((item, index) => {
                  const badge = badgeLabels.find((label) => item.startsWith(label));
                  return (
                    <li key={index}>
                      {badge ? (
                        <>
                          <strong className="text-[var(--foreground)]">{badge}</strong>
                          {item.slice(badge.length)}
                        </>
                      ) : (
                        item
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* How we evaluate */}
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] mb-3">
                <ListChecks className="w-5 h-5 text-[var(--primary)]" />
                {t('method_title')}
              </h2>
              <p>{t('method_text')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                {methodItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Reject — zero tolerance */}
            <section className="rounded-xl border border-[var(--muted-border)] bg-[var(--muted-bg)] p-5 border-l-4 border-l-red-500">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] mb-3 mt-0">
                <ShieldX className="w-5 h-5 text-red-500" />
                {t('reject_title')}
              </h2>
              <p>{t('reject_text')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                {rejectItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Watch — capped rating */}
            <section className="rounded-xl border border-[var(--muted-border)] bg-[var(--muted-bg)] p-5 border-l-4 border-l-amber-500">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] mb-3 mt-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t('watch_title')}
              </h2>
              <p>{t('watch_text')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                {watchItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Evidence standard */}
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] mb-3">
                <FileCheck2 className="w-5 h-5 text-[var(--primary)]" />
                {t('evidence_title')}
              </h2>
              <p>{t('evidence_text')}</p>
            </section>

            {/* Ongoing review */}
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] mb-3">
                <RefreshCw className="w-5 h-5 text-[var(--primary)]" />
                {t('review_title')}
              </h2>
              <p>{t('review_text')}</p>
            </section>

            {/* Report a concern */}
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] mb-3">
                <Flag className="w-5 h-5 text-[var(--primary)]" />
                {t('report_title')}
              </h2>
              <p>{t('report_text')}</p>
              <p className="mt-2"><strong>Email:</strong> hello@cataito.com</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
