/* ============================================================================
 * PURGE USER STORAGE
 * ----------------------------------------------------------------------------
 * Deletes everything a member had in Storage the moment their account goes.
 *
 * Deleting an account cascades their rows away, but nothing reaches into a
 * bucket — there is no foreign key from Postgres to object storage. Without
 * this, the files stay: invisible, permanent, still billed. The database
 * cannot delete them itself either, because removing a row from
 * storage.objects only drops the metadata and strands the bytes in S3 where
 * nothing can ever list them again. Only the Storage API removes both halves,
 * which is why this runs out here.
 *
 * Called by the on_auth_user_deleted trigger (migration 0006) through pg_net,
 * with a shared secret this checks before doing anything.
 * ========================================================================== */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKETS = ['photos', 'avatars'];

/**
 * `!==` on a secret returns as soon as two bytes differ, so how long the answer
 * takes leaks how much of the guess was right. Over a network that signal is
 * buried in noise and this was never a practical way in — but a constant-time
 * comparison costs one function and removes the argument entirely.
 *
 * Length is compared first and separately: it is not secret (it is fixed by
 * whoever set PURGE_SECRET), and comparing byte arrays of different lengths
 * would otherwise short-circuit anyway.
 */
function secretsMatch(offered: string, expected: string): boolean {
  const a = new TextEncoder().encode(offered);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  /* The function is deployed without JWT verification, because the caller is
     a database trigger rather than a signed-in person. This is what stands in
     for that. */
  const expected = Deno.env.get('PURGE_SECRET');
  const offered = request.headers.get('x-purge-secret');
  if (!expected || !offered || !secretsMatch(offered, expected)) {
    return new Response('Forbidden', { status: 403 });
  }

  let userId: string | undefined;
  try {
    const body = await request.json();
    /* Sent by the trigger; `old_record` is the shape a Supabase webhook uses. */
    userId = body?.user_id ?? body?.old_record?.id ?? body?.record?.id;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return new Response('Bad request', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const removed: Record<string, number> = {};

  for (const bucket of BUCKETS) {
    let total = 0;
    /* Page through, because a member may hold up to twenty photographs plus
       whatever avatars they replaced along the way. */
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(userId, { limit: 100, offset });

      if (error) {
        return new Response(JSON.stringify({ error: error.message, bucket }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (!data || data.length === 0) break;

      const paths = data.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) {
        return new Response(JSON.stringify({ error: removeError.message, bucket }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      total += paths.length;

      if (data.length < 100) break;
    }
    removed[bucket] = total;
  }

  return new Response(JSON.stringify({ ok: true, userId, removed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
