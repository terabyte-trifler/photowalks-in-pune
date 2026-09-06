#!/usr/bin/env node
/* ============================================================================
 * SYNC WALK CAPACITY INTO THE DATABASE
 * ----------------------------------------------------------------------------
 * data/events.ts is the source of truth for walks. public.walks holds the two
 * fields the database has to enforce, and this copies them across.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run walks:sync
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-walk-capacity.mjs --dry-run
 *
 * Run it after adding a walk or changing a capacity. Forgetting is not an
 * outage: an unknown walk is unenforced, which is how the site behaved before
 * the table existed. See migration 0021.
 *
 * It reads events.ts by regex rather than importing it, because the file is
 * TypeScript with JSX-free but typed exports and this is a plain node script.
 * The shapes it matches are the ones the file has used since it was written; if
 * a walk ever fails to appear here, that is why.
 * ========================================================================== */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry-run');

if (!URL_ || !KEY) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const source = readFileSync(join(root, 'data/events.ts'), 'utf8');
const ids = [...source.matchAll(/^\s*id: '([^']+)'/gm)].map((m) => m[1]);
const capacities = [...source.matchAll(/^\s*capacity: (\d+)/gm)].map((m) => Number(m[1]));

if (ids.length !== capacities.length) {
  console.error(
    `Found ${ids.length} ids but ${capacities.length} capacities in data/events.ts.\n` +
      'They are matched by position, so this must not happen — check the file.',
  );
  process.exit(1);
}

const walks = ids.map((id, i) => ({ id, capacity: capacities[i] }));
console.log(`${walks.length} walks in data/events.ts`);

const admin = createClient(URL_, KEY, { auth: { persistSession: false } });
const { data: stored, error: readError } = await admin.from('walks').select('id, capacity');
if (readError) throw new Error(`reading walks: ${readError.message}`);

const before = new Map((stored ?? []).map((w) => [w.id, w.capacity]));
const added = walks.filter((w) => !before.has(w.id));
const changed = walks.filter((w) => before.has(w.id) && before.get(w.id) !== w.capacity);
/* Left in place, not deleted: a walk removed from events.ts may still have
   RSVPs, and dropping its row would silently unenforce them. */
const orphaned = [...before.keys()].filter((id) => !walks.some((w) => w.id === id));

for (const w of added) console.log(`  + ${w.id} (capacity ${w.capacity})`);
for (const w of changed) console.log(`  ~ ${w.id} ${before.get(w.id)} -> ${w.capacity}`);
for (const id of orphaned) console.log(`  ? ${id} is in the table but not in events.ts — left alone`);

if (DRY) {
  console.log('\n(dry run — nothing written)');
  process.exit(0);
}

if (added.length === 0 && changed.length === 0) {
  console.log('\nAlready in step.');
  process.exit(0);
}

const { error } = await admin
  .from('walks')
  .upsert(walks.map((w) => ({ ...w, synced_at: new Date().toISOString() })), { onConflict: 'id' });
if (error) throw new Error(`writing walks: ${error.message}`);
console.log(`\n${added.length} added, ${changed.length} updated.`);
