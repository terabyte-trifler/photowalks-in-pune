import type { MetadataRoute } from 'next';
import { site } from '@/data/site';

/* ============================================================================
 * ROBOTS
 * ----------------------------------------------------------------------------
 * /robots.txt was a 404, which is not neutral: it is the first file most
 * crawlers ask for, and it is where a sitemap is conventionally announced.
 * Without it the sitemap has to be submitted by hand in Search Console and
 * every other crawler never learns it exists.
 *
 * The disallow list is not a security control — these paths are already
 * guarded by middleware and by row level security, and robots.txt is a public
 * file that reads as a list of interesting places to anyone who fetches it.
 * It is here to stop crawl budget being spent on screens that redirect to
 * /login, and to keep auth pages out of results where they would be a
 * confusing thing to land on from a search.
 *
 * /auth/callback is listed for a different reason: it is the OAuth landing
 * route, it only ever appears with single-use tokens in the query string, and
 * a crawler following one would burn it.
 * ========================================================================== */

export default function robots(): MetadataRoute.Robots {
  const base = site.seo.url.replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/settings',
          '/my-walks',
          '/profile',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/auth/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
