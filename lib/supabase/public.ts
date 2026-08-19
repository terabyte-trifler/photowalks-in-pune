import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';
import type { Database } from './types';

/* ============================================================================
 * PUBLIC READ CLIENT
 * ----------------------------------------------------------------------------
 * For data that is public to begin with: the photographer directory, a
 * profile, somebody's photographs, who walked which walk.
 *
 * It deliberately does not touch cookies. Reading a cookie is a dynamic API in
 * the App Router, and one call to it anywhere in a page's tree opts that whole
 * page out of static rendering — which is how the homepage quietly stopped
 * being prerendered the moment it grew a photographers strip.
 *
 * Because there is no session, every query here runs as `anon`. That is not a
 * loophole: these reads are the ones RLS already allows anon to make. Anything
 * that depends on who is asking — an owner's Edit button, a private RSVP —
 * uses the cookie client in lib/supabase/server.ts instead.
 * ========================================================================== */

let client: SupabaseClient<Database> | null = null;

export function getSupabasePublicClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
