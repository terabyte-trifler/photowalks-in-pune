import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';
import type { Database } from './types';

/** Signed-out visitors are sent to /login when they ask for one of these. */
const PROTECTED_PREFIXES = ['/settings', '/profile', '/my-walks'];

/**
 * Signed-in visitors have no business on these. /forgot-password is
 * deliberately absent: somebody who is signed in may still want a reset link,
 * and a failed recovery lands there with an explanation that a redirect would
 * throw away.
 */
const AUTH_ONLY_PREFIXES = ['/login', '/signup'];

/**
 * Refreshes the Supabase session cookie on every request and, as a first line
 * of defence, keeps signed-out visitors out of the account routes. It is not
 * the authorization boundary — every protected page and action re-checks the
 * user server-side, and Row Level Security is the real guard.
 *
 * Everything public (the homepage, walks, the archive, public profiles) passes
 * straight through: this site is browsable without an account by design.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() revalidates the token with Supabase. Do not replace it with
  // getSession() here: on the server a session read from a cookie is not
  // trustworthy on its own.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = '/profile';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
