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
      // 浏览器 tab：亮/暗双版 SVG（A 字母：V 形主体 + 蓝点横杠），用 media 属性让浏览器按系统偏好自动选
      // 注意：SVG 作为 favicon 加载时（外部图像），内部 <style> 和 @media 不生效，
      // 必须用双文件 + <link media="..."> 让浏览器在加载时选对版本
      // .ico 兜底老浏览器（渲染默认色=黑 A，仅亮色模式可见；暗色模式下仍显示黑 A，可接受）
      icon: [
        { url: '/favicon-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
        { url: '/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
        { url: '/favicon.ico', type: 'image/x-icon' },
      ],
      // iOS/Android 添加到主屏：用 SVG 渲染的 PNG 兜底（无暗色变体，iOS 不支持 SVG favicon）
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
