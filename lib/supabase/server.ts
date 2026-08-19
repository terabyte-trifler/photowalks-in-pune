import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';
import type { Database } from './types';

/**
 * Server client for Server Components, Route Handlers and Server Actions.
 * `cookies()` is async in Next 15, so this helper is async too.
 *
 * Writing cookies throws inside a Server Component (they are read-only there);
 * that is expected and safe to swallow, because the middleware has already
 * refreshed the session cookie for this request.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Called from a Server Component — the middleware owns the refresh. */
        }
      },
    },
  });
}
