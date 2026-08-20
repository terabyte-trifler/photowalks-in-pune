import { unstable_cache } from 'next/cache';
import type { Event } from '@/data/events';
import { getSupabasePublicClient } from '@/lib/supabase/public';

/* ============================================================================
 * HOW MANY SPOTS ARE ACTUALLY LEFT
 * ----------------------------------------------------------------------------
 * `spotsRemaining` used to be a number typed by hand in data/events.ts. Nothing
 * decremented it, so "11 spots left" was decoration — it said the same thing
 * after twenty people joined as it did before anybody had. A capacity claim
 * that never moves is worse than no claim: somebody reads it, hurries to sign
 * up for a walk that is actually empty, or does not bother with one that is
 * actually free.
 *
 * So the number is counted instead. `walk_attendance` is the public projection
 * of walk_rsvps — attendance only, never contact details — and it is readable
 * by signed-out visitors, which is what lets the homepage stay statically
 * rendered while still telling the truth.
 *
 * The count is read through the cookie-free client on purpose. Touching a
 * cookie is a dynamic API, and one call to it anywhere in the tree opts the
 * whole page out of static rendering; that is how the homepage quietly stopped
 * being prerendered once before.
 * ========================================================================== */

/**
 * Cached for a minute rather than the page's five, because a walk filling up
 * is the one thing on this page worth being fresh about.
 */
export const getSpotsTaken = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = getSupabasePublicClient();
    if (!supabase) return {};

    const { data, error } = await supabase.from('walk_attendance').select('event_id');
    if (error || !data) return {};

    const taken: Record<string, number> = {};
    for (const row of data) {
      const id = (row as { event_id: string }).event_id;
      taken[id] = (taken[id] ?? 0) + 1;
    }
    return taken;
  },
  ['walk-spots-taken'],
  { revalidate: 60, tags: ['walk-spots'] },
);

/**
 * Never below zero, and never above capacity: an over-subscribed walk should
 * read "Full", not "-2 spots left".
 */
export function spotsRemaining(walk: Event, taken: Record<string, number>): number {
  return Math.max(0, walk.capacity - (taken[walk.id] ?? 0));
}
