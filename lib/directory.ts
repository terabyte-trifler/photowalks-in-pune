/* ============================================================================
 * DIRECTORY SHAPE
 * ----------------------------------------------------------------------------
 * The parts of the photographer directory that both halves of the app need:
 * the sort options the filter chips render, the page sizes, and how to build
 * a public image URL.
 *
 * Kept apart from lib/photographers.ts on purpose. That file imports the
 * Supabase *server* client, which reaches for next/headers — importing a
 * constant from it inside a client component drags next/headers into the
 * browser bundle and fails the build. Anything both sides use belongs here.
 * ========================================================================== */

import { SUPABASE_URL } from '@/lib/supabase/config';
import type { PhotoRecord } from '@/lib/supabase/types';

export const DIRECTORY_PAGE_SIZE = 12;
export const PHOTOS_PAGE_SIZE = 24;
/** How many frames ride along on a directory card. */
export const CARD_PHOTO_COUNT = 3;

export type DirectorySort = 'active' | 'walks' | 'recent' | 'new';

export const SORT_OPTIONS: { id: DirectorySort; label: string }[] = [
  { id: 'active', label: 'Most active' },
  { id: 'walks', label: 'Most walks' },
  { id: 'recent', label: 'Most recent' },
  { id: 'new', label: 'New photographers' },
];

export const isDirectorySort = (value: string | undefined): value is DirectorySort =>
  SORT_OPTIONS.some((option) => option.id === value);

/** The public URL of a stored image. Buckets are public; RLS guards writing. */
export function imageUrl(bucket: 'avatars' | 'photos', storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
}

export const photoUrl = (photo: Pick<PhotoRecord, 'storage_path'>): string =>
  imageUrl('photos', photo.storage_path);
