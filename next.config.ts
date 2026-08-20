import type { NextConfig } from 'next';


/* ============================================================================
 * SECURITY HEADERS
 * ----------------------------------------------------------------------------
 * The audit found the site sending none of these. Vercel adds HSTS and nothing
 * else, so the page could be framed by any site on the internet — a login form
 * and a "Delete my account" button are exactly what clickjacking is for.
 *
 * ABOUT script-src AND 'unsafe-inline'
 * The honest answer is that this CSP does not stop inline script, and it is
 * worth saying why rather than quietly shipping a header that looks stronger
 * than it is. Next's App Router hydrates through inline <script> tags carrying
 * the flight payload. Locking those down needs a per-request nonce, a nonce
 * has to be generated in middleware, and reading it forces every page to
 * render dynamically — which would throw away the static prerendering and ISR
 * this site depends on to stay fast from Mumbai.
 *
 * So the trade is deliberate: keep the app fast and static, and spend the CSP
 * where it still pays. The directives below are the ones that hold even with
 * inline script allowed —
 *
 *   connect-src     an injected script cannot post stolen data anywhere but
 *                   this origin and Supabase, which is the step that turns an
 *                   XSS into an actual breach
 *   frame-ancestors clickjacking, closed outright
 *   base-uri        stops a <base> tag repointing every relative URL
 *   form-action     stops a form being redirected to collect credentials
 *   object-src      no plugins, ever
 *
 * React's own escaping is what stops the injection in the first place, and the
 * audit found no dangerouslySetInnerHTML carrying user data.
 * ========================================================================== */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  /* Supabase storage, Google OAuth avatars, and Instagram's CDNs — the same
     hosts next/image is configured for above. blob: and data: are the
     browser-side downscaler, which previews a canvas before upload. */
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.cdninstagram.com https://*.fbcdn.net",
  "script-src 'self' 'unsafe-inline'",
  /* Tailwind ships a stylesheet; framer-motion animates through inline style
     attributes, which style-src governs. */
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  /* The only place the app may talk to. wss: is Supabase realtime. */
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  /* Vercel already sends HSTS; stated here so the guarantee survives a move. */
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  /* frame-ancestors supersedes this; kept for browsers that predate CSP3. */
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  /* Stops advertising the framework and its version to anybody scanning. */
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  reactStrictMode: true,

  /**
   * There is a package-lock.json above this directory, so Next infers the
   * workspace root as the parent and warns on every build. Pinning it here
   * silences that and, more usefully, keeps deployment file-tracing scoped to
   * this project instead of everything above it.
   */
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      /* Avatars from Google sign-in. Add your Supabase project's storage host
         here too when photographs and uploaded avatars move there:
         { protocol: 'https', hostname: '<project-ref>.supabase.co',
           pathname: '/storage/v1/object/public/**' }                        */
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      /* Avatars and photographs in Supabase Storage. The wildcard covers the
         project ref, which differs between local, preview and production. */
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      /* Instagram serves media from these two, and which one varies by region
         and by post. Only reached when INSTAGRAM_ACCESS_TOKEN is set. */
      { protocol: 'https', hostname: '**.cdninstagram.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.fbcdn.net', pathname: '/**' },
    ],
    /* next/image refuses a quality it has not been told about from v16. */
    qualities: [70, 72, 74, 80],
  },
};

export default nextConfig;
