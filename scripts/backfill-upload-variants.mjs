#!/usr/bin/env node
/* ============================================================================
 * GIVE THE UPLOADS THAT PREDATE THE LADDER ONE
 * ----------------------------------------------------------------------------
 * lib/uploads.ts writes a ladder for every new upload, and Picture serves it
 * without touching the image optimiser. Everything uploaded before that has a
 * single file and no marker, so it keeps going through the optimiser forever —
 * correct, but the transformations this whole exercise was about.
 *
 * This makes the missing rungs, renames the primary into the ladder, and
 * repoints the row. It is the only script here that writes to the database and
 * deletes originals, so it reports and changes nothing unless told to:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-upload-variants.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-upload-variants.mjs --apply
 *
 * ORDER, AND WHY IT IS THIS ORDER
 *   1. upload the rungs, including the primary under its new ladder name
 *   2. point the row at the new primary
 *   3. only then delete the original file
 *
 * Interrupted anywhere, the site still works. After 1 the row still names the
 * old file, which is still there. After 2 the new files are all present. The
 * delete in 3 is the only destructive step and it happens once the row has
 * stopped referring to what it removes. Re-running skips anything already
 * carrying a marker, so a half-finished run is resumed rather than repeated.
 *
 * KEEP THE LADDER IN STEP with lib/images.ts, restated here for the same reason
 * as in prune-storage.mjs: this is node ESM and cannot import the TypeScript.
 * ========================================================================== */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');

if (!URL_ || !KEY) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(URL_, KEY, { auth: { persistSession: false } });

const LADDER = 1;
const RUNGS = { avatars: [128, 256], photos: [640, 1024, 1600] };
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const hasMarker = (path) => /-v\d+-\d+\.[a-z0-9]+$/i.test(path);
const splitPath = (path) => {
  const match = /^(.*)\.([a-z0-9]+)$/i.exec(path);
  return match ? { base: match[1], extension: match[2] } : null;
};

/** Encode to whatever the original already was; this is not a re-format pass. */
function encodeAs(pipeline, extension) {
  if (extension === 'png') return pipeline.png();
  if (extension === 'webp') return pipeline.webp({ quality: 80 });
  if (extension === 'avif') return pipeline.avif({ quality: 50, effort: 4 });
  return pipeline.jpeg({ quality: 80, progressive: true });
}

async function backfill(bucket, rows, repoint) {
  let done = 0;
  let skipped = 0;
  let bytes = 0;

  for (const { id, path } of rows) {
    if (!path || hasMarker(path)) {
      skipped += 1;
      continue;
    }
    const parts = splitPath(path);
    if (!parts) {
      console.log(`  ? ${bucket}/${path} — no extension, left alone`);
      skipped += 1;
      continue;
    }

    const { data, error } = await admin.storage.from(bucket).download(path);
    if (error || !data) {
      console.log(`  ! ${bucket}/${path} — download failed: ${error?.message ?? 'no body'}`);
      continue;
    }

    const original = Buffer.from(await data.arrayBuffer());
    const meta = await sharp(original).metadata();
    if (!meta.width || !meta.height) {
      console.log(`  ! ${bucket}/${path} — unreadable`);
      continue;
    }

    const widths = [...RUNGS[bucket].filter((w) => w < meta.width), meta.width];
    const primary = `${parts.base}-v${LADDER}-${meta.width}.${parts.extension}`;

    console.log(
      `  ${path}\n    -> ${widths.join(', ')}  (${kb(original.length)} original)`,
    );
    if (!APPLY) {
      done += 1;
      continue;
    }

    /* 1. every rung, primary included, under its ladder name */
    let wrote = true;
    for (const width of widths) {
      const at = `${parts.base}-v${LADDER}-${width}.${parts.extension}`;
      const body =
        width === meta.width
          ? original
          : await encodeAs(
              sharp(original).rotate().resize({ width, withoutEnlargement: true }),
              parts.extension,
            ).toBuffer();

      const { error: putError } = await admin.storage.from(bucket).upload(at, body, {
        cacheControl: '31536000',
        upsert: true,
        contentType: data.type || undefined,
      });
      if (putError) {
        console.log(`    ! ${at} — ${putError.message}`);
        wrote = false;
        break;
      }
      bytes += body.length;
    }
    if (!wrote) continue;

    /* 2. the row, before anything is removed */
    const repointed = await repoint(id, path, primary);
    if (!repointed) {
      console.log('    ! row not updated, original left in place');
      continue;
    }

    /* 3. and only now the original, which nothing points at any more */
    await admin.storage.from(bucket).remove([path]);
    done += 1;
  }

  return { done, skipped, bytes };
}

const { data: photos, error: photoError } = await admin
  .from('photos')
  .select('id, storage_path');
if (photoError) throw new Error(`reading photos: ${photoError.message}`);

const { data: profiles, error: profileError } = await admin
  .from('profiles')
  .select('id, avatar_url');
if (profileError) throw new Error(`reading profiles: ${profileError.message}`);

const AVATAR_MARKER = '/storage/v1/object/public/avatars/';

console.log(APPLY ? 'BACKFILLING (files and rows will change)\n' : 'DRY RUN — nothing will change\n');

console.log('photos');
const photoResult = await backfill(
  'photos',
  (photos ?? []).map((r) => ({ id: r.id, path: r.storage_path })),
  async (id, _old, primary) => {
    const { error } = await admin.from('photos').update({ storage_path: primary }).eq('id', id);
    return !error;
  },
);

console.log('\navatars');
const avatarResult = await backfill(
  'avatars',
  (profiles ?? [])
    .filter((p) => p.avatar_url?.includes(AVATAR_MARKER))
    .map((p) => ({ id: p.id, path: p.avatar_url.split(AVATAR_MARKER)[1] })),
  async (id, oldPath, primary) => {
    const { error } = await admin
      .from('profiles')
      .update({ avatar_url: `${URL_}${AVATAR_MARKER}${primary}` })
      .eq('id', id);
    return !error;
  },
);

const total = (a, b, key) => a[key] + b[key];
console.log(
  `\n${total(photoResult, avatarResult, 'done')} converted · ` +
    `${total(photoResult, avatarResult, 'skipped')} already had a ladder · ` +
    `${kb(total(photoResult, avatarResult, 'bytes'))} written`,
);
if (!APPLY) console.log('(dry run — re-run with --apply)');
