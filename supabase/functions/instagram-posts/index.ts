/* ============================================================================
 * INSTAGRAM POSTS
 * ----------------------------------------------------------------------------
 * Returns the community account's most recent posts, and rotates the access
 * token on the way past.
 *
 * The app used to call graph.instagram.com itself with INSTAGRAM_ACCESS_TOKEN.
 * That worked, but the token expires after 60 days and refreshing it yields a
 * new string, which nothing on Vercel can store — so the grid went stale and
 * somebody had to notice. Here the token lives in the vault (migration 0013)
 * and this function refreshes it whenever it is old enough, so the only way it
 * lapses now is if nobody loads the site for a month.
 *
 * The service-role key this uses to reach the vault is injected by the
 * platform and stays inside Supabase. That is the point of running it here
 * rather than in the app.
 * ========================================================================== */

import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Meta gives 60 days. Rotating at 30 leaves a month of slack. */
const REFRESH_AFTER_DAYS = 30;

/** Meta refuses to refresh a token younger than this. */
const MIN_REFRESH_AGE_HOURS = 24;

const DAY_MS = 86_400_000;

const GRAPH = 'https://graph.instagram.com';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;

/** Matches InstagramPost in data/community.ts — the grid reads this shape. */
interface InstagramPost {
  id: string;
  image: string;
  permalink: string;
  caption: string;
}

interface GraphMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
}

/**
 * Captions on Instagram are paragraphs; the grid has room for a line. Kept
 * deliberately identical to shortCaption in lib/instagram.ts, so moving the
 * work out here did not quietly change how the tiles read.
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const requested = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: rows, error } = await supabase.rpc('instagram_token_read');
  if (error) {
    console.error('[instagram] could not read the token', error.message);
    return json({ error: 'token unavailable', posts: [] }, 500);
  }

  const stored = (rows ?? [])[0] as { token: string; refreshed_at: string | null } | undefined;

  /* No secret in the vault. Not an error — it is a site without Instagram
     configured, and the app falls back to its local photographs. */
  if (!stored?.token) return json({ configured: false, posts: [] });

  let token = stored.token;
  let rotated = false;

  /* A hand-pasted token has no date, so it is treated as due: better to spend
     one refresh than to discover in a month that it was already 50 days old. */
  const ageMs = stored.refreshed_at ? Date.now() - Date.parse(stored.refreshed_at) : Infinity;
  const dueForRefresh = ageMs >= REFRESH_AFTER_DAYS * DAY_MS;
  const oldEnoughToRefresh = ageMs >= MIN_REFRESH_AGE_HOURS * 3_600_000;

  if (dueForRefresh && oldEnoughToRefresh) {
    try {
      const res = await fetch(
        `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token` +
          `&access_token=${encodeURIComponent(token)}`,
      );

      if (res.ok) {
        const body = await res.json() as { access_token?: string };
        if (body.access_token) {
          const { error: writeError } = await supabase.rpc('instagram_token_write', {
            new_token: body.access_token,
          });

          /* Only adopt the new token once it is safely stored. If the write
             failed, the old one is still valid and still what the vault holds. */
          if (writeError) {
            console.error('[instagram] rotated token was not saved', writeError.message);
          } else {
            token = body.access_token;
            rotated = true;
          }
        }
      } else {
        /* Refused, but the stored token has not necessarily expired — Meta
           also refuses for reasons we can retry past. Carry on with it. */
        console.warn(`[instagram] refresh refused (${res.status}): ${await res.text()}`);
      }
    } catch (cause) {
      console.warn('[instagram] refresh could not be attempted', cause);
    }
  }

  try {
    const res = await fetch(
      `${GRAPH}/me/media?fields=${FIELDS}&limit=${limit}` +
        `&access_token=${encodeURIComponent(token)}`,
    );

    if (!res.ok) {
      console.error(`[instagram] media request failed (${res.status}): ${await res.text()}`);
      return json({ error: 'media unavailable', rotated, posts: [] }, 502);
    }

    const payload = await res.json() as { data?: GraphMedia[] };

    /* A carousel reports its first image in media_url and a video carries a
       thumbnail_url, so both still give the grid a square to show. */
    const posts: InstagramPost[] = (payload.data ?? [])
      .map((item) => {
        const image = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
        return image
          ? { id: item.id, image, permalink: item.permalink, caption: shortCaption(item.caption) }
          : null;
      })
      .filter((post): post is InstagramPost => post !== null);

    return json({ configured: true, rotated, posts });
  } catch (cause) {
    console.error('[instagram] media request errored', cause);
    return json({ error: 'media unavailable', rotated, posts: [] }, 502);
  }
});
