'use client';

import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import { photos, type Photo, type PhotoCategory } from '@/data/photos';

export type Filter = PhotoCategory | 'all';

interface GalleryContextValue {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  /** Selecting a subject filters the grid and returns you to it. */
  selectCategory: (category: PhotoCategory) => void;
  visible: Photo[];
  lightboxIndex: number | null;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  step: (delta: number) => void;
}

const GalleryContext = createContext<GalleryContextValue | null>(null);

/**
 * Filtering and the lightbox are shared by two sections that sit apart on the
 * page, so the state lives here. Children stay server components.
 */
export function GalleryProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visible = useMemo(
    () => (filter === 'all' ? photos : photos.filter((photo) => photo.category === filter)),
    [filter],
  );

  const selectCategory = useCallback((category: PhotoCategory) => {
    setFilter(category);
    document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const step = useCallback(
    (delta: number) =>
      setLightboxIndex((current) =>
        current === null ? null : (current + delta + visible.length) % visible.length,
      ),
    [visible.length],
  );

  const value = useMemo(
    () => ({
      filter,
      setFilter: (next: Filter) => {
        setFilter(next);
        setLightboxIndex(null);
      },
      selectCategory,
      visible,
      lightboxIndex,
      openLightbox: setLightboxIndex,
      closeLightbox: () => setLightboxIndex(null),
      step,
    }),
    [filter, selectCategory, visible, lightboxIndex, step],
  );

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGallery(): GalleryContextValue {
  const context = useContext(GalleryContext);
  if (!context) throw new Error('useGallery must be used inside <GalleryProvider>');
  return context;
}
