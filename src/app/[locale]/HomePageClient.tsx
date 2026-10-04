'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Star } from 'lucide-react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ToolGrid from '@/components/ToolGrid';
import FeaturedAgents from '@/components/FeaturedAgents';
import BlogHighlights from '@/components/BlogHighlights';
import TutorialHighlights from '@/components/TutorialHighlights';
import Newsletter from '@/components/Newsletter';
import SubmitCTA from '@/components/SubmitCTA';
import EditorialIntro from '@/components/EditorialIntro';
import Footer from '@/components/Footer';
import LogoTile from '@/components/LogoTile';
import { tools } from '@/data/aggregated';
import { skills } from '@/data/aggregated';
import { mcp } from '@/data/aggregated';
import { Tool, getLocalizedDescription } from '@/components/ToolCard';
import { CATEGORIES, categoryToSlug } from '@/lib/categories';

type EntryType = 'tool' | 'skill' | 'mcp';

interface LatestEntry {
  type: EntryType;
  slug: string;
  name: string;
  nameZh?: string;
  description: string;
  descriptionZh?: string;
  descriptionEn?: string;
  descriptionJa?: string;
  descriptionEs?: string;
  descriptionFr?: string;
  developer?: string;
  developerZh?: string;
  logo?: string;
  logoDark?: string;
  stars?: number;
  orderIndex: number;
  href: string;
}

function localizedDesc(entry: LatestEntry, locale: string): string {
  if (locale === 'zh' && entry.descriptionZh) return entry.descriptionZh;
  if (locale === 'ja' && entry.descriptionJa) return entry.descriptionJa;
  if (locale === 'es' && entry.descriptionEs) return entry.descriptionEs;
  if (locale === 'fr' && entry.descriptionFr) return entry.descriptionFr;
  if (locale === 'en' && entry.descriptionEn) return entry.descriptionEn;
  return entry.description;
}

function typeLabel(t: EntryType, lang: string): string {
  const map = {
    tool: { zh: '工具', en: 'Tool', ja: 'ツール', es: 'Herramienta', fr: 'Outil' },
    skill: { zh: '技能', en: 'Skill', ja: 'スキル', es: 'Habilidad', fr: 'Compétence' },
    mcp: { zh: 'MCP', en: 'MCP', ja: 'MCP', es: 'MCP', fr: 'MCP' },
  };
  return map[t][lang as keyof typeof map[EntryType]] ?? map[t].en;
}

function colorByType(t: EntryType): string {
  if (t === 'tool') return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400';
  if (t === 'skill') return 'bg-violet-500/15 text-violet-600 dark:text-violet-400';
  return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400';
}

export default function HomePageClient() {
  const locale = useLocale();
  const t = useTranslations('home');
  const tCategories = useTranslations('categories');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const allTools = tools as Tool[];

  // 跨版块最新收录：各取尾端 4 条，合并倒序（最多 12 条）
  // 由于数据文件没有 createdAt，用数组尾端作为"最近收录"的代理
  const latestEntries: LatestEntry[] = useMemo(() => {
    const entries: LatestEntry[] = [];

    for (const tool of (allTools.slice(-4).reverse())) {
      entries.push({
        type: 'tool',
        slug: tool.slug,
        stars: typeof tool.stars === 'number' ? tool.stars : undefined,
        name: tool.name,
        nameZh: tool.nameZh,
        description: tool.description,
        descriptionZh: tool.description,
        descriptionEn: tool.descriptionEn,
        descriptionJa: tool.descriptionJa,
        descriptionEs: tool.descriptionEs,
        descriptionFr: tool.descriptionFr,
        developer: tool.developer,
        developerZh: tool.developerZh,
        logo: tool.logo,
        logoDark: tool.logoDark,
        orderIndex: (allTools as any).length - (allTools as any).indexOf(tool),
        href: `/tool/${tool.slug}`,
      });
    }

    for (const skill of skills.slice(-4).reverse()) {
      entries.push({
        type: 'skill',
        slug: skill.slug,
        name: skill.name,
        nameZh: skill.nameZh,
        description: skill.description,
        descriptionZh: skill.description,
        descriptionEn: skill.descriptionEn,
        descriptionJa: skill.descriptionJa,
        descriptionEs: skill.descriptionEs,
        descriptionFr: skill.descriptionFr,
        developer: skill.developer,
        developerZh: skill.developerZh,
        logo: skill.logo,
        stars: skill.stars,
        orderIndex: skills.length - skills.indexOf(skill),
        href: `/skills/${skill.slug}`,
      });
    }

    for (const item of mcp.slice(-4).reverse()) {
      entries.push({
        type: 'mcp',
        slug: item.slug,
        name: item.name,
        nameZh: item.nameZh,
        description: item.description,
        descriptionZh: item.description,
        descriptionEn: item.descriptionEn,
        descriptionJa: item.descriptionJa,
        descriptionEs: item.descriptionEs,
        descriptionFr: item.descriptionFr,
        developer: item.developer,
        developerZh: item.developerZh,
        logo: item.logo,
        stars: item.stars,
        orderIndex: mcp.length - mcp.indexOf(item),
        href: `/mcp/${item.slug}`,
      });
    }

    return entries.sort((a, b) => b.orderIndex - a.orderIndex);
  }, [allTools]);

  const curatedTools = allTools.filter((tool) => tool.homeFeatured).slice(0, 8);
  const totalEntries = allTools.length + skills.length + mcp.length;

  const getDisplayName = (tool: Tool) =>
    locale === 'zh' && tool.nameZh ? tool.nameZh : tool.name;

  return (
    <>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        locale={locale}
      />
      <main className="flex-1">
        <HeroSection searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Editorial Intro — 本站定位与收录标准（实质性文字，置于卡片板块之前） */}
        <EditorialIntro totalEntries={totalEntries} />

        {/* Latest Additions — 跨版块（工具/Skills/MCP） */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
                {t('latestTitle')}
              </h2>
              <p className="mt-1.5 text-[var(--muted)] text-sm">{t('latestDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {latestEntries.slice(0, 12).map((entry) => {
              const displayName = locale === 'zh' && entry.nameZh ? entry.nameZh : entry.name;
              return (
                <Link
                  key={`${entry.type}-${entry.slug}`}
                  href={entry.href}
                  className="group bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300 p-4 flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <LogoTile
                      logo={entry.logo || ''}
                      logoDark={entry.logoDark}
                      alt={displayName}
                      className="w-10 h-10 rounded-lg"
                      imgPx={32}
                      fallbackClassName="text-base"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition">
                        {displayName}
                      </h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colorByType(entry.type)}`}>
                        {typeLabel(entry.type, locale)}
                      </span>
                    </div>
                    {entry.stars && entry.stars > 0 && (
                      <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2 hover:text-[var(--foreground)] transition mt-auto">
                    {localizedDesc(entry, locale)}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Editor's Picks */}
        <ToolGrid
          tools={allTools}
          locale={locale}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={allTools.length}
          curated
          curatedTools={curatedTools}
          header={
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
                  {t('featuredTitle')}
                </h2>
                <p className="mt-1.5 text-[var(--muted)] text-sm">{t('featuredDesc')}</p>
              </div>
              <Link
                href="/tools"
                className="hidden sm:inline-flex items-center gap-1.5 shrink-0 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition"
              >
                {t('viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          }
        />

        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition"
          >
            {t('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <FeaturedAgents />

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            <Link href="/tools" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition shadow-sm">
              {tCommon('allTools')}
            </Link>
            <Link href="/mcp" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300">
              {tNav('mcp')}
            </Link>
            <Link href="/skills" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300">
              {tNav('skills')}
            </Link>
            <Link href="/tutorials" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300">
              {tNav('tutorials')}
            </Link>
            <Link href="/ranking" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300">
              {tNav('ranking')}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {CATEGORIES.slice(0, 8).map((cat) => (
              <Link
                key={cat}
                href={`/category/${categoryToSlug(cat)}`}
                className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition px-2 py-1"
              >
                {tCategories(cat as any)}
              </Link>
            ))}
            {CATEGORIES.slice(8).map((cat) => (
              <Link
                key={cat}
                href={`/category/${categoryToSlug(cat)}`}
                className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition px-2 py-1"
              >
                {tCategories(cat as any)}
              </Link>
            ))}
          </div>
        </section>

        <TutorialHighlights />
        <BlogHighlights />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <Newsletter />
        </div>
        <SubmitCTA />
      </main>
      <Footer />
    </>
  );
}