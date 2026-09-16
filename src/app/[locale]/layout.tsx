import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import GoogleAnalytics from '../GoogleAnalytics';
import AdSense from '../AdSense';
import { ADSENSE_CLIENT } from '@/lib/adsense';
import { ThemeProvider } from '@/components/ThemeProvider';
import ConsentBanner from '@/components/ConsentBanner';
import { routing, TEMP_NOINDEX_LOCALES } from '@/i18n/routing';
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// TEMP_NOINDEX_LOCALES 已上移至 src/i18n/routing.ts（单一 source of truth，seo.ts 的 hreflang 过滤共用）

interface LayoutMetadataProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutMetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const noindex = TEMP_NOINDEX_LOCALES.has(locale);

  return {
    metadataBase: new URL('https://cataito.com'),
    title: "Cataito - Best AI Tools, Models & Agents Directory | Free Reviews",
    description: "Discover 180+ free and paid AI tools. Compare features, pricing and reviews — from ChatGPT, DeepSeek, Kling AI to Grok. Your AI toolkit starts here.",
    keywords: "AI portal, AI tools directory, AI models, AI agents, ChatGPT, DeepSeek, Kling AI, Grok, Gemini, Claude, AI reviews, free AI tools, artificial intelligence",
    authors: [{ name: "Cataito" }],
    // AdSense 站点所有权元标记（配合根目录 public/ads.txt，双通道验证）
    other: { "google-adsense-account": ADSENSE_CLIENT },
    icons: {
      // 浏览器 tab：亮/暗双版 SVG + 派生 PNG；由 prefers-color-scheme 自动切换
      // SVG 源（favicon.svg / favicon-dark.svg）来自 _internal/generate-brand-assets.js 生成
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
        { url: '/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: light)' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png', media: '(prefers-color-scheme: light)' },
        { url: '/favicon-dark-16x16.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: dark)' },
        { url: '/favicon-dark-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      ],
      // iOS / Android 添加到主屏（180×180；dark 变体供深色模式）
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', media: '(prefers-color-scheme: light)' },
        { url: '/apple-touch-icon-dark.png', sizes: '180x180', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      ],
    },
    openGraph: {
      title: "Cataito - AI Ecosystem Portal",
      description: "Discover AI models, agents, tools, and resources from around the world.",
      type: "website",
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : locale === 'es' ? 'es_ES' : locale === 'fr' ? 'fr_FR' : 'en_US',
      siteName: "Cataito",
      images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Cataito' }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Cataito - AI Ecosystem Portal",
      description: "Your gateway to the global AI ecosystem.",
      images: ['/logo.png'],
    },
    robots: {
      index: !noindex,
      follow: !noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  // 启用静态渲染：告知 next-intl 当前请求 locale，避免 getMessages() 因读取 headers() 而退化为动态渲染
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <GoogleAnalytics />
        <AdSense />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
            <ConsentBanner />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
