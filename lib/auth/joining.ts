/* ============================================================================
 * IS JOINING OPEN
 * ----------------------------------------------------------------------------
 * There is a ceiling on accounts (migration 0028), and the database enforces
 * it whatever this file says. What this is for is the sentence: somebody who
 * cannot make an account should be told so on the page, in words, instead of
 * filling a form and being handed a database error at the end of it.
 *
 * Read through plain fetch with the anon key rather than the server client,
 * for the same reason lib/auth/providers.ts does: touching cookies() is a
 * dynamic API, and one call to it inside unstable_cache is not allowed at all.
 * The answer is a boolean about the whole site, not about the reader, so there
 * is nothing here a session would add.
 *
 * FAILS OPEN, DELIBERATELY
 * Not knowing is treated as "you may join" — the same conclusion providers.ts
 * reached the hard way after a failed lookup took the Google button off the
 * live site twice. The two mistakes are not equal: failing open shows the form
 * to somebody the database may still refuse, which costs them one clear error;
 * failing closed tells every visitor the site is full when it is not, and
 * caches that for a minute at a time.
 * ========================================================================== */

import { unstable_cache } from 'next/cache';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

async function readJoiningOpen(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/joining_open`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!response.ok) return true;

    const value: unknown = await response.json();
    /* Only an explicit false closes the door. A null, a string, a changed
       shape — none of those are the database saying the site is full. */
    return value !== false;
  } catch {
    return true;
  }
}

/**
 * Cached for a minute. The number moves a handful of times a year at most, and
 * the page that asks is the one a stranger lands on.
 */
export const isJoiningOpen = unstable_cache(readJoiningOpen, ['joining-open'], {
  revalidate: 60,
  tags: ['joining'],
});
