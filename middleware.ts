import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /* Everything except Next internals and static assets. The photographs in
       /public are the bulk of this site's requests and must not pay for a
       session refresh. */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
