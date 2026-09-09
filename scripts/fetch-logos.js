#!/usr/bin/env node
/**
 * fetch-logos.js — 本地化全部工具 logo 到 public/logos/tools，彻底解决
 * 国内网络无法访问 Google favicon / 第三方图标服务的问题。
 *
 * 策略（构建期一次性下载，终端用户只访问同源静态资源）：
 *  1. 主流 AI 工具优先使用开源图标集 lobehub/lobe-icons（透明底、风格统一、
 *     UI 专用，天然解决“留白/暗色色差”问题），见 LOBE 映射表。
 *  2. lobe 未收录的小众工具，回退抓取其官网真实 favicon（HTML <link rel=icon>
 *     解析，再回退 /favicon.ico）。
 *  3. 任一步失败则保留现有 logo 字段，并在结尾汇总，便于人工处理。
 *
 * 幂等：可重复运行。仅处理 tools/ 目录（skills 使用各自 GitHub 图标）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { loadTools, saveCollection, saveOrder } = require(path.join(__dirname, 'lib', 'load-data.cjs'));
const OUT_DIR = path.join(ROOT, 'public/logos/tools');
const TIMEOUT_MS = 12000;
const RETRIES = 2;
// lobe-icons 静态 PNG（light 目录 = 深色/彩色图标，适配站内白色 logo 底）
const LOBE_BASE = 'https://unpkg.com/@lobehub/icons-static-png@latest/light/';

// slug -> lobe 图标名（优先彩色 *-color 变体）
const LOBE = {
  chatgpt: 'openai', whisper: 'openai', dalle: 'dalle-color', sora: 'sora-color', codex: 'codex-color',
  claude: 'claude-color', 'claude-code': 'claude-color',
  gemini: 'gemini-color', 'google-ai-studio': 'aistudio', veo: 'deepmind-color',
  grok: 'grok', deepseek: 'deepseek-color', qwen: 'qwen-color', wenxin: 'wenxin-color',
  doubao: 'doubao-color', zhipu: 'zhipu-color', kimi: 'kimi-color',
  'kimi-code': 'kimi-color', 'kimi-code-cn': 'kimi-color', yuanbao: 'yuanbao-color',
  midjourney: 'midjourney', 'stable-diffusion': 'stability-color',
  'github-copilot': 'copilot-color', cursor: 'cursor', perplexity: 'perplexity-color',
  'notion-ai': 'notion', runway: 'runway', elevenlabs: 'elevenlabs', suno: 'suno',
  'hugging-face': 'huggingface-color', langchain: 'langchain-color', v0: 'v0',
  'zapier-ai': 'zapier-color', 'replit-ai': 'replit-color', pika: 'pika',
  deepl: 'deepl-color', llama: 'meta-color', 'meta-ai': 'meta-color',
  'hermes-agent': 'nousresearch', 'jimeng-ai': 'jimeng-color', 'kling-ai': 'kling-color',
  windsurf: 'windsurf', mistral: 'mistral-color', ollama: 'ollama', cohere: 'cohere-color',
  minimax: 'minimax-color', ideogram: 'ideogram', phind: 'phind', 'figma-ai': 'figma-color',
  'iflytek-spark': 'spark-color', 'tiangong-ai': 'tiangong-color', 'yi-lingyi': 'yi-color',
  'baichuan-ai': 'baichuan-color', sensechat: 'sensenova-color', stepfun: 'stepfun-color',
  '360-zhinao': 'ai360-color', 'phi-4': 'microsoft-color', 'amazon-nova': 'nova-color',
  'xiaomi-mimo': 'xiaomimimo', 'adobe-firefly': 'adobefirefly-color', 'flux-ai': 'flux',
  'luma-dream-machine': 'luma-color', vidu: 'vidu-color', udio: 'udio-color',
  lovable: 'lovable-color', dify: 'dify-color', coze: 'coze', 'coze-cn': 'coze',
  manus: 'manus', groq: 'groq', openrouter: 'openrouter-color',
  qoder: 'qoder-color', qodercn: 'qoder-color', openclaw: 'openclaw-color',
  seedance: 'bytedance-color', trae: 'trae-color', 'trae-cn': 'trae-color',
  cerebras: 'cerebras-color', sambanova: 'sambanova-color', novita: 'novita-color',
  hyperbolic: 'hyperbolic-color', exa: 'exa-color',
};

async function fetchBuf(url) {
  let lastErr;
  for (let i = 0; i <= RETRIES; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CataitoLogoBot/1.0)' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      const type = (res.headers.get('content-type') || '').split(';')[0];
      return { buf, type };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function extFor(type, url) {
  if (/svg/.test(type) || /\.svg(\?|$)/i.test(url)) return 'svg';
  if (/png/.test(type) || /\.png(\?|$)/i.test(url)) return 'png';
  if (/jpe?g/.test(type) || /\.jpe?g(\?|$)/i.test(url)) return 'jpg';
  if (/webp/.test(type) || /\.webp(\?|$)/i.test(url)) return 'webp';
  if (/x-icon|vnd\.microsoft\.icon/.test(type) || /\.ico(\?|$)/i.test(url)) return 'ico';
  return 'png';
}

// 抓取官网真实 favicon（HTML 解析，回退 /favicon.ico）
async function siteIcon(domain) {
  try {
    const res = await fetch('https://' + domain, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CataitoLogoBot/1.0)' },
      redirect: 'follow',
    });
    const html = await res.text();
    const links = [...html.matchAll(/<link[^>]+>/gi)].map((m) => m[0])
      .filter((l) => /rel=["'][^"']*icon/i.test(l));
    // 优先 apple-touch-icon（通常为高清 png），再按 sizes 从大到小
    const score = (l) => {
      let s = 0;
      if (/apple-touch-icon/i.test(l)) s += 1000;
      const m = l.match(/sizes=["'](\d+)/i);
      if (m) s += parseInt(m[1], 10);
      if (/\.svg/i.test(l)) s += 50;
      if (/\.png/i.test(l)) s += 20;
      return s;
    };
    links.sort((a, b) => score(b) - score(a));
    for (const l of links) {
      const href = (l.match(/href=["']([^"']+)["']/i) || [])[1];
      if (!href) continue;
      const abs = new URL(href, 'https://' + domain).href;
      try {
        const { buf, type } = await fetchBuf(abs);
        if (buf.length > 120) return { buf, type, url: abs };
      } catch { /* try next */ }
    }
  } catch { /* fall through to favicon.ico */ }
  const fav = 'https://' + domain + '/favicon.ico';
  const { buf, type } = await fetchBuf(fav);
  if (buf.length <= 120) throw new Error('favicon too small');
  return { buf, type, url: fav };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let tools = loadTools();
  const failed = [];
  let ok = 0;

  for (const tool of tools) {
    // 清理该 slug 的旧图标文件（避免遗留不同扩展名）
    const clean = () => {
      for (const e of ['png', 'svg', 'jpg', 'webp', 'ico']) {
        const p = path.join(OUT_DIR, tool.slug + '.' + e);
        if (fs.existsSync(p)) fs.rmSync(p);
      }
    };
    try {
      let result;
      if (LOBE[tool.slug]) {
        const { buf, type } = await fetchBuf(LOBE_BASE + LOBE[tool.slug] + '.png');
        result = { buf, type, url: LOBE[tool.slug], src: 'lobe' };
      } else {
        const domain = new URL(tool.url).hostname;
        const r = await siteIcon(domain);
        result = { ...r, src: 'site' };
      }
      const ext = extFor(result.type, result.url);
      clean();
      fs.writeFileSync(path.join(OUT_DIR, tool.slug + '.' + ext), result.buf);
      tool.logo = `/logos/tools/${tool.slug}.${ext}`;
      ok++;
      console.log(`OK  [${result.src}] ${tool.slug.padEnd(20)} ${result.buf.length}B -> ${tool.logo}`);
    } catch (e) {
      failed.push(`${tool.slug} (${e.message})`);
      console.log(`ERR ${tool.slug.padEnd(20)} ${e.message} — 保留原 logo: ${tool.logo}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2) + '\n');
  console.log(`\n完成：成功 ${ok} / ${tools.length}，失败 ${failed.length}`);
  if (failed.length) console.log('失败项（需人工处理）:\n  ' + failed.join('\n  '));
}

main();
