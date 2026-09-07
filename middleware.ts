import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /* Everything except Next internals and static assets. The photographs in
       /public are the bulk of this site's requests and must not pay for a
       session refresh.
       
       `monitoring` is the Sentry tunnel. Every error report would otherwise
       arrive here and trigger a getUser() round trip to Supabase — a network
       call, to refresh a session, on behalf of a POST that only wants to say
       something broke. Reporting an error must not cost more than the error. */
    '/((?!_next/static|_next/image|monitoring|favicon.ico|icon.svg|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
