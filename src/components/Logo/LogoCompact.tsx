'use client';

import Link from 'next/link';
import { CSSProperties } from 'react';
import LogoIcon from './LogoIcon';
import LogoWordmark from './LogoWordmark';
import { WORDMARK_DOTS_DEFAULT } from '@/lib/brandColors';
import { useTheme } from '@/components/ThemeProvider';

export interface LogoCompactProps {
  /** Total height of the logo. Icon is sized to height, text scales accordingly. Default 36. */
  height?: number;
  /** Optional className for the wrapping container */
  className?: string;
  /** Optional inline style */
  style?: CSSProperties;
  /** Optional href, defaults to "/" */
  href?: string;
  /** When false, hides the CATAITO text (icon-only mode). */
  showText?: boolean;
  /** If true, the whole logo is hidden on small screens (used in stacked layouts). */
}

/**
 * Compact logo: [CA icon] CATAITO  — used in desktop navbar and inner-page headers.
 * Theme-aware: icon tone switches between gradient (light) and vivid (dark).
 */
export default function LogoCompact({
  height = 36,
  className,
  style,
  href = '/',
  showText = true,
}: LogoCompactProps) {
  const { theme } = useTheme();
  const iconSize = Math.round(height * 1.05);
  const wordHeight = Math.round(height * 0.6);

  return (
    <Link
      href={href}
      aria-label="Cataito — Home"
      className={`group inline-flex items-center gap-2 shrink-0 ${className ?? ''}`}
      style={style}
    >
      <LogoIcon size={iconSize} ariaLabel="Cataito" tone="auto" />
      {showText && (
        <LogoWordmark
          height={wordHeight}
          color="var(--foreground)"
          dotColors={WORDMARK_DOTS_DEFAULT}
          className="transition-colors"
        />
      )}
    </Link>
  );
}
