'use client';

import { useTranslations } from 'next-intl';

/**
 * P3.4 可引用 TL;DR 块：详情页顶部的纯事实清单。
 * 目标读者一半是人（快速决策），一半是 AI 检索器（语义稳定、带数字、带核验日期，
 * 可直接摘录进答案）。文案走 i18n；事实数据由服务端 page.tsx 算好传入。
 */

interface TldrData {
  displayName: string;
  category: string;
  developer: string;
  officialUrl: string;
  pricingTiers: string[];
  fromPrice: string | null;
  pricingUrl: string | null;
  verdict: string | null;
  verified: string | null;
}

export default function ToolTldr({ tldr }: { tldr: TldrData }) {
  const t = useTranslations('common');
  if (!tldr.displayName) return null;

  return (
    <section
      aria-label={t('tldrTitle')}
      className="rounded-2xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
        {t('tldrTitle')}
      </h2>
      <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--foreground)]">
        <li>
          <span className="font-medium">{tldr.displayName}</span>
          {' · '}
          {tldr.category}
          {tldr.developer ? ` · ${tldr.developer}` : ''}
        </li>
        {tldr.verdict && <li>{tldr.verdict}</li>}
        {tldr.pricingTiers.length > 0 && (
          <li>
            {t('pricingTiers')}
            {': '}
            {tldr.pricingTiers.join(' / ')}
            {tldr.fromPrice && ` (${t('tldrFromPrice')} ${tldr.fromPrice})`}
            {' · '}
            <a
              href={tldr.pricingUrl ?? tldr.officialUrl}
              target="_blank"
              rel="noopener"
              className="text-[var(--primary)] hover:underline"
            >
              {t('tldrCheckPricing')}
            </a>
          </li>
        )}
        {tldr.verified && (
          <li className="text-[var(--muted)]">
            {t('infoVerified')}
            {': '}
            {tldr.verified}
          </li>
        )}
      </ul>
    </section>
  );
}
