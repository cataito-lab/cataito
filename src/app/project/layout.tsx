import type { Metadata } from 'next';
import Link from 'next/link';
import '../globals.css';

// P4.1：排行项目详情页使用独立布局（en-only 数据页，不经 [locale] 段）。
// 设计决策见 CATAI-改版计划-2026-09.md：5 语言会多出 ~9,000 文件撞 CF Pages 上限，
// GitHub 公开数据语言中立，en 单语为容量安全解。

export const metadata: Metadata = {
  title: 'Cataito — GitHub AI Project Rankings',
  description:
    'Daily-refreshed ranking of the fastest-growing open-source AI projects, with star-history charts built from daily snapshots.',
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <header className="border-b border-[var(--card-border)] bg-[var(--header-bg)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/en" className="font-bold text-lg tracking-tight text-[var(--foreground)]">
              Cataito
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/en/ranking" className="text-[var(--primary)] font-medium hover:underline">
                AI Rankings
              </Link>
              <Link href="/en/tools" className="text-[var(--muted)] hover:text-[var(--foreground)]">
                Tools
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-[var(--card-border)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-xs text-[var(--muted)] flex flex-col sm:flex-row justify-between gap-2">
            <span>© {new Date().getFullYear()} Cataito — AI Ecosystem Portal</span>
            <span>
              Star data from daily GitHub snapshots ·{' '}
              <Link href="/en/ranking" className="text-[var(--primary)] hover:underline">
                Full rankings
              </Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
