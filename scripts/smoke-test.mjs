#!/usr/bin/env node
/**
 * Vercel 部署冒烟测试脚本
 * 验证关键页面返回 200，用于 CI/CD 中确认构建产物可正常响应。
 *
 * 用法:
 *   node scripts/smoke-test.mjs                          # 测试 localhost:3000
 *   node scripts/smoke-test.mjs --base-url https://...   # 测试指定 URL
 *   node scripts/smoke-test.mjs --timeout 30000          # 自定义超时(ms)
 *
 * 退出码: 0 = 全部通过, 1 = 存在失败
 */

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const BASE_URL = process.argv
  .find((a) => a.startsWith('--base-url='))
  ?.split('=')[1] || process.env.SMOKE_TEST_URL || 'http://localhost:3000';

const TIMEOUT = parseInt(
  process.argv.find((a) => a.startsWith('--timeout='))?.split('=')[1] ||
    process.env.SMOKE_TEST_TIMEOUT ||
    '15000',
  10
);

// 语言列表从 messages/*.json 自动发现（单一 source of truth），新增语言无需改此脚本
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = readdirSync(join(__dirname, '..', 'messages'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => basename(f, '.json'))
  .sort();

// ─── 关键页面列表 ───────────────────────────────────────────────
const PAGES = [
  // 所有语言首页
  ...LOCALES.map((l) => `/${l}`),
  // 核心功能页面（以英文为例，确认路由可正常渲染）
  '/en/submit',
  '/en/privacy',
  '/en/disclaimer',
  // 分类页（至少一个代表性分类）
  '/en/category/chat',
  '/en/category/image',
  '/en/category/code',
  // 工具详情页（至少一个代表性工具）
  '/en/tool/chatgpt',
  '/en/tool/claude',
  '/en/tool/gemini',
];

let passed = 0;
let failed = 0;
const failures = [];

async function checkPage(path) {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 200) {
      console.log(`  ✔ 200 ${url}`);
      passed++;
    } else {
      console.log(`  ✘ ${res.status} ${url}`);
      failed++;
      failures.push({ path, status: res.status, url });
    }
  } catch (err) {
    const reason = err.name === 'AbortError' ? '超时' : err.message;
    console.log(`  ✘ ERR ${url} — ${reason}`);
    failed++;
    failures.push({ path, status: 'ERR', reason, url });
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`\n🔍 冒烟测试 — 目标: ${BASE_URL}`);
  console.log(`   页面数: ${PAGES.length}, 超时: ${TIMEOUT}ms\n`);

  const results = await Promise.allSettled(PAGES.map(checkPage));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (failed === 0) {
    console.log(`\n✔ 全部通过: ${passed}/${PAGES.length} 个页面返回 200\n`);
    process.exit(0);
  } else {
    console.log(`\n✘ ${failed} 个页面失败:\n`);
    for (const f of failures) {
      const detail = f.status === 'ERR' ? f.reason : `状态码 ${f.status}`;
      console.log(`   ${f.url} — ${detail}`);
    }
    console.log(`\n✔ 通过: ${passed}, ✘ 失败: ${failed}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('冒烟测试脚本异常:', err);
  process.exit(1);
});
