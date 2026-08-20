/* ============================================================================
 * CONTENT SECURITY POLICY
 * ----------------------------------------------------------------------------
 * The first version of this header kept `'unsafe-inline'` in script-src for
 * every page, and the reasoning went: Next hydrates through inline <script>
 * tags, locking those down needs a per-request nonce, a nonce has to come from
 * middleware, and a page carrying one cannot be prerendered — so a strict CSP
 * would cost the homepage its static rendering.
 *
 * All true, and it was still the wrong conclusion, because it treated the site
 * as one thing. The build says otherwise:
 *
 *   static    /  /privacy  /terms
 *   dynamic   /login  /signup  /forgot-password  /reset-password  /settings
 *             /my-walks  /profile  /photographers  /photographers/[username]
 *
 * Every page that handles a password, a session or another member's writing is
 * already rendered per request. A nonce costs those pages nothing at all — the
 * thing it would have taken away, they never had. And the three static pages
 * are the brochure: their content comes from data/*.ts, no user input reaches
 * them, and there is nothing on them to inject into.
 *
 * So the policy is split. Strict where it protects something, relaxed only
 * where the page is a fixed document with no user content in it.
 *
 * ABOUT 'strict-dynamic'
 * With it, `'self'` and host allowlists in script-src are ignored: a script
 * runs only if it carries the nonce, or if a script that carried the nonce
 * loaded it. That is what makes an injected <script> tag inert even though it
 * sits on the same origin — an attacker cannot guess a nonce minted for that
 * one response.
 * ========================================================================== */

/** The three prerendered pages. Nothing user-controlled renders on any of them. */
export const STATIC_PAGES = ['/', '/privacy', '/terms'];

export function isStaticPage(pathname: string): boolean {
  return STATIC_PAGES.includes(pathname);
}

/**
 * Everything that does not vary between the two policies. Keeping it in one
 * place is what stops the strict version quietly drifting weaker than the
 * relaxed one.
 */
function shared(): string[] {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    /* Supabase storage, Google OAuth avatars, Instagram's CDNs. blob: and
       data: are the browser-side downscaler previewing a canvas. */
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.cdninstagram.com https://*.fbcdn.net",
    /* Tailwind ships a stylesheet; framer-motion animates through inline style
       attributes, which style-src governs and a nonce cannot help with. */
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    /* The only place the app may talk to. This is the directive that decides
       whether an injected script could send anything it stole anywhere. */
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
  ];
}

/**
 * `nonce` present  → the strict policy, for pages rendered per request.
 * `nonce` absent   → the relaxed policy, for the three prerendered pages.
 *
 * `isProduction` gates upgrade-insecure-requests: on http://localhost it
 * rewrites Next's own prefetches to https and breaks client-side navigation.
 */
export function buildCsp({
  nonce,
  isProduction,
}: {
  nonce?: string;
  isProduction: boolean;
}): string {
  const directives = shared();

  directives.push(
    nonce
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : "script-src 'self' 'unsafe-inline'",
  );

  if (isProduction) directives.push('upgrade-insecure-requests');

  return directives.join('; ');
}

/** 128 bits from the platform CSPRNG, base64 for the header. Edge-runtime safe. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
