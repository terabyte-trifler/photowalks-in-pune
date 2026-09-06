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
 * consent screen.
 *
 * This used to fall back to VERCEL_URL, which the platform set per preview
 * deployment so a preview redirected to itself. The site is self-hosted on a
 * VPS now: nothing sets VERCEL_URL any more, and a fallback that can never
 * fire only misleads whoever reads this next. NEXT_PUBLIC_SITE_URL is the one
 * source of the origin in production, and it must match a redirect URL on the
 * Supabase Auth allow-list or the callback is rejected.
 */
export function siteOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  return 'http://localhost:3000';
}
