/* ============================================================================
 * PHOTOGRAPHY STYLES
 * ----------------------------------------------------------------------------
 * What a photographer shoots, as opposed to what a photograph is of.
 *
 * These are deliberately a different vocabulary from `categories` in
 * data/photos.ts. Those describe subjects in this city — the old city, the
 * markets, the monsoon — and they filter the archive. These describe a way of
 * working, and they sit on a person: two photographers can both shoot Mandai,
 * one on a phone and one on film.
 *
 * The set is closed. `sanitiseInterests` in lib/auth/validation.ts drops
 * anything not listed here before it reaches the database, so adding a style
 * means adding it here and nowhere else.
 * ========================================================================== */

export type PhotographyStyle =
  | 'street'
  | 'portrait'
  | 'documentary'
  | 'architecture'
  | 'wildlife'
  | 'travel'
  | 'film'
  | 'mobile'
  | 'landscape'
  | 'astro'
  | 'events'
  | 'other';

export interface StyleDefinition {
  id: PhotographyStyle;
  label: string;
  /** One line, in the site's voice, for the directory filter list. */
  note: string;
}

export const photographyStyles: StyleDefinition[] = [
  { id: 'street',       label: 'Street',       note: 'Whatever happens next' },
  { id: 'portrait',     label: 'Portrait',     note: 'People, asked first' },
  { id: 'documentary',  label: 'Documentary',  note: 'The long look' },
  { id: 'architecture', label: 'Architecture', note: 'Stone, iron, concrete' },
  { id: 'wildlife',     label: 'Wildlife',     note: 'Birds on the river' },
  { id: 'travel',       label: 'Travel',       note: 'Beyond the ghats' },
  { id: 'film',         label: 'Film',         note: 'Thirty-six frames' },
  { id: 'mobile',       label: 'Mobile',       note: 'The camera you carry' },
  { id: 'landscape',    label: 'Landscape',    note: 'Hills, sky, distance' },
  { id: 'astro',        label: 'Astro',        note: 'After the city sleeps' },
  { id: 'events',       label: 'Events',       note: 'Weddings, festivals, crowds' },
  { id: 'other',        label: 'Other',        note: 'Something else entirely' },
];

const BY_ID = new Map(photographyStyles.map((style) => [style.id, style]));

export const isPhotographyStyle = (value: string): value is PhotographyStyle =>
  BY_ID.has(value as PhotographyStyle);

/**
 * The label for a stored value. Unknown strings are title-cased rather than
 * dropped, so a profile written before this vocabulary existed still reads as
 * words instead of a slug.
 */
export function styleLabel(value: string): string {
  const known = BY_ID.get(value as PhotographyStyle);
  if (known) return known.label;
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

/** How many interests a profile may list. Matches the check constraint. */
export const MAX_INTERESTS = 8;
