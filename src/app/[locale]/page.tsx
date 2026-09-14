import type { Metadata } from 'next';
import { generateAlternates, DEFAULT_OG_IMAGES, DEFAULT_TWITTER_IMAGES, getHomeSeo, generateWebSiteJsonLd, generateOrganizationJsonLd } from '@/lib/seo';
import HomePageClient from './HomePageClient';

// Cloudflare Cache Everything 已设 1h；这里再设 1h 作为第二层缓存兜底
export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description, keywords } = getHomeSeo(locale);
  return {
    title,
    description,
    keywords,
    alternates: generateAlternates('/', locale),
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Cataito',
      images: DEFAULT_OG_IMAGES,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: DEFAULT_TWITTER_IMAGES,
    },
  };
}

export default async function HomePage(props: Props) {
  const { locale } = await props.params;
  const webSiteJsonLd = generateWebSiteJsonLd({
    locale, // SearchAction target 按当前语种动态化（/en 或 /zh）
    org: generateOrganizationJsonLd(),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
