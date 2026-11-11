import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import SkillDetailClient from './SkillDetailClient';
import { skills } from '@/data/aggregated';
import { skillDetails } from '@/data/aggregated';
import { generateAlternates, getSkillMetaDescription } from '@/lib/seo';
import { routing } from '@/i18n/routing';

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    for (const skill of skills) {
      params.push({ locale, slug: skill.slug });
    }
  }
  return params;
}

/** Pick the description matching the locale (falls back to English) */
function getLocalizedDescription(skill: (typeof skills)[number], locale: string): string {
  switch (locale) {
    case 'zh': return skill.description;
    case 'ja': return skill.descriptionJa || skill.descriptionEn;
    case 'es': return skill.descriptionEs || skill.descriptionEn;
    case 'fr': return skill.descriptionFr || skill.descriptionEn;
    default: return skill.descriptionEn;
  }
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'skills' });
  const skill = skills.find((s) => s.slug === slug);
  if (!skill) return { title: t('notFound') };

  const name = locale === 'zh' && skill.nameZh ? skill.nameZh : skill.name;
  const rawDesc = getLocalizedDescription(skill, locale);
  // Bing SEO 建议 150-160 字符：用 getSkillMetaDescription 包装原始 description
  const metaDesc = getSkillMetaDescription(locale, name, rawDesc);
  return {
      title: `${name} - ${t('title')}`,
      description: metaDesc,
      alternates: generateAlternates(`/skills/${slug}`, locale),
      openGraph: {
        title: `${name} - Cataito Skills`,
        description: metaDesc,
        images: [skill.logo],
      },
      twitter: {
        card: 'summary',
        title: name,
        description: metaDesc,
        images: [skill.logo],
      },
    };
}

/** 星数单一数据源：直接读 skills.json 的 stars（由 refresh-stars 定时/手动刷新），与列表卡片始终一致 */
export default async function SkillDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const skill = skills.find((s) => s.slug === slug);
  if (!skill) notFound();

  // 关联教程（related.skills 显式声明），只传渲染需要的字段
  return (
      <SkillDetailClient
        skill={skill}
        locale={locale}
        details={(skillDetails as Record<string, any>)[slug]}
      />
    );
}
