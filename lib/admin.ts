/* ============================================================================
 * THE ORGANISER'S VIEW
 * ----------------------------------------------------------------------------
 * Who is coming on which walk. Every other read in this codebase is either
 * public or the member's own; this is the one that crosses between members,
 * and it is worth being explicit about how it is allowed to.
 *
 * It is allowed by a policy, not by a key. `is_walk_admin()` and the "Admins
 * read every rsvp" policy (migration 0026) do the deciding inside Postgres,
 * against the caller's own session. So the query below is the same ordinary
 * authenticated query every other page makes: if the person asking is not an
 * admin it comes back empty, and there is no privileged client anywhere that
 * could be pointed at the wrong user by mistake.
 *
 * That is why isWalkAdmin is still checked in the page. Not as the security
 * boundary — the database is that — but so a member who finds the URL gets an
 * honest 404 rather than a working page with nothing on it.
 * ========================================================================== */

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { walkById } from '@/data/events';

/** Whether the member making this request may read every RSVP. */
export async function isWalkAdmin(): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('is_walk_admin');
  if (error) return false;
  return data === true;
}

export interface Attendee {
  rsvpId: string;
  fullName: string;
  username: string;
  whatsapp: string;
  experience: string;
  /** When they signed up, not when the walk is. */
  joinedAt: string;
}

export interface WalkRoster {
  eventId: string;
  /** From data/events.ts where the walk still exists, else the copy on the row. */
  title: string;
  date: string;
  /** Absent once a walk has been edited out of data/events.ts. */
  slug: string | null;
  attendees: Attendee[];
}

/**
 * Every walk somebody has signed up for, soonest first, each with its list.
 *
 * Grouped here rather than in SQL because the walks themselves are a file, not
 * a table — the title and the slug have to come from data/events.ts, and a
 * database that has never heard of a walk cannot group by one.
 *
 * A walk that has left events.ts still appears, under the title copied onto
 * the row when somebody joined. Those rows are somebody's record of a morning
 * they went on, and an organiser's list that quietly omitted them would be
 * wrong in the one direction that matters: a person turning up who is not on
 * the sheet.
 */
export async function walkRosters(): Promise<WalkRoster[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('walk_rsvps')
    .select('id, event_id, event_title, event_date, whatsapp, experience, created_at, profiles(full_name, username)')
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  const byWalk = new Map<string, WalkRoster>();

  for (const row of data) {
    /* PostgREST types an embedded one-to-one as possibly-many. It is one row —
       walk_rsvps.profile_id is a foreign key to a primary key — so take the
       first and carry on. */
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const walk = walkById(row.event_id);

    let roster = byWalk.get(row.event_id);
    if (!roster) {
      roster = {
        eventId: row.event_id,
        title: walk?.title ?? row.event_title,
        date: walk?.date ?? row.event_date,
        slug: walk?.slug ?? null,
        attendees: [],
      };
      byWalk.set(row.event_id, roster);
    }

    roster.attendees.push({
      rsvpId: row.id,
      /* A row cannot outlive its profile — the foreign key cascades — but the
         embed can still come back null if the join is ever restricted, and a
         missing name should not take the phone number down with it. */
      fullName: profile?.full_name ?? 'Account removed',
      username: profile?.username ?? '',
      whatsapp: row.whatsapp,
      experience: row.experience,
      joinedAt: row.created_at,
    });
  }

  /* ISO dates compare as strings; the same ordering the rest of the site uses. */
  return [...byWalk.values()].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
}
