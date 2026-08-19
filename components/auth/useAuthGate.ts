'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useAuth } from './AuthProvider';

/* ============================================================================
 * THE GATE
 * ----------------------------------------------------------------------------
 * The seam the rest of the product will grow into. Browsing stays open to
 * everyone — the homepage, the walks, the archive, the community, public
 * profiles. Only acts that carry an identity need an account:
 *
 *   RSVP to a walk · upload a photograph · like · comment · save a walk ·
 *   join a group · enter a challenge · host a walk
 *
 * Each of those becomes:
 *
 *   const gate = useAuthGate();
 *   if (!gate('to hold your spot')) return;   // sends them to /login and back
 *   ...do the thing
 *
 * The server action behind the thing still calls requireUser(). This hook is
 * about not wasting somebody's time filling in a form they cannot submit; it
 * is not a security control.
 * ========================================================================== */

export function useAuthGate(): (reason?: string) => boolean {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (reason?: string) => {
      if (loading) return false;
      if (user) return true;

      const params = new URLSearchParams({ next: pathname });
      if (reason) params.set('reason', reason);
      router.push(`/login?${params.toString()}`);
      return false;
    },
    [user, loading, router, pathname],
  );
}
