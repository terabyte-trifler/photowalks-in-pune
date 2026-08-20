/* ============================================================================
 * WHICH WAYS IN ARE ACTUALLY OPEN
 * ----------------------------------------------------------------------------
 * A "Continue with Google" button that answers "that sign-in method is not
 * switched on yet" is worse than no button, so the app asks Supabase which
 * providers are enabled rather than trusting a flag somebody has to remember
 * to change in two places. `/auth/v1/settings` is public and reports exactly
 * that, so the button follows the dashboard with no redeploy.
 *
 * WHY THIS FAILS OPEN NOW, HAVING FAILED CLOSED TWICE
 * The first version returned `{ google: false }` from its catch block, on the
 * reasoning that a missing button is a smaller problem than one that fails
 * when pressed. That was the wrong way round, and it took the button off the
 * live site twice to make it obvious.
 *
 * The two failures are not comparable:
 *
 *   fail closed   the button vanishes. Anybody whose account IS a Google
 *                 account has no way in, sees no error, and has no idea why.
 *                 Cached, so it persists long after the cause has gone.
 *   fail open     the button appears when we could not confirm. If Google
 *                 really is off, pressing it returns a plain message and the
 *                 email form is right there underneath.
 *
 * So `false` is now returned only when Supabase actually says the provider is
 * off. Not knowing is treated as "probably on", because that is both the
 * likelier truth and the cheaper mistake.
 *
 * The cache key is deliberately different from the previous one. A stale
 * `false` from the old version outlived the reason for it, and changing the
 * key abandons that entry rather than waiting for it to expire.
 * ========================================================================== */

import { unstable_cache } from 'next/cache';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

interface AuthSettings {
  external?: Record<string, boolean>;
}

/** Exported without the cache wrapper so the failure modes can be tested. */
export async function readProviders(): Promise<{ google: boolean }> {
  /* No project at all is the one case where the button is certainly useless. */
  if (!isSupabaseConfigured()) return { google: false };

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });

    /* Could not ask. Assume the provider is on rather than stranding the
       people who sign in with it — see the note above. */
    if (!response.ok) return { google: true };

    const settings = (await response.json()) as AuthSettings;

    /* Only an explicit false hides the button. A malformed answer is another
       kind of "could not tell". */
    if (settings.external && typeof settings.external.google === 'boolean') {
      return { google: settings.external.google };
    }
    return { google: true };
  } catch {
    return { google: true };
  }
}

/**
 * A minute, not five. This is configuration rather than data, but it is also
 * the difference between somebody signing in and giving up, so it should
 * recover quickly after a dashboard change or a bad answer.
 */
export const getEnabledProviders = unstable_cache(readProviders, ['auth-providers-v2'], {
  revalidate: 60,
  tags: ['auth-providers'],
});
