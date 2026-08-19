'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';
import type { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | null = null;

/**
 * The browser client, created once per tab. @supabase/ssr keeps the session in
 * cookies rather than localStorage, which is what lets the server components
 * and the middleware read it too.
 *
 * Returns null when no project is configured, so callers degrade to the
 * "authentication is not connected yet" state instead of crashing.
 */
export function getSupabaseBrowserClient(): TypedSupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
