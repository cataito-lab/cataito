'use client';

import { useTranslations } from 'next-intl';
import { CSSProperties } from 'react';
import LogoIcon from './LogoIcon';
import LogoWordmark from './LogoWordmark';
import { useTheme } from '@/components/ThemeProvider';
import {
  BRAND_WHITE,
  BRAND_WHITE_85,
  WORDMARK_DOTS_VIVID,
  WORDMARK_DOTS_DEFAULT,
  TAGLINE_GRADIENT_VIVID,
  TAGLINE_GRADIENT_DEFAULT,
} from '@/lib/brandColors';

export interface LogoFullProps {
  /** Total width budget in pixels; the logo scales to fit. Default 360. */
  maxWidth?: number;
  /** Optional className for the wrapping container */
  className?: string;
  /** Optional inline style */
  style?: CSSProperties;
  /** Arrangement: "stacked" (icon over wordmark, hero) or "horizontal" (icon left, footer). Default "stacked". */
  layout?: 'stacked' | 'horizontal';
  /** Whether to render the localized tagline. Default true. */
  showTagline?: boolean;
  /** Whether to render the A icon. Default true. */
  showIcon?: boolean;
  /** Use the richer cyan→blue→purple palette from the brand mockup (icon + tagline). */
  vivid?: boolean;
  /** Optional theme override: "auto" follows dark mode, "light" forces white on colored backgrounds. */
  variant?: 'light' | 'dark' | 'auto';
  /** Override icon tone directly: "gradient" (dark A, light bg) / "vivid"|"white" (light A, dark/colored bg) / "auto" (follow theme). */
  iconTone?: 'gradient' | 'vivid' | 'white' | 'auto';
  /** Optional horizontal gradient stops for the wordmark letterforms. */
  wordmarkGradient?: { offset: string; color: string }[];
}

/**
 * Full logo: CA icon + CATAITO wordmark + tagline.
 * Tagline is localized via next-intl (key: brand.tagline).
 * Used on the homepage hero and the footer.
 */
export default function LogoFull({
  maxWidth = 360,
  className,
  style,
  layout = 'stacked',
  showTagline = true,
  showIcon = true,
  vivid = false,
  variant = 'auto',
  iconTone: iconToneProp,
  wordmarkGradient,
}: LogoFullProps) {
  const t = useTranslations('brand');
  const tagline = t('tagline');
  const { theme } = useTheme();
  const isLight = variant === 'light';

  // iconTone 优先级：调用方显式传 iconTone > variant/vivid 推导
  // - "auto" = 跟随 theme（亮底黑 A，暗底白 A）
  // - "gradient" = 深色 A（亮底用）
  // - "vivid" / "white" = 浅色 A（彩色/渐变底）
  const iconTone = iconToneProp
    ?? (isLight ? 'white' : vivid ? 'vivid' : 'gradient');
  const resolvedTone = iconTone === 'auto'
    ? (theme === 'dark' ? 'vivid' : 'gradient')
    : iconTone;

  const wordColor = isLight ? BRAND_WHITE : 'var(--foreground)';
  // Accent dots on the two "A"s: monochrome (white) on colored backgrounds, brand accents otherwise.
  const accentDots: [string, string] = vivid ? WORDMARK_DOTS_VIVID : WORDMARK_DOTS_DEFAULT;
  const dotColors = isLight ? undefined : accentDots;
  const taglineGradient = vivid ? TAGLINE_GRADIENT_VIVID : TAGLINE_GRADIENT_DEFAULT;
  // Tagline: solid white on colored backgrounds, brand gradient text otherwise.
  const taglineStyle: CSSProperties = isLight
    ? { color: BRAND_WHITE_85 }
    : {
        background: taglineGradient,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      };

  // Horizontal layout: icon on the left, wordmark + tagline stacked to the right.
  if (layout === 'horizontal') {
    return (
      <div
        className={`inline-flex flex-row items-center gap-3 ${className ?? ''}`}
        style={{ maxWidth, ...style }}
      >
        {showIcon && <LogoIcon size={Math.round(maxWidth * 0.2)} ariaLabel="Cataito" tone={resolvedTone} />}
        <div className="flex flex-col items-start justify-center">
          <LogoWordmark
            height={Math.round(maxWidth * 0.135)}
            color={wordColor}
            dotColors={dotColors}
            gradient={wordmarkGradient}
            gradientId={wordmarkGradient ? `wordmark-grad-h-${maxWidth}` : undefined}
          />
          {showTagline && tagline && (
            <p
              className="mt-1.5 font-semibold tracking-[0.16em] uppercase leading-none"
              style={{ fontSize: Math.max(9, Math.round(maxWidth * 0.037)), ...taglineStyle }}
            >
              {tagline}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Stacked layout: icon on top, then wordmark, then tagline.
  return (
    <div
      className={`inline-flex flex-col items-center text-center ${className ?? ''}`}
      style={{ maxWidth, ...style }}
    >
      {showIcon && (
        <LogoIcon
          size={Math.round(maxWidth * 0.28)}
          className="mb-3"
          ariaLabel="Cataito"
          tone={resolvedTone}
        />
      )}
      <LogoWordmark
        height={Math.round(maxWidth * 0.17)}
        color={wordColor}
        dotColors={dotColors}
        gradient={wordmarkGradient}
        gradientId={wordmarkGradient ? `wordmark-grad-v-${maxWidth}` : undefined}
      />
      {showTagline && tagline && (
        <p
          className="mt-3 font-semibold tracking-[0.22em] uppercase"
          style={{ fontSize: Math.round(maxWidth * 0.042), ...taglineStyle }}
        >
          {tagline}
        </p>
      )}
    </div>
  );
}
