#!/usr/bin/env node
/**
 * scripts/generate-agent-feeds.mjs — 构建期生成 AI/订阅消费的公开文件（P3.2 + P3.3）
 *
 * 产出（写入 public/，随静态导出部署）：
 *   llms.txt            — llmstxt.org 规范：站点索引，给 AI 检索器的「目录页」
 *   llms-full.txt       — 全量事实版：每条目的描述/定价档位/verdict 一句话/核验日期
 *   rss/blog.xml        — 博客 feed
 *   rss/tutorials.xml   — 教程 feed
 *   rss/ranking.xml     — 排行榜 feed（当前 Top 10 + 数据日期）
 *
 * 由 `npm run build` 自动调用（数据更新即刷新，无需手工维护）。
 * 文案统一取 en（AI 消费场景；站点本身另有 5 语言页面）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { loadTools, loadToolDetails, loadSkills, loadMcp, DATA_DIR } = require('./lib/load-data.cjs');
const blogPosts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'blogPosts.json'), 'utf8'));
const tutorials = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tutorials.json'), 'utf8'));
const ranking = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ranking.json'), 'utf8'));

const BASE = 'https://cataito.com';
const trunc = (s, n = 160) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const tools = loadTools();
const toolDetails = loadToolDetails();
const skills = loadSkills();
const mcp = loadMcp();

// ── llms.txt ────────────────────────────────────────────────
const toolLines = tools
  .map((t) => `- [${t.name}](${BASE}/en/tool/${t.slug}): ${trunc(t.descriptionEn, 140)}`)
  .join('\n');
const skillLines = skills
  .map((s) => `- [${s.name}](${BASE}/en/skills/${s.slug}): ${trunc(s.descriptionEn, 140)}`)
  .join('\n');
const mcpLines = mcp
  .map((m) => `- [${m.name}](${BASE}/en/mcp/${m.slug}): ${trunc(m.descriptionEn, 140)}`)
  .join('\n');
const blogLines = blogPosts
  .map((b) => `- [${b.title?.en ?? b.slug}](${BASE}/en/blog/${b.slug}): ${trunc(b.excerpt?.en, 140)}`)
  .join('\n');
const tutorialLines = tutorials
  .map((t) => `- [${t.title?.en ?? t.slug}](${BASE}/en/tutorials/${t.slug}): ${trunc(t.excerpt?.en, 140)}`)
  .join('\n');

const llmsTxt = `# Cataito

> Cataito (cataito.com) is a multilingual AI ecosystem portal: a curated, human-audited directory of ${tools.length} AI tools across 16 categories, ${skills.length} AI agent skills and ${mcp.length} MCP servers, plus a daily-refreshed ranking of the fastest-growing open-source AI projects on GitHub. Every entry carries editorial verdicts, structured pricing and verification dates in 5 languages (English, Chinese, Japanese, Spanish, French).

## AI Tools
${toolLines}

## AI Agent Skills
${skillLines}

## MCP Servers
${mcpLines}

## GitHub AI Project Rankings
- [Daily AI Project Rankings](${BASE}/en/ranking): leaderboard of the fastest-growing open-source AI projects by category (LLM, agents, image, audio, devtools, RAG, video), updated daily at 08:37 Beijing time with 18 months of star-history snapshots.

## Monthly Ecosystem Report
- [AI Ecosystem Report](${BASE}/en/report): month-over-month open-source AI growth computed from daily star snapshots — total ecosystem size, top gainers and notable newcomers.

## Blog
${blogLines}

## Tutorials
${tutorialLines}

## About this site
- [About]( ${BASE}/en/about): mission and methodology.
- [Editorial Policy](${BASE}/en/editorial-policy): how tools are reviewed and rated.
- Full machine-readable factsheet: ${BASE}/llms-full.txt
`;
fs.writeFileSync(path.join(ROOT, 'public', 'llms.txt'), llmsTxt);

// ── llms-full.txt ───────────────────────────────────────────
const fullParts = [`# Cataito — Full Factsheet\n> Generated from build-time data. Prices are "as verified on" the date shown; always confirm on the official site.\n`];
for (const t of tools) {
  const d = toolDetails[t.slug] ?? {};
  const tiers = d.pricing ? Object.keys(d.pricing).join(', ') : 'n/a';
  const verdict = d.verdict?.headline?.en ? trunc(d.verdict.headline.en, 200) : '';
  fullParts.push(
    [
      `## ${t.name} (tool)`,
      `- Page: ${BASE}/en/tool/${t.slug}`,
      `- Official site: ${t.url}`,
      `- Category: ${t.category} | Tags: ${(t.tags ?? []).join(', ')}`,
      `- Pricing tiers: ${tiers}${d.meta?.pricingUrl ? ` (pricing page: ${d.meta.pricingUrl})` : ''}`,
      verdict ? `- Verdict: ${verdict}` : null,
      d.meta?.lastVerified ? `- Info verified: ${d.meta.lastVerified}` : null,
      '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}
for (const s of skills) {
  fullParts.push(
    [`## ${s.name} (agent skill)`, `- Page: ${BASE}/en/skills/${s.slug}`, `- Repo: ${s.repo}`, `- ${trunc(s.descriptionEn, 200)}`, ''].join('\n'),
  );
}
for (const m of mcp) {
  fullParts.push(
    [`## ${m.name} (MCP server)`, `- Page: ${BASE}/en/mcp/${m.slug}`, `- Repo: ${m.repo}`, `- ${trunc(m.descriptionEn, 200)}`, ''].join('\n'),
  );
}
fs.writeFileSync(path.join(ROOT, 'public', 'llms-full.txt'), fullParts.join('\n'));

// ── RSS feeds ───────────────────────────────────────────────
function rssFeed({ title, link, description, items }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(title)}</title>
<link>${esc(link)}</link>
<description>${esc(description)}</description>
<language>en</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join('\n')}
</channel></rss>`;
}
const rssItem = ({ title, link, desc, date }) =>
  `<item><title>${esc(title)}</title><link>${esc(link)}</link><guid>${esc(link)}</guid><description>${esc(desc)}</description><pubDate>${new Date(date).toUTCString()}</pubDate></item>`;

fs.mkdirSync(path.join(ROOT, 'public', 'rss'), { recursive: true });

fs.writeFileSync(
  path.join(ROOT, 'public', 'rss', 'blog.xml'),
  rssFeed({
    title: 'Cataito Blog',
    link: `${BASE}/en/blog`,
    description: 'AI ecosystem analysis and tool reviews from Cataito',
    items: blogPosts.map((b) =>
      rssItem({ title: b.title?.en ?? b.slug, link: `${BASE}/en/blog/${b.slug}`, desc: b.excerpt?.en ?? '', date: b.publishedAt }),
    ),
  }),
);

fs.writeFileSync(
  path.join(ROOT, 'public', 'rss', 'tutorials.xml'),
  rssFeed({
    title: 'Cataito Tutorials',
    link: `${BASE}/en/tutorials`,
    description: 'Step-by-step AI tool tutorials in 5 languages',
    items: tutorials.map((t) =>
      rssItem({ title: t.title?.en ?? t.slug, link: `${BASE}/en/tutorials/${t.slug}`, desc: t.excerpt?.en ?? '', date: t.publishedAt }),
    ),
  }),
);

const top10 = ranking.boards?.[0]?.items?.slice(0, 10) ?? [];
fs.writeFileSync(
  path.join(ROOT, 'public', 'rss', 'ranking.xml'),
  rssFeed({
    title: 'Cataito GitHub AI Rankings',
    link: `${BASE}/en/ranking`,
    description: `Top 10 fastest-growing open-source AI projects (data of ${ranking.updatedAt})`,
    items: top10.map((r) =>
      rssItem({
        title: `#${r.rank} ${r.name} — ★${r.stars}`,
        link: r.url,
        desc: `${r.description ?? ''}${r.change != null ? ` (rank change: ${r.change > 0 ? '+' : ''}${r.change})` : ''}`,
        date: ranking.updatedAt,
      }),
    ),
  }),
);

// ── P4.6 项目排名徽章（可嵌入 README 的 SVG，反向链接引擎）──────
// 每个上榜项目一枚：public/embed/project/<org>/<repo>.svg
// 嵌入码展示在项目详情页（<img> 标签 + Markdown 两种）。
const badgeInfo = new Map();
for (const [key, board] of Object.entries(ranking.boards)) {
  for (const it of board.items) {
    const e = badgeInfo.get(it.fullName);
    if (!e) badgeInfo.set(it.fullName, { ...it, bestRank: it.rank, bestBoard: key });
    else if (it.rank < e.bestRank) {
      e.bestRank = it.rank;
      e.bestBoard = key;
    }
  }
}
const BOARD_EN = {
  all: 'Overall', llm: 'LLM', agents: 'AI Agents', image: 'Image', audio: 'Audio',
  devtools: 'DevTools', rag: 'RAG', video: 'Video', vision: 'Vision',
};
const badgeEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
for (const [fullName, it] of badgeInfo) {
  const [org, repo] = fullName.split('/');
  const dir = path.join(ROOT, 'public', 'embed', 'project', badgeEsc(org));
  fs.mkdirSync(dir, { recursive: true });
  const starsK = it.stars >= 1000 ? (it.stars / 1000).toFixed(1) + 'k' : String(it.stars);
  const boardLabel = (BOARD_EN[it.bestBoard] ?? it.bestBoard).toUpperCase();
  const svg = `<svg width="260" height="84" viewBox="0 0 260 84" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${badgeEsc(fullName)} ranked #${it.bestRank} on Cataito">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#22D3EE"/><stop offset="50%" stop-color="#3B82F6"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient></defs>
  <rect width="260" height="84" rx="10" fill="#0A1230"/>
  <rect width="260" height="4" rx="2" fill="url(#g)"/>
  <text x="16" y="34" font-size="24" font-weight="800" fill="#FFFFFF" font-family="Arial, sans-serif">#${it.bestRank}</text>
  <text x="16" y="52" font-size="11" fill="#8FA3C8" font-family="Arial, sans-serif">${badgeEsc(boardLabel)} · ${badgeEsc(fullName)}</text>
  <text x="244" y="34" font-size="16" font-weight="700" fill="#39D0D8" text-anchor="end" font-family="Arial, sans-serif">★ ${starsK}</text>
  <text x="16" y="72" font-size="10" fill="#5B6B8C" font-family="Arial, sans-serif">Ranked by cataito.com/ranking</text>
</svg>
`;
  fs.writeFileSync(path.join(dir, repo + '.svg'), svg);
}

// 孤儿清理：掉榜项目的旧徽章会带着过期排名继续被外链引用，须删除。
// 只作用于 public/embed/project/，与上方写入集合（badgeEsc(org)/repo.svg）取差集。
const badgeRoot = path.join(ROOT, 'public', 'embed', 'project');
const expected = new Set(
  [...badgeInfo].map(([fullName]) => {
    const [org, repo] = fullName.split('/');
    // 注意用 '/' 拼接而非 path.join——Windows 下后者产生反斜杠，永远匹配不上
    return badgeEsc(org) + '/' + repo + '.svg';
  }),
);
let removedBadges = 0;
const walkBadges = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      walkBadges(p);
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    } else if (e.name.endsWith('.svg')) {
      const rel = path.relative(badgeRoot, p);
      if (!expected.has(path.relative(badgeRoot, p).split(path.sep).join('/'))) {
        fs.unlinkSync(p);
        removedBadges++;
      }
    }
  }
};
walkBadges(badgeRoot);

console.log(
  `✔ agent feeds 已生成：llms.txt(${(llmsTxt.length / 1024).toFixed(0)}KB) llms-full.txt rss/{blog,tutorials,ranking}.xml 项目徽章 SVG ×${badgeInfo.size}${removedBadges ? `（清理孤儿徽章 ×${removedBadges}）` : ''}`,
);
