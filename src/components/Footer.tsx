import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LogoFull from './Logo/LogoFull';
import { WORDMARK_GRADIENT_VIVID } from '@/lib/brandColors';
import { CATEGORIES, categoryToSlug } from '@/lib/categories';
import { SITES } from '@/lib/sites';

export default function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const tSites = useTranslations('sites');
  const tCategories = useTranslations('categories');

  return (
    <footer className="border-t border-[var(--muted-border)] bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4 relative">
            <span aria-hidden="true" className="footer-glow" />
            <LogoFull
              layout="horizontal"
              maxWidth={220}
              vivid
              iconTone="auto"
              wordmarkGradient={WORDMARK_GRADIENT_VIVID}
              className="relative z-[1]"
            />
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {t('description')}
            </p>
            <div className="flex items-center gap-4 pt-1">
              <a href="mailto:hello@cataito.com" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition" title={t('contact')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </a>
              <a href="https://x.com/cataitocom" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition" title="X (Twitter)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Ecosystem: subsites */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">{tNav('ecosystem')}</h3>
            <ul className="space-y-3">
              {SITES.map((site) => {
                const Icon = site.icon;
                return (
                  <li key={site.id}>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener"
                      className="group inline-flex items-start gap-2 text-sm text-[var(--muted)] hover:text-[var(--primary)] transition"
                    >
                      <Icon className="w-4 h-4 mt-0.5 shrink-0 opacity-70 group-hover:opacity-100 group-hover:text-[var(--primary)] transition" aria-hidden="true" />
                      <span>
                        <span className="inline-flex items-center gap-1">
                          {tSites(`${site.id}.name` as any)}
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="opacity-60">
                            <path d="M15 3h6v6"/>
                            <path d="M10 14 21 3"/>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          </svg>
                        </span>
                        <span className="block text-xs text-[var(--muted)] opacity-70 mt-0.5">
                          {tSites(`${site.id}.desc` as any)}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-[var(--muted)] opacity-60 mt-4">{tSites('more')}</p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">{t('navigation')}</h3>
            <ul className="space-y-2.5">
              <li><Link href="/tools" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('tools')}</Link></li>
              <li><Link href="/skills" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('skills')}</Link></li>
              <li><Link href="/mcp" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('mcp')}</Link></li>
              <li><Link href="/ranking" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('ranking')}</Link></li>
              <li><Link href="/report" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('report')}</Link></li>
              <li><Link href="/blog" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('blog')}</Link></li>
              <li><Link href="/tutorials" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('tutorials')}</Link></li>
              <li><Link href="/submit" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('submit')}</Link></li>
                            <li><Link href="/about" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('about')}</Link></li>
                            <li><Link href="/badge" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">Add Badge</Link></li>
            </ul>
          </div>

          {/* Categories (merged, 2-col inner grid) */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">{t('categories')}</h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link href={`/category/${categoryToSlug(cat)}`} className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">
                    {tCategories(cat as any)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[var(--muted-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link href="/about" className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition">{tNav('about')}</Link>
            <Link href="/privacy" className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition">{t('privacy')}</Link>
            <Link href="/disclaimer" className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition">{t('disclaimer')}</Link>
            <Link href="/editorial-policy" className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition">{t('editorial')}</Link>
          </div>
          <p className="text-xs text-[var(--muted)]">{t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}