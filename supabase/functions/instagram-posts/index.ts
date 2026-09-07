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

  const stored = (rows ?? [])[0] as {
    token: string;
    refreshed_at: string | null;
    refresh_failed_at?: string | null;
    refresh_error?: string | null;
  } | undefined;

  /* No secret in the vault. Not an error — it is a site without Instagram
     configured, and the app falls back to its local photographs. */
  if (!stored?.token) return json({ configured: false, posts: [] });

  let token = stored.token;
  let rotated = false;
  let refreshError: string | null = null;

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
        /* Refused. Carry on with the stored token — Meta also refuses for
           reasons we can retry past — but WRITE IT DOWN. A console.warn is
           what let the last token die: the refusal repeated for weeks while
           the site answered 200 and looked healthy, and by the time anybody
           looked, refresh could no longer recover it. The note does not touch
           the token or its refreshed_at, so the next tick still retries. */
        const detail = `${res.status}: ${(await res.text()).slice(0, 300)}`;
        console.warn(`[instagram] refresh refused (${detail})`);
        refreshError = detail;
        await supabase.rpc('instagram_token_note_failure', { reason: detail });
      }
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      console.warn('[instagram] refresh could not be attempted', detail);
      refreshError = detail;
      await supabase.rpc('instagram_token_note_failure', { reason: detail });
    }
  }

  /* One place that asks for the media, so the retry below is the same request
     rather than a second copy of it that can drift. */
  const askForMedia = (accessToken: string) =>
    fetch(
      `${GRAPH}/me/media?fields=${FIELDS}&limit=${limit}` +
        `&access_token=${encodeURIComponent(accessToken)}`,
    );

  try {
    let res = await askForMedia(token);

    /* An auth failure here is the one moment the system KNOWS the token is
       wrong, and until now it was also the one moment it did nothing about it:
       refresh ran on the age schedule and never in response to the evidence.
       So try once, if a refresh has not already been attempted this call.
       Meta will refuse for an expired token — that refusal is recorded, which
       is how the vault comes to say why the site went quiet. */
    if ((res.status === 400 || res.status === 401) && !rotated) {
      const body = await res.clone().text();
      console.warn(`[instagram] media refused (${res.status}), attempting a refresh: ${body.slice(0, 200)}`);

      try {
        const refresh = await fetch(
          `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token` +
            `&access_token=${encodeURIComponent(token)}`,
        );

        if (refresh.ok) {
          const refreshed = await refresh.json() as { access_token?: string };
          if (refreshed.access_token) {
            const { error: writeError } = await supabase.rpc('instagram_token_write', {
              new_token: refreshed.access_token,
            });
            if (!writeError) {
              token = refreshed.access_token;
              rotated = true;
              refreshError = null;
              res = await askForMedia(token);
            }
          }
        } else {
          const detail = `${refresh.status}: ${(await refresh.text()).slice(0, 300)}`;
          refreshError = detail;
          await supabase.rpc('instagram_token_note_failure', { reason: `media auth: ${detail}` });
        }
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        refreshError = detail;
        await supabase.rpc('instagram_token_note_failure', { reason: `media auth: ${detail}` });
      }
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`[instagram] media request failed (${res.status}): ${body}`);

      /* Told apart on purpose. "Fix the token" and "Meta is having a moment"
         need different reactions, and answering the same 502 to both is why
         the last outage had to be diagnosed by reading source. */
      const expired = res.status === 400 || res.status === 401;
      return json(
        {
          error: expired ? 'token rejected' : 'media unavailable',
          tokenRejected: expired,
          rotated,
          refreshError,
          refreshFailedAt: stored.refresh_failed_at ?? null,
          posts: [],
        },
        502,
      );
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

    return json({ configured: true, rotated, refreshError, posts });
  } catch (cause) {
    console.error('[instagram] media request errored', cause);
    return json({ error: 'media unavailable', rotated, posts: [] }, 502);
  }
});
