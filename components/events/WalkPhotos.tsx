'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import { Avatar } from '@/components/navigation/Avatar';
import { LightboxFrame } from '@/components/gallery/LightboxFrame';
import { Reveal } from '@/components/ui/Reveal';

export interface WalkPhoto {
  id: string;
  src: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  photographerName: string | null;
  photographerUsername: string | null;
  photographerAvatar: string | null;
}

/**
 * A walk's photographs, and the same viewer the archive uses — full screen,
 * arrow keys, prev and next. Reusing LightboxFrame rather than writing a
 * second one is the point: somebody who has opened a frame on /explore should
 * not have to learn a different set of controls here.
 *
 * A client island because the grid needs to be clickable. The page around it
 * stays a server component, and the photographs arrive already resolved — this
 * does no fetching of its own.
 */
export function WalkPhotos({ photos, walkTitle }: { photos: WalkPhoto[]; walkTitle: string }) {
  const [index, setIndex] = useState<number | null>(null);

  /* Wraps, so Next from the last frame is the first one rather than nothing —
     the same behaviour the archive's viewer has. */
  const step = useCallback(
    (delta: number) => {
      setIndex((current) => {
        if (current === null || photos.length === 0) return current;
        return (current + delta + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  const open = index === null ? null : photos[index];

  return (
    <>
      <Reveal className="mt-[clamp(1.75rem,3vw,2.5rem)] grid grid-cols-2 gap-[clamp(0.75rem,1.6vw,1.25rem)] md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, position) => (
          <figure key={photo.id} className="group">
            <button
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`View ${photo.caption ?? `a photograph from ${walkTitle}`} full screen`}
              className="block w-full overflow-hidden bg-subtle"
            >
              <Image
                src={photo.src}
                alt={photo.caption ?? `A photograph from ${walkTitle}`}
                width={photo.width ?? 1200}
                height={photo.height ?? 800}
                quality={72}
                loading="lazy"
                sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 50vw"
                className="aspect-square w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
              />
            </button>

            <figcaption className="mt-2.5">
              {photo.caption && (
                <p className="text-[0.875rem] leading-snug text-foreground-soft">
                  {photo.caption}
                </p>
              )}
              {/* The credit is the point of showing the work at all. Outside
                  the button, because a link inside a button is invalid. */}
              {photo.photographerUsername && (
                <Link
                  href={`/photographers/${photo.photographerUsername}`}
                  className="mt-1 inline-flex items-center gap-2 text-[0.8125rem] text-muted transition-colors hover:text-accent"
                >
                  <Avatar
                    src={photo.photographerAvatar}
                    name={photo.photographerName ?? photo.photographerUsername}
                    size={20}
                  />
                  {photo.photographerName ?? photo.photographerUsername}
                </Link>
              )}
            </figcaption>
          </figure>
        ))}
      </Reveal>

      <LightboxFrame
        open={index !== null}
        index={index}
        count={photos.length}
        src={open?.src ?? null}
        alt={open?.caption ?? `A photograph from ${walkTitle}`}
        footer={
          open ? (
            <>
              {open.photographerName ?? open.photographerUsername ?? 'Uncredited'}
              <br />
              {open.caption ?? walkTitle}
            </>
          ) : null
        }
        onClose={() => setIndex(null)}
        onStep={step}
      />
    </>
  );
}
