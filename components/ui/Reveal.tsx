import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The only scroll animation on the site: content settles up by 18px, once.
 *
 * Deliberately not a client component and deliberately not framer-motion. The
 * whole effect is three CSS rules (see `.reveal` in app/globals.css), which
 * means this wrapper ships no JavaScript, adds no hydration boundary, and —
 * the part that matters — cannot leave anything invisible. The motion version
 * held every section at `opacity: 0` until JavaScript raised it, and when the
 * homepage briefly served a CSP that blocked its own scripts, none of it ever
 * came back.
 *
 * `prefers-reduced-motion` is handled in the stylesheet rather than here,
 * because a media query does not need a component to re-render to notice.
 */
export function Reveal({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn('reveal', className)} style={style}>
      {children}
    </div>
  );
}
