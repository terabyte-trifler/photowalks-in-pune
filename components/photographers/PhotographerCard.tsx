import Image from 'next/image';
import Link from 'next/link';
import { Avatar } from '@/components/navigation/Avatar';
import { StyleLine } from '@/components/photographers/StyleTags';
import { photoUrl } from '@/lib/directory';
import type { PhotoRecord, PhotographerCard as Card } from '@/lib/supabase/types';
import { FOUNDER_USERNAME } from '@/lib/directory';

/**
 * A photographer, filed like a contact sheet entry rather than a business
 * card: their frames run across the top at full width, and the person's own
 * details sit underneath in the rebate strip, the way a caption sits under a
 * photograph everywhere else on this site.
 *
 * When somebody has not uploaded anything the strip collapses rather than
 * showing grey boxes — an empty frame is more honest than a placeholder.
 */
export function PhotographerCard({
  photographer,
  photos,
  priority = false,
}: {
  photographer: Card;
  photos: PhotoRecord[];
  priority?: boolean;
}) {
  const counts = [
    photographer.walks_attended > 0
      ? `${photographer.walks_attended} ${photographer.walks_attended === 1 ? 'walk' : 'walks'}`
      : null,
    photographer.photo_count > 0
      ? `${photographer.photo_count} ${photographer.photo_count === 1 ? 'photograph' : 'photographs'}`
      : null,
  ].filter(Boolean);

  return (
    <article className="group border-t border-foreground">
      <Link
        href={`/photographers/${photographer.username}`}
        className="block transition-[background-color,padding] duration-500 hover:bg-subtle hover:px-4"
      >
        {photos.length > 0 && (
          /* Columns follow the number of frames, and the band keeps one height
             whatever that number is — three equal cells with only one photo in
             them leaves two grey holes where a photograph should be. */
          <div className="pt-[clamp(1rem,2vw,1.5rem)]">
            <div
              className="grid gap-px overflow-hidden bg-border"
              style={{ gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }}
            >
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative h-[clamp(96px,15vw,168px)] overflow-hidden bg-subtle"
                >
                  <Image
                    src={photoUrl(photo)}
                    alt={photo.caption ?? ''}
                    fill
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 30vw, 45vw"
                    loading={priority ? undefined : 'lazy'}
                    priority={priority}
                    className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-4 py-[clamp(1.1rem,2.2vw,1.5rem)]">
          <Avatar src={photographer.avatar_url} name={photographer.full_name} size={46} />

          <div className="min-w-0 flex-1">
            <h3 className="display flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[clamp(1.1rem,2.2vw,1.45rem)] leading-tight transition-colors duration-300 group-hover:text-accent">
              {photographer.full_name}
              {photographer.username === FOUNDER_USERNAME && (
                /* Outlined in the accent rather than filled: this is a label,
                   not a call to action, and a solid badge beside a name would
                   pull harder than the name itself. */
                <span className="border border-accent px-2 py-0.5 font-mono text-micro uppercase tracking-[0.18em] text-accent">
                  Founder
                </span>
              )}
            </h3>
            <p className="meta mt-1 normal-case tracking-[0.1em]">
              @{photographer.username}
              {photographer.city ? ` · ${photographer.city}` : ''}
            </p>

            <StyleLine styles={photographer.photography_interests} className="mt-2.5" />

            {counts.length > 0 && (
              <p className="meta mt-2 text-foreground-soft">{counts.join(' · ')}</p>
            )}
          </div>

          <span className="meta hidden flex-none items-center gap-2 self-center text-foreground sm:inline-flex">
            View <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
