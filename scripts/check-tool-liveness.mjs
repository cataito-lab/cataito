// 收录条目官网存活审核：检测已收录条目的官网或 GitHub 仓库是否失效
// 用法：node scripts/check-tool-liveness.mjs
//   - 本地若需代理：设置 HTTPS_PROXY 环境变量后运行
//   - CI（GitHub Actions）海外节点直连，无需代理
// 覆盖三类实体：工具（tools/）/ Skills（skills/）/ MCP（mcp/）——均通过 load-data.cjs 聚合读取
// 分级规则（保守设计，避免误报）：
//   DEAD        → 域名无法解析 / 404 / 410，两轮复测均失败 —— 视为已关停，进程退出码 1
//   UNREACHABLE → 超时 / 连接被重置 / 5xx —— 可能是临时故障或地域屏蔽，仅告警不判死
//   PROTECTED   → 403 / 405 / 429 —— 防爬虫拦截，站点大概率存活
//   MOVED       → 200 但最终落在不同主域 —— 官网可能换域/被收购，提示人工核对
//   OK          → 2xx 且主域一致
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const { loadTools, loadSkills, loadMcp } = _require('./lib/load-data.cjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 三类实体的数据源和 URL 提取方式
const COLLECTIONS = [
  {
    label: '工具',
    load: loadTools,
    getUrl: (entry) => entry.url,
  },
  {
    label: 'Skills',
    load: loadSkills,
    getUrl: (entry) => entry.repo ? `https://github.com/${entry.repo}` : null,
  },
  {
    label: 'MCP',
    load: loadMcp,
    getUrl: (entry) => entry.repo ? `https://github.com/${entry.repo}` : null,
  },
];

// 统一用 undici Agent 并调大响应头上限（Google 等站点 Set-Cookie 超 16KB 会触发 HEADERS_OVERFLOW）
// 本地设置 HTTPS_PROXY 时走 ProxyAgent；CI 海外节点直连
let dispatcher;
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
try {
  const { Agent, ProxyAgent } = await import('undici');
  const opts = { maxHeaderSize: 128 * 1024 };
  dispatcher = proxy ? new ProxyAgent({ uri: proxy, ...opts }) : new Agent(opts);
  if (proxy) console.log(`使用代理: ${proxy}`);
} catch {
  console.log('未找到 undici，使用原生 fetch 直连探测');
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function probe(url, timeout = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      dispatcher,
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
    });
    return { status: res.status, finalUrl: res.url };
  } catch (e) {
    return { status: 0, err: e?.cause?.code || e?.name || String(e).slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }
}

// 取主域（近似 eTLD+1：末两段），用于识别换域跳转
const mainDomain = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
  } catch {
    return '';
  }
};

function classify(r, entry) {
  if (r.status >= 200 && r.status < 400) {
    if (r.finalUrl && mainDomain(r.finalUrl) !== mainDomain(entry.url)) return 'MOVED';
    return 'OK';
  }
  if (r.status === 404 || r.status === 410 || r.err === 'ENOTFOUND') return 'DEAD';
  // 其余 4xx（400/401/403/405/429…）说明服务器在响应，只是拒绝了探测请求 → 存活
  if (r.status >= 400 && r.status < 500) return 'PROTECTED';
  return 'UNREACHABLE'; // 超时 / ECONNRESET / 5xx 等
}

async function pool(items, worker, size = 8) {
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

let hasDead = false;
let totalChecked = 0;

for (const { label, load, getUrl } of COLLECTIONS) {
  const entries = load();
  const items = entries
    .map((e) => {
      const url = getUrl(e);
      return url ? { slug: e.slug, url, name: e.name } : null;
    })
    .filter(Boolean);

  if (!items.length) {
    emit(`══ ${label}：无可探测条目（无 url/repo）══\n`);
    continue;
  }

  emit(`══ ${label}官网存活审核（${items.length} 个）══`);
  let results = await pool(items, async (item) => {
    const r = await probe(item.url);
    return { item, ...r, verdict: classify(r, item) };
  });

  // 首轮判死/不可达的复测一次（更长超时，串行降速），排除瞬时抖动
  const suspects = results.filter((r) => r.verdict === 'DEAD' || r.verdict === 'UNREACHABLE');
  if (suspects.length) {
    emit(`首轮异常 ${suspects.length} 个，复测中…`);
    for (const s of suspects) {
      const r2 = await probe(s.item.url, 30000);
      const v2 = classify(r2, s.item);
      if (v2 !== 'DEAD' && v2 !== 'UNREACHABLE') {
        Object.assign(s, r2, { verdict: v2 });
      } else {
        // 两轮都异常：仅当两轮均为 DEAD 特征才判死，否则归为 UNREACHABLE
        s.verdict = s.verdict === 'DEAD' && v2 === 'DEAD' ? 'DEAD' : 'UNREACHABLE';
        Object.assign(s, { status: r2.status, err: r2.err });
      }
    }
  }

  const groups = { DEAD: [], UNREACHABLE: [], MOVED: [], PROTECTED: [], OK: [] };
  for (const r of results) groups[r.verdict].push(r);

  emit(`\n结果：OK ${groups.OK.length} · PROTECTED ${groups.PROTECTED.length} · MOVED ${groups.MOVED.length} · UNREACHABLE ${groups.UNREACHABLE.length} · DEAD ${groups.DEAD.length}`);
  if (groups.DEAD.length) {
    hasDead = true;
    emit(`\n❌ 疑似已关停（需人工确认后下架或替换链接）:`);
    groups.DEAD.forEach((r) => emit(`  - ${r.item.slug}  ${r.item.url}  → ${r.status || r.err}`));
  }
  if (groups.UNREACHABLE.length) {
    emit(`\n⚠ 不可达（可能临时故障或地域屏蔽，连续多周出现需人工核查）:`);
    groups.UNREACHABLE.forEach((r) => emit(`  - ${r.item.slug}  ${r.item.url}  → ${r.status || r.err}`));
  }
  if (groups.MOVED.length) {
    emit(`\n↪ 换域跳转（官网可能迁移，建议更新收录链接）:`);
    groups.MOVED.forEach((r) => emit(`  - ${r.item.slug}  ${r.item.url}  → ${r.finalUrl}`));
  }
  if (groups.PROTECTED.length) {
    emit(`\n🛡 防爬拦截（视为存活）: ${groups.PROTECTED.map((r) => r.item.slug).join(', ')}`);
  }
  emit('');

  totalChecked += items.length;
}

emit(`═ 总计审核 ${totalChecked} 个条目 ═`);
if (hasDead) {
  console.log('\n════ 审核未通过：存在疑似关停的条目 ════');
  process.exit(1);
}
console.log('\n════ 审核通过 ════');

// GitHub Actions 汇总面板
if (process.env.GITHUB_STEP_SUMMARY) {
  // 只输出最后的总计行（前面已通过 console.log 一条条输出，actions 会捕获 stdout）
  const md = ['## 条目存活审核', '', '```', ...lines, '```', ''].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}