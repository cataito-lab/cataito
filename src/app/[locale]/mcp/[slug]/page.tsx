import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import McpDetailClient from './McpDetailClient';
import { mcp as mcpServers } from '@/data/aggregated';
import { mcpDetails } from '@/data/aggregated';
import { generateAlternates, getMcpMetaDescription } from '@/lib/seo';
import { routing } from '@/i18n/routing';

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    for (const entry of mcpServers) {
      params.push({ locale, slug: entry.slug });
    }
  }
  return params;
}

/** Pick the description matching the locale (falls back to English) */
function getLocalizedDescription(entry: (typeof mcpServers)[number], locale: string): string {
  switch (locale) {
    case 'zh': return entry.description;
    case 'ja': return entry.descriptionJa || entry.descriptionEn;
    case 'es': return entry.descriptionEs || entry.descriptionEn;
    case 'fr': return entry.descriptionFr || entry.descriptionEn;
    default: return entry.descriptionEn;
  }
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'mcp' });
  const entry = mcpServers.find((s) => s.slug === slug);
  if (!entry) return { title: t('notFound') };

  const name = locale === 'zh' && entry.nameZh ? entry.nameZh : entry.name;
  const rawDesc = getLocalizedDescription(entry, locale);
  // Bing SEO 建议 150-160 字符：用 getMcpMetaDescription 包装原始 description
  const metaDesc = getMcpMetaDescription(locale, name, rawDesc);
  return {
      title: `${name} - ${t('title')}`,
      description: metaDesc,
      alternates: generateAlternates(`/mcp/${slug}`, locale),
      openGraph: {
        title: `${name} - Cataito MCP`,
        description: metaDesc,
        images: [entry.logo],
      },
      twitter: {
        card: 'summary',
        title: name,
        description: metaDesc,
        images: [entry.logo],
      },
    };
}

/** 星数单一数据源：直接读 mcp.json 的 stars（由 refresh-stars 定时/手动刷新），与列表卡片始终一致 */
export default async function McpDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const entry = mcpServers.find((s) => s.slug === slug);
  if (!entry) notFound();

  // 关联教程（related.mcp 显式声明），只传渲染需要的字段
  return (
      <McpDetailClient
        server={entry}
        locale={locale}
        details={(mcpDetails as Record<string, any>)[slug]}
      />
    );
}
