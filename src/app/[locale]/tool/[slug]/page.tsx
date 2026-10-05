import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { tools } from '@/data/aggregated';
import { toolDetails } from '@/data/aggregated';
import blogPosts from '@/data/blogPosts.json';
import tutorials from '@/data/tutorials.json';
import toolHealth from '@/data/tool-health.json';
import { Tool } from '@/components/ToolCard';
import ToolDetailClient from './ToolDetailClient';
import { routing } from '@/i18n/routing';
import { generateAlternates, getToolSeoTitle, getToolMetaDescription, generateSoftwareAppJsonLd } from '@/lib/seo';

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const params = [];
  for (const locale of routing.locales) {
    for (const tool of tools) {
      params.push({ locale, slug: tool.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const tool = tools.find((t) => t.slug === slug);

  if (!tool) {
    return { title: 'Resource Not Found - Cataito' };
  }

  const description = (() => {
    switch (locale) {
      case 'zh': return tool.description;
      case 'ja': return tool.descriptionJa || tool.descriptionEn;
      case 'es': return tool.descriptionEs || tool.descriptionEn;
      case 'fr': return tool.descriptionFr || tool.descriptionEn;
      default: return tool.descriptionEn;
    }
  })();
  const displayName = locale === 'zh' && tool.nameZh ? tool.nameZh : tool.name;

  const title = getToolSeoTitle(locale, displayName);
  // 优化版 Meta Description（词边界截断 + 价格/结论/核实年份钩子）
  const metaDescription = getToolMetaDescription(locale, displayName, description, tool.tags);

  return {
    title,
    description: metaDescription,
    alternates: generateAlternates(`/tool/${slug}`, locale),
    openGraph: {
      title: `${displayName} - Cataito`,
      description: description,
      images: [tool.logo],
    },
    twitter: {
      card: 'summary',
      title: displayName,
      description: description,
      images: [tool.logo],
    },
  };
}

export default async function ToolDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tool = tools.find((t) => t.slug === slug);

  if (!tool) {
    notFound();
  }

  // 在服务端按 slug 取单条详情与关联数据，避免客户端组件把整包数据打进 bundle
  // 被打进客户端 bundle（Lighthouse 报 670KiB 未使用 JS 的元凶）
  const details = (toolDetails as Record<string, unknown>)[tool.slug] ?? null;

  // 同厂商其它产品 + 同分类相关工具
  const sameMaker = tool.developer
    ? tools.filter((x) => x.developer && x.developer === tool.developer && x.slug !== tool.slug).slice(0, 4)
    : [];
  const sameMakerSlugs = new Set(sameMaker.map((x) => x.slug));
  const relatedTools = tools
    .filter((t) => t.category === tool.category && t.slug !== tool.slug && !sameMakerSlugs.has(t.slug))
    .slice(0, 4);

  // 关联博文（tags 匹配工具名/slug），发布时间倒序，只传渲染需要的字段
  const relatedPosts = blogPosts
    .filter((post) => {
      const postTags = (post.tags || []).map((t: string) => t.toLowerCase());
      const toolName = tool.name.toLowerCase();
      const toolSlug = tool.slug.toLowerCase();
      return postTags.some(
        (tag: string) => tag === toolName || tag === toolSlug || tag.includes(toolSlug)
      );
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 3)
    .map((post) => ({
      slug: post.slug,
      category: post.category,
      title: post.title,
      excerpt: post.excerpt,
    }));

  // 关联教程（related.tools 显式声明），只传渲染需要的字段
  const relatedTutorials = tutorials
    .filter((tut: any) => (tut.related?.tools || []).includes(tool.slug))
    .map((tut: any) => ({
          slug: tut.slug,
          title: tut.title,
          excerpt: tut.excerpt,
          difficulty: tut.difficulty,
          readTime: tut.readTime,
          coverImage: tut.coverImage,
        }));

  // 服务端 JSON-LD（Googlebot 可靠读取）
  const displayName = locale === 'zh' && tool.nameZh ? tool.nameZh : tool.name;
  // SoftwareApplication.url 必须指向本站页面 URL（而非 tool.url 产品外链），
  // 否则 Google 会将该 schema 视作推荐外链而非本页描述
  const pageUrl = `https://cataito.com/${locale}/tool/${slug}`;
  const detailMeta = ((details as { meta?: Record<string, unknown> })?.meta as { lastVerified?: string; verdictDate?: string }) || {};
  const tCategories = await getTranslations({ locale, namespace: 'categories' });
  const categoryLabel = tCategories(tool.category);
  const description = (() => {
    switch (locale) {
      case 'zh': return tool.description;
      case 'ja': return tool.descriptionJa || tool.descriptionEn;
      case 'es': return tool.descriptionEs || tool.descriptionEn;
      case 'fr': return tool.descriptionFr || tool.descriptionEn;
      default: return tool.descriptionEn;
    }
  })();
  const osList = tool.platforms
    ? Object.entries(tool.platforms)
        .filter(([, v]) => v === true)
        .map(([k]) => k === 'web' ? 'Web' : k === 'mac' ? 'macOS' : k === 'win' ? 'Windows' : k === 'linux' ? 'Linux' : k === 'ios' ? 'iOS' : k === 'android' ? 'Android' : k)
        .join(', ') || 'Web'
    : 'Web';
  const toolJsonLd = generateSoftwareAppJsonLd({
    name: displayName,
    description,
    image: tool.logo,
    url: pageUrl,
    developer: tool.developer || 'Cataito',
    applicationCategory: categoryLabel,
    operatingSystem: osList,
    offers: {
      price: tool.tags.includes('Free') ? '0' : tool.tags.includes('Paid') ? '' : '0',
      priceCurrency: 'USD',
    },
    datePublished: detailMeta.verdictDate,
    dateModified: detailMeta.lastVerified,
  });

  // P3.4 可引用 TL;DR 块：40 字级事实清单（AI 检索器/富摘要友好），服务端算好传客户端
  const d = (details ?? {}) as {
    pricing?: Record<string, unknown>;
    verdict?: { headline?: Record<string, string> };
    meta?: { pricingUrl?: string };
  };
  const tldr = {
    displayName,
    category: categoryLabel,
    developer: tool.developer || '',
    officialUrl: tool.url,
    pricingTiers: d.pricing ? Object.keys(d.pricing) : [],
    fromPrice: (d as { pricingInfo?: { fromPrice?: string } }).pricingInfo?.fromPrice ?? null,
    pricingUrl: d.meta?.pricingUrl || null,
    verdict: d.verdict?.headline
      ? d.verdict.headline[locale] ?? d.verdict.headline.en ?? null
      : null,
    verified: detailMeta.lastVerified ?? null,
  };

  // P4.3 内容保鲜：每日存活探测结果驱动的横幅（dead 显示，suspect 不显示）
  // 2026-09-14 unreachable 判定暂时停用（Aaron 指示）：GitHub Actions 海外节点探测
  // 国内/墙外站点普遍失败，tool-health.json 当前 288/288 全 unreachable（streak ≥ 7）
  // 但实际都是网络假阳性，导致每个工具详情页顶上一个黄横幅，E-E-A-T 严重扣分。
  // DEAD 判定（连续两轮 404 / ENOTFOUND / 410）保留——真挂时仍能告警。
  // 恢复条件：check-tool-liveness.mjs 换国内/双区域探测节点，unreachable 恢复可信后
  // 把下方 `|| healthEntry?.status === 'unreachable'` 注释解开。
  const healthEntry = (toolHealth as { tools?: Record<string, { status?: string }> }).tools?.[
    tool.slug
  ];
  const healthStatus =
    healthEntry?.status === 'dead'
    // || healthEntry?.status === 'unreachable'  // 停用中，见上方注释
      ? healthEntry.status
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd) }}
      />
      <ToolDetailClient
        tool={tool as Tool}
        locale={locale}
        details={details}
        tldr={tldr}
        healthStatus={healthStatus}
        sameMaker={sameMaker as Tool[]}
        relatedTools={relatedTools as Tool[]}
        relatedPosts={relatedPosts}
        relatedTutorials={relatedTutorials}
      />
    </>
  );
}