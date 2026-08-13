'use client';

import type { PhotoCategory } from '@/data/photos';
import { useGallery } from '@/components/gallery/GalleryProvider';

/** Client island inside an otherwise server-rendered list. */
export function CategoryButton({
  category,
  index,
  label,
  note,
}: {
  category: PhotoCategory;
  index: string;
  label: string;
  note: string;
}) {
  const { selectCategory } = useGallery();

  return (
    <button
      type="button"
      onClick={() => selectCategory(category)}
      className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 border-b border-border py-[clamp(0.85rem,1.6vw,1.15rem)] text-left transition-[background-color,padding] duration-500 hover:bg-subtle hover:px-4"
    >
      <span className="meta">{index}</span>
      <span>
        <span className="display block text-[clamp(1.5rem,3.4vw,2.6rem)] leading-none transition-colors duration-300 group-hover:text-accent">
          {label}
        </span>
        <span className="mt-1 block text-[0.8125rem] text-muted">{note}</span>
      </span>
      <span className="meta" aria-hidden="true">
        See ↑
      </span>
    </button>
  );
}
