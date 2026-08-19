import Link from 'next/link';
import { styleLabel } from '@/data/photography';
import { cn } from '@/lib/utils';

/**
 * What somebody shoots, as hairline tags. Same box as the subject chips in
 * Settings — bordered, mono caps, no radius — so the vocabulary reads as one
 * thing across the site.
 *
 * On a profile each tag is a link into the directory filtered by that style,
 * which is the cheapest possible way to turn a profile into a way of finding
 * more people.
 */
export function StyleTags({
  styles,
  linked = false,
  className,
  limit,
}: {
  styles: string[] | null;
  linked?: boolean;
  className?: string;
  limit?: number;
}) {
  if (!styles || styles.length === 0) return null;

  const shown = limit ? styles.slice(0, limit) : styles;
  const hidden = styles.length - shown.length;

  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {shown.map((style) => (
        <li key={style}>
          {linked ? (
            <Link
              href={`/photographers?style=${encodeURIComponent(style)}`}
              className="inline-block border border-border-strong px-3 py-1.5 font-mono text-micro uppercase text-foreground-soft transition-colors hover:border-foreground hover:text-foreground"
            >
              {styleLabel(style)}
            </Link>
          ) : (
            <span className="inline-block border border-border-strong px-3 py-1.5 font-mono text-micro uppercase text-foreground-soft">
              {styleLabel(style)}
            </span>
          )}
        </li>
      ))}
      {hidden > 0 && (
        <li>
          <span className="inline-block px-1 py-1.5 font-mono text-micro uppercase text-muted">
            +{hidden}
          </span>
        </li>
      )}
    </ul>
  );
}

/** The same list set as a single line of metadata: Street · Documentary · Film */
export function StyleLine({ styles, className }: { styles: string[] | null; className?: string }) {
  if (!styles || styles.length === 0) return null;
  return (
    <p className={cn('meta', className)}>{styles.map(styleLabel).join(' · ')}</p>
  );
}
