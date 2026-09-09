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
import { registrationClosed } from '@/lib/utils';

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

/** The sentence shown wherever a walk has stopped taking people. */
export const REGISTRATION_CLOSED_MESSAGE =
  'Registration for this walk closed at 6pm on the day of the walk.';

/**
 * Make a browser-side RSVP failure visible on the server.
 *
 * Posts to the same route the uploader uses. The name says "upload" because
 * that is what it was built for, but what it does is the general thing: the
 * browser states a fact, the server logs it where somebody will find it. The
 * alternative here is a console.error in a member's phone, which is another
 * way of spelling no reporting at all.
 *
 * Written out rather than imported from lib/uploads so that joining a walk
 * does not pull the decoder, the ladder and the compressor into its bundle.
 * Fire and forget, and keepalive, because the interesting failures are the
 * ones where somebody gives up and closes the tab.
 */
function reportRsvpFailure(eventId: string, why: string): void {
  try {
    void fetch('/api/upload-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ stage: 'insert', reason: `rsvp ${eventId}: ${why}`, bytes: -1 }),
    }).catch(() => {});
  } catch {
    /* Reporting is best effort by definition. */
  }
}

export async function submitRsvp(input: RsvpInput): Promise<RsvpResult> {
  /* Ahead of the branch below so it covers the no-backend path too: without a
     Supabase project the row only reaches localStorage, where no trigger can
     refuse it, and a confirmation screen for a walk that has been is worse
     than one that never persisted. */
  if (registrationClosed(input.eventDate)) {
    return { ok: false, persisted: false, error: REGISTRATION_CLOSED_MESSAGE };
  }

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

        /* ----------------------------------------------------------------
         * The foreign key from migration 0024: this event_id has no row in
         * public.walks.
         *
         * Which is a deployment fault, never the member's. Walks live in
         * data/events.ts and their rows are copied across by
         * scripts/sync-walk-capacity.mjs; ship a walk without running it and
         * the site offers a walk the database has never heard of. That
         * happened, and every attempt answered "That did not save. Try
         * again" — advice that could not work, on a screen that looked like
         * a flaky connection rather than a missing step.
         *
         * So say what is true: it is not us, it is not you, and trying again
         * is not the fix. The report is what makes it findable next time.
         * ---------------------------------------------------------------- */
        if (error.code === '23503') {
          reportRsvpFailure(input.eventId, 'walk missing from public.walks');
          return {
            ok: false,
            persisted: false,
            error:
              'This walk is not open for sign-ups yet — that is on us, not you. Message us on WhatsApp and we will hold your spot.',
          };
        }

        if (error.code === '23514') {
          /* Shared code, two senders: the column constraints in migration 0002
             and the cutoff trigger in 0014. Only the trigger says
             "Registration", and it is worth telling apart — "check the details
             above" is unhelpful advice for a walk that has already happened. */
          if (error.message?.includes('Registration for this walk closed')) {
            return { ok: false, persisted: false, error: REGISTRATION_CLOSED_MESSAGE };
          }
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
