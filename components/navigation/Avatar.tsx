import { Picture } from '@/components/media/Picture';
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
        <Picture
          src={src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
          /* Picture decides how this is served, per src — see that file.
             A Google avatar still goes through the optimiser; an upload with a
             variant ladder is served straight from Storage at the rung this
             size actually needs.

             The note that used to sit here said unoptimised avatars were
             "re-downloaded from Supabase on every view", because Storage sends
             `cache-control: no-cache`. That reads the header as stronger than
             it is: no-cache means revalidate before use, not do not store.
             Measured against a real avatar in the bucket —

               GET                     -> 200, 56,444 bytes, etag present
               GET If-None-Match: <it> -> 304, 0 bytes

             — so a repeat view costs one round trip and no image bytes. Which
             is the same shape as the optimiser, whose own output is served
             `max-age=0, must-revalidate` (measured in next.config.ts). Both
             revalidate every view; only one of them bills a transformation to
             do it. What the ladder adds is the part the optimiser was really
             providing: a file at the size it is drawn, rather than a 56 kB
             avatar squeezed into 72 pixels. */
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
