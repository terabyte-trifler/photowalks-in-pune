import type { NextConfig } from 'next';


/* ============================================================================
 * SECURITY HEADERS
 * ----------------------------------------------------------------------------
 * Everything except the Content Security Policy, which is assembled in
 * middleware instead: it needs a per-request nonce on the pages that are
 * rendered per request, and a config file cannot mint one. See lib/security/csp.ts.
 * ========================================================================== */
const securityHeaders = [
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
      /* Any lh<n>, not just lh3. The avatar_url constraint in migration 0007
         permits lh[0-9]+.googleusercontent.com, and Google really does serve
         from lh4, lh5 and up — listing only lh3 here meant the optimiser would
         refuse an avatar the database had accepted, and that member's picture
         would simply fail to load. Breadth is safe: the database is the gate,
         and it pins the host far more tightly than this does. */
      { protocol: 'https', hostname: '**.googleusercontent.com', pathname: '/**' },
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

    /* Next's default top widths are 2048 and 3840. Members upload through the
       browser-side downscaler, which caps the long edge at 2000px — so a
       request for 3840 returns exactly what 2048 returns, byte for byte:
       measured at 91,666 bytes for both on the same photograph. Next does not
       upscale, and there is nothing above 2000px to serve.
       
       Keeping 3840 therefore bought a second cache entry and a second fetch of
       the source from Supabase for an identical image. Retina screens ask for
       those top widths, so it was a real share of the per-photo egress spent
       on a duplicate.
       
       Capped at 2048, which still exceeds every source on the project. Nothing
       is served smaller than before — the pixels at 2048 are unchanged. */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
};

export default nextConfig;
