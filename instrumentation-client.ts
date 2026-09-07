import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/observability';

/* The browser half. Loaded by Next before the app hydrates, so an error during
   hydration — which is exactly what a blocked script looks like — is caught
   rather than lost. */
Sentry.init({
  ...sentryOptions,
  /* Errors only. This exists to notice that the homepage went blank, not to
     profile a route, and no trace is sent.
     
     Measured, because the first version of this comment claimed a saving that
     did not happen: excluding the tracing integration here does NOT shrink the
     bundle. Neither does bundleSizeOptimizations in next.config.ts. The SDK's
     error core is ~86 kB and that is the price of the feature — first load
     went 207 kB to 293 kB and stayed there through both attempts.
     
     It is still worth paying. Three production failures went undetected in a
     single day, and 86 kB is a smaller cost than a blank homepage nobody
     notices. Revisit if the SDK ever ships a genuinely slim error-only build. */
  tracesSampleRate: 0,
  integrations: (defaults) =>
    defaults.filter((integration) => !integration.name.toLowerCase().includes('browsertracing')),
  /* No session replay and no profiling. Replay records the DOM, and on a page
     showing member names and photographs that is a privacy decision nobody has
     made. It also costs 50 kB, on a site that just spent real effort removing
     37 kB of animation library. */
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
