import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/observability';

/* ============================================================================
 * SERVER-SIDE ONLY, AND THAT IS A MEASURED DECISION
 * ----------------------------------------------------------------------------
 * There was an instrumentation-client.ts here. It was deleted after measuring
 * what it cost and what it would have caught.
 *
 * COST, on production:
 *   first load      207 kB -> 293 kB
 *   LCP             1.7 s  -> 3.4 s     back above the 2.5 s threshold
 *   TBT             10 ms  -> 90 ms
 *   Lighthouse      99     -> 90
 *
 * WHAT IT WOULD HAVE CAUGHT, of the three outages that motivated adding it:
 *   blank homepage  no — every script was blocked by the CSP, including this one
 *   402 avatars     no — an image that fails to load throws no exception
 *   Instagram 502   yes, and the SERVER SDK already catches that one
 *
 * Zero of three, for 86 kB and 1.7 seconds of LCP. The browser half was paying
 * a real price for failures it is structurally unable to see: the one that
 * blanked the page would have blocked the reporter along with everything else.
 *
 * So errors are reported from the server, where they are actually thrown and
 * where the bundle costs nothing. The client-visible failures — a page that
 * renders empty, an image that 402s — are not exception-shaped and want a
 * synthetic check that loads the page and asserts something is on it. That is
 * a different tool, and pretending an error SDK covers it is how a site ends up
 * with monitoring it believes in and cannot rely on.
 * ========================================================================== */

/**
 * Server and edge runtimes. Next calls register() once per runtime at start,
 * which is the supported place to initialise Sentry in the App Router — there
 * are no sentry.server.config.ts / sentry.edge.config.ts files any more.
 */
export async function register() {
  Sentry.init(sentryOptions);
}

/**
 * Errors thrown inside a Server Component reach Sentry through this and
 * nowhere else. Without it, the failure that blanked the homepage would still
 * have been invisible — it was a render-time problem, not a request that
 * returned 500.
 */
export const onRequestError = Sentry.captureRequestError;
