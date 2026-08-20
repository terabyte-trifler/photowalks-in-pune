#!/usr/bin/env node
/* ============================================================================
 * PREPARE DROPPED-IN PHOTOGRAPHS
 * ----------------------------------------------------------------------------
 * The instruction "keep the filename, export at ~2400px, keep the hero under
 * 250 kB" asks somebody to do three fiddly things by hand for twenty-one
 * files. This does them instead. Copy the photograph straight off the camera
 * or the phone, at whatever size it happens to be, over the file it replaces:
 *
 *   cp ~/Pictures/kasba-peth.jpg public/images/walks/old-pune.jpg
 *   npm run images:prep
 *
 * WHAT IT DOES
 *   - resizes anything larger than 2400px on its long edge, never upscales
 *   - re-encodes progressive JPEG, and walks the quality down on the hero
 *     until it fits its budget, because that is the one image loaded with
 *     priority and it is what the page waits on
 *   - applies the EXIF orientation flag and then discards the EXIF
 *
 * THAT LAST POINT IS THE IMPORTANT ONE
 * A photograph off a phone carries EXIF, and EXIF carries GPS. Publishing it
 * untouched publishes the exact coordinates the picture was taken at, and on
 * a site about walking around a city with a camera that is a real disclosure —
 * for members, and for anybody who happens to be photographed at home. sharp
 * drops metadata unless asked to keep it, and this deliberately never asks.
 * The orientation flag is read first and baked into the pixels, so discarding
 * the rest cannot leave a photograph on its side.
 *
 * Files that are still untouched placeholders are skipped, so running this
 * before you have replaced anything does nothing, and running it twice is
 * harmless.
 *
 * USAGE
 *   npm run images:prep              # process replaced files in place
 *   node scripts/prepare-images.mjs --dry-run
 * ========================================================================== */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public/images');
const DRY = process.argv.includes('--dry-run');

const LONG_EDGE = 2400;
/** Only the hero has a hard budget: it is the one image loaded with priority. */
const BUDGETS = { 'hero/pune-hero.jpg': 250 * 1024 };
const DEFAULT_QUALITY = 82;
const QUALITY_LADDER = [82, 78, 74, 70, 66, 62, 58];

const { hashes } = JSON.parse(readFileSync(join(dir, 'placeholders.json'), 'utf8'));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const kb = (n) => `${Math.round(n / 1024)} kB`;

let processed = 0;
let skipped = 0;

for (const [rel, placeholderHash] of Object.entries(hashes)) {
  const full = join(dir, rel);
  if (!existsSync(full)) {
    console.log(`  missing   ${rel}`);
    continue;
  }

  const original = readFileSync(full);
  if (sha(original) === placeholderHash) {
    skipped += 1;
    continue;
  }

  const before = original.length;
  const meta = await sharp(original).metadata();
  const budget = BUDGETS[rel];

  /* .rotate() with no argument applies the EXIF orientation flag. Metadata is
     not carried forward — see the note at the top. */
  const base = () => {
    let pipeline = sharp(original).rotate();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (longest > LONG_EDGE) {
      pipeline = pipeline.resize({
        width: (meta.width ?? 0) >= (meta.height ?? 0) ? LONG_EDGE : undefined,
        height: (meta.height ?? 0) > (meta.width ?? 0) ? LONG_EDGE : undefined,
        withoutEnlargement: true,
      });
    }
    return pipeline;
  };

  let out = null;
  let usedQuality = DEFAULT_QUALITY;

  if (budget) {
    for (const q of QUALITY_LADDER) {
      out = await base().jpeg({ quality: q, progressive: true, mozjpeg: true }).toBuffer();
      usedQuality = q;
      if (out.length <= budget) break;
    }
  } else {
    out = await base().jpeg({ quality: DEFAULT_QUALITY, progressive: true, mozjpeg: true }).toBuffer();
  }

  const after = await sharp(out).metadata();
  const overBudget = budget && out.length > budget;

  console.log(
    `  ${DRY ? 'would do ' : 'prepared'}  ${rel.padEnd(34)} ` +
      `${meta.width}x${meta.height} ${kb(before)} -> ${after.width}x${after.height} ${kb(out.length)} q${usedQuality}` +
      `${meta.exif ? '  (EXIF stripped)' : ''}` +
      `${overBudget ? `  OVER BUDGET (${kb(budget)}) — try a simpler frame` : ''}`,
  );

  if (!DRY) writeFileSync(full, out);
  processed += 1;
}

console.log(
  `\n  ${processed} prepared, ${skipped} still placeholders` +
    (DRY ? '  (dry run — nothing written)' : '') +
    '\n',
);

if (processed > 0 && !DRY) {
  console.log('  These files no longer match their recorded placeholder hash, so');
  console.log('  `npm run check:images` will now count them as done.\n');
}
