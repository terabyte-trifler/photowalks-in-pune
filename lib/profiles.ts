/* ============================================================================
 * PROFILES
 * ----------------------------------------------------------------------------
 * Reads go through Row Level Security like any other client, so this file
 * never needs elevated privileges and there is no service-role key anywhere in
 * the project. A profile is public; a write is checked against auth.uid().
 *
 * Profile rows are created by the `on_auth_user_created` trigger in
 * supabase/migrations, not here. See the note in that file for why there is
 * exactly one place that inserts.
 * ========================================================================== */

import { cache } from 'react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase/types';
import { PROFILE_COLUMNS } from '@/lib/supabase/columns';

/* Wrapped in React's cache so generateMetadata and the page itself share one
   query per request rather than asking twice for the same row. */
export const getProfileByUsername = cache(async (username: string): Promise<Profile | null> => {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (error) return null;
  return data ?? null;
});
