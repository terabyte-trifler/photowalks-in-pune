#!/usr/bin/env node
/* ============================================================================
 * BUILD THE STATIC IMAGE VARIANTS
 * ----------------------------------------------------------------------------
 * Every photograph in /public is the same on every request. Paying a
 * per-request image optimiser to rediscover that — once per width, per format,
 * per quality, forever — is the largest avoidable cost this site has. This
 * makes the variants once, writes them next to the originals, and they are
 * served as ordinary static files thereafter: no optimiser, no transformation
 * billing, no cold-start latency on the first visitor to a page.
 *
 *   npm run images:variants              # make anything missing or stale
 *   node scripts/build-image-variants.mjs --dry-run
 *   node scripts/build-image-variants.mjs --force
 *
 * WHY THE OUTPUT IS COMMITTED
 * The alternative is generating during `next build`, and that trades a cost
 * you pay once for one you pay on every deployment — several hundred AVIF
 * encodes, on Vercel's clock, for photographs that did not change. Committing
 * them keeps builds fast and makes the deployed bytes reviewable. It follows
 * the workflow images:prep already established: drop a photograph in, run a
 * script, commit what it produced.
 *
 * WHAT IT WRITES
 *   public/images/_v/<dir>/<name>-<width>.avif
 *   public/images/_v/<dir>/<name>-<width>.webp
 *   data/image-variants.json
 *   data/image-variants.hashes.json
 *
 * The manifest holds intrinsic dimensions and which widths exist — not URLs,
 * which components derive from the convention above. That keeps it a few
 * kilobytes, because it is imported by client components — PhotoGrid,
 * HeroImage, LightboxFrame — and every byte in it is a byte in the bundle.
 *
 * The source hashes live in the second file for exactly that reason: they are
 * how this script knows what is already made, they are useless to the app, and
 * inline they were a third of the manifest's size. Both are committed.
 *
 * There is no JPEG ladder. The original file is the fallback for a browser
 * with neither AVIF nor WebP, which in practice means something very old, and
 * doubling the committed bytes to serve it a smaller file is the wrong trade.
 * ========================================================================== */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = join(root, 'public/images');
const outDir = join(imagesDir, '_v');
const manifestPath = join(root, 'data/image-variants.json');
const hashesPath = join(root, 'data/image-variants.hashes.json');

const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

/**
 * The ladder. Rungs about a third apart, which is where the tradeoff sits for
 * photographs: closer together and you buy files nobody downloads, further
 * apart and a phone fetches noticeably more than it displays. Nothing above
 * 2048 — images:prep caps the long edge at 2400 and uploads at 2000, so a
 * larger rung would only ever re-encode pixels that are not there.
 */
const WIDTHS = [640, 1024, 1600, 2048];

/**
 * AVIF first and WebP second is not redundancy, it is the fallback chain:
 * <picture> takes the first type the browser claims to support. AVIF is
 * roughly a third smaller than WebP on these photographs at matched quality.
 *
 * The quality numbers are per-codec scales and are not comparable to each
 * other or to the JPEG value in images:prep — AVIF 50 is a normal setting,
 * not a low one. `effort` is encode time against file size; 4 is the point
 * where more time stops buying meaningful bytes.
 */
const FORMATS = [
  { ext: 'avif', encode: (p) => p.avif({ quality: 50, effort: 4 }) },
  { ext: 'webp', encode: (p) => p.webp({ quality: 76, effort: 5 }) },
];

const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
const kb = (n) => `${Math.round(n / 1024)} kB`;

/** Every image under public/images, except the ones we generated ourselves. */
function findSources(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === outDir) continue;
      found.push(...findSources(full));
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
    if (statSync(full).size === 0) continue; /* placeholder slots */
    found.push(full);
  }
  return found;
}

const previous = existsSync(hashesPath) ? JSON.parse(readFileSync(hashesPath, 'utf8')) : {};

const manifest = {};
const hashes = {};
let written = 0;
let reused = 0;

for (const source of findSources(imagesDir).sort()) {
  const rel = relative(imagesDir, source);
  const key = `/images/${rel.split(/[\\/]/).join('/')}`;
  const buffer = readFileSync(source);
  const hash = sha(buffer);

  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) {
    console.log(`  unreadable  ${rel}`);
    continue;
  }

  /* Never upscale. An image narrower than the smallest rung still gets one
     variant at its own width, so the component has something to point at. */
  const widths = WIDTHS.filter((w) => w <= meta.width);
  if (widths.length === 0) widths.push(meta.width);

  manifest[key] = { w: meta.width, h: meta.height, widths };
  hashes[key] = hash;

  const unchanged = previous[key] === hash && !FORCE;
  const stem = basename(rel, extname(rel));
  const dir = join(outDir, dirname(rel));

  for (const width of widths) {
    for (const { ext, encode } of FORMATS) {
      const target = join(dir, `${stem}-${width}.${ext}`);
      if (unchanged && existsSync(target)) {
        reused += 1;
        continue;
      }
      if (DRY) {
        console.log(`  would write ${relative(root, target)}`);
        written += 1;
        continue;
      }
      mkdirSync(dir, { recursive: true });
      /* rotate() applies the EXIF orientation flag before resizing; without it
         a portrait frame off a phone is written on its side. images:prep
         already bakes this in for files it touches, but this script also runs
         over images that never went through it. */
      const out = await encode(sharp(buffer).rotate().resize({ width, withoutEnlargement: true }))
        .toBuffer();
      writeFileSync(target, out);
      console.log(`  ${relative(root, target).padEnd(52)} ${kb(out.length).padStart(8)}`);
      written += 1;
    }
  }
}

if (!DRY) {
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(hashesPath, `${JSON.stringify(hashes, null, 2)}\n`);
}

const sources = Object.keys(manifest).length;
console.log(
  `\n${sources} source images · ${written} variant${written === 1 ? '' : 's'} written · ${reused} reused`,
);
if (DRY) console.log('(dry run — nothing was written)');
