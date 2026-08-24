/* ============================================================================
 * WHO MADE THE PHOTOGRAPH, ACCORDING TO THEM
 * ----------------------------------------------------------------------------
 * The archive in data/photos.ts is a fixed list of files, and it used to carry
 * each photographer's name as a string written into the file. That made the
 * gallery the one place on the site that could not hear somebody rename
 * themselves: a member who changed "Gurnoor Singh" to "Terabyte Trifler" saw
 * the new name on their profile, in the directory and in the header, and the
 * old one under their photographs.
 *
 * The file now stores a username instead — the join key onto their profile —
 * and this reads the current name off it. Rename yourself and the archive
 * follows, for everybody, with nothing to edit here.
 *
 * WHY IT IS CACHED
 * The homepage is prerendered with `revalidate = 300`. An uncached read here
 * would make it render per request, which would cost the site its static
 * homepage — and, because the CSP hands the three prerendered pages a relaxed
 * policy, quietly put `/` in a state its policy does not assume. One query
 * every five minutes for a handful of names is the right trade, and it matches
 * what listCities and the photographers strip already do.
 *
 * WHY IT FAILS OPEN
 * If Supabase cannot be reached this returns an empty map, and every caller
 * falls back to the stored name. The alternative — showing "Uncredited" over
 * somebody's work because a network call failed — is a worse outcome than a
 * stale name. This is the same lesson as the Google button, which failed
 * closed on any error and vanished from the sign-in page twice.
 * ========================================================================== */

import { unstable_cache } from 'next/cache';
import { photographers, type CreditMap } from '@/data/photos';
import { getSupabasePublicClient } from '@/lib/supabase/public';

/** Usernames the archive actually credits. Anyone without one is skipped. */
const CREDITED = photographers.filter((p) => p.username);

async function readCredits(): Promise<CreditMap> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('photographer_cards')
    .select('username, full_name')
    .in(
      'username',
      CREDITED.map((p) => p.username as string),
    );

  /* Fail open: an empty map means every caller uses its stored fallback. */
  if (error || !data) return {};

  const byUsername = new Map(
    (data as { username: string; full_name: string }[]).map((row) => [row.username, row.full_name]),
  );

  const credits: CreditMap = {};
  for (const person of CREDITED) {
    const live = byUsername.get(person.username as string)?.trim();
    /* Only override when there is something to override with. A profile whose
       name was cleared should keep showing the stored one, not an empty gap. */
    if (live) credits[person.id] = live;
  }
  return credits;
}

/**
 * Current display names for everyone the archive credits, keyed by the
 * photographer id used on each photograph.
 *
 * Tagged `photographers` so it clears with the other profile-derived caches
 * rather than sitting stale for five minutes after a rename.
 */
export const getGalleryCredits = unstable_cache(readCredits, ['gallery-credits-v1'], {
  revalidate: 300,
  tags: ['photographers'],
});
