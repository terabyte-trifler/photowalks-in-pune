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

/**
 * The person who started this. Their card is pinned to the top of the
 * directory and shown whatever is filtered or sorted, because the founder of a
 * community is not a search result — somebody arriving should be able to see
 * who runs it without knowing to look.
 *
 * A username rather than a uuid so it is readable, and so this file does not
 * need to know anything about the database. If they ever change their handle
 * the pin quietly stops applying, which is the right way for it to fail: the
 * directory still works and nobody is shown in the wrong place.
 */
export const FOUNDER_USERNAME = 'ankushgupta';

export const DIRECTORY_PAGE_SIZE = 12;
export const PHOTOS_PAGE_SIZE = 24;
/** How many frames ride along on a directory card. */
export const CARD_PHOTO_COUNT = 3;

/**
 * How many photographs one member may hold. Enforced by the
 * photos_enforce_limit trigger in migration 0004 — this constant only lets the
 * uploader say so before somebody wastes an upload finding out.
 * Keep the two in step.
 */
export const MAX_PHOTOS_PER_MEMBER = 20;

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
