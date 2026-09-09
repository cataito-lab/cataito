#!/usr/bin/env node
/**
 * scripts/refresh-tool-health.mjs — 内容保鲜闭环的每日巡检（P4.3）
 *
 * 对全部收录条目（工具官网 / Skills·MCP 的 GitHub 仓库）做存活探测，
 * 把「连续失败计数」写入 src/data/tool-health.json，供详情页横幅与自动开 issue 消费。
 *
 * 状态推导（保守，防误报）：
 *   dead        连续 ≥2 次 DEAD（DNS 失败 / 404 / 410）→ 详情页挂「官网可能已下线」横幅
 *   unreachable 连续 ≥4 次 UNREACHABLE（超时/5xx）→ 挂「访问异常」横幅
 *   suspect     首次失败 / 短暂异常 → 仅记录，不显示横幅
 *   ok          探测通过（含 PROTECTED 403/429 反爬拦截——站点存活）
 *   moved       200 但跳到不同主域 → 人工核对项
 *
 * 自动开 issue 由脚本 --auto-issue 开关消费（workflow 传参）：deadStreak ≥4 的条目触发人工裁决（收录纪律：机器降级、人工删除）。
 * 设计要点：判定必须在海外 CI 环境做（本地国内网络会把正常站误判 UNREACHABLE）；
 * 本地运行只应使用 --dry。退出码恒 0（warn-only，不阻塞 CI）。
 *
 * 用法：node scripts/refresh-tool-health.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const _require = createRequire(import.meta.url);
const { loadTools, loadSkills, loadMcp, DATA_DIR } = _require('./lib/load-data.cjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(DATA_DIR, 'tool-health.json');
const DRY = process.argv.includes('--dry');
const AUTO_ISSUE = process.argv.includes('--auto-issue');
const CONCURRENCY = 8;
const TIMEOUT = 20000;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

let dispatcher;
try {
  const { Agent, ProxyAgent } = await import('undici');
  const opts = { maxHeaderSize: 128 * 1024 };
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  dispatcher = proxy ? new ProxyAgent({ uri: proxy, ...opts }) : new Agent(opts);
} catch {
  /* 原生 fetch 直连 */
}

const COLLECTIONS = [
  { kind: 'tool', load: loadTools, getUrl: (e) => e.url },
  { kind: 'skill', load: loadSkills, getUrl: (e) => (e.repo ? `https://github.com/${e.repo}` : null) },
  { kind: 'mcp', load: loadMcp, getUrl: (e) => (e.repo ? `https://github.com/${e.repo}` : null) },
];

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
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

const mainDomain = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
  } catch {
    return '';
  }
};

function classify(r, url) {
  if (r.status >= 200 && r.status < 400) {
    if (r.finalUrl && mainDomain(r.finalUrl) !== mainDomain(url)) return 'MOVED';
    return 'OK';
  }
  if (r.status === 404 || r.status === 410 || r.err === 'ENOTFOUND') return 'DEAD';
  if (r.status >= 400 && r.status < 500) return 'PROTECTED';
  return 'UNREACHABLE';
}

async function pool(items, worker, size = CONCURRENCY) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx]);
      }
    }),
  );
  return results;
}

// ── 主流程 ──────────────────────────────────────────────
const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const prevTools = prev.tools ?? {};

const targets = [];
for (const { kind, load, getUrl } of COLLECTIONS) {
  for (const entry of load()) {
    const url = getUrl(entry);
    if (url) targets.push({ kind, slug: entry.slug, url });
  }
}
console.log(`待巡检 ${targets.length} 个条目${DRY ? ' [dry]' : ''}`);

const now = new Date().toISOString().slice(0, 10);
const tools = { ...prevTools };
let deadCount = 0;
let unreachableCount = 0;
let okCount = 0;

await pool(targets, async (t) => {
  const cls = classify(await probe(t.url), t.url);
  const prevE = prevTools[t.slug];
  // 连续计数：按类别累积，任何 OK/PROTECTED 归零
  const prevDead = cls === 'DEAD' ? (prevE?.deadStreak ?? 0) + 1 : 0;
  const prevUnr =
    cls === 'UNREACHABLE' ? (prevE?.unreachableStreak ?? 0) + 1 : 0;

  let status = 'ok';
  if (cls === 'DEAD' && prevDead >= 2) status = 'dead';
  else if (cls === 'DEAD') status = 'suspect';
  else if (cls === 'UNREACHABLE' && prevUnr >= 4) status = 'unreachable';
  else if (cls === 'UNREACHABLE') status = 'suspect';
  else if (cls === 'MOVED') status = 'moved';

  if (status === 'dead') deadCount++;
  if (status === 'unreachable') unreachableCount++;
  if (status === 'ok' || status === 'moved') okCount++;

  tools[t.slug] = {
    kind: t.kind,
    status,
    deadStreak: prevDead,
    unreachableStreak: prevUnr,
    lastClass: cls,
    lastChecked: now,
  };
  if (status !== 'ok') {
    console.log(`  ${status.toUpperCase().padEnd(12)} ${t.kind}/${t.slug} (${cls}, dead×${prevDead}, unreach×${prevUnr})`);
  }
});

const next = {
  updatedAt: new Date().toISOString(),
  summary: {
    total: targets.length,
    ok: okCount,
    dead: deadCount,
    unreachable: unreachableCount,
  },
  tools,
};

if (!DRY) {
  fs.writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`已写回 ${path.relative(ROOT, OUT)}`);
} else {
  console.log('[dry] 未写盘');
}
console.log(`汇总：ok ${okCount} / dead ${deadCount} / unreachable ${unreachableCount}（合计 ${targets.length}）`);

// ── 自动开 issue：连续 ≥4 次 DEAD 的条目交人工裁决 ──────────
// 用 execFileSync 走参数数组，完全避开 shell 引号/三引号转义地狱
// （workflow 里原先内联 node -e 拼 gh 命令，SyntaxError: Unexpected end of input）。
if (AUTO_ISSUE && !DRY) {
  const dead = Object.entries(tools).filter(([, v]) => v.deadStreak >= 4);
  if (dead.length === 0) {
    console.log('无连续 4 次 DEAD 条目，跳过 issue 扫描');
  } else {
    for (const [slug, v] of dead) {
      const title = `[tool-health] ${slug} 连续 ${v.deadStreak} 次 DEAD，请人工裁决`;
      // 已有 open issue 则跳过（幂等：多次重跑不会重复开）
      let existingCount = '0';
      try {
        existingCount = execFileSync(
          'gh',
          ['issue', 'list', '--state', 'open', '--search', title, '--json', 'number', '--jq', 'length'],
          { encoding: 'utf8', timeout: 30_000 },
        ).trim();
      } catch {
        // gh 命令失败（未登录/网络）——视为不存在，继续尝试创建
      }
      if (existingCount !== '0' && existingCount !== '') {
        console.log(`  跳过（issue 已存在）：${slug}`);
        continue;
      }
      const body = [
        `条目 **${slug}**（${v.kind}）连续 ${v.deadStreak} 次存活探测 DEAD。`,
        '',
        '按收录红线「产品已死」条款人工核实后处理：确认已死则下架（删除条目），误报则调整探测。',
        '',
        '数据：',
        '```json',
        JSON.stringify(v, null, 2),
        '```',
      ].join('\n');
      try {
        execFileSync(
          'gh',
          ['issue', 'create', '--title', title, '--body', body, '--label', 'tool-health'],
          { stdio: 'inherit', timeout: 60_000 },
        );
        console.log(`  已开 issue：${slug}`);
      } catch (e) {
        // 单条失败不阻塞整体（warn-only）
        console.warn(`  ⚠️ 开 issue 失败 ${slug}: ${String(e.message || e).slice(0, 120)}`);
      }
    }
  }
}

console.log('（本脚本 warn-only：健康数据供横幅与 issue 消费，退出码恒 0）');
