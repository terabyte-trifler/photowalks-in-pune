#!/usr/bin/env node
/* ============================================================================
 * KEEP THE CSP HASH AND THE THEME SCRIPT IN STEP
 * ----------------------------------------------------------------------------
 * The inline theme script is allowed by hash rather than nonce, so the three
 * prerendered pages can stay prerendered. That means the hash in
 * lib/security/theme-script.ts has to match the script byte for byte.
 *
 * If they drift, the browser silently refuses the script and the white flash
 * comes back on every load — a symptom nobody reports as a bug, they just
 * think the site is janky. So it is checked rather than trusted.
 *
 *   npm run check:csp          verify
 *   npm run check:csp -- --fix rewrite the constant
 * ========================================================================== */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'lib/security/theme-script.ts');
const source = readFileSync(file, 'utf8');

const scriptMatch = source.match(/export const THEME_SCRIPT = `([^`]*)`/);
if (!scriptMatch) {
  console.error('Could not find THEME_SCRIPT in theme-script.ts');
  process.exit(1);
}

const actual = 'sha256-' + createHash('sha256').update(scriptMatch[1], 'utf8').digest('base64');
const recordedMatch = source.match(/export const THEME_SCRIPT_HASH = "([^"]*)"/);
const recorded = recordedMatch?.[1];

if (recorded === actual) {
  console.log(`\n  CSP hash matches the theme script.\n    ${actual}\n`);
  process.exit(0);
}

if (process.argv.includes('--fix')) {
  writeFileSync(file, source.replace(/export const THEME_SCRIPT_HASH = "[^"]*"/, `export const THEME_SCRIPT_HASH = "${actual}"`));
  console.log(`\n  Updated.\n    was ${recorded}\n    now ${actual}\n`);
  process.exit(0);
}

console.error(`\n  CSP hash does NOT match the theme script.\n    recorded ${recorded}\n    actual   ${actual}\n\n  The browser will refuse the script and the theme flash returns.\n  Fix with: npm run check:csp -- --fix\n`);
process.exit(1);
