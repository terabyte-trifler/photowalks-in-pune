'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Dialog, DialogClose } from '@/components/ui/Dialog';
import { featuredStory } from '@/data/photos';
import { useGallery } from '@/components/gallery/GalleryProvider';

/**
 * The story opens over the page rather than on a route, because /stories does
 * not exist yet and the MVP is one page.
 */
export function StoryDialog() {
  /* Same source as the grid and the lightbox, so one member cannot appear
     under two different names on one page. */
  const { creditFor } = useGallery();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="cta" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        View the story <span aria-hidden="true">→</span>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        label={featuredStory.title}
        className="max-w-[760px]"
      >
        <div className="mb-7 flex items-start justify-between gap-4 border-b border-border pb-4">
          <span className="meta">{featuredStory.label}</span>
          <DialogClose onClose={() => setOpen(false)} />
        </div>

        <h2 className="display text-display-lg">{featuredStory.title}</h2>
        <p className="my-5 font-display text-lead text-foreground-soft">
          {featuredStory.standfirst}
        </p>

        <Image
          src={featuredStory.image}
          alt={featuredStory.imageAlt}
          width={1800}
          height={1012}
          quality={76}
          className="w-full"
        />

        <div className="mt-[clamp(1.5rem,3vw,2rem)] space-y-[1.1em]">
          {featuredStory.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="text-body text-foreground-soft">
              {paragraph}
            </p>
          ))}
        </div>

        <p className="meta mt-6">
          Photographs · {creditFor(featuredStory.photographerId) ?? 'Uncredited'}
        </p>
      </Dialog>
    </>
  );
}
