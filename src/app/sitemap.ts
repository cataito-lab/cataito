import { MetadataRoute } from 'next';
import { tools, toolDetails, skills, skillDetails, mcp as mcpServers, mcpDetails } from '@/data/aggregated';
import blogPosts from '@/data/blogPosts.json';
import tutorials from '@/data/tutorials.json';
import { routing, TEMP_NOINDEX_LOCALES } from '@/i18n/routing';
import { allProjects, rankingUpdatedAt } from '@/lib/ranking-history';
import { CATEGORY_SLUGS } from '@/lib/categories';

// output: 'export' 要求路由显式声明为纯静态。
export const dynamic = 'force-static';

const BASE_URL = 'https://cataito.com';

// lastmod 诚实化（GSC 诊断 2026-09-11）：此前所有 URL 都报 new Date()（构建日），
// 全站每天"集体变更"会稀释 Google 对 lastmod 的信任。改为各页面的真实数据日期。
function dataDate(value: string | undefined | null): Date {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  // noindex 语言来自 routing.ts 的 TEMP_NOINDEX_LOCALES（单一 source of truth，
  // 与 [locale]/layout.tsx 的 robots noindex、src/lib/seo.ts 的 hreflang 过滤共用）：
  // 对 ja/es/fr 全站 noindex（195/195 工具描述未本地化），sitemap 一并剔除，
  // 避免 Google 收到矛盾信号。
  const INDEXED_LOCALES = routing.locales.filter((l) => !TEMP_NOINDEX_LOCALES.has(l));
  const locales = INDEXED_LOCALES;

  // Static pages（/tools /skills /mcp 为列表页，权重高于普通静态页）。
  // lastmod 用排行数据日期（refresh-stars 只在有数据变更时提交，列表页随数据而变）
  const lastDataChange = dataDate(rankingUpdatedAt());
  const staticPages = ['', '/tools', '/skills', '/mcp', '/submit', '/about', '/privacy', '/disclaimer', '/editorial-policy', '/blog', '/tutorials', '/ranking', '/report'].flatMap((path) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: lastDataChange,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1.0 : path === '/tools' || path === '/skills' || path === '/mcp' ? 0.9 : 0.5,
    }))
  );

  // Category pages
  const categoryPages = CATEGORY_SLUGS.flatMap((cat) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/category/${cat}`,
      lastModified: lastDataChange,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  );

  // Tool detail pages（lastmod = 单条工具的人工审计日期）
  const toolPages = tools.flatMap((tool) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/tool/${tool.slug}`,
      lastModified: dataDate(toolDetails[tool.slug]?.meta?.lastVerified),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))
  );

  // Blog pages
  const blogPages = blogPosts.flatMap((post: any) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/blog/${post.slug}`,
      lastModified: post.publishedAt || new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  // Tutorial pages
  const tutorialPages = tutorials.flatMap((tutorial: any) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/tutorials/${tutorial.slug}`,
      lastModified: tutorial.publishedAt || new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  // Skill detail pages（lastmod = 单条审计日期）
  const skillPages = skills.flatMap((skill: any) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/skills/${skill.slug}`,
      lastModified: dataDate(skillDetails[skill.slug]?.meta?.lastVerified),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  // MCP server detail pages（lastmod = 单条审计日期）
  const mcpPages = mcpServers.flatMap((entry: any) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/mcp/${entry.slug}`,
      lastModified: dataDate(mcpDetails[entry.slug]?.meta?.lastVerified),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  // P4.1 排行项目详情页（en-only 数据页，随排行数据每日可能刷新）
  const projectPages = [...allProjects().keys()].map((fullName) => ({
    url: `${BASE_URL}/project/${fullName}`,
    lastModified: lastDataChange,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...toolPages, ...blogPages, ...tutorialPages, ...skillPages, ...mcpPages, ...projectPages];
}
