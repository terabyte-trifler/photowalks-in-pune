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
          /* Avatars come from Google and, later, Supabase Storage. Both are
             out of our hands, so a broken one must not break the header. */
          unoptimized={!src.startsWith('/')}
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
