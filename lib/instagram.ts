/* ============================================================================
 * INSTAGRAM
 * ----------------------------------------------------------------------------
 * Pulls the community account's own posts through the Instagram Graph API and
 * falls back to the local placeholders when no token is configured, so the
 * section renders either way and never half-renders.
 *
 * WHY THE API AND NOT THE PAGE
 * Reading instagram.com and pulling the image URLs out of it is against
 * Meta's terms, and it does not work for long anyway: the CDN URLs it yields
 * are signed and expire within hours, so a grid built that way is broken by
 * the next morning. The tokened endpoint below returns URLs that keep working
 * and is the access Meta actually grants for an account you own.
 *
 * ---- GETTING A TOKEN -------------------------------------------------------
 * The account must be a Business or Creator account (Instagram app →
 * Settings → Account type). Then, at developers.facebook.com:
 *
 *   1. Create an app, type "Business".
 *   2. Add the "Instagram" product and connect @photowalksinpune.
 *   3. Generate a user token with `instagram_business_basic`.
 *   4. Exchange it for a long-lived token (60 days):
 *
 *      curl -s "https://graph.instagram.com/access_token\
 *        ?grant_type=ig_exchange_token\
 *        &client_secret=<APP_SECRET>\
 *        &access_token=<SHORT_LIVED_TOKEN>"
 *
 *   5. Put the result in INSTAGRAM_ACCESS_TOKEN.
 *
 * Long-lived tokens last 60 days and are refreshable for another 60 any time
 * they are used within that window — `refreshInstagramToken` below does the
 * call. Diarise it, because a silently expired token is the most likely way
 * this section goes stale.
 * ========================================================================== */

import { instagramPosts, type InstagramPost } from '@/data/community';

/** How long a fetched batch is cached. Posts are not urgent. */
export const INSTAGRAM_REVALIDATE_SECONDS = 3600;

const ENDPOINT = 'https://graph.instagram.com/me/media';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

export const isInstagramConfigured = (): boolean =>
  Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);

interface GraphMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp?: string;
}

/**
 * Captions on Instagram are paragraphs; this grid has room for a line. Take
 * the first sentence or so and never cut a word in half.
 */
function shortCaption(caption: string | undefined): string {
  const text = (caption ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Photowalks in Pune';
  const firstLine = text.split(/[.\n·|—]/)[0].trim() || text;
  if (firstLine.length <= 60) return firstLine;
  const clipped = firstLine.slice(0, 60);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 20 ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
}

/**
 * The six most recent posts. Videos and carousels are included: a carousel
 * reports its first image in `media_url`, and a video has a `thumbnail_url`,
 * so both still give the grid a square to show.
 */
export async function getInstagramPosts(limit = 6): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return instagramPosts.slice(0, limit);

  try {
    const url = `${ENDPOINT}?fields=${FIELDS}&limit=${limit}&access_token=${token}`;
    const response = await fetch(url, {
      next: { revalidate: INSTAGRAM_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      /* An expired or revoked token is the usual cause. Falling back keeps the
         page whole rather than leaving a hole where the grid was. */
      return instagramPosts.slice(0, limit);
    }

    const payload = (await response.json()) as { data?: GraphMedia[] };
    const media = payload.data ?? [];

    const posts = media
      .map((item): InstagramPost | null => {
        const image = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
        if (!image) return null;
        return {
          id: item.id,
          image,
          permalink: item.permalink,
          caption: shortCaption(item.caption),
        };
      })
      .filter((post): post is InstagramPost => post !== null);

    return posts.length > 0 ? posts : instagramPosts.slice(0, limit);
  } catch {
    return instagramPosts.slice(0, limit);
  }
}

/**
 * Extend a long-lived token by another 60 days. Meta only refreshes tokens
 * that are at least 24 hours old and not yet expired, so this is something to
 * run on a schedule — monthly is comfortable — rather than on a request.
 *
 * Returns the new token; storing it is the caller's business, because it
 * belongs in whatever holds INSTAGRAM_ACCESS_TOKEN rather than in the app.
 */
export async function refreshInstagramToken(): Promise<
  { ok: true; token: string; expiresInDays: number } | { ok: false; error: string }
> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return { ok: false, error: 'INSTAGRAM_ACCESS_TOKEN is not set.' };

  try {
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      return { ok: false, error: `Instagram refused the refresh (${response.status}).` };
    }
    const data = (await response.json()) as { access_token: string; expires_in: number };
    return {
      ok: true,
      token: data.access_token,
      expiresInDays: Math.round(data.expires_in / 86400),
    };
  } catch {
    return { ok: false, error: 'Could not reach Instagram.' };
  }
}
