import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

/**
 * The storage host the image optimiser is allowed to fetch from. Derived from
 * the configured project so that a preview or a local stack points at its own
 * bucket, with the production ref as the fallback when the variable is not set
 * at build time.
 */
const SUPABASE_HOSTNAME = (() => {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).hostname;
    } catch {
      /* Malformed value: fall through rather than fail the build here, where
         the error would name the image config and not the real culprit. */
    }
  }
  return 'gcyweszlvjkguvbzfwlj.supabase.co';
})();


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
   * Left for Node to require at runtime instead of being bundled.
   *
   * libheif-js reaches its decoder through a dynamic require that webpack
   * cannot follow — it says so at build time: "Critical dependency: require
   * function is used in a way in which dependencies cannot be statically
   * extracted". Bundling it anyway produces a function that builds cleanly and
   * then cannot find its own decoder once deployed, which is the worst shape a
   * failure can take: invisible here, certain there.
   *
   * These are server-only, reached from app/api/heic-convert. Nothing in this
   * list is shipped to a browser.
   */
  serverExternalPackages: ['heic-convert', 'heic-decode', 'libheif-js'],

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
      /* ------------------------------------------------------------------
       * WHO THE OPTIMISER MAY FETCH FROM
       * ------------------------------------------------------------------
       * Every entry here is a host whose content /_next/image will fetch and
       * re-serve from this origin, billed to this project. A wildcard is
       * therefore not a convenience, it is an open image proxy: `**.supabase.co`
       * meant anybody with a free Supabase project could have their images
       * served under this domain, consuming transformations and laundering
       * third-party content under the site's brand.
       *
       * Verified against the deployment before this change — the hostnames
       * were accepted and upstream requests were made:
       *
       *   evil-other-project.supabase.co/storage/…   -> 502 (host accepted)
       *   attacker.googleusercontent.com/x.jpg       -> 404 (host accepted)
       *   example.com/a.jpg                          -> 400 (refused)
       *   169.254.169.254/latest/meta-data/          -> 400 (refused)
       *
       * The 400s are worth recording too: there is no SSRF here, because the
       * optimiser pins the scheme and rejects unlisted hosts outright. This was
       * an open image proxy, which is a narrower problem than it first reads as.
       * ------------------------------------------------------------------ */
      /* Enumerated, because neither wildcard is narrow enough and the first
         attempt at this proved it. `**.googleusercontent.com` obviously
         matched anything; `*.googleusercontent.com` was tried as the fix and
         measured against the deployment:

           lh3.googleusercontent.com       -> 200
           attacker.googleusercontent.com  -> 404   still accepted

         404 rather than 400 means the host passed and the fetch happened —
         `attacker` is one label exactly like `lh3`, so a single-label wildcard
         cannot tell them apart, and Next has no mid-label pattern to express
         "lh followed by digits". So the hosts are listed.

         lh1 through lh9 covers what migration 0007's CHECK permits
         (lh[0-9]+.googleusercontent.com); Google serves from lh3 upward in
         practice, and an avatar the database accepted must not be one the
         optimiser refuses. */
      ...Array.from({ length: 9 }, (_, i) => ({
        protocol: 'https' as const,
        hostname: `lh${i + 1}.googleusercontent.com`,
        pathname: '/**' as const,
      })),
      /* This project's storage bucket and no other. The ref is read from the
         same variable the client uses, so preview and local point at whatever
         project they are configured against rather than at all of them; the
         literal is the production ref, used when the variable is absent at
         build time. It is not a secret — it is in every page of the bundle. */
      {
        protocol: 'https',
        hostname: SUPABASE_HOSTNAME,
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

/* ============================================================================
 * ERROR REPORTING
 * ----------------------------------------------------------------------------
 * `tunnelRoute` is the setting that makes this work at all here, for two
 * reasons that would each have made it silently useless:
 *
 *   The CSP is `connect-src 'self' https://*.supabase.co`. A browser posting an
 *   error to ingest.sentry.io would be blocked by our own policy — and blocked
 *   silently, which is precisely the failure this whole exercise exists to end.
 *
 *   Ad and tracker blockers block sentry.io by name. A meaningful share of
 *   visitors would report nothing, and the errors that went missing would be
 *   exactly the ones from the people running the strictest browsers.
 *
 * Tunnelling routes events through /monitoring on this origin, so `'self'`
 * already covers it and no blocklist recognises it. The CSP does not need
 * widening, which is the better outcome: a monitoring tool should not cost the
 * site a hole in its own policy.
 *
 * Source maps are uploaded and then deleted from the bundle, so a stack trace
 * is readable in Sentry and the client still ships nothing that maps minified
 * code back to source.
 * ========================================================================== */
export default withSentryConfig(nextConfig, {
  silent: true,
  /* No tunnelRoute, because nothing in the browser reports any more — see the
     measurement at the top of instrumentation.ts. If a client SDK is ever added
     back, add it again in the same commit: the CSP is
     `connect-src 'self' https://*.supabase.co`, so a browser posting straight
     to ingest.sentry.io is blocked by our own policy, silently, which is the
     exact failure this was meant to end. */
  widenClientFileUpload: false,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  /* Build-time exclusions. Setting tracesSampleRate to 0 stops events being
     sent but leaves the code in the bundle — only these flags actually remove
     it, and on a site that just spent real effort deleting 37 kB of animation
     library, shipping an unused tracer would be the same mistake wearing a
     different hat. */
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },
  /* Only uploads when a token is present, so a local build or a fork does not
     fail on a missing credential. */
  telemetry: false,
});
