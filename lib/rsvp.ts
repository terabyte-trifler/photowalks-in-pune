/* ============================================================================
 * RSVP
 * ----------------------------------------------------------------------------
 * Joining a walk reaches the database. Rows go to `walk_rsvps`
 * (supabase/migrations/20260820000002_walk_rsvps.sql), one per member per
 * walk, and Row Level Security scopes every read and write to the member
 * making it — there is no service-role key anywhere in this codebase.
 *
 * Joining requires an account: the dialog shows a sign-in panel to signed-out
 * visitors (components/rsvp/RSVPModal.tsx). Browsing the walks stays open.
 *
 * With no Supabase project configured the original behaviour remains — the
 * submission is kept in this browser only, and the confirmation screen says
 * plainly that nobody received it. `isBackendConfigured()` drives that notice.
 * ========================================================================== */

import type { ExperienceLevel } from '@/data/events';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface RsvpInput {
  eventId: string;
  eventTitle: string;
  /** ISO date of the walk, copied onto the row so /my-walks can stand alone. */
  eventDate: string;
  /** The signed-in member's id. Null only on a build with no Supabase project. */
  profileId: string | null;
  name: string;
  email: string;
  whatsapp: string;
  instagram?: string;
  experience: ExperienceLevel;
  consent: boolean;
}

export interface RsvpResult {
  ok: boolean;
  /** False when the submission only reached this browser. */
  persisted: boolean;
  /** True when this member had already joined this walk. */
  alreadyJoined?: boolean;
  error?: string;
}

export type RsvpErrors = Partial<Record<'name' | 'email' | 'whatsapp', string>>;

const STORAGE_KEY = 'pwip.rsvps';

export const isBackendConfigured = (): boolean => isSupabaseConfigured();

export function validateRsvp(input: Partial<RsvpInput>): RsvpErrors {
  const errors: RsvpErrors = {};
  if (!input.name?.trim()) errors.name = 'We need a name for the meeting point list.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email?.trim() ?? '')) {
    errors.email = 'That email does not look right.';
  }
  if ((input.whatsapp?.replace(/\D/g, '').length ?? 0) < 10) {
    errors.whatsapp = 'A 10-digit number, please — this is how we send the meeting point.';
  }
  return errors;
}

/**
 * Has this member already joined this walk? Lets the dialog open on the
 * confirmed state instead of on a form whose submission the one-per-walk
 * constraint would reject.
 */
export async function findExistingRsvp(profileId: string, eventId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('walk_rsvps')
    .select('id')
    .eq('profile_id', profileId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

/**
 * The details this member gave the last time they joined a walk.
 *
 * The name, email and Instagram handle are on the profile and already fill
 * themselves in. The WhatsApp number and the experience level are not — they
 * live only on walk_rsvps rows — so somebody joining their second walk was
 * retyping a phone number the database already had, every time.
 *
 * Ordered newest first, so if they have corrected a number since, the
 * correction is what comes back. RLS scopes this to the caller's own rows;
 * there is no way to read anybody else's from here.
 */
export async function lastRsvpDetails(profileId: string): Promise<
  Pick<RsvpInput, 'whatsapp' | 'experience' | 'consent'> | null
> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('walk_rsvps')
    .select('whatsapp, experience, consent')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    whatsapp: data.whatsapp,
    experience: data.experience as RsvpInput['experience'],
    consent: data.consent,
  };
}

export async function submitRsvp(input: RsvpInput): Promise<RsvpResult> {
  const supabase = getSupabaseBrowserClient();

  if (supabase && input.profileId) {
    try {
      const { error } = await supabase.from('walk_rsvps').insert({
        profile_id: input.profileId,
        event_id: input.eventId,
        event_title: input.eventTitle,
        event_date: input.eventDate,
        whatsapp: input.whatsapp,
        experience: input.experience,
        consent: input.consent,
      });

      if (error) {
        /* The one-per-walk unique constraint. Not a failure — they are in. */
        if (error.code === '23505') return { ok: true, persisted: true, alreadyJoined: true };

        if (error.code === '23514') {
          return {
            ok: false,
            persisted: false,
            error: 'Check the details above — something there is not quite right.',
          };
        }
        if (error.code === '42501' || error.code === 'PGRST301') {
          return {
            ok: false,
            persisted: false,
            error: 'Your session has expired. Log in again to hold your spot.',
          };
        }
        return {
          ok: false,
          persisted: false,
          error: 'That did not save. Try again, or message us on WhatsApp.',
        };
      }

      return { ok: true, persisted: true };
    } catch {
      return {
        ok: false,
        persisted: false,
        error: 'We could not reach the server. Check your connection and try again.',
      };
    }
  }

  /* No Supabase project on this build — keep the local fallback so the whole
     flow still demonstrates, and keep saying so afterwards. */
  try {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const existing: unknown[] = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    existing.push({ ...input, createdAt: new Date().toISOString() });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return { ok: true, persisted: false };
  } catch {
    return {
      ok: false,
      persisted: false,
      error: 'That did not save. Try again, or message us on WhatsApp.',
    };
  }
}

/** Cancelling is a delete; the RLS policy limits it to the member's own row. */
export async function cancelRsvp(rsvpId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: 'Accounts are not connected on this build.' };

  const { error } = await supabase.from('walk_rsvps').delete().eq('id', rsvpId);
  if (error) return { ok: false, error: 'We could not cancel that. Try again in a moment.' };
  return { ok: true };
}
