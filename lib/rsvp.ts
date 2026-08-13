/* ============================================================================
 * RSVP
 * ----------------------------------------------------------------------------
 * MOCK IMPLEMENTATION. There is no backend yet, so nothing is permanently
 * saved — submissions go to localStorage on the visitor's own device and the
 * confirmation screen says so plainly. Do not remove that notice until
 * `isBackendConfigured` can return true.
 *
 * ---- TO CONNECT SUPABASE ---------------------------------------------------
 * 1. npm i @supabase/supabase-js
 * 2. Fill NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 3. Create the table:
 *
 *      create table rsvps (
 *        id uuid primary key default gen_random_uuid(),
 *        event_id text not null,
 *        event_title text not null,
 *        name text not null,
 *        email text not null,
 *        whatsapp text not null,
 *        instagram text,
 *        experience text not null,
 *        consent boolean not null default false,
 *        created_at timestamptz not null default now()
 *      );
 *      alter table rsvps enable row level security;
 *      create policy "anon can insert" on rsvps
 *        for insert to anon with check (true);
 *
 * 4. Replace the body of `submitRsvp` with the commented call below.
 *    Nothing in the UI changes — it only knows submitRsvp() and
 *    isBackendConfigured().
 * ========================================================================== */

import type { ExperienceLevel } from '@/data/events';

export interface RsvpInput {
  eventId: string;
  eventTitle: string;
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
  error?: string;
}

export type RsvpErrors = Partial<Record<'name' | 'email' | 'whatsapp', string>>;

const STORAGE_KEY = 'pwip.rsvps';

export const isBackendConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

export async function submitRsvp(input: RsvpInput): Promise<RsvpResult> {
  try {
    // --- SUPABASE SWAP POINT -------------------------------------------
    // const { error } = await supabase.from('rsvps').insert({
    //   event_id: input.eventId, event_title: input.eventTitle,
    //   name: input.name, email: input.email, whatsapp: input.whatsapp,
    //   instagram: input.instagram, experience: input.experience,
    //   consent: input.consent,
    // });
    // if (error) return { ok: false, persisted: false, error: 'That did not save. Try again.' };
    // return { ok: true, persisted: true };
    // -------------------------------------------------------------------

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
