import type { ErrorEvent } from '@sentry/nextjs';

/* ============================================================================
 * WHAT WE WATCH, AND WHAT WE REFUSE TO COLLECT
 * ----------------------------------------------------------------------------
 * This project had no error reporting at all, and it cost three production
 * failures in a single day that nobody noticed:
 *
 *   the homepage rendered completely blank, because a CSP shipped a nonce that
 *     prerendered HTML could not carry, so every script was blocked
 *   every avatar answered 402, because the image optimiser quota ran out
 *   the Instagram grid served hour-old CDN URLs that had expired to 403
 *
 * All three were found by somebody poking at the site, not by an alert. That
 * is the whole argument for this file.
 *
 * WHAT IS DELIBERATELY NOT SENT
 * `sendDefaultPii` stays false. Sentry will happily attach IP addresses,
 * cookies and request headers, and on this site the session cookie is readable
 * by JavaScript — @supabase/ssr needs it to be — so "attach cookies" means
 * "put session tokens in a third-party service". No.
 *
 * beforeSend strips anything that looks like a credential out of the URL and
 * the breadcrumbs before the event leaves the browser, because an OAuth
 * callback carries `?code=` and a recovery link carries `token_hash`, and both
 * would otherwise ride along in the error report that mentions them.
 * ========================================================================== */

/** Query keys that must never leave the browser inside an error report. */
const SENSITIVE_PARAMS = [
  'code',
  'token',
  'token_hash',
  'access_token',
  'refresh_token',
  'apikey',
  'secret',
];

/** Replace the value of anything sensitive in a URL with a marker. */
export function scrubUrl(input: string): string {
  try {
    const url = new URL(input, 'https://pwip.in');
    let touched = false;
    for (const key of SENSITIVE_PARAMS) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, '[redacted]');
        touched = true;
      }
    }
    return touched ? url.toString() : input;
  } catch {
    /* Not a URL. Returning it unchanged is right: this only knows how to
       redact query strings, and inventing a redaction for arbitrary text would
       hide detail without making anything safer. */
    return input;
  }
}

/**
 * Shared across the browser, server and edge runtimes so all three agree on
 * what is collected. Sampling is low on purpose: this is here to notice an
 * outage, not to profile the site.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  /* Absent DSN means Sentry initialises to a no-op. That is the right
     behaviour for a fork or a local checkout: nothing is sent, nothing breaks,
     and no error is raised about a missing key. */
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  /* Errors: keep all of them. There are not many and each one matters. */
  sampleRate: 1,
  /* Traces: a tenth. Performance data is nice; the budget is not. */
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event: ErrorEvent): ErrorEvent {
    if (event.request?.url) event.request.url = scrubUrl(event.request.url);

    for (const crumb of event.breadcrumbs ?? []) {
      const url = crumb.data?.url;
      if (typeof url === 'string') crumb.data!.url = scrubUrl(url);
    }
    return event;
  },
};
