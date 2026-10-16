// Internal AI Audit ③ Pricing 漂移探测：抓取官方定价页，比对本站声明的价格是否仍在页面上
// 用法：node scripts/audit-pricing-drift.mjs
// 覆盖三类实体：工具 / Skills / MCP（均有 meta.pricingUrl 才参与）
// 仅处理配置了 meta.pricingUrl 的条目（需按实体类型在 meta 中补种）
// 分级（四态；HTTP 抓取只能判到「可判定」这一层，见下）：
//   OK      → 声明价格全部命中
//   REVIEW  → 正文已渲染出多个价格、本站声明的数字全篇找不到 —— **待复核，不是调价结论**
//             （静态匹配对「$ 与数字被标签拆开」「年付折合每月」「区域货币」「档位改名」都会误判：
//              2026-10-16 实测 descript 价格只在浏览器渲染后出现、github.com/pricing 的 $10/$39 被标签拆断）
//   UNKNOWN → 能访问但价格不在可读正文里（前端渲染 / 数据在未执行的脚本 JSON 里 / 纯壳页）
//             —— 不可判定，**禁止当作调价证据**，需浏览器逐条点开
//   SKIP    → 本站无声明价格 / 抓取失败（HTTP 4xx-5xx、超时、反爬）
// 结论：只有 OK 可信；REVIEW 与 UNKNOWN 都必须人工或浏览器复核后才能改数据。
// warn-only：恒以退出码 0 结束
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const { loadToolDetails, loadSkillDetails, loadMcpDetails } = _require('./lib/load-data.cjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const COLLECTIONS = [
  { load: loadToolDetails, label: '工具' },
  { load: loadSkillDetails, label: 'Skills' },
  { load: loadMcpDetails, label: 'MCP' },
];

// 正文里至少出现几个价格 token 才认为「这个页面把价格渲染出来了」，可据此判 DRIFT；
// 低于该值说明价格是前端渲染的，HTTP 抓取的结论不可信 → UNKNOWN。
const MIN_BODY_PRICES = 3;

// 与 check-tool-liveness.mjs 一致：大响应头 + 可选代理，经 setGlobalDispatcher 注入。
// `dispatcher` 传给 Node 全局 fetch 会抛 UND_ERR_INVALID_ARG（曾让全部抓取失败）。
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
try {
  const undici = await import('undici');
  const opts = { maxHeaderSize: 128 * 1024 };
  undici.setGlobalDispatcher(
    proxy ? new undici.ProxyAgent({ uri: proxy, ...opts }) : new undici.Agent(opts),
  );
  if (proxy) console.log(`使用代理: ${proxy}`);
} catch {
  console.log('未找到 undici，使用原生 fetch 直连抓取');
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchText(url, timeout = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
    });
    if (res.status < 200 || res.status >= 400) return { err: `HTTP ${res.status}` };
    return { text: await res.text() };
  } catch (e) {
    return { err: e?.cause?.code || e?.name || String(e).slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }
}

// 价格 token 归一化：$20 / $20.00 → "20"；忽略千分位逗号
const PRICE_RE = /\$\s?([\d,]+(?:\.\d+)?)/g;
const normalize = (raw) => String(parseFloat(raw.replace(/,/g, '')));
const extractPrices = (text) => {
  const set = new Set();
  for (const m of text.matchAll(PRICE_RE)) set.add(normalize(m[1]));
  return set;
};

// 剥成可见正文：脚本/样式/图标里的数字不算「页面渲染出了价格」
const toBodyText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

async function pool(items, worker, size = 6) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx]);
      }
    })
  );
  return results;
}

const lines = [];
const emit = (s) => {
  console.log(s);
  lines.push(s);
};

let totalWithUrl = 0;
let totalEntities = 0;

for (const { load, label } of COLLECTIONS) {
  const details = load();
  const slugs = Object.keys(details);

  // 待测清单：有 pricingUrl 且本站 pricing 里声明了具体价格的条目
  const targets = [];
  for (const [slug, d] of Object.entries(details)) {
    const url = d.meta?.pricingUrl;
    if (!url) continue;
    const declared = new Set();
    for (const tier of Object.values(d.pricing || {})) {
      const en = typeof tier?.en === 'string' ? tier.en : '';
      for (const m of en.matchAll(PRICE_RE)) declared.add(normalize(m[1]));
    }
    targets.push({ slug, url, declared, verified: d.meta?.pricingVerified });
  }

  totalWithUrl += targets.length;
  totalEntities += slugs.length;

  emit(`════ Pricing 漂移探测 · ${label}（${targets.length}/${slugs.length} 个配置了 pricingUrl）════`);

  if (!targets.length) {
    emit('（无待测条目，请在 meta.pricingUrl 补种官方定价页链接）\n');
    continue;
  }

  const results = await pool(targets, async (t) => {
    if (!t.declared.size) return { ...t, verdict: 'SKIP', reason: '本站 pricing 无具体价格 token' };
    const r = await fetchText(t.url);
    if (r.err) return { ...t, verdict: 'SKIP', reason: `抓取失败 ${r.err}` };
    const allPrices = extractPrices(r.text);
    const bodyPrices = extractPrices(toBodyText(r.text));
    // 正文口径必须并入：官方页常把 `$` 与数字拆在相邻标签里（github.com/features/copilot/plans 的
    // $10/$39、synthesia 的 $29 都是这样被原始 HTML 口径漏掉的假阳性）
    for (const p of bodyPrices) allPrices.add(p);
    const missing = [...t.declared].filter((p) => !allPrices.has(p));
    if (!missing.length) return { ...t, verdict: 'OK', bodyCount: bodyPrices.size };
    // 缺失但正文确实渲染了足量价格 → 才值得进人工/浏览器复核队列（仍不是结论）
    if (bodyPrices.size >= MIN_BODY_PRICES) {
      return { ...t, verdict: 'REVIEW', missing, bodyCount: bodyPrices.size, bodySample: [...bodyPrices].slice(0, 10).join(', ') };
    }
    return {
      ...t,
      verdict: 'UNKNOWN',
      missing,
      bodyCount: bodyPrices.size,
      reason: bodyPrices.size ? '正文价格过少，缺失常为未渲染' : '正文无价格 token（前端渲染/壳页）',
    };
  });

  const groups = { REVIEW: [], UNKNOWN: [], SKIP: [], OK: [] };
  for (const r of results) groups[r.verdict].push(r);

  emit(
    `\n结果：OK ${groups.OK.length} · REVIEW ${groups.REVIEW.length} · UNKNOWN ${groups.UNKNOWN.length} · SKIP ${groups.SKIP.length}`,
  );
  if (groups.REVIEW.length) {
    emit(`\n🔎 待复核（正文已渲染 ${MIN_BODY_PRICES}+ 个价格但本站数字全篇找不到；**非调价结论**，须人工/浏览器确认）:`);
    for (const r of groups.REVIEW)
      emit(
        `  - ${r.slug}  未命中: ${r.missing.map((p) => '$' + p).join(', ')}` +
          `  本站核价日 ${r.verified || '无'}  页面正文价格: ${r.bodySample}  → ${r.url}`,
      );
  }
  if (groups.UNKNOWN.length) {
    emit(`\n❓ 不可判定（HTTP 抓取判不了，**不得当作调价证据**，需浏览器逐条点开）:`);
    for (const r of groups.UNKNOWN)
      emit(`  - ${r.slug}  ${r.reason}；未命中: ${r.missing.map((p) => '$' + p).join(', ')}  → ${r.url}`);
  }
  if (groups.SKIP.length) {
    emit(`\n⏭ 跳过（无结论）:`);
    for (const r of groups.SKIP) emit(`  - ${r.slug}  ${r.reason}`);
  }
  if (groups.OK.length) {
    emit(`\n✅ 价格全部命中: ${groups.OK.map((r) => r.slug).join(', ')}`);
  }
  emit('');
}

if (!totalWithUrl) {
  emit('（无待测条目，请在 _internal/init-audit-meta.js 的 SEED_PRICING_URLS 补种 pricingUrl）');
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = ['## Pricing 漂移探测', '', '```', ...lines, '```', ''].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
