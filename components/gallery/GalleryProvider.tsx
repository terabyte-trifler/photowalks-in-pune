'use client';

import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import {
  photos, resolveCredit, type CreditMap, type Photo, type PhotoCategory,
} from '@/data/photos';

export type Filter = PhotoCategory | 'all';

interface GalleryContextValue {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  /** Selecting a subject filters the grid and returns you to it. */
  selectCategory: (category: PhotoCategory) => void;
  visible: Photo[];
  /** How many of `visible` the grid is currently drawing. */
  shown: number;
  showMore: () => void;
  /**
   * What to print under a photograph: the photographer's name as their profile
   * has it right now. Passed down from the server rather than read from
   * data/photos.ts, so renaming yourself renames you here too.
   */
  creditFor: (photographerId: string | null) => string | null;
  lightboxIndex: number | null;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  step: (delta: number) => void;
}

/**
 * Twelve, and twelve more each time. The placement pattern in PhotoGrid
 * repeats every six frames, so a page that is a multiple of six ends on a
 * complete cycle and the grid's rhythm survives being revealed in instalments.
 *
 * The archive was thirty-three photographs deep on first paint, which is a lot
 * of page to scroll past on the way to anything else.
 */
const PAGE = 12;

const GalleryContext = createContext<GalleryContextValue | null>(null);

/**
 * Filtering and the lightbox are shared by two sections that sit apart on the
 * page, so the state lives here. Children stay server components.
 */
export function GalleryProvider({
  children,
  credits,
}: {
  children: ReactNode;
  /**
   * Current names, resolved on the server. Optional so the provider can still
   * be mounted without them — every lookup falls back to the stored name, and
   * a missing map degrades to exactly the old behaviour rather than to blanks.
   */
  credits?: CreditMap;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shown, setShown] = useState(PAGE);

  const visible = useMemo(
    () => (filter === 'all' ? photos : photos.filter((photo) => photo.category === filter)),
    [filter],
  );

  const creditFor = useCallback(
    (photographerId: string | null) => resolveCredit(photographerId, credits),
    [credits],
  );

  const selectCategory = useCallback((category: PhotoCategory) => {
    setFilter(category);
    /* A new subject starts from the top of its own set rather than inheriting
       however far somebody had loaded into the last one. */
    setShown(PAGE);
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
        setShown(PAGE);
        setLightboxIndex(null);
      },
      selectCategory,
      creditFor,
      visible,
      shown,
      showMore: () => setShown((current) => current + PAGE),
      lightboxIndex,
      openLightbox: setLightboxIndex,
      closeLightbox: () => setLightboxIndex(null),
      step,
    }),
    [filter, selectCategory, visible, shown, lightboxIndex, step, creditFor],
  );

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGallery(): GalleryContextValue {
  const context = useContext(GalleryContext);
  if (!context) throw new Error('useGallery must be used inside <GalleryProvider>');
  return context;
}
