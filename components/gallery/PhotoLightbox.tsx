'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { Dialog, DialogClose } from '@/components/ui/Dialog';
import { getPhotographerName } from '@/data/photos';
import { padIndex } from '@/lib/utils';
import { useGallery } from './GalleryProvider';

export function PhotoLightbox() {
  const { visible, lightboxIndex, closeLightbox, step } = useGallery();
  const open = lightboxIndex !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, step]);

  const photo = lightboxIndex === null ? null : visible[lightboxIndex];

  return (
    <Dialog open={open} onClose={closeLightbox} label="Photograph viewer" variant="full">
      {photo && lightboxIndex !== null ? (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-gutter py-4 text-[rgba(245,241,234,0.75)]">
            <span className="font-mono text-meta uppercase">
              Frame {padIndex(lightboxIndex + 1)} / {padIndex(visible.length)}
            </span>
            <DialogClose onClose={closeLightbox} />
          </div>

          <div className="grid min-h-0 flex-1 place-items-center p-[clamp(1rem,3vw,2.5rem)]">
            <Image
              src={photo.image}
              alt={photo.alt}
              width={1600}
              height={1600}
              quality={82}
              className="h-auto max-h-full w-auto max-w-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 px-gutter py-4 text-[rgba(245,241,234,0.75)]">
            <span className="font-mono text-micro uppercase">
              {getPhotographerName(photo.photographerId) ?? 'Uncredited'} · {photo.location}
              <br />
              {photo.event}
            </span>

            <span className="flex gap-6">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={visible.length < 2}
                className="font-mono text-meta uppercase transition-colors hover:text-accent disabled:cursor-default disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={visible.length < 2}
                className="font-mono text-meta uppercase transition-colors hover:text-accent disabled:cursor-default disabled:opacity-30"
              >
                Next →
              </button>
            </span>
          </div>
        </>
      ) : (
        <div />
      )}
    </Dialog>
  );
}
