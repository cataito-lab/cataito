'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

interface EditorialIntroProps {
  totalEntries: number;
}

/**
 * 首页编辑介绍板块 — 面向审核与用户的"本站是什么 / 如何精选"实质性文字。
 * 数字全部动态或走文案键，禁止硬编码 UI 文案（i18n 五语言走 home.about* 键）。
 */
export default function EditorialIntro({ totalEntries }: EditorialIntroProps) {
  const t = useTranslations('home');

  const facts = [
    { value: `${totalEntries}`, label: t('aboutFact1Label') },
    { value: t('aboutFact2Value'), label: t('aboutFact2Label') },
    { value: t('aboutFact3Value'), label: t('aboutFact3Label') },
    { value: t('aboutFact4Value'), label: t('aboutFact4Label') },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          {t('aboutEyebrow')}
        </p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {t('aboutTitle')}
        </h2>
        <p className="mt-5 leading-relaxed text-[var(--muted)]">{t('aboutPara1')}</p>
        <p className="mt-4 leading-relaxed text-[var(--muted)]">{t('aboutPara2')}</p>
      </div>

      <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="bg-[var(--card-bg)] rounded-xl p-5 shadow-[var(--card-shadow)]"
          >
            <dd className="text-2xl font-bold text-[var(--foreground)]">{fact.value}</dd>
            <dt className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{fact.label}</dt>
          </div>
        ))}
      </dl>

      <Link
        href="/editorial-policy"
        className="inline-flex items-center gap-1.5 mt-8 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition"
      >
        {t('aboutPolicyLink')}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
