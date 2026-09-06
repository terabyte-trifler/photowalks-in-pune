import type { MetadataRoute } from 'next';
import { upcomingWalks } from '@/data/events';
import { site } from '@/data/site';
import { getSupabasePublicClient } from '@/lib/supabase/public';

/* ============================================================================
 * SITEMAP
 * ----------------------------------------------------------------------------
 * Without this, the only way into a photographer's profile is by crawling the
 * directory — twelve cards a page, behind query parameters a crawler is under
 * no obligation to follow. The walks were worse: /walks/[slug] is linked from
 * the homepage list, but a walk that scrolls off it is reachable from nowhere.
 *
 * So the map is generated rather than typed. Walks come from data/events.ts
 * and profiles from the same public view the directory reads, which means a
 * member who joins today is in the sitemap on the next revalidation without
 * anybody remembering to add them.
 *
 * WHAT IS DELIBERATELY ABSENT
 * /login, /signup, /settings, /my-walks, /profile and the password screens.
 * They are either private, or a form with nothing to rank for. They also carry
 * `robots: { index: false }` — a sitemap is a suggestion and noindex is an
 * instruction, and the two should not contradict each other.
 *
 * lastModified is honest where it can be. A profile knows when it was last
 * edited; a static page does not, so it does not claim to.
 * ========================================================================== */

/** Revalidated hourly — new members and new walks are not urgent. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.seo.url.replace(/\/$/, '');

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/photographers`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  /* Every walk in the file, past ones included: a walk that has happened still
     has photographs under it and is still the thing somebody searches for by
     name months later. */
  const walkRoutes: MetadataRoute.Sitemap = upcomingWalks.map((walk) => ({
    url: `${base}/walks/${walk.slug}`,
    lastModified: new Date(walk.date),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  /* Profiles are public by design (see the RLS note in migration 0001), so
     they belong here. Read through the cookie-free client: touching a cookie
     is a dynamic API and this route is meant to be cached. */
  let profileRoutes: MetadataRoute.Sitemap = [];
  const supabase = getSupabasePublicClient();
  if (supabase) {
    const { data } = await supabase
      .from('photographer_cards')
      .select('username, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5000);

    profileRoutes = ((data ?? []) as { username: string; updated_at: string | null }[]).map(
      (row) => ({
        url: `${base}/photographers/${row.username}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.6,
      }),
    );
  }

  return [...staticRoutes, ...walkRoutes, ...profileRoutes];
}
