/* ============================================================================
 * ERROR COPY
 * ----------------------------------------------------------------------------
 * One place that turns a Supabase AuthError, a Postgres error or a dead
 * network into a sentence a photographer would understand. Nothing raw ever
 * reaches the screen: raw messages leak schema details and read like a stack
 * trace to the person who just mistyped their password.
 *
 * Matching is on `error.code` first (stable, added to supabase-js in 2.x) and
 * falls back to the message text for older projects.
 * ========================================================================== */

import { AuthError, isAuthApiError } from '@supabase/supabase-js';

export const GENERIC_ERROR = 'Something went wrong at our end. Try again in a moment.';
export const OFFLINE_ERROR = 'We could not reach the server. Check your connection and try again.';

const BY_CODE: Record<string, string> = {
  invalid_credentials: 'That email and password do not match an account.',
  email_not_confirmed: 'Confirm your email first — check your inbox for the link we sent.',
  user_already_exists: 'That email already has an account. Log in instead.',
  email_exists: 'That email already has an account. Log in instead.',
  weak_password: 'That password is too easy to guess. Try a longer one.',
  same_password: 'That is your current password. Choose a different one.',
  over_email_send_rate_limit: 'Too many emails just went out. Wait a minute and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  validation_failed: 'Check the details above and try again.',
  email_address_invalid: 'That email does not look right.',
  signup_disabled: 'New accounts are closed at the moment.',
  provider_disabled: 'That sign-in method is not switched on yet.',
  otp_expired: 'That link has expired. Ask for a new one.',
  bad_jwt: 'Your session has expired. Log in again.',
  session_not_found: 'Your session has expired. Log in again.',
  refresh_token_not_found: 'Your session has expired. Log in again.',
  user_not_found: 'We could not find that account.',
};

const BY_MESSAGE: [RegExp, string][] = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/user already registered|already been registered/i, BY_CODE.user_already_exists],
  [/password should be at least/i, 'That password is too short.'],
  [/password.*(weak|compromised|pwned)/i, BY_CODE.weak_password],
  [/new password should be different/i, BY_CODE.same_password],
  [/rate limit|too many requests/i, BY_CODE.over_request_rate_limit],
  [/expired|invalid.*token|token.*invalid/i, BY_CODE.otp_expired],
  [/unable to validate email|invalid format/i, BY_CODE.email_address_invalid],
  [/signups not allowed|signup is disabled/i, BY_CODE.signup_disabled],
  [/provider is not enabled/i, BY_CODE.provider_disabled],
  [/failed to fetch|network|load failed/i, OFFLINE_ERROR],
];

/** Postgres error codes that can surface through PostgREST on a profile write. */
const BY_PG_CODE: Record<string, string> = {
  '23505': 'That username is already taken. Try another.',
  '23514': 'Some of those details are not allowed. Check the fields above.',
  '23503': 'That account no longer exists.',
  '42501': 'You cannot change that.',
  PGRST301: 'Your session has expired. Log in again.',
};

interface UnknownError {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

/**
 * `intent` lets one error mean different things in different places — an
 * unconfirmed email is a blocker on login and a reassurance on signup.
 */
export function authErrorMessage(
  error: unknown,
  intent: 'signin' | 'signup' | 'reset' | 'update' | 'oauth' | 'profile' = 'signin',
): string {
  if (!error) return GENERIC_ERROR;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return OFFLINE_ERROR;

  const raw = error as UnknownError;
  const code = typeof raw.code === 'string' ? raw.code : '';
  const message = typeof raw.message === 'string' ? raw.message : '';

  if (code && BY_PG_CODE[code]) return BY_PG_CODE[code];
  if (code && BY_CODE[code]) return withIntent(BY_CODE[code], code, intent);

  for (const [pattern, copy] of BY_MESSAGE) {
    if (pattern.test(message)) return copy;
  }

  /* A 5xx from the auth API, or the API being unreachable at all. */
  if (error instanceof AuthError) {
    if (isAuthApiError(error) && typeof error.status === 'number' && error.status >= 500) {
      return 'Sign-in is temporarily unavailable. Please try again shortly.';
    }
    if (!isAuthApiError(error)) return OFFLINE_ERROR;
  }

  if (error instanceof TypeError) return OFFLINE_ERROR;

  return intent === 'oauth'
    ? 'Google sign-in did not complete. Try again, or use your email and password.'
    : GENERIC_ERROR;
}

function withIntent(copy: string, code: string, intent: string): string {
  if (code === 'email_not_confirmed' && intent === 'signup') {
    return 'Almost there — confirm your email using the link we just sent.';
  }
  return copy;
}

/** Reasons /auth/callback can bounce someone back, as ?error= on a form page. */
export const CALLBACK_ERRORS: Record<string, string> = {
  expired: 'That link has expired or has already been used. Ask for a new one below.',
  oauth: 'Google sign-in did not complete. Try again, or use your email and password.',
  denied: 'Google sign-in was cancelled.',
  missing: 'That link is not valid any more. Ask for a new one below.',
  session: 'Your session has expired. Log in again.',
};
