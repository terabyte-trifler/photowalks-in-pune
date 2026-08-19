import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/session';

/**
 * /profile is the shortcut in the account menu; the profile itself lives at
 * the public URL, so this only works out whose it is and forwards.
 *
 * The middleware already turns signed-out visitors away, and this re-checks —
 * a redirect in middleware is a convenience, not an authorization boundary.
 */
export const dynamic = 'force-dynamic';

export default async function ProfileRedirectPage() {
  const current = await getCurrentProfile();

  if (!current) redirect('/login?next=/profile');
  if (!current.profile) {
    /* The auth user exists but the trigger has not written a profile — either
       the migration has not been run, or the row was deleted by hand. Settings
       is the one screen that can explain it and let them fix it. */
    redirect('/settings?error=no-profile');
  }

  redirect(`/photographers/${current.profile.username}`);
}
