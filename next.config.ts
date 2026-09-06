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
    return [
      { source: '/:path*', headers: securityHeaders },
      /* The build-time variants carry their source's content hash in the
         filename, so a given URL's bytes can never change — replacing a
         photograph produces different URLs. That makes a year safe, and it is
         worth having: without it the platform serves /public as
         `max-age=0, must-revalidate`, and the homepage alone is 37 <picture>
         elements, so every repeat view spent 37 round trips confirming that
         photographs which cannot change had not changed. */
      {
        source: '/images/_v/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
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
    /* One value, and it is IMAGE_QUALITY in lib/images.ts. Read the comment
       there for why six became one; the short version is that the cache treats
       72 and 74 as different photographs and no viewer does.

       A one-entry list also removes the failure this list was added for. It
       used to be hand-maintained against whatever each component happened to
       pass, and it missed 76 and 82 — which is what crashed the gallery. Now
       there is nothing to keep in step with except lib/images.ts, and every
       <Image> names it.

       A quality outside this list really is a hard 400 from the optimiser:

         /_next/image?url=…&w=640&q=76  ->  200, image/jpeg
         /_next/image?url=…&w=640&q=75  ->  400, text/plain, 84 bytes

       But an <Image> that passes no quality never produces one. Next snaps a
       missing quality to the nearest configured value rather than sending its
       default of 75 — under the old list that was 74, which is what production
       served. Worth knowing before trimming this list on the assumption that
       75 must stay in it. */
    qualities: [76],

    /* ------------------------------------------------------------------
     * HOW LONG AN OPTIMISED IMAGE IS KEPT
     * ------------------------------------------------------------------
     * A floor on how long the optimiser may keep a generated variant before
     * making it again. Every re-generation is a billed transformation, so a
     * longer floor can only reduce them.
     *
     * What it does NOT do, on Vercel: change what browsers are told. This was
     * added on the belief that it would, and then measured — three fresh
     * variants (x-vercel-cache: MISS, age: 0) on the deployment that first
     * carried this setting all came back
     *
     *     cache-control: public, max-age=0, must-revalidate
     *
     * exactly as they did before it. Vercel's Image Optimization writes that
     * header itself and this value does not reach it. Browsers revalidate
     * every optimised image on every load either way; the edge answers those
     * revalidations, so they are cheap, but they are still round trips.
     *
     * A day is therefore not the compromise it was written as. The reason to
     * keep it short — that a replaced file in /public would sit stale in
     * browsers — does not apply when browsers never hold the image at all.
     *
     * So it is raised to 31 days, which is the whole point of the setting:
     * this is the one number that governs how often a variant is *re-made*,
     * and re-making is what gets billed. Nothing else in this config reduces
     * recurring cost — the width and quality lists bound how many distinct
     * variants exist, and this bounds how often each is paid for again.
     *
     * The cost of the long floor is what it always was, and is now genuinely
     * small: overwrite a file in /public under the same name and the edge may
     * keep serving the old pixels for up to a month. Photographs here are
     * added, not replaced — and the build-time variants in scripts/ carry a
     * content hash in the filename, so a changed photograph is a changed URL
     * and this floor never applies to it.
     * ------------------------------------------------------------------ */
    minimumCacheTTL: 2_678_400,

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
       is served smaller than before — the pixels at 2048 are unchanged.

       Then thinned from seven widths to five. Every entry is a variant per
       photograph per quality, and the ladder had rungs too close together to
       matter: 750 and 828 are 10% apart, 1080 and 1200 are 11%. A browser
       picking 828 where it would have picked 750 downloads about a fifth more
       bytes for that one image and saves a whole generated variant across the
       archive. The retained rungs are roughly a third apart, which is where
       the tradeoff sits for photographs.

       Measured against the live homepage before this change: the hero alone
       was requesting all seven widths in one srcset. */
    deviceSizes: [640, 828, 1200, 1600, 2048],

    /* The small ladder, used when `sizes` resolves below the smallest device
       width — avatars, effectively, which ask for 20, 30, 46 and 72 CSS pixels
       and double that on retina. Next's default has eight rungs from 16 to
       384, which is far more resolution than four avatar sizes need. Four
       rungs cover them: the largest avatar at 2x is 144, so 256 and 384 exist
       only for the odd third-party image with a fixed pixel `sizes`. */
    imageSizes: [64, 128, 256, 384],
  },
};

export default nextConfig;
