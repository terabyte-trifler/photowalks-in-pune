import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';
import { buildCsp, createNonce, isStaticPage } from '@/lib/security/csp';
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
 * Refreshes the Supabase session cookie on every request, keeps signed-out
 * visitors out of the account routes, and attaches the Content Security Policy.
 *
 * The middleware is not the authorization boundary — every protected page and
 * action re-checks the user server-side, and Row Level Security is the real
 * guard. It is the only place that can mint a per-request nonce, though, which
 * is why the CSP is assembled here rather than in next.config.
 *
 * WHY THE NONCE IS SET ON THE REQUEST AS WELL AS THE RESPONSE
 * Next reads the CSP off the incoming request to decide whether to stamp its
 * own hydration scripts with the nonce. Set it only on the response and the
 * header arrives strict while the scripts are unmarked — a blank page, in
 * production, on the pages that matter most.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const isProduction = process.env.NODE_ENV === 'production';

  /* The three prerendered pages keep the relaxed policy from next.config: a
     nonce would make them impossible to prerender, and there is no user
     content on them to protect. Everything else is rendered per request
     already, so the nonce costs nothing. */
  const relaxed = isStaticPage(pathname);
  const nonce = relaxed ? undefined : createNonce();
  const csp = buildCsp({ nonce, isProduction });

  /* Carried into the render so Next can stamp its own scripts. */
  const requestHeaders = new Headers(request.headers);
  if (nonce) {
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);
  }

  const withCsp = <T extends NextResponse>(response: T): T => {
    response.headers.set('Content-Security-Policy', csp);
    return response;
  };

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!isSupabaseConfigured()) return withCsp(response);

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        /* Rebuilt, so the nonce headers have to be reapplied — dropping them
           here is how the policy and the scripts fall out of step. */
        response = NextResponse.next({ request: { headers: requestHeaders } });
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

  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return withCsp(NextResponse.redirect(url));
  }

  if (user && AUTH_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = '/profile';
    url.search = '';
    return withCsp(NextResponse.redirect(url));
  }

  return withCsp(response);
}
