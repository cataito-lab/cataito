'use client';

import { useTranslations } from 'next-intl';
import { Star, GitFork } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import LogoTile from './LogoTile';

export interface ToolPlatforms {
  web: boolean | string;
  windows: boolean | string;
  macos: boolean | string;
  ios: boolean | string;
  android: boolean | string;
  linux: boolean | string;
  browser_extension: boolean | string;
  api: boolean | string;
}

export const PLATFORM_META: { key: keyof ToolPlatforms; labelKey: string }[] = [
  { key: 'web', labelKey: 'platformWeb' },
  { key: 'windows', labelKey: 'platformWindows' },
  { key: 'macos', labelKey: 'platformMacos' },
  { key: 'ios', labelKey: 'platformIos' },
  { key: 'android', labelKey: 'platformAndroid' },
  { key: 'linux', labelKey: 'platformLinux' },
  { key: 'browser_extension', labelKey: 'platformBrowserExtension' },
  { key: 'api', labelKey: 'platformApi' },
];

export interface Tool {
  slug: string;
  stars?: number;
  name: string;
  nameZh?: string;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
  descriptionEs?: string;
  descriptionFr?: string;
  url: string;
  logo: string;
  logoDark?: string;
  category: string;
  tags: string[];
  featured: boolean;
  homeFeatured?: boolean;
  platforms?: ToolPlatforms;
  developer?: string;
  developerZh?: string;
}

export const getLocalizedDescription = (tool: Tool, locale: string) => {
  switch (locale) {
    case 'zh': return tool.description;
    case 'ja': return tool.descriptionJa || tool.descriptionEn;
    case 'es': return tool.descriptionEs || tool.descriptionEn;
    case 'fr': return tool.descriptionFr || tool.descriptionEn;
    default: return tool.descriptionEn;
  }
};

interface ToolCardProps {
  tool: Tool;
  locale: string;
}

export default function ToolCard({ tool, locale }: ToolCardProps) {
  const tTags = useTranslations('tags');
  const tCategories = useTranslations('categories');
  const description = getLocalizedDescription(tool, locale);
  const displayName = locale === 'zh' && tool.nameZh ? tool.nameZh : tool.name;
  const toolRepo = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/.exec(tool.url || '')?.[0] ?? null;

  return (
    <article className="group relative bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300 p-5 flex flex-col">
      {/* Header */}
            <Link href={`/tool/${tool.slug}`} className="flex items-start gap-3 mb-3 group/header">
        <LogoTile
          logo={tool.logo}
          logoDark={tool.logoDark}
          alt={displayName}
          className="w-11 h-11 rounded-xl"
          imgPx={40}
          fallbackClassName="text-base"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--foreground)] truncate group-hover/header:text-[var(--primary)] transition text-sm">
            {displayName}
          </h3>
          <span className="text-xs text-[var(--muted)]">{tCategories(tool.category as any)}</span>
        </div>
          {typeof tool.stars === 'number' && tool.stars > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 text-xs text-[var(--muted)]" title={tool.stars.toLocaleString()}>
              <Star className="w-3 h-3 text-amber-400" />
              {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(1).replace(/.0$/, '')}k` : tool.stars}
            </span>
          )}
        </Link>

      {/* Description */}
      <Link href={`/tool/${tool.slug}`}>
        <p className="text-sm text-[var(--muted)] leading-relaxed mb-4 flex-1 line-clamp-3 hover:text-[var(--foreground)] transition cursor-pointer">
          {description}
        </p>
      </Link>

      {/* Tags — text-only, no colored backgrounds */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 mb-3">
        {tool.tags.map((tag) => (
          <span key={tag} className="text-xs text-[var(--muted)]">
            {tTags(tag as any)}
          </span>
        ))}
      </div>

      {/* Repo + Stars（开源工具，对齐 MCP/Skills 卡片惯例） */}
      {(toolRepo || typeof tool.stars === 'number') && (
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          {toolRepo && (
            <span className="flex items-center gap-1 truncate">
              <GitFork className="w-3 h-3 shrink-0" />
              {toolRepo.replace(/^https?:\/\/github\.com\//, '')}
            </span>
          )}
          {typeof tool.stars === 'number' && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {tool.stars.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Visit Link — 已移除：网格卡片本身可点击跳转详情页，外部访问按钮冗余 */}
          </article>
  );
}