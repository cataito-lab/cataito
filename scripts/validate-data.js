#!/usr/bin/env node
/**
 * 数据文件结构验证脚本
 * 验证 tools.json、toolDetails.json、blogPosts.json、skills.json 的必填字段与五语言完整性。
 * 退出码 0 = 全部通过，1 = 存在错误。
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'src', 'data');
// 语言列表从 messages/*.json 自动发现（单一 source of truth），新增语言无需改此脚本
const { loadTools, loadToolDetails, loadSkills, loadMcp } = require('./lib/load-data.cjs');

const LOCALES = fs.readdirSync(path.resolve(__dirname, '..', 'messages'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => path.basename(f, '.json'))
  .sort();

let totalErrors = 0;
let totalWarnings = 0;

function error(msg) {
  totalErrors++;
  console.error(`  ✘ ${msg}`);
}

function warn(msg) {
  totalWarnings++;
  console.warn(`  ⚠ ${msg}`);
}

function ok(msg) {
  console.log(`  ✔ ${msg}`);
}

function loadJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    error(`文件不存在: ${filename}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    error(`JSON 解析失败: ${filename} — ${e.message}`);
    return null;
  }
}

/**
 * 检查对象是否包含指定的五语言键（用于 { en, zh, ja, es, fr } 结构）
 */
function checkI18nKeys(obj, context, required = true) {
  if (!obj || typeof obj !== 'object') {
    if (required) error(`${context}: 期望对象，实际为 ${typeof obj}`);
    return;
  }
  for (const locale of LOCALES) {
    if (!(locale in obj)) {
      if (required) error(`${context}: 缺少语言键 "${locale}"`);
    } else if (obj[locale] === '' || obj[locale] === null || obj[locale] === undefined) {
      error(`${context}.${locale}: 值为空`);
    }
  }
}

// ─── 1. tools.json ───────────────────────────────────────────────
function validateTools() {
  console.log('\n━━━ tools.json ━━━');
  const data = loadTools();
  if (!data) return;

  if (!Array.isArray(data)) {
    error('期望数组，实际为 ' + typeof data);
    return;
  }
  ok(`共 ${data.length} 个工具`);

  const REQUIRED_FIELDS = ['slug', 'name', 'nameZh', 'description', 'descriptionEn', 'descriptionJa', 'descriptionEs', 'descriptionFr', 'url', 'logo', 'category', 'tags', 'featured', 'developer'];
  const OPTIONAL_FIELDS = ['developerZh', 'platforms'];
  const slugs = new Set();

  data.forEach((tool, i) => {
    const prefix = `tools[${i}]`;

    // 必填字段检查
    for (const field of REQUIRED_FIELDS) {
      if (!(field in tool)) {
        error(`${prefix} (${tool.slug || '?'}): 缺少必填字段 "${field}"`);
      }
    }

    // slug 唯一性
    if (tool.slug) {
      if (slugs.has(tool.slug)) {
        error(`${prefix}: slug "${tool.slug}" 重复`);
      }
      slugs.add(tool.slug);
    }

    // 五语言名称检查：name 即英文，nameZh 为中文
    // tools.json 中 name/nameZh 是名称字段，不要求 nameJa/nameEs/nameFr（品牌名通常不翻译）
    // 但 description 五语言必须完整
    const descFields = ['description', 'descriptionEn', 'descriptionJa', 'descriptionEs', 'descriptionFr'];
    for (const field of descFields) {
      if (field in tool && (typeof tool[field] !== 'string' || tool[field].trim() === '')) {
        error(`${prefix} (${tool.slug}): ${field} 应为非空字符串`);
      }
    }

    // tags 应为数组
    if ('tags' in tool && !Array.isArray(tool.tags)) {
      error(`${prefix} (${tool.slug}): tags 应为数组`);
    }
  });
}

// ─── 2. toolDetails.json ─────────────────────────────────────────
function validateToolDetails() {
  console.log('\n━━━ toolDetails.json ━━━');
  const data = loadToolDetails();
  if (!data) return;

  if (typeof data !== 'object' || Array.isArray(data)) {
    error('期望对象（key-value），实际为 ' + typeof data);
    return;
  }

  const slugs = Object.keys(data);
  ok(`共 ${slugs.length} 个工具详情`);

  const REQUIRED_SECTIONS = ['features', 'pricing', 'useCases', 'pros', 'cons', 'latestUpdate'];
  const OPTIONAL_SECTIONS = ['tutorial', 'summary'];

  for (const slug of slugs) {
    const detail = data[slug];
    const prefix = `toolDetails["${slug}"]`;

    if (typeof detail !== 'object' || detail === null) {
      error(`${prefix}: 期望对象`);
      continue;
    }

    // 必填段落检查
    for (const section of REQUIRED_SECTIONS) {
      if (!(section in detail)) {
        error(`${prefix}: 缺少必填段落 "${section}"`);
      }
    }

    // features: { en: [...], zh: [...], ... }
    if ('features' in detail) {
      for (const locale of LOCALES) {
        if (!(locale in detail.features)) {
          error(`${prefix}.features: 缺少 "${locale}"`);
        } else if (!Array.isArray(detail.features[locale])) {
          error(`${prefix}.features.${locale}: 期望数组`);
        } else if (detail.features[locale].length === 0) {
          warn(`${prefix}.features.${locale}: 数组为空`);
        }
      }
    }

    // pricing: { tierName: { en, zh, ja, es, fr }, ... }
    if ('pricing' in detail && typeof detail.pricing === 'object') {
      for (const tier of Object.keys(detail.pricing)) {
        checkI18nKeys(detail.pricing[tier], `${prefix}.pricing.${tier}`);
      }
    }

    // useCases: { en: [...], zh: [...], ... }
    if ('useCases' in detail) {
      for (const locale of LOCALES) {
        if (!(locale in detail.useCases)) {
          error(`${prefix}.useCases: 缺少 "${locale}"`);
        } else if (!Array.isArray(detail.useCases[locale])) {
          error(`${prefix}.useCases.${locale}: 期望数组`);
        }
      }
    }

    // pros: { en: [...], zh: [...], ... }
    if ('pros' in detail) {
      for (const locale of LOCALES) {
        if (!(locale in detail.pros)) {
          error(`${prefix}.pros: 缺少 "${locale}"`);
        } else if (!Array.isArray(detail.pros[locale])) {
          error(`${prefix}.pros.${locale}: 期望数组`);
        }
      }
    }

    // cons: { en: [...], zh: [...], ... }
    if ('cons' in detail) {
      for (const locale of LOCALES) {
        if (!(locale in detail.cons)) {
          error(`${prefix}.cons: 缺少 "${locale}"`);
        } else if (!Array.isArray(detail.cons[locale])) {
          error(`${prefix}.cons.${locale}: 期望数组`);
        }
      }
    }

    // latestUpdate: { en, zh, ja, es, fr }
    if ('latestUpdate' in detail) {
      checkI18nKeys(detail.latestUpdate, `${prefix}.latestUpdate`);
    }
  }
}

// ─── 3. blogPosts.json ───────────────────────────────────────────
function validateBlogPosts() {
  console.log('\n━━━ blogPosts.json ━━━');
  const data = loadJSON('blogPosts.json');
  if (!data) return;

  if (!Array.isArray(data)) {
    error('期望数组，实际为 ' + typeof data);
    return;
  }
  ok(`共 ${data.length} 篇博文`);

  const REQUIRED_FIELDS = ['slug', 'title', 'excerpt', 'content', 'author', 'publishedAt', 'category', 'tags', 'coverImage', 'readTime'];
  const I18N_FIELDS = ['title', 'excerpt', 'content'];
  const slugs = new Set();

  data.forEach((post, i) => {
    const prefix = `blogPosts[${i}]`;

    // 必填字段
    for (const field of REQUIRED_FIELDS) {
      if (!(field in post)) {
        error(`${prefix} (${post.slug || '?'}): 缺少必填字段 "${field}"`);
      }
    }

    // slug 唯一性
    if (post.slug) {
      if (slugs.has(post.slug)) {
        error(`${prefix}: slug "${post.slug}" 重复`);
      }
      slugs.add(post.slug);
    }

    // 五语言字段检查
    for (const field of I18N_FIELDS) {
      if (field in post) {
        checkI18nKeys(post[field], `${prefix}.${field}`);
      }
    }

    // tags 应为数组
    if ('tags' in post && !Array.isArray(post.tags)) {
      error(`${prefix} (${post.slug}): tags 应为数组`);
    }

    // readTime 应为正数
    if ('readTime' in post && (typeof post.readTime !== 'number' || post.readTime <= 0)) {
      error(`${prefix} (${post.slug}): readTime 应为正数`);
    }
  });
}

// ─── 4. src/data/skills/ ────────────────────────────────────────
function validateSkills() {
  console.log('\n━━━ src/data/skills/ ━━━');
  const data = loadSkills();
  if (!data) return;

  if (!Array.isArray(data)) {
    error('期望数组，实际为 ' + typeof data);
    return;
  }
  ok(`共 ${data.length} 个技能`);

  const REQUIRED_FIELDS = ['slug', 'name', 'nameZh', 'description', 'descriptionEn', 'descriptionJa', 'descriptionEs', 'descriptionFr', 'developer', 'developerZh', 'repo', 'agents', 'category', 'tags', 'installCommand', 'logo', 'stars', 'featured'];
  const slugs = new Set();

  data.forEach((skill, i) => {
    const prefix = `skills[${i}]`;

    // 必填字段
    for (const field of REQUIRED_FIELDS) {
      if (!(field in skill)) {
        error(`${prefix} (${skill.slug || '?'}): 缺少必填字段 "${field}"`);
      }
    }

    // slug 唯一性
    if (skill.slug) {
      if (slugs.has(skill.slug)) {
        error(`${prefix}: slug "${skill.slug}" 重复`);
      }
      slugs.add(skill.slug);
    }

    // 五语言描述检查
    const descFields = ['description', 'descriptionEn', 'descriptionJa', 'descriptionEs', 'descriptionFr'];
    for (const field of descFields) {
      if (field in skill && (typeof skill[field] !== 'string' || skill[field].trim() === '')) {
        error(`${prefix} (${skill.slug}): ${field} 应为非空字符串`);
      }
    }

    // agents 应为数组
    if ('agents' in skill && !Array.isArray(skill.agents)) {
      error(`${prefix} (${skill.slug}): agents 应为数组`);
    }

    // tags 应为数组
    if ('tags' in skill && !Array.isArray(skill.tags)) {
      error(`${prefix} (${skill.slug}): tags 应为数组`);
    }

    // stars 应为数字
    if ('stars' in skill && typeof skill.stars !== 'number') {
      error(`${prefix} (${skill.slug}): stars 应为数字`);
    }
  });
}

// ─── 5. 交叉验证：tools.json 与 toolDetails.json slug 一致性 ────
function validateCrossReferences() {
  console.log('\n━━━ 交叉引用检查 ━━━');

  const tools = loadTools();
  const toolDetails = loadToolDetails();
  if (!tools || !toolDetails) return;

  const toolSlugs = new Set(tools.map(t => t.slug));
  const detailSlugs = new Set(Object.keys(toolDetails));

  // tools.json 中有但 toolDetails.json 中没有
  const missingDetails = [...toolSlugs].filter(s => !detailSlugs.has(s));
  if (missingDetails.length > 0) {
    warn(`以下工具在 tools.json 中存在但 toolDetails.json 中缺失: ${missingDetails.join(', ')}`);
  } else {
    ok('tools.json 中所有工具在 toolDetails.json 中均有详情');
  }

  // toolDetails.json 中有但 tools.json 中没有
  const orphanDetails = [...detailSlugs].filter(s => !toolSlugs.has(s));
  if (orphanDetails.length > 0) {
    warn(`以下详情在 toolDetails.json 中存在但 tools.json 中无对应工具: ${orphanDetails.join(', ')}`);
  } else {
    ok('toolDetails.json 中所有 slug 在 tools.json 中均有对应');
  }
}

// ─── 执行 ────────────────────────────────────────────────────────
console.log('🔍 数据文件结构验证开始\n');

validateTools();
validateToolDetails();
validateBlogPosts();
// ─── 5. src/data/mcp/ ────────────────────────────────
function validateMcp() {
  console.log('\n━━━ src/data/mcp/ ━━━');
  const data = loadMcp();
  if (!data) return;

  if (!Array.isArray(data)) {
    error('期望数组，实际为 ' + typeof data);
    return;
  }
  ok(`共 ${data.length} 个 MCP 服务器`);

  const REQUIRED_FIELDS = ['slug', 'name', 'nameZh', 'description', 'descriptionEn', 'descriptionJa', 'descriptionEs', 'descriptionFr', 'developer', 'developerZh', 'repo', 'clients', 'category', 'tags', 'installCommand', 'logo', 'stars', 'featured'];
  const slugs = new Set();

  data.forEach((entry, i) => {
    const prefix = `mcp[${i}]`;

    // 必填字段
    for (const field of REQUIRED_FIELDS) {
      if (!(field in entry)) {
        error(`${prefix} (${entry.slug || '?'}): 缺少必填字段 "${field}"`);
      }
    }

    // slug 唯一性
    if (entry.slug) {
      if (slugs.has(entry.slug)) {
        error(`${prefix}: slug "${entry.slug}" 重复`);
      }
      slugs.add(entry.slug);
    }

    // 五语言描述检查
    const descFields = ['description', 'descriptionEn', 'descriptionJa', 'descriptionEs', 'descriptionFr'];
    for (const field of descFields) {
      if (field in entry && (typeof entry[field] !== 'string' || entry[field].trim() === '')) {
        error(`${prefix} (${entry.slug}): ${field} 应为非空字符串`);
      }
    }

    // clients 应为数组
    if ('clients' in entry && !Array.isArray(entry.clients)) {
      error(`${prefix} (${entry.slug}): clients 应为数组`);
    }

    // tags 应为数组
    if ('tags' in entry && !Array.isArray(entry.tags)) {
      error(`${prefix} (${entry.slug}): tags 应为数组`);
    }

    // stars 应为数字
    if ('stars' in entry && typeof entry.stars !== 'number') {
      error(`${prefix} (${entry.slug}): stars 应为数字`);
    }
  });
}

validateSkills();
validateMcp();
validateCrossReferences();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (totalErrors > 0) {
  console.error(`\n✘ 验证失败：${totalErrors} 个错误，${totalWarnings} 个警告`);
  process.exit(1);
} else {
  console.log(`\n✔ 验证通过：0 个错误，${totalWarnings} 个警告`);
  process.exit(0);
}
