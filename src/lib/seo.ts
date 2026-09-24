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
 * 智能截断：按 max 长度切断后回退到最后一个词边界，并剥掉残留的标点/悬空引号。
 * 修复旧版 slice(0,100) 直接切断产生「natural language,.」式逗号句尾的 bug。
 */
function cleanSnippet(text: string, max: number): string {
  let s = text.trim();
  if (s.length > max) {
    s = s.slice(0, max);
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace > max * 0.6) {
      s = s.slice(0, lastSpace);
    } else {
      // CJK 无空格：若末尾 15 字符内有句读则回退到句读边界，避免「校准置。」式断词；
      // 边界太靠前（不足 max 一半）则保留原截断，避免文案过短
      const m = [...s.matchAll(/[、。，；：！？]/g)].pop();
      if (m && m.index !== undefined && m.index > max - 15 && m.index > max * 0.5) s = s.slice(0, m.index);
    }
  }
  // 剥掉末尾的中英标点、悬空引号/括号、连接符
  s = s.replace(/[\s,.;:!?、。，；：！？…」』）)"'\-–—]+$/, '');
  // 剥掉截断留下的连续悬空冠词/介词/助词（"repo in a"、"complètes à"、"の" 等）
  s = s.replace(/(\s+(a|an|the|to|of|in|for|on|and|or|et|en|de|der|den|des|du|à|el|la|le|les|los|las|un|una|uno|y|e|con|para|por|与|和|的|の|に|が|を|へ|と))+$/i, '');
  // 括号内被截断（"（choice/score/nou"）→ 整段丢弃未闭合括号后的内容
  const open = s.lastIndexOf('（');
  if (open !== -1 && (s.match(/）/g) || []).length < (s.match(/（/g) || []).length) s = s.slice(0, open);
  s = s.replace(/[\s,.;:!?、。，；：！？…「『【("']+$/, '');
  return s;
}

/**
 * 工具详情页本地化 SEO 标题
 * 「Review & Pricing」修饰词命中搜索意图（X review / X pricing），年份给新鲜度信号；
 * 弃用旧版「Best {category} AI Tool」模板——堆词感强且触发「AI Agents AI」重复 bug。
 * 控制在 ~60 字符内避免 SERP 截断。
 */
export function getToolSeoTitle(locale: string, name: string): string {
  const map: Record<string, string> = {
    en: `${name} Review & Pricing (2026) | Cataito`,
    zh: `${name} 评测与价格（2026）| Cataito`,
    ja: `${name} レビューと料金（2026）| Cataito`,
    es: `${name}: reseña y precios (2026) | Cataito`,
    fr: `${name} : avis et tarifs (2026) | Cataito`,
  };
  return map[locale] || map.en;
}

/**
 * 工具详情页本地化 Meta Description（目标 ≤160 字符）
 * 结构：名称 + 真实描述（词边界截断）+ 转化钩子（价格/优缺点/编辑结论/核实年份）。
 * 弃用旧版「X is a {category} AI tool」——语法 bug（a AI）+ 模板噪音稀释关键词。
 */
export function getToolMetaDescription(
  locale: string,
  name: string,
  rawDescription: string,
  tags?: string[]
): string {
  const free = tags?.includes('Free');
  // 自适应预算：SERP 显示约 158 半角单位（CJK 字符计 2 单位），长名称/长尾巴不再超限
  const isCJK = locale === 'zh' || locale === 'ja';
  const units = (s: string) => [...s].reduce((n, c) => n + (c.charCodeAt(0) > 0x2e7f ? 2 : 1), 0);
  const tailUnits: Record<string, number> = { en: 68, zh: 62, ja: 66, es: 80, fr: 86 };
  const freeUnits = free ? (isCJK ? 16 : 36) : 0;
  const allowed = 158 - units(name) - (tailUnits[locale] ?? 68) - freeUnits;
  const budget = Math.max(28, isCJK ? Math.floor(allowed / 2) : allowed);
  const clean = cleanSnippet(rawDescription, budget);
  const map: Record<string, string> = {
    en: `${name}: ${clean}. Pricing, features, pros/cons & our verdict${free ? ' (free to start)' : ''} — verified 2026.`,
    zh: `${name}：${clean}。功能、价格、优缺点与编辑结论${free ? '，可免费上手' : ''}，2026 年核实。`,
    ja: `${name}：${clean}。機能・料金・長所短所と編集部評価${free ? '（無料で開始可）' : ''}を2026年に確認。`,
    es: `${name}: ${clean}. Precios, funciones, ventajas y nuestro veredicto${free ? ' (gratis para empezar)' : ''}, verificado en 2026.`,
    fr: `${name} : ${clean}. Tarifs, fonctionnalités, avantages et notre verdict${free ? ' (gratuit pour débuter)' : ''}, vérifiés en 2026.`,
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
  const truncated = cleanSnippet(rawDescription, 100);
  // 数据句首常自带「X official MCP server」，模板再拼一次会重复（如 firecrawl-mcp）
  const dup = /official MCP server/i.test(rawDescription);
  const map: Record<string, string> = {
    en: dup ? `${truncated}. Connect your AI agents and compare features & setup guides.` : `${name} — an official MCP server. ${truncated}. Connect your AI agents to ${name} capabilities. Compare features and setup guides.`,
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
  const truncated = cleanSnippet(rawDescription, 80);
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
  /** 缺省取 datePublished（单发布日文章，两字段同值即合规） */
  dateModified?: string;
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
    // Google Article 规范期望两字段成对出现；缺失会进富文本结果的质量提示区，
    // 也可能让 GSC 把该页标记为内容问题而非单纯的待验证。
    dateModified: params.dateModified || params.datePublished,
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
