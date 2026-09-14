import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import tutorials from '@/data/tutorials.json';
import TutorialsClient from './TutorialsClient';
import { generateAlternates, DEFAULT_OG_IMAGES } from '@/lib/seo';

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tutorials' });
  const title = `${t('title')} - Cataito`;
  const description = t('subtitle');
  return {
    title,
    description,
    alternates: generateAlternates('/tutorials', locale),
    openGraph: {
      title,
      description,
      type: 'website',
      images: DEFAULT_OG_IMAGES,
    },
  };
}

export default function TutorialsPage() {
  return <TutorialsClient tutorials={tutorials} />;
}
