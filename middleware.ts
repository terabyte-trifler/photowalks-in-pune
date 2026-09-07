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
       
       `monitoring` was the Sentry browser tunnel and is kept excluded: it costs
       nothing, and if a client SDK is added back this is one of the two things
       that has to be true for it to work. See instrumentation.ts. */
    '/((?!_next/static|_next/image|monitoring|favicon.ico|icon.svg|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
