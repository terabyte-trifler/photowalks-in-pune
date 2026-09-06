#!/usr/bin/env node
/* ============================================================================
 * REFRESH THE DISPOSABLE-DOMAIN BLOCKLIST
 * ----------------------------------------------------------------------------
 * Fills public.blocked_email_domains, which the signup-guard hook reads. Run it
 * occasionally — the list moves slowly and nothing breaks while it is stale.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run email:blocklist
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/refresh-disposable-domains.mjs --dry-run
 *
 * WHICH LIST, AND WHY THE SMALL ONE
 * disposable-email-domains has been curated since 2014 and carries about 8,700
 * domains. Aggregated lists exist with 196,000, built by merging thirty-odd
 * sources, and the extra 187,000 are not free: every one is a domain somebody
 * asserted was disposable, unreviewed. A false positive here is a person who
 * cannot join and is told their real email address is fake — the worst error
 * this feature can make, and an invisible one, because they leave rather than
 * report it. Coverage is worth less than precision when the cost is asymmetric.
 *
 * THE PROTECTED SET
 * Whatever the list says, the providers below are never inserted. This is a
 * seatbelt against a bad upstream commit: these domains cover a large share of
 * real signups, and a list that briefly contains gmail.com would otherwise take
 * the site's signups down until somebody noticed.
 * ========================================================================== */

import { createClient } from '@supabase/supabase-js';

const SOURCE_NAME = 'disposable-email-domains';
const SOURCE_URL =
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';

const PROTECTED = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.co.in', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'zoho.com', 'zohomail.in',
  'rediffmail.com', 'aol.com', 'gmx.com', 'fastmail.com',
]);

/* Must agree with blocked_email_domains_shape in migration 0017; a row that
   fails it takes the whole batch down. */
const SHAPE = /^[a-z0-9.-]+\.[a-z]{2,}$/;

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry-run');

if (!URL_ || !KEY) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(URL_, KEY, { auth: { persistSession: false } });

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`fetching the list: ${response.status}`);

const seen = new Set();
const rejected = [];
const protectedHits = [];

for (const line of (await response.text()).split('\n')) {
  const domain = line.trim().toLowerCase();
  if (!domain || domain.startsWith('#')) continue;
  if (PROTECTED.has(domain)) {
    protectedHits.push(domain);
    continue;
  }
  if (!SHAPE.test(domain)) {
    rejected.push(domain);
    continue;
  }
  seen.add(domain);
}

console.log(`${seen.size} domains from ${SOURCE_NAME}`);
if (rejected.length) console.log(`  ${rejected.length} skipped, wrong shape: ${rejected.slice(0, 5).join(', ')}`);
if (protectedHits.length) {
  console.log(`  !! ${protectedHits.length} PROTECTED domains were in the list and were NOT inserted:`);
  console.log(`     ${protectedHits.join(', ')}`);
  console.log('     Worth reporting upstream — that is a bad entry, not a policy.');
}

const { data: existingRows, error: readError } = await admin
  .from('blocked_email_domains')
  .select('domain')
  .eq('source', SOURCE_NAME);
if (readError) throw new Error(`reading the table: ${readError.message}`);

const existing = new Set((existingRows ?? []).map((r) => r.domain));
const toAdd = [...seen].filter((d) => !existing.has(d));
/* Dropped upstream — a domain that stopped being disposable, or was a mistake.
   Only ever removes rows this script inserted; anything added by hand has a
   different `source` and is left alone. */
const toRemove = [...existing].filter((d) => !seen.has(d));

console.log(`\n  ${existing.size} currently stored · ${toAdd.length} to add · ${toRemove.length} to remove`);

if (DRY) {
  console.log('\n(dry run — nothing written)');
  process.exit(0);
}

/* Chunked because PostgREST will not take 8,700 rows in one statement. */
const CHUNK = 1000;
for (let i = 0; i < toAdd.length; i += CHUNK) {
  const batch = toAdd.slice(i, i + CHUNK).map((domain) => ({ domain, source: SOURCE_NAME }));
  const { error } = await admin.from('blocked_email_domains').upsert(batch, { onConflict: 'domain' });
  if (error) throw new Error(`inserting: ${error.message}`);
  process.stdout.write(`\r  added ${Math.min(i + CHUNK, toAdd.length)}/${toAdd.length}`);
}
if (toAdd.length) process.stdout.write('\n');

for (let i = 0; i < toRemove.length; i += CHUNK) {
  const batch = toRemove.slice(i, i + CHUNK);
  const { error } = await admin
    .from('blocked_email_domains')
    .delete()
    .eq('source', SOURCE_NAME)
    .in('domain', batch);
  if (error) throw new Error(`removing: ${error.message}`);
}

const { count } = await admin
  .from('blocked_email_domains')
  .select('domain', { count: 'exact', head: true });
console.log(`\n${count} domains now blocked at signup.`);
