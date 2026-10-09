#!/usr/bin/env node
/* ============================================================================
 * ARCHIVE WALK PHOTOGRAPHS INTO THE REPO
 * ----------------------------------------------------------------------------
 * A photograph filed under a walk lives in Supabase Storage and belongs to the
 * profile that uploaded it. Delete it from the profile and it used to vanish
 * from the walk page too. This copies every walk-tagged photograph into
 * /public, so the walk keeps its record whatever happens to the upload — and
 * the copy costs nothing in Storage or its egress, because it ships with the
 * site as a static file.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run photos:archive
 *   ... node scripts/archive-walk-photos.mjs --dry-run
 *
 * Then `npm run images:variants`, so the copies get AVIF/WebP ladders and are
 * served as plain files rather than through the billed optimiser. Commit both.
 *
 * Only the anon key is needed: photos and profiles are public to read, and so
 * is the photos bucket.
 *
 * WHAT IT WRITES
 *   public/images/walk-archive/<walk id>/<photo id>.<ext>
 *   data/walk-archive.json
 *
 * WHAT IT NEVER DOES
 * Remove an entry. A photograph missing from the photos table has been deleted,
 * and keeping it is the whole point. Two things do change an entry:
 *   - still in the table, retagged to another walk  -> eventId follows it
 *   - still in the table, untagged from every walk   -> eventId becomes null
 *     and it stops showing on any walk; the file stays in case it comes back
 *
 * TO TAKE ONE DOWN (a photographer asks, an account is deleted)
 * Set `"hidden": true` on its entry, or delete the entry and its file. The
 * script never clears `hidden`.
 * ========================================================================== */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const archivePath = join(root, 'data/walk-archive.json');
const filesDir = join(root, 'public/images/walk-archive');

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const DRY = process.argv.includes('--dry-run');

if (!URL_ || !KEY) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(URL_, KEY, { auth: { persistSession: false } });

/** Every row of a select, a thousand at a time — PostgREST's default cap. */
async function all(build) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const tagged = await all(() =>
  supabase
    .from('photos')
    .select(
      'id, storage_path, caption, event_id, width, height, created_at, profiles!inner(full_name, username)',
    )
    .not('event_id', 'is', null)
    .order('created_at'),
);

/* Every id with its current tag, tagged or not, to tell a deleted photograph
   from one that was only untagged. */
const current = new Map(
  (await all(() => supabase.from('photos').select('id, event_id').order('id'))).map((r) => [
    r.id,
    r.event_id,
  ]),
);

const archive = existsSync(archivePath) ? JSON.parse(readFileSync(archivePath, 'utf8')) : [];
const byId = new Map(archive.map((entry) => [entry.id, entry]));

let added = 0;
let updated = 0;
let failed = 0;

for (const row of tagged) {
  const credit = {
    photographerName: row.profiles?.full_name ?? null,
    photographerUsername: row.profiles?.username ?? null,
  };
  const existing = byId.get(row.id);

  if (existing) {
    /* Keep the copy in step with edits made while the original still exists. */
    const next = { ...existing, eventId: row.event_id, caption: row.caption, ...credit };
    if (JSON.stringify(next) !== JSON.stringify(existing)) {
      byId.set(row.id, next);
      updated += 1;
    }
    continue;
  }

  const ext = (extname(row.storage_path) || '.jpg').toLowerCase();
  const relative = `${row.event_id}/${row.id}${ext}`;
  const target = join(filesDir, relative);
  const source = `${URL_}/storage/v1/object/public/photos/${row.storage_path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  if (!DRY) {
    const response = await fetch(source);
    if (!response.ok) {
      console.log(`  failed ${response.status}  ${row.id}  ${row.storage_path}`);
      failed += 1;
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  }

  byId.set(row.id, {
    id: row.id,
    eventId: row.event_id,
    src: `/images/walk-archive/${relative}`,
    caption: row.caption,
    width: row.width,
    height: row.height,
    ...credit,
    createdAt: row.created_at,
    archivedAt: new Date().toISOString(),
  });
  added += 1;
  console.log(`  archived  ${relative}`);
}

/* Archived, still in the table, no longer tagged: it was untagged, not
   deleted, so it leaves the walk. */
let untagged = 0;
for (const entry of byId.values()) {
  if (current.has(entry.id) && current.get(entry.id) === null && entry.eventId !== null) {
    entry.eventId = null;
    untagged += 1;
  }
}

const deleted = [...byId.values()].filter((entry) => !current.has(entry.id)).length;
const result = [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

console.log(
  `\n${tagged.length} tagged in Storage · ${added} archived · ${updated} updated · ` +
    `${untagged} untagged · ${deleted} kept after deletion · ${failed} failed`,
);

if (DRY) {
  console.log('Dry run — nothing written.');
} else {
  writeFileSync(archivePath, `${JSON.stringify(result, null, 2)}\n`);
  if (added > 0) console.log('Now run `npm run images:variants`, then commit.');
}
