/* ============================================================================
 * DELETE ACCOUNT
 * ----------------------------------------------------------------------------
 * Lets a member delete themselves, and take everything with them.
 *
 * WHY THIS IS A FUNCTION AND NOT A SERVER ACTION
 * Removing a row from auth.users needs the service-role key, and that key
 * bypasses Row Level Security for the entire project. Putting it in the Next
 * app's environment would mean every server action in the codebase runs beside
 * a key that can read and write anything, forever, to save one feature. Here
 * it is injected by Supabase into a single function that does one thing.
 *
 * WHO CAN CALL IT
 * Deployed with JWT verification on, so Supabase rejects anything without a
 * valid token before this code runs. The user id is then read from that token
 * — never from the request body — so the only account anybody can delete is
 * their own. There is no parameter for whose account to remove, deliberately.
 *
 * WHAT GOES
 *   auth.users row     deleted here
 *   profiles           cascades from it
 *   photos             cascades from profiles
 *   walk_rsvps         cascades from profiles
 *   storage files      the on_auth_user_deleted trigger calls purge-user-storage
 * ========================================================================== */

import { createClient } from 'jsr:@supabase/supabase-js@2';

/* ============================================================================
 * WHO MAY CALL THIS FROM A BROWSER
 * ----------------------------------------------------------------------------
 * This was `Access-Control-Allow-Origin: *`, and an audit judged that safe —
 * correctly. The function authorises on a bearer token the caller has to put
 * in a header, not on an ambient cookie, and a page on another origin cannot
 * read this site's cookies to obtain one. A wide CORS header hands a stranger
 * nothing, because they have nothing to send.
 *
 * It is narrowed anyway. `*` states an intention the app does not have — no
 * other origin has any business calling this — and the cost of being precise
 * is one array. Anything not on the list simply gets no CORS headers back, so
 * the browser refuses the response.
 * ========================================================================== */
const ALLOWED_ORIGINS = [
  'https://photowalks-in-pune-gold.vercel.app',
  'http://localhost:3000',
  'http://localhost:3100',
];

function corsFor(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  /* Preview deployments get their own hostname per build, so match the shape
     rather than listing them. */
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/photowalks-in-pune[a-z0-9-]*\.vercel\.app$/.test(origin);
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

Deno.serve(async (request: Request): Promise<Response> => {
  const cors = corsFor(request);
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return new Response(JSON.stringify({ error: 'Not signed in.' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL')!;

  /* Resolve the caller from their own token. This is the only place the
     identity comes from, which is what makes "delete my account" incapable of
     deleting anybody else's. */
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: userResult, error: userError } = await caller.auth.getUser();
  if (userError || !userResult?.user) {
    return new Response(JSON.stringify({ error: 'Your session has expired.' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const userId = userResult.user.id;

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  /* Storage is cleared by the trigger on auth.users, but do it here too and
     wait for it: the trigger is asynchronous, and somebody who has just asked
     to be forgotten should not have their photographs outlive the request by
     even a few seconds if it can be helped. Deleting twice is harmless. */
  for (const bucket of ['photos', 'avatars']) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 100 });
    if (files && files.length > 0) {
      await admin.storage.from(bucket).remove(files.map((file) => `${userId}/${file.name}`));
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
