/* ============================================================================
 * SUPABASE — CONFIGURATION
 * ----------------------------------------------------------------------------
 * The site is a public, statically-rendered marketing page first and an
 * account system second. It must keep working with no Supabase project
 * attached, exactly like the RSVP and newsletter flows do — so every entry
 * point checks `isSupabaseConfigured()` first and the auth screens explain
 * themselves rather than throwing.
 *
 * Only the anon (publishable) key is ever referenced here. The service-role
 * key must never appear in this repository or in any NEXT_PUBLIC_* variable:
 * it bypasses Row Level Security.
 * ========================================================================== */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Both values must be present and the URL must be a real URL. An empty string
 * in .env.local is the common case during local development, and
 * `createBrowserClient('', '')` throws, which would take the whole page down.
 */
export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    new URL(SUPABASE_URL);
    return true;
  } catch {
    return false;
  }
}

/**
 * Where Supabase should send people back to after an email link or the Google
 * consent screen. Vercel sets VERCEL_URL on previews, so preview deployments
 * redirect to themselves rather than to production.
 */
export function siteOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
