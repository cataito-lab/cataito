#!/usr/bin/env node
/**
 * MCP / Skills 星数统一刷新脚本（单一数据源）
 * ============================================
 * 背景：卡片（列表页）与详情页的星数必须始终一致。页面不再各自调 GitHub API，
 * 一律读取 mcp/skills 数据的 stars 字段；本脚本是唯一的星数写入口。
 *
 * 行为：
 *   - 遍历 src/data/mcp/ 与 src/data/skills/ 的全部条目（后续新收录自动纳入，无需改本脚本）
 *   - 按 repo 去重后逐个调 GitHub API 取 stargazers_count，写回所有共享该 repo 的条目
 *   - 刷新后按星数由高到低重排各条目（并列按 slug 升序），同步更新 canonical-order.json；
 *     顺序变化本身即视为改动并写回，交由 refresh-stars workflow 自动提交推送
 *   - 单个 repo 失败（网络/404/限流）→ 保留旧值并告警，不阻断其它条目
 *   - 全部请求失败 → exit 1（大概率是网络/限流问题，需要人工关注）
 *
 * 用法：
 *   node scripts/refresh-stars.mjs          # 刷新并写回
 *   node scripts/refresh-stars.mjs --dry    # 只报告差异，不写文件
 *
 * 环境变量：
 *   GITHUB_TOKEN  可选。带 token 限流 5000 次/时（Actions 自动注入）；匿名 60 次/时。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

// 2.1 数据拆分后：读写走 load-data 装配器（每条一文件 + canonical-order.json）
const require = createRequire(import.meta.url);
const { loadMcp, loadSkills, saveCollection, saveOrder } = require('./lib/load-data.cjs');

const DATASETS = [
  { label: 'MCP', dir: 'mcp', orderKey: 'mcp', load: loadMcp },
  { label: 'Skills', dir: 'skills', orderKey: 'skills', load: loadSkills },
];

/** 拉取单个 repo 的星数；失败返回 null（调用方保留旧值） */
async function fetchStars(repo) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'catai-refresh-stars',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    });
    if (!res.ok) {
      console.warn(`  [WARN] ${repo} — HTTP ${res.status}${res.status === 403 ? '（可能限流，建议带 GITHUB_TOKEN）' : ''}`);
      return null;
    }
    const data = await res.json();
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null;
  } catch (e) {
    console.warn(`  [WARN] ${repo} — ${e.name === 'AbortError' ? '请求超时' : e.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ---- 主流程 ----
const datasets = DATASETS.map(({ label, dir, orderKey, load }) => ({
  label,
  dir,
  orderKey,
  entries: load(),
}));

// 按 repo 去重（skills 中多个技能可共享同一仓库），一个 repo 只请求一次
const repos = [...new Set(datasets.flatMap((d) => d.entries.map((e) => e.repo)))];
console.log(`共 ${datasets.reduce((n, d) => n + d.entries.length, 0)} 个条目，去重后 ${repos.length} 个仓库${TOKEN ? '（已带 token）' : '（匿名，限流 60 次/时）'}${DRY ? ' [dry-run]' : ''}`);

const starsByRepo = new Map();
let failed = 0;
// 串行小批量拉取，避免匿名限流下瞬间打满
const BATCH = 10;
for (let i = 0; i < repos.length; i += BATCH) {
  const batch = repos.slice(i, i + BATCH);
  const results = await Promise.all(batch.map((repo) => fetchStars(repo)));
  batch.forEach((repo, idx) => {
    if (results[idx] === null) failed++;
    else starsByRepo.set(repo, results[idx]);
  });
}

if (starsByRepo.size === 0) {
  console.error(`\n✘ 全部 ${repos.length} 个仓库均拉取失败（网络或限流），未做任何修改`);
  process.exit(1);
}

let changedTotal = 0;
for (const { label, dir, orderKey, entries } of datasets) {
  let changed = 0;
  for (const entry of entries) {
    const fresh = starsByRepo.get(entry.repo);
    if (typeof fresh === 'number' && fresh !== entry.stars) {
      console.log(`  ${label} · ${entry.slug}: ${entry.stars} → ${fresh}`);
      entry.stars = fresh;
      changed++;
    }
  }
  // 按星数由高到低重排（并列按 slug 升序保证确定性），使数据源物理顺序与卡片展示一致；
  // 新收录条目下次刷新时自动归位，无需逐个配置。
  const orderBefore = entries.map((e) => e.slug).join('|');
  entries.sort((a, b) => (b.stars - a.stars) || a.slug.localeCompare(b.slug));
  const reordered = entries.map((e) => e.slug).join('|') !== orderBefore;
  if ((changed > 0 || reordered) && !DRY) {
    const slugs = saveCollection(dir, entries);
    saveOrder(orderKey, slugs);
  }
  const notes = [];
  if (changed > 0) notes.push(`${changed} 个条目星数有变化`);
  if (reordered) notes.push('顺序按星数重排');
  console.log(`${label}: ${notes.length ? notes.join('，') : '无变化'}${DRY ? '（dry-run 未写入）' : (changed > 0 || reordered) ? '，已写回' : ''}`);
  changedTotal += changed;
}

console.log(`\n✔ 完成：${starsByRepo.size}/${repos.length} 个仓库拉取成功，${changedTotal} 个条目更新${failed > 0 ? `，${failed} 个仓库失败（保留旧值）` : ''}`);
