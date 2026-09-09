# TECH_SPEC — 技术规格

> Cataito 技术架构与约定。运维/部署见 `docs/OPERATIONS.md`。最后更新：2026-09-06

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16.3.3（锁精确版本）+ React 19.2.4 + TypeScript strict |
| 渲染 | `output: 'export'` 静态导出；**无 API 路由、无 middleware**；`npm start` = `serve out` |
| 样式 | Tailwind v4（CSS-first，无 config 文件）；21 个亮/暗 CSS 变量（`src/app/globals.css`），禁硬编码色值 |
| i18n | next-intl v4；语言单一来源 `src/i18n/routing.ts`（en/zh/ja/es/fr）；重定向由 `public/_redirects` 承担 |
| 校验 | ajv JSON Schema（`scripts/schemas/`）+ 自研五连检（`npm test`） |
| Node | 22（engines >=22.12；`.nvmrc`/全部 workflow/CI 一致） |

⚠️ Next 16 与旧版差异大：写框架相关代码前先查 `node_modules/next/dist/docs/`，不凭记忆。

## 目录结构要点

```
src/app/[locale]/     全部页面路由（tools/tool/skills/mcp/blog/tutorials/ranking/...）
                      每个动态段都有 generateStaticParams；列表页 revalidate=3600
src/components/       28+ 组件；ToolCard 内含 getLocalizedDescription / PLATFORM_META 复用辅助
src/data/*.json       主档+详情成对（tools/toolDetails、skills/skillDetails、mcp/mcpDetails）
                      + blogPosts + tutorials + ranking.json
src/i18n/             routing.ts（语言与 noindex 单一来源）/ request.ts / navigation.ts
src/lib/              categories.ts（16 分类单一来源）、seo.ts（hreflang/JSON-LD）、
                      sites.ts（生态子站）、adsense.ts、form-guard.tsx（表单防滥用）、brandColors.ts
public/               _redirects/_headers（CF 原生）、logos/（全站 logo 本地托管）
scripts/              校验/审计/排行榜/星数刷新脚本
docs/                 OPERATIONS.md、TECH_SPEC.md、ranking/（RUNBOOK/IDEAS/ALGO-CHANGELOG）
```

## 数据层约定

- **五语言两套机制**：列表文件用扁平后缀字段（`description` + `descriptionEn/Ja/Es/Fr`）；详情文件用 `{en,zh,ja,es,fr}` i18n 对象，五键全 required、禁多余语言键
- **meta 审计字段**（schema 强制）：`lastVerified` / `pricingVerified` 必填，有 verdict 则 `verdictDate` 必填；改哪块刷哪个日期
- **录入走幂等脚本**（内部 `batch.mjs` 三阶段），禁手改大 JSON；存量修改走一次性脚本留痕
- 取描述统一 `getLocalizedDescription(tool, locale)`，禁 locale 三元硬编码
- 校验入口：`npm test`（schemas → data → i18n → css-vars → component-behavior）

## UI 约定（历史踩坑，见内部 LESSONS.md）

- 颜色只用 CSS 变量；内容卡片禁渐变；外链图片必须有 `onError` 兜底
- ScrollReveal 动画 opacity 恒为 1（防内容不可见），仅位移 + rAF
- 详情页板块顺序固定：About → Verdict → Pricing → Use Cases → Pros/Cons → Installation → FAQ
- 「浏览全部」文案复用既有键，五语言措辞一致

## SEO / 合规架构

- hreflang / canonical：`src/lib/seo.ts` `generateAlternates`；与 noindex 策略联动（`TEMP_NOINDEX_LOCALES` 过滤）
- Consent Mode v2：`GoogleAnalytics.tsx` 默认全 denied，`ConsentBanner.tsx` 按用户选择 update（localStorage `catai-consent`）
- AdSense：`src/lib/adsense.ts` 常量源（ID 硬编码即配置）；广告仅博客详情 + 工具详情两类长内容页；CSP 白名单在 `public/_headers`（Google 广告域变更会导致广告消失，`https://cataito-lab.github.io` 是排行榜客户端拉取活数据的唯一 fetch 目标——新增任何前端 fetch/外部域名必须先补 `connect-src`，否则浏览器静默拦截，页面回退到 SSR 静态壳）
- 表单防滥用：`src/lib/form-guard.tsx`（honeypot + 时间陷阱 + Turnstile 可选启用）

## 排行榜（核心差异化资产）

- `scripts/github-ranking/rank.mjs`（`ALGO_VERSION` 1.3+）：GitHub Search API 发现 → 质量过滤 → 熔断检查（先于写盘）→ 私有加权评分 → `ranking.json` + 日快照
- 数据不含得分字段（算法保密）；快照滚动 548 天、月初永久保留
- 活数据发布：`pages-data` 分支 → GitHub Pages，前端客户端拉取覆盖静态壳
- 变更纪律见 `docs/ranking/RUNBOOK.md`
