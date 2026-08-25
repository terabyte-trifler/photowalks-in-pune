import Image from 'next/image';
import { PhotoDeleteButton } from '@/components/photographers/PhotoDeleteButton';
import Link from 'next/link';

import { photoUrl } from '@/lib/directory';
import { walkById } from '@/data/events';
import { cn } from '@/lib/utils';
import type { PhotoRecord } from '@/lib/supabase/types';
import { shortDate } from '@/lib/utils';

/**
 * The same asymmetric six-column rhythm the archive uses (see
 * components/gallery/PhotoGrid.tsx), repeating every six frames so the
 * placement holds however many photographs exist. Two columns on mobile,
 * where an asymmetric grid just looks broken.
 *
 * This one is a server component: the archive's grid is client-side because
 * it animates between filters, and a profile has nothing to filter.
 */
const PLACEMENT = [
  'md:col-span-3',
  'md:col-span-3 md:mt-[clamp(2rem,6vw,5rem)]',
  'md:col-span-2 md:self-end',
  'md:col-span-4',
  'md:col-span-2 md:mt-[clamp(1.5rem,4vw,3.5rem)]',
  'md:col-span-4 md:self-start',
];

/** Falls back to 4:5 — the portrait most phones and most 35mm frames produce. */
function aspectFor(photo: PhotoRecord): string {
  if (!photo.width || !photo.height) return 'aspect-[4/5]';
  const ratio = photo.width / photo.height;
  if (ratio > 1.2) return 'aspect-[3/2]';
  if (ratio < 0.85) return 'aspect-[4/5]';
  return 'aspect-square';
}

export function WorkGrid({
  photos,
  priorityCount = 2,
  className,
  editable = false,
}: {
  photos: PhotoRecord[];
  /** How many load eagerly. The rest wait until they are scrolled towards. */
  priorityCount?: number;
  className?: string;
  /** Owner's own archive: each frame gets a ✕ on hover. Never for visitors. */
  editable?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-[clamp(0.75rem,2vw,2rem)] gap-y-[clamp(1rem,2.5vw,2.5rem)] md:grid-cols-6',
        className,
      )}
    >
      {photos.map((photo, index) => (
        <figure key={photo.id} className={cn('group/frame', PLACEMENT[index % PLACEMENT.length])}>
          <div className={cn('relative overflow-hidden bg-subtle', aspectFor(photo))}>
            {editable && <PhotoDeleteButton photo={photo} />}
            <Image
              src={photoUrl(photo)}
              alt={photo.caption ?? photo.location ?? 'Photograph'}
              fill
              sizes="(min-width: 768px) 45vw, 50vw"
              priority={index < priorityCount}
              loading={index < priorityCount ? undefined : 'lazy'}
              className="object-cover"
            />
          </div>

          {/* The rebate strip: caption, then the walk it came from, then where
              and when — each only if known. The walk is a link, because it is
              the one line here that goes somewhere: every other frame from
              that morning. */}
          {(photo.caption || photo.location || photo.taken_at || photo.event_id) && (
            <figcaption className="mt-2.5">
              {photo.caption && (
                <p className="text-[0.875rem] leading-snug text-foreground-soft">{photo.caption}</p>
              )}
              {(() => {
                /* Undefined when the walk has been removed from the file since.
                   The photograph keeps its caption and date and simply stops
                   linking anywhere, rather than pointing at a 404. */
                const walk = walkById(photo.event_id);
                return walk ? (
                  <p className="meta mt-1">
                    <Link
                      href={`/walks/${walk.slug}`}
                      className="text-foreground-soft transition-colors hover:text-accent"
                    >
                      {walk.title}
                    </Link>
                  </p>
                ) : null;
              })()}
              {(photo.location || photo.taken_at) && (
                <p className="meta mt-1">
                  {[photo.location, photo.taken_at ? frameDate(photo.taken_at) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

/* Was a second copy of the date formatting, with the same timezone bug the
   walk dates had: parsed at IST, then read back with local getters, so a
   photograph taken on the 23rd was captioned the 22nd anywhere but India. */
const frameDate = shortDate;
