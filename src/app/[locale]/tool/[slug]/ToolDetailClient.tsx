'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumb from '@/components/Breadcrumb';
import ToolTldr from '@/components/ToolTldr';
import { Tool, PLATFORM_META, getLocalizedDescription } from '@/components/ToolCard';
import { ExternalLink, Globe, Star, Building2, CheckCircle, XCircle, Lightbulb, DollarSign, Zap, Info, Share2, Link2, Check, Newspaper, BookOpen, Clipboard, LayoutGrid, Award, MonitorSmartphone, ChevronDown } from 'lucide-react';
import { TwitterIcon, LinkedinIcon, FacebookIcon } from '@/components/SocialIcons';
import Newsletter from '@/components/Newsletter';
import AdUnit from '@/components/AdUnit';
import LogoTile from '@/components/LogoTile';
import { categoryToSlug } from '@/lib/categories';
import { useState } from 'react';

interface RelatedPost {
  slug: string;
  category: string;
  title: unknown;
  excerpt: unknown;
}

interface RelatedTutorial {
  slug: string;
  title: Record<string, string>;
  excerpt: Record<string, string>;
  difficulty: string;
  readTime: number;
  coverImage?: string;
}

interface ToolDetailClientProps {
  tool: Tool;
  locale: string;
  // 以下数据均由服务端 page.tsx 按 slug 预先筛选后传入，
  // 避免客户端把整包数据打进 bundle
  details: unknown;
  sameMaker: Tool[];
  relatedTools: Tool[];
  relatedPosts: RelatedPost[];
  relatedTutorials: RelatedTutorial[];
  tldr: TldrData;
  healthStatus: string | null;
}

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

const TAG_COLORS: Record<string, string> = {
  'Free': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Freemium': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Paid': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Open Source': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'API': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function ToolDetailClient({ tool, locale, details: detailsProp, sameMaker, relatedTools, relatedPosts, relatedTutorials, tldr, healthStatus }: ToolDetailClientProps) {
  const t = useTranslations('common');
  const tCategories = useTranslations('categories');
  const tTags = useTranslations('tags');
  const tTutorials = useTranslations('tutorials');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const description = getLocalizedDescription(tool, locale);
  const displayName = locale === 'zh' && tool.nameZh ? tool.nameZh : tool.name;
  const details: any = detailsProp;

  // Supported Platforms：停服工具（Discontinued）不展示该模块；仅展示确认支持（true），false/"unknown" 不渲染
  const supportedPlatforms = tool.platforms && !tool.tags.includes('Discontinued')
    ? PLATFORM_META.filter((p) => tool.platforms![p.key] === true)
    : [];

  // 本地化平台列表句式（如 "Web App, Windows, macOS and API"）
  const platformNames = supportedPlatforms.map((p) => t(p.labelKey as any));
  let platformsSentence = platformNames.join(', ');
  try {
    platformsSentence = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(platformNames);
  } catch {
    // 不支持的 locale 回退逗号拼接
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Related products from the same maker / platform (auto-derived from developer)
  const makerName = locale === 'zh' && tool.developerZh ? tool.developerZh : tool.developer;

  const getLocalized = (field: unknown, loc: string): string | string[] => {
    if (typeof field === 'string') return field;
    if (Array.isArray(field)) return field;
    if (field && typeof field === 'object') {
      const obj = field as Record<string, string | string[]>;
      return obj[loc] || obj.en || '';
    }
    return '';
  };

  // Reusable card for related sections (same maker / same category)
  const renderRelatedCard = (rt: Tool) => {
    const rtName = locale === 'zh' && rt.nameZh ? rt.nameZh : rt.name;
    const rtDesc = getLocalizedDescription(rt, locale);
    const rtDev = locale === 'zh' && rt.developerZh ? rt.developerZh : rt.developer;
    return (
      <Link
        key={rt.slug}
        href={`/tool/${rt.slug}`}
        className="group flex items-start gap-4 p-5 rounded-xl bg-[var(--card-bg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300"
      >
        <LogoTile
                  logo={rt.logo}
                  logoDark={rt.logoDark}
                  alt={rtName}
                  className="w-12 h-12 rounded-xl"
                  imgPx={40}
                  fallbackClassName="text-lg"
                />
                <div className="min-w-0 flex-1">
          <div className="font-semibold text-[var(--foreground)] text-sm truncate group-hover:text-[var(--primary)] transition">
            {rtName}
          </div>
          {rtDev && <div className="text-xs text-[var(--muted)] mt-0.5">{rtDev}</div>}
          <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed line-clamp-2">{rtDesc}</p>
        </div>
      </Link>
    );
  };

  // Social sharing
  const siteUrl = 'https://cataito.com';
  const toolUrl = `${siteUrl}/${locale}/tool/${tool.slug}`;
  const shareText = `${displayName} - Cataito AI Ecosystem Portal`;
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(toolUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(toolUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(toolUrl)}`,
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(toolUrl);
    setCopiedIndex('share-link');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
      <>
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} locale={locale} />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { name: tCategories(tool.category as any), href: `/category/${categoryToSlug(tool.category)}` },
            { name: displayName },
          ]}
          locale={locale}
        />

        {/* P4.3 内容保鲜横幅：每日存活探测连续失败时提示 */}
        {healthStatus && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
          >
            <span className="mt-0.5">⚠️</span>
            <span>{healthStatus === 'dead' ? t('healthDead') : t('healthUnreachable')}</span>
          </div>
        )}

        {/* P3.4 可引用 TL;DR 块 */}
        <ToolTldr tldr={tldr} />

        <article className="space-y-8">
          {/* Header Card */}
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] overflow-hidden">
                      <div className="p-8 border-b border-[var(--muted-border)]">
              <div className="flex items-start gap-6">
                {/* Logo */}
                <LogoTile
                                  logo={tool.logo}
                                  logoDark={tool.logoDark}
                                  alt={displayName}
                                  className="w-20 h-20 rounded-2xl"
                                  imgPx={64}
                                  fallbackClassName="text-3xl"
                                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">{displayName}</h1>
                                      </div>
                  <div className="flex items-center gap-2 text-[var(--muted)] mb-4">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">{tCategories(tool.category as any)}</span>
                  </div>

                  {tool.developer && (
                    <div className="flex items-center gap-2 text-[var(--muted)] mb-4">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm">{locale === 'zh' && tool.developerZh ? tool.developerZh : tool.developer}</span>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {tool.tags.map((tag) => (
                      <span
                                              key={tag}
                                              className="text-sm text-[var(--muted)]"
                                            >
                                              {tTags(tag as any)}
                                            </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-8">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" />
                {t('about')}
              </h2>
              <p className="text-[var(--muted)] leading-relaxed text-lg">
                {description}
              </p>
            </div>

            {/* Visit Button */}
            <div className="p-8 pt-0">
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--primary)] text-white font-medium rounded-full hover:bg-[var(--primary-hover)] transition shadow-sm"
              >
                {t('visit')}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Social Sharing */}
            <div className="px-8 pb-8">
              <div className="flex items-center gap-2 mb-3 text-sm text-[var(--muted)]">
                <Share2 className="w-4 h-4" />
                <span>{t('shareTool')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition text-xs font-medium">
                  <TwitterIcon className="w-3.5 h-3.5" /> Twitter
                </a>
                <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium">
                  <LinkedinIcon className="w-3.5 h-3.5" /> LinkedIn
                </a>
                <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-xs font-medium">
                  <FacebookIcon className="w-3.5 h-3.5" /> Facebook
                </a>
                <button onClick={handleCopyLink} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition text-xs font-medium shadow-sm">
                  {copiedIndex === 'share-link' ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                  {copiedIndex === 'share-link' ? t('linkCopied') : t('copyLink')}
                </button>
              </div>
            </div>
          </div>

          {/* Rich Details (if available) */}
          {details && (
            <>
              {/* Our Verdict */}
              {details.verdict && (details.verdict as any).badge && (
                <section aria-labelledby="our-verdict-title" className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] overflow-hidden">
                  {/* Header with badge */}
                  <div className="px-8 pt-8 pb-0">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 id="our-verdict-title" className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-500" />
                        {t('ourVerdict')}
                      </h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        (details.verdict as any).badge === 'Highly Recommended' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        (details.verdict as any).badge === 'Recommended' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        (details.verdict as any).badge === 'Worth Trying' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        (details.verdict as any).badge === 'For Specific Needs' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                (details.verdict as any).badge === 'Game-Changing' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {t(`verdict${(details.verdict as any).badge.replace(/\s+/g, '')}` as any)}
                      </span>
                    </div>
                    {/* Headline */}
                    <p className="text-base font-medium text-[var(--foreground)] mb-4 leading-relaxed">
                      {getLocalized((details.verdict as any).headline, locale) as string}
                    </p>
                  </div>

                  {/* Body */}
                  <div className="px-8 pb-6">
                    {((getLocalized((details.verdict as any).body, locale) as string) || '').split('\n\n').map((paragraph: string, i: number) => (
                      <p key={i} className="text-[var(--muted)] leading-relaxed text-sm mb-4 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {/* Best for + Consider alternatives */}
                  {((details.verdict as any).bestFor || (details.verdict as any).considerAlternatives) && (
                    <div className="px-8 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(details.verdict as any).bestFor && (
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            {t('bestFor')}
                          </h3>
                          <ul className="space-y-2">
                            {(getLocalized((details.verdict as any).bestFor, locale) as string[]).map((item: string, i: number) => (
                              <li key={i} className="text-sm text-[var(--muted)] flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(details.verdict as any).considerAlternatives && (
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-amber-500" />
                            {t('considerAlternativesIf')}
                          </h3>
                          <ul className="space-y-2">
                            {(getLocalized((details.verdict as any).considerAlternatives, locale) as string[]).map((item: string, i: number) => (
                              <li key={i} className="text-sm text-[var(--muted)] flex items-start gap-2">
                                <span className="text-amber-500 mt-1">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="px-8 pb-8">
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium rounded-full hover:opacity-90 transition text-sm shadow-sm"
                    >
                      {t('tryTool', { tool: displayName })}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </section>
              )}

              {/* Fallback: simple verdict for tools with old structure */}
              {details.verdict && !(details.verdict as any).badge && (details.verdict as any).summary && (
                <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    {t('ourVerdict')}
                  </h2>
                  <p className="text-[var(--muted)] leading-relaxed text-base">
                    {getLocalized((details.verdict as any).summary, locale) as string}
                  </p>
                </div>
              )}

              {/* Supported Platforms */}
              {supportedPlatforms.length > 0 && (
                <section aria-labelledby="supported-platforms-title" className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
                  <h2 id="supported-platforms-title" className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <MonitorSmartphone className="w-5 h-5 text-indigo-500" />
                    {t('supportedPlatforms')}
                  </h2>
                  <div className="flex flex-wrap gap-2.5">
                    {supportedPlatforms.map((p) => (
                                          <span
                                            key={p.key}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--muted-bg)] text-sm text-[var(--muted)]"
                                          >
                                            {t(p.labelKey as any)}
                                          </span>
                                        ))}
                  </div>
                  {/* SEO: 自然语言平台可用性说明 */}
                  <p className="text-sm text-[var(--muted)] mt-4 leading-relaxed">
                    {t('platformsAvailability', { platforms: platformsSentence })}
                  </p>
                </section>
              )}

              {/* Features */}
              <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-500" />
                  {t('keyFeatures')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(getLocalized(details.features, locale) as string[]).map((feature: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-[var(--muted)]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AdSense — Features 之后、Pricing 之前（仅长内容页插入） */}
              <AdUnit label={t('adLabel')} />

              {/* Pricing */}
              <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-500" />
                  {t('pricing')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(details.pricing as Record<string, unknown>).map(([key, value]) => (
                    <div key={key} className="p-4 bg-[var(--muted-bg)] rounded-xl">
                      <div className="text-sm font-medium text-[var(--muted)] capitalize mb-1">{key}</div>
                      <div className="text-[var(--foreground)]">{getLocalized(value, locale) as string}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Use Cases */}
              <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-indigo-500" />
                  {t('useCases')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(getLocalized(details.useCases, locale) as string[]).map((useCase: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <span className="text-[var(--muted)]">{useCase}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pros and Cons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    {t('pros')}
                  </h2>
                  <div className="space-y-3">
                    {(getLocalized(details.pros, locale) as string[]).map((pro: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-[var(--muted)]">{pro}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    {t('cons')}
                  </h2>
                  <div className="space-y-3">
                    {(getLocalized(details.cons, locale) as string[]).map((con: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-[var(--muted)]">{con}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Latest Update — 2026-09-14 暂时封存（Aaron 指示）
                原因：该板块在 975 个工具详情页展示人工撰写的「最新动态」文本，
                但站点未配备定时刷新机制，一旦产品方发布新特性而文案未同步，
                即向 Google 输出陈旧事实，触发 E-E-A-T「信息时效性」扣分。
                封存后保留数据层与 i18n 键，随时可恢复。
                恢复条件：建立自动化数据管道（或明确的人工巡检 + 时间戳刷新流程），
                确保「最新动态」字段在近 90 天内被复核或标记过期。
                恢复方法：把下方 false 改为 true（或直接删除条件表达式）。
                i18n key latestUpdate 与 data/tool-details/*.json 的 latestUpdate 字段均未动。 */}
              {false && (
                <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-500" />
                    {t('latestUpdate')}
                  </h2>
                  <p className="text-[var(--muted)] leading-relaxed">{getLocalized(details.latestUpdate, locale) as string}</p>
                </div>
              )}
            </>
          )}

          {/* Tutorial Section - redesigned for clarity and copy-ability, collapsed by default */}
                    {(details as Record<string, unknown>)?.tutorial && (
                      <details className="group bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] overflow-hidden" open={false}>
                        <summary className="px-8 py-6 border-b border-[var(--muted-border)] bg-[var(--muted-bg)] cursor-pointer list-none hover:bg-[var(--muted-bg)]/80 transition [&::-webkit-details-marker]:hidden flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                          </div>
                                                          <div>
                                                            <h2 className="text-xl font-bold text-[var(--foreground)]">
                                                              {(details.tutorial as Record<string, { title: string }>)[locale]?.title || (details.tutorial as Record<string, { title: string }>).en?.title}
                                                            </h2>
                            </div>
                          </div>
                          <ChevronDown className="w-5 h-5 text-[var(--muted)] shrink-0 transition-transform group-open:rotate-180" />
                        </summary>

              {/* Steps */}
              <div className="p-8">
                {(((details.tutorial as Record<string, { steps: unknown[] }>)[locale]?.steps || (details.tutorial as Record<string, { steps: unknown[] }>).en?.steps || []) as Record<string, unknown>[]).map((step, index: number) => {
                  const commands = (step.commands as Record<string, string>[]) || [];
                  return (
                    <div key={index} className={`flex gap-6 ${index > 0 ? 'mt-8 pt-8 border-t border-[var(--muted-border)]' : ''}`}>
                      {/* Step number */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                          <span className="text-base font-bold text-white">{step.step as string}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">{step.title as string}</h3>

                        {(step.content as string) && (
                          <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">{step.content as string}</p>
                        )}

                        {/* Command blocks */}
                        {commands.length > 0 && (
                          <div className="space-y-2.5">
                            {commands.map((cmd, cmdIndex: number) => {
                              const cmdId = `${step.step as string}-${cmdIndex}`;
                              return (
                                <div key={cmdIndex} className="group">
                                  {cmd.label && (
                                    <div className="text-xs font-medium text-[var(--muted)] mb-1 ml-1">{cmd.label}</div>
                                  )}
                                  <div className="flex items-stretch">
                                    {/* Code */}
                                    <div className="flex-1 bg-[var(--muted-bg)] border border-[var(--muted-border)] rounded-l-lg px-4 py-2.5 overflow-x-auto">
                                      <code className="text-sm text-[var(--foreground)] font-mono whitespace-nowrap select-all">{cmd.code}</code>
                                    </div>
                                    {/* Copy button */}
                                    <button
                                      onClick={() => handleCopy(cmd.code, cmdId)}
                                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[var(--muted-bg)] border border-l-0 border-[var(--muted-border)] rounded-r-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all"
                                      title={t('copyCommand')}
                                    >
                                      {copiedIndex === cmdId ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                                          <span className="text-emerald-500">{t('copied')}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Clipboard className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">{t('copy')}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                              </div>
                            </details>
                          )}

                          {/* Related Products (Same Maker / Platform) */}
          {sameMaker.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                {t('relatedProducts', { maker: makerName as string })}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sameMaker.map((rt) => renderRelatedCard(rt as Tool))}
              </div>
            </div>
          )}

          {/* Related Tools (Same Category) */}
          {relatedTools.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-500" />
                {t('relatedTools', { category: tCategories(tool.category as any) })}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedTools.map((rt) => renderRelatedCard(rt as Tool))}
              </div>
            </div>
          )}

          {/* Related Blog Posts */}
          {relatedPosts.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-indigo-500" />
                {t('relatedArticles')}
              </h2>
              <div className="space-y-4">
                {relatedPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="block p-4 rounded-xl bg-[var(--card-bg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1 capitalize">
                      {post.category}
                    </div>
                    <h3 className="font-medium text-[var(--foreground)] mb-1">
                      {getLocalized(post.title, locale) as string}
                    </h3>
                    <p className="text-sm text-[var(--muted)] line-clamp-2">
                      {getLocalized(post.excerpt, locale) as string}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Tutorials */}
          {relatedTutorials.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                {t('relatedTutorials')}
              </h2>
              <div className="space-y-4">
                {relatedTutorials.map((tut) => (
                                  <Link
                                    key={tut.slug}
                                    href={`/tutorials/${tut.slug}`}
                                    className="block p-4 rounded-xl bg-[var(--card-bg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300"
                                  >
                                    <div className="flex gap-4">
                                      {tut.coverImage && (
                                        <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-[var(--card-bg)]">
                                          <img
                                            src={tut.coverImage}
                                            alt=""
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                          />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                          <span className="text-xs font-medium text-[var(--primary)] capitalize">
                                            {tTutorials(`difficulties.${tut.difficulty}`)}
                                          </span>
                                          <span className="text-xs text-[var(--muted)]">
                                            {tut.readTime} {tTutorials('readTime')}
                                          </span>
                                        </div>
                                        <h3 className="font-medium text-[var(--foreground)] mb-1">
                                          {getLocalized(tut.title, locale) as string}
                                        </h3>
                                        <p className="text-sm text-[var(--muted)] line-clamp-2">
                                          {getLocalized(tut.excerpt, locale) as string}
                                        </p>
                                      </div>
                                    </div>
                                  </Link>
                                ))}
              </div>
            </div>
          )}
        </article>

        {/* Newsletter */}
        <div className="mt-8">
          <Newsletter />
        </div>
      </main>
      <Footer />
    </>
  );
}
