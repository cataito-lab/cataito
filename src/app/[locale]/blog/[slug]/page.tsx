import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import blogPosts from '@/data/blogPosts.json';
import { routing } from '@/i18n/routing';
import { generateAlternates, generateArticleJsonLd, BASE_URL } from '@/lib/seo';
import BlogDetailClient from './BlogDetailClient';

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    for (const post of blogPosts) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return { title: 'Article Not Found - Cataito' };
  }

  const title = (post.title as Record<string, string>)[locale] || post.title.en;
  const excerpt = (post.excerpt as Record<string, string>)[locale] || post.excerpt.en;
  // 封面统一用数据文件里的 SVG（public/blog/covers/ 只有 .svg；此前硬编码 .png 404 导致详情页与 OG 全部落到兜底占位图）
  const localeCover = post.coverImage;

  // 自定义 SEO（优先），回退到默认标题 + excerpt
  const seo = post.seo as { title?: Record<string, string>; description?: Record<string, string> } | undefined;
  const seoTitle = seo?.title?.[locale] || seo?.title?.en || `${title} - Cataito Blog`;
  const seoDesc = seo?.description?.[locale] || seo?.description?.en || excerpt;

  return {
    title: seoTitle,
    description: seoDesc,
    alternates: generateAlternates(`/blog/${slug}`, locale),
    openGraph: {
      title: `${title} - Cataito`,
      description: seoDesc,
      images: [localeCover],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: seoDesc,
      images: [localeCover],
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const title = (post.title as Record<string, string>)[locale] || post.title.en;
  const excerpt = (post.excerpt as Record<string, string>)[locale] || post.excerpt.en;
  const articleJsonLd = generateArticleJsonLd({
    title,
    description: excerpt,
    image: post.coverImage,
    author: post.author,
    datePublished: post.publishedAt,
    url: `${BASE_URL}/${locale}/blog/${slug}`,
  });

  // 与 generateMetadata 保持一致：详情页封面用数据文件里的 SVG
  const localeCover = post.coverImage;

  return <BlogDetailClient post={post} locale={locale} articleJsonLd={articleJsonLd} coverImage={localeCover} />;
}