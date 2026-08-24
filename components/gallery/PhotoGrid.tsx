'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { type Photo } from '@/data/photos';
import { cn } from '@/lib/utils';
import { useGallery } from './GalleryProvider';

/**
 * Asymmetric editorial placement on a six-column grid, repeating every six
 * frames so the rhythm holds however many photographs exist. Two columns on
 * mobile, where an asymmetric grid would just look broken.
 */
const PLACEMENT = [
  'md:col-span-2',
  'md:col-span-3 md:mt-[clamp(2rem,6vw,5rem)]',
  'md:col-span-1 md:self-end',
  'md:col-span-3',
  'md:col-span-2 md:mt-[clamp(1.5rem,4vw,3.5rem)]',
  'md:col-span-1 md:self-start',
];

const ASPECT: Record<Photo['aspect'], string> = {
  portrait: 'aspect-[4/5]',
  landscape: 'aspect-[3/2]',
  square: 'aspect-square',
};

const DIMENSIONS: Record<Photo['aspect'], { width: number; height: number }> = {
  portrait: { width: 1200, height: 1500 },
  landscape: { width: 1400, height: 933 },
  square: { width: 1200, height: 1200 },
};

export function PhotoGrid() {
  const { visible, shown, showMore, openLightbox, creditFor } = useGallery();
  const reduced = useReducedMotion();

  /* The lightbox still steps through the whole filtered set, not just what has
     been revealed — once a photograph is open, stopping the arrow keys at an
     invisible boundary would be the strange behaviour, not the useful one.
     Slicing from the front keeps the indices identical either way. */
  const drawn = visible.slice(0, shown);
  const remaining = visible.length - drawn.length;

  if (visible.length === 0) {
    return (
      <div className="py-[clamp(3rem,8vw,6rem)] text-center">
        <p className="font-display text-lead text-foreground-soft">Nothing filed under this yet.</p>
        <p className="meta mt-3">Come on a walk and it will be.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-[clamp(0.75rem,2vw,2rem)] gap-y-[clamp(1rem,2.5vw,2.5rem)] md:grid-cols-6">
      <AnimatePresence mode="popLayout">
        {drawn.map((photo, index) => {
          const credit = creditFor(photo.photographerId);
          const dims = DIMENSIONS[photo.aspect];

          return (
            <motion.div
              key={photo.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: reduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={cn('col-span-1', PLACEMENT[index % PLACEMENT.length])}
            >
              <button
                type="button"
                onClick={() => openLightbox(index)}
                aria-haspopup="dialog"
                aria-label={`Open photograph made in ${photo.location}`}
                className="group block w-full text-left"
              >
                <span className={cn('block overflow-hidden bg-subtle', ASPECT[photo.aspect])}>
                  <Image
                    src={photo.image}
                    alt={photo.alt}
                    width={dims.width}
                    height={dims.height}
                    quality={72}
                    loading="lazy"
                    sizes="(min-width: 768px) 40vw, 50vw"
                    className="h-full w-full object-cover transition-transform duration-1000 ease-editorial group-hover:scale-[1.035]"
                  />
                </span>

                {/* Rebate strip — metadata printed on the film edge. */}
                <span className="mt-2.5 flex justify-between gap-4 border-t border-border pt-2.5 font-mono text-micro uppercase tracking-[0.16em] text-muted transition-colors group-hover:text-foreground-soft">
                  <span>{credit ?? 'Uncredited'}</span>
                  <span>{photo.location}</span>
                </span>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      </div>

      {remaining > 0 && (
        <div className="mt-[clamp(2.5rem,5vw,4rem)] flex items-center gap-6 border-t border-border pt-[clamp(1.5rem,3vw,2rem)]">
          <button type="button" onClick={showMore} className="cta">
            Show more <span aria-hidden="true">↓</span>
          </button>
          {/* The count is the useful half: it says how much further this goes
              before somebody commits to scrolling. */}
          <span className="meta">
            {drawn.length} of {visible.length}
          </span>
        </div>
      )}
    </>
  );
}
