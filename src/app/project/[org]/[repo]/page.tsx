import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  allProjects,
  getProjectPageData,
  rankingUpdatedAt,
  type ProjectPageData,
} from '@/lib/ranking-history';
import { generateAlternates } from '@/lib/seo';

export const revalidate = 3600;

/** 服务端渲染的 star 历史 SVG（零客户端 JS，可被爬虫直接读取） */
function StarHistoryChart({ data }: { data: ProjectPageData }) {
  const known = data.series.filter((p) => p.stars !== null) as { date: string; stars: number }[];
  if (known.length < 2) {
    return (
      <p className="text-sm text-[var(--muted)] py-8 text-center">
        Collecting star history — chart available after a few daily snapshots.
      </p>
    );
  }
  const W = 720;
  const H = 240;
  const PAD_X = 44;
  const PAD_Y = 20;
  const min = known[0].stars;
  const max = known[known.length - 1].stars;
  const span = Math.max(max - min, 1);
  const px = (i: number) => PAD_X + (i / (known.length - 1)) * (W - PAD_X * 2);
  const py = (v: number) => H - PAD_Y - ((v - min) / span) * (H - PAD_Y * 2);
  const points = known.map((p, i) => `${px(i).toFixed(1)},${py(p.stars).toFixed(1)}`).join(' ');
  const area = `M ${px(0)},${py(known[0].stars)} L ${points
    .split(' ')
    .join(' L ')} L ${px(known.length - 1)},${H - PAD_Y} L ${px(0)},${H - PAD_Y} Z`;
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Star history of ${data.info.fullName} from ${known[0].date} to ${known[known.length - 1].date}`}
    >
      <defs>
        <linearGradient id="star-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_Y + f * (H - PAD_Y * 2)}
            y2={PAD_Y + f * (H - PAD_Y * 2)}
            stroke="var(--muted-border)"
            strokeDasharray="3 5"
          />
          <text
            x={PAD_X - 6}
            y={PAD_Y + f * (H - PAD_Y * 2) + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--muted)"
          >
            {fmt(Math.round(max - f * span))}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#star-area)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text x={PAD_X} y={H - 4} fontSize="10" fill="var(--muted)">
        {known[0].date}
      </text>
      <text x={W - PAD_X} y={H - 4} textAnchor="end" fontSize="10" fill="var(--muted)">
        {known[known.length - 1].date}
      </text>
    </svg>
  );
}

interface Props {
  params: Promise<{ org: string; repo: string }>;
}

export async function generateStaticParams() {
  return [...allProjects().keys()].map((fullName) => {
    const [org, repo] = fullName.split('/');
    return { org, repo };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { org, repo } = await params;
  const data = getProjectPageData(`${org}/${repo}`);
  if (!data) return { title: 'Project Not Found - Cataito' };
  const { info, latest, d7 } = data;
  const title = `${info.name} — GitHub AI Project Ranking #${info.bestRank} | Cataito`;
  const description = `${info.name} (${info.fullName}) has ${latest.toLocaleString('en-US')} GitHub stars as of ${data.dataDate}${
    d7 !== null ? `, +${d7.toLocaleString('en-US')} stars in the last 7 days` : ''
  }. Ranked #${info.bestRank} across Cataito AI project boards. Star history chart and growth stats.`;
  return {
    title,
    description,
    // 抓取预算减法（2026-09-24 GSC 分析）：228 个项目卡片页近 90 天 100% 零展示，
    // noindex 但 follow——不浪费 Google 配额，同时保留对站内链的权重传递。
    robots: { index: false, follow: true },
    alternates: generateAlternates(`/project/${info.fullName}`, 'en'),
  };
}

export default async function ProjectPage({ params }: Props) {
  const { org, repo } = await params;
  const data = getProjectPageData(`${org}/${repo}`);
  if (!data) notFound();
  const { info, fullName, latest, d7, d30, d7Pct, dataDate } = data;
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
      {/* Header card */}
      <section className="bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] p-8">
        <div className="flex items-start gap-5">
          {info.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.avatar}
              alt={info.name}
              width={64}
              height={64}
              className="rounded-xl bg-[var(--muted-bg)]"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--muted)] mb-1">
              GitHub AI Project Ranking · data of {dataDate}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {info.name}
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              {fullName} · {info.language || 'Multi-language'} · ★ {fmt(latest)} · Forks{' '}
              {fmt(info.forks)}
            </p>
          </div>
          <a
            href={info.url}
            target="_blank"
            rel="noopener"
            className="shrink-0 rounded-full border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted-bg)] transition-colors"
          >
            GitHub ↗
          </a>
        </div>
        {info.description && (
          <p className="mt-4 text-[var(--muted)] leading-relaxed">{info.description}</p>
        )}
        {info.topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {info.topics.map((t) => (
              <span
                key={t}
                className="rounded-full bg-[var(--muted-bg)] px-3 py-1 text-xs text-[var(--muted)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 可引用 TL;DR（P3.4 同款思路：语义稳定、带数字带日期） */}
      <section
        aria-label="Quick facts"
        className="rounded-2xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-6"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
          Quick facts
        </h2>
        <p className="text-sm leading-relaxed text-[var(--foreground)]">
          <span className="font-semibold">{info.name}</span> ({fullName}) is ranked #
          {info.bestRank} on Cataito&apos;s GitHub AI project ranking with <strong>{fmt(latest)}</strong>{' '}
          stars as of <strong>{dataDate}</strong>
          {d7 !== null && (
            <>
              , up <strong>{fmt(Math.abs(d7))}</strong> stars in the last 7 days
              {d7Pct !== null ? ` (${d7Pct > 0 ? '+' : ''}${d7Pct}%)` : ''}
            </>
          )}
          . Rankings are computed daily from GitHub data and long-term star snapshots.
        </p>
      </section>

      {/* Rankings placement */}
      <section>
        <h2 className="text-lg font-bold mb-3">Ranking placement</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {info.boards.map((b) => (
            <Link
              key={b.key}
              href="/en/ranking"
              className="rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4 hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all"
            >
              <div className="text-xs text-[var(--muted)]">{b.nameEn}</div>
              <div className="text-xl font-bold text-[var(--primary)]">#{b.rank}</div>
              {b.change != null && b.change !== 0 && (
                <div className={`text-xs ${b.change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {b.change > 0 ? `▲ +${b.change}` : `▼ ${b.change}`} vs last period
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Star history chart */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Star history</h2>
          <span className="text-xs text-[var(--muted)]">
            {d30 !== null && `30-day growth: +${fmt(d30)} stars`}
          </span>
        </div>
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-6">
          <StarHistoryChart data={data} />
        </div>
      </section>

      {/* P4.6 嵌入徽章：反向链接引擎 */}
      <section>
        <h2 className="text-lg font-bold mb-3">Embed this ranking badge</h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          Put a live ranking badge in your README or docs — it shows your current Cataito rank and
          stars, regenerated with every daily build.
        </p>
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-6 space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://cataito.com/embed/project/${fullName}.svg`}
            alt={`${info.name} ranking badge on Cataito`}
            width={260}
            height={84}
          />
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">HTML</p>
            <pre className="text-xs bg-[var(--code-bg)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
{`<a href="https://cataito.com/project/${fullName}"><img src="https://cataito.com/embed/project/${fullName}.svg" alt="${info.name} ranking on Cataito" width="260" height="84"></Link>`}
            </pre>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">Markdown</p>
            <pre className="text-xs bg-[var(--code-bg)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
{`[![${info.name} ranking on Cataito](https://cataito.com/embed/project/${fullName}.svg)](https://cataito.com/project/${fullName})`}
            </pre>
          </div>
        </div>
      </section>

      {/* Methodology note */}
      <p className="text-xs text-[var(--muted)] leading-relaxed">
        Rankings and star history are computed daily from the public GitHub API by Cataito&apos;s
        own scoring pipeline. Growth figures are derived from daily snapshots — the archive does not
        exist anywhere else, which is why this page can show trends GitHub Trending cannot. Last
        dataset update: {rankingUpdatedAt()}.
      </p>
    </main>
  );
}
