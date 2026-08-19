#!/usr/bin/env node
/* ============================================================================
 * PRUNE ORPHANED IMAGES
 * ----------------------------------------------------------------------------
 * Deletes files in Storage that nothing points at any more:
 *
 *   - every file under photos/<uid>/ with no matching row in public.photos
 *   - every file under avatars/<uid>/ that no profile's avatar_url references
 *   - everything belonging to a uid that is no longer in auth.users
 *
 * WHY THIS IS A SCRIPT AND NOT A TRIGGER
 * Deleting an account cascades its `photos` rows away, but nothing reaches
 * into a bucket — there is no foreign key from Postgres to object storage.
 * The tempting fix is a trigger on auth.users that deletes from
 * storage.objects, and it is a trap: that table holds the *metadata*, while
 * the bytes live in S3. Removing the row makes the file invisible to the
 * Storage API, which means nothing can ever list or delete it again. The
 * bytes are then stranded and still billed. The Storage API is the only thing
 * that removes both halves, so this runs outside the database.
 *
 * USAGE
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/prune-storage.mjs          # report only
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/prune-storage.mjs --apply  # delete
 *
 * It reports by default and deletes nothing without --apply.
 *
 * The service-role key bypasses Row Level Security, which is exactly why this
 * is a script you run from a terminal and never anything the browser loads.
 * Pass it on the command line or from a secret store; do not put it in
 * .env.local next to the NEXT_PUBLIC_ variables.
 * ========================================================================== */

import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');

if (!URL_ || !KEY) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(URL_, KEY, { auth: { persistSession: false } });
const BUCKETS = ['photos', 'avatars'];

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

/** Storage has no "list everything" call, so walk the uid folders. */
async function listFolder(bucket, uid) {
  const files = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(uid, { limit: pageSize, offset });
    if (error) throw new Error(`listing ${bucket}/${uid}: ${error.message}`);
    files.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) break;
  }
  return files;
}

async function main() {
  console.log(APPLY ? 'PRUNING (files will be deleted)\n' : 'DRY RUN — nothing will be deleted\n');

  /* Who still exists, and what is still referenced. */
  const users = new Set();
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listing users: ${error.message}`);
    data.users.forEach((u) => users.add(u.id));
    if (data.users.length < 200) break;
  }

  const { data: photoRows, error: photoErr } = await admin.from('photos').select('storage_path');
  if (photoErr) throw new Error(`reading photos: ${photoErr.message}`);
  const keptPhotos = new Set((photoRows ?? []).map((r) => r.storage_path));

  const { data: profiles, error: profileErr } = await admin.from('profiles').select('avatar_url');
  if (profileErr) throw new Error(`reading profiles: ${profileErr.message}`);
  const keptAvatars = new Set(
    (profiles ?? [])
      .map((p) => p.avatar_url)
      .filter(Boolean)
      .map((url) => {
        const marker = '/storage/v1/object/public/avatars/';
        const at = url.indexOf(marker);
        return at === -1 ? null : url.slice(at + marker.length);
      })
      .filter(Boolean),
  );

  /* Folders are named after the uid that owns them. Collect the ones present
     in storage, including uids whose account has since been deleted. */
  const folders = new Map(BUCKETS.map((b) => [b, new Set()]));
  for (const bucket of BUCKETS) {
    const { data, error } = await admin.storage.from(bucket).list('', { limit: 1000 });
    if (error) throw new Error(`listing ${bucket}: ${error.message}`);
    for (const entry of data ?? []) {
      /* A folder comes back with no id; a file at the root has one. */
      if (entry.id === null) folders.get(bucket).add(entry.name);
    }
  }

  let orphanCount = 0;
  let orphanBytes = 0;

  for (const bucket of BUCKETS) {
    const kept = bucket === 'photos' ? keptPhotos : keptAvatars;

    for (const uid of folders.get(bucket)) {
      const files = await listFolder(bucket, uid);
      const gone = !users.has(uid);

      const orphans = files.filter((f) => gone || !kept.has(`${uid}/${f.name}`));
      if (orphans.length === 0) continue;

      const reason = gone ? 'account deleted' : 'no row points at it';
      console.log(`${bucket}/${uid}  — ${orphans.length} orphaned (${reason})`);

      for (const file of orphans) {
        const size = file.metadata?.size ?? 0;
        orphanCount += 1;
        orphanBytes += size;
        console.log(`    ${file.name}  ${kb(size)}`);
      }

      if (APPLY) {
        const paths = orphans.map((f) => `${uid}/${f.name}`);
        const { error } = await admin.storage.from(bucket).remove(paths);
        console.log(error ? `    FAILED: ${error.message}` : `    removed ${paths.length}`);
      }
    }
  }

  console.log('');
  if (orphanCount === 0) {
    console.log('Nothing orphaned. Storage matches the database.');
  } else if (APPLY) {
    console.log(`Removed ${orphanCount} files, ${kb(orphanBytes)} reclaimed.`);
  } else {
    console.log(`${orphanCount} files orphaned, ${kb(orphanBytes)}. Re-run with --apply to delete them.`);
  }
}

main().catch((error) => {
  console.error(String(error.message ?? error));
  process.exit(1);
});
