'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Search, Globe, ChevronDown, Menu, X, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import LogoCompact from './Logo/LogoCompact';
import { useTheme } from './ThemeProvider';
import { CATEGORIES, categoryToSlug } from '@/lib/categories';
import { SITES } from '@/lib/sites';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locale: string;
}

export default function Header({ searchQuery, onSearchChange, locale }: HeaderProps) {
  const { theme } = useTheme();
  const t = useTranslations();
  const tCategories = useTranslations('categories');
  const tSites = useTranslations('sites');
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const resRef = useRef<HTMLDivElement>(null);

  const locales: { code: string; label: string; short: string }[] = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'zh', label: '中文', short: '中' },
    { code: 'ja', label: '日本語', short: '日' },
    { code: 'es', label: 'Español', short: 'ES' },
    { code: 'fr', label: 'Français', short: 'FR' },
  ];
  const currentLang = locales.find(l => l.code === locale) || locales[0];

  const isHome = pathname === '/';
  const isTools = pathname.startsWith('/tools');
  const isSkills = pathname.startsWith('/skills');
  const isMcp = pathname.startsWith('/mcp');
  const isRanking = pathname.startsWith('/ranking');
  const isReport = pathname.startsWith('/report');
  const isBlog = pathname.startsWith('/blog');
  const isTutorials = pathname.startsWith('/tutorials');

  const navIdle = 'text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition px-2 py-1';
  const navActive = 'text-sm text-[var(--foreground)] font-medium px-2 py-1';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (siteRef.current && !siteRef.current.contains(e.target as Node)) setSiteOpen(false);
      if (resRef.current && !resRef.current.contains(e.target as Node)) setResOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--header-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 gap-6">
          {/* Logo */}
          <LogoCompact height={30} />

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link href="/" className={isHome ? navActive : navIdle}>
              {t('nav.home')}
            </Link>

            <Link href="/tools" className={isTools ? navActive : navIdle}>{t('nav.tools')}</Link>
            <Link href="/skills" className={isSkills ? navActive : navIdle}>{t('nav.skills')}</Link>
            <Link href="/mcp" className={isMcp ? navActive : navIdle}>{t('nav.mcp')}</Link>
            <Link href="/ranking" className={isRanking ? navActive : navIdle}>{t('nav.ranking')}</Link>

            {/* Resources dropdown: Report / Blog / Tutorials */}
            <div className="relative" ref={resRef}>
              <button
                onClick={() => setResOpen(!resOpen)}
                className={`${isReport || isBlog || isTutorials ? navActive : navIdle} flex items-center gap-1`}
              >
                {t('nav.resources')}
                <ChevronDown className={`w-3 h-3 transition-transform ${resOpen ? 'rotate-180' : ''}`} />
              </button>
              {resOpen && (
                <div className="absolute left-0 top-full mt-2 w-44 bg-[var(--card-bg)] border border-[var(--muted-border)] rounded-xl shadow-lg p-2 z-50">
                  <Link
                    href="/report"
                    onClick={() => setResOpen(false)}
                    className="block px-3 py-2 text-sm text-[var(--foreground)] rounded-lg hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition"
                  >
                    {t('nav.report')}
                  </Link>
                  <Link
                    href="/blog"
                    onClick={() => setResOpen(false)}
                    className="block px-3 py-2 text-sm text-[var(--foreground)] rounded-lg hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition"
                  >
                    {t('nav.blog')}
                  </Link>
                  <Link
                    href="/tutorials"
                    onClick={() => setResOpen(false)}
                    className="block px-3 py-2 text-sm text-[var(--foreground)] rounded-lg hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition"
                  >
                    {t('nav.tutorials')}
                  </Link>
                </div>
              )}
            </div>

            {/* Ecosystem dropdown: subsites (tools.cataito.com etc.) */}
            <div className="relative" ref={siteRef}>
              <button
                onClick={() => setSiteOpen(!siteOpen)}
                className={`${navIdle} flex items-center gap-1`}
              >
                {t('nav.ecosystem')}
                <ChevronDown className={`w-3 h-3 transition-transform ${siteOpen ? 'rotate-180' : ''}`} />
              </button>
              {siteOpen && (
                <div className="absolute left-0 top-full mt-2 w-[min(90vw,20rem)] bg-[var(--card-bg)] border border-[var(--muted-border)] rounded-xl shadow-lg p-2 z-50">
                  {SITES.map((site) => {
                    const Icon = site.icon;
                    return (
                      <a
                        key={site.id}
                        href={site.url}
                        target="_blank"
                        rel="noopener"
                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--primary)]/10 transition group"
                      >
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition">
                            {tSites(`${site.id}.name` as any)}
                            <ExternalLink className="w-3 h-3 opacity-50" aria-hidden="true" />
                          </span>
                          <span className="block text-xs text-[var(--muted)] mt-0.5">
                            {tSites(`${site.id}.desc` as any)}
                          </span>
                        </span>
                      </a>
                    );
                  })}
                  <p className="px-3 py-2 text-xs text-[var(--muted)] opacity-70">{tSites('more')}</p>
                </div>
              )}
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Desktop search */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--muted-bg)] rounded-full border border-[var(--muted-border)] focus-within:border-[var(--primary)] transition">
              <Search className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-40 lg:w-48 bg-transparent border-0 outline-none text-sm text-[var(--foreground)] placeholder-[var(--muted)]"
              />
            </div>

            {/* Language */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 px-2 py-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{currentLang.short}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-[var(--card-bg)] border border-[var(--muted-border)] rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                  {locales.map((l) => (
                    <Link
                      key={l.code}
                      href={pathname}
                      locale={l.code as any}
                      onClick={() => setLangOpen(false)}
                      className={`block px-4 py-2 text-sm hover:bg-[var(--primary)]/10 transition ${l.code === locale ? 'text-[var(--primary)] font-medium' : 'text-[var(--foreground)]'}`}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* Submit */}
            <Link
              href="/submit"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium whitespace-nowrap text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition shadow-sm"
            >
              {t('nav.submit')}
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-8 h-8 text-[var(--muted)] hover:text-[var(--foreground)] transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--muted-bg)] border border-[var(--muted-border)] rounded-full text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-[var(--header-border)] pt-3 space-y-1">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition">
              {t('nav.home')}
            </Link>
            <Link href="/tools" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition">
              {t('nav.tools')}
            </Link>
            <Link href="/skills" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition">
              {t('nav.skills')}
            </Link>
            <Link href="/mcp" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition">
              {t('nav.mcp')}
            </Link>
            <Link href="/ranking" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition">
              {t('nav.ranking')}
            </Link>
            <Link href="/report" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition">
              {t('nav.report')}
            </Link>
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition">
              {t('nav.blog')}
            </Link>
            <Link href="/tutorials" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition">
              {t('nav.tutorials')}
            </Link>
            {/* Mobile ecosystem: subsites */}
            <div className="px-3 pt-3">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">{t('nav.ecosystem')}</p>
              <div className="space-y-1">
                {SITES.map((site) => {
                  const Icon = site.icon;
                  return (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--primary)]/10 transition"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-sm text-[var(--foreground)]">
                          {tSites(`${site.id}.name` as any)}
                          <ExternalLink className="w-3 h-3 opacity-50" aria-hidden="true" />
                        </span>
                        <span className="block text-xs text-[var(--muted)] mt-0.5">
                          {tSites(`${site.id}.desc` as any)}
                        </span>
                      </span>
                    </a>
                  );
                })}
                <p className="px-3 py-1.5 text-xs text-[var(--muted)] opacity-70">{tSites('more')}</p>
              </div>
            </div>

            {/* Mobile categories */}
            <div className="px-3 pt-3">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">{t('nav.categories')}</p>
              <div className="grid grid-cols-2 gap-1">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat}
                    href={`/category/${categoryToSlug(cat)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-sm text-[var(--foreground)] rounded-lg hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition"
                  >
                    {tCategories(cat as any)}
                  </Link>
                ))}
              </div>
            </div>

            <div className="px-3 pt-2">
              <Link
                href="/submit"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium whitespace-nowrap text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition"
              >
                {t('nav.submit')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}