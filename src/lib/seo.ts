/**
 * SEO 工具函数 — 统一生成 hreflang + canonical 元数据
 */

import { locales, TEMP_NOINDEX_LOCALES } from '@/i18n/routing';

export const BASE_URL = 'https://cataito.com';
// 语言列表统一来自 routing.ts（单一 source of truth），新增语言只改那里
export const LOCALES = locales;
export type Locale = (typeof LOCALES)[number];

/**
 * 全站默认 OG 图片常量（1200x630 社交分享卡片标准比例）
 * 各页 generateMetadata 的 openGraph 必须引用此常量，否则 Next.js Metadata API
 * 对 openGraph 是整体替换——页面级不写 images 就会把 layout 的 images 覆盖掉。
 */
export const DEFAULT_OG_IMAGE = {
  url: 'https://cataito.com/logo.png',
  width: 1200,
  height: 630,
  alt: 'Cataito - Best AI Tools, Models & Agents Directory',
} as const;

/**
 * 全站默认 OG 图片集（数组形式，供 openGraph.images 使用）
 */
export const DEFAULT_OG_IMAGES = [DEFAULT_OG_IMAGE];

/**
 * 全站默认 Twitter 图片（供 twitter.images 使用）
 */
export const DEFAULT_TWITTER_IMAGES = ['https://cataito.com/logo.png'];

/**
 * 为指定路径生成 hreflang + canonical alternates 对象
 * @param path 以 / 开头的路径，如 /tool/chatgpt 或 /blog
 * @param currentLocale 当前页面语言（必填）；canonical 自引用到该语言版本
 *        （多语言站点最佳实践：每个语言页 canonical 指向自身，避免被 /en 合并而不被收录）
 *        设为必填是为了让新增页面若漏传 locale 时 `next build` 直接 TypeScript 报错，防止 canonical 退化为全部指向 /en。
 */
export function generateAlternates(path: string, currentLocale: string) {
  // 归一化：首页 path='/' 会拼出 /en/（尾斜杠），与实际 URL /en 不一致，
  // 导致 Lighthouse canonical 审计失败（Points to another hreflang location），统一去掉尾斜杠
  const normalizedPath = path === '/' ? '' : path.replace(/\/+$/, '');
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    // 与 noindex 策略联动（单一 source of truth：routing.ts）——
    // noindex 的语言不进 hreflang，避免「hreflang 互指 + noindex」的自相矛盾信号
    if (TEMP_NOINDEX_LOCALES.has(locale)) continue;
    languages[locale] = `${BASE_URL}/${locale}${normalizedPath}`;
  }
  // x-default 指向英文版，供未匹配语言的用户回退
  languages['x-default'] = `${BASE_URL}/en${normalizedPath}`;
  // canonical 同理：noindex 语言的页面 canonical 仍指向自身（自引用 canonical 不受 noindex 影响，
  // 且解除 noindex 后无需改动即可恢复正确指向）
  const canonicalLocale = (LOCALES as readonly string[]).includes(currentLocale)
    ? currentLocale
    : 'en';
  return {
    canonical: `${BASE_URL}/${canonicalLocale}${normalizedPath}`,
    languages,
    // RSS feeds（P3.3）：放在 generateAlternates 里而非 layout，因为页面级
    // alternates 会整体覆盖 layout 级，这里才能保证每个页面都带 feed 声明
    types: {
      'application/rss+xml': [
        { url: '/rss/blog.xml', title: 'Cataito Blog' },
        { url: '/rss/tutorials.xml', title: 'Cataito Tutorials' },
        { url: '/rss/ranking.xml', title: 'Cataito GitHub AI Rankings' },
      ],
    },
  };
}

/**
 * 工具详情页本地化 SEO 标题
 * 品牌前置 + 长尾关键词 + 年份，控制在 60 字符内避免 Google SERP 截断
 */
export function getToolSeoTitle(
  locale: string,
  name: string,
  categoryLabel: string
): string {
  const map: Record<string, string> = {
    en: `${name} — Best ${categoryLabel} AI Tool in 2026 | Cataito`,
    zh: `${name} — 2026年最佳${categoryLabel} AI 工具 | Cataito`,
    ja: `${name} — 2026年ベスト${categoryLabel} AIツール | Cataito`,
    es: `${name} — Mejor herramienta IA de ${categoryLabel} 2026 | Cataito`,
    fr: `${name} — Meilleur outil IA ${categoryLabel} 2026 | Cataito`,
  };
  return map[locale] || map.en;
}

/**
 * 工具详情页本地化 Meta Description（150-160 字符目标，含 CTA + 价格信号）
 * Bing 建议 150-160 字符，之前截到 65 太短。现在截到 90-100 字符 + CTA 补全。
 */
export function getToolMetaDescription(
  locale: string,
  name: string,
  categoryLabel: string,
  rawDescription: string,
  tags?: string[]
): string {
  const freeTag = tags?.includes('Free') ? ' Free' : '';
  // 保留 90-100 字符（中英日韩西法各自截断），去掉末尾标点
  const truncated = rawDescription.slice(0, 100).replace(/[.。!！?？…]+$/, '');

  const map: Record<string, string> = {
    en: `${name} is a${freeTag} ${categoryLabel} AI tool. ${truncated}. Compare features, pricing, pros/cons — find your ideal AI tool.`,
    zh: `${name} 是一款${freeTag ? '免费' : ''}${categoryLabel} AI 工具。${truncated}。对比功能、价格、优缺点，找到最合适的 AI 工具。`,
    ja: `${name}は${freeTag ? '無料の' : ''}${categoryLabel} AIツールです。${truncated}。機能・料金・メリット・デメリットを比較。`,
    es: `${name} es una herramienta${freeTag ? ' gratuita' : ''} de IA de ${categoryLabel}. ${truncated}. Compare funciones, precios y opiniones.`,
    fr: `${name} est un outil${freeTag ? ' gratuit' : ''} IA ${categoryLabel}. ${truncated}. Comparez fonctionnalités, tarifs et avis.`,
  };
  return map[locale] || map.en;
}

/**
 * MCP 详情页本地化 Meta Description（150-160 字符目标）
 * 数据里的 description 通常 50-90 字符，需要加品牌前缀 + CTA 补全。
 */
export function getMcpMetaDescription(
  locale: string,
  name: string,
  rawDescription: string
): string {
  const truncated = rawDescription.slice(0, 110).replace(/[.。!！?？…]+$/, '');
  const map: Record<string, string> = {
    en: `${name} — an official MCP server. ${truncated}. Connect your AI agents to ${name} capabilities. Compare features and setup guides.`,
    zh: `${name} 官方 MCP 服务器。${truncated}。让 AI 智能体连接 ${name} 能力，查看功能对比与设置指南。`,
    ja: `${name} 公式 MCP サーバー。${truncated}。AI エージェントを ${name} に接続し、機能比較とセットアップガイドを確認。`,
    es: `${name} servidor MCP oficial. ${truncated}. Conecta tus agentes de IA a ${name}. Compara funciones y guías de configuración.`,
    fr: `${name} serveur MCP officiel. ${truncated}. Connectez vos agents IA à ${name}. Comparez fonctionnalités et guides de configuration.`,
  };
  return map[locale] || map.en;
}

/**
 * Skills 详情页本地化 Meta Description（150-160 字符目标）
 * 数据里的 description 通常 30-60 字符，需要加品牌前缀 + CTA 补全。
 */
export function getSkillMetaDescription(
  locale: string,
  name: string,
  rawDescription: string
): string {
  const truncated = rawDescription.slice(0, 90).replace(/[.。!！?？…]+$/, '');
  const map: Record<string, string> = {
    en: `${name} — a developer skill for AI agents. ${truncated}. Install from Cataito and extend your agent capabilities with proven workflows.`,
    zh: `${name} 是一款 AI 智能体开发技能。${truncated}。从 Cataito 目录安装，一键扩展智能体能力，覆盖编程、文档处理、数据检索等成熟工作流场景。`,
    ja: `${name} は AI エージェント用開発スキルです。${truncated}。Cataito からインストールして、エージェント能力を拡張。`,
    es: `${name} es una habilidad de desarrollador para agentes de IA. ${truncated}. Instala desde Cataito y amplía capacidades con flujos probados.`,
    fr: `${name} est une compétence développeur pour agents IA. ${truncated}. Installez depuis Cataito et étendez les capacités avec des flux éprouvés.`,
  };
  return map[locale] || map.en;
}

/**
 * 分类聚合页本地化 SEO（标题 + 描述，含年份与数量长尾词）
 */
export function getCategorySeo(
  locale: string,
  categoryLabel: string,
  count: number
): { title: string; description: string } {
  const map: Record<string, { title: string; description: string }> = {
    en: {
      title: `Best ${categoryLabel} AI Tools in 2026 (${count} Tools) | Cataito`,
      description: `Discover and compare the top ${count} ${categoryLabel} AI tools. Explore features, pricing and reviews to find the best ${categoryLabel} AI tool for your needs.`,
    },
    zh: {
      title: `2026 年最佳 ${categoryLabel} AI 工具（共 ${count} 款）| Cataito`,
      description: `发现并对比 ${count} 款顶级 ${categoryLabel} AI 工具，查看功能、价格与评测，找到最适合你的 ${categoryLabel} AI 工具。`,
    },
    ja: {
      title: `2026年ベスト${categoryLabel} AIツール（${count}選）| Cataito`,
      description: `トップ${count}の${categoryLabel} AIツールを比較。機能・料金・レビューを確認して、最適な${categoryLabel} AIツールを見つけましょう。`,
    },
    es: {
      title: `Mejores herramientas de IA de ${categoryLabel} en 2026 (${count}) | Cataito`,
      description: `Descubre y compara las ${count} mejores herramientas de IA de ${categoryLabel}. Explora funciones, precios y opiniones para encontrar la ideal.`,
    },
    fr: {
      title: `Meilleurs outils IA ${categoryLabel} en 2026 (${count}) | Cataito`,
      description: `Découvrez et comparez les ${count} meilleurs outils IA ${categoryLabel}. Explorez fonctionnalités, tarifs et avis pour trouver l'outil idéal.`,
    },
  };
  return map[locale] || map.en;
}

/**
 * 首页本地化 SEO（标题 + 描述 + 关键词）
 */
export function getHomeSeo(locale: string): {
  title: string;
  description: string;
  keywords: string;
} {
  const map: Record<string, { title: string; description: string }> = {
    en: {
      title: 'Cataito - Best AI Tools, Models & Agents Directory | Free Reviews',
      description:
        'Discover 180+ free and paid AI tools. Compare features, pricing and reviews — from ChatGPT, DeepSeek, Kling AI to Grok. Your AI toolkit starts here.',
    },
    zh: {
      title: 'Cataito — AI 工具/模型/智能体精选目录 | 免费评测',
      description:
        '180+ 免费与付费 AI 工具精选目录。对比 ChatGPT、DeepSeek、Kling AI、Grok 的功能、价格与评测，找到最适合你的 AI 工具、模型和智能体。',
    },
    ja: {
      title: 'Cataito — AIツール・モデル・エージェント総合ディレクトリ',
      description:
        '180以上の無料・有料AIツールを網羅。ChatGPT、DeepSeek、Kling AI、Grokなど、機能・料金・レビューを比較。',
    },
    es: {
      title: 'Cataito - Mejor Directorio de Herramientas, Modelos y Agentes de IA',
      description:
        'Descubre más de 180 herramientas de IA. Compara funciones y precios de ChatGPT, DeepSeek, Kling AI, Grok y más.',
    },
    fr: {
      title: "Cataito - Meilleur Répertoire d'Outils, Modèles et Agents IA",
      description:
        "Découvrez 180+ outils IA gratuits et payants. Comparez fonctionnalités et tarifs de ChatGPT, DeepSeek, Kling AI et Grok.",
    },
  };
  const keywords =
    'AI portal, AI tools directory, AI models, AI agents, ChatGPT, DeepSeek, Kling AI, Grok, Gemini, Claude, AI reviews, free AI tools, artificial intelligence';
  return { ...(map[locale] || map.en), keywords };
}

/**
 * 生成 WebSite JSON-LD（首页用）
 */
/**
 * 生成 WebSite JSON-LD（首页用，含同页的 Organization 实体，用 @graph 组合）
 * @param locale 当前语言，用于动态化 SearchAction.target（避免全站搜索按钮指向 /en）
 * @param org 可选 Organization 实体；传入时与 WebSite 一起包装在 @graph 数组中，
 *        Google 会把站点品牌与搜索能力关联起来，对 AI 引用和品牌 SERP 展示有帮助
 */
export function generateWebSiteJsonLd(params: {
  locale?: string;
  org?: ReturnType<typeof generateOrganizationJsonLd>;
} = {}): unknown {
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Cataito',
    url: BASE_URL,
    description: 'Your gateway to the global AI ecosystem. Discover AI models, agents, tools, and resources from around the world.',
    potentialAction: {
      '@type': 'SearchAction',
      // SearchAction.target 按当前 locale 动态化：此前硬编码 /en 导致多语言站点
      // 的站内搜索链接都指向英文页，Google 结构化数据检查可能报 "SearchAction.target
      // should be templated with appropriate locale"。
      target: `${BASE_URL}/${params.locale || 'en'}?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  if (params.org) {
    return {
      '@context': 'https://schema.org',
      '@graph': [site, params.org],
    };
  }
  return site;
}

/**
 * 生成 Organization JSON-LD（首页用，Google 品牌实体识别）
 * 帮助 Google 在 AI Overviews / Knowledge Panel / AI Mode 中把
 * cataito.com 与品牌 "Cataito" 关联，避免被视作无名聚合站。
 */
export function generateOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    name: 'Cataito',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'Independent directory and review platform for AI tools, models, agents, MCP servers, and developer skills — founded in 2025.',
    sameAs: [
      'https://github.com/cataito-lab',
      'https://cataito.com',
      'https://x.com/cataitocom',
    ],
  };
}

/**
 * 生成 Article JSON-LD（博客详情页用）
 */
export function generateArticleJsonLd(params: {
  title: string;
  description: string;
  image: string;
  author: string;
  datePublished: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    description: params.description,
    image: params.image,
    author: {
      '@type': 'Organization',
      name: params.author || 'Cataito Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Cataito',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
    datePublished: params.datePublished,
    url: params.url,
  };
}

/**
 * 生成 BreadcrumbList JSON-LD
 */
export function generateBreadcrumbJsonLd(
  items: { name: string; url?: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

/**
 * 生成 SoftwareApplication JSON-LD（工具详情页用 — Google 商品富摘要）
 * 含 operatingSystem、author、publisher、offers 等完整字段
 */
export function generateSoftwareAppJsonLd(params: {
  name: string;
  description: string;
  image: string;
  url: string;
  developer: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: { price: string; priceCurrency: string };
  datePublished?: string;
  dateModified?: string;
}) {
  const out: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: params.name,
    description: params.description,
    image: params.image,
    url: params.url,
    applicationCategory: params.applicationCategory,
    operatingSystem: params.operatingSystem,
    author: { '@type': 'Organization', name: params.developer || 'Cataito' },
    publisher: { '@type': 'Organization', name: 'Cataito', url: 'https://cataito.com' },
    offers: { '@type': 'Offer', ...params.offers, url: params.url },
  };
  if (params.datePublished) out.datePublished = params.datePublished;
  if (params.dateModified) out.dateModified = params.dateModified;
  return out;
}

/**
 * 生成 HowTo JSON-LD（教程详情页用 — Google 教程富摘要）
 * 从 Markdown 内容中解析 ### 步骤生成 HowToStep 数组
 */
export function generateHowToJsonLd(params: {
  title: string;
  description: string;
  content: string;
  readTime?: number;
  url: string;
}) {
  const steps = params.content
    .split('\n')
    .filter((line) => line.trim().startsWith('### '))
    .map((line, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: line.replace(/^###\s+/, '').trim(),
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.title,
    description: params.description,
    ...(params.readTime
      ? { totalTime: `PT${Math.max(1, params.readTime)}M` }
      : {}),
    ...(steps.length > 0 ? { step: steps } : {}),
    url: params.url,
  };
}
