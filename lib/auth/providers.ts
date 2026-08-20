/* ============================================================================
 * WHICH WAYS IN ARE ACTUALLY OPEN
 * ----------------------------------------------------------------------------
 * A "Continue with Google" button that answers "that sign-in method is not
 * switched on yet" is worse than no button: it is on the signup screen, which
 * is exactly where somebody decides whether this site works.
 *
 * Rather than a flag in the environment that someone has to remember to change
 * in two places, the app asks Supabase. `/auth/v1/settings` is a public
 * endpoint that reports which providers are enabled, so the button disappears
 * when Google is off and comes back the moment it is switched on in the
 * dashboard — no redeploy, no code change.
 * ========================================================================== */

import { unstable_cache } from 'next/cache';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

interface AuthSettings {
  external?: Record<string, boolean>;
}

/**
 * Cached for five minutes: this is configuration, not data, and it changes
 * when somebody edits a dashboard setting rather than on any request.
 */
export const getEnabledProviders = unstable_cache(
  async (): Promise<{ google: boolean }> => {
    if (!isSupabaseConfigured()) return { google: false };

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: SUPABASE_ANON_KEY },
      });
      if (!response.ok) return { google: false };

      const settings = (await response.json()) as AuthSettings;
      return { google: settings.external?.google === true };
    } catch {
      /* If we cannot tell, assume not. A missing button is a smaller problem
         than one that fails when pressed. */
      return { google: false };
    }
  },
  ['auth-providers'],
  { revalidate: 300, tags: ['auth-providers'] },
);
