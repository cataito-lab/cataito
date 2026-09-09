# OPERATIONS — 部署与运维手册

> Cataito（cataito.com）运维要点。故障排查细节见 `docs/ranking/RUNBOOK.md`，决策背景见根目录 `DECISIONS.md`。
> 最后更新：2026-09-06

## 部署架构

| 项 | 内容 |
|---|---|
| 渲染 | Next.js 16 `output: 'export'` 纯静态导出，构建期预生成全站（约 1700 页） |
| 部署平台 | Cloudflare Pages（免费档），项目名 `cataito` |
| 唯一部署通道 | GitHub Actions `.github/workflows/cloudflare-deploy.yml`（push main 触发，`wrangler pages deploy out`） |
| CF 自动 GitHub 部署 | 已关闭（2026-09-06，分支控制：生产/预览自动部署均禁用）——只保留 Actions 一条通道，避免双通道对 lockfile 宽容度不同导致的静默失败 |
| 301 重定向 / 安全头 | CF Pages 原生：`public/_redirects`（110 条）+ `public/_headers`（CSP 等；AdSense 上线后已放行 Google 广告域，`https://cataito-lab.github.io` 是排行榜活数据客户端唯一 fetch 目标——新增外部 fetch 前先补 `connect-src`，否则浏览器静默拦截、页面卡在 SSR 静态壳） |
| DNS | Cloudflare 代理模式 |

## 为什么是静态导出（架构约束）

- OpenNext 在 CF 上有 3MiB SSG 页面上限，Next 16 下无法绕过（DECISIONS 2026-09-03）
- 若必须走 `next-on-pages`，Next.js 需锁 `<=15.5.2`
- 本地验证依赖变更：`npm install --lockfile-only` → `npm ci` → `npm run build`（CF 用 `npm ci` 严格校验 lockfile，Actions 的 `--legacy-peer-deps` 会掩盖漂移，**以 CF 为准**）

## 自动化流水线（GitHub Actions）

| Workflow | 触发 | 作用 |
|---|---|---|
| `ci.yml` | push/PR main | 内部文件泄露检测 → `npm test` 五连检 → build → 冒烟 |
| `cloudflare-deploy.yml` | push main | 构建并部署 CF Pages（唯一部署通道） |
| `refresh-ranking.yml` | 双 cron UTC 00:37/02:53 + 手动 | 排行榜刷新 + 当日快照 + `pages-data` 分支活数据发布（详见 `docs/ranking/RUNBOOK.md`） |
| `refresh-stars.yml` | UTC 20:47 | MCP/Skills 星数刷新，自动 commit |
| `link-health.yml` | 每周一 | 官网存活检测（唯一会 fail）+ 内容审计（warn-only） |

所有 cron 刻意避开整点（GitHub 高峰丢调度）；`refresh-ranking` 双 cron 兜底。

## 关键纪律

- **快照断档不可回补**：`snapshots/` 日快照是周榜/月榜的增量基准，GitHub API 查不到历史星数。失败自动开 issue，发现断档当天立即手动补跑
- **排行榜变更四步走**：递增 `ALGO_VERSION` → `docs/ranking/ALGO-CHANGELOG.md` 追加 → `--dry` 对比前 20 → `algo:` 前缀单独 commit
- **收录规模上限 350 条**（2026-09-06 定）：CF Pages 单次部署上限 20,000 文件（实测 10,636 @ 195 条），扩容前先拆子站或瘦身
- **多语言 noindex**：ja/es/fr 全站 noindex（`src/i18n/routing.ts` 的 `TEMP_NOINDEX_LOCALES` 单一来源，同步驱动 robots / hreflang / sitemap），本地化完成后移除即全链路恢复
- **内容审计**：`npm run audit:all`（信息过期/Verdict 腐化/Pricing 漂移，warn-only）；DRIFT 对 JS 渲染定价页是已知误报，人工核对即可

## 回滚

1. CF Pages 控制台 → 部署历史 → Rollback 到上一个成功部署（即时生效）
2. 代码回滚：`git revert` + push，走正常 CI/部署
3. 数据回滚：`src/data/` 相关提交 revert；排行榜快照不可回补，只能跳过缺失日

## 私有灾备

私有仓库保存完整 git 历史（main）与工作区全量快照（internal-files，含内部文档）；GSC 凭据与 token 永久排除。换机恢复流程见内部技术文档。
