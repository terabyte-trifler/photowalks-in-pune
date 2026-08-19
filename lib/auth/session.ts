import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase/types';

/* ============================================================================
 * SERVER-SIDE SESSION
 * ----------------------------------------------------------------------------
 * The only trustworthy way to ask "who is this?" on the server. Always
 * getUser(), never getSession(): getSession reads the cookie and believes it,
 * while getUser revalidates the token with Supabase.
 *
 * Every server action and every protected page starts here. The middleware
 * redirect is a convenience so people do not see a flash of a page they
 * cannot use — it is not the authorization boundary.
 * ========================================================================== */

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
}

export async function getCurrentProfile(): Promise<{ user: User; profile: Profile | null } | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
}

/**
 * For pages and actions that genuinely need an identity. `next` brings the
 * person back to what they were doing after they log in.
 */
export async function requireUser(next?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  }
  return user;
}
