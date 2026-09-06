/* ============================================================================
 * IMAGES — one quality, and the widths that go with it
 * ----------------------------------------------------------------------------
 * The optimiser bills per unique variant, and a variant is a combination of
 * (source, width, quality). Both of the other two are bounded by what the
 * layout genuinely needs. Quality was not: this project had six values in it —
 * 70, 72, 74, 76, 80 and 82 — chosen per component and never compared side by
 * side. Nobody can see 72 against 74. The cache can, and treated them as
 * different photographs.
 *
 * The cost was not only duplication in the abstract. `photo.image` rendered in
 * PhotoGrid at 72 and in PhotoLightbox at 82, so opening any archive photograph
 * generated a second complete set of variants for an image already optimised.
 * One constant makes that impossible to reintroduce by accident.
 *
 * 76 sits where the old values clustered. It is a touch above the old grid
 * value and a touch below the old lightbox value, and it is what everything
 * asks for now.
 *
 * THIS VALUE AND next.config.ts MUST AGREE. `images.qualities` there lists what
 * the optimiser will answer, and a request outside it is a 400 — a broken
 * picture on the page, not a warning in a log. That list is [76] and this is
 * 76. Changing one means changing both, in the same commit.
 *
 * What that does NOT mean, because it was believed here for a while: an
 * <Image> with no `quality` prop is not a 400 waiting to happen. Next does not
 * send its documented default of 75 blindly — it snaps to the nearest value
 * you have configured. Six components passed no quality, and production served
 * them at q=74, the nearest entry to 75 in the old list. Nothing was broken.
 *
 * They are all explicit now anyway. Snapping is a sensible default and a poor
 * way to choose a quality: it silently hands the image whichever number the
 * list happens to have nearest 75, so the value changes when the list changes,
 * for reasons no one editing the list is thinking about.
 * ========================================================================== */

/** The only quality any <Image> in this project may ask for. */
export const IMAGE_QUALITY = 76;

/* ============================================================================
 * VARIANTS FOR UPLOADED IMAGES
 * ----------------------------------------------------------------------------
 * The archive under /public is handled at build time by
 * scripts/build-image-variants.mjs. Member uploads cannot be: they arrive after
 * the build. So the browser that resizes an upload emits the ladder too, and
 * the files go to Storage together — which takes the other half of this site's
 * images off the optimiser as well.
 *
 * HOW A VARIANT SET IS RECOGNISED, WITHOUT A MIGRATION
 * The photos table stores one `storage_path` and nothing about siblings. Rather
 * than add a column and a migration for it, the set is written into the name:
 *
 *   <owner>/<stamp>-<rand>-v1-1600.webp   <- what storage_path points at
 *   <owner>/<stamp>-<rand>-v1-1024.webp
 *   <owner>/<stamp>-<rand>-v1-640.webp
 *
 * `v1` is the ladder version, not a variant index. Every consumer resolves the
 * siblings from the stored path alone: the widths present are the rungs of
 * ladder 1 below the stored width, plus the stored width itself. Bumping to v2
 * would mean adding a ladder here and leaving v1 intact, so rows uploaded under
 * the old ladder keep resolving to files that exist.
 *
 * A path with no marker is an upload from before this existed. It resolves to
 * itself, and goes through the optimiser exactly as it always did — which is
 * why nothing needed backfilling.
 *
 * THREE PLACES MUST AGREE, and only one of them can import this file:
 *   lib/uploads.ts          writes the set, and deletes it as a unit
 *   components/media/Picture.tsx  reads it
 *   scripts/prune-storage.mjs     must not mistake a sibling for an orphan
 * The script is ESM run by node against the built ladder here; it restates the
 * convention with a comment pointing back at this block.
 * ========================================================================== */

/** Ladder 1, per kind. Avatars are displayed between 20 and 72 CSS pixels. */
export const VARIANT_LADDERS = {
  1: {
    avatar: [128, 256],
    photo: [640, 1024, 1600],
  },
} as const;

export const CURRENT_LADDER = 1;

export type VariantKind = keyof (typeof VARIANT_LADDERS)[typeof CURRENT_LADDER];

/** `…-v1-1600.webp` -> the pieces needed to name its siblings. */
export function parseVariantPath(
  path: string,
): { base: string; ladder: number; width: number; extension: string } | null {
  const match = /^(.*)-v(\d+)-(\d+)\.([a-z0-9]+)$/i.exec(path);
  if (!match) return null;
  const ladder = Number(match[2]);
  if (!(ladder in VARIANT_LADDERS)) return null;
  return { base: match[1], ladder, width: Number(match[3]), extension: match[4] };
}

export const variantPath = (
  base: string,
  ladder: number,
  width: number,
  extension: string,
): string => `${base}-v${ladder}-${width}.${extension}`;

/**
 * Which widths exist for a set whose largest is `storedWidth`. The rungs below
 * it, and it. Deterministic from the ladder, which is what lets every consumer
 * agree without asking Storage what is there.
 */
export function variantWidths(kind: VariantKind, ladder: number, storedWidth: number): number[] {
  const rungs = VARIANT_LADDERS[ladder as typeof CURRENT_LADDER]?.[kind] ?? [];
  return [...rungs.filter((w) => w < storedWidth), storedWidth];
}

/** Which ladder a Storage URL belongs to, read off the bucket in the path. */
export function kindForUrl(url: string): VariantKind | null {
  if (url.includes('/object/public/avatars/')) return 'avatar';
  if (url.includes('/object/public/photos/')) return 'photo';
  return null;
}

/**
 * A srcset for an uploaded image, or null when the URL is not a variant set —
 * a legacy upload, a Google avatar, an Instagram CDN URL. Callers fall back to
 * the optimiser on null.
 */
export function uploadSrcSet(url: string): string | null {
  const kind = kindForUrl(url);
  if (!kind) return null;
  const parsed = parseVariantPath(url);
  if (!parsed) return null;
  return variantWidths(kind, parsed.ladder, parsed.width)
    .map((w) => `${variantPath(parsed.base, parsed.ladder, w, parsed.extension)} ${w}w`)
    .join(', ');
}
