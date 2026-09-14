import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { tools } from '@/data/aggregated';
import { generateAlternates, getCategorySeo, BASE_URL, DEFAULT_OG_IMAGES, DEFAULT_TWITTER_IMAGES } from '@/lib/seo';
import type { Tool } from '@/components/ToolCard';
import CategoryClient from './CategoryClient';
import { CATEGORIES, categoryToSlug, slugToCategory } from '@/lib/categories';

export const revalidate = 3600;

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ slug: categoryToSlug(cat) }));
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = slugToCategory(slug);
  if (!category) return {};

  const categoryTools = tools.filter((t) => t.category === category);
  const tCategories = await getTranslations({ locale, namespace: 'categories' });
  const categoryLabel = tCategories(category);
  const { title, description } = getCategorySeo(locale, categoryLabel, categoryTools.length);

  return {
    title,
    description,
    alternates: generateAlternates(`/category/${slug}`, locale),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/category/${slug}`,
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

export default async function CategoryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const category = slugToCategory(slug);
  if (!category) notFound();

  const categoryTools = tools.filter((t) => t.category === category);

  // JSON-LD: ItemList schema for category
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${category} AI Tools`,
    description: `Top ${category.toLowerCase()} AI tools comparison`,
    numberOfItems: categoryTools.length,
    itemListElement: categoryTools.map((tool, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: tool.name,
      url: `${BASE_URL}/en/tool/${tool.slug}`,
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
      <CategoryClient
        category={category}
        slug={slug}
        tools={categoryTools as Tool[]}
        locale={locale}
      />
    </>
  );
}
