import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth/redirects';

/* ============================================================================
 * /auth/callback
 * ----------------------------------------------------------------------------
 * Every way Supabase hands somebody back to us lands here:
 *
 *   Google       →  ?code=…            (PKCE authorization code)
 *   Confirm email→  ?code=…            (default templates, PKCE)
 *   Reset password→ ?code=…            then on to /reset-password
 *   Custom email templates → ?token_hash=…&type=recovery|email|…
 *   Cancelled / failed → ?error=…&error_description=…
 *
 * Both shapes are handled so this works whether or not the email templates in
 * the dashboard have been customised. On success the session cookie is set by
 * the server client and we redirect on; on failure people go back to a form
 * with a sentence explaining what happened — never a raw error.
 *
 * Note the redirect target is validated: `next` arrives in a URL and a URL is
 * whatever the sender wants it to be.
 * ========================================================================== */

/**
 * On Vercel the request hits the function with an internal host, so
 * `new URL(request.url).origin` is not where the visitor thinks they are.
 * x-forwarded-host is what the browser actually asked for.
 */
function resolveOrigin(request: NextRequest, fallbackOrigin: string): string {
  if (process.env.NODE_ENV === 'development') return fallbackOrigin;
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (!forwardedHost) return fallbackOrigin;
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  return `${protocol}://${forwardedHost}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const origin = resolveOrigin(request, requestOrigin);

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const oauthError = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const next = safeNext(searchParams.get('next'), '/profile');

  /* Where to send somebody when this does not work out. A failed recovery
     belongs on /forgot-password, where there is a button to send a new link. */
  const isRecovery = type === 'recovery' || next.startsWith('/reset-password');
  const failurePath = isRecovery ? '/forgot-password' : '/login';

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}${failurePath}?error=${reason}`);

  /* Google's own refusals arrive as query parameters, not exceptions. */
  if (oauthError) {
    if (oauthError === 'access_denied') return fail('denied');
    if (errorCode === 'otp_expired') return fail('expired');
    return fail(isRecovery ? 'expired' : 'oauth');
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(`${origin}/login?error=oauth`);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(isRecovery ? 'expired' : 'oauth');
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail('expired');
    return NextResponse.redirect(`${origin}${next}`);
  }

  /* Somebody opened /auth/callback directly, or the link was mangled in an
     email client. */
  return fail('missing');
}
