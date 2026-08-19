'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';
import { authErrorMessage } from '@/lib/auth/errors';
import {
  normaliseInstagram,
  sanitiseInterests,
  validateBio,
  validateCity,
  validateFullName,
  validateInstagram,
  validateUsername,
} from '@/lib/auth/validation';

export interface SaveProfileState {
  status: 'idle' | 'saved' | 'error';
  message?: string;
  errors?: Partial<Record<'full_name' | 'username' | 'city' | 'bio' | 'instagram_username', string>>;
  /** The username after saving, so the form can update the profile link. */
  username?: string;
}

/* ============================================================================
 * SAVE PROFILE
 * ----------------------------------------------------------------------------
 * A Server Action, so the write happens on the server with the caller's own
 * session. Three things make this safe, and all three are deliberate:
 *
 *   1. The user is read from the session — never from the form. A hidden id
 *      field in the payload would be a request to edit somebody else, and
 *      there is nowhere here to put one.
 *   2. Every field is re-validated and normalised server-side. The client
 *      checks are a courtesy.
 *   3. The update is scoped `.eq('id', user.id)` AND the RLS policy checks
 *      auth.uid() = id. Even if this file had a bug, the database refuses.
 * ========================================================================== */
export async function saveProfile(
  _previous: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: 'error', message: 'Your session has expired. Log in again.' };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: 'error', message: 'Accounts are not connected on this build.' };
  }

  const fullName = String(formData.get('full_name') ?? '').trim();
  const username = String(formData.get('username') ?? '')
    .trim()
    .toLowerCase();
  const city = String(formData.get('city') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();
  const instagram = normaliseInstagram(String(formData.get('instagram_username') ?? ''));
  const interests = sanitiseInterests(formData.getAll('photography_interests'));

  const errors: SaveProfileState['errors'] = {};
  const fullNameError = validateFullName(fullName);
  const usernameError = validateUsername(username);
  const cityError = validateCity(city);
  const bioError = validateBio(bio);
  const instagramError = validateInstagram(instagram);

  if (fullNameError) errors.full_name = fullNameError;
  if (usernameError) errors.username = usernameError;
  if (cityError) errors.city = cityError;
  if (bioError) errors.bio = bioError;
  if (instagramError) errors.instagram_username = instagramError;

  if (Object.keys(errors).length > 0) {
    return { status: 'error', errors, message: 'Check the fields above.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      username,
      city,
      bio: bio || null,
      instagram_username: instagram || null,
      photography_interests: interests.length > 0 ? interests : null,
    })
    .eq('id', user.id);

  if (error) {
    /* 23505 is the unique index on username — by far the likeliest failure,
       and the one worth pinning to its own field. */
    if (error.code === '23505') {
      return {
        status: 'error',
        errors: { username: 'That username is already taken. Try another.' },
        message: 'Check the fields above.',
      };
    }
    return { status: 'error', message: authErrorMessage(error, 'profile') };
  }

  revalidatePath(`/photographers/${username}`);
  revalidatePath('/settings');

  return { status: 'saved', username, message: 'Your profile has been saved.' };
}
