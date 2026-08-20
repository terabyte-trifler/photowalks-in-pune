/* ============================================================================
 * WHAT EACH QUERY ASKS FOR, WRITTEN DOWN ONCE
 * ----------------------------------------------------------------------------
 * The audit found `select('*')` in nine places. Nothing sensitive leaks today —
 * `profiles` holds no email or auth data, and the `walk_rsvps` reads are scoped
 * by RLS to the member's own rows — so this was never a live vulnerability.
 *
 * It is a trap laid for later. `*` means "whatever this table has now", so the
 * day somebody adds a column for an internal note, a moderation flag or a
 * phone number, every one of those nine queries starts returning it and the
 * public profile page starts rendering it, with no diff anywhere to notice.
 *
 * Naming the columns turns that into the opposite default: a new column is
 * invisible until somebody adds it here on purpose. The lists live in one file
 * rather than inline at each call site so they cannot drift apart, and each is
 * the full public shape of its table — this is about pinning the shape, not
 * about trimming bytes.
 *
 * Keep in step with the row types in ./types.ts.
 * ========================================================================== */

/** Everything a profile is, publicly. No email, no auth metadata — those live in auth.users and are never exposed. */
export const PROFILE_COLUMNS =
  'id, full_name, username, avatar_url, bio, city, instagram_username, website_url, photography_interests, created_at, updated_at';

/** A photograph. `storage_path` is a path, not a URL — the public URL is built at render time. */
export const PHOTO_COLUMNS =
  'id, profile_id, storage_path, caption, location, taken_at, width, height, created_at';

/**
 * A member's own RSVP. Includes `whatsapp`, which is the point: this is the
 * only query in the app that returns a phone number, and RLS restricts it to
 * the member's own rows. Anything public reads walk_attendance instead.
 */
export const WALK_RSVP_COLUMNS =
  'id, profile_id, event_id, event_title, event_date, whatsapp, experience, consent, created_at';

/** The public projection of an RSVP: who walked what, and never how to reach them. */
export const WALK_ATTENDANCE_COLUMNS = 'profile_id, event_id, event_title, event_date';

/** A directory card: the public profile columns plus the two counts. */
export const PHOTOGRAPHER_CARD_COLUMNS = `${PROFILE_COLUMNS}, walks_attended, photo_count`;
