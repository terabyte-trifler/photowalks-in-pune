/* ============================================================================
 * THE WALK ARCHIVE
 * ----------------------------------------------------------------------------
 * Copies of walk-tagged photographs, kept in /public by
 * scripts/archive-walk-photos.mjs so a walk keeps its photographs after the
 * photographer deletes the upload. See that script for when entries change.
 * ========================================================================== */

import archive from '@/data/walk-archive.json';

export interface ArchivedPhoto {
  id: string;
  eventId: string | null;
  /** A path under /public — served as a static file, never from Storage. */
  src: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  photographerName: string | null;
  photographerUsername: string | null;
  createdAt: string;
  archivedAt: string;
  /** Set by hand to take a photograph down. */
  hidden?: boolean;
}

const ENTRIES = (archive as ArchivedPhoto[]).filter((entry) => !entry.hidden);
const HIDDEN = new Set((archive as ArchivedPhoto[]).filter((e) => e.hidden).map((e) => e.id));
const BY_ID = new Map(ENTRIES.map((entry) => [entry.id, entry]));

/** The archived copy of a photograph, if there is one and it is not hidden. */
export const archivedPhoto = (id: string): ArchivedPhoto | undefined => BY_ID.get(id);

/** Hidden in the archive — taken down, so not shown even while still live. */
export const isTakenDown = (id: string): boolean => HIDDEN.has(id);

/** Every archived photograph filed under any of these walks. */
export function archivedPhotosForWalks(eventIds: string[]): ArchivedPhoto[] {
  const wanted = new Set(eventIds);
  return ENTRIES.filter((entry) => entry.eventId !== null && wanted.has(entry.eventId));
}
