'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * The last resort: an error thrown in the root layout, where the normal
 * error boundary cannot help because the layout itself failed. It has to
 * render its own <html> and <body>.
 *
 * Deliberately plain. No fonts, no theme script, no Supabase — every one of
 * those is a thing that could be the reason this boundary was reached, and a
 * fallback that depends on the broken part is not a fallback.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f2efe9',
          color: '#16130f',
          fontFamily: 'Helvetica, Arial, sans-serif',
          padding: '2rem',
        }}
      >
        <main style={{ maxWidth: '46ch', textAlign: 'left' }}>
          <p
            style={{
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#857c70',
              margin: 0,
            }}
          >
            Something broke
          </p>
          <h1 style={{ fontSize: '1.8rem', lineHeight: 1.2, margin: '0.75rem 0 0' }}>
            This page did not load.
          </h1>
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#4a443c' }}>
            It has been reported, and somebody will see it. Try again in a moment — or go back to
            the walks.
          </p>
          {/* A plain anchor, not next/link, and the lint rule is wrong here.
              next/link needs the router, and the router is one of the things
              that may have failed to put us in this boundary at all — a
              fallback that depends on the broken part is not a fallback. Next's
              own global-error examples use a bare anchor for the same reason. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ color: '#16130f', textUnderlineOffset: '3px' }}>
            Back to Photowalks in Pune →
          </a>
        </main>
      </body>
    </html>
  );
}
