'use client';

import { Star, GitFork, ExternalLink, Code2, Copy, Check, Terminal, ArrowLeft, Building2, ChevronDown, ThumbsUp, ThumbsDown, DollarSign, Target, Award, Camera } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumb from '@/components/Breadcrumb';
import Image from 'next/image';
import DOMPurify from 'isomorphic-dompurify';
import FaqSection from '@/components/FaqSection';
import type { Skill } from '../SkillsClient';
import { fetchReadmeInstallHtml } from '@/lib/readme-parser';

interface SkillDetails {
  pros: Record<string, string[]>;
  cons: Record<string, string[]>;
  pricing?: Record<string, Record<string, string>>;
  verdict: Record<string, string>;
  useCases: Record<string, string[]>;
  portfolio?: string[];
}

const getLocalized = (field: Record<string, string | string[]> | undefined, locale: string): string | string[] | undefined => {
  if (!field) return undefined;
  return field[locale] || field.en;
};

const getLocalizedSkillDescription = (skill: Skill, locale: string) => {
  switch (locale) {
    case 'zh': return skill.description;
    case 'ja': return skill.descriptionJa || skill.descriptionEn;
    case 'es': return skill.descriptionEs || skill.descriptionEn;
    case 'fr': return skill.descriptionFr || skill.descriptionEn;
    default: return skill.descriptionEn;
  }
};

const AGENT_COLORS: Record<string, string> = {
  'claude': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'cursor': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'codex': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'workbuddy': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'generic': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const TAG_COLORS: Record<string, string> = {
  'Free': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Open Source': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'API': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

interface SkillDetailClientProps {
  skill: Skill;
  locale: string;
  details?: SkillDetails;
}

export default function SkillDetailClient({ skill, locale, details }: SkillDetailClientProps) {
  const t = useTranslations('common');
  const tSkills = useTranslations('skills');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [readmeInstallHtml, setReadmeInstallHtml] = useState<string | undefined>(undefined);
  const displayName = locale === 'zh' && skill.nameZh ? skill.nameZh : skill.name;
  const stars = skill.stars;

  // 客户端懒加载 GitHub README 安装区块
  useEffect(() => {
    if (!skill.repo) return;
    let cancelled = false;
    fetchReadmeInstallHtml(skill.repo, tSkills('copyCommand')).then((html) => {
      if (!cancelled) setReadmeInstallHtml(html ?? undefined);
    });
    return () => { cancelled = true; };
  }, [skill.repo, tSkills]);

  const handleCopyCommand = () => {
    const cmd = skill.installCommand.replace('{{agent}}', skill.agents[0]);
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const installCmd = skill.installCommand.replace('{{agent}}', skill.agents[0]);

  const copiedLabel = t('copied');
  useEffect(() => {
    const container = document.querySelector('.readme-install');
    if (!container) return;

    const handleClick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.copy-code-btn');
      if (!btn) return;
      const wrapper = btn.closest('.code-block-wrapper');
      if (!wrapper) return;
      const code = wrapper.querySelector('code');
      if (!code) return;
      navigator.clipboard.writeText(code.textContent || '');
      const original = btn.textContent;
      btn.textContent = copiedLabel;
      setTimeout(() => { btn.textContent = original; }, 1500);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [readmeInstallHtml, copiedLabel]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: displayName,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform',
    url: `https://github.com/${skill.repo}`,
    image: skill.logo,
    description: getLocalizedSkillDescription(skill, locale),
    offers: {
      '@type': 'Offer',
      price: skill.tags.includes('Free') ? '0' : '',
      priceCurrency: 'USD',
    },
  };

  const localizedPros = details ? (getLocalized(details.pros, locale) as string[] | undefined) : undefined;
  const localizedCons = details ? (getLocalized(details.cons, locale) as string[] | undefined) : undefined;
  const localizedVerdict = details ? (getLocalized(details.verdict, locale) as string | undefined) : undefined;
  const localizedUseCases = details ? (getLocalized(details.useCases, locale) as string[] | undefined) : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} locale={locale} />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { name: tSkills('title'), href: '/skills' },
            { name: displayName },
          ]}
          locale={locale}
        />

        <article className="space-y-6">
          {/* Header Card */}
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] overflow-hidden">
            <div className="p-8">
              <div className="flex items-start gap-6">
                {/* Logo */}
                <div className="w-20 h-20 rounded-2xl bg-[var(--logo-tile-bg)] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  <Image
                    src={skill.logo}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain"
                    unoptimized
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">{displayName}</h1>
                                      </div>
                  <div className="flex items-center gap-2 text-[var(--muted)] mb-3">
                    <Code2 className="w-4 h-4" />
                    <span className="text-sm">{tSkills(`categories.${skill.category}`)}</span>
                  </div>

                  {/* Repo & Stars */}
                  <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-4">
                    <span className="flex items-center gap-1.5">
                      <GitFork className="w-4 h-4" />
                      <a
                        href={`https://github.com/${skill.repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--primary)] transition"
                      >
                        {skill.repo}
                      </a>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="w-4 h-4" />
                      {stars.toLocaleString()} {tSkills('starsLabel')}
                    </span>
                  </div>

                  {/* Developer */}
                  {skill.developer && (
                    <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-4">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        {locale === 'zh' && skill.developerZh ? skill.developerZh : skill.developer}
                      </span>
                    </div>
                  )}

                  {/* Agent badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {skill.agents.map((agent) => (
                      <span
                        key={agent}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${AGENT_COLORS[agent] || AGENT_COLORS['generic']}`}
                      >
                        {agent}
                      </span>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="px-8 pb-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-500" />
                {t('about')}
              </h2>
              <p className="text-[var(--muted)] leading-relaxed text-lg">
                {getLocalizedSkillDescription(skill, locale)}
              </p>
            </div>
            {/* Verdict */}
            {localizedVerdict && (
              <div className="px-8 pb-8">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  {t('ourVerdict')}
                </h2>
                <div className="bg-[var(--muted-bg)] rounded-lg p-5 border border-[var(--muted-border)]">
                  <p className="text-[var(--muted)] leading-relaxed">{localizedVerdict}</p>
                </div>
              </div>
            )}
            {/* Pricing */}
            {details?.pricing && (
              <div className="px-8 pb-8">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                                    {t('pricing')}
                                  </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(details.pricing).map(([tier, desc]) => {
                    const label = getLocalized(desc, locale) as string;
                    return (
                      <div key={tier} className="bg-[var(--muted-bg)] rounded-lg px-4 py-3 border border-[var(--muted-border)]">
                        <div className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">{tier}</div>
                        <div className="text-sm font-medium text-[var(--foreground)]">{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Use Cases */}
            {localizedUseCases && (
              <div className="px-8 pb-8">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  {t('useCases')}
                </h2>
                <ul className="space-y-2">
                  {localizedUseCases.map((uc, i) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--muted)]">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>{uc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Portfolio — 原作者作品展示 */}
            {details?.portfolio && details.portfolio.length > 0 && (
              <div className="px-8 pb-8">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>{locale === 'zh' ? '原作者作品' : locale === 'ja' ? '作者の作品' : locale === 'es' ? 'Obras del autor' : locale === 'fr' ? 'Travaux de l\'auteur' : 'Author\'s Works'}</span>
                </h2>
                <p className="text-sm text-[var(--muted)] mb-3">
                  {locale === 'zh' ? '以下为原作者在公开仓库中提供的作品示例，展示该 Skill 的真实输出能力。' : locale === 'ja' ? '以下は原作者が公開リポジトリで提供した作品例で、この Skill の実際の出力能力を示します。' : locale === 'es' ? 'A continuación, ejemplos de obras proporcionadas por el autor en el repositorio público, mostrando la verdadera capacidad de salida del Skill.' : locale === 'fr' ? 'Ci-dessous, exemples d\'œuvres fournies par l\'auteur dans le dépôt public, montrant la véritable capacité de sortie du Skill.' : 'The following are example works provided by the author in the public repo, demonstrating the real output capability of this Skill.'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {details.portfolio.map((src, i) => (
                    <a
                      key={i}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--muted-bg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <img
                        src={src}
                        alt={`author-work-${i+1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {/* Pros & Cons */}
            {localizedPros && localizedCons && (
              <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-emerald-500" />
                                        {t('pros')}
                                      </h2>
                  <ul className="space-y-2">
                    {localizedPros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-[var(--muted)]">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                    <ThumbsDown className="w-5 h-5 text-red-500" />
                                        {t('cons')}
                                      </h2>
                  <ul className="space-y-2">
                    {localizedCons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-[var(--muted)]">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {/* Install Command */}
            <div className="px-8 pb-8">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-500" />
                {t('installation')}
              </h2>
              <div className="flex items-stretch">
                <div className="code-install-box flex-1 border border-[var(--muted-border)] rounded-l-lg px-4 py-3 overflow-x-auto">
                  <code className="code-install-text text-sm font-mono whitespace-nowrap select-all">{installCmd}</code>
                </div>
                <button
                  onClick={handleCopyCommand}
                  className="code-install-btn flex items-center gap-1.5 px-4 py-3 border border-l-0 border-[var(--muted-border)] rounded-r-lg text-xs font-medium hover:text-white hover:bg-[var(--primary)]/20 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{tSkills('copyCommand')}</span>
                    </>
                  )}
                </button>
              </div>
              {readmeInstallHtml && (
                <details className="group mt-5" open={locale === 'en'}>
                  <summary className="flex items-center gap-1.5 cursor-pointer list-none text-sm font-medium text-[var(--muted)] hover:text-[var(--primary)] transition mb-2 [&::-webkit-details-marker]:hidden">
                    <span>{tSkills('officialGuide')}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="bg-[var(--card-bg)] border border-[var(--muted-border)] rounded-lg p-5 overflow-x-auto">
                    <div
                      className="readme-install text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(readmeInstallHtml) }}
                    />
                  </div>
                </details>
              )}
            </div>
            {/* Action Buttons */}
                        <div className="px-8 pb-8 flex flex-wrap gap-3">
                          {skill.repo && skill.repo.includes('/') && (
                          <a
                            href={`https://github.com/${skill.repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium rounded-full hover:opacity-90 transition shadow-md"
                          >
                            <GitFork className="w-4 h-4" />
                            {tSkills('viewOnGitHub')}
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          )}
              <Link
                href="/skills"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--muted-border)] text-[var(--foreground)] font-medium rounded-full hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {tSkills('backToList')}
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <FaqSection faqs={skill.faqs} locale={locale} title={tSkills('faqTitle')} />

          {/* Related Tutorials */}
</article>
      </main>
      <Footer />
    </>
  );
}