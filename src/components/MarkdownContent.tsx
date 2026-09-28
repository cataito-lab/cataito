'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Check, Copy } from 'lucide-react';
import PlatformTabs from './PlatformTabs';
import type { Platform } from './PlatformContext';

/**
 * 升级版 Markdown 渲染器 — 支持图文混排（教程/博客通用）
 * 能力：标题 / 段落 / 列表 / 表格 / 代码块（复制）/ 行内代码 / 图片（兜底）/ 粗体 / 链接 / 引用
 * 平台块：===windows=== / ===macos=== / ===linux=== 之间的内容渲染为联动 Tabs（教程专用）
 * 设计：跟随全站设计系统（无边框阴影卡片、CSS 变量、暗色适配）
 */

// ---- 行内解析：**bold**、`code`、[text](url) ----
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // 正则依次匹配：code、bold、link
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`${keyBase}-t${k++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    const [full, code, bold, link] = match;
    if (code) {
      nodes.push(
        <code
          key={`${keyBase}-c${k++}`}
          className="px-1.5 py-0.5 bg-[var(--muted-bg)] border border-[var(--muted-border)] rounded text-[13px] font-mono text-[var(--primary)]"
        >
          {code.slice(1, -1)}
        </code>
      );
    } else if (bold) {
      nodes.push(
        <strong key={`${keyBase}-b${k++}`} className="font-semibold text-[var(--foreground)]">
          {bold.slice(2, -2)}
        </strong>
      );
    } else if (link) {
      const m = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (m) {
        const href = m[2].startsWith('http') ? m[2] : m[2];
        nodes.push(
          <a
            key={`${keyBase}-l${k++}`}
            href={href}
            target={m[2].startsWith('http') ? '_blank' : undefined}
            rel={m[2].startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-[var(--primary)] hover:underline transition"
          >
            {m[1]}
          </a>
        );
      } else {
        nodes.push(<span key={`${keyBase}-l${k++}`}>{full}</span>);
      }
    } else {
      nodes.push(<span key={`${keyBase}-e${k++}`}>{full}</span>);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyBase}-t${k++}`}>{text.slice(lastIndex)}</span>);
  }
  return nodes;
}

// ---- 图片：next/image + 加载失败兜底 ----
function MdImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="my-6 rounded-xl bg-[var(--muted-bg)] border border-[var(--muted-border)] flex items-center justify-center py-16 text-sm text-[var(--muted)]">
        <span>🖼️ {alt || 'Image'}</span>
      </div>
    );
  }

  return (
    <figure className="my-6">
      <div className="rounded-xl overflow-hidden shadow-[var(--card-shadow)] bg-[var(--muted-bg)]">
        <Image
          src={src}
          alt={alt || 'Tutorial image'}
          width={1200}
          height={675}
          className="w-full h-auto object-cover"
          onError={() => setFailed(true)}
        />
      </div>
      {alt && alt !== 'step' && (
        <figcaption className="mt-2 text-center text-sm text-[var(--muted)]">{alt}</figcaption>
      )}
    </figure>
  );
}

// ---- 代码块：深色 + 复制按钮 ----
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-[var(--muted-border)] bg-[#161618] dark:bg-[#0d0d0f]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs font-mono text-white/50">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-white/90 leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

// ---- 平台标记 ----
const PLATFORM_RE = /^===\s*(windows|macos|linux)\s*===$/;

// ---- 主渲染函数（可递归：平台块内继续解析 markdown） ----
function renderMarkdown(lines: string[], keySeed: number): ReactNode[] {
  const elements: ReactNode[] = [];
  let idx = keySeed * 1000;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 平台块：===windows=== / ===macos=== / ===linux===
    const platformMatch = line.trim().match(PLATFORM_RE);
    if (platformMatch) {
      const blocks: Partial<Record<Platform, ReactNode>> = {};
      let currentPlatform = platformMatch[1] as Platform;
      const currentLines: string[] = [];
      i++;
      while (i < lines.length) {
        const line2 = lines[i];
        // `## ` 顶层标题终止平台块组，该行交回主循环处理
        if (line2.trim().startsWith('## ')) {
          blocks[currentPlatform] = (
            <div className="platform-block">{renderMarkdown(currentLines, idx + 1)}</div>
          );
          break;
        }
        const inner = line2.trim().match(PLATFORM_RE);
        if (inner) {
          blocks[currentPlatform] = (
            <div className="platform-block">{renderMarkdown(currentLines, idx + 1)}</div>
          );
          currentPlatform = inner[1] as Platform;
          currentLines.length = 0;
        } else {
          currentLines.push(line2);
        }
        i++;
      }
      // 平台块组到文件末尾
      if (i >= lines.length) {
        blocks[currentPlatform] = (
          <div className="platform-block">{renderMarkdown(currentLines, idx + 1)}</div>
        );
      }
      elements.push(<PlatformTabs key={idx++} blocks={blocks} />);
      continue;
    }

    // 代码块
    if (line.trim().startsWith('```')) {
      const lang = line.trim().replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(<CodeBlock key={idx++} code={codeLines.join('\n')} lang={lang} />);
      continue;
    }

    // 图片
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      elements.push(<MdImage key={idx++} src={imgMatch[2]} alt={imgMatch[1]} />);
      i++;
      continue;
    }

    // 表格块
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0].split('|').filter((c) => c.trim()).map((c) => c.trim());
      const rows = tableLines.slice(2).filter((row) => row.startsWith('|'));
      elements.push(
        <div key={idx++} className="overflow-x-auto my-6 rounded-xl border border-[var(--muted-border)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--muted-bg)]">
                {headers.map((h, hi) => (
                  <th key={hi} className="px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)]">
                    {renderInline(h, `h${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const cells = row.split('|').filter((c) => c.trim()).map((c) => c.trim());
                return (
                  <tr
                    key={ri}
                    className={`${
                      ri % 2 === 0 ? 'bg-[var(--card-bg)]' : 'bg-[var(--muted-bg)]'
                    } transition-colors hover:bg-[var(--muted-bg)]`}
                  >
                    {cells.map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-sm text-[var(--muted)] border-t border-[var(--muted-border)]">
                        {renderInline(cell, `c${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 标题
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={idx++} className="text-lg font-semibold text-[var(--foreground)] mt-6 mb-3">
          {renderInline(line.replace('#### ', ''), `h4${idx}`)}
        </h4>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={idx++}
          className="text-lg font-semibold text-[var(--foreground)] mt-9 mb-3 pl-3 border-l-[3px] border-[var(--primary)]"
        >
          {renderInline(line.replace('### ', ''), `h3${idx}`)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={idx++}
          className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-14 mb-5 first:mt-0"
        >
          {renderInline(line.replace('## ', ''), `h2${idx}`)}
        </h2>
      );
    }
    // 引用
    else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={idx++}
          className="my-4 pl-4 border-l-4 border-[var(--primary)] bg-[var(--muted-bg)] rounded-r-lg py-3 pr-4 text-[var(--muted)]"
        >
          {renderInline(line.replace('> ', ''), `q${idx}`)}
        </blockquote>
      );
    }
    // 无序列表（支持缩进）
    else if (line.trim().startsWith('- ')) {
      const items = [line];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i]);
        i++;
      }
      elements.push(
        <ul key={idx++} className="list-disc ml-6 mb-4 space-y-2 marker:text-[var(--primary)]">
          {items.map((it, ii) => (
            <li key={ii} className="text-[var(--muted)]">
              {renderInline(it.trim().replace('- ', ''), `ul${idx}-${ii}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }
    // 有序列表（支持缩进；每组从 1 重新编号）—— 步骤徽章样式
    else if (line.trim().match(/^\d+\.\s/)) {
      const items = [line];
      i++;
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        items.push(lines[i]);
        i++;
      }
      elements.push(
        <ol key={idx++} className="mb-6 space-y-3">
          {items.map((it, ii) => (
            <li key={ii} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--muted-bg)] border border-[var(--muted-border)] text-[var(--primary)] text-sm font-semibold flex items-center justify-center">
                {ii + 1}
              </span>
              <span className="text-[var(--muted)] pt-0.5 leading-relaxed">
                {renderInline(it.trim().replace(/^\d+\.\s/, ''), `ol${idx}-${ii}`)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }
    // 空行
    else if (line.trim() === '') {
      elements.push(<div key={idx++} className="h-4" />);
    }
    // 段落
    else {
      elements.push(
        <p key={idx++} className="text-[var(--muted)] mb-4 leading-relaxed">
          {renderInline(line, `p${idx}`)}
        </p>
      );
    }
    i++;
  }

  return elements;
}

// ---- 主渲染器 ----
interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  const lines = content.split('\n');
  return <div className="markdown-content">{renderMarkdown(lines, 0)}</div>;
}
