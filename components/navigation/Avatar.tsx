import Image from 'next/image';
import { cn, initials } from '@/lib/utils';

/**
 * A photograph if there is one, otherwise a monogram in the same circle the
 * brand mark uses — hairline ring, warm paper inside. Never a stock silhouette:
 * an empty frame is more honest than a fake face on a photography site.
 */
export function Avatar({
  src,
  name,
  size = 30,
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative grid flex-none place-items-center overflow-hidden rounded-full border border-foreground bg-subtle',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
          /* Optimised like everything else. This used to be `unoptimized`,
             from when avatars only came from Google and the host was not in
             next.config. Both sources are configured now, and the flag was
             costing real bandwidth: Supabase Storage serves avatars with
             `cache-control: no-cache`, so every unoptimised avatar was
             re-downloaded from Supabase on every view — one per member, on a
             directory page that lists all of them. Through the optimiser they
             are fetched once, cached at the edge for a year, and resized from
             56 kB to a few kB at the size they are actually drawn. */
        />
      ) : (
        <span
          className="font-mono uppercase leading-none text-foreground-soft"
          style={{ fontSize: Math.max(9, Math.round(size * 0.34)) }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
