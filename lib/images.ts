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
