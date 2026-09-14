import { MetadataRoute } from 'next';

// output: 'export' 要求路由显式声明为纯静态，否则构建会报错。
// 详见 https://nextjs.org/docs/advanced-features/static-html-export
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /api/ 内部 API、/cdn-cgi/ Cloudflare 伪页、/console /admin /internal 运维入口
        // 不进入搜索索引，避免浪费 Google 抓取预算并防止内部路径被意外收录
        disallow: ['/api/', '/cdn-cgi/', '/console/', '/admin/', '/internal/'],
      },
      // ── AI 训练爬虫封锁（robots 标准层）──────────────────────────────
      // ⚠️ 不要用 Cloudflare「AI 自动程序策略」的"训练=阻止"来拦这些爬虫：
      //    2026-09-15 起 CF 按最严格规则处理多用途爬虫，Googlebot/Bingbot/Applebot
      //    兼具 Search+Training 行为，"训练=阻止"会连 Googlebot 一起封锁（网络层拦截，
      //    Google 无法绕过）→ 全站无法被搜索收录。训练封锁因此必须走 robots.txt。
      // 只列纯训练爬虫；AI 搜索爬虫（OAI-SearchBot/PerplexityBot 等）保留，
      // 它们会带来引用流量。若后续要连搜索引用一起封，在此追加即可。
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      { userAgent: 'Applebot-Extended', disallow: '/' },
      { userAgent: 'meta-externalagent', disallow: '/' },
      { userAgent: 'Amazonbot', disallow: '/' },
    ],
    sitemap: 'https://cataito.com/sitemap.xml',
  };
}