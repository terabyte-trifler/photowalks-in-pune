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
