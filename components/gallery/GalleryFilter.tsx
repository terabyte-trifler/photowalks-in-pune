'use client';

import { categories, photos } from '@/data/photos';
import { cn } from '@/lib/utils';
import { useGallery } from './GalleryProvider';

export function GalleryFilter() {
  const { filter, setFilter } = useGallery();

  const available = categories
    .map((category) => ({
      ...category,
      count: photos.filter((photo) => photo.category === category.id).length,
    }))
    .filter((category) => category.count > 0);

  const base =
    'border-b border-transparent pb-1.5 font-mono text-meta uppercase tracking-[0.18em] transition-colors hover:text-foreground';

  return (
    <div
      role="group"
      aria-label="Filter photographs by subject"
      className="mb-[clamp(1.75rem,3.5vw,2.75rem)] flex flex-wrap gap-x-7 gap-y-2 border-b border-border pb-[clamp(1.5rem,3vw,2.25rem)]"
    >
      <button
        type="button"
        aria-pressed={filter === 'all'}
        onClick={() => setFilter('all')}
        className={cn(base, filter === 'all' ? 'border-accent text-foreground' : 'text-muted')}
      >
        All ({photos.length})
      </button>

      {available.map((category) => (
        <button
          key={category.id}
          type="button"
          aria-pressed={filter === category.id}
          onClick={() => setFilter(category.id)}
          className={cn(
            base,
            filter === category.id ? 'border-accent text-foreground' : 'text-muted',
          )}
        >
          {category.label} ({category.count})
        </button>
      ))}
    </div>
  );
}
