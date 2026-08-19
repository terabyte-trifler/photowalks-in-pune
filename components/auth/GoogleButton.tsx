'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';

/**
 * Google is handled entirely by Supabase: signInWithOAuth sends the browser to
 * the consent screen and /auth/callback exchanges the code. No Google SDK, no
 * client secret in this repository — see supabase/README.md for the two
 * dashboard fields that make it work.
 *
 * Styled as .cta-ghost so it reads as the quieter of the two ways in.
 */
export function GoogleButton({ next, label }: { next?: string; label: string }) {
  const { signInWithGoogle, configured } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setError('');

    const result = await signInWithGoogle(next);
    if (!result.ok) {
      setError(result.error ?? 'Google sign-in did not start.');
      setBusy(false);
      return;
    }
    /* Success means a redirect is under way — keep the button busy until the
       page unloads rather than flashing back to its resting state. */
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || !configured}
        aria-busy={busy}
        className="cta-ghost w-full justify-center gap-3 disabled:opacity-50"
      >
        <GoogleMark />
        {busy ? 'Opening Google' : label}
      </button>

      {error && (
        <p role="alert" className="mt-3 font-mono text-micro uppercase text-accent">
          {error}
        </p>
      )}
    </>
  );
}

/** Google's mark, inlined — one more dependency is not worth four paths. */
function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
