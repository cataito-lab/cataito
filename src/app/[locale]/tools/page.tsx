import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { tools } from '@/data/aggregated';
import { generateAlternates, BASE_URL, DEFAULT_OG_IMAGES, DEFAULT_TWITTER_IMAGES } from '@/lib/seo';
import type { Tool } from '@/components/ToolCard';
import ToolsClient from './ToolsClient';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'allTools' });
  const title = t('metaTitle', { count: tools.length });
  const description = t('metaDescription', { count: tools.length });

  return {
    title,
    description,
    alternates: generateAlternates('/tools', locale),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/tools`,
      type: 'website',
      images: DEFAULT_OG_IMAGES,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: DEFAULT_TWITTER_IMAGES,
    },
  };
}

export default async function ToolsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // JSON-LD: ItemList schema for the full tool directory
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'All AI Tools',
    description: 'The complete Cataito AI tools directory',
    numberOfItems: tools.length,
    itemListElement: tools.map((tool, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: tool.name,
      url: `${BASE_URL}/${locale}/tool/${tool.slug}`,
      description: tool.descriptionEn,
      image: tool.logo,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolsClient tools={tools as Tool[]} locale={locale} />
    </>
  );
}
