#!/usr/bin/env node
/* ============================================================================
 * IMPORT PHOTOGRAPHS FROM THE COMMUNITY INSTAGRAM ACCOUNT
 * ----------------------------------------------------------------------------
 * Downloads the account's own posts through the Graph API, resizes them for
 * the archive, writes them into public/images/gallery/, and prints ready-made
 * entries for data/photos.ts.
 *
 * WHY DOWNLOAD RATHER THAN HOTLINK
 * The Instagram section renders live from the API, which is right for "what
 * we posted lately". The archive is different: it is the site's own record,
 * and it should not break when a post is deleted, an account goes private, or
 * a CDN URL rotates. So the archive gets its own copy of the file.
 *
 * WHAT THIS WILL NOT DO
 * It will not invent the three things only a person knows — which walk a
 * photograph came from, where in Pune it was made, and who took it. Those are
 * left as TODO in the output rather than guessed, because a wrong credit is
 * worse than no credit, and this codebase has been careful about that from the
 * start (see the note at the top of data/photos.ts).
 *
 * USAGE
 *   INSTAGRAM_ACCESS_TOKEN=... node scripts/import-instagram.mjs --dry-run
 *   INSTAGRAM_ACCESS_TOKEN=... node scripts/import-instagram.mjs --limit 12
 *
 * Then paste the printed block into `photos` in data/photos.ts and fill in the
 * TODOs. Nothing is written to that file automatically: it is hand-maintained
 * and ordered deliberately.
 * ========================================================================== */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
/* Overridable so the pipeline can be exercised without hitting Meta. */
const API_BASE = process.env.INSTAGRAM_API_BASE ?? 'https://graph.instagram.com';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg === -1 ? 24 : Number.parseInt(args[limitArg + 1] ?? '24', 10) || 24;

const OUT_DIR = 'public/images/gallery';
const MAX_EDGE = 1600;
const QUALITY = 82;

if (!TOKEN) {
  console.error(`
Needs INSTAGRAM_ACCESS_TOKEN.

The account must be a Business or Creator account, and the token must be a
long-lived Graph API token. Full steps are at the top of lib/instagram.ts.

  INSTAGRAM_ACCESS_TOKEN=... node scripts/import-instagram.mjs --dry-run
`.trim());
  process.exit(1);
}

const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

/** First sentence of the caption, for the alt text and the comment. */
function firstLine(caption) {
  const text = (caption ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const line = text.split(/[.\n·|—]/)[0].trim() || text;
  return line.length > 90 ? `${line.slice(0, 90).trimEnd()}…` : line;
}

const aspectOf = (width, height) => {
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.87) return 'portrait';
  return 'square';
};

const dateOf = (timestamp) => (timestamp ? timestamp.slice(0, 10) : 'unknown date');

async function fetchMedia() {
  const url = `${API_BASE}/me/media?fields=${FIELDS}&limit=${LIMIT}&access_token=${TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Instagram refused the request (${response.status}). ` +
        (response.status === 400 || response.status === 401
          ? 'The token is probably expired — long-lived tokens last 60 days.'
          : body.slice(0, 200)),
    );
  }
  const { data } = await response.json();
  return data ?? [];
}

async function main() {
  const media = await fetchMedia();
  const usable = media
    .map((item) => ({
      ...item,
      source: item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url,
    }))
    .filter((item) => Boolean(item.source));

  console.log(`${media.length} posts, ${usable.length} with an image.\n`);

  if (!DRY_RUN) await mkdir(OUT_DIR, { recursive: true });

  const entries = [];
  let index = 0;

  for (const item of usable) {
    index += 1;
    const slug = `ig-${String(index).padStart(2, '0')}`;
    const file = `${slug}.jpg`;
    const target = path.join(OUT_DIR, file);

    const response = await fetch(item.source);
    if (!response.ok) {
      console.log(`  ${slug}  SKIPPED — could not download (${response.status})`);
      continue;
    }
    const original = Buffer.from(await response.arrayBuffer());

    /* Resize for the archive. These are committed to the repository, so an
       untouched 4MB original would bloat it for no visible gain — the grid
       never renders anything near that. */
    const image = sharp(original).rotate();
    const meta = await image.metadata();
    const resized = await image
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    const out = await sharp(resized).metadata();

    if (!DRY_RUN) {
      if (existsSync(target)) {
        console.log(`  ${slug}  SKIPPED — ${file} already exists`);
        continue;
      }
      await writeFile(target, resized);
    }

    const kb = (bytes) => `${Math.round(bytes / 1024)}KB`;
    console.log(
      `  ${slug}  ${meta.width}×${meta.height} ${kb(original.length)}` +
        ` → ${out.width}×${out.height} ${kb(resized.length)}   ${dateOf(item.timestamp)}`,
    );

    entries.push({
      slug,
      file,
      aspect: aspectOf(out.width, out.height),
      caption: firstLine(item.caption),
      permalink: item.permalink,
      taken: dateOf(item.timestamp),
    });
  }

  if (entries.length === 0) {
    console.log('\nNothing imported.');
    return;
  }

  console.log(
    `\n${DRY_RUN ? 'Would write' : 'Wrote'} ${entries.length} images to ${OUT_DIR}/\n\n` +
      '─'.repeat(72) +
      '\nPaste into `photos` in data/photos.ts, then fill in each TODO.\n' +
      'location, event and photographerId are left blank on purpose: guessing\n' +
      'them would put invented facts on the page.\n' +
      '─'.repeat(72) +
      '\n',
  );

  for (const entry of entries) {
    console.log(`  // ${entry.permalink}${entry.caption ? `  — ${entry.caption}` : ''}`);
    console.log(`  { id: '${entry.slug}', image: '/images/gallery/${entry.file}', photographerId: null,`);
    console.log(`    location: '', // TODO: where in Pune`);
    console.log(`    event: '',    // TODO: which walk`);
    console.log(`    category: 'street', // TODO: one of old-city, markets, street, architecture, monsoon, people, night, nature`);
    console.log(`    aspect: '${entry.aspect}',`);
    console.log(`    alt: '${(entry.caption || `Photograph posted on ${entry.taken}`).replace(/'/g, "\\'")}' },`);
    console.log('');
  }

  console.log(
    'For credits: add real people to `photographers` in data/photos.ts first,\n' +
      'then set photographerId. Until then null renders as UNCREDITED, which is\n' +
      'the honest default.',
  );
}

main().catch((error) => {
  console.error(String(error.message ?? error));
  process.exit(1);
});
