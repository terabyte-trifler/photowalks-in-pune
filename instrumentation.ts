import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/observability';

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
