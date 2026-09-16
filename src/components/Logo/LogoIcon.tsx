'use client';

import { CSSProperties } from 'react';
import { useTheme } from '@/components/ThemeProvider';

export interface LogoIconProps {
  /** Pixel size of the icon (square). Default 40. */
  size?: number;
  /** Optional className for the wrapping <img> */
  className?: string;
  /** Optional inline style */
  style?: CSSProperties;
  /** Decorative aria label; defaults to "Cataito" */
  ariaLabel?: string;
  /** If true, disables hover animation */
  static?: boolean;
  /**
   * Color treatment — maps directly to which icon variant is used:
   *   - "gradient" → dark A (for light backgrounds; navbar default on light theme)
   *   - "vivid"    → light A (for colorful/gradient backgrounds; matches old brand mockup)
   *   - "white"    → light A (forced, for colored backgrounds like hero/footer)
   *   - "auto"     → follows current theme (dark A on light theme, light A on dark theme)
   *
   * All icons are pre-rendered transparent PNGs at multiple sizes in
   * `_internal/brand-icon/` — no SVG parse cost, theme swap is instant
   * via `<img>` with srcset.
   */
  tone?: 'gradient' | 'vivid' | 'white' | 'auto';
}

const VARIANT_MAP: Record<'gradient' | 'vivid' | 'white', 'light' | 'dark'> = {
  gradient: 'light', // 深色 A → 亮色背景
  vivid: 'dark',     // 浅色 A → 彩色/渐变背景
  white: 'dark',     // 浅色 A → 强制白色
};

/** Srcset string for a variant; picks best PNG from 96/128/256/512px. */
function buildSrcset(variant: 'light' | 'dark'): string {
  return [96, 128, 256, 512]
    .map(s => `/brand-icon/brand-icon-${variant}-${s}.png ${s}w`)
    .join(', ');
}

/**
 * Brand icon: the letter "A" — rendered as a static PNG with theme-aware
 * variants (light A / dark A). The A-light variant is the dark-colored A
 * for light backgrounds; A-black is the light-colored A for dark or
 * colorful backgrounds.
 *
 * Use tone="auto" in components that need to follow dark mode
 * (e.g. LogoCompact in navbar). Use tone="white" or tone="vivid" on
 * colored/gradient backgrounds (hero, footer).
 */
export default function LogoIcon({
  size = 40,
  className,
  style,
  ariaLabel = 'Cataito',
  static: isStatic = false,
  tone = 'gradient',
}: LogoIconProps) {
  const { theme } = useTheme();
  const variant = tone === 'auto'
    ? (theme === 'dark' ? 'dark' : 'light')
    : VARIANT_MAP[tone];
  // Choose the best-fit PNG based on rendered size
  const candidates = [96, 128, 256, 512];
  const srcSize = candidates.find(s => s >= size) ?? 512;
  const src = `/brand-icon/brand-icon-${variant}-${srcSize}.png`;

  return (
    <img
      src={src}
      srcSet={buildSrcset(variant)}
      sizes={`${size}px`}
      width={size}
      height={size}
      className={`select-none ${className ?? ''}`}
      style={style}
      role="img"
      aria-label={ariaLabel}
      alt=""
    />
  );
}
